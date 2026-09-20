import React, { useState, useMemo } from 'react';
import {
  FileText, Download, CheckCircle2, AlertCircle, XCircle, Highlighter, MessageSquare, ExternalLink,
  Plus, Save, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, FileCheck, Trash2, Clock,
} from 'lucide-react';
import { User as UserType, Research, ResearchVersion, ResearchComment } from '../types';
import { resolveFileUrl } from '../api/client';
import {
  Alert, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, IconButton, Modal, PageHeader, Select, Textarea,
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

interface StickyNote {
  id: string;
  page: number;
  x: number;
  y: number;
  text: string;
  color: string;
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

  // Sample page viewer state
  const [zoom, setZoom] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [highlightMode, setHighlightMode] = useState<boolean>(false);
  const [commentMode, setCommentMode] = useState<boolean>(false);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [pendingSticky, setPendingSticky] = useState<{ x: number; y: number } | null>(null);
  const [pendingStickyText, setPendingStickyText] = useState('');
  const [newStickyText, setNewStickyText] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const [stickyColor, setStickyColor] = useState<string>('yellow');
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [confirmingDecision, setConfirmingDecision] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'comments' | 'history'>('comments');

  const [simulatedHighlights, setSimulatedHighlights] = useState<Record<number, number[]>>({});

  // Sample pages (these are NOT the student's paper)
  const mockPagesContent = [
    {
      page: 1,
      title: "CHAPTER 1: INTRODUCTION",
      paragraphs: [
        "1.1 Background of the Study\nIn the era of hyper-connected software architectures, institutional research pipelines require strict systematic monitoring to verify validation, compliance, and procedural checkpoints. While many web applications serve generic file storage, they fail to bridge the semantic requirements between Adviser checking milestones and Panel defense schedules.",
        "1.2 Objectives of the Project\nThis system aims to normalize data definitions and provide interactive schema designs for capstone vetting. The application binds the dynamic workflows of student teams, coordinator schedulers, and evaluation juries under a singular state-driven environment.",
        "1.3 Significance of the Investigation\nBy embedding direct PDF checkouts and sticky notations, the software replaces manual tracking records, promoting a high-fidelity academic clearance rate of up to 92.4%."
      ]
    },
    {
      page: 2,
      title: "CHAPTER 2: REVIEW OF RELATED LITERATURE",
      paragraphs: [
        "2.1 Contemporary Educational Repositories\nPrior research (e.g., Dumalag et al., 2024) indicates that monolithic platforms often suffer from structural opacity. Students upload drafts without visual feedback loops, resulting in redundant cycles of revision that delay completion timelines.",
        "2.2 Collaborative Highlighting and Feedback Loops\nImplementing overlay annotations on client-side sandboxes allows advisers to drop location-specific markers. High-contrast overlays improve communication speed and reduce the cognitive overhead of asynchronous document review sessions.",
        "2.3 Technical Synthesis\nThis review justifies the development of an integrated, client-authoritative panel where research groups and review committees share absolute alignment."
      ]
    },
    {
      page: 3,
      title: "CHAPTER 3: SYSTEM METHODOLOGY",
      paragraphs: [
        "3.1 Research Design and Framework\nThe engineering team adopted an agile Scrum paradigm. The schema layout was structured with Drizzle ORM mappings, supporting instant rollbacks and secure authorization gates.",
        "3.2 Operational Flow and Checklist Targets\nThe vetting cycle transitions through five stages of maturity: Title Formulation, Adviser Vetting, Coordinator Booking, Jury Evaluation, and Digital Indexing.",
        "3.3 Validation Testing Matrices\nSystem performance was audited under extreme simulation scripts. Hot hot-reloads and atomic transactions guaranteed zero data loss across simulated connection drops."
      ]
    }
  ];

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!highlightMode && !commentMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (commentMode) {
      // Ask for the note's text in a pop-up instead of the browser's own prompt box
      setPendingSticky({ x, y });
      setPendingStickyText('');
      setCommentMode(false);
    } else if (highlightMode) {
      const clickedP = Math.floor((y / 100) * 3);
      setSimulatedHighlights(prev => {
        const currentList = prev[currentPage] || [];
        const updated = currentList.includes(clickedP)
          ? currentList.filter(p => p !== clickedP)
          : [...currentList, clickedP];
        return { ...prev, [currentPage]: updated };
      });
      setHighlightMode(false);
    }
  };

  const savePendingSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSticky || !pendingStickyText.trim()) return;
    setStickyNotes([
      ...stickyNotes,
      { id: `sticky-${Date.now()}`, page: currentPage, x: pendingSticky.x, y: pendingSticky.y, text: pendingStickyText, color: stickyColor },
    ]);
    setPendingSticky(null);
    setPendingStickyText('');
  };

  // A comment saved in the system so the students can read it.
  // The server only accepts chapter1-5 or "general" (it used to be sent as "Page N", which it refused).
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

  const handleAddStickyManual = () => {
    if (!newStickyText.trim()) return;
    const newNote: StickyNote = {
      id: `sticky-${Date.now()}`,
      page: currentPage,
      x: 30 + Math.random() * 20,
      y: 25 + Math.random() * 30,
      text: newStickyText,
      color: stickyColor
    };
    setStickyNotes([...stickyNotes, newNote]);
    setNewStickyText('');
  };

  const handleDeleteSticky = (id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
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
  const decisionInfo = decisionOptions.find(d => d.value === decision);

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'comments', label: `Comments (${currentComments.length})` },
    { id: 'history', label: `Versions (${selectedVersions.length})` },
    { id: 'content', label: 'Sample notes' },
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
              setCurrentPage(1);
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
          {/* Left: the file, and the sample viewer */}
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
                      Open the Paper
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

            <Card padded={false} className="overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900">Sample page preview</h2>
                <Alert tone="warning" title="This is sample text, not your students’ paper" className="mt-3">
                  These pages only let you try the highlight and sticky-note tools. Notes made here are not saved.
                  To read the real paper, use “Open the Paper” above. To send feedback, use Comments.
                </Alert>
              </div>

              <div className="space-y-4 bg-slate-100 p-4">
                {/* Tools */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Button
                    variant={highlightMode ? 'primary' : 'secondary'}
                    size="sm"
                    icon={Highlighter}
                    aria-pressed={highlightMode}
                    onClick={() => { setHighlightMode(!highlightMode); setCommentMode(false); }}
                  >
                    Highlight
                  </Button>
                  <Button
                    variant={commentMode ? 'primary' : 'secondary'}
                    size="sm"
                    icon={MessageSquare}
                    aria-pressed={commentMode}
                    onClick={() => { setCommentMode(!commentMode); setHighlightMode(false); }}
                  >
                    Sticky Note
                  </Button>
                  <span className="mx-1 hidden h-6 w-px bg-slate-300 sm:block" aria-hidden="true" />
                  <IconButton icon={ZoomOut} variant="secondary" label="Make the page smaller" onClick={() => setZoom(Math.max(50, zoom - 10))} />
                  <span className="min-w-12 text-center text-sm font-semibold text-slate-800" aria-live="polite">{zoom}%</span>
                  <IconButton icon={ZoomIn} variant="secondary" label="Make the page bigger" onClick={() => setZoom(Math.min(150, zoom + 10))} />
                  <IconButton icon={RotateCw} variant="secondary" label="Turn the page" onClick={() => setRotation((rotation + 90) % 360)} />
                </div>
                {(highlightMode || commentMode) && (
                  <p className="text-sm font-semibold text-blue-900" role="status">
                    {highlightMode ? 'Now select a paragraph on the page to highlight it.' : 'Now select a spot on the page to place your note.'}
                  </p>
                )}

                {/* Page */}
                <div className="flex max-h-[600px] min-h-[420px] items-start justify-center overflow-auto rounded-xl border border-slate-300 bg-slate-200/60 p-6">
                  <div
                    onClick={handlePageClick}
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transformOrigin: 'top center',
                    }}
                    className={cx(
                      'relative w-[520px] shrink-0 select-none rounded-lg border border-slate-300 bg-white p-10 shadow-lg',
                      (highlightMode || commentMode) && 'cursor-crosshair',
                      highlightMode ? 'ring-2 ring-amber-400' : commentMode ? 'ring-2 ring-blue-500' : '',
                    )}
                  >
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-600">
                        <span>SAMPLE PAGE</span>
                        <span>Page {currentPage} of 3</span>
                      </div>

                      <h3 className="text-center font-serif text-base font-bold text-slate-900">
                        {mockPagesContent[currentPage - 1].title}
                      </h3>

                      <div className="space-y-4">
                        {mockPagesContent[currentPage - 1].paragraphs.map((p, pIdx) => {
                          const isHighlighted = simulatedHighlights[currentPage]?.includes(pIdx);
                          return (
                            <p
                              key={pIdx}
                              className={cx(
                                'rounded p-1.5 text-sm leading-relaxed text-slate-800',
                                isHighlighted && 'border-l-4 border-amber-500 bg-amber-100 font-medium text-amber-950',
                              )}
                            >
                              {p}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    {stickyNotes.filter(n => n.page === currentPage).map(note => {
                      const colorClass = note.color === 'pink' ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : note.color === 'blue' ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-yellow-100 text-amber-950 border-amber-400';
                      return (
                        <div
                          key={note.id}
                          style={{ left: `${note.x}%`, top: `${note.y}%` }}
                          className={cx('absolute z-30 w-40 rounded-lg border p-2 text-xs font-medium shadow-md', colorClass)}
                        >
                          <button
                            type="button"
                            aria-label="Remove this sticky note"
                            onClick={e => { e.stopPropagation(); handleDeleteSticky(note.id); }}
                            className="tap-auto absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-rose-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <p className="line-clamp-4">{note.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Page buttons */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                    Previous Page
                  </Button>
                  <span className="text-sm text-slate-700">Page <strong>{currentPage}</strong> of 3</span>
                  <Button variant="secondary" size="sm" disabled={currentPage === 3} onClick={() => setCurrentPage(currentPage + 1)}>
                    Next Page
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: decision and tabs */}
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

                {/* Sample notes */}
                {activeTab === 'content' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-700">
                      Try out sticky notes on the sample pages. They are <strong>not saved</strong>.
                    </p>

                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold text-slate-800">Note colour</legend>
                      <div className="flex gap-3">
                        {[['yellow', 'Yellow', 'bg-yellow-300'], ['pink', 'Pink', 'bg-rose-300'], ['blue', 'Blue', 'bg-blue-300']].map(([val, label, cls]) => (
                          <button
                            key={val}
                            type="button"
                            aria-label={`${label} note`}
                            aria-pressed={stickyColor === val}
                            onClick={() => setStickyColor(val)}
                            className={cx(
                              'tap-auto h-9 w-9 rounded-full border-4 cursor-pointer',
                              cls,
                              stickyColor === val ? 'border-slate-900' : 'border-white ring-1 ring-slate-300',
                            )}
                          />
                        ))}
                      </div>
                    </fieldset>

                    <Textarea
                      label="Note text"
                      rows={2}
                      value={newStickyText}
                      onChange={e => setNewStickyText(e.target.value)}
                      placeholder="Type a note"
                    />
                    <Button variant="secondary" icon={Plus} fullWidth onClick={handleAddStickyManual}>
                      Add Note to Page {currentPage}
                    </Button>

                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <p className="text-sm font-bold text-slate-900">Your sample notes ({stickyNotes.length})</p>
                      {stickyNotes.length === 0 ? (
                        <p className="text-sm text-slate-600">You have not added any notes yet.</p>
                      ) : (
                        <ul className="max-h-48 space-y-2 overflow-y-auto">
                          {stickyNotes.map(n => (
                            <li key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                              <div>
                                <p className="font-semibold text-slate-900">Page {n.page}</p>
                                <p className="text-slate-800">{n.text}</p>
                              </div>
                              <IconButton icon={Trash2} variant="danger" label={`Delete the note on page ${n.page}`} onClick={() => handleDeleteSticky(n.id)} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Where to put a new sticky note */}
      <Modal
        open={!!pendingSticky}
        onClose={() => setPendingSticky(null)}
        title="Write your sticky note"
        description="This note will be placed on the sample page where you selected."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingSticky(null)}>Cancel</Button>
            <Button type="submit" form="sticky-form">Place Sticky Note</Button>
          </>
        }
      >
        <form id="sticky-form" onSubmit={savePendingSticky}>
          <Textarea
            label="Note text"
            required
            rows={3}
            value={pendingStickyText}
            onChange={e => setPendingStickyText(e.target.value)}
          />
        </form>
      </Modal>

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
