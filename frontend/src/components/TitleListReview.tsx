import { useState } from 'react';
import { CheckCircle2, Download, ExternalLink, FileText, MessageSquare } from 'lucide-react';
import { Research } from '../types';
import { downloadFile, openFile, fileErrorMessage } from '../api/files';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, Textarea, formatDateLong } from '../ui';

interface TitleListReviewProps {
  research: Research;
  onReview: (researchId: string, decision: 'Approve' | 'Revision', feedback?: string) => Promise<void>;
}

const reviewBadge = {
  'Pending': { tone: 'warning', label: 'Waiting for your check' },
  'Approved': { tone: 'success', label: 'Approved' },
  'Revision Required': { tone: 'warning', label: 'Changes asked' },
} as const;

/** The adviser reads the file with a group's prepared titles, then approves it or asks for changes. */
export function TitleListReview({ research, onReview }: TitleListReviewProps) {
  const file = research.proposalFiles?.find(f => f.category === 'title_list');
  const status = research.titleReview?.status ?? 'Pending';
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingApprove, setConfirmingApprove] = useState(false);

  if (!file) {
    return (
      <EmptyState
        icon={FileText}
        title="No titles sent yet"
        description="When this group sends the file with its prepared titles for the title hearing, you can check it here."
      />
    );
  }

  const decide = async (decision: 'Approve' | 'Revision') => {
    setError(null);
    if (decision === 'Revision' && !note.trim()) {
      setError('Please write what the students should change.');
      return;
    }
    setSaving(true);
    try {
      await onReview(research.id, decision, note.trim());
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Badge tone={reviewBadge[status].tone}>{reviewBadge[status].label}</Badge>
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-slate-900">{file.name}</p>
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

      {error && <Alert tone="danger" title="Please check">{error}</Alert>}

      {status === 'Revision Required' && research.titleReview?.feedback && (
        <Alert tone="warning" title="Your note to the students">{research.titleReview.feedback}</Alert>
      )}
      {status === 'Approved' && research.titleReview?.reviewedAt && (
        <p className="text-sm text-slate-700">
          You approved these titles on {formatDateLong(research.titleReview.reviewedAt)}. If you change your mind, you can still ask for changes.
        </p>
      )}

      <Textarea
        label="Note for the students"
        optional
        rows={3}
        value={note}
        onChange={e => setNote(e.target.value)}
        hint="Needed when you ask for changes. Say what they should fix."
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button icon={CheckCircle2} disabled={saving || status === 'Approved'} onClick={() => setConfirmingApprove(true)}>
          Approve Titles
        </Button>
        <Button variant="secondary" icon={MessageSquare} disabled={saving} onClick={() => decide('Revision')}>
          Ask for Changes
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingApprove}
        onCancel={() => setConfirmingApprove(false)}
        onConfirm={() => { setConfirmingApprove(false); decide('Approve'); }}
        title="Approve these titles?"
        message="The students will be told that you approved the titles they prepared for the title hearing."
        confirmLabel="Yes, Approve Titles"
        cancelLabel="No, Keep Checking"
      />
    </div>
  );
}
