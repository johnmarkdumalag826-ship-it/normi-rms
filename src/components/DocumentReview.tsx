import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, CheckCircle, AlertCircle, XCircle, Highlighter, MessageSquare, 
  Layers, Plus, Save, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, FileCheck, ClipboardList,
  User, Calendar, Clock, Check, Trash
} from 'lucide-react';
import { User as UserType, Research, ResearchVersion, ResearchComment } from '../types';
import { resolveFileUrl } from '../api/client';

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

export default function DocumentReview({
  user, researchList, versions, comments, onAddComment, onApproveManuscript
}: DocumentReviewProps) {
  // Filter only papers assigned to this Adviser or all if Coordinator/Admin (Adviser is the primary target)
  const myAssignedResearches = useMemo(() => {
    return researchList.filter(r => r.adviserId === user.id);
  }, [researchList, user.id]);

  const [selectedResearchId, setSelectedResearchId] = useState<string>(
    myAssignedResearches[0]?.id || ''
  );

  const selectedResearch = useMemo(() => {
    return researchList.find(r => r.id === selectedResearchId);
  }, [researchList, selectedResearchId]);

  // Versions for selected research
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

  // UI state variables
  const [zoom, setZoom] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [highlightMode, setHighlightMode] = useState<boolean>(false);
  const [commentMode, setCommentMode] = useState<boolean>(false);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([
    { id: '1', page: 1, x: 25, y: 35, text: 'The citation for Section 1.2 needs to follow the APA 7th style guidelines precisely.', color: 'yellow' },
    { id: '2', page: 2, x: 60, y: 15, text: 'Explain the technical constraints of the data modeling layer in more depth.', color: 'pink' }
  ]);
  const [newStickyText, setNewStickyText] = useState<string>('');
  const [stickyColor, setStickyColor] = useState<string>('yellow');
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [decision, setDecision] = useState<'Approve' | 'Revision' | 'Reject' | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'comments' | 'history'>('content');

  // Text Selection Highlight simulation
  const [simulatedHighlights, setSimulatedHighlights] = useState<Record<number, number[]>>({
    1: [2, 5],
    2: [0]
  });

  // Page contents simulation
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
      const text = prompt("Enter text for a sticky note annotation at this point:");
      if (text) {
        const newNote: StickyNote = {
          id: `sticky-${Date.now()}`,
          page: currentPage,
          x,
          y,
          text,
          color: stickyColor
        };
        setStickyNotes([...stickyNotes, newNote]);
      }
      setCommentMode(false);
    } else if (highlightMode) {
      // Simulate highlighting a paragraph index (0-2)
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

  const handleAddGeneralComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyText.trim() || !selectedResearch) return;

    const newComment: ResearchComment = {
      id: `comm-${Date.now()}`,
      researchId: selectedResearch.id,
      versionId: currentVersion?.id || 'general',
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      text: newStickyText,
      chapter: `Page ${currentPage}` as any,
      commentAt: new Date().toISOString(),
      resolved: false
    };

    onAddComment(newComment);
    setNewStickyText('');
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
  };

  const currentComments = useMemo(() => {
    if (!selectedResearchId) return [];
    return comments.filter(c => c.researchId === selectedResearchId);
  }, [comments, selectedResearchId]);

  return (
    <div className="space-y-6">
      {/* Top Banner and Paper Selector */}
      <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5">
          <span className="text-xs  font-bold text-blue-800 tracking-normal">Faculty Portal</span>
          <h2 className="text-xl font-bold text-slate-800 font-serif">Dedicated Document Review Suite</h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Audit manuscript drafts, leave sticky notes and overlays, explore version histories, and issue formal vetting decisions.
          </p>
        </div>

        <div className="w-full md:w-80 space-y-1.5">
          <label className="text-xs font-bold text-slate-500  tracking-normal block">Select Manuscript to Review</label>
          <select
            value={selectedResearchId}
            onChange={(e) => {
              setSelectedResearchId(e.target.value);
              setSelectedVersionId('');
              setCurrentPage(1);
            }}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
          >
            <option value="" disabled>-- Choose a Research Group --</option>
            {myAssignedResearches.map(res => (
              <option key={res.id} value={res.id}>
                [{res.status}] {res.title.substring(0, 45)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedResearch ? (
        <div className="bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center max-w-2xl mx-auto space-y-4">
          <div className="p-4 bg-slate-100 text-slate-500 rounded-full w-fit mx-auto">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-700  tracking-normal">No Manuscripts Found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            You are not currently registered as the adviser of any active research groups, or no groups have submitted draft documents yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: High Fidelity PDF Visual Simulator */}
          <div className="lg:col-span-8 bg-slate-100 rounded-2xl border border-slate-200 p-4 flex flex-col space-y-4">
            {/* PDF Toolbar Controls */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-bold text-slate-800 ">v{currentVersion?.versionNumber || 1.0}</span>
                <span className="text-slate-350">|</span>
                <span className="truncate max-w-[180px] font-medium" title={currentVersion?.fileName}>
                  {currentVersion?.fileName || `${selectedResearch.title.substring(0, 20)}.pdf`}
                </span>
              </div>

              {/* PDF Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setHighlightMode(!highlightMode)}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    highlightMode 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-850'
                  }`}
                  title="Toggle highlight overlay tool (Click paragraphs to highlight)"
                >
                  <Highlighter className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Highlight</span>
                </button>

                <button
                  onClick={() => setCommentMode(!commentMode)}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    commentMode 
                      ? 'bg-blue-100 text-blue-850 border border-blue-200' 
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-850'
                  }`}
                  title="Place a location-bound sticky note annotation"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sticky Note</span>
                </button>

                <span className="text-slate-200 mx-1">|</span>

                <button 
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs  font-bold text-slate-600 min-w-[32px] text-center">{zoom}%</span>
                <button 
                  onClick={() => setZoom(Math.min(150, zoom + 10))}
                  className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>

                <span className="text-slate-200 mx-1">|</span>

                <button 
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors"
                  title="Rotate Right"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>

                <a
                  href={currentVersion?.fileUrl ? resolveFileUrl(currentVersion.fileUrl) : undefined}
                  download={currentVersion?.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-lg text-slate-600 transition-colors ${
                    currentVersion?.fileUrl ? 'hover:bg-slate-50 hover:text-slate-800' : 'opacity-40 pointer-events-none'
                  }`}
                  title="Download File"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Simulated Canvas viewport */}
            <div className="bg-slate-200/50 rounded-2xl border border-slate-300/60 p-8 overflow-auto max-h-[600px] flex justify-center items-start min-h-[450px]">
              <div 
                onClick={handlePageClick}
                style={{ 
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, 
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease-in-out'
                }}
                className={`w-[520px] bg-white rounded-xl shadow-lg border border-slate-350 p-10 relative select-none cursor-crosshair relative ${
                  highlightMode ? 'ring-2 ring-amber-400' : commentMode ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Visual grid watermark representing page background */}
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                {/* PDF simulated Page content */}
                <div className="space-y-6 relative z-10">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center text-xs text-slate-500 ">
                    <span>NORMI CAPSTONE VETTING ENGINE</span>
                    <span>PAGE {currentPage} OF 3</span>
                  </div>

                  <h4 className="text-sm font-serif font-bold text-center text-slate-800 tracking-wide">
                    {mockPagesContent[currentPage - 1].title}
                  </h4>

                  <div className="space-y-4">
                    {mockPagesContent[currentPage - 1].paragraphs.map((p, pIdx) => {
                      const isHighlighted = simulatedHighlights[currentPage]?.includes(pIdx);
                      return (
                        <p 
                          key={pIdx} 
                          className={`text-xs text-slate-650 leading-relaxed  transition-all duration-150 p-1.5 rounded ${
                            isHighlighted ? 'bg-amber-100 text-amber-900 font-medium border-l-2 border-amber-500 shadow-sm' : ''
                          }`}
                        >
                          {p}
                        </p>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 pt-8 text-center text-xs text-slate-350 ">
                    PROPOSAL ID: {selectedResearch.id} | VER: {currentVersion?.versionNumber || 1.0}
                  </div>
                </div>

                {/* Interactive Dragged Sticky Notes Layer */}
                {stickyNotes.filter(n => n.page === currentPage).map(note => {
                  const colorClass = note.color === 'pink' ? 'bg-rose-100 text-rose-800 border-rose-300' 
                    : note.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-yellow-50 text-amber-900 border-amber-300';
                  return (
                    <div
                      key={note.id}
                      style={{ left: `${note.x}%`, top: `${note.y}%` }}
                      className={`absolute w-36 p-2 rounded-lg border shadow-md text-xs font-medium leading-relaxed z-30 transition-all ${colorClass}`}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSticky(note.id); }}
                        className="absolute -top-1.5 -right-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-500 rounded-full p-0.5"
                      >
                        <XCircle className="h-2.5 w-2.5 text-rose-600" />
                      </button>
                      <span className="block  text-[7px] text-slate-500 font-bold mb-1  tracking-normal">Adviser Sticky</span>
                      <p className="line-clamp-4">{note.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PDF View Footer Stepper */}
            <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex items-center justify-between text-xs font-bold text-slate-700 shadow-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Page
              </button>

              <span className=" text-xs text-slate-500">
                Page <span className="text-slate-850 font-bold">{currentPage}</span> of <span className="font-semibold">3</span>
              </span>

              <button
                disabled={currentPage === 3}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer flex items-center gap-1 transition-all"
              >
                Next Page
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right Panel: Side Panel with Details, Sticky notes creation, and Decision actions */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Vetting Decision Card */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <FileCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-xs font-bold  tracking-normal text-white">Issue Vetting Decision</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Render a binding assessment on this manuscript draft. Decisions update student progress states.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision('Approve')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    decision === 'Approve'
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-400 font-extrabold ring-1 ring-emerald-500'
                      : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('Revision')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    decision === 'Revision'
                      ? 'bg-amber-600/30 border-amber-500 text-amber-400 font-extrabold ring-1 ring-amber-500'
                      : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  Revision
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('Reject')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    decision === 'Reject'
                      ? 'bg-rose-600/30 border-rose-500 text-rose-400 font-extrabold ring-1 ring-rose-500'
                      : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>

              {decision && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold  text-slate-500 block tracking-normal">
                      Provide Vetting Comments / Feedback
                    </label>
                    <textarea
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                      placeholder="Input instructions, chapter review notes, or required adjustments here..."
                      className="w-full text-xs p-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 h-20"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleDecisionSubmit}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Publish Vetting Decision
                  </button>
                </div>
              )}
            </div>

            {/* Main Tabs Segment */}
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col">
              {/* Tab selector bar */}
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`flex-1 py-3 text-center text-xs font-bold  tracking-normal transition-all border-b-2 cursor-pointer ${
                    activeTab === 'content' 
                      ? 'border-blue-800 text-blue-800 bg-white' 
                      : 'border-transparent text-slate-500 hover:text-slate-600'
                  }`}
                >
                  Document Notes
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 py-3 text-center text-xs font-bold  tracking-normal transition-all border-b-2 cursor-pointer ${
                    activeTab === 'comments' 
                      ? 'border-blue-800 text-blue-800 bg-white' 
                      : 'border-transparent text-slate-500 hover:text-slate-600'
                  }`}
                >
                  System Comments ({currentComments.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-3 text-center text-xs font-bold  tracking-normal transition-all border-b-2 cursor-pointer ${
                    activeTab === 'history' 
                      ? 'border-blue-800 text-blue-800 bg-white' 
                      : 'border-transparent text-slate-500 hover:text-slate-600'
                  }`}
                >
                  Versions ({selectedVersions.length})
                </button>
              </div>

              {/* Tab Panels */}
              <div className="p-4 min-h-[300px]">
                
                {/* 1. DOCUMENT NOTES / ANNOTATIONS */}
                {activeTab === 'content' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-800  tracking-normal">Quick Sticky Annotations</h4>
                      <p className="text-xs text-slate-500 leading-snug">
                        Add temporary visual sticky tags overlayed onto the PDF. Drag-and-drop simulated color tags.
                      </p>
                    </div>

                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => setStickyColor('yellow')}
                        className={`w-6 h-6 rounded-full bg-yellow-300 border-2 transition-all ${stickyColor === 'yellow' ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setStickyColor('pink')}
                        className={`w-6 h-6 rounded-full bg-rose-300 border-2 transition-all ${stickyColor === 'pink' ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setStickyColor('blue')}
                        className={`w-6 h-6 rounded-full bg-blue-300 border-2 transition-all ${stickyColor === 'blue' ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                      />
                      <span className="text-xs text-slate-450 font-medium  ml-auto">Selected: {stickyColor}</span>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={newStickyText}
                        onChange={(e) => setNewStickyText(e.target.value)}
                        placeholder="Type annotations text here..."
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-800 h-16"
                      />
                      <button
                        type="button"
                        onClick={handleAddStickyManual}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Place Sticky Tag on Page {currentPage}
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <span className="text-xs font-bold  text-slate-500 tracking-normal block">Active Sticky Notes ({stickyNotes.length})</span>
                      <div className="space-y-2 max-h-[160px] overflow-auto">
                        {stickyNotes.map(n => (
                          <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-600 block">Page {n.page} (X:{n.x}, Y:{n.y})</span>
                              <p className="text-slate-700 font-medium">{n.text}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteSticky(n.id)}
                              className="text-slate-500 hover:text-rose-600 shrink-0 self-start p-0.5"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SYSTEM REVISION COMMENTS */}
                {activeTab === 'comments' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800  tracking-normal">Formal Chapter Commentary</h4>
                      <p className="text-xs text-slate-500">
                        Formal feedback stored in system records. Visible to student groups on their timeline reports.
                      </p>
                    </div>

                    <form onSubmit={handleAddGeneralComment} className="space-y-2">
                      <textarea
                        value={newStickyText}
                        onChange={(e) => setNewStickyText(e.target.value)}
                        placeholder="Log review feedback or chapter revision instructions..."
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-850 h-20"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Log Official Commentary
                      </button>
                    </form>

                    <div className="border-t border-slate-150 pt-3 space-y-2.5 max-h-[180px] overflow-auto">
                      {currentComments.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-xs">
                          No logged feedback logs for this capstone yet.
                        </div>
                      ) : (
                        currentComments.map(c => (
                          <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                              <span className="font-bold text-slate-700">{c.authorName}</span>
                              <span>{new Date(c.commentAt).toLocaleDateString()}</span>
                            </div>
                            <span className="inline-block px-1.5 py-0.25 bg-blue-50 text-blue-800 rounded font-bold  tracking-normal text-xs ">
                              {c.chapter}
                            </span>
                            <p className="text-slate-600 font-medium leading-relaxed">{c.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 3. VERSION HISTORY */}
                {activeTab === 'history' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800  tracking-normal font-sans">Version Submission History</h4>
                      <p className="text-xs text-slate-500">
                        Tracks draft progression over time. Choose sub-versions to inspect overlay notes.
                      </p>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-auto">
                      {selectedVersions.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No version logs found.
                        </div>
                      ) : (
                        selectedVersions.map(ver => {
                          const isActive = (selectedVersionId === ver.id) || (!selectedVersionId && ver.id === selectedVersions[0]?.id);
                          return (
                            <button
                              key={ver.id}
                              onClick={() => setSelectedVersionId(ver.id)}
                              className={`w-full p-3 text-left rounded-xl border text-xs flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                isActive 
                                  ? 'border-blue-700 bg-blue-50/20 shadow-sm font-semibold' 
                                  : 'border-slate-150 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.25 text-xs font-bold rounded  ${
                                    ver.type === 'defense_manuscript' ? 'bg-amber-100 text-amber-850' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {ver.type === 'defense_manuscript' ? 'Defense Copy' : 'Chapter Checking'}
                                  </span>
                                  <span className="text-slate-900 font-bold ">v{ver.versionNumber}</span>
                                </div>
                                <span className="text-xs text-slate-500 truncate block">{ver.fileName}</span>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {new Date(ver.submittedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <CheckCircle className={`h-4 w-4 shrink-0 transition-opacity ${isActive ? 'text-blue-800 opacity-100' : 'opacity-0'}`} />
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
