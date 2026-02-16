import type { Editor } from "@tiptap/react";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarButton = ({
  onClick,
  isActive,
  title,
  children,
}: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded text-xs font-medium transition-colors ${
      isActive
        ? "bg-blue-500 text-white"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
    }`}
  >
    {children}
  </button>
);

const ToolbarDivider = () => (
  <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1" />
);

interface EditorToolbarProps {
  editor: Editor;
}

const EditorToolbar = ({ editor }: EditorToolbarProps) => (
  <div className="tiptap-toolbar flex flex-wrap gap-0.5 p-1.5 border-b border-gray-200 dark:border-gray-600">
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBold().run()}
      isActive={editor.isActive("bold")}
      title="Bold"
    >
      <strong>B</strong>
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleItalic().run()}
      isActive={editor.isActive("italic")}
      title="Italic"
    >
      <em>I</em>
    </ToolbarButton>

    <ToolbarDivider />

    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      isActive={editor.isActive("heading", { level: 1 })}
      title="Heading 1"
    >
      H1
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      isActive={editor.isActive("heading", { level: 2 })}
      title="Heading 2"
    >
      H2
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      isActive={editor.isActive("heading", { level: 3 })}
      title="Heading 3"
    >
      H3
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().setParagraph().run()}
      isActive={editor.isActive("paragraph") && !editor.isActive("heading")}
      title="Normal text"
    >
      P
    </ToolbarButton>

    <ToolbarDivider />

    <ToolbarButton
      onClick={() => editor.chain().focus().toggleCode().run()}
      isActive={editor.isActive("code")}
      title="Inline code"
    >
      {"</>"}
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      isActive={editor.isActive("codeBlock")}
      title="Code block"
    >
      {"{ }"}
    </ToolbarButton>

    <ToolbarDivider />

    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      isActive={editor.isActive("bulletList")}
      title="Bullet list"
    >
      &bull; List
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleTaskList().run()}
      isActive={editor.isActive("taskList")}
      title="Task list"
    >
      &#9745; Tasks
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().setHorizontalRule().run()}
      isActive={false}
      title="Horizontal rule"
    >
      &mdash;
    </ToolbarButton>
  </div>
);

export default EditorToolbar;
