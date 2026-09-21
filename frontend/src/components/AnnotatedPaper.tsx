import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { CommentAnchor } from '../types';
import { useFileLink } from '../api/files';
import { Alert, Button, Card, PaperViewer, Textarea, type PaperHighlight } from '../ui';

interface AnnotatedPaperProps {
  /** The stored address of the file (goes through the private-link step). */
  fileUrl: string;
  fileName: string;
  highlights: PaperHighlight[];
  focus: { id: string; n: number } | null;
  onHighlightClick: (id: string) => void;
  /** Give this to let the person highlight text and comment. Leave it out to only read. */
  onCreateComment?: (text: string, anchor: CommentAnchor) => void;
}

/**
 * The paper on screen with the highlights people made. If `onCreateComment` is given, selecting text
 * opens a small box to write a comment about it.
 */
export function AnnotatedPaper({ fileUrl, fileName, highlights, focus, onHighlightClick, onCreateComment }: AnnotatedPaperProps) {
  const fileLink = useFileLink(fileUrl);
  const [pending, setPending] = useState<CommentAnchor | null>(null);
  const [text, setText] = useState('');

  if (fileLink.loading) {
    return <p role="status" className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">Opening the paper…</p>;
  }
  if (fileLink.error) return <Alert tone="danger" title="We could not open the paper">{fileLink.error}</Alert>;
  if (!fileLink.url) return null;

  const cancel = () => {
    setPending(null);
    setText('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || !text.trim() || !onCreateComment) return;
    onCreateComment(text.trim(), pending);
    cancel();
  };

  return (
    <Card className="relative">
      <PaperViewer
        key={fileLink.url}
        url={fileLink.url}
        fileName={fileName}
        highlights={highlights}
        pending={pending}
        focus={focus}
        onSelect={onCreateComment ? anchor => { setPending(anchor); setText(''); } : undefined}
        onHighlightClick={onHighlightClick}
      />

      {/* Write a comment about the text that was just highlighted */}
      {pending && (
        <form
          onSubmit={submit}
          aria-label="Comment on the highlighted text"
          className="absolute inset-x-5 bottom-5 z-20 space-y-3 rounded-xl border-2 border-blue-700 bg-white p-4 shadow-2xl"
        >
          <p className="text-sm font-bold text-slate-900">Comment on the highlighted text</p>
          <p className="max-h-16 overflow-y-auto border-l-4 border-blue-400 pl-3 text-sm italic text-slate-700">“{pending.quote}”</p>
          <Textarea
            label="Your comment"
            required
            autoFocus
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="e.g. Please add a source for this sentence"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={cancel}>Cancel</Button>
            <Button type="submit" icon={MessageSquare}>Add Comment</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
