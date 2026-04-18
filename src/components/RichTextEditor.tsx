
import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Icon } from './Icons';
import { cn } from '../lib/utils';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    isSmall?: boolean;
    className?: string;
}

const MenuBar = ({ editor, isSmall }: { editor: any, isSmall?: boolean }) => {
    const [isFolded, setIsFolded] = useState(isSmall);

    if (!editor) {
        return null;
    }

    const buttons = [
        { name: 'bold', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), icon: 'bold' },
        { name: 'italic', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), icon: 'italic' },
        { name: 'underline', action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), icon: 'underline' },
        { name: 'h1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), icon: 'heading1' },
        { name: 'h2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), icon: 'heading2' },
        { name: 'h3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), icon: 'heading3' },
        { name: 'bulletList', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), icon: 'list' },
        { name: 'orderedList', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), icon: 'list-ordered' },
    ];

    return (
        <div className="flex flex-col mb-1">
            {isSmall && (
                <button 
                    type="button"
                    onClick={() => setIsFolded(!isFolded)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-dnd-text/40 hover:text-dnd-gold transition-colors mb-1"
                >
                    <Icon name="type" className="w-3 h-3" />
                    {isFolded ? 'Show Formatting' : 'Hide Formatting'}
                </button>
            )}
            
            {!isFolded && (
                <div className="flex flex-wrap gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                    {buttons.map(btn => (
                        <button
                            key={btn.name}
                            type="button"
                            onClick={btn.action}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                btn.active ? "bg-dnd-gold text-white shadow-lg shadow-dnd-gold/20" : "text-dnd-text/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon name={btn.icon} className="w-3.5 h-3.5" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder, isSmall, className }) => {
    const extensions = React.useMemo(() => [
        StarterKit.configure(),
        Placeholder.configure({
            placeholder: placeholder || 'Write something...',
        }),
    ], [placeholder]);

    const editor = useEditor({
        extensions,
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sync content if it changes externally (e.g. when switching items)
    React.useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if not focused to avoid cursor jumps during active typing
            if (!editor.isFocused) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    return (
        <div className={cn("rich-text-editor flex flex-col", className)}>
            <MenuBar editor={editor} isSmall={isSmall} />
            <EditorContent 
                editor={editor} 
                className="w-full rounded-2xl border border-white/5 bg-black/20 text-sm text-dnd-text/60 focus-within:border-dnd-gold/50 transition-all shadow-inner overflow-hidden"
            />
        </div>
    );
};
