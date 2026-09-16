'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import {
  Bold,
  Columns3,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Rows3,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';

interface ReglementEditorProps {
  /** Lu au montage seulement ; remonter le composant (prop key) pour le remplacer. */
  initialHtml: string;
  onChange: (html: string) => void;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      // Garder la sélection du texte au clic sur le bouton.
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-primary-700 text-white dark:bg-accent-600'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-primary-700/40'
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-primary-700/60" />;
}

function editLink(editor: Editor) {
  const previous = editor.getAttributes('link').href as string | undefined;
  const url = window.prompt('Adresse du lien (laisser vide pour retirer le lien)', previous ?? 'https://');
  if (url === null) return;
  if (url.trim() === '' || url.trim() === 'https://') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  } else {
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }
}

function Toolbar({ editor }: { editor: Editor }) {
  const inTable = editor.isActive('table');
  const iconClass = 'h-4 w-4';

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur dark:border-primary-700/60 dark:bg-primary-900/95">
      <ToolbarButton title="Annuler" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 className={iconClass} />
      </ToolbarButton>
      <ToolbarButton title="Rétablir" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 className={iconClass} />
      </ToolbarButton>
      <Separator />
      <ToolbarButton title="Texte normal" onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')}>
        <Pilcrow className={iconClass} />
      </ToolbarButton>
      <ToolbarButton
        title="Grand titre (partie du règlement)"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
      >
        <Heading2 className={iconClass} />
      </ToolbarButton>
      <ToolbarButton
        title="Titre d'article"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
      >
        <Heading3 className={iconClass} />
      </ToolbarButton>
      <Separator />
      <ToolbarButton title="Gras" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
        <Bold className={iconClass} />
      </ToolbarButton>
      <ToolbarButton title="Italique" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
        <Italic className={iconClass} />
      </ToolbarButton>
      <ToolbarButton title="Souligné" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
        <UnderlineIcon className={iconClass} />
      </ToolbarButton>
      <ToolbarButton title="Lien" onClick={() => editLink(editor)} active={editor.isActive('link')}>
        <LinkIcon className={iconClass} />
      </ToolbarButton>
      <Separator />
      <ToolbarButton title="Liste à puces" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
        <List className={iconClass} />
      </ToolbarButton>
      <ToolbarButton title="Liste numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
        <ListOrdered className={iconClass} />
      </ToolbarButton>
      <ToolbarButton title="Encadré" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
        <Quote className={iconClass} />
      </ToolbarButton>
      <ToolbarButton title="Ligne de séparation" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className={iconClass} />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        title="Insérer un tableau"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        disabled={inTable}
      >
        <TableIcon className={iconClass} />
      </ToolbarButton>
      {inTable && (
        <>
          <ToolbarButton title="Ajouter une ligne" onClick={() => editor.chain().focus().addRowAfter().run()}>
            <Rows3 className={iconClass} />+
          </ToolbarButton>
          <ToolbarButton title="Supprimer la ligne" onClick={() => editor.chain().focus().deleteRow().run()}>
            <Rows3 className={iconClass} />−
          </ToolbarButton>
          <ToolbarButton title="Ajouter une colonne" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <Columns3 className={iconClass} />+
          </ToolbarButton>
          <ToolbarButton title="Supprimer la colonne" onClick={() => editor.chain().focus().deleteColumn().run()}>
            <Columns3 className={iconClass} />−
          </ToolbarButton>
          <ToolbarButton title="Supprimer le tableau" onClick={() => editor.chain().focus().deleteTable().run()}>
            <Trash2 className={`${iconClass} text-red-600`} />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

export default function ReglementEditor({ initialHtml, onChange }: ReglementEditorProps) {
  const [content] = useState(initialHtml);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    // Met à jour l'état actif des boutons de la barre d'outils.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'reglement-content min-h-[60vh] px-5 py-5 sm:px-8 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getHTML()),
  });

  return (
    <div className="card overflow-hidden">
      {editor ? (
        <>
          <Toolbar editor={editor} />
          <EditorContent editor={editor} />
        </>
      ) : (
        <div className="min-h-[60vh] animate-pulse bg-slate-50 dark:bg-primary-900/40" />
      )}
    </div>
  );
}
