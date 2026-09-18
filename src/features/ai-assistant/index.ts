/**
 * Public API of the `ai-assistant` feature.
 * Other features and routes import ONLY from this file — never from internals.
 */
export { AiAssistantButton } from "./components/AiAssistantButton";
export { AiBubbleMenuActions } from "./components/AiBubbleMenuActions";
export { SuggestionPopover } from "./components/SuggestionPopover";
export { useProactiveReview } from "./hooks/useProactiveReview";
export { AiMarkupExtension } from "./lib/ai-markup-extension";
// The provider-neutral completion call, shared with the reader feature so
// there is one place that knows how to talk to Anthropic/OpenAI/Gemini.
export { requestCompletion } from "./lib/provider-client";
export { requestDocumentReview } from "./lib/review-service";
