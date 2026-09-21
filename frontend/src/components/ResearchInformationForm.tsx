import React, { useState } from 'react';
import {
  FileText, Users, ArrowRight, ArrowLeft, UploadCloud, Eye, Trash2, Download, RefreshCw, LogOut, ExternalLink, Send,
} from 'lucide-react';
import { User, ProposalFile } from '../types';
import { uploadFile, resolveFileUrl, ApiError } from '../api/client';
import { downloadFile, openFile, fileErrorMessage } from '../api/files';
import {
  Alert, Badge, Button, Card, ConfirmDialog, Input, Modal, Select, Textarea, cx, formatDateLong,
} from '../ui';

interface ResearchInformationFormProps {
  user: User;
  advisers: User[];
  onSubmit: (data: {
    title: string;
    abstract: string;
    keywords: string[];
    adviserId: string;
    members: string[];
    fileName: string;
    proposalFiles?: ProposalFile[];
  }) => void;
  onLogout: () => void;
}

const categoryLabels: Record<ProposalFile['category'], string> = {
  proposal_document: 'Main document',
  research_summary: 'Research summary',
  supporting_files: 'Supporting file',
  other_attachments: 'Other file',
};

export default function ResearchInformationForm({
  user, advisers, onSubmit, onLogout
}: ResearchInformationFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [adviserId, setAdviserId] = useState('');
  const [memberNames, setMemberNames] = useState('');
  const [attemptedNext, setAttemptedNext] = useState(false);

  // Files
  const [dragActive, setDragActive] = useState(false);
  const [proposalFiles, setProposalFiles] = useState<ProposalFile[]>([]);
  const [uploadCategory, setUploadCategory] = useState<'proposal_document' | 'research_summary' | 'supporting_files' | 'other_attachments'>('proposal_document');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ProposalFile | null>(null);

  // Final "are you sure?"
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  const handleFileUpload = async (file: File) => {
    const lower = file.name.toLowerCase();
    const isPdfOrDocx = lower.endsWith('.pdf') || lower.endsWith('.docx');
    if (!isPdfOrDocx) {
      setError('Please choose a PDF or Word (DOCX) file.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFile(file);
      const fileData = {
        name: uploaded.fileName,
        url: resolveFileUrl(uploaded.url),
        size: uploaded.size,
        uploadedAt: new Date().toISOString(),
      };

      if (replaceTargetId) {
        setProposalFiles(prev => prev.map(f => f.id === replaceTargetId ? { ...f, ...fileData } : f));
        setReplaceTargetId(null);
        return;
      }

      // Main document and summary: one file each. Other categories can have many.
      const isSingleCategory = uploadCategory === 'proposal_document' || uploadCategory === 'research_summary';
      const existing = proposalFiles.find(f => f.category === uploadCategory);

      if (isSingleCategory && existing) {
        setProposalFiles(prev => prev.map(f => f.category === uploadCategory ? { ...f, ...fileData } : f));
        return;
      }

      const newFile: ProposalFile = {
        id: `prop-file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        category: uploadCategory,
        ...fileData,
      };

      setProposalFiles(prev => [...prev, newFile]);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'We could not upload your file. Please check your internet connection and try again.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
      e.target.value = ''; // so the same file can be chosen again
    }
  };

  const triggerReplace = (id: string) => {
    setReplaceTargetId(id);
    document.getElementById('manuscript-input')?.click();
  };

  const handleDeleteFile = (id: string) => {
    setProposalFiles(prev => prev.filter(f => f.id !== id));
  };

  // The server gives a short private link. The person who uploaded a file can always open it.
  const handleFileDownload = (file: ProposalFile) => {
    setError(null);
    downloadFile(file.url, file.name).catch(err => setError(fileErrorMessage(err)));
  };

  const handleFileOpen = (file: ProposalFile) => {
    setError(null);
    openFile(file.url).catch(err => setError(fileErrorMessage(err)));
  };

  const titleError = attemptedNext && !title.trim() ? 'Please write your research title.' : undefined;
  const abstractError = attemptedNext && !abstract.trim() ? 'Please write a short summary of your research.' : undefined;
  const adviserError = attemptedNext && !adviserId ? 'Please choose your adviser.' : undefined;
  const keywordsError = attemptedNext && !keywordsStr.split(',').some(k => k.trim()) ? 'Please add at least one keyword.' : undefined;

  const handleNextStep = () => {
    setAttemptedNext(true);
    if (!title.trim() || !abstract.trim() || !adviserId || !keywordsStr.split(',').some(k => k.trim())) {
      setError('Some details are missing. Please fix the fields marked in red.');
      return;
    }
    setError(null);
    setStep(2);
  };

  // Step 2 button: check the main file, then ask "are you sure?"
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mainDoc = proposalFiles.find(f => f.category === 'proposal_document');
    if (!mainDoc) {
      setError('Please upload your main document (PDF or Word) before sending. Choose “Main document” below, then add your file.');
      return;
    }
    setError(null);
    setConfirmingSubmit(true);
  };

  // Confirmed: send it
  const submitConfirmed = () => {
    const mainDoc = proposalFiles.find(f => f.category === 'proposal_document');
    if (!mainDoc) return;

    const keywords = keywordsStr
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const members = memberNames
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);

    onSubmit({
      title: title.trim(),
      abstract: abstract.trim(),
      keywords,
      adviserId,
      members: [user.name, ...members],
      fileName: mainDoc.name,
      proposalFiles: proposalFiles
    });
    setConfirmingSubmit(false);
  };

  const adviserName = advisers.find(a => a.id === adviserId)?.name ?? '—';
  const stepTitle = step === 1 ? 'Your research details' : 'Your group and your files';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="font-serif text-lg font-bold text-navy-900">NORMI</p>
              <p className="text-xs text-slate-600">Research Management System</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={LogOut} onClick={onLogout}>Sign Out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Start your research paper</h1>
          <p className="text-base text-slate-600">
            Welcome, {user.name}. Before you can use the system, tell us about your research paper. It takes about 5 minutes.
          </p>
        </div>

        {/* Where am I? */}
        <div aria-live="polite">
          <p className="text-sm font-semibold text-slate-700">Step {step} of 2 · {stepTitle}</p>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={2}
            aria-valuenow={step}
            aria-label={`Step ${step} of 2`}
            className="mt-2 flex gap-2"
          >
            <span className="h-2 flex-1 rounded-full bg-blue-800" />
            <span className={cx('h-2 flex-1 rounded-full', step === 2 ? 'bg-blue-800' : 'bg-slate-300')} />
          </div>
        </div>

        <Card className="space-y-6">
          {error && <Alert tone="danger" title="Please check the form">{error}</Alert>}

          {step === 1 ? (
            /* Step 1: title, summary, adviser */
            <div className="space-y-5">
              <p className="text-sm text-slate-600">Fields marked with * are required.</p>

              <Input
                label="Research title"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                hint="The name of your research paper."
                placeholder="e.g. Web-Based Research Management System"
                error={titleError}
              />

              <Textarea
                label="Short summary (abstract)"
                required
                rows={5}
                value={abstract}
                onChange={e => setAbstract(e.target.value)}
                hint="What problem will you solve, and how? A few sentences is enough."
                error={abstractError}
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Select
                  label="Your adviser"
                  required
                  value={adviserId}
                  onChange={e => setAdviserId(e.target.value)}
                  hint="The teacher who will guide your group."
                  error={adviserError}
                >
                  <option value="">Choose your adviser…</option>
                  {advisers.map(adv => (
                    <option key={adv.id} value={adv.id}>{adv.name}</option>
                  ))}
                </Select>

                <Input
                  label="Keywords"
                  required
                  value={keywordsStr}
                  onChange={e => setKeywordsStr(e.target.value)}
                  hint="Separate each keyword with a comma."
                  placeholder="e.g. Web-based, Monitoring"
                  error={keywordsError}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button icon={ArrowRight} onClick={handleNextStep}>Continue to Step 2</Button>
              </div>
            </div>
          ) : (
            /* Step 2: group members and files */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Input
                  label="Other students in your group"
                  optional
                  value={memberNames}
                  onChange={e => setMemberNames(e.target.value)}
                  hint="Type their names separated by commas. Do not type your own name."
                  placeholder="e.g. Juan dela Cruz, Maria Santos"
                />
                <p className="flex items-center gap-2 text-sm text-slate-700">
                  <Users className="h-4 w-4 text-slate-600" aria-hidden="true" />
                  You (<strong>{user.name}</strong>) are added automatically as the group leader.
                </p>
              </div>

              <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
                <legend className="px-2 text-base font-bold text-slate-900">Your files</legend>
                <p className="text-sm text-slate-600">
                  You must add your <strong>main document</strong>. Other files are optional. Only PDF and Word (DOCX) files are accepted.
                </p>

                <Select
                  label="What kind of file is this?"
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value as typeof uploadCategory)}
                >
                  <option value="proposal_document">Main document (required)</option>
                  <option value="research_summary">Research summary</option>
                  <option value="supporting_files">Supporting files (data, syllabus)</option>
                  <option value="other_attachments">Other files</option>
                </Select>

                {/* Drop area */}
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
                  <input
                    id="manuscript-input"
                    type="file"
                    accept=".pdf,.docx"
                    className="sr-only"
                    tabIndex={-1}
                    disabled={isUploading}
                    onChange={handleFileSelect}
                  />
                  <UploadCloud className="h-8 w-8 text-blue-800" aria-hidden="true" />
                  <p className="text-sm text-slate-700">Drop your file here, or choose it from your device.</p>
                  <Button
                    icon={isUploading ? RefreshCw : UploadCloud}
                    loading={isUploading}
                    onClick={() => document.getElementById('manuscript-input')?.click()}
                  >
                    {isUploading ? 'Uploading…' : 'Choose a File'}
                  </Button>
                </div>

                {/* Files added so far */}
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-900">Files you added ({proposalFiles.length})</p>
                  {proposalFiles.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      No files yet. Please add your <strong>main document</strong>.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                      {proposalFiles.map(file => {
                        const sizeInKb = file.size ? Math.round(file.size / 102.4) / 10 : null;
                        return (
                          <li key={file.id} className="flex flex-col gap-3 p-4">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={file.category === 'proposal_document' ? 'info' : 'neutral'}>{categoryLabels[file.category]}</Badge>
                                {sizeInKb !== null && <span className="text-xs text-slate-600">{sizeInKb} KB</span>}
                              </div>
                              <p className="break-words text-sm font-semibold text-slate-900">{file.name}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" icon={Eye} onClick={() => setPreviewFile(file)}>File Details</Button>
                              <Button variant="secondary" size="sm" icon={Download} onClick={() => handleFileDownload(file)}>Download</Button>
                              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => triggerReplace(file.id)}>Replace File</Button>
                              <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDeleteFile(file.id)}>Remove File</Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </fieldset>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
                <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)}>Back to Step 1</Button>
                <Button type="submit" icon={Send}>Send My Research Title</Button>
              </div>
            </form>
          )}
        </Card>
      </main>

      {/* File details */}
      <Modal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title="File details"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewFile(null)}>Close</Button>
            {previewFile && (
              <Button icon={ExternalLink} onClick={() => handleFileOpen(previewFile)}>Open File</Button>
            )}
          </>
        }
      >
        {previewFile && (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-600">File name</dt>
              <dd className="break-words font-semibold text-slate-900">{previewFile.name}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Kind of file</dt>
              <dd className="font-semibold text-slate-900">{categoryLabels[previewFile.category]}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Size</dt>
              <dd className="font-semibold text-slate-900">
                {previewFile.size ? `${Math.round(previewFile.size / 102.4) / 10} KB` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Added on</dt>
              <dd className="font-semibold text-slate-900">{formatDateLong(previewFile.uploadedAt)}</dd>
            </div>
          </dl>
        )}
      </Modal>

      {/* Are you sure? */}
      <ConfirmDialog
        open={confirmingSubmit}
        onCancel={() => setConfirmingSubmit(false)}
        onConfirm={submitConfirmed}
        title="Send your research title?"
        message={`“${title.trim()}” will be sent to ${adviserName}. You can send new versions later from your home page.`}
        confirmLabel="Yes, Send My Research Title"
        cancelLabel="No, Let Me Check"
      />
    </div>
  );
}
