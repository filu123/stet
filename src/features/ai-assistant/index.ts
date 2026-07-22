/**
 * Public API of the `ai-assistant` feature.
 * Other features and routes import ONLY from this file — never from internals.
 */
export { AiAssistantButton } from "./components/AiAssistantButton";
export { AiBubbleMenuActions } from "./components/AiBubbleMenuActions";
export { SuggestionPopover } from "./components/SuggestionPopover";
export { useProactiveReview } from "./hooks/useProactiveReview";
export { AiMarkupExtension } from "./lib/ai-markup-extension";
export { requestDocumentReview } from "./lib/review-service";
