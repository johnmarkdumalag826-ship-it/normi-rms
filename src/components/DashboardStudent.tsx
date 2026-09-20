import React, { useState, useMemo } from 'react';
import {
  FileText, Calendar, MessageSquare, TrendingUp, CheckCircle2, Clock, ArrowRight,
  Landmark, Plus, Compass, Wrench,
} from 'lucide-react';
import { User, Research, ResearchVersion, ResearchComment, Schedule, Room, ProposalFile } from '../types';
import { uploadFile, resolveFileUrl, ApiError } from '../api/client';
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageHeader, ResearchStatusBadge, Select, Textarea,
  chapterNames, defenseTypeLabels, formatDateAndTime, formatDateLong, formatTime,
} from '../ui';

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
      setDashboardError("Please choose a PDF or Word (DOCX) file.");
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
      setUploadErrorMsg('Please choose a PDF or Word (DOCX) file.');
      return;
    }
    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadErrorMsg('That file is too big. Please choose a file smaller than 15 MB.');
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
      setUploadErrorMsg(err instanceof ApiError ? err.message : 'We could not upload your file. Please check your internet connection and try again.');
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

  // The 7 steps of a research paper's journey, in plain words.
  const getJourneyPhases = () => {
    const phases = [
      {
        idx: 0,
        title: 'Send your idea',
        subtitle: 'Title and summary',
        description: 'Write your research title and a short summary, and choose your adviser.',
        guide: 'Send in your paper drafts so your adviser can start reading them.',
      },
      {
        idx: 1,
        title: 'Adviser assigned',
        subtitle: 'Your adviser is chosen',
        description: 'The department matches your group with an adviser who will guide you.',
        guide: 'Your adviser is set. You can ask for meetings to talk about your paper.',
      },
      {
        idx: 2,
        title: 'Adviser checks your chapters',
        subtitle: 'Feedback on Chapters 1 to 3',
        description: 'Your adviser reads Chapters 1 to 3 and writes feedback. You fix the problems and upload the paper again.',
        guide: 'Read each comment, fix your paper, and upload a new version.',
      },
      {
        idx: 3,
        title: 'Approval',
        subtitle: 'Ready for your defense',
        description: 'When your chapters are good enough, your adviser approves your paper. The coordinator then checks it.',
        guide: 'Your adviser approved your paper. The coordinator will now prepare your defense.',
      },
      {
        idx: 4,
        title: 'Defense',
        subtitle: 'Present to the panel',
        description: 'The coordinator picks a date, a room and 3 panel members for your defense.',
        guide: 'Prepare your slides and arrive on time. Your defense details are shown on this page.',
      },
      {
        idx: 5,
        title: 'Fix and finalize',
        subtitle: 'After your defense',
        description: 'The panel scores your defense and may ask for changes. Fix them and upload your final paper.',
        guide: 'Your defense is done. Make the changes the panel asked for.',
      },
      {
        idx: 6,
        title: 'Saved in the Repository',
        subtitle: 'All done',
        description: 'Your final paper is saved in the Research Repository.',
        guide: 'Congratulations! Your research journey is complete.',
      },
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
        isUpcoming: idx > activeIdx,
      })),
      activeIdx,
    };
  };

  const { phases, activeIdx } = getJourneyPhases();

  // What has been done at each step (a checklist shown when a step is opened)
  const getStageChecklist = (stageIndex: number) => {
    if (!research) return [];

    switch (stageIndex) {
      case 0:
        return [
          { label: 'Write your research title', met: !!research.title },
          { label: 'Write a short summary (abstract)', met: !!research.abstract },
          { label: 'Add at least one keyword', met: research.keywords.length > 0 },
        ];
      case 1:
        return [
          { label: 'Send in your research form', met: true },
          { label: 'An adviser is assigned to you', met: !!research.adviserId },
        ];
      case 2:
        return [
          { label: 'Chapter 1 (Introduction) approved', met: currentVersion?.chapters?.chapter1?.status === 'Approved' },
          { label: 'Chapter 2 (Review of Related Literature) approved', met: currentVersion?.chapters?.chapter2?.status === 'Approved' },
          { label: 'Chapter 3 (Methodology) approved', met: currentVersion?.chapters?.chapter3?.status === 'Approved' },
        ];
      case 3:
        return [
          { label: 'Fix all comments from your adviser', met: activeComments.length === 0 },
          { label: 'Get your adviser’s approval', met: ['Approved by Adviser', 'Pending Coordinator', 'Scheduled', 'Completed', 'Archived'].includes(research.status) },
        ];
      case 4:
        return [
          { label: 'You have a defense date and time', met: !!mySchedule },
          { label: 'You have 3 panel members', met: !!mySchedule && mySchedule.panelistIds.length === 3 },
          { label: 'You have a room', met: !!mySchedule && !!mySchedule.roomId },
        ];
      case 5:
        return [
          { label: 'Upload your final paper', met: myVersions.some(v => v.type === 'defense_manuscript') },
          { label: 'Finish your defense', met: ['Completed', 'Archived'].includes(research.status) },
        ];
      case 6:
        return [
          { label: 'Fix the panel’s corrections', met: research.status === 'Archived' },
          { label: 'Get final clearance from the school', met: research.status === 'Archived' },
        ];
      default:
        return [];
    }
  };

  // ---------- Screen for a student who has no research paper yet ----------
  if (!research) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${user.name}`}
          subtitle="You have not sent in a research paper yet. Start by telling us your research title."
          action={<Button icon={Plus} onClick={() => setShowFormulationModal(true)}>Start My Research Paper</Button>}
        />

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['1', 'Send your title', 'Write your research title, a short summary and a few keywords, then choose your adviser.'],
            ['2', 'Meet your adviser', 'Upload your chapters. Your adviser will read them and write feedback for you to fix.'],
            ['3', 'Defend your paper', 'After your adviser approves, the coordinator sets your defense date, room and panel.'],
          ].map(([num, title, text]) => (
            <li key={num}>
              <Card className="h-full space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-800 text-base font-bold text-white" aria-hidden="true">{num}</span>
                <h2 className="text-base font-bold text-slate-900">Step {num}: {title}</h2>
                <p className="text-sm text-slate-600">{text}</p>
              </Card>
            </li>
          ))}
        </ol>

        <Modal
          open={showFormulationModal}
          onClose={() => setShowFormulationModal(false)}
          title="Start your research paper"
          description="Fill in the details below. Fields marked with * are required."
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowFormulationModal(false)}>Cancel</Button>
              <Button type="submit" form="formulation-form">Send My Research Title</Button>
            </>
          }
        >
          <form id="formulation-form" onSubmit={handleCreateProposalSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Research title"
                required
                value={propTitle}
                onChange={e => setPropTitle(e.target.value)}
                hint="The name of your research paper."
                placeholder="e.g. Web-Based Research Management System"
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Short summary (abstract)"
                required
                rows={4}
                value={propAbstract}
                onChange={e => setPropAbstract(e.target.value)}
                hint="Explain the problem you want to solve and how."
              />
            </div>
            <Input
              label="Keywords"
              required
              value={propKeywords}
              onChange={e => setPropKeywords(e.target.value)}
              hint="Separate each keyword with a comma."
              placeholder="React, Database, Normalization"
            />
            <Select
              label="Preferred adviser"
              required
              value={propAdviser}
              onChange={e => setPropAdviser(e.target.value)}
              hint="The teacher who will guide your group."
            >
              <option value="">Choose an adviser…</option>
              {users.filter(u => u.role === 'adviser').map(adv => (
                <option key={adv.id} value={adv.id}>{adv.name}</option>
              ))}
            </Select>
            <Input
              label="Group members"
              required
              value={propMembers}
              onChange={e => setPropMembers(e.target.value)}
              hint="Type the names of your teammates, separated by commas."
              placeholder="John Doe, Mary Ann Smith"
            />
            <Input
              label="Name of your first file"
              required
              value={propFilename}
              onChange={e => setPropFilename(e.target.value)}
              hint="The file name of your first draft."
            />
          </form>
        </Modal>
      </div>
    );
  }

  // ---------- Main home page for a student ----------
  const progress = getProgressPercentage();
  const roomName = mySchedule ? rooms.find(r => r.id === mySchedule.roomId)?.name || 'Online meeting room' : '';

  // "What should I do next?" — one clear step for every stage.
  const nextStep: { title: string; text: string; showAction: boolean } = (() => {
    switch (research.status) {
      case 'Revision Required':
        return {
          title: 'Fix your paper and upload the new version',
          text: `Your adviser asked for changes${activeComments.length ? ` (${activeComments.length} comment${activeComments.length === 1 ? '' : 's'} to fix)` : ''}. Read the feedback, fix your paper, then upload it again.`,
          showAction: true,
        };
      case 'Submitted':
      case 'Under Review':
        return {
          title: 'Wait for your adviser’s feedback',
          text: 'Your adviser is reading your paper. You will get a notification when there is feedback. You can upload a new version any time.',
          showAction: true,
        };
      case 'Approved by Adviser':
      case 'Pending Coordinator':
        return {
          title: 'Wait for your defense date',
          text: 'Your adviser approved your paper. The coordinator is now choosing a date, room and panel. You will be told here and by notification.',
          showAction: false,
        };
      case 'Scheduled':
        return {
          title: mySchedule
            ? `Get ready for your defense on ${formatDateAndTime(mySchedule.date, mySchedule.startTime)}`
            : 'Get ready for your defense',
          text: 'Prepare your slides and arrive on time. The date, room and panel members are shown on this page.',
          showAction: false,
        };
      case 'Completed':
        return {
          title: 'Upload your final paper',
          text: 'Your defense is finished. Fix what the panel asked for, then upload your final paper.',
          showAction: true,
        };
      case 'Archived':
        return {
          title: 'You are all done',
          text: 'Your final paper is saved in the Research Repository. Congratulations!',
          showAction: false,
        };
      default:
        return { title: 'Open your research page', text: 'See your paper’s progress and upload changes.', showAction: true };
    }
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user.name}`}
        subtitle="Here is where your research paper stands and what to do next."
      />

      {/* What should I do next? */}
      <section aria-labelledby="next-step-title">
        <Card className="border-blue-200 bg-blue-50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-3">
              <p id="next-step-title" className="flex items-center gap-2 text-sm font-bold text-blue-900">
                <Compass className="h-5 w-5" aria-hidden="true" />
                What should I do next?
              </p>
              <h2 className="text-xl font-bold text-slate-900">{nextStep.title}</h2>
              <p className="max-w-2xl text-base text-slate-700">{nextStep.text}</p>
            </div>
            {nextStep.showAction && (
              <Button icon={ArrowRight} onClick={onNavigateToTimeline} className="shrink-0">
                Open My Research
              </Button>
            )}
          </div>
        </Card>
      </section>

      {/* Your research paper */}
      <Card>
        <CardHeader
          title="Your research paper"
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
        />
        <div className="space-y-4">
          <p className="text-lg font-semibold text-slate-900">{research.title}</p>
          <p className="text-sm text-slate-700">
            Adviser: <strong className="text-slate-900">{getAdviserName()}</strong>
          </p>
          <ResearchStatusBadge status={research.status} explain />

          <div>
            <div className="mb-1.5 flex justify-between text-sm font-semibold text-slate-800">
              <span>Your progress</span>
              <span>{progress}% done</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Progress of your research paper"
              className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
            >
              <div className="h-full rounded-full bg-blue-800" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Quick facts */}
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-start gap-3">
          <FileText className="mt-0.5 h-6 w-6 shrink-0 text-blue-800" aria-hidden="true" />
          <div>
            <dt className="text-sm text-slate-600">Latest file you sent</dt>
            <dd className="text-base font-bold text-slate-900">
              {currentVersion ? `Version ${currentVersion.versionNumber}` : 'Nothing uploaded yet'}
            </dd>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <dt className="text-sm text-slate-600">Comments to fix</dt>
            <dd className="text-base font-bold text-slate-900">
              {activeComments.length === 0 ? 'None right now' : activeComments.length}
            </dd>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-6 w-6 shrink-0 text-rose-700" aria-hidden="true" />
          <div>
            <dt className="text-sm text-slate-600">Your defense</dt>
            <dd className="text-base font-bold text-slate-900">
              {mySchedule ? formatDateAndTime(mySchedule.date, mySchedule.startTime) : 'Not set yet'}
            </dd>
          </div>
        </Card>
      </dl>

      {/* The journey */}
      <Card>
        <CardHeader
          title="Your research journey"
          description="There are 7 steps from your first idea to the Repository. Select a step to see what it needs."
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
        />

        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {phases.map((phase, idx) => {
            const isSelected = selectedJourneyStage === idx;
            return (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => setSelectedJourneyStage(idx)}
                  aria-pressed={isSelected}
                  className={`flex h-full w-full flex-col gap-2 rounded-xl border-2 p-3 text-left transition-colors cursor-pointer ${
                    isSelected ? 'border-blue-800 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-700">Step {idx + 1}</span>
                    {phase.isCompleted ? (
                      <Badge tone="success" icon={CheckCircle2}>Done</Badge>
                    ) : phase.isActive ? (
                      <Badge tone="warning" icon={Clock}>You are here</Badge>
                    ) : (
                      <Badge tone="neutral">Later</Badge>
                    )}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{phase.title}</span>
                  <span className="text-xs text-slate-600">{phase.subtitle}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {selectedJourneyStage !== null && (
          <div className="mt-5 grid grid-cols-1 gap-6 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900">
                Step {selectedJourneyStage + 1}: {phases[selectedJourneyStage].title}
              </h3>
              <p className="text-sm text-slate-700">{phases[selectedJourneyStage].description}</p>
              <div className="rounded-lg border border-blue-200 bg-white p-3">
                <p className="text-xs font-bold text-blue-900">What to do</p>
                <p className="mt-1 text-sm text-slate-800">{phases[selectedJourneyStage].guide}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="flex items-center justify-between gap-2 text-sm font-bold text-slate-900">
                <span>Checklist for this step</span>
                <Badge tone="neutral">
                  {getStageChecklist(selectedJourneyStage).filter(x => x.met).length} of {getStageChecklist(selectedJourneyStage).length} done
                </Badge>
              </h3>
              <ul className="mt-3 space-y-2.5">
                {getStageChecklist(selectedJourneyStage).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm">
                    {item.met ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                    ) : (
                      <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-slate-400" aria-hidden="true" />
                    )}
                    <span className={item.met ? 'text-slate-700' : 'font-semibold text-slate-900'}>
                      {item.label}
                      <span className="sr-only">{item.met ? ' (done)' : ' (not done yet)'}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>

      {/* Comments and defense */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader
            title={`Comments from your adviser${activeComments.length ? ` (${activeComments.length})` : ''}`}
            description="Fix each comment, then upload a new version on the My Research page."
            icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
          />
          {activeComments.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing to fix right now"
              description="Your adviser has no open comments. When they write one, it will show here."
            />
          ) : (
            <ul className="space-y-3">
              {activeComments.map(comm => (
                <li key={comm.id} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone="warning" icon={Wrench}>{chapterNames[comm.chapter] ?? comm.chapter}</Badge>
                    <span className="text-xs text-slate-600">{formatDateLong(comm.commentAt)}</span>
                  </div>
                  <p className="text-sm text-slate-900">{comm.text}</p>
                  <p className="text-xs text-slate-600">From {comm.authorName}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-4">
          {mySchedule ? (
            <Card className="border-blue-200">
              <CardHeader
                title="Your defense"
                icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
                action={<Badge tone="success" icon={CheckCircle2}>Confirmed</Badge>}
              />
              <p className="text-base font-bold text-slate-900">{defenseTypeLabels[mySchedule.type]}</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Date</dt>
                    <dd className="text-slate-900">{formatDateLong(mySchedule.date)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Time</dt>
                    <dd className="text-slate-900">{formatTime(mySchedule.startTime)} to {formatTime(mySchedule.endTime)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Room</dt>
                    <dd className="text-slate-900">{roomName}</dd>
                  </div>
                </div>
              </dl>
              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="text-sm font-bold text-slate-900">Your panel members</p>
                <ul className="mt-1.5 space-y-1 text-sm text-slate-800">
                  {mySchedule.panelistIds.map((pid, idx) => {
                    const u = users.find(x => x.id === pid);
                    return <li key={idx}>{u ? u.name : 'Panel Member'}</li>;
                  })}
                </ul>
              </div>
            </Card>
          ) : (
            <Card padded={false}>
              <EmptyState
                icon={Calendar}
                title="Your defense date is not set yet"
                description="After your adviser approves your paper, the coordinator will choose a date, a room and a panel. It will show here."
              />
            </Card>
          )}
        </div>
      </div>

      {/* Edit details pop-up */}
      <Modal
        open={showEditDetailsModal}
        onClose={() => setShowEditDetailsModal(false)}
        title="Change your research details"
        description="Fields marked with * are required."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditDetailsModal(false)}>Cancel</Button>
            <Button type="submit" form="edit-details-form">Save My Changes</Button>
          </>
        }
      >
        <form id="edit-details-form" onSubmit={handleSaveDetails} className="space-y-5">
          <Input label="Research title" required value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          <Textarea label="Short summary (abstract)" required rows={5} value={editAbstract} onChange={e => setEditAbstract(e.target.value)} />
          <Input
            label="Keywords"
            required
            value={editKeywords}
            onChange={e => setEditKeywords(e.target.value)}
            hint="Separate each keyword with a comma."
          />
          <Input
            label="Group members"
            disabled
            value={editMembers || 'No other group members yet.'}
            readOnly
            hint="Group members are set when you first send your paper, or by the coordinator."
          />
        </form>
      </Modal>

      {/* File preview pop-up */}
      <Modal
        open={!!dashboardPreviewFile}
        onClose={() => setDashboardPreviewFile(null)}
        title={dashboardPreviewFile?.name ?? 'File preview'}
        footer={<Button variant="secondary" onClick={() => setDashboardPreviewFile(null)}>Close Preview</Button>}
      >
        {dashboardPreviewFile && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">{research.title}</h3>
            <p className="text-sm italic text-slate-700">
              {research.abstract || 'No summary was written for this research paper.'}
            </p>
            <p className="text-xs text-slate-600">
              Sent on {formatDateLong(dashboardPreviewFile.uploadedAt)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
