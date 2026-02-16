import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

const MenuButton = ({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  title: string;
  children: React.ReactNode;
}) => (
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

const RichTextEditor = ({
  content,
  onChange,
  placeholder,
  editable = true,
}: RichTextEditorProps) => {
  // Always holds the latest content prop so onCreate can read it
  const contentRef = useRef(content);
  contentRef.current = content;

  // Track whether the latest content change came from user typing
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        strike: false,
        blockquote: false,
        orderedList: false,
        dropcursor: false,
        gapcursor: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    // Don't pass content here — we set it in onCreate to avoid stale closure
    content: "",
    immediatelyRender: false,
    editable,
    onCreate: ({ editor }) => {
      // Editor just initialized — set content from the ref (always fresh)
      // Use empty string as fallback to ensure editor is initialized even with empty content
      editor.commands.setContent(contentRef.current || "", false);
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
        ...(placeholder && { "data-placeholder": placeholder }),
      },
    },
  });

  // Sync content from parent → editor for changes AFTER creation.
  // Skip when the change originated from user typing.
  useEffect(() => {
    if (!editor) return;

    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const isSame = editor.getHTML() === content;
    if (!isSame) {
      editor.commands.setContent(content || "", false);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-wrapper rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:border-blue-500 dark:focus-within:border-blue-400">
      {editable && (
        <div className="tiptap-toolbar flex flex-wrap gap-0.5 p-1.5 border-b border-gray-200 dark:border-gray-600">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold"
          >
            <strong>B</strong>
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic"
          >
            <em>I</em>
          </MenuButton>

          <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1" />

          <MenuButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            isActive={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            H1
          </MenuButton>
          <MenuButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            H2
          </MenuButton>
          <MenuButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            isActive={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            H3
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            isActive={
              editor.isActive("paragraph") && !editor.isActive("heading")
            }
            title="Normal text"
          >
            P
          </MenuButton>

          <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1" />

          <MenuButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Inline code"
          >
            {"</>"}
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            title="Code block"
          >
            {"{ }"}
          </MenuButton>

          <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1" />

          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet list"
          >
            &bull; List
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive("taskList")}
            title="Task list"
          >
            ☑ Tasks
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            isActive={false}
            title="Horizontal rule"
          >
            &mdash;
          </MenuButton>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
