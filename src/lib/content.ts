/**
 * Content utilities for handling both legacy HTML and new TipTap JSON formats.
 *
 * New notes are saved as JSON.stringify(editor.getJSON()).
 * Existing notes may still be raw HTML strings.
 * These utilities detect the format and handle both transparently.
 */

interface TiptapNode {
  type: string;
  text?: string;
  content?: TiptapNode[];
}

/**
 * Parses stored note content into the format TipTap expects.
 * - Valid TipTap JSON string → parsed object
 * - HTML string (legacy) → raw string (TipTap's setContent accepts HTML)
 * - Empty/undefined → empty string
 */
export function parseContent(content?: string): object | string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      return parsed;
    }
    return content;
  } catch {
    return content;
  }
}

/** Detects whether stored content is in TipTap JSON format. */
export function isJsonContent(content?: string): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" && parsed.type === "doc";
  } catch {
    return false;
  }
}

/** Recursively extracts plain text from a TipTap JSON node tree. */
function extractTextFromNode(node: TiptapNode): string {
  if (node.type === "text") return node.text || "";
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractTextFromNode).join("");
  }
  return "";
}

/**
 * Extracts plain text from note content (either JSON or HTML format).
 * Used for search filtering and empty-content detection.
 */
export function extractTextFromContent(content?: string): string {
  if (!content) return "";

  if (isJsonContent(content)) {
    try {
      const doc = JSON.parse(content);
      return extractTextFromNode(doc).trim();
    } catch {
      return "";
    }
  }

  // Legacy HTML: strip tags
  return content.replace(/<[^>]*>/g, "").trim();
}

/**
 * Returns true if the content has visible text.
 * Works with both HTML and JSON formats.
 * Replaces both `isEmptyHtml()` and `hasNotesContent()`.
 */
export function hasVisibleContent(content?: string): boolean {
  return extractTextFromContent(content).length > 0;
}
