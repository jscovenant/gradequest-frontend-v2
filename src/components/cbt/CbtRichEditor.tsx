import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TextAlign } from "@tiptap/extension-text-align";

import { authApi } from "../../utils/axios";

type CbtRichEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  examId?: number | null;
  minHeight?: number;
};

export default function CbtRichEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Type here...",
  examId,
  minHeight = 150,
}: CbtRichEditorProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ allowBase64: false, inline: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [editor, value]);

  async function uploadImage(file: File) {
    if (!editor || !examId) return;

    const payload = new FormData();
    payload.append("image", file);
    const res = await authApi.post(`/cbt/exams/${examId}/questions/images`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const url = res.data?.url;
    if (url) {
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    }
  }

  if (!editor) return null;

  return (
    <div className={`cbt-rich-editor ${disabled ? "is-disabled" : ""}`}>
      <div className="cbt-rich-toolbar">
        <button type="button" title="Bold" disabled={disabled} className={editor.isActive("bold") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleBold().run()}>
          <i className="bi bi-type-bold" />
        </button>
        <button type="button" title="Italic" disabled={disabled} className={editor.isActive("italic") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i className="bi bi-type-italic" />
        </button>
        <button type="button" title="Bullet list" disabled={disabled} className={editor.isActive("bulletList") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <i className="bi bi-list-ul" />
        </button>
        <button type="button" title="Numbered list" disabled={disabled} className={editor.isActive("orderedList") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <i className="bi bi-list-ol" />
        </button>
        <button type="button" title="Align left" disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <i className="bi bi-text-left" />
        </button>
        <button type="button" title="Align center" disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <i className="bi bi-text-center" />
        </button>
        <button type="button" title="Insert table" disabled={disabled} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <i className="bi bi-table" />
        </button>
        <button type="button" title="Add row" disabled={disabled || !editor.isActive("table")} onClick={() => editor.chain().focus().addRowAfter().run()}>
          <i className="bi bi-plus-square" />
        </button>
        <button type="button" title="Add column" disabled={disabled || !editor.isActive("table")} onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <i className="bi bi-plus-square-dotted" />
        </button>
        <button type="button" title="Delete table" disabled={disabled || !editor.isActive("table")} onClick={() => editor.chain().focus().deleteTable().run()}>
          <i className="bi bi-trash" />
        </button>
        <button type="button" title="Upload image" disabled={disabled || !examId} onClick={() => imageInputRef.current?.click()}>
          <i className="bi bi-image" />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadImage(file);
            event.target.value = "";
          }}
        />
      </div>
      <EditorContent editor={editor} className="cbt-rich-content" style={{ minHeight }} />
    </div>
  );
}
