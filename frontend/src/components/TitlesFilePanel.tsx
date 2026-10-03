import { useState } from 'react';
import { CheckCircle2, Clock, Download, ExternalLink, FileText, RefreshCw, UploadCloud, Wrench } from 'lucide-react';
import { Research } from '../types';
import { uploadFile, resolveFileUrl, ApiError } from '../api/client';
import { downloadFile, openFile, fileErrorMessage } from '../api/files';
import { Alert, Badge, Button, formatDateLong } from '../ui';

interface TitlesFilePanelProps {
  research: Research;
  /** False once the title hearing is done: the file is then only shown, not replaced. */
  canSend: boolean;
  onSendTitleList: (researchId: string, file: { name: string; url: string; size: number }) => Promise<void>;
  /** The page already has its own button for sending the file, so this panel does not repeat it. */
  hideButton?: boolean;
}

/**
 * The file with the titles a group prepared for its title hearing: send it (or send a new one),
 * open it, and see what the adviser decided. Used on Home (Step 1) and on My Research.
 */
export function TitlesFilePanel({ research, canSend, onSendTitleList, hideButton = false }: TitlesFilePanelProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = research.proposalFiles?.find(f => f.category === 'title_list');
  const review = research.titleReview?.status ?? 'Pending';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    e.target.value = ''; // so the same file can be chosen again
    if (!chosen) return;
    const lower = chosen.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setError('Please choose a PDF or Word (DOCX) file.');
      return;
    }
    if (chosen.size > 15 * 1024 * 1024) {
      setError('That file is too big. Please choose a file smaller than 15 MB.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const uploaded = await uploadFile(chosen);
      await onSendTitleList(research.id, { name: uploaded.fileName, url: resolveFileUrl(uploaded.url), size: uploaded.size });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not upload your file. Please check your internet connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div id="titles-card" className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FileText className="h-5 w-5 text-blue-800" aria-hidden="true" />
          Your prepared titles
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {canSend
            ? 'Put the titles your group prepared in one file (PDF or Word). Your adviser checks it and approves it, then the panel reads it at your title hearing.'
            : 'This is the file your group sent for the title hearing.'}
        </p>
      </div>

      {error && <Alert tone="danger" title="We could not send your file">{error}</Alert>}

      {file ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success" icon={CheckCircle2}>Sent</Badge>
              {review === 'Approved' && <Badge tone="success" icon={CheckCircle2}>Approved by your adviser</Badge>}
              {review === 'Revision Required' && <Badge tone="warning" icon={Wrench}>Your adviser asked for changes</Badge>}
              {review === 'Pending' && <Badge tone="info" icon={Clock}>Waiting for your adviser</Badge>}
            </div>
            <p className="mt-2 break-words text-sm font-semibold text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-600">Sent {formatDateLong(file.uploadedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary" size="sm" icon={ExternalLink}
              onClick={() => openFile(file.url).catch(err => setError(fileErrorMessage(err)))}
            >
              Open File
            </Button>
            <Button
              variant="secondary" size="sm" icon={Download}
              onClick={() => downloadFile(file.url, file.name).catch(err => setError(fileErrorMessage(err)))}
            >
              Download
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">You have not sent a file yet.</p>
      )}

      {review === 'Revision Required' && research.titleReview?.feedback && (
        <Alert tone="warning" title="What your adviser asked you to change">{research.titleReview.feedback}</Alert>
      )}

      {canSend && (
        <div>
          <input
            id="titles-input"
            type="file"
            accept=".pdf,.docx"
            className="sr-only"
            tabIndex={-1}
            disabled={sending}
            onChange={handleFile}
          />
          {!hideButton && (
            <>
              <Button
                icon={sending ? RefreshCw : UploadCloud}
                loading={sending}
                onClick={() => document.getElementById('titles-input')?.click()}
              >
                {sending ? 'Sending…' : file ? 'Send a New File' : 'Send Titles File'}
              </Button>
              <p className="mt-2 text-xs text-slate-600">Only PDF and Word (DOCX) files, smaller than 15 MB. A new file replaces the old one and goes to your adviser to check again.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
