import { describe, test, expect } from "vitest";
import {
  parseContent,
  isJsonContent,
  extractTextFromContent,
  hasVisibleContent,
} from "../content";

const sampleJsonDoc = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hello world" }],
    },
  ],
});

const sampleHtml = "<p>Hello world</p>";

const emptyJsonDoc = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

describe("parseContent", () => {
  test("returns empty string for undefined", () => {
    expect(parseContent(undefined)).toBe("");
  });

  test("returns empty string for empty string", () => {
    expect(parseContent("")).toBe("");
  });

  test("returns parsed object for valid TipTap JSON", () => {
    const result = parseContent(sampleJsonDoc);
    expect(typeof result).toBe("object");
    expect((result as { type: string }).type).toBe("doc");
  });

  test("returns raw HTML string for legacy HTML", () => {
    const result = parseContent(sampleHtml);
    expect(result).toBe(sampleHtml);
  });

  test("returns raw string for non-doc JSON", () => {
    const result = parseContent(JSON.stringify({ foo: "bar" }));
    expect(result).toBe(JSON.stringify({ foo: "bar" }));
  });

  test("returns raw string for plain text", () => {
    const result = parseContent("just some text");
    expect(result).toBe("just some text");
  });
});

describe("isJsonContent", () => {
  test("returns false for undefined", () => {
    expect(isJsonContent(undefined)).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isJsonContent("")).toBe(false);
  });

  test("returns true for valid TipTap JSON", () => {
    expect(isJsonContent(sampleJsonDoc)).toBe(true);
  });

  test("returns false for HTML", () => {
    expect(isJsonContent(sampleHtml)).toBe(false);
  });

  test("returns false for non-doc JSON", () => {
    expect(isJsonContent(JSON.stringify({ type: "notDoc" }))).toBe(false);
  });
});

describe("extractTextFromContent", () => {
  test("returns empty string for undefined", () => {
    expect(extractTextFromContent(undefined)).toBe("");
  });

  test("returns empty string for empty string", () => {
    expect(extractTextFromContent("")).toBe("");
  });

  test("extracts text from TipTap JSON", () => {
    expect(extractTextFromContent(sampleJsonDoc)).toBe("Hello world");
  });

  test("strips tags from legacy HTML", () => {
    expect(extractTextFromContent(sampleHtml)).toBe("Hello world");
  });

  test("extracts text from nested JSON nodes", () => {
    const nested = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world", marks: [{ type: "bold" }] },
          ],
        },
      ],
    });
    expect(extractTextFromContent(nested)).toBe("TitleHello world");
  });

  test("returns empty string for empty JSON doc", () => {
    expect(extractTextFromContent(emptyJsonDoc)).toBe("");
  });

  test("strips complex HTML", () => {
    expect(
      extractTextFromContent("<h1>Title</h1><p>Body <strong>bold</strong></p>")
    ).toBe("TitleBody bold");
  });
});

describe("hasVisibleContent", () => {
  test("returns false for undefined", () => {
    expect(hasVisibleContent(undefined)).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(hasVisibleContent("")).toBe(false);
  });

  test("returns false for empty HTML tags", () => {
    expect(hasVisibleContent("<p></p>")).toBe(false);
  });

  test("returns false for whitespace-only HTML", () => {
    expect(hasVisibleContent("<p>   </p>")).toBe(false);
  });

  test("returns true for HTML with text", () => {
    expect(hasVisibleContent(sampleHtml)).toBe(true);
  });

  test("returns true for JSON with text", () => {
    expect(hasVisibleContent(sampleJsonDoc)).toBe(true);
  });

  test("returns false for empty JSON doc", () => {
    expect(hasVisibleContent(emptyJsonDoc)).toBe(false);
  });
});
