import React, { useState, useMemo } from 'react';
import {
  FileText, Download, CheckCircle2, AlertCircle, XCircle, MessageSquare, ExternalLink, Save, FileCheck, Clock,
} from 'lucide-react';
import { User as UserType, Research, ResearchVersion, ResearchComment } from '../types';
import { resolveFileUrl } from '../api/client';
import {
  Alert, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, PageHeader, Select, Textarea,
  chapterNames, cx, formatDate, formatDateLong, getResearchStatus,
} from '../ui';

interface DocumentReviewProps {
  user: UserType;
  researchList: Research[];
  versions: ResearchVersion[];
  comments: ResearchComment[];
  onAddComment: (comment: ResearchComment) => void;
  onApproveManuscript: (id: string, decision: 'Approve' | 'Revision' | 'Reject', feedbackNote: string) => void;
}

type Decision = 'Approve' | 'Revision' | 'Reject';

const decisionOptions: { value: Decision; label: string; help: string; icon: typeof CheckCircle2; active: string }[] = [
  {
    value: 'Approve', label: 'Approve', icon: CheckCircle2,
    help: 'The paper is ready. The coordinator can set its defense.',
    active: 'border-emerald-700 bg-emerald-50 text-emerald-900',
  },
  {
    value: 'Revision', label: 'Ask for changes', icon: AlertCircle,
    help: 'The students must fix things and send a new version.',
    active: 'border-amber-600 bg-amber-50 text-amber-900',
  },
  {
    value: 'Reject', label: 'Reject', icon: XCircle,
    help: 'Send the paper back. It is marked “Revision needed”, like asking for changes.',
    active: 'border-rose-700 bg-rose-50 text-rose-900',
  },
];

export default function DocumentReview({
  user, researchList, versions, comments, onAddComment, onApproveManuscript
}: DocumentReviewProps) {
  // Papers where this adviser is the adviser
  const myAssignedResearches = useMemo(() => {
    return researchList.filter(r => r.adviserId === user.id);
  }, [researchList, user.id]);

  const [selectedResearchId, setSelectedResearchId] = useState<string>(
    myAssignedResearches[0]?.id || ''
  );

  const selectedResearch = useMemo(() => {
    return researchList.find(r => r.id === selectedResearchId);
  }, [researchList, selectedResearchId]);

  const selectedVersions = useMemo(() => {
    if (!selectedResearchId) return [];
    return versions
      .filter(v => v.researchId === selectedResearchId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }, [versions, selectedResearchId]);

  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  const currentVersion = useMemo(() => {
    if (!selectedVersions.length) return null;
    if (selectedVersionId) {
      return selectedVersions.find(v => v.id === selectedVersionId) || selectedVersions[0];
    }
    return selectedVersions[0];
  }, [selectedVersions, selectedVersionId]);

  const [commentText, setCommentText] = useState<string>('');
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [confirmingDecision, setConfirmingDecision] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');

  // A comment saved in the system so the students can read it.
  const handleAddGeneralComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedResearch) return;

    const newComment: ResearchComment = {
      id: `comm-${Date.now()}`,
      researchId: selectedResearch.id,
      versionId: currentVersion?.id || 'general',
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      text: commentText,
      chapter: 'general',
      commentAt: new Date().toISOString(),
      resolved: false
    };

    onAddComment(newComment);
    setCommentText('');
  };

  const handleDecisionSubmit = () => {
    if (!decision || !selectedResearchId) return;
    onApproveManuscript(selectedResearchId, decision, feedbackNote);
    setDecision(null);
    setFeedbackNote('');
    setConfirmingDecision(false);
  };

  const currentComments = useMemo(() => {
    if (!selectedResearchId) return [];
    return comments.filter(c => c.researchId === selectedResearchId);
  }, [comments, selectedResearchId]);

  const realFileUrl = currentVersion?.fileUrl ? resolveFileUrl(currentVersion.fileUrl) : undefined;
  const isPdf = !!currentVersion?.fileName && currentVersion.fileName.toLowerCase().endsWith('.pdf');
  const decisionInfo = decisionOptions.find(d => d.value === decision);

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'comments', label: `Comments (${currentComments.length})` },
    { id: 'history', label: `Versions (${selectedVersions.length})` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Papers"
        subtitle="Read a group’s paper, leave feedback, and decide whether it is ready for defense."
      />

      {/* Choose a paper */}
      <Card>
        <div className="max-w-xl">
          <Select
            label="Which paper do you want to review?"
            value={selectedResearchId}
            onChange={e => {
              setSelectedResearchId(e.target.value);
              setSelectedVersionId('');
            }}
          >
            <option value="" disabled>Choose a research paper…</option>
            {myAssignedResearches.map(res => (
              <option key={res.id} value={res.id}>
                [{getResearchStatus(res.status).label}] {res.title.substring(0, 60)}{res.title.length > 60 ? '…' : ''}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {!selectedResearch ? (
        <Card padded={false}>
          <EmptyState
            icon={FileText}
            title="No papers to review yet"
            description="You are not the adviser of any group yet, or no group has sent a paper. When they do, you can choose it above."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left: the students' real file */}
          <div className="space-y-6 lg:col-span-8">
            <Card>
              <CardHeader
                title="The students’ file"
                description={selectedResearch.title}
                icon={<FileText className="h-5 w-5" aria-hidden="true" />}
              />
              {currentVersion ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <Badge tone="info">Version {currentVersion.versionNumber}</Badge>
                    <p className="break-words text-base font-semibold text-slate-900">{currentVersion.fileName}</p>
                    <p className="text-sm text-slate-600">Sent {formatDateLong(currentVersion.submittedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={realFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!realFileUrl}
                      className={cx(
                        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-800 bg-blue-800 px-4 text-sm font-semibold text-white hover:bg-blue-900',
                        !realFileUrl && 'pointer-events-none opacity-50',
                      )}
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Open in a New Tab
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                    <a
                      href={realFileUrl}
                      download={currentVersion.fileName}
                      aria-disabled={!realFileUrl}
                      className={cx(
                        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50',
                        !realFileUrl && 'pointer-events-none opacity-50',
                      )}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download File
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">This group has not uploaded a file yet.</p>
              )}
            </Card>

            {/* The paper itself */}
            {currentVersion && realFileUrl && (
              isPdf ? (
                <Card padded={false} className="overflow-hidden">
                  <iframe
                    key={currentVersion.id}
                    src={realFileUrl}
                    title={`Paper: ${currentVersion.fileName}`}
                    className="h-[75vh] min-h-[480px] w-full bg-slate-100"
                  />
                </Card>
              ) : (
                <Alert tone="info" title="This file is a Word document">
                  Word files cannot be shown on this page. Use “Download File” to read it, then come back to comment and decide.
                </Alert>
              )
            )}
          </div>

          {/* Right: decision, comments and versions */}
          <div className="space-y-6 lg:col-span-4">
            <Card as="section" aria-labelledby="decision-title" className="border-blue-200 bg-blue-50">
              <h2 id="decision-title" className="flex items-center gap-2 text-base font-bold text-slate-900">
                <FileCheck className="h-5 w-5 text-blue-800" aria-hidden="true" />
                Your decision
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                Choose one when you have finished reading. The students will be told, and their progress will change.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2" role="group" aria-label="Choose your decision">
                {decisionOptions.map(opt => {
                  const Icon = opt.icon;
                  const selected = decision === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDecision(opt.value)}
                      className={cx(
                        'flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left cursor-pointer',
                        selected ? opt.active : 'border-slate-300 bg-white text-slate-800 hover:border-blue-700',
                      )}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-bold">{opt.label}</span>
                        <span className="block text-xs">{opt.help}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {decision && (
                <div className="mt-4 space-y-4">
                  <Textarea
                    label="Your message to the students"
                    optional
                    rows={4}
                    value={feedbackNote}
                    onChange={e => setFeedbackNote(e.target.value)}
                    hint="Explain your decision and what to fix, if anything."
                  />
                  <Button icon={Save} fullWidth onClick={() => setConfirmingDecision(true)}>
                    Send My Decision
                  </Button>
                </div>
              )}
            </Card>

            <Card padded={false} className="overflow-hidden">
              <div role="tablist" aria-label="Paper details" className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-2">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    id={`rtab-${t.id}`}
                    role="tab"
                    type="button"
                    aria-selected={activeTab === t.id}
                    aria-controls={`rpanel-${t.id}`}
                    onClick={() => setActiveTab(t.id)}
                    className={cx(
                      'whitespace-nowrap border-b-4 px-3 py-3 text-sm font-semibold cursor-pointer',
                      activeTab === t.id ? 'border-blue-800 text-blue-900' : 'border-transparent text-slate-600 hover:text-slate-900',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div role="tabpanel" id={`rpanel-${activeTab}`} aria-labelledby={`rtab-${activeTab}`} className="min-h-[300px] p-4">
                {/* Comments saved in the system */}
                {activeTab === 'comments' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-700">Comments are saved and the students can read them.</p>
                    <form onSubmit={handleAddGeneralComment} className="space-y-3">
                      <Textarea
                        label="Write a comment"
                        required
                        rows={3}
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="e.g. Please add sources to Chapter 2"
                      />
                      <Button type="submit" icon={MessageSquare} fullWidth>Post Comment</Button>
                    </form>

                    <ul className="max-h-72 space-y-3 overflow-y-auto border-t border-slate-200 pt-3">
                      {currentComments.length === 0 ? (
                        <li className="py-4 text-center text-sm text-slate-600">No comments for this paper yet.</li>
                      ) : (
                        currentComments.map(c => (
                          <li key={c.id} className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
                              <span className="font-bold text-slate-900">{c.authorName}</span>
                              <span className="text-xs text-slate-600">{formatDate(c.commentAt)}</span>
                            </div>
                            <Badge tone="info">{chapterNames[c.chapter] ?? c.chapter}</Badge>
                            <p className="text-sm text-slate-800">{c.text}</p>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}

                {/* Versions */}
                {activeTab === 'history' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700">Select a version to make it the one shown on this page.</p>
                    {selectedVersions.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-600">No versions have been sent yet.</p>
                    ) : (
                      <ul className="max-h-80 space-y-2 overflow-y-auto">
                        {selectedVersions.map(ver => {
                          const isActive = (selectedVersionId === ver.id) || (!selectedVersionId && ver.id === selectedVersions[0]?.id);
                          return (
                            <li key={ver.id}>
                              <button
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => setSelectedVersionId(ver.id)}
                                className={cx(
                                  'flex w-full items-center justify-between gap-3 rounded-xl border-2 p-3 text-left cursor-pointer',
                                  isActive ? 'border-blue-800 bg-blue-50' : 'border-slate-200 hover:bg-slate-50',
                                )}
                              >
                                <span className="min-w-0 space-y-1">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <Badge tone="info">Version {ver.versionNumber}</Badge>
                                    <Badge tone={ver.type === 'defense_manuscript' ? 'warning' : 'neutral'}>
                                      {ver.type === 'defense_manuscript' ? 'Defense copy' : 'Draft for checking'}
                                    </Badge>
                                  </span>
                                  <span className="block truncate text-sm text-slate-800">{ver.fileName}</span>
                                  <span className="flex items-center gap-1 text-xs text-slate-600">
                                    <Clock className="h-3 w-3" aria-hidden="true" />
                                    {formatDate(ver.submittedAt)}
                                  </span>
                                </span>
                                {isActive && <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-800" aria-label="Shown now" />}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Are you sure? */}
      <ConfirmDialog
        open={confirmingDecision}
        onCancel={() => setConfirmingDecision(false)}
        onConfirm={handleDecisionSubmit}
        title={`Send your decision: ${decisionInfo?.label ?? ''}?`}
        message={`“${selectedResearch?.title ?? 'This paper'}” will be updated and the students will be told. ${decisionInfo?.help ?? ''}`}
        confirmLabel="Yes, Send My Decision"
        cancelLabel="No, Go Back"
      />
    </div>
  );
}
