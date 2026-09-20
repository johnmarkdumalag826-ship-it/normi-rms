import React, { useState, useMemo } from 'react';
import { 
  FileText, Calendar, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, 
  HelpCircle, Clock, ArrowRight, Download, FileSignature, Landmark, UploadCloud, 
  CheckCircle, ChevronRight, RefreshCw, X, Check, Lock, ChevronDown, ChevronUp, AlertTriangle,
  Info, Eye, Trash2, Plus, Edit3, Sparkles, Compass, GraduationCap, History
} from 'lucide-react';
import { User, Research, ResearchVersion, ResearchComment, Schedule, Room, ProposalFile } from '../types';
import { uploadFile, resolveFileUrl, ApiError } from '../api/client';

interface DashboardStudentProps {
  user: User;
  research: Research | null;
  currentVersion: ResearchVersion | undefined;
  versions: ResearchVersion[];
  comments: ResearchComment[];
  schedules: Schedule[];
  rooms: Room[];
  users: User[];
  onNavigateToTimeline: () => void;
  onStudentUploadRevision: (researchId: string, title: string, abstract: string, fileName: string, fileUrl: string, type: 'adviser_check' | 'defense_manuscript') => void;
  onUpdateProposalFiles?: (researchId: string, files: ProposalFile[]) => void;
  onUpdateResearchDetails?: (updated: Research) => void;
  onCreateTitleProposal?: (data: {
    title: string;
    abstract: string;
    keywords: string[];
    adviserId: string;
    members: string[];
    fileName: string;
    proposalFiles?: ProposalFile[];
  }) => void;
}

export default function DashboardStudent({
  user, research, currentVersion, versions, comments, schedules, rooms, users, 
  onNavigateToTimeline, onStudentUploadRevision, onUpdateProposalFiles, onUpdateResearchDetails, onCreateTitleProposal
}: DashboardStudentProps) {

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState<'adviser_check' | 'defense_manuscript'>('adviser_check');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedJourneyStage, setSelectedJourneyStage] = useState<number>(2); // Active stage (index 2: Proposal Defense) by default
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  // Proposal attachment states
  const [dashboardPreviewFile, setDashboardPreviewFile] = useState<ProposalFile | null>(null);
  const [dashboardUploadCategory, setDashboardUploadCategory] = useState<'proposal_document' | 'research_summary' | 'supporting_files' | 'other_attachments'>('proposal_document');
  const [dashboardReplaceId, setDashboardReplaceId] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Modals
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showFormulationModal, setShowFormulationModal] = useState(false);

  // Formulation fields (for students with research === null)
  const [propTitle, setPropTitle] = useState('');
  const [propAbstract, setPropAbstract] = useState('');
  const [propKeywords, setPropKeywords] = useState('');
  const [propAdviser, setPropAdviser] = useState('');
  const [propMembers, setPropMembers] = useState('');
  const [propFilename, setPropFilename] = useState('Research_Proposal_Draft.docx');

  // Edit Details fields
  const [editTitle, setEditTitle] = useState(research?.title || '');
  const [editAbstract, setEditAbstract] = useState(research?.abstract || '');
  const [editKeywords, setEditKeywords] = useState(research?.keywords.join(', ') || '');
  const [editMembers, setEditMembers] = useState('');

  // Synchronize edit fields when research loaded
  React.useEffect(() => {
    if (research) {
      setEditTitle(research.title);
      setEditAbstract(research.abstract);
      setEditKeywords(research.keywords.join(', '));
      
      // Get member names
      const otherStudentIds = research.studentIds.filter(id => id !== user.id);
      const memberNames = otherStudentIds.map(id => {
        const u = users.find(x => x.id === id);
        return u ? u.name : '';
      }).filter(Boolean).join(', ');
      setEditMembers(memberNames);
    }
  }, [research, user.id, users]);

  const handleDashboardAddFile = (name: string, size: number) => {
    if (!research || !onUpdateProposalFiles) return;
    const isPdfOrDocx = name.endsWith('.pdf') || name.endsWith('.docx');
    if (!isPdfOrDocx) {
      setDashboardError("Only PDF and DOCX documents are accepted for manuscript vetting.");
      return;
    }

    const currentFiles = research.proposalFiles || [];

    if (dashboardReplaceId) {
      const updated = currentFiles.map(f => f.id === dashboardReplaceId ? {
        ...f,
        name,
        size,
        uploadedAt: new Date().toISOString()
      } : f);
      onUpdateProposalFiles(research.id, updated);
      setDashboardReplaceId(null);
      setDashboardError(null);
      return;
    }

    const isSingleCategory = dashboardUploadCategory === 'proposal_document' || dashboardUploadCategory === 'research_summary';
    const existing = currentFiles.find(f => f.category === dashboardUploadCategory);

    if (isSingleCategory && existing) {
      const updated = currentFiles.map(f => f.category === dashboardUploadCategory ? {
        ...f,
        name,
        size,
        uploadedAt: new Date().toISOString()
      } : f);
      onUpdateProposalFiles(research.id, updated);
      setDashboardError(null);
      return;
    }

    const newFile: ProposalFile = {
      id: `prop-file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      url: `manuscripts/${name}`,
      size,
      uploadedAt: new Date().toISOString(),
      category: dashboardUploadCategory
    };

    onUpdateProposalFiles(research.id, [...currentFiles, newFile]);
    setDashboardError(null);
  };

  const handleDashboardFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleDashboardAddFile(file.name, file.size);
      e.target.value = '';
    }
  };

  const triggerDashboardReplace = (id: string) => {
    setDashboardReplaceId(id);
    document.getElementById('dashboard-file-picker')?.click();
  };

  const handleDashboardDeleteFile = (id: string) => {
    if (!research || !onUpdateProposalFiles) return;
    const currentFiles = research.proposalFiles || [];
    onUpdateProposalFiles(research.id, currentFiles.filter(f => f.id !== id));
  };

  const getAdviserName = () => {
    if (!research) return 'Not Assigned';
    const adviser = users.find(u => u.id === research.adviserId);
    return adviser ? adviser.name : 'Unknown Faculty';
  };

  const getUpcomingSchedule = () => {
    if (!research) return null;
    return schedules.find(s => s.researchId === research.id && s.status === 'scheduled');
  };

  const mySchedule = getUpcomingSchedule();
  const activeComments = comments.filter(c => c.researchId === research?.id && !c.resolved);

  // Filter versions specifically for this student's research project
  const myVersions = useMemo(() => {
    if (!research) return [];
    return versions
      .filter(v => v.researchId === research.id)
      .sort((a, b) => b.versionNumber - a.versionNumber); // Newest first
  }, [versions, research]);

  // Calculate progress percent
  const getProgressPercentage = () => {
    if (!research) return 0;
    switch (research.status) {
      case 'Submitted': return 15;
      case 'Under Review': return 30;
      case 'Revision Required': return 45;
      case 'Approved by Adviser': return 65;
      case 'Pending Coordinator': return 75;
      case 'Scheduled': return 85;
      case 'Completed': return 100;
      case 'Archived': return 100;
      default: return 0;
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndSetFile = (file: File) => {
    setUploadErrorMsg(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isDoc = extension === 'pdf' || extension === 'docx' || extension === 'doc';
    if (!isDoc) {
      setUploadErrorMsg('File upload restricted to PDF and DOCX formats only.');
      return;
    }
    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadErrorMsg('File size exceeds the 15MB threshold.');
      return;
    }
    setSelectedFile(file);
    setUploadSuccess(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !research) return;

    setIsUploading(true);
    setUploadErrorMsg(null);
    try {
      const uploaded = await uploadFile(selectedFile);
      onStudentUploadRevision(
        research.id,
        research.title,
        research.abstract,
        uploaded.fileName,
        resolveFileUrl(uploaded.url),
        activeUploadTab
      );
      setUploadSuccess(true);
      setSelectedFile(null);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err) {
      setUploadErrorMsg(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!research || !onUpdateResearchDetails) return;

    const keywordsArray = editKeywords.split(',').map(s => s.trim()).filter(Boolean);
    const updated: Research = {
      ...research,
      title: editTitle,
      abstract: editAbstract,
      keywords: keywordsArray,
      updatedAt: new Date().toISOString()
    };

    onUpdateResearchDetails(updated);
    setShowEditDetailsModal(false);
  };

  const handleCreateProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateTitleProposal) return;

    const keywordsArray = propKeywords.split(',').map(s => s.trim()).filter(Boolean);
    const membersArray = propMembers.split(',').map(s => s.trim()).filter(Boolean);

    onCreateTitleProposal({
      title: propTitle,
      abstract: propAbstract,
      keywords: keywordsArray,
      adviserId: propAdviser,
      members: membersArray,
      fileName: propFilename
    });

    setShowFormulationModal(false);
  };

  // Define 7-stage research journey
  const getJourneyPhases = () => {
    const phases = [
      {
        idx: 0,
        title: 'Title Proposal',
        subtitle: 'Initial Abstract',
        description: 'Formulate your capstone title, assign designated Adviser, and register abstract parameters.',
        statusKey: 'Submitted',
        icon: '📝',
        guide: 'Awaiting initial chapters checking. Submit drafts to your supervisor.'
      },
      {
        idx: 1,
        title: 'Adviser Assignment',
        subtitle: 'Supervisor Matched',
        description: 'The department matches your capstone team with a qualified supervisor faculty.',
        statusKey: 'Submitted',
        icon: '🤝',
        guide: 'A assigned adviser is designated for regular consultations.'
      },
      {
        idx: 2,
        title: 'Proposal Defense',
        subtitle: 'Chapter 1-3 Vetted',
        description: 'Complete draft vetting with Adviser. Your Adviser logs chapter revisions and trace commentary.',
        statusKey: 'Under Review',
        icon: '🔍',
        guide: 'Correct review items indicated in the Adviser Actions box and re-upload drafts.'
      },
      {
        idx: 3,
        title: 'Manuscript Dev',
        subtitle: 'Pipeline Clearance',
        description: 'Once chapters meet benchmarks, Adviser endorses the paper to the pipeline for scheduling.',
        statusKey: 'Approved by Adviser',
        icon: '💻',
        guide: 'Adviser has signed off! Coordinator is reviewing pipeline clearance.'
      },
      {
        idx: 4,
        title: 'Final Oral Defense',
        subtitle: 'Jury Presentation',
        description: 'Research Coordinator designates your 3-member panel committee, room reservation, and slot.',
        statusKey: 'Scheduled',
        icon: '📅',
        guide: 'Be ready for presentation. Download your schedule slot coordinates.'
      },
      {
        idx: 5,
        title: 'Revision Approval',
        subtitle: 'Post-Defense Check',
        description: 'Present your slides and live normalization models. Panelist jury inputs scores out of 100.',
        statusKey: 'Completed',
        icon: '🎓',
        guide: 'Defense successfully completed. Addressing minor/major panel adjustments.'
      },
      {
        idx: 6,
        title: 'Completed & Archived',
        subtitle: 'Repository Indexed',
        description: 'Finalized publications are indexed and searchable inside the College Institutional Archives.',
        statusKey: 'Archived',
        icon: '🏛️',
        guide: 'Congratulations! Your team\'s research journey is complete.'
      }
    ];

    const currentStatus = research?.status || 'Submitted';
    let activeIdx = 0;
    if (currentStatus === 'Submitted') activeIdx = 0;
    else if (currentStatus === 'Under Review' || currentStatus === 'Revision Required') activeIdx = 2;
    else if (currentStatus === 'Approved by Adviser' || currentStatus === 'Pending Coordinator') activeIdx = 3;
    else if (currentStatus === 'Scheduled') activeIdx = 4;
    else if (currentStatus === 'Completed') activeIdx = 5;
    else if (currentStatus === 'Archived') activeIdx = 6;

    return {
      phases: phases.map((p, idx) => ({
        ...p,
        isCompleted: idx < activeIdx,
        isActive: idx === activeIdx,
        isUpcoming: idx > activeIdx
      })),
      activeIdx
    };
  };

  const { phases, activeIdx } = getJourneyPhases();

  // Dynamic status evaluation of checklist requirements per stage
  const getStageChecklist = (stageIndex: number) => {
    if (!research) return [];

    switch (stageIndex) {
      case 0: // Title Proposal
        return [
          { label: 'Register thesis proposal title', met: !!research.title },
          { label: 'Define project abstract parameters', met: !!research.abstract },
          { label: 'Identify primary capstone keywords', met: research.keywords.length > 0 }
        ];
      case 1: // Adviser Assignment
        return [
          { label: 'Submit initial proposal form', met: true },
          { label: 'Department adviser matching sequence', met: !!research.adviserId }
        ];
      case 2: // Proposal Defense
        return [
          { label: 'Chapter 1 (Introduction) checked', met: currentVersion?.chapters?.chapter1?.status === 'Approved' },
          { label: 'Chapter 2 (Literature Review) checked', met: currentVersion?.chapters?.chapter2?.status === 'Approved' },
          { label: 'Chapter 3 (Methodology) checked', met: currentVersion?.chapters?.chapter3?.status === 'Approved' }
        ];
      case 3: // Manuscript Dev
        return [
          { label: 'Resolve outstanding adviser check items', met: activeComments.length === 0 },
          { label: 'Obtain formal signed endorsement', met: ['Approved by Adviser', 'Pending Coordinator', 'Scheduled', 'Completed', 'Archived'].includes(research.status) }
        ];
      case 4: // Final Oral Defense
        return [
          { label: 'Receive confirmed date & time coordinates', met: !!mySchedule },
          { label: 'Allocate 3 Faculty Panel Committee', met: !!mySchedule && mySchedule.panelistIds.length === 3 },
          { label: 'Lock classroom presentation venue', met: !!mySchedule && !!mySchedule.roomId }
        ];
      case 5: // Revision Approval
        return [
          { label: 'Upload finalized defense manuscript', met: myVersions.some(v => v.type === 'defense_manuscript') },
          { label: 'Complete oral presentation slides delivery', met: ['Completed', 'Archived'].includes(research.status) }
        ];
      case 6: // Completed & Archived
        return [
          { label: 'Integrate final Panel manuscript corrections', met: research.status === 'Archived' },
          { label: 'Acquire official plagiarism clearance index', met: research.status === 'Archived' }
        ];
      default:
        return [];
    }
  };

  // If student has no research project assigned/created
  if (!research) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6.5 shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5">
            <span className="text-xs   font-bold text-blue-200 tracking-normal bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
              A.Y. 2025-2026 Normal Enrollment
            </span>
            <h2 className="text-xl font-bold font-serif leading-tight">Welcome to NMSC Capstone Portal, {user.name}</h2>
            <p className="text-xs text-slate-350 max-w-xl">
              You do not have an active research project or approved proposal registered in the database catalog. Formulate your title proposal below to launch your capstone cycle.
            </p>
          </div>

          <button
            onClick={() => setShowFormulationModal(true)}
            className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/10 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Formulate Title Proposal
          </button>
        </div>

        {/* Informative Dashboard Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold ">
              01
            </div>
            <h4 className="font-bold text-slate-850 text-sm">Formulate & Register Title</h4>
            <p className="text-xs text-slate-450 leading-relaxed ">
              Define your capstone title, abstract problem details, core keywords, and select your preferred thesis advisor faculty member.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold ">
              02
            </div>
            <h4 className="font-bold text-slate-850 text-sm">Mentorship Consultations</h4>
            <p className="text-xs text-slate-450 leading-relaxed ">
              Upload draft revisions of Chapters 1 to 3 regularly. Review supervisor feedback markup boxes and make corrections reactively.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold ">
              03
            </div>
            <h4 className="font-bold text-slate-850 text-sm">Oral Presentation Defense</h4>
            <p className="text-xs text-slate-450 leading-relaxed ">
              Once adviser clearance is obtained, the system automatically schedules your presentation room slot, jury panel, and publishes scores.
            </p>
          </div>
        </div>

        {/* INITIAL TITLE FORMULATION MODAL */}
        {showFormulationModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <form 
              onSubmit={handleCreateProposalSubmit}
              className="bg-white rounded-2xl border border-slate-200 w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex justify-between items-center border-b pb-2.5">
                <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5 font-serif">
                  <Sparkles className="h-4.5 w-4.5 text-blue-700" />
                  Formulate New Title Proposal
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowFormulationModal(false)}
                  className="text-slate-450 hover:text-slate-650 p-1 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500  block">Proposed Research Title</label>
                  <input
                    type="text"
                    required
                    value={propTitle}
                    onChange={(e) => setPropTitle(e.target.value)}
                    placeholder="e.g. Web-Based Research Management with Normalization Checkers"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500  block">Research Abstract / Problem Statement</label>
                  <textarea
                    required
                    rows={4}
                    value={propAbstract}
                    onChange={(e) => setPropAbstract(e.target.value)}
                    placeholder="Provide a detailed explanation of the problem, software methodology, and target college users..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500  block">Keywords (comma separated)</label>
                  <input
                    type="text"
                    required
                    value={propKeywords}
                    onChange={(e) => setPropKeywords(e.target.value)}
                    placeholder="React, Database, Normalization"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500  block">Preferred Faculty Adviser</label>
                  <select
                    required
                    value={propAdviser}
                    onChange={(e) => setPropAdviser(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Faculty Adviser...</option>
                    {users.filter(u => u.role === 'adviser').map(adv => (
                      <option key={adv.id} value={adv.id}>{adv.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500  block">Team Members (comma separated names)</label>
                  <input
                    type="text"
                    required
                    value={propMembers}
                    onChange={(e) => setPropMembers(e.target.value)}
                    placeholder="John Doe, Mary Ann Smith"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500  block">Initial Manuscript Filename</label>
                  <input
                    type="text"
                    required
                    value={propFilename}
                    onChange={(e) => setPropFilename(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormulationModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Create & Register Title
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs   font-bold text-blue-200 tracking-normal bg-blue-950/50 px-2 py-0.5 rounded border border-blue-800">
              A.Y. 2025-2026 Active
            </span>
            <span className="text-xs   font-bold text-indigo-200 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
              {research.id.toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-bold font-serif leading-tight">Welcome Back, {user.name}!</h2>
          <p className="text-xs text-slate-350 leading-relaxed font-sans line-clamp-1" title={research.title}>
            Current Capstone: <strong className="text-white font-semibold">{research.title}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3.5 shrink-0 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl">
          <div className="text-right">
            <span className="text-xs text-slate-500 font-bold block  tracking-normal">Designated Research Adviser</span>
            <span className="text-xs font-extrabold text-white">{getAdviserName()}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
        </div>
      </div>

      {/* Metrics Row Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Circular Progress Card */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="3.5" fill="transparent" />
              <circle cx="24" cy="24" r="20" stroke="#1e40af" strokeWidth="3.5" strokeDasharray={125} strokeDashoffset={125 - (125 * getProgressPercentage()) / 100} strokeLinecap="round" fill="transparent" />
            </svg>
            <span className="text-xs font-extrabold text-blue-900 ">{getProgressPercentage()}%</span>
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Journey Stage</span>
            <span className="text-xs font-extrabold text-slate-800  tracking-wide leading-tight block">{research.status}</span>
          </div>
        </div>

        {/* Latest Version */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-800 rounded-lg shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Latest Submission</span>
            <span className="text-xs font-extrabold text-slate-800 block">
              {currentVersion ? `v${currentVersion.versionNumber} File Draft` : 'No Uploads yet'}
            </span>
          </div>
        </div>

        {/* Comments Counter */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Active Comments</span>
            <span className="text-xs font-extrabold text-slate-800 block">
              {activeComments.length} unresolved
            </span>
          </div>
        </div>

        {/* Next Defense Calendar slot */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-50 text-rose-800 rounded-lg shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Defense Booking</span>
            <span className="text-xs font-extrabold text-slate-800 block">
              {mySchedule ? `${mySchedule.date} (${mySchedule.startTime})` : 'Not Booked'}
            </span>
          </div>
        </div>
      </div>

      {/* Redesigned Section 1: 7-Stage Interactive Research Journey Stepper Timeline */}
      <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-800  tracking-normal flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-blue-800" />
              Academic Research Journey Stepper
            </h3>
            <p className="text-xs text-slate-450">Track the 7 critical stages of the capstone life-cycle. Click any milestone card to view requirements audit.</p>
          </div>
          <button 
            type="button"
            onClick={onNavigateToTimeline}
            className="text-xs text-blue-800 hover:underline font-bold flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            Detailed Interactive Roadmap
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Horizontal 7-Stage Stepper View */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2.5 pt-2">
          {phases.map((phase, idx) => {
            const isSelected = selectedJourneyStage === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedJourneyStage(idx)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected 
                    ? 'border-blue-700 bg-blue-50/20 ring-1 ring-blue-100' 
                    : phase.isActive
                      ? 'border-amber-300 bg-slate-50/50 hover:bg-slate-50'
                      : phase.isCompleted
                        ? 'border-emerald-250 bg-emerald-50/5 hover:bg-emerald-50/10'
                        : 'border-slate-150 bg-white hover:bg-slate-50'
                }`}
              >
                {/* Visual indicator for current active stage */}
                {phase.isActive && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-base">{phase.icon}</span>
                    {phase.isCompleted ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : phase.isActive ? (
                      <span className="text-[7px] bg-amber-500 text-slate-850 font-extrabold px-1.5 py-0.25 rounded   leading-none">
                        Active
                      </span>
                    ) : (
                      <Lock className="h-3 w-3 text-slate-350 shrink-0" />
                    )}
                  </div>

                  <div>
                    <h4 className={`text-xs font-extrabold tracking-tight leading-tight line-clamp-1 ${
                      isSelected ? 'text-blue-900' : 'text-slate-700'
                    }`}>
                      {phase.title}
                    </h4>
                    <p className="text-xs text-slate-500 font-bold mt-0.5 truncate">{phase.subtitle}</p>
                  </div>
                </div>

                <div className={`h-1 w-full rounded-full mt-3.5 ${
                  phase.isCompleted 
                    ? 'bg-emerald-500' 
                    : phase.isActive 
                      ? 'bg-amber-400' 
                      : 'bg-slate-150'
                }`} />
              </button>
            );
          })}
        </div>

        {/* Selected Stepper Info Panel */}
        {selectedJourneyStage !== null && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60 grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-top-1">
            <div className="md:col-span-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{phases[selectedJourneyStage].icon}</span>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800  tracking-normal">
                    Stage {selectedJourneyStage + 1}: {phases[selectedJourneyStage].title}
                  </h4>
                  <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.25 rounded font-bold ">
                    {phases[selectedJourneyStage].subtitle}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed ">
                {phases[selectedJourneyStage].description}
              </p>

              <div className="border-t border-slate-200/60 pt-3">
                <span className="text-xs   font-bold text-slate-500 block tracking-normal">COORDINATOR INSTRUCTION:</span>
                <p className="text-xs text-blue-900 font-semibold mt-1 flex items-start gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
                  {phases[selectedJourneyStage].guide}
                </p>
              </div>
            </div>

            {/* Stage Checklist requirements */}
            <div className="md:col-span-6 bg-white p-4.5 rounded-xl border border-slate-150 space-y-3">
              <h5 className="text-xs font-bold  tracking-normal text-slate-500 flex justify-between items-center">
                <span>STAGE CHECKLIST AUDIT</span>
                <span className=" text-xs font-bold bg-slate-100 text-slate-600 px-1.5 py-0.25 rounded">
                  {getStageChecklist(selectedJourneyStage).filter(x => x.met).length} of {getStageChecklist(selectedJourneyStage).length} complete
                </span>
              </h5>

              <div className="space-y-2.5">
                {getStageChecklist(selectedJourneyStage).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    {item.met ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      </div>
                    )}
                    <span className={item.met ? 'text-slate-500 font-medium line-through' : 'text-slate-700 font-semibold'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid content: Rearranged Action Items, Revisions, & Booking Slot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Outstanding Revisions & Adviser Feed */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800  tracking-normal border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <MessageSquare className="h-4.5 w-4.5 text-amber-500" />
              Unresolved Adviser Revisions ({activeComments.length})
            </h3>

            {activeComments.length === 0 ? (
              <div className="p-12 text-center text-slate-450 text-xs bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                No outstanding revision requests registered. Keep up the high standard!
              </div>
            ) : (
              <div className="space-y-4">
                {activeComments.map(comm => (
                  <div key={comm.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex gap-4 hover:border-slate-300 transition-colors">
                    <span className="bg-amber-100 text-amber-850 text-xs  font-bold px-2.5 py-1 rounded h-fit shrink-0  tracking-normal">
                      {comm.chapter}
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between items-center gap-2">
                        <strong className="text-xs font-bold text-slate-800 block">{comm.authorName}</strong>
                        <span className="text-xs text-slate-500 ">
                          {new Date(comm.commentAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed ">{comm.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Confirmed Presentation Slot details */}
        <div className="lg:col-span-4 space-y-6">
          {mySchedule ? (
            <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-xl p-5 shadow-md relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-white/15 px-2 py-0.5 rounded text-xs  font-bold text-blue-200 tracking-normal">
                CONFIRMED SLOT
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-xs  font-bold text-blue-300 block tracking-normal ">DEFENSE DESIGNATION</span>
                  <h4 className="font-serif font-bold text-sm">
                    {mySchedule.type === 'proposal' ? 'Proposal Defense Presentation' : 'Final Capstone Defense'}
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-200 ">
                    <Calendar className="h-4 w-4 text-blue-300" />
                    <span>{mySchedule.date}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-200 ">
                    <Clock className="h-4 w-4 text-blue-300" />
                    <span>{mySchedule.startTime} - {mySchedule.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Landmark className="h-4 w-4 text-blue-300 shrink-0" />
                    <span className="truncate">{rooms.find(r => r.id === mySchedule.roomId)?.name || 'Online Video Room'}</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <span className="text-xs  font-bold text-blue-300 block tracking-normal mb-1">Defense Committee</span>
                  <div className="space-y-1 text-xs text-slate-200">
                    {mySchedule.panelistIds.map((pid, idx) => {
                      const u = users.find(x => x.id === pid);
                      return <span key={idx} className="block">• {u ? u.name : 'Panelist Faculty'}</span>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm text-center py-8 space-y-3">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto animate-pulse" />
              <p className="text-xs font-semibold text-slate-700">Presentation Booking Pending</p>
              <p className="text-xs text-slate-450 leading-relaxed ">
                Once Chapters 1 to 3 drafts are approved by your designated adviser, the Research Coordinator will assign panelists and publish your defense calendar slot here.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* QUICK DETAILS MODIFICATION MODAL */}
      {showEditDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleSaveDetails} 
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5 font-serif">
                <Edit3 className="h-4 w-4.5 text-blue-700" />
                Update Research Information
              </h3>
              <button 
                type="button" 
                onClick={() => setShowEditDetailsModal(false)}
                className="text-slate-450 hover:text-slate-650 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-bold text-slate-500  block mb-1">Research Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500  block mb-1">Project Abstract</label>
                <textarea
                  required
                  rows={5}
                  value={editAbstract}
                  onChange={(e) => setEditAbstract(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans "
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500  block mb-1">Keywords (Comma Separated)</label>
                <input
                  type="text"
                  required
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500  block mb-1">Registered Co-Authors</label>
                <input
                  type="text"
                  disabled
                  value={editMembers || "No other co-authors matching studentIds."}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-450 focus:outline-none cursor-not-allowed"
                />
                <span className="text-xs text-slate-500 mt-1 block">Co-authors can be registered at initial Title Formulation or adjusted by the Academic Coordinator.</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditDetailsModal(false)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer"
              >
                Save Parameter Updates
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {dashboardPreviewFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col h-[500px] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800  tracking-normal truncate max-w-[350px]">
                    {dashboardPreviewFile.name}
                  </h4>
                  <span className="text-xs font-semibold text-slate-500 ">
                    Category: {dashboardPreviewFile.category.toUpperCase().replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDashboardPreviewFile(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-450 hover:text-slate-650 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Simulated PDF Canvas Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100 space-y-6 font-sans">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-150 space-y-8 min-h-full">
                {/* Academic Letterhead mock */}
                <div className="text-center space-y-1">
                  <h5 className="text-xs font-serif font-bold text-slate-800  tracking-normal">Northern Mindanao State College</h5>
                  <span className="text-xs  font-semibold text-slate-500  tracking-normal block">COLLEGE OF INFORMATION TECHNOLOGY</span>
                  <div className="w-16 h-0.5 bg-blue-800 mx-auto mt-2" />
                </div>

                {/* Document Title */}
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-bold text-slate-850 text-center  tracking-wide leading-snug">
                    {research.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium text-center ">
                    Registered Research Code: <span className="font-bold text-blue-800">{research.id.toUpperCase()}</span>
                  </p>
                </div>

                {/* Abstract Text block */}
                <div className="space-y-2 pt-4">
                  <span className="text-xs  font-bold text-slate-450 block  tracking-normal">Document Segment Preview:</span>
                  <p className="text-xs text-slate-600  leading-relaxed italic">
                    {research.abstract || "No abstract content registered for this proposal document."}
                  </p>
                </div>

                {/* Footer mock metadata */}
                <div className="border-t border-slate-100 pt-6 flex justify-between items-center text-xs  text-slate-500">
                  <span>File size: {dashboardPreviewFile.size ? `${Math.round(dashboardPreviewFile.size / 102.4) / 10} KB` : "150 KB"}</span>
                  <span>Uploaded: {new Date(dashboardPreviewFile.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="bg-slate-50 p-3 border-t border-slate-150 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setDashboardPreviewFile(null)}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-4 py-2 text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
