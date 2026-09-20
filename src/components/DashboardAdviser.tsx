import React, { useState, useMemo } from 'react';
import {
  Users, MessageSquare, Calendar, ShieldCheck, AlertCircle, FileText, Clock, Bell,
  CheckCircle2, Layers, Compass, Wrench, ArrowRight, Inbox,
} from 'lucide-react';
import { User, Research, ResearchVersion, ResearchComment, Consultation, Schedule, Room } from '../types';
import {
  Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Input, Modal, PageHeader, ResearchStatusBadge, Select,
  StatusBadge, Table, chapterNames, chapterStatus, cx, defenseTypeLabels, formatDate, formatDateAndTime, formatDateLong,
  formatDateTime, formatTime, type Column,
} from '../ui';

interface DashboardAdviserProps {
  user: User;
  researchList: Research[];
  versions: ResearchVersion[];
  comments: ResearchComment[];
  consultations: Consultation[];
  schedules?: Schedule[];
  rooms?: Room[];
  users: User[];
  departments?: { id: string; name: string; code: string }[];
  courses?: { id: string; name: string; code: string }[];
  onSelectResearch: (id: string) => void;
  onApproveManuscript: (id: string, approve: boolean) => void;
  onAddConsultation: (cons: Consultation) => void;
  onApproveConsultation: (id: string) => void;
}

type DetailTab = 'info' | 'versions' | 'schedule' | 'timeline';

const detailTabs: { id: DetailTab; label: string }[] = [
  { id: 'info', label: 'Group Members' },
  { id: 'versions', label: 'Latest Paper' },
  { id: 'schedule', label: 'Defense' },
  { id: 'timeline', label: 'Progress' },
];

interface ChapterRow { key: string; name: string; status: keyof typeof chapterStatus; feedback?: string }

export default function DashboardAdviser({
  user, researchList, versions, comments, consultations, schedules = [], rooms = [], users,
  departments = [], courses = [], onSelectResearch, onApproveManuscript, onAddConsultation, onApproveConsultation,
}: DashboardAdviserProps) {

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('info');
  // Approving or asking for changes is final for the student, so we ask "are you sure?" first.
  const [pendingDecision, setPendingDecision] = useState<{ id: string; approve: boolean } | null>(null);

  // Filter research assigned to this adviser
  const assignedResearchList = useMemo(() => {
    return researchList.filter(r => r.adviserId === user.id);
  }, [researchList, user.id]);

  const myConsultations = useMemo(() => {
    return consultations.filter(c => c.adviserId === user.id);
  }, [consultations, user.id]);

  // Numbers for the top of the page
  const stats = useMemo(() => {
    const totalAssigned = assignedResearchList.length;
    const pendingReview = assignedResearchList.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length;
    const approvedPapers = assignedResearchList.filter(r => r.status === 'Approved by Adviser' || r.status === 'Completed' || r.status === 'Archived' || r.status === 'Scheduled').length;
    const revisionRequests = assignedResearchList.filter(r => r.status === 'Revision Required').length;
    return { totalAssigned, pendingReview, approvedPapers, revisionRequests };
  }, [assignedResearchList]);

  const waitingForReview = useMemo(
    () => assignedResearchList.filter(r => r.status === 'Submitted' || r.status === 'Under Review'),
    [assignedResearchList],
  );

  // Recent things that happened in this adviser's groups
  const activityNotifications = useMemo(() => {
    const events: { id: string; title: string; message: string; date: string; type: 'success' | 'info' | 'warning' }[] = [];

    assignedResearchList.forEach(res => {
      const groupVersions = versions.filter(v => v.researchId === res.id);
      if (groupVersions.length > 0) {
        const sorted = [...groupVersions].sort((a, b) => b.versionNumber - a.versionNumber);
        events.push({
          id: `notif-ver-${res.id}`,
          title: 'New paper uploaded',
          message: `The group “${res.title.substring(0, 40)}${res.title.length > 40 ? '…' : ''}” sent Version ${sorted[0].versionNumber} for your review.`,
          date: formatDateTime(sorted[0].submittedAt),
          type: 'info',
        });
      }

      const sched = schedules.find(s => s.researchId === res.id);
      if (sched) {
        const roomName = rooms.find(r => r.id === sched.roomId)?.name;
        events.push({
          id: `notif-sched-${res.id}`,
          title: 'Defense scheduled',
          message: `The defense for “${res.title.substring(0, 40)}${res.title.length > 40 ? '…' : ''}” is on ${formatDateAndTime(sched.date, sched.startTime)}${roomName ? ` in ${roomName}` : ''}.`,
          date: formatDate(sched.date),
          type: 'success',
        });
      }

      const groupComments = comments.filter(c => c.researchId === res.id);
      if (groupComments.length > 0) {
        events.push({
          id: `notif-comm-${res.id}`,
          title: 'Comments on chapters',
          message: `There ${groupComments.length === 1 ? 'is 1 comment' : `are ${groupComments.length} comments`} on this group’s chapters.`,
          date: 'Recent',
          type: 'warning',
        });
      }
    });

    return events.slice(0, 5);
  }, [assignedResearchList, versions, schedules, comments, rooms]);

  // Pick the first group by default
  React.useEffect(() => {
    if (assignedResearchList.length > 0 && !selectedGroupId) {
      setSelectedGroupId(assignedResearchList[0].id);
    }
  }, [assignedResearchList, selectedGroupId]);

  const selectedGroup = useMemo(() => {
    return assignedResearchList.find(r => r.id === selectedGroupId) || null;
  }, [assignedResearchList, selectedGroupId]);

  const getStudentNames = (studentIds: string[]) => {
    return studentIds.map(sid => {
      const u = users.find(x => x.id === sid);
      return u ? u.name : 'Unknown student';
    }).join(', ');
  };

  const getStudentObjects = (studentIds: string[]) => {
    return studentIds.map(sid => users.find(x => x.id === sid)).filter(Boolean) as User[];
  };

  const getLatestVersion = (researchId: string) => {
    const list = versions.filter(v => v.researchId === researchId);
    if (list.length === 0) return null;
    return list.reduce((prev, current) => (prev.versionNumber > current.versionNumber) ? prev : current);
  };

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !dateTime || !topic) return;

    onAddConsultation({
      id: `cons-${Date.now()}`,
      adviserId: user.id,
      studentId,
      dateTime,
      topic,
      status: 'approved',
      meetLink: `https://meet.google.com/normi-${Math.random().toString(36).substring(2, 7)}`,
    });

    setTopic('');
    setDateTime('');
    setShowConsultModal(false);
  };

  // The steps a paper goes through, with the current one marked
  const getTimelineStages = (status: string) => {
    const stages = [
      { id: 1, label: 'Title sent', desc: 'The group sent their research title and summary.', state: 'upcoming' },
      { id: 2, label: 'Adviser assigned', desc: 'You were chosen as the adviser.', state: 'upcoming' },
      { id: 3, label: 'Chapters written', desc: 'The group writes and uploads their chapters.', state: 'upcoming' },
      { id: 4, label: 'You review the chapters', desc: 'You read the chapters and give feedback.', state: 'upcoming' },
      { id: 5, label: 'Group fixes the paper', desc: 'The group makes the changes you asked for.', state: 'upcoming' },
      { id: 6, label: 'Your approval', desc: 'You approve the paper so it can be scheduled for defense.', state: 'upcoming' },
      { id: 7, label: 'Defense', desc: 'The group presents to the panel.', state: 'upcoming' },
      { id: 8, label: 'Finished', desc: 'The final paper is saved in the Repository.', state: 'upcoming' },
    ];

    let activeStageIndex = 0;
    if (status === 'Submitted') activeStageIndex = 2;
    else if (status === 'Under Review') activeStageIndex = 3;
    else if (status === 'Revision Required') activeStageIndex = 4;
    else if (status === 'Approved by Adviser' || status === 'Pending Coordinator') activeStageIndex = 5;
    else if (status === 'Scheduled') activeStageIndex = 6;
    else if (status === 'Completed' || status === 'Archived') activeStageIndex = 7;

    stages.forEach((stage, idx) => {
      if (idx < activeStageIndex) stage.state = 'completed';
      else if (idx === activeStageIndex) stage.state = 'active';
      else stage.state = 'upcoming';
    });

    if (status === 'Completed' || status === 'Archived') stages[7].state = 'completed';

    return stages;
  };

  const selectedGroupLatestVersion = useMemo(() => {
    if (!selectedGroup) return null;
    return getLatestVersion(selectedGroup.id);
  }, [selectedGroup, versions]);

  const selectedGroupSchedule = useMemo(() => {
    if (!selectedGroup) return null;
    return schedules.find(s => s.researchId === selectedGroup.id) || null;
  }, [selectedGroup, schedules]);

  const selectedGroupDepartmentName = useMemo(() => {
    if (!selectedGroup) return '—';
    return departments.find(d => d.id === selectedGroup.departmentId)?.name ?? '—';
  }, [selectedGroup, departments]);

  const selectedGroupCourseName = useMemo(() => {
    if (!selectedGroup) return '—';
    return courses.find(c => c.id === selectedGroup.courseId)?.name ?? '—';
  }, [selectedGroup, courses]);

  // Real chapter results from the latest version (not sample text)
  const chapterRows: ChapterRow[] = useMemo(() => {
    if (!selectedGroupLatestVersion?.chapters) return [];
    return Object.entries(selectedGroupLatestVersion.chapters).map(([key, value]) => ({
      key,
      name: chapterNames[key] ?? key,
      status: (value?.status ?? 'Not Submitted') as ChapterRow['status'],
      feedback: value?.feedback,
    }));
  }, [selectedGroupLatestVersion]);

  const chapterColumns: Column<ChapterRow>[] = [
    { key: 'chapter', header: 'Chapter', primary: true, render: r => r.name },
    { key: 'status', header: 'Status', render: r => <StatusBadge info={chapterStatus[r.status] ?? chapterStatus['Not Submitted']} /> },
    { key: 'note', header: 'Your note', render: r => r.feedback || <span className="text-slate-500">No note yet</span> },
  ];

  const decisionGroup = pendingDecision ? assignedResearchList.find(r => r.id === pendingDecision.id) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Student Groups"
        subtitle="Read your students’ papers, give feedback, and approve them when they are ready."
        action={<Button icon={Calendar} onClick={() => setShowConsultModal(true)}>Schedule a Meeting</Button>}
      />

      {/* What should I do next? */}
      <section aria-labelledby="adviser-next">
        <Card className={cx(waitingForReview.length > 0 ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50')}>
          <p id="adviser-next" className="flex items-center gap-2 text-sm font-bold text-blue-900">
            <Compass className="h-5 w-5" aria-hidden="true" />
            What should I do next?
          </p>
          {waitingForReview.length === 0 ? (
            <div className="mt-2">
              <h2 className="text-xl font-bold text-slate-900">You are all caught up</h2>
              <p className="mt-1 text-base text-slate-700">No papers are waiting for your review right now. We will tell you when a group sends a new one.</p>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <h2 className="text-xl font-bold text-slate-900">
                {waitingForReview.length === 1 ? '1 paper is waiting for your review' : `${waitingForReview.length} papers are waiting for your review`}
              </h2>
              <ul className="divide-y divide-blue-100 rounded-xl border border-blue-100 bg-white">
                {waitingForReview.map(res => {
                  const latest = getLatestVersion(res.id);
                  return (
                    <li key={res.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900">{res.title}</p>
                        <p className="text-sm text-slate-600">
                          {getStudentNames(res.studentIds)}
                          {latest && ` · Version ${latest.versionNumber} sent ${formatDateTime(latest.submittedAt)}`}
                        </p>
                      </div>
                      <Button size="sm" icon={ArrowRight} onClick={() => onSelectResearch(res.id)} className="shrink-0">
                        Review This Paper
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>
      </section>

      {/* Numbers */}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Users, tone: 'text-blue-800', label: 'Student groups', value: stats.totalAssigned },
          { icon: Layers, tone: 'text-amber-700', label: 'Waiting for your review', value: stats.pendingReview },
          { icon: ShieldCheck, tone: 'text-emerald-700', label: 'Approved by you', value: stats.approvedPapers },
          { icon: AlertCircle, tone: 'text-rose-700', label: 'Waiting for students to fix', value: stats.revisionRequests },
        ].map(({ icon: Icon, tone, label, value }) => (
          <Card key={label} className="flex items-start gap-3 !p-4">
            <Icon className={cx('mt-0.5 h-6 w-6 shrink-0', tone)} aria-hidden="true" />
            <div>
              <dd className="text-2xl font-bold text-slate-900">{value}</dd>
              <dt className="text-sm text-slate-600">{label}</dt>
            </div>
          </Card>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: the groups and recent activity */}
        <div className="space-y-6 lg:col-span-4">
          <Card padded={false} as="section" aria-labelledby="groups-title">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h2 id="groups-title" className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Compass className="h-5 w-5 text-blue-800" aria-hidden="true" />
                My groups
              </h2>
              <Badge tone="neutral">{assignedResearchList.length}</Badge>
            </div>

            {assignedResearchList.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No groups yet"
                description="When a student group chooses you as their adviser, they will show here."
              />
            ) : (
              <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
                {assignedResearchList.map(res => {
                  const isSelected = selectedGroupId === res.id;
                  return (
                    <li key={res.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedGroupId(res.id)}
                        className={cx(
                          'flex w-full flex-col gap-2 border-l-4 p-4 text-left transition-colors cursor-pointer',
                          isSelected ? 'border-blue-800 bg-blue-50' : 'border-transparent hover:bg-slate-50',
                        )}
                      >
                        <span className="text-sm font-semibold text-slate-900 line-clamp-2">{res.title}</span>
                        <span className="text-sm text-slate-600 truncate">{getStudentNames(res.studentIds).split(',')[0]} (group leader)</span>
                        <ResearchStatusBadge status={res.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card as="section" aria-labelledby="activity-title">
            <CardHeader title="Recent activity" icon={<Bell className="h-5 w-5" aria-hidden="true" />} />
            {activityNotifications.length === 0 ? (
              <p className="text-sm text-slate-600">Nothing new yet. New uploads and defense dates will show here.</p>
            ) : (
              <ul className="max-h-64 space-y-3 overflow-y-auto">
                {activityNotifications.map(n => (
                  <li key={n.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      {n.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                        : n.type === 'warning' ? <MessageSquare className="h-4 w-4 text-amber-700" aria-hidden="true" />
                        : <FileText className="h-4 w-4 text-blue-800" aria-hidden="true" />}
                      {n.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-600">{n.date}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right: details of the chosen group */}
        <section className="lg:col-span-8" aria-label="Group details">
          {selectedGroup ? (
            <Card padded={false} className="overflow-hidden">
              <div className="space-y-3 border-b border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">{selectedGroup.title}</h2>
                  <ResearchStatusBadge status={selectedGroup.status} />
                </div>
                <p className="text-sm text-slate-700">
                  Course: <strong className="text-slate-900">{selectedGroupCourseName}</strong>
                  <span aria-hidden="true"> · </span>
                  Department: <strong className="text-slate-900">{selectedGroupDepartmentName}</strong>
                </p>
              </div>

              {/* Tabs */}
              <div role="tablist" aria-label="Group details" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3">
                {detailTabs.map(t => (
                  <button
                    key={t.id}
                    id={`tab-${t.id}`}
                    role="tab"
                    type="button"
                    aria-selected={detailTab === t.id}
                    aria-controls={`panel-${t.id}`}
                    onClick={() => setDetailTab(t.id)}
                    className={cx(
                      'whitespace-nowrap border-b-4 px-4 py-3 text-sm font-semibold cursor-pointer',
                      detailTab === t.id ? 'border-blue-800 text-blue-900' : 'border-transparent text-slate-600 hover:text-slate-900',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div role="tabpanel" id={`panel-${detailTab}`} aria-labelledby={`tab-${detailTab}`} className="p-5 sm:p-6">
                {/* Members */}
                {detailTab === 'info' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
                        <Users className="h-5 w-5 text-blue-800" aria-hidden="true" />
                        Students in this group
                      </h3>
                      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {getStudentObjects(selectedGroup.studentIds).map((student, idx) => (
                          <li key={student.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                            <img
                              src={student.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${student.name}`}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-slate-50"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{student.name}</p>
                              <p className="text-xs text-slate-600">{idx === 0 ? 'Group leader' : 'Group member'}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="mb-3 text-base font-bold text-slate-900">History</h3>
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                        <li className="flex justify-between gap-3 p-3">
                          <span className="text-slate-700">Research paper first sent</span>
                          <span className="text-slate-900">{formatDateLong(selectedGroup.createdAt)}</span>
                        </li>
                        <li className="flex justify-between gap-3 p-3">
                          <span className="text-slate-700">Last updated</span>
                          <span className="text-slate-900">{formatDateLong(selectedGroup.updatedAt)}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Latest paper */}
                {detailTab === 'versions' && (
                  selectedGroupLatestVersion ? (
                    <div className="space-y-5">
                      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 space-y-1">
                          <Badge tone="info" icon={FileText}>Version {selectedGroupLatestVersion.versionNumber}</Badge>
                          <p className="text-base font-semibold text-slate-900 break-words">{selectedGroupLatestVersion.fileName}</p>
                          <p className="text-sm text-slate-600">Sent {formatDateTime(selectedGroupLatestVersion.submittedAt)}</p>
                        </div>
                        <Button icon={MessageSquare} onClick={() => onSelectResearch(selectedGroup.id)} className="shrink-0">
                          Read and Comment
                        </Button>
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                        <h3 className="text-base font-bold text-slate-900">Your decision</h3>
                        <p className="text-sm text-slate-600">
                          Choose one when you have finished reading. The student will be notified.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          {selectedGroup.status !== 'Approved by Adviser' && (
                            <Button icon={ShieldCheck} onClick={() => setPendingDecision({ id: selectedGroup.id, approve: true })}>
                              Approve This Paper
                            </Button>
                          )}
                          {selectedGroup.status !== 'Revision Required' && (
                            <Button variant="secondary" icon={Wrench} onClick={() => setPendingDecision({ id: selectedGroup.id, approve: false })}>
                              Ask for Changes
                            </Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-3 text-base font-bold text-slate-900">Chapter by chapter</h3>
                        <Table
                          caption="Chapter results for the latest paper"
                          columns={chapterColumns}
                          rows={chapterRows}
                          rowKey={r => r.key}
                          empty={<p className="text-sm text-slate-600">No chapter results have been recorded for this paper yet.</p>}
                        />
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Inbox}
                      title="No paper uploaded yet"
                      description="This group has not uploaded a file. You will get a notification when they do."
                    />
                  )
                )}

                {/* Defense */}
                {detailTab === 'schedule' && (
                  selectedGroupSchedule ? (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                          <Clock className="h-5 w-5 text-blue-800" aria-hidden="true" />
                          Defense details
                        </h3>
                        <Badge tone="info">{defenseTypeLabels[selectedGroupSchedule.type]}</Badge>
                      </div>
                      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-600">Room</dt>
                          <dd className="font-semibold text-slate-900">{rooms.find(r => r.id === selectedGroupSchedule.roomId)?.name ?? 'Room not set'}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-600">Date and time</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatDateLong(selectedGroupSchedule.date)}, {formatTime(selectedGroupSchedule.startTime)} to {formatTime(selectedGroupSchedule.endTime)}
                          </dd>
                        </div>
                      </dl>
                      <div className="border-t border-slate-200 pt-3">
                        <p className="mb-2 text-sm font-bold text-slate-900">Panel members</p>
                        <ul className="space-y-1.5 text-sm text-slate-900">
                          {selectedGroupSchedule.panelistIds.map(pid => (
                            <li key={pid}>{users.find(u => u.id === pid)?.name ?? 'Panel Member'}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Calendar}
                      title="No defense date yet"
                      description="After you approve this paper, the coordinator will set a date, a room and a panel."
                    />
                  )
                )}

                {/* Progress */}
                {detailTab === 'timeline' && (
                  <div className="space-y-5">
                    <p className="text-sm text-slate-600">Where this group is on the way from their first idea to the Repository.</p>
                    <ol className="space-y-4">
                      {getTimelineStages(selectedGroup.status).map(stage => (
                        <li key={stage.id} className="flex items-start gap-3">
                          <span
                            className={cx(
                              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                              stage.state === 'completed' ? 'border-emerald-700 bg-emerald-700 text-white'
                                : stage.state === 'active' ? 'border-amber-500 bg-amber-100 text-amber-900'
                                : 'border-slate-300 bg-white text-slate-600',
                            )}
                            aria-hidden="true"
                          >
                            {stage.state === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : stage.id}
                          </span>
                          <div>
                            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                              {stage.label}
                              {stage.state === 'completed' && <Badge tone="success">Done</Badge>}
                              {stage.state === 'active' && <Badge tone="warning" icon={Clock}>Now</Badge>}
                            </p>
                            <p className="text-sm text-slate-600">{stage.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card padded={false}>
              <EmptyState
                icon={Compass}
                title="Choose a group"
                description="Select a group from the list to see their paper, defense and progress."
              />
            </Card>
          )}
        </section>
      </div>

      {/* Meeting pop-up */}
      <Modal
        open={showConsultModal}
        onClose={() => setShowConsultModal(false)}
        title="Schedule a meeting"
        description="Pick a student, a topic and a time. The meeting is confirmed right away."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConsultModal(false)}>Cancel</Button>
            <Button type="submit" form="consult-form">Confirm Meeting</Button>
          </>
        }
      >
        <form id="consult-form" onSubmit={handleConsultSubmit} className="space-y-5">
          <Select label="Student" required value={studentId} onChange={e => setStudentId(e.target.value)}>
            <option value="">Choose a student…</option>
            {users.filter(u => u.role === 'student').map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Input
            label="What will you talk about?"
            required
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Chapter 3 review"
          />
          <Input label="Date and time" type="datetime-local" required value={dateTime} onChange={e => setDateTime(e.target.value)} />
        </form>
      </Modal>

      {/* "Are you sure?" before approving or asking for changes */}
      <ConfirmDialog
        open={!!pendingDecision}
        onCancel={() => setPendingDecision(null)}
        onConfirm={() => {
          if (pendingDecision) onApproveManuscript(pendingDecision.id, pendingDecision.approve);
          setPendingDecision(null);
        }}
        title={pendingDecision?.approve ? 'Approve this paper?' : 'Ask the group for changes?'}
        message={
          pendingDecision?.approve
            ? `You are approving “${decisionGroup?.title ?? 'this paper'}”. The group will be told, and the coordinator can then schedule their defense.`
            : `You are asking the group to change “${decisionGroup?.title ?? 'this paper'}”. They will be told to fix it and upload a new version.`
        }
        confirmLabel={pendingDecision?.approve ? 'Yes, Approve Paper' : 'Yes, Ask for Changes'}
      />
    </div>
  );
}
