import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import EditorToolbar from "./EditorToolbar";
import { parseContent } from "../lib/content";

interface RichTextEditorProps {
  initialContent?: string;
  onUpdate: (json: object) => void;
  placeholder?: string;
}

const RichTextEditor = ({
  initialContent,
  onUpdate,
  placeholder,
}: RichTextEditorProps) => {
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
      TaskItem.configure({ nested: true }),
    ],
    content: parseContent(initialContent),
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
        ...(placeholder && { "data-placeholder": placeholder }),
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="tiptap-wrapper rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:border-blue-500 dark:focus-within:border-blue-400">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
