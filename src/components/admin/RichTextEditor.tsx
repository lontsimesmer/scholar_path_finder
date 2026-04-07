import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorLabels {
  paragraph: string;
  heading2: string;
  heading3: string;
  bold: string;
  italic: string;
  bulletList: string;
  orderedList: string;
  quote: string;
  link: string;
  undo: string;
  redo: string;
  linkPrompt: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  labels: RichTextEditorLabels;
  helperText?: string;
  minHeightClassName?: string;
}

const getNormalizedEditorValue = (editor: NonNullable<ReturnType<typeof useEditor>>) =>
  editor.getText().trim().length === 0 ? "" : editor.getHTML();

export const RichTextEditor = ({
  value,
  onChange,
  labels,
  helperText,
  minHeightClassName = "min-h-[300px]",
}: RichTextEditorProps) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "rich-text-editor-content focus:outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(getNormalizedEditorValue(currentEditor));
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const normalizedValue = value.trim();
    const currentValue = getNormalizedEditorValue(editor);

    if (currentValue !== normalizedValue) {
      editor.commands.setContent(normalizedValue || "", false);
    }
  }, [editor, value]);

  const handleLink = () => {
    if (!editor) {
      return;
    }

    const currentUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(labels.linkPrompt, currentUrl || "");

    if (url === null) {
      return;
    }

    const trimmedUrl = url.trim();

    if (trimmedUrl.length === 0) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: trimmedUrl })
      .run();
  };

  const toolbarButtonClassName = "h-9 rounded-xl px-3 shadow-none";

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-white shadow-soft">
      <div className="flex flex-wrap gap-2 border-b border-border/70 bg-secondary/20 p-3">
        <Button
          type="button"
          variant={editor?.isActive("paragraph") ? "default" : "outline"}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor?.chain().focus().setParagraph().run()}
          disabled={!editor}
          title={labels.paragraph}
        >
          <Pilcrow size={16} />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("heading", { level: 2 }) ? "default" : "outline"}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editor}
          title={labels.heading2}
        >
          <Heading2 size={16} />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("heading", { level: 3 }) ? "default" : "outline"}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={!editor}
          title={labels.heading3}
        >
          <Heading3 size={16} />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("bold") ? "default" : "outline"}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editor}
          title={labels.bold}
        >
          <Bold size={16} />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("italic") ? "default" : "outline"}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editor}
          title={labels.italic}
        >
          <Italic size={16} />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("bulletList") ? "default" : "outline"}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={!editor}
          title={labels.bulletList}
        >
          <List size={16} />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("orderedList") ? "default" : "outline"}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={!editor}
          title={labels.orderedList}
        >
          <ListOrdered size={16} />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("blockquote") ? "default" : "outline"}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          disabled={!editor}
          title={labels.quote}
        >
          <Quote size={16} />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive("link") ? "default" : "outline"}
          size="sm"
          className={toolbarButtonClassName}
          onClick={handleLink}
          disabled={!editor}
          title={labels.link}
        >
          <Link2 size={16} />
        </Button>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={toolbarButtonClassName}
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().chain().focus().undo().run()}
            title={labels.undo}
          >
            <Undo2 size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={toolbarButtonClassName}
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().chain().focus().redo().run()}
            title={labels.redo}
          >
            <Redo2 size={16} />
          </Button>
        </div>
      </div>

      <div className={cn("px-5 py-4", minHeightClassName)}>
        <EditorContent editor={editor} />
      </div>

      {helperText ? (
        <p className="border-t border-border/60 bg-secondary/10 px-5 py-3 text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
