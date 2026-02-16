import React from "react";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { isJsonContent } from "../lib/content";

interface TiptapMark {
  type: string;
}

interface TiptapTextNode {
  type: "text";
  text: string;
  marks?: TiptapMark[];
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: (TiptapNode | TiptapTextNode)[];
  text?: string;
  marks?: TiptapMark[];
}

interface TiptapDoc {
  type: "doc";
  content: TiptapNode[];
}

interface TiptapRendererProps {
  content: string | undefined;
  className?: string;
}

// Must match the extensions used in RichTextEditor
const extensions = [
  StarterKit.configure({
    strike: false,
    blockquote: false,
    orderedList: false,
    dropcursor: false,
    gapcursor: false,
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
];

/** Converts stored content (JSON string or legacy HTML) into a TipTap JSON doc. */
function getJsonDoc(content?: string): TiptapDoc | null {
  if (!content) return null;

  if (isJsonContent(content)) {
    try {
      return JSON.parse(content) as TiptapDoc;
    } catch {
      return null;
    }
  }

  // Legacy HTML — convert to JSON via TipTap
  try {
    return generateJSON(content, extensions) as TiptapDoc;
  } catch {
    return null;
  }
}

function renderMarks(text: string, marks?: TiptapMark[]): React.ReactNode {
  if (!marks || marks.length === 0) return text;

  return marks.reduce<React.ReactNode>((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "code":
        return <code>{acc}</code>;
      default:
        return acc;
    }
  }, text);
}

function renderNode(
  node: TiptapNode | TiptapTextNode,
  index: number
): React.ReactNode {
  if (node.type === "text") {
    return (
      <React.Fragment key={index}>
        {renderMarks(node.text || "", node.marks)}
      </React.Fragment>
    );
  }

  const blockNode = node as TiptapNode;
  const children = blockNode.content?.map((child: TiptapNode | TiptapTextNode, i: number) => renderNode(child, i));

  switch (node.type) {
    case "paragraph":
      return <p key={index}>{children}</p>;

    case "heading": {
      const level = (blockNode.attrs?.level as number) || 1;
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      return <Tag key={index}>{children}</Tag>;
    }

    case "bulletList":
      return <ul key={index}>{children}</ul>;

    case "listItem":
      return <li key={index}>{children}</li>;

    case "codeBlock":
      return (
        <pre key={index}>
          <code>{children}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr key={index} />;

    case "hardBreak":
      return <br key={index} />;

    case "taskList":
      return (
        <ul key={index} data-type="taskList">
          {children}
        </ul>
      );

    case "taskItem": {
      const checked = (blockNode.attrs?.checked as boolean) || false;
      return (
        <li key={index} data-type="taskItem">
          <label>
            <input type="checkbox" checked={checked} readOnly />
          </label>
          <div>{children}</div>
        </li>
      );
    }

    default:
      return <span key={index}>{children}</span>;
  }
}

const TiptapRenderer: React.FC<TiptapRendererProps> = ({
  content,
  className,
}) => {
  const doc = getJsonDoc(content);

  if (!doc || !doc.content || doc.content.length === 0) {
    return null;
  }

  return (
    <div className={className || "rendered-notes"}>
      {doc.content.map((node, index) => renderNode(node, index))}
    </div>
  );
};

export default TiptapRenderer;
