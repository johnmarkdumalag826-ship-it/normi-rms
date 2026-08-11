import React, { useState } from 'react';
import { 
  FileText, History, CheckCircle2, AlertCircle, MessageSquare, Send, 
  Upload, X, HelpCircle, ArrowLeft, Download, RefreshCw, Bookmark, Plus 
} from 'lucide-react';
import { Research, ResearchVersion, ResearchComment, User, ChapterStatus } from '../types';

interface ResearchDetailsViewProps {
  research: Research;
  versions: ResearchVersion[];
  comments: ResearchComment[];
  user: User;
  onBack: () => void;
  onAddComment: (comment: ResearchComment) => void;
  onUpdateChapterStatus: (researchId: string, versionId: string, chapter: string, status: 'Approved' | 'Revision Required' | 'Pending', feedback: string) => void;
  onStudentUploadRevision: (researchId: string, title: string, abstract: string, fileName: string, type: 'adviser_check' | 'defense_manuscript') => void;
}

export default function ResearchDetailsView({
  research, versions, comments, user, onBack, onAddComment, onUpdateChapterStatus, onStudentUploadRevision
}: ResearchDetailsViewProps) {
  const [activeChapterFilter, setActiveChapterFilter] = useState<'all' | 'chapter1' | 'chapter2' | 'chapter3' | 'general'>('all');
  const [newCommentText, setNewCommentText] = useState('');
  
  // Student upload revision modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTitle, setNewTitle] = useState(research.title);
  const [newAbstract, setNewAbstract] = useState(research.abstract);
  const [newFileName, setNewFileName] = useState('');
  const [uploadType, setUploadType] = useState<'adviser_check' | 'defense_manuscript'>('adviser_check');

  // Highlights state
  const [highlights, setHighlights] = useState<{ id: string; text: string; color: string; comment: string }[]>([
    { id: 'h1', text: 'Centralized database systems for local colleges', color: 'bg-yellow-100 border-yellow-300', comment: 'Excellent introductory formulation.' }
  ]);
  const [showHighlightForm, setShowHighlightForm] = useState(false);
  const [selectedTextToHighlight, setSelectedTextToHighlight] = useState('');
  const [highlightColor, setHighlightColor] = useState('bg-yellow-100 border-yellow-300');
  const [highlightComment, setHighlightComment] = useState('');

  // Adviser review modal
  const [selectedReviewChapter, setSelectedReviewChapter] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Revision Required'>('Approved');
  const [reviewFeedback, setReviewFeedback] = useState('');

  const handleCreateHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTextToHighlight || !highlightComment.trim()) return;

    const newH = {
      id: `high-${Date.now()}`,
      text: selectedTextToHighlight,
      color: highlightColor,
      comment: highlightComment
    };

    setHighlights(prev => [...prev, newH]);

    // Also post to comment conversation feed
    onAddComment({
      id: `comm-${Date.now()}`,
      researchId: research.id,
      versionId: currentVersion?.id || 'v1',
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      chapter: 'general',
      text: `🎨 [HIGHLIGHT ANNOTATION: "${newH.text}"] - ${newH.comment}`,
      commentAt: new Date().toISOString(),
      resolved: false
    });

    setShowHighlightForm(false);
    setHighlightComment('');
    setSelectedTextToHighlight('');
  };

  // Filter version history based on role:
  // Panelists receive and see the defense manuscripts
  // Advisers receive and see adviser check drafts
  const myVersions = versions.filter(v => {
    if (v.researchId !== research.id) return false;
    if (user.role === 'panelist') {
      return v.type === 'defense_manuscript';
    }
    if (user.role === 'adviser') {
      return v.type !== 'defense_manuscript';
    }
    return true; // Student, Coordinator, Admin see all
  }).sort((a,b) => b.versionNumber - a.versionNumber);

  const currentVersion = myVersions[0];

  // Filter comments
  const activeComments = comments.filter(c => 
    c.researchId === research.id && 
    (activeChapterFilter === 'all' || c.chapter === activeChapterFilter)
  );

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
      chapter: activeChapterFilter === 'all' ? 'general' : activeChapterFilter as any,
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

  const handleStudentUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName) return;

    onStudentUploadRevision(research.id, newTitle, newAbstract, newFileName, uploadType);
    setShowUploadModal(false);
    setNewFileName('');
  };

  const getChapterBadgeColor = (statusObj: ChapterStatus | undefined) => {
    const status = statusObj?.status || 'Not Submitted';
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Revision Required': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Pending': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Detail header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 rounded-lg border hover:bg-slate-50 text-slate-500 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-mono font-bold px-2 py-0.5 rounded font-bold uppercase">
              Manuscript Detail Panel
            </span>
            <h2 className="text-sm font-bold text-slate-800 leading-snug mt-1 max-w-xl truncate" title={research.title}>
              {research.title}
            </h2>
          </div>
        </div>

        {/* Floating actions (Student revision upload / Adviser status) */}
        <div className="flex gap-2">
          {user.role === 'student' && research.status === 'Revision Required' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-800/10"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload New Revision
            </button>
          )}
        </div>
      </div>

      {/* Chapters checkpoint split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Chapters directory & version timeline */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Chapter checklist card */}
          {currentVersion ? (
            <div className="bg-white rounded-xl border border-slate-150 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-blue-700" />
                Chapters Checkpoint Board (Current Version {currentVersion.versionNumber})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(currentVersion.chapters).map(([chapterKey, statusObj]) => {
                  const chName = chapterKey === 'chapter1' ? 'Chapter 1: Situation & Intro'
                    : chapterKey === 'chapter2' ? 'Chapter 2: Literature Review'
                    : chapterKey === 'chapter3' ? 'Chapter 3: Methodology / Analysis'
                    : chapterKey === 'chapter4' ? 'Chapter 4: Results & Discussion'
                    : 'Chapter 5: Conclusion';

                  return (
                    <div 
                      key={chapterKey}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex justify-between items-start">
                        <strong className="text-xs text-slate-700 font-serif leading-none">{chName}</strong>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.25 rounded border uppercase ${getChapterBadgeColor(statusObj)}`}>
                          {statusObj?.status || 'Not Submitted'}
                        </span>
                      </div>

                      {statusObj?.feedback && (
                        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                          Feedback: "{statusObj.feedback}"
                        </p>
                      )}

                      {/* Adviser action for chapter */}
                      {user.role === 'adviser' && research.adviserId === user.id && (
                        <button
                          onClick={() => {
                            setSelectedReviewChapter(chapterKey);
                            setReviewFeedback(statusObj?.feedback || '');
                          }}
                          className="mt-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold py-1 px-2 rounded self-end cursor-pointer transition-colors"
                        >
                          Assess Chapter
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed p-12 text-center text-slate-400 text-xs">
              {user.role === 'panelist' ? (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-slate-700">Awaiting Presentation Manuscript Submission</div>
                  <p className="max-w-md mx-auto text-[11px] text-slate-400 leading-relaxed">
                    The student research team has not submitted their final defense manuscript copy under the <strong>"Jury Panelists"</strong> category yet. Once they upload it, the presentation copy will immediately populate here for committee reception and vetting.
                  </p>
                </div>
              ) : (
                <span>No manuscript versions uploaded yet. Student needs to submit the first draft proposal.</span>
              )}
            </div>
          )}

          {/* Interactive Annotation & Highlighting Hub */}
          <div className="bg-white rounded-xl border border-slate-150 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider border-b pb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-orange-600" />
                Manuscript Annotation & Text Highlighting Hub
              </span>
              <span className="text-[10px] bg-orange-50 text-orange-700 font-mono font-bold px-1.5 py-0.5 rounded border border-orange-200">
                Panel & Adviser Tool
              </span>
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              Select or copy a phrase from the manuscript description below, then click <strong className="text-slate-800">"Annotate Highlight"</strong> to leave a highlighted trace with a corresponding feedback comment.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Active Abstract Manuscript Screen:
              </div>
              <div className="text-xs text-slate-700 leading-relaxed font-serif p-3 bg-white rounded border border-slate-150 select-text">
                {research.abstract}
              </div>

              {/* Quick interactive sentence triggers */}
              <div className="flex flex-wrap gap-2 pt-1.5">
                <span className="text-[10px] text-slate-400 font-mono self-center">Quick Select:</span>
                {[
                  'Centralized database systems for local colleges',
                  'replaces manual document tracking',
                  'interactive automated room conflict detection',
                  'facilitates repository archiving'
                ].map((sentence, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedTextToHighlight(sentence);
                      setShowHighlightForm(true);
                    }}
                    className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 border px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    "{sentence.substring(0, 30)}..."
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Highlight creation drawer/popover */}
            {showHighlightForm && (
              <form onSubmit={handleCreateHighlight} className="bg-orange-50/40 border border-orange-150 p-4 rounded-xl space-y-3.5 animate-in slide-in-from-top-2 duration-150">
                <div className="flex justify-between items-center border-b border-orange-100 pb-1.5">
                  <span className="text-xs font-bold text-orange-850">Annotate Selected Text</span>
                  <button 
                    type="button" 
                    onClick={() => setShowHighlightForm(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Phrase</label>
                    <input
                      type="text"
                      required
                      value={selectedTextToHighlight}
                      onChange={(e) => setSelectedTextToHighlight(e.target.value)}
                      placeholder="Type or select a phrase to annotate"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Highlight Color</label>
                      <select
                        value={highlightColor}
                        onChange={(e) => setHighlightColor(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      >
                        <option value="bg-yellow-100 border-yellow-300">Yellow Marker</option>
                        <option value="bg-emerald-100 border-emerald-300">Green Marker</option>
                        <option value="bg-blue-100 border-blue-300">Blue Marker</option>
                        <option value="bg-rose-100 border-rose-300 font-bold">Pink Marker</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Annotation Note</label>
                      <input
                        type="text"
                        required
                        value={highlightComment}
                        onChange={(e) => setHighlightComment(e.target.value)}
                        placeholder="e.g., Needs citation update or clarification"
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHighlightForm(false)}
                    className="px-2.5 py-1 text-[10px] border border-slate-200 text-slate-600 rounded bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-orange-700 hover:bg-orange-800 text-white font-semibold text-[10px] rounded cursor-pointer shadow-sm transition-colors"
                  >
                    Save Highlight Trace
                  </button>
                </div>
              </form>
            )}

            {/* List of active highlights on this document */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Active Trace Marks:</span>
              {highlights.length === 0 ? (
                <div className="text-center p-3 text-slate-400 text-xs italic">
                  No highlight marks laid on this document.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {highlights.map(h => (
                    <div key={h.id} className={`p-3 rounded-lg border flex flex-col justify-between gap-1.5 ${h.color}`}>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">Marked Text:</span>
                        <p className="text-xs font-semibold text-slate-800 leading-tight">"{h.text}"</p>
                      </div>
                      <div className="border-t border-slate-200/55 pt-1.5 mt-1 text-[11px] text-slate-600">
                        <strong className="text-slate-800 font-semibold block mb-0.5">Annotation Comment:</strong>
                        "{h.comment}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Proposal Attachments */}
          {research.proposalFiles && research.proposalFiles.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-150 shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Uploaded Proposal Attachments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {research.proposalFiles.map(file => {
                  const sizeInKb = (file.size ? Math.round(file.size / 102.4) / 10 : 120.5);
                  const catLabel = file.category === 'proposal_document' ? 'Proposal Document'
                    : file.category === 'research_summary' ? 'Research Summary'
                    : file.category === 'supporting_files' ? 'Supporting Files'
                    : 'Other Attachment';

                  return (
                    <div key={file.id} className="p-3 rounded-lg border border-slate-150 bg-slate-50/55 flex flex-col justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-100">
                          {catLabel}
                        </span>
                        <p className="text-xs font-bold text-slate-700 truncate" title={file.name}>{file.name}</p>
                        <span className="text-[9px] text-slate-400 font-mono block">Size: {sizeInKb} KB</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const dummyContent = `NORMI Capstone Document\nCategory: ${file.category}\nName: ${file.name}`;
                            const blob = new Blob([dummyContent], { type: 'text/plain' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = file.name;
                            link.click();
                          }}
                          className="text-[10px] font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="h-3 w-3" /> Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Historical versions tracker */}
          <div className="bg-white rounded-xl border border-slate-150 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              Manuscript Version Timeline
            </h3>

            <div className="space-y-3">
              {myVersions.map(ver => (
                <div key={ver.id} className="p-3.5 rounded-lg border border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.25 rounded uppercase">
                      Draft Version {ver.versionNumber}
                    </span>
                    <strong className="text-xs text-slate-700 block mt-1">{ver.fileName}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Uploaded by student on {new Date(ver.submittedAt).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(ver, null, 2)], { type: 'application/pdf' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = ver.fileName;
                      link.click();
                    }}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2.5 py-1 text-[10px] rounded flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Download className="h-3 w-3" /> Download PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Peer comments section */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4 flex flex-col h-[520px]">
          <div className="border-b pb-2 shrink-0">
            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-700" />
              Reviewer Conversation Feed
            </h3>
            
            {/* Filter tags for chapters */}
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
              {['all', 'chapter1', 'chapter2', 'chapter3', 'general'].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveChapterFilter(f as any)}
                  className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-full border shrink-0 cursor-pointer ${activeChapterFilter === f ? 'bg-blue-800 text-white border-blue-800' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Comments list feed */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
            {activeComments.length === 0 ? (
              <div className="text-center py-12 text-slate-405 text-xs">
                No active conversations for the selected chapter category filter.
              </div>
            ) : (
              activeComments.map(comm => (
                <div key={comm.id} className="p-3 bg-slate-50 rounded-lg border border-slate-150 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-700">{comm.authorName}</span>
                    <span className="text-slate-400 font-mono text-[9px]">{new Date(comm.commentAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{comm.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Quick Comment box */}
          {currentVersion && (
            <form onSubmit={handlePostComment} className="border-t pt-3 flex gap-2 shrink-0">
              <input
                type="text"
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={`Leave general comment...`}
                className="flex-1 text-xs p-2 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-800 hover:bg-blue-900 text-white p-2 rounded-lg cursor-pointer shrink-0 shadow-md"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* STUDENT NEW REVISION UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleStudentUploadSubmit}
            className="bg-white rounded-xl border border-slate-150 w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-serif">
                <Upload className="h-4.5 w-4.5 text-blue-700" />
                Submit New Revision Draft
              </h3>
              <button 
                type="button" 
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded border">
              Upload the next iteration of your manuscript. This triggers notification pings to your supervisor and logs revision response counters.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Upload Purpose / Recipient</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 font-semibold text-slate-700"
                >
                  <option value="adviser_check">Submit for Adviser Vetting & Checking</option>
                  <option value="defense_manuscript">Submit Defense Copy for Panel Committee</option>
                </select>
                <span className="text-[9px] text-slate-400 mt-1 block">
                  {uploadType === 'adviser_check' 
                    ? 'Only your Adviser will receive and check this draft.' 
                    : 'The 3-member panel committee will receive and evaluate this copy.'}
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Refined Thesis Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Updated Abstract summary</label>
                <textarea
                  rows={4}
                  required
                  value={newAbstract}
                  onChange={(e) => setNewAbstract(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Upload PDF File name</label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. NORMI_Capstone_V3_Methodology_Locked.pdf"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Upload Revision
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADVISER CHAPTER ASSESSMENT MODAL */}
      {selectedReviewChapter && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleReviewSubmit}
            className="bg-white rounded-xl border border-slate-150 w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-serif">
                <Bookmark className="h-4.5 w-4.5 text-blue-750" />
                Assess Chapter: {selectedReviewChapter.toUpperCase()}
              </h3>
              <button 
                type="button" 
                onClick={() => setSelectedReviewChapter(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Set Chapter Status</label>
                <select
                  required
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="Approved">Approved (Pass Chapter)</option>
                  <option value="Revision Required">Revision Required (Hold Check)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Review Feedback Details</label>
                <textarea
                  rows={4}
                  required
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Detail exact bullet points the student group needs to correct..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => setSelectedReviewChapter(null)}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Publish Chapter Review
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
