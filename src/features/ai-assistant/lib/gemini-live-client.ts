import type { AiChatMessage } from "./ask-service";

/** Gemini's current low-latency native-audio model. */
export const GEMINI_LIVE_MODEL = "gemini-3.8-live";

const LIVE_ENDPOINT =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;
const CONNECTION_TIMEOUT_MS = 15_000;

export interface GeminiLiveCallbacks {
  onInputTranscript?: (text: string) => void;
  onOutputTranscript?: (text: string) => void;
  onModelAudio?: () => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onError?: (message: string) => void;
  onClosed?: () => void;
}

export interface GeminiLiveSession {
  stop: () => void;
}

interface StartGeminiLiveSessionOptions {
  apiKey: string;
  documentText: string;
  history?: readonly AiChatMessage[];
  callbacks: GeminiLiveCallbacks;
}

/** Opens a browser microphone → Gemini Live → browser speaker session. */
export async function startGeminiLiveSession({
  apiKey,
  documentText,
  history = [],
  callbacks,
}: StartGeminiLiveSessionOptions): Promise<GeminiLiveSession> {
  if (typeof window === "undefined") {
    throw new Error("Voice conversations are available in the browser only.");
  }
  if (!window.isSecureContext) {
    throw new Error(
      "Microphone access on Android requires HTTPS. Open Stet using an https:// address, not the laptop's http:// address.",
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not expose microphone access. Try the latest Chrome over HTTPS.");
  }

  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    throw new Error("This browser does not support live audio playback.");
  }

  let isStopped = false;
  let microphone: MediaStream | null = null;
  const microphonePromise = getMicrophoneStream().then((stream) => {
    if (isStopped) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Voice conversation was stopped before microphone access completed.");
    }
    microphone = stream;
    return stream;
  });
  const audioContext = new AudioContextConstructor();
  // Start both flows from the microphone button's user gesture so neither
  // microphone permission nor the WebSocket handshake can block the other.
  void audioContext.resume();
  const socket = new WebSocket(`${LIVE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`);

  let isSetupComplete = false;
  let inputProcessor: ScriptProcessorNode | null = null;
  let microphoneSource: MediaStreamAudioSourceNode | null = null;
  let silentOutput: GainNode | null = null;
  let nextPlaybackTime = 0;
  let setupTimer: ReturnType<typeof setTimeout> | null = null;
  const playingSources = new Set<AudioBufferSourceNode>();

  const stopPlayback = () => {
    for (const source of playingSources) {
      try {
        source.stop();
      } catch {
        // A source that already ended is harmless.
      }
    }
    playingSources.clear();
    nextPlaybackTime = audioContext.currentTime;
  };

  const cleanup = () => {
    if (isStopped) return;
    isStopped = true;
    if (setupTimer) clearTimeout(setupTimer);
    stopPlayback();
    if (inputProcessor) inputProcessor.onaudioprocess = null;
    microphoneSource?.disconnect();
    inputProcessor?.disconnect();
    silentOutput?.disconnect();
    microphone?.getTracks().forEach((track) => track.stop());
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close(1000, "Voice conversation ended");
    }
    void audioContext.close();
    callbacks.onClosed?.();
  };

  const session: GeminiLiveSession = { stop: cleanup };

  const startMicrophoneCapture = () => {
    if (isStopped || inputProcessor || !microphone) return;
    microphoneSource = audioContext.createMediaStreamSource(microphone);
    inputProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    silentOutput = audioContext.createGain();
    silentOutput.gain.value = 0;

    inputProcessor.onaudioprocess = (event) => {
      if (isStopped || !isSetupComplete || socket.readyState !== WebSocket.OPEN) return;
      const samples = event.inputBuffer.getChannelData(0);
      const pcm = downsampleToPcm16(samples, audioContext.sampleRate, INPUT_SAMPLE_RATE);
      socket.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data: bytesToBase64(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)),
              mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
            },
          },
        }),
      );
    };

    microphoneSource.connect(inputProcessor);
    // ScriptProcessorNode needs a destination connection to run. The gain is
    // zero so microphone audio is never echoed locally.
    inputProcessor.connect(silentOutput);
    silentOutput.connect(audioContext.destination);
  };

  const playAudioChunk = (base64Audio: string) => {
    if (isStopped) return;
    const bytes = base64ToBytes(base64Audio);
    if (bytes.byteLength < 2) return;
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const audioBuffer = audioContext.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    const channel = audioBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      channel[index] = samples[index] / 32_768;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    playingSources.add(source);
    source.onended = () => playingSources.delete(source);
    const startAt = Math.max(audioContext.currentTime, nextPlaybackTime);
    source.start(startAt);
    nextPlaybackTime = startAt + audioBuffer.duration;
  };

  const setup = {
    setup: {
      model: `models/${GEMINI_LIVE_MODEL}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Puck" },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: buildVoiceSystemInstruction(documentText, history) }],
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  };

  const setupComplete = new Promise<void>((resolve, reject) => {
    const fail = (message: string) => {
      if (isStopped) return;
      cleanup();
      reject(new Error(message));
    };

    socket.onopen = () => {
      if (isStopped) return;
      socket.send(JSON.stringify(setup));
    };

    const handleMessage = (rawMessage: string) => {
      if (isStopped) return;
      let response: GeminiLiveServerMessage;
      try {
        response = JSON.parse(rawMessage) as GeminiLiveServerMessage;
      } catch {
        return;
      }

      if (response.error?.message) {
        callbacks.onError?.(response.error.message);
        fail(response.error.message);
        return;
      }

      if (response.setupComplete) {
        if (setupTimer) clearTimeout(setupTimer);
        isSetupComplete = true;
        void audioContext.resume();
        resolve();
        return;
      }

      const serverContent = response.serverContent;
      if (!serverContent) return;

      if (serverContent.interrupted) {
        stopPlayback();
        callbacks.onInterrupted?.();
      }

      for (const part of serverContent.modelTurn?.parts ?? []) {
        const audioData = part.inlineData?.data;
        if (audioData) {
          callbacks.onModelAudio?.();
          playAudioChunk(audioData);
        }
      }
      if (serverContent.inputTranscription?.text) {
        callbacks.onInputTranscript?.(serverContent.inputTranscription.text);
      }
      if (serverContent.outputTranscription?.text) {
        callbacks.onOutputTranscript?.(serverContent.outputTranscription.text);
      }
      if (serverContent.turnComplete) callbacks.onTurnComplete?.();
    };

    socket.onmessage = (event) => {
      if (event.data instanceof Blob) {
        void event.data.text().then(handleMessage);
      } else if (typeof event.data === "string") {
        handleMessage(event.data);
      }
    };

    socket.onerror = () => {
      const message = "Gemini voice could not connect — check your API key and internet connection.";
      callbacks.onError?.(message);
      fail(message);
    };

    socket.onclose = (event) => {
      if (isStopped) return;
      const message =
        event.reason ||
        (isSetupComplete
          ? "The Gemini voice session ended unexpectedly."
          : "Gemini closed the voice connection before setup completed. Check the API key, model access, and network.");
      callbacks.onError?.(message);
      cleanup();
      reject(new Error(message));
    };

    setupTimer = setTimeout(() => {
      const message =
        "Gemini voice timed out while connecting. Check your API key, model access, and microphone permission.";
      callbacks.onError?.(message);
      fail(message);
    }, CONNECTION_TIMEOUT_MS);
  });

  try {
    await Promise.all([setupComplete, microphonePromise]);
    startMicrophoneCapture();
  } catch (error) {
    cleanup();
    throw error;
  }

  return session;
}

interface GeminiLiveServerMessage {
  setupComplete?: Record<string, never>;
  error?: { message?: string };
  serverContent?: {
    interrupted?: boolean;
    turnComplete?: boolean;
    modelTurn?: {
      parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>;
    };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
  };
}

function buildVoiceSystemInstruction(
  documentText: string,
  history: readonly AiChatMessage[],
): string {
  const previousConversation = history.length
    ? `\n\n<previous-conversation>\n${history
        .slice(-12)
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n")}\n</previous-conversation>`
    : "";

  return [
    "You are the user's natural, thoughtful voice companion inside a document editor.",
    "The user is speaking with you about the document below. Answer questions about its ideas, arguments, themes, evidence, and implications.",
    "Use the document as your primary source. If something is not supported by it, say so clearly.",
    "Speak naturally and concisely. Do not announce formatting or use markdown.",
    "When the user asks about a selected idea, explain it in plain language and use the wider document for context.",
    "",
    "<document>",
    documentText,
    "</document>",
    previousConversation,
  ].join("\n");
}

function getAudioContextConstructor(): typeof AudioContext | null {
  const browserWindow = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return browserWindow.AudioContext ?? browserWindow.webkitAudioContext ?? null;
}

function downsampleToPcm16(samples: Float32Array, inputRate: number, outputRate: number): Int16Array {
  if (inputRate === outputRate) return floatToPcm16(samples);
  const ratio = inputRate / outputRate;
  const outputLength = Math.round(samples.length / ratio);
  const output = new Int16Array(outputLength);

  for (let index = 0; index < outputLength; index++) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(left + 1, samples.length - 1);
    const weight = sourceIndex - left;
    const sample = samples[left] * (1 - weight) + samples[right] * weight;
    output[index] = sample < 0 ? sample * 32_768 : sample * 32_767;
  }
  return output;
}

function floatToPcm16(samples: Float32Array): Int16Array {
  const output = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index++) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    output[index] = sample < 0 ? sample * 32_768 : sample * 32_767;
  }
  return output;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function getMicrophoneStream(): Promise<MediaStream> {
  const request = navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  let timedOut = false;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  request.then((stream) => {
    if (timedOut) stream.getTracks().forEach((track) => track.stop());
  });

  try {
    return await Promise.race([
      request,
      new Promise<MediaStream>((_, reject) => {
        timeoutTimer = setTimeout(
          () => reject(new Error("Microphone permission timed out. Check your browser permission settings.")),
          CONNECTION_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    timedOut = true;
    if (timeoutTimer) clearTimeout(timeoutTimer);
  }
}
