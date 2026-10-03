import React, { useState, useMemo } from 'react';
import {
  FileText, Calendar, MessageSquare, TrendingUp, CheckCircle2, Clock, ArrowRight,
  Landmark, Compass, Wrench, UploadCloud, Download, ExternalLink, RefreshCw, Send,
} from 'lucide-react';
import { User, Research, ResearchVersion, ResearchComment, Schedule, Room } from '../types';
import { uploadFile, resolveFileUrl, ApiError } from '../api/client';
import { downloadFile, openFile, fileErrorMessage } from '../api/files';
import {
  Alert, Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageHeader, ResearchStatusBadge, Select, Textarea,
  chapterNames, defenseTypeLabels, earlyStatuses, formatDateAndTime, formatDateLong, formatTime, journeyProgress, researchTitle,
} from '../ui';
import { ResearchGroupCard, groupPeople } from './ResearchGroupCard';

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
  /** Opens the page where the group writes its title proposal. */
  onOpenProposalForm: () => void;
  /** Sends the file with the titles the group prepared for the title hearing. */
  onSendTitleList: (researchId: string, file: { name: string; url: string; size: number }) => Promise<void>;
  onStudentUploadRevision: (researchId: string, title: string, abstract: string, fileName: string, fileUrl: string, type: 'adviser_check' | 'defense_manuscript') => void;
  onUpdateResearchDetails?: (updated: Research) => void;
}

export default function DashboardStudent({
  user, research, currentVersion, versions, comments, schedules, rooms, users, 
  onNavigateToTimeline, onOpenProposalForm, onSendTitleList, onStudentUploadRevision, onUpdateResearchDetails
}: DashboardStudentProps) {

  // The file with the titles the group prepared for its title hearing
  const [sendingTitles, setSendingTitles] = useState(false);
  const [titlesError, setTitlesError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState<'adviser_check' | 'defense_manuscript'>('adviser_check');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedJourneyStage, setSelectedJourneyStage] = useState<number | null>(null); // null = open the step the student is on
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  // Modals
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);

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
      
      setEditMembers(groupPeople(research, users).members.join(', '));
    }
  }, [research, users]);


  const getAdviserName = () => {
    if (!research) return 'Not Assigned';
    const adviser = users.find(u => u.id === research.adviserId);
    return adviser ? adviser.name : 'Unknown Faculty';
  };

  // The title hearing and the defense are separate bookings; the "defense" card shows the real
  // defense when there is one, otherwise the title hearing.
  const myBookings = research ? schedules.filter(s => s.researchId === research.id) : [];
  const myHearing = myBookings.find(s => s.type === 'title_hearing' && s.status === 'scheduled');
  const myDefense = myBookings.find(s => s.type !== 'title_hearing' && s.status === 'scheduled');
  const hearingDone = myBookings.some(s => s.type === 'title_hearing' && s.status === 'completed');
  const mySchedule = myDefense ?? myHearing ?? null;
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
      case 'Group Registered': return 5;
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

  // A research paper's journey in three steps, in plain words: the title hearing, the title
  // proposal, then the final title (the final defense and the Repository). Nothing is blocked:
  // a paper that is already further along simply counts the earlier steps as done.
  const titleFile = research?.proposalFiles?.find(f => f.category === 'title_list');

  const handleTitleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so the same file can be chosen again
    if (!file || !research) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setTitlesError('Please choose a PDF or Word (DOCX) file.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setTitlesError('That file is too big. Please choose a file smaller than 15 MB.');
      return;
    }
    setTitlesError(null);
    setSendingTitles(true);
    try {
      const uploaded = await uploadFile(file);
      await onSendTitleList(research.id, { name: uploaded.fileName, url: resolveFileUrl(uploaded.url), size: uploaded.size });
    } catch (err) {
      setTitlesError(err instanceof ApiError ? err.message : 'We could not upload your file. Please check your internet connection and try again.');
    } finally {
      setSendingTitles(false);
    }
  };
  const getJourneyPhases = () => {
    const phases = [
      {
        idx: 0,
        title: 'Title Hearing',
        subtitle: 'Present your title',
        description: 'Send one file with the titles your group prepared. The coordinator then sets a date, a room and 3 panel members for your title hearing, where the panel hears your titles.',
        guide: 'Send your titles file, then prepare to explain your titles. Your hearing details are shown on this page.',
      },
      {
        idx: 1,
        title: 'Title Proposal',
        subtitle: 'Send it and get approved',
        description: 'Write your research title and a short summary, choose your adviser, and send your paper. Your adviser reads Chapters 1 to 3, writes feedback, and approves your paper when it is ready.',
        guide: 'Read each comment, fix your paper, and upload a new version.',
      },
      {
        idx: 2,
        title: 'Final Title',
        subtitle: 'Final defense and Repository',
        description: 'The coordinator picks a date, a room and 3 panel members for your final defense. The panel scores it and may ask for changes. You fix them, upload your final paper, and it is saved in the Research Repository.',
        guide: 'Prepare your slides and arrive on time. After your defense, make the changes the panel asked for.',
      },
    ];

    const activeIdx = research ? journeyProgress(research, schedules).activeIdx : 0;

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
  const shownStage = selectedJourneyStage ?? Math.min(activeIdx, phases.length - 1);

  // What has been done at each step (a checklist shown when a step is opened)
  const getStageChecklist = (stageIndex: number) => {
    if (!research) return [];
    const pastEarlySteps = !earlyStatuses.includes(research.status);

    switch (stageIndex) {
      case 0:
        return [
          { label: 'Send the file with your prepared titles', met: !!titleFile || hearingDone || pastEarlySteps },
          { label: 'You have a title hearing date and time', met: !!myHearing || hearingDone || pastEarlySteps },
          { label: 'You have a room and 3 panel members', met: (!!myHearing && !!myHearing.roomId && myHearing.panelistIds.length === 3) || hearingDone || pastEarlySteps },
          { label: 'Finish your title hearing', met: hearingDone || pastEarlySteps },
        ];
      case 1:
        return [
          { label: 'Send your title, summary and at least one keyword', met: !!research.title && !!research.abstract && research.keywords.length > 0 },
          { label: 'An adviser is assigned to you', met: !!research.adviserId },
          { label: 'Chapters 1 to 3 approved by your adviser', met: ['chapter1', 'chapter2', 'chapter3'].every(c => currentVersion?.chapters?.[c as 'chapter1']?.status === 'Approved') },
          { label: 'Fix all comments from your adviser', met: activeComments.length === 0 },
          { label: 'Get your adviser’s approval', met: ['Approved by Adviser', 'Pending Coordinator', 'Scheduled', 'Completed', 'Archived'].includes(research.status) },
        ];
      case 2:
        return [
          { label: 'You have a final defense date, room and 3 panel members', met: !!myDefense && !!myDefense.roomId && myDefense.panelistIds.length === 3 },
          { label: 'Finish your final defense', met: ['Completed', 'Archived'].includes(research.status) },
          { label: 'Upload your final paper', met: myVersions.some(v => v.type === 'defense_manuscript') },
          { label: 'Fix the panel’s corrections and get final clearance', met: research.status === 'Archived' },
        ];
      default:
        return [];
    }
  };

  // ---------- Main home page for a student ----------
  const progress = getProgressPercentage();
  const roomName = mySchedule ? rooms.find(r => r.id === mySchedule.roomId)?.name || 'Online meeting room' : '';

  // "What should I do next?" — one clear step for every stage.
  const nextStep: { title: string; text: string; showAction: boolean; action?: { label: string; onClick: () => void } } = (() => {
    switch (research.status) {
      case 'Group Registered':
        if (hearingDone) {
          return {
            title: 'Send your title proposal',
            text: 'Your title hearing is done. Write the title your group chose and a short summary, and add your main document.',
            showAction: false,
            action: { label: 'Send Title Proposal', onClick: onOpenProposalForm },
          };
        }
        if (myHearing) {
          return {
            title: `Get ready for your title hearing on ${formatDateAndTime(myHearing.date, myHearing.startTime)}`,
            text: titleFile
              ? 'Your prepared titles are sent. Prepare to present them to the panel. The date, room and panel members are shown on this page.'
              : 'Send the file with your prepared titles before the hearing. The date, room and panel members are shown on this page.',
            showAction: false,
          };
        }
        if (!titleFile) {
          return {
            title: 'Send your prepared titles',
            text: 'Put the titles your group prepared in one file (PDF or Word) and send it. The panel will read it at your title hearing.',
            showAction: false,
            action: {
              label: 'Send Titles File',
              onClick: () => document.getElementById('titles-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
            },
          };
        }
        return {
          title: 'Wait for your title hearing date',
          text: 'Your prepared titles are sent. The coordinator will set the date, the room and your panel. You will be told here and by notification.',
          showAction: false,
        };
      case 'Revision Required':
        return {
          title: 'Fix your paper and upload the new version',
          text: `Your adviser asked for changes${activeComments.length ? ` (${activeComments.length} comment${activeComments.length === 1 ? '' : 's'} to fix)` : ''}. Read the feedback, fix your paper, then upload it again.`,
          showAction: true,
        };
      case 'Submitted':
      case 'Under Review':
        if (myHearing) {
          return {
            title: `Get ready for your title hearing on ${formatDateAndTime(myHearing.date, myHearing.startTime)}`,
            text: 'Prepare to present your research title to the panel. The date, room and panel members are shown on this page.',
            showAction: false,
          };
        }
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

      {/* The journey */}
      <Card>
        <CardHeader
          title="Your research journey"
          description="There are 3 steps from your first idea to the Repository. Select a step to see what it needs."
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
        />

        <ol className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {phases.map((phase, idx) => {
            const isSelected = shownStage === idx;
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

        {shownStage !== null && (
          <div className="mt-5 grid grid-cols-1 gap-6 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900">
                Step {shownStage + 1}: {phases[shownStage].title}
              </h3>
              <p className="text-sm text-slate-700">{phases[shownStage].description}</p>
              <div className="rounded-lg border border-blue-200 bg-white p-3">
                <p className="text-xs font-bold text-blue-900">What to do</p>
                <p className="mt-1 text-sm text-slate-800">{phases[shownStage].guide}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="flex items-center justify-between gap-2 text-sm font-bold text-slate-900">
                <span>Checklist for this step</span>
                <Badge tone="neutral">
                  {getStageChecklist(shownStage).filter(x => x.met).length} of {getStageChecklist(shownStage).length} done
                </Badge>
              </h3>
              <ul className="mt-3 space-y-2.5">
                {getStageChecklist(shownStage).map((item, idx) => (
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
            {nextStep.action ? (
              <Button icon={ArrowRight} onClick={nextStep.action.onClick} className="shrink-0">
                {nextStep.action.label}
              </Button>
            ) : nextStep.showAction && (
              <Button icon={ArrowRight} onClick={onNavigateToTimeline} className="shrink-0">
                Open My Research
              </Button>
            )}
          </div>
        </Card>
      </section>

      {/* The titles the group prepared for its title hearing */}
      {earlyStatuses.includes(research.status) && !hearingDone && (
        <Card id="titles-card">
          <CardHeader
            title="Your prepared titles"
            description="Put the titles your group prepared in one file (PDF or Word). The panel reads it at your title hearing."
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          />
          <div className="space-y-4">
            {titlesError && <Alert tone="danger" title="We could not send your file">{titlesError}</Alert>}
            {titleFile ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="min-w-0">
                  <Badge tone="success" icon={CheckCircle2}>Sent</Badge>
                  <p className="mt-2 break-words text-sm font-semibold text-slate-900">{titleFile.name}</p>
                  <p className="text-xs text-slate-600">Sent {formatDateLong(titleFile.uploadedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary" size="sm" icon={ExternalLink}
                    onClick={() => openFile(titleFile.url).catch(err => setTitlesError(fileErrorMessage(err)))}
                  >
                    Open File
                  </Button>
                  <Button
                    variant="secondary" size="sm" icon={Download}
                    onClick={() => downloadFile(titleFile.url, titleFile.name).catch(err => setTitlesError(fileErrorMessage(err)))}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">You have not sent a file yet.</p>
            )}
            <div>
              <input
                id="titles-input"
                type="file"
                accept=".pdf,.docx"
                className="sr-only"
                tabIndex={-1}
                disabled={sendingTitles}
                onChange={handleTitleFile}
              />
              <Button
                icon={sendingTitles ? RefreshCw : UploadCloud}
                loading={sendingTitles}
                onClick={() => document.getElementById('titles-input')?.click()}
              >
                {sendingTitles ? 'Sending…' : titleFile ? 'Send a New File' : 'Send Titles File'}
              </Button>
              <p className="mt-2 text-xs text-slate-600">Only PDF and Word (DOCX) files, smaller than 15 MB. A new file replaces the old one.</p>
            </div>
          </div>
        </Card>
      )}

      {/* After the hearing: the title proposal */}
      {research.status === 'Group Registered' && (
        <Card className={hearingDone ? 'border-blue-200 bg-blue-50' : undefined}>
          <CardHeader
            title="Your title proposal"
            description="After your title hearing, send the title your group chose, a short summary and your main document."
            icon={<Send className="h-5 w-5" aria-hidden="true" />}
          />
          <Button icon={ArrowRight} onClick={onOpenProposalForm}>Send Title Proposal</Button>
        </Card>
      )}

      {/* Your research paper */}
      <Card>
        <CardHeader
          title="Your research paper"
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
        />
        <div className="space-y-4">
          <p className="text-lg font-semibold text-slate-900">{researchTitle(research)}</p>
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

      <ResearchGroupCard research={research} users={users} currentUserId={user.id} />

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
            <dt className="text-sm text-slate-600">{mySchedule?.type === 'title_hearing' ? 'Your title hearing' : 'Your defense'}</dt>
            <dd className="text-base font-bold text-slate-900">
              {mySchedule ? formatDateAndTime(mySchedule.date, mySchedule.startTime) : 'Not set yet'}
            </dd>
          </div>
        </Card>
      </dl>

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
                title={mySchedule.type === 'title_hearing' ? 'Your title hearing' : 'Your defense'}
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
    </div>
  );
}
