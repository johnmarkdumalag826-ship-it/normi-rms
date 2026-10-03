import React, { useState } from 'react';
import { ArrowLeft, Download, ExternalLink, LogOut, RefreshCw, Send, Trash2, UploadCloud } from 'lucide-react';
import { User, Research, ProposalFile } from '../types';
import { uploadFile, resolveFileUrl, ApiError } from '../api/client';
import { downloadFile, openFile, fileErrorMessage } from '../api/files';
import { Alert, Avatar, Badge, BrandLogo, Button, Card, ConfirmDialog, Input, cx, formatDateLong, roleLabels } from '../ui';

interface TitleProposalFormProps {
  user: User;
  /** The group that is already registered; its adviser and members were chosen at the start. */
  research: Research;
  adviserName: string;
  onSubmit: (data: { title: string; proposalFiles: ProposalFile[] }) => void;
  onBack: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}

const MAX_SIZE = 15 * 1024 * 1024;

/** After the title hearing, the group sends the title it chose and its file. */
export default function TitleProposalForm({
  user, research, adviserName, onSubmit, onBack, onLogout, onOpenProfile,
}: TitleProposalFormProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<ProposalFile | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const titleError = attempted && !title.trim() ? 'Please type your research title.' : undefined;

  const handleFileUpload = async (chosen: File) => {
    const lower = chosen.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setError('Please choose a PDF or Word (DOCX) file.');
      return;
    }
    if (chosen.size > MAX_SIZE) {
      setError('That file is too big. Please choose a file smaller than 15 MB.');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFile(chosen);
      setFile({
        id: `prop-file-${Date.now()}`,
        category: 'proposal_document',
        name: uploaded.fileName,
        url: resolveFileUrl(uploaded.url),
        size: uploaded.size,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not upload your file. Please check your internet connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
    e.target.value = ''; // so the same file can be chosen again
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!title.trim()) {
      setError('Please type your research title.');
      return;
    }
    if (!file) {
      setError('Please add your file (PDF or Word) before sending.');
      return;
    }
    setError(null);
    setConfirming(true);
  };

  const submitConfirmed = () => {
    if (!file) return;
    onSubmit({ title: title.trim(), proposalFiles: [file] });
    setConfirming(false);
  };

  const sizeInKb = file?.size ? Math.round(file.size / 102.4) / 10 : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo className="h-11 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="font-serif text-lg font-bold text-navy-900">NORMI</p>
              <p className="hidden text-xs text-slate-600 sm:block">Research Management System</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex min-h-11 items-center gap-2 rounded-lg p-1 hover:bg-slate-100 cursor-pointer"
              aria-label={`Open your profile and settings (${user.name}, ${roleLabels[user.role]})`}
            >
              <div className="hidden sm:block text-right min-w-0">
                <p className="max-w-32 truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <Badge tone="info">{roleLabels[user.role]}</Badge>
              </div>
              <Avatar name={user.name} src={user.avatar} size="md" />
            </button>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={onLogout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Send your title proposal</h1>
          <p className="text-base text-slate-600">
            {research.groupName ? <>Group <strong>{research.groupName}</strong>. </> : null}
            Type the title your group chose and add your file. Your adviser, <strong>{adviserName}</strong>, will read it.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <p className="text-sm text-slate-600">Fields marked with * are required.</p>

            {error && <Alert tone="danger" title="Please check the form">{error}</Alert>}

            <Input
              label="Research title"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              hint="The title your group chose."
              placeholder="e.g. Web-Based Research Management System"
              error={titleError}
            />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                Your file <span className="text-rose-700" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </p>

              {!file ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={cx(
                    'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center',
                    dragActive ? 'border-blue-700 bg-blue-50' : 'border-slate-300 bg-slate-50',
                  )}
                >
                  <UploadCloud className="h-8 w-8 text-blue-800" aria-hidden="true" />
                  <p className="text-sm text-slate-700">Drop your file here, or choose it from your device.</p>
                  <Button
                    icon={isUploading ? RefreshCw : UploadCloud}
                    loading={isUploading}
                    onClick={() => document.getElementById('proposal-input')?.click()}
                  >
                    {isUploading ? 'Uploading…' : 'Choose a File'}
                  </Button>
                  <p className="text-xs text-slate-600">Only PDF and Word (DOCX) files, smaller than 15 MB.</p>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-600">
                      {sizeInKb !== null ? `${sizeInKb} KB · ` : ''}Added {formatDateLong(file.uploadedAt)}
                    </p>
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
                    <Button
                      variant="secondary" size="sm" icon={isUploading ? RefreshCw : UploadCloud} loading={isUploading}
                      onClick={() => document.getElementById('proposal-input')?.click()}
                    >
                      Replace File
                    </Button>
                    <Button variant="danger" size="sm" icon={Trash2} onClick={() => setFile(null)}>Remove File</Button>
                  </div>
                </div>
              )}

              <input
                id="proposal-input"
                type="file"
                accept=".pdf,.docx"
                className="sr-only"
                tabIndex={-1}
                disabled={isUploading}
                onChange={handleSelect}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
              <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>Back to Home</Button>
              <Button type="submit" icon={Send}>Send My Title Proposal</Button>
            </div>
          </form>
        </Card>
      </main>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={submitConfirmed}
        title="Send your title proposal?"
        message={`“${title.trim()}” will be sent to ${adviserName}. You can send new versions later from My Research.`}
        confirmLabel="Yes, Send My Title Proposal"
        cancelLabel="No, Let Me Check"
      />
    </div>
  );
}
