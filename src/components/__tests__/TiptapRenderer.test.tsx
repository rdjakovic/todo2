import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import "@testing-library/jest-dom";
import TiptapRenderer from "../TiptapRenderer";

describe("TiptapRenderer", () => {
  test("renders null for undefined content", () => {
    const { container } = render(<TiptapRenderer content={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  test("renders null for empty string", () => {
    const { container } = render(<TiptapRenderer content="" />);
    expect(container.innerHTML).toBe("");
  });

  test("renders paragraph from JSON", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    });

    render(<TiptapRenderer content={json} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  test("renders heading from JSON", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "My Heading" }],
        },
      ],
    });

    const { container } = render(<TiptapRenderer content={json} />);
    const h2 = container.querySelector("h2");
    expect(h2).toBeInTheDocument();
    expect(h2!.textContent).toBe("My Heading");
  });

  test("renders bold and italic marks", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            { type: "text", text: "italic", marks: [{ type: "italic" }] },
          ],
        },
      ],
    });

    const { container } = render(<TiptapRenderer content={json} />);
    expect(container.querySelector("strong")!.textContent).toBe("bold");
    expect(container.querySelector("em")!.textContent).toBe("italic");
  });

  test("renders bullet list from JSON", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 2" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { container } = render(<TiptapRenderer content={json} />);
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe("Item 1");
    expect(items[1].textContent).toBe("Item 2");
  });

  test("renders task list with checkboxes", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Done task" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Open task" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { container } = render(<TiptapRenderer content={json} />);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  test("renders code block", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    });

    const { container } = render(<TiptapRenderer content={json} />);
    expect(container.querySelector("pre")).toBeInTheDocument();
    expect(container.querySelector("code")!.textContent).toBe("const x = 1;");
  });

  test("renders horizontal rule", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Above" }] },
        { type: "horizontalRule" },
        { type: "paragraph", content: [{ type: "text", text: "Below" }] },
      ],
    });

    const { container } = render(<TiptapRenderer content={json} />);
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  test("renders legacy HTML content", () => {
    render(<TiptapRenderer content="<p>Legacy HTML</p>" />);
    expect(screen.getByText("Legacy HTML")).toBeInTheDocument();
  });

  test("applies custom className", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Test" }],
        },
      ],
    });

    const { container } = render(
      <TiptapRenderer content={json} className="custom-class" />
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  test("uses rendered-notes as default className", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Test" }],
        },
      ],
    });

    const { container } = render(<TiptapRenderer content={json} />);
    expect(container.querySelector(".rendered-notes")).toBeInTheDocument();
  });
});
