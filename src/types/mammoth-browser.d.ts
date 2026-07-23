/** Minimal typing for mammoth's browser bundle (docx → HTML). */
declare module "mammoth/mammoth.browser" {
  export function convertToHtml(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string; messages: unknown[] }>;
}
