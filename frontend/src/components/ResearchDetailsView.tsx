import React, { useMemo, useState } from 'react';
import {
  FileText, History, MessageSquare, Send, Upload, Download, Bookmark, ClipboardCheck,
} from 'lucide-react';
import { Research, ResearchVersion, ResearchComment, User, ChapterStatus, CommentAnchor } from '../types';
import { resolveFileUrl, uploadFile, ApiError } from '../api/client';
import { downloadFile, fileErrorMessage } from '../api/files';
import { AnnotatedPaper } from './AnnotatedPaper';
import {
  Alert, Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageHeader, ResearchStatusBadge, Select, StatusBadge,
  Textarea, chapterNames, chapterStatus, cx, formatDateLong, formatDateTime, roleLabels, type PaperHighlight,
} from '../ui';

interface ResearchDetailsViewProps {
  research: Research;
  versions: ResearchVersion[];
  comments: ResearchComment[];
  user: User;
  onBack: () => void;
  onAddComment: (comment: ResearchComment) => void;
  onUpdateChapterStatus: (researchId: string, versionId: string, chapter: string, status: 'Approved' | 'Revision Required' | 'Pending', feedback: string) => void;
  onStudentUploadRevision: (
    researchId: string, title: string, abstract: string, fileName: string, fileUrl: string,
    type: 'adviser_check' | 'defense_manuscript',
  ) => void;
}

const subtitles: Record<string, string> = {
  student: 'Follow your paper’s progress, read your adviser’s feedback, and send new versions.',
  adviser: 'Read this group’s paper, check each chapter, and leave feedback.',
  panelist: 'Read the defense copy and leave your comments.',
  coordinator: 'See this paper’s versions, chapters and comments.',
  admin: 'See this paper’s versions, chapters and comments.',
};

const chapterFilters = ['all', 'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'general'] as const;
type ChapterFilter = (typeof chapterFilters)[number];

export default function ResearchDetailsView({
  research, versions, comments, user, onBack, onAddComment, onUpdateChapterStatus, onStudentUploadRevision
}: ResearchDetailsViewProps) {
  const [activeChapterFilter, setActiveChapterFilter] = useState<ChapterFilter>('all');
  const [newCommentText, setNewCommentText] = useState('');

  // Student: send a new version
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTitle, setNewTitle] = useState(research.title);
  const [newAbstract, setNewAbstract] = useState(research.abstract);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'adviser_check' | 'defense_manuscript'>('adviser_check');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Shown when a file could not be opened (for example: not allowed, or no internet)
  const [fileNotice, setFileNotice] = useState<string | null>(null);

  const handleDownload = (storedUrl: string, name?: string) => {
    setFileNotice(null);
    downloadFile(storedUrl, name).catch(err => setFileNotice(fileErrorMessage(err)));
  };

  // Adviser: feedback on one chapter
  const [selectedReviewChapter, setSelectedReviewChapter] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Revision Required'>('Approved');
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Filter version history based on role:
  // Panelists see the defense manuscripts, advisers see the drafts for adviser checking.
  const myVersions = versions.filter(v => {
    if (v.researchId !== research.id) return false;
    if (user.role === 'panelist') {
      return v.type === 'defense_manuscript';
    }
    if (user.role === 'adviser') {
      return v.type !== 'defense_manuscript';
    }
    return true; // Student, Coordinator, Admin see all
  }).sort((a, b) => b.versionNumber - a.versionNumber);

  const currentVersion = myVersions[0];

  // Only people who check the paper can highlight text. Students read the highlights and reply in the comments.
  const canMark = user.role !== 'student';
  // The comment (and highlight) to jump to. `n` changes on every click so the same one can be shown again.
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);

  const highlights = useMemo<PaperHighlight[]>(
    () => comments
      .filter(c => c.researchId === research.id && c.anchor && c.versionId === currentVersion?.id)
      .map(c => ({ id: c.id, anchor: c.anchor as CommentAnchor, resolved: c.resolved })),
    [comments, research.id, currentVersion?.id],
  );

  const handleCreateHighlightComment = (text: string, anchor: CommentAnchor) => {
    if (!currentVersion) return;
    onAddComment({
      id: `comm-${Date.now()}`,
      researchId: research.id,
      versionId: currentVersion.id,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      chapter: 'general',
      text,
      anchor,
      commentAt: new Date().toISOString(),
      resolved: false,
    });
  };

  const showInPaper = (id: string) => {
    setFocus({ id, n: Date.now() });
    document.getElementById('paper-viewer')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const activeComments = comments.filter(c =>
    c.researchId === research.id &&
    (activeChapterFilter === 'all' || c.chapter === activeChapterFilter)
  );

  // ---- What the student may send, based on where the paper is ----
  const draftStatuses = ['Submitted', 'Under Review', 'Revision Required'];
  const canStudentUpload = user.role === 'student' && research.status !== 'Archived';
  const uploadTypeOptions: { value: 'adviser_check' | 'defense_manuscript'; label: string }[] = draftStatuses.includes(research.status)
    ? [
        { value: 'adviser_check', label: 'A new draft for my adviser to check' },
        { value: 'defense_manuscript', label: 'The defense copy for my panel members' },
      ]
    : [{ value: 'defense_manuscript', label: 'The defense copy for my panel members' }];

  const openUploadModal = () => {
    setNewTitle(research.title);
    setNewAbstract(research.abstract);
    setSelectedFile(null);
    setUploadError(null);
    setUploadType(uploadTypeOptions[0].value);
    setShowUploadModal(true);
  };

  const handleFileChoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') {
      setUploadError('Please choose a PDF or Word (DOCX) file.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('That file is too big. Please choose a file smaller than 15 MB.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleStudentUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please choose a file to send.');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadFile(selectedFile);
      onStudentUploadRevision(
        research.id, newTitle, newAbstract, uploaded.fileName, resolveFileUrl(uploaded.url), uploadType,
      );
      setShowUploadModal(false);
      setSelectedFile(null);
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : 'We could not upload your file. Please check your internet connection and try again.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentVersion) return;

    onAddComment({
      id: `comm-${Date.now()}`,
      researchId: research.id,
      versionId: currentVersion.id,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      chapter: activeChapterFilter === 'all' ? 'general' : activeChapterFilter,
      text: newCommentText,
      commentAt: new Date().toISOString(),
      resolved: false
    });

    setNewCommentText('');
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewChapter || !currentVersion) return;

    onUpdateChapterStatus(
      research.id,
      currentVersion.id,
      selectedReviewChapter,
      reviewStatus,
      reviewFeedback
    );

    setSelectedReviewChapter(null);
    setReviewFeedback('');
  };

  const filterLabel = (f: ChapterFilter) => (f === 'all' ? 'All comments' : f === 'general' ? 'General' : `Chapter ${f.slice(-1)}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title={research.title}
        subtitle={subtitles[user.role]}
        onBack={onBack}
        backLabel="Go Back"
        action={
          canStudentUpload ? (
            <Button icon={Upload} onClick={openUploadModal}>Send a New Version</Button>
          ) : undefined
        }
      />

      {fileNotice && <Alert tone="danger" title="We could not open the file">{fileNotice}</Alert>}

      {user.role === 'student' && (
        <Card>
          <ResearchStatusBadge status={research.status} explain />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Chapter by chapter */}
          <Card as="section" aria-labelledby="chapters-title">
            <CardHeader
              title={currentVersion ? `Chapter progress (Version ${currentVersion.versionNumber})` : 'Chapter progress'}
              description="Each chapter is checked by the adviser."
              icon={<Bookmark className="h-5 w-5" aria-hidden="true" />}
            />
            {currentVersion ? (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Object.entries(currentVersion.chapters).map(([chapterKey, statusObj]) => {
                  const st = (statusObj?.status || 'Not Submitted') as ChapterStatus['status'];
                  const info = chapterStatus[st];
                  return (
                    <li key={chapterKey} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-slate-900">{chapterNames[chapterKey] ?? chapterKey}</p>
                        <StatusBadge info={info} />
                        {statusObj?.feedback && (
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">Adviser’s feedback:</span> {statusObj.feedback}
                          </p>
                        )}
                      </div>

                      {user.role === 'adviser' && research.adviserId === user.id && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={ClipboardCheck}
                          className="self-start"
                          onClick={() => {
                            setSelectedReviewChapter(chapterKey);
                            setReviewStatus(st === 'Revision Required' ? 'Revision Required' : 'Approved');
                            setReviewFeedback(statusObj?.feedback || '');
                          }}
                        >
                          Give Feedback on This Chapter
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={FileText}
                title={user.role === 'panelist' ? 'The defense copy has not been sent yet' : 'No paper has been uploaded yet'}
                description={
                  user.role === 'panelist'
                    ? 'When the students upload their defense copy for the panel, it will show here.'
                    : user.role === 'student'
                      ? 'Use “Send a New Version” to upload your first file.'
                      : 'The students have not uploaded a file yet.'
                }
              />
            )}
          </Card>

          {/* The paper, with the highlights people made */}
          {currentVersion?.fileUrl && (
            <section id="paper-viewer" aria-labelledby="paper-title" className="scroll-mt-4 space-y-3">
              <div>
                <h2 id="paper-title" className="text-base font-bold text-slate-900">
                  Read the paper (Version {currentVersion.versionNumber})
                </h2>
                <p className="text-sm text-slate-600">
                  {canMark
                    ? 'Highlight text to leave a comment on that exact spot. Everyone on this paper can read it.'
                    : 'Highlighted text shows where your adviser or panel left a comment. Press a highlight to read it.'}
                </p>
              </div>
              <AnnotatedPaper
                fileUrl={currentVersion.fileUrl}
                fileName={currentVersion.fileName}
                highlights={highlights}
                focus={focus}
                onHighlightClick={id => setFocus({ id, n: Date.now() })}
                onCreateComment={canMark ? handleCreateHighlightComment : undefined}
              />
            </section>
          )}

          {/* Files sent with the first form */}
          {research.proposalFiles && research.proposalFiles.length > 0 && (
            <Card as="section" aria-labelledby="files-title">
              <CardHeader title="Files sent with the research form" icon={<FileText className="h-5 w-5" aria-hidden="true" />} />
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {research.proposalFiles.map(file => {
                  const sizeInKb = file.size ? Math.round(file.size / 102.4) / 10 : null;
                  const catLabel = file.category === 'proposal_document' ? 'Main document'
                    : file.category === 'research_summary' ? 'Research summary'
                    : file.category === 'supporting_files' ? 'Supporting file'
                    : 'Other file';
                  return (
                    <li key={file.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <Badge tone="info">{catLabel}</Badge>
                      <p className="truncate text-sm font-semibold text-slate-900" title={file.name}>{file.name}</p>
                      {sizeInKb !== null && <p className="text-xs text-slate-600">Size: {sizeInKb} KB</p>}
                      <Button variant="secondary" size="sm" icon={Download} className="self-start" onClick={() => handleDownload(file.url, file.name)}>
                        Download File
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* Versions */}
          <Card as="section" aria-labelledby="versions-title">
            <CardHeader
              title="All versions sent"
              description="Newest first."
              icon={<History className="h-5 w-5" aria-hidden="true" />}
            />
            {myVersions.length === 0 ? (
              <p className="text-sm text-slate-600">No versions have been sent yet.</p>
            ) : (
              <ul className="space-y-3">
                {myVersions.map(ver => (
                  <li key={ver.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="info">Version {ver.versionNumber}</Badge>
                        {ver.type === 'defense_manuscript' && <Badge tone="warning">Defense copy</Badge>}
                      </div>
                      <p className="break-words text-sm font-semibold text-slate-900">{ver.fileName}</p>
                      <p className="text-xs text-slate-600">Sent {formatDateTime(ver.submittedAt)}</p>
                    </div>
                    <div className="shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Download}
                        disabled={!ver.fileUrl}
                        title={ver.fileUrl ? undefined : 'No file was saved for this version.'}
                        onClick={() => ver.fileUrl && handleDownload(ver.fileUrl, ver.fileName)}
                      >
                        Download File
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Conversation */}
        <Card as="section" aria-labelledby="chat-title" className="flex flex-col lg:col-span-4 lg:max-h-[46rem]">
          <CardHeader
            title="Comments"
            description="Talk about this paper here."
            icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
          />

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Show comments for">
            {chapterFilters.map(f => (
              <button
                key={f}
                type="button"
                aria-pressed={activeChapterFilter === f}
                onClick={() => setActiveChapterFilter(f)}
                className={cx(
                  'tap-auto shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer',
                  activeChapterFilter === f
                    ? 'border-blue-800 bg-blue-800 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-blue-700',
                )}
              >
                {filterLabel(f)}
              </button>
            ))}
          </div>

          <div className="min-h-32 flex-1 space-y-3 overflow-y-auto pr-1">
            {activeComments.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-600">
                No comments here yet. Write the first one below.
              </p>
            ) : (
              activeComments.map(comm => (
                <div
                  key={comm.id}
                  className={cx(
                    'space-y-1 rounded-lg border p-3',
                    focus?.id === comm.id ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-300' : 'border-slate-200 bg-slate-50',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm">
                    <span className="font-bold text-slate-900">
                      {comm.authorName}
                      <span className="ml-1.5 text-xs font-normal text-slate-600">({roleLabels[comm.authorRole] ?? comm.authorRole})</span>
                    </span>
                    <span className="text-xs text-slate-600">{formatDateLong(comm.commentAt)}</span>
                  </div>
                  {comm.anchor && (
                    <blockquote className="border-l-4 border-yellow-400 bg-yellow-50 px-2 py-1 text-sm italic text-slate-800">
                      “{comm.anchor.quote}”
                    </blockquote>
                  )}
                  <p className="text-sm text-slate-800">{comm.text}</p>
                  {comm.anchor && (
                    comm.versionId === currentVersion?.id ? (
                      <Button variant="secondary" size="sm" onClick={() => showInPaper(comm.id)}>Show in the paper</Button>
                    ) : (
                      <p className="text-xs text-slate-600">This comment is about an earlier version of the paper.</p>
                    )
                  )}
                </div>
              ))
            )}
          </div>

          {currentVersion ? (
            <form onSubmit={handlePostComment} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              <Input
                label={activeChapterFilter === 'all' ? 'Write a comment' : `Write a comment about ${filterLabel(activeChapterFilter).toLowerCase()}`}
                required
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder="Type your comment here"
              />
              <Button type="submit" icon={Send} fullWidth>Post Comment</Button>
            </form>
          ) : (
            <p className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
              You can write comments after a file has been sent.
            </p>
          )}
        </Card>
      </div>

      {/* Student: send a new version */}
      <Modal
        open={showUploadModal}
        onClose={() => !isUploading && setShowUploadModal(false)}
        title="Send a new version"
        description="Your adviser or panel members will be told when you send it. Fields marked with * are required."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowUploadModal(false)} disabled={isUploading}>Cancel</Button>
            <Button type="submit" form="upload-form" loading={isUploading}>
              {isUploading ? 'Sending…' : uploadType === 'adviser_check' ? 'Send to My Adviser' : 'Send Defense Copy'}
            </Button>
          </>
        }
      >
        <form id="upload-form" onSubmit={handleStudentUploadSubmit} className="space-y-5">
          {uploadError && <Alert tone="danger" title="We could not send your file">{uploadError}</Alert>}

          <Select
            label="What are you sending?"
            required
            value={uploadType}
            onChange={e => setUploadType(e.target.value as typeof uploadType)}
            hint={
              uploadType === 'adviser_check'
                ? 'Only your adviser will receive and check this draft.'
                : 'Your 3 panel members will receive this copy for your defense.'
            }
          >
            {uploadTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>

          <Input label="Research title" required value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <Textarea label="Short summary (abstract)" required rows={4} value={newAbstract} onChange={e => setNewAbstract(e.target.value)} />

          <div className="space-y-1.5">
            <label htmlFor="upload-file" className="block text-sm font-semibold text-slate-800">
              Your file <span className="text-rose-700" aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </label>
            <p id="upload-file-hint" className="text-xs text-slate-600">A PDF or Word (DOCX) file, smaller than 15 MB.</p>
            <input
              id="upload-file"
              type="file"
              required
              accept=".pdf,.doc,.docx"
              aria-describedby="upload-file-hint"
              onChange={handleFileChoice}
              className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-800 file:mr-4 file:min-h-11 file:cursor-pointer file:border-0 file:bg-blue-800 file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-900"
            />
            {selectedFile && (
              <p className="text-sm text-slate-800">
                Chosen file: <strong>{selectedFile.name}</strong>
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* Adviser: feedback on a chapter */}
      <Modal
        open={!!selectedReviewChapter}
        onClose={() => setSelectedReviewChapter(null)}
        title={`Feedback: ${selectedReviewChapter ? chapterNames[selectedReviewChapter] ?? selectedReviewChapter : ''}`}
        description="The students will be told what you decide. Fields marked with * are required."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedReviewChapter(null)}>Cancel</Button>
            <Button type="submit" form="review-form">Save Chapter Feedback</Button>
          </>
        }
      >
        <form id="review-form" onSubmit={handleReviewSubmit} className="space-y-5">
          <Select
            label="Your decision for this chapter"
            required
            value={reviewStatus}
            onChange={e => setReviewStatus(e.target.value as typeof reviewStatus)}
          >
            <option value="Approved">Approved: this chapter is good</option>
            <option value="Revision Required">Revision needed: the students must fix it</option>
          </Select>
          <Textarea
            label="Your feedback"
            required
            rows={5}
            value={reviewFeedback}
            onChange={e => setReviewFeedback(e.target.value)}
            hint="List exactly what the students should fix or keep."
          />
        </form>
      </Modal>
    </div>
  );
}
