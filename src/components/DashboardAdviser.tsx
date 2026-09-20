import React, { useState, useMemo } from 'react';
import { 
  Users, CheckSquare, MessageSquare, Calendar, ShieldCheck, AlertCircle, 
  ChevronRight, FileText, Send, UserCheck, Play, Trash, Check, X, 
  Video, Clock, Bell, Info, Award, Compass, Layers, ListFilter, ArrowUpRight
} from 'lucide-react';
import { User, Research, ResearchVersion, ResearchComment, Consultation, Schedule } from '../types';

interface DashboardAdviserProps {
  user: User;
  researchList: Research[];
  versions: ResearchVersion[];
  comments: ResearchComment[];
  consultations: Consultation[];
  schedules?: Schedule[];
  users: User[];
  departments?: { id: string; name: string; code: string }[];
  courses?: { id: string; name: string; code: string }[];
  onSelectResearch: (id: string) => void;
  onApproveManuscript: (id: string, approve: boolean) => void;
  onAddConsultation: (cons: Consultation) => void;
  onApproveConsultation: (id: string) => void;
}

export default function DashboardAdviser({
  user, researchList, versions, comments, consultations, schedules = [], users,
  departments = [], courses = [], onSelectResearch, onApproveManuscript, onAddConsultation, onApproveConsultation
}: DashboardAdviserProps) {
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'versions' | 'schedule' | 'timeline'>('info');

  // Filter research assigned to this adviser
  const assignedResearchList = useMemo(() => {
    return researchList.filter(r => r.adviserId === user.id);
  }, [researchList, user.id]);

  const myConsultations = useMemo(() => {
    return consultations.filter(c => c.adviserId === user.id);
  }, [consultations, user.id]);

  // Statistics
  const stats = useMemo(() => {
    const totalAssigned = assignedResearchList.length;
    const pendingReview = assignedResearchList.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length;
    const approvedPapers = assignedResearchList.filter(r => r.status === 'Approved by Adviser' || r.status === 'Completed' || r.status === 'Archived' || r.status === 'Scheduled').length;
    const revisionRequests = assignedResearchList.filter(r => r.status === 'Revision Required').length;
    return { totalAssigned, pendingReview, approvedPapers, revisionRequests };
  }, [assignedResearchList]);

  // Generate simulated or calculated notifications activity related to adviser's groups
  const activityNotifications = useMemo(() => {
    const events: { id: string; title: string; message: string; date: string; type: 'success' | 'info' | 'warning' }[] = [];
    
    assignedResearchList.forEach((res, i) => {
      // Find latest version
      const groupVersions = versions.filter(v => v.researchId === res.id);
      if (groupVersions.length > 0) {
        const sorted = [...groupVersions].sort((a, b) => b.versionNumber - a.versionNumber);
        events.push({
          id: `notif-ver-${res.id}`,
          title: `New Manuscript Uploaded`,
          message: `Group "${res.title.substring(0, 32)}..." submitted Version ${sorted[0].versionNumber} for review.`,
          date: new Date(sorted[0].submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          type: 'info'
        });
      }

      // Check for scheduled defense
      const sched = schedules.find(s => s.researchId === res.id);
      if (sched) {
        events.push({
          id: `notif-sched-${res.id}`,
          title: `Oral Defense Scheduled`,
          message: `Oral presentation for "${res.title.substring(0, 32)}..." is locked for ${sched.date} at ${sched.roomId}.`,
          date: sched.date,
          type: 'success'
        });
      }

      // Check comments
      const groupComments = comments.filter(c => c.researchId === res.id);
      if (groupComments.length > 0) {
        events.push({
          id: `notif-comm-${res.id}`,
          title: `Activity in Comments`,
          message: `There are ${groupComments.length} active discussion markers on chapter manuscripts.`,
          date: `Recent`,
          type: 'warning'
        });
      }
    });

    if (events.length === 0) {
      events.push({
        id: 'default-notif',
        title: 'System Handshake Complete',
        message: 'No new manuscript uploads or review requests in the queue.',
        date: 'Just now',
        type: 'success'
      });
    }

    return events.slice(0, 5);
  }, [assignedResearchList, versions, schedules, comments]);

  // Set first group as selected by default if nothing is selected
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
      return u ? u.name : 'Unknown Student';
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
      meetLink: `https://meet.google.com/normi-${Math.random().toString(36).substring(2, 7)}`
    });

    setTopic('');
    setDateTime('');
    setShowConsultModal(false);
  };

  // Helper to resolve Timeline Stages and color indications
  const getTimelineStages = (status: string) => {
    const stages = [
      { id: 1, label: 'Title Proposal', desc: 'Abstract submitted & approved', state: 'upcoming' },
      { id: 2, label: 'Adviser Assigned', desc: 'Faculty mentor assigned', state: 'upcoming' },
      { id: 3, label: 'Proposal Drafting', desc: 'Initial chapters under review', state: 'upcoming' },
      { id: 4, label: 'Proposal Defense', desc: 'Panel evaluation & scheduling', state: 'upcoming' },
      { id: 5, label: 'Development & Revisions', desc: 'Manuscript corrections & coding', state: 'upcoming' },
      { id: 6, label: 'Final Adviser Vetting', desc: 'Ready for final panel clearance', state: 'upcoming' },
      { id: 7, label: 'Oral Defense', desc: 'Final project defense presentation', state: 'upcoming' },
      { id: 8, label: 'Vetted & Completed', desc: 'Archived in Institutional Repository', state: 'upcoming' }
    ];

    // Status map indexes:
    let activeStageIndex = 0;
    if (status === 'Submitted') {
      activeStageIndex = 2; // Proposal Drafting
    } else if (status === 'Under Review') {
      activeStageIndex = 3; // Proposal Defense
    } else if (status === 'Revision Required') {
      activeStageIndex = 4; // Dev & Revision
    } else if (status === 'Approved by Adviser' || status === 'Pending Coordinator') {
      activeStageIndex = 5; // Vetting
    } else if (status === 'Scheduled') {
      activeStageIndex = 6; // Oral Defense
    } else if (status === 'Completed' || status === 'Archived') {
      activeStageIndex = 7; // Completed
    }

    stages.forEach((stage, idx) => {
      if (idx < activeStageIndex) {
        stage.state = 'completed'; // Green
      } else if (idx === activeStageIndex) {
        stage.state = 'active';    // Yellow
      } else {
        stage.state = 'upcoming';  // Gray
      }
    });

    if (status === 'Completed' || status === 'Archived') {
      stages[7].state = 'completed';
    }

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
    if (!selectedGroup) return 'General Department';
    const dept = departments.find(d => d.id === selectedGroup.departmentId);
    return dept ? dept.name : 'College of Information Technology';
  }, [selectedGroup, departments]);

  const selectedGroupCourseName = useMemo(() => {
    if (!selectedGroup) return '';
    const crs = courses.find(c => c.id === selectedGroup.courseId);
    return crs ? crs.name : 'BSIT';
  }, [selectedGroup, courses]);

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Panel */}
      <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-xs   font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-150">
            Assigned Adviser Hub
          </span>
          <h2 className="text-xl font-bold text-slate-800 font-serif leading-none mt-2">
            Adviser Consultation & Vetting Terminal
          </h2>
          <p className="text-xs text-slate-500">
            Examine thesis chapters, write digital feedback cards, track milestones, and approve capstone submissions for the current term.
          </p>
        </div>

        <button
          onClick={() => setShowConsultModal(true)}
          className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors shrink-0"
        >
          <Calendar className="h-4 w-4" />
          Schedule Consultation Slot
        </button>
      </div>

      {/* Advising Statistics Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-800 rounded-lg shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Assigned Teams</span>
            <span className="text-sm font-extrabold text-slate-800">{stats.totalAssigned} Groups</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Pending Reviews</span>
            <span className="text-sm font-extrabold text-slate-800">{stats.pendingReview} Drafts</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Approved Papers</span>
            <span className="text-sm font-extrabold text-slate-800">{stats.approvedPapers} Approved</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-50 text-rose-800 rounded-lg shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Revisions Required</span>
            <span className="text-sm font-extrabold text-slate-800">{stats.revisionRequests} Pending Re-submit</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Assigned Research Groups List Selector */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-150 px-4 py-3 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700  tracking-normal flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-blue-700" />
                Active Advising Portfolio
              </h3>
              <span className="text-xs bg-slate-200 px-1.5 rounded  font-bold">
                {assignedResearchList.length}
              </span>
            </div>

            <div className="divide-y divide-slate-150 max-h-[480px] overflow-y-auto">
              {assignedResearchList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No research groups are currently assigned under your mentorship.
                </div>
              ) : (
                assignedResearchList.map(res => {
                  const isSelected = selectedGroupId === res.id;
                  return (
                    <div 
                      key={res.id} 
                      onClick={() => setSelectedGroupId(res.id)}
                      className={`p-4 transition-all cursor-pointer border-l-4 text-left ${
                        isSelected 
                          ? 'bg-blue-50/50 border-blue-800 shadow-sm' 
                          : 'border-transparent hover:bg-slate-50/40'
                      }`}
                    >
                      <span className="text-xs  font-bold text-slate-500 ">
                        {res.id.toUpperCase()}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug mt-0.5">
                        {res.title}
                      </h4>
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="text-xs text-slate-450 truncate max-w-[120px] font-medium">
                          {getStudentNames(res.studentIds).split(',')[0]} (Lead)
                        </span>
                        <span className={`text-xs  font-bold px-2 py-0.5 rounded border  ${
                          res.status === 'Approved by Adviser' ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : res.status === 'Revision Required' ? 'bg-rose-50 text-rose-800 border-rose-100'
                            : 'bg-blue-50 text-blue-800 border-blue-100'
                        }`}>
                          {res.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Alerts Widget */}
          <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800  tracking-normal border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-amber-600 shrink-0" />
              Assigned Activity Logs
            </h3>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {activityNotifications.map((notif) => (
                <div key={notif.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 flex items-start gap-2 text-xs">
                  <div className={`p-1 rounded mt-0.5 ${
                    notif.type === 'success' ? 'bg-emerald-100 text-emerald-700'
                      : notif.type === 'warning' ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    <Info className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs truncate">{notif.title}</span>
                      <span className="text-xs text-slate-500  font-semibold">{notif.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Deep Inspector Tabs for Selected Group */}
        <section className="lg:col-span-8 space-y-4">
          {selectedGroup ? (
            <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden flex flex-col min-h-[580px]">
              
              {/* Profile Card Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-xs  font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded border border-blue-150 ">
                      Active Mentored Capstone
                    </span>
                    <h3 className="text-base font-bold text-slate-850 leading-snug">
                      {selectedGroup.title}
                    </h3>
                  </div>

                  <span className={`text-xs  font-bold px-3 py-1 rounded border  shrink-0 ${
                    selectedGroup.status === 'Approved by Adviser' ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                      : selectedGroup.status === 'Revision Required' ? 'bg-rose-50 text-rose-800 border-rose-100'
                      : 'bg-blue-50 text-blue-800 border-blue-100'
                  }`}>
                    {selectedGroup.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium pt-1">
                  <span>Course: <strong className="text-slate-800 font-semibold">{selectedGroupCourseName}</strong></span>
                  <span>•</span>
                  <span>College: <strong className="text-slate-800 font-semibold">{selectedGroupDepartmentName}</strong></span>
                  <span>•</span>
                  <span>A.Y. 2025-2026</span>
                </div>
              </div>

              {/* Organized Sub-tabs Navigation */}
              <div className="bg-white border-b border-slate-150 px-4 flex gap-4 text-xs font-bold text-slate-500">
                <button
                  onClick={() => setDetailTab('info')}
                  className={`py-2.5 border-b-2 cursor-pointer transition-colors ${
                    detailTab === 'info' ? 'border-blue-800 text-slate-850' : 'border-transparent hover:text-slate-700'
                  }`}
                >
                  Group Personnel
                </button>
                <button
                  onClick={() => setDetailTab('versions')}
                  className={`py-2.5 border-b-2 cursor-pointer transition-colors ${
                    detailTab === 'versions' ? 'border-b-2 border-blue-800 text-slate-850' : 'border-transparent hover:text-slate-700'
                  }`}
                >
                  Latest Version & Review
                </button>
                <button
                  onClick={() => setDetailTab('schedule')}
                  className={`py-2.5 border-b-2 cursor-pointer transition-colors ${
                    detailTab === 'schedule' ? 'border-b-2 border-blue-800 text-slate-850' : 'border-transparent hover:text-slate-700'
                  }`}
                >
                  Defense Schedule
                </button>
                <button
                  onClick={() => setDetailTab('timeline')}
                  className={`py-2.5 border-b-2 cursor-pointer transition-colors ${
                    detailTab === 'timeline' ? 'border-b-2 border-blue-800 text-slate-850' : 'border-transparent hover:text-slate-700'
                  }`}
                >
                  Research Progress Timeline
                </button>
              </div>

              {/* Tab Content Panels */}
              <div className="p-6 flex-1 bg-white">
                
                {/* A. PERSONNEL TAB */}
                {detailTab === 'info' && (
                  <div className="space-y-5 animate-in fade-in duration-100">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800  tracking-normal flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-700" />
                        Student Researchers Team
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {getStudentObjects(selectedGroup.studentIds).map((student, idx) => (
                          <div key={student.id} className="p-3 bg-white rounded-lg border border-slate-150 flex items-center gap-2.5">
                            <img
                              src={student.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${student.name}`}
                              alt={student.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-full border bg-slate-50 shrink-0"
                            />
                            <div className="truncate">
                              <span className="font-extrabold text-slate-800 text-xs block leading-snug">{student.name}</span>
                              <span className="text-xs text-slate-500 font-medium ">{idx === 0 ? 'Team Leader' : 'Co-Researcher'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-650">
                      <h4 className="font-bold text-slate-800  tracking-normal text-xs">Academic Context</h4>
                      <div className="grid grid-cols-2 gap-3 text-slate-550 pt-1 font-medium">
                        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-150">
                          <span className="text-xs  font-bold text-slate-500  block mb-0.5">Assigned Faculty Mentor</span>
                          <span className="text-slate-800 font-bold">{user.name}</span>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-150">
                          <span className="text-xs  font-bold text-slate-500  block mb-0.5">School Year Term</span>
                          <span className="text-slate-800 font-bold">2025 - 2026 Normal Enrollment</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                      <h4 className="text-xs font-bold text-slate-800  tracking-normal">Historical System Log</h4>
                      <p className="text-xs text-slate-500">Recorded action sequences regarding this capstone group:</p>
                      <div className="space-y-1.5 pt-1.5  text-xs text-slate-500">
                        <div className="flex justify-between border-b border-dashed pb-1 border-slate-200">
                          <span>[INFO] Title Proposal vetted</span>
                          <span>{selectedGroup.createdAt ? new Date(selectedGroup.createdAt).toLocaleDateString() : '07/04/2026'}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed pb-1 border-slate-200">
                          <span>[INFO] Adviser assigned matching department scope</span>
                          <span>{selectedGroup.createdAt ? new Date(selectedGroup.createdAt).toLocaleDateString() : '07/04/2026'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>[STATUS] Currently categorized: <strong className="text-blue-800 font-bold">{selectedGroup.status}</strong></span>
                          <span>{selectedGroup.updatedAt ? new Date(selectedGroup.updatedAt).toLocaleDateString() : 'Recent'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* B. LATEST VERSION TAB */}
                {detailTab === 'versions' && (
                  <div className="space-y-5 animate-in fade-in duration-100">
                    {selectedGroupLatestVersion ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-blue-800   bg-blue-100 border border-blue-150 px-2 py-0.25 rounded">
                              V{selectedGroupLatestVersion.versionNumber} Manuscript
                            </span>
                            <h4 className="text-xs font-bold text-slate-800">{selectedGroupLatestVersion.fileName}</h4>
                            <p className="text-xs text-slate-500 ">Uploaded: {new Date(selectedGroupLatestVersion.submittedAt).toLocaleString()}</p>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => onSelectResearch(selectedGroup.id)}
                              className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Interactive Vetting Reader
                            </button>
                          </div>
                        </div>

                        {/* Interactive fast action buttons */}
                        <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-150 space-y-3 text-xs">
                          <h4 className="font-bold text-slate-800  tracking-normal">Fast Manuscript Action Vetting</h4>
                          <p className="text-slate-450 text-xs">Directly adjust manuscript pipeline status coordinates from here or load the detailed reader panel above.</p>
                          
                          <div className="flex gap-2 pt-1">
                            {selectedGroup.status !== 'Approved by Adviser' && (
                              <button
                                onClick={() => onApproveManuscript(selectedGroup.id, true)}
                                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-800/10 cursor-pointer"
                              >
                                <ShieldCheck className="h-4 w-4" /> Approve Final Draft
                              </button>
                            )}
                            {selectedGroup.status !== 'Revision Required' && (
                              <button
                                onClick={() => onApproveManuscript(selectedGroup.id, false)}
                                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-rose-700/10 cursor-pointer"
                              >
                                <AlertCircle className="h-4 w-4" /> Request Major Revisions
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Chapters Check summary */}
                        <div className="border border-slate-150 rounded-xl overflow-hidden">
                          <table className="w-full text-xs text-left text-slate-650 border-collapse">
                            <thead className="bg-slate-50 text-xs  font-bold tracking-normal  border-b">
                              <tr>
                                <th className="p-2.5">Chapter</th>
                                <th className="p-2.5">Status Badge</th>
                                <th className="p-2.5">Commentary Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              <tr>
                                <td className="p-2.5">Chapter 1: Problem Definition</td>
                                <td className="p-2.5">
                                  <span className="text-xs bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded   font-bold">Approved</span>
                                </td>
                                <td className="p-2.5 text-slate-450 italic">Excellent literature support and introduction definitions.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5">Chapter 2: Literature Review</td>
                                <td className="p-2.5">
                                  <span className="text-xs bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded   font-bold">Approved</span>
                                </td>
                                <td className="p-2.5 text-slate-450 italic">References verified and compiled appropriately.</td>
                              </tr>
                              <tr>
                                <td className="p-2.5">Chapter 3: System Methodology</td>
                                <td className="p-2.5">
                                  <span className={`text-xs px-1.5 py-0.5 rounded   font-bold ${selectedGroup.status === 'Revision Required' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                                    {selectedGroup.status === 'Revision Required' ? 'Revision Required' : 'Approved'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-450 italic">
                                  {selectedGroup.status === 'Revision Required' ? 'Methodology needs database layout specifications.' : 'Database design finalized.'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        No draft manuscripts have been uploaded for review yet.
                      </div>
                    )}
                  </div>
                )}

                {/* C. SCHEDULE TAB */}
                {detailTab === 'schedule' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    {selectedGroupSchedule ? (
                      <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                          <h4 className="text-xs font-bold text-slate-800  tracking-normal flex items-center gap-1.5">
                            <Clock className="h-4.5 w-4.5 text-blue-700" />
                            Official Defense Booking Details
                          </h4>
                          <span className="text-xs  font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                            {selectedGroupSchedule.type.toUpperCase()} DEFENSE
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-650">
                          <div className="space-y-0.5">
                            <span className="text-xs  font-bold text-slate-500 ">Assigned Venue Room</span>
                            <p className="text-slate-850 font-bold">{selectedGroupSchedule.roomId}</p>
                          </div>
                          
                          <div className="space-y-0.5">
                            <span className="text-xs  font-bold text-slate-500 ">Date and Coordinates</span>
                            <p className="text-slate-850 font-bold">
                              {selectedGroupSchedule.date} ({selectedGroupSchedule.startTime} - {selectedGroupSchedule.endTime})
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                          <span className="text-xs  font-bold text-slate-500  block">Jury panel committee</span>
                          <div className="flex flex-col gap-1.5">
                            {selectedGroupSchedule.panelistIds.map((pid, idx) => {
                              const panObj = users.find(u => u.id === pid);
                              return (
                                <div key={pid} className="flex items-center gap-2 text-xs">
                                  <span className="font-bold bg-slate-200 text-slate-600 w-5 h-5 rounded-full flex items-center justify-center  text-xs">
                                    P{idx + 1}
                                  </span>
                                  <span className="text-slate-800 font-bold">{panObj ? panObj.name : 'Vetting Committee Member'}</span>
                                  <span className="text-xs text-slate-500  ">Panelist</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 border border-slate-150 rounded-xl text-slate-500 text-xs">
                        No active panel defense slot is currently booked or approved for this capstone group.
                      </div>
                    )}
                  </div>
                )}

                {/* D. TIMELINE TAB */}
                {detailTab === 'timeline' && (
                  <div className="space-y-6 animate-in fade-in duration-100">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800  tracking-normal flex items-center gap-1">
                        <Award className="h-4.5 w-4.5 text-blue-700 animate-pulse" />
                        Visual Research Journey Milestone Chart
                      </h4>
                      <p className="text-xs text-slate-450 leading-relaxed">Status parameters reflect actual system pipeline progress from title definition to publication archiving.</p>
                    </div>

                    <div className="relative border-l-2 border-slate-150 pl-6 ml-3 space-y-6 py-2.5">
                      {getTimelineStages(selectedGroup.status).map(stage => {
                        const isCompleted = stage.state === 'completed';
                        const isActive = stage.state === 'active';
                        return (
                          <div key={stage.id} className="relative">
                            
                            {/* Dot indicator */}
                            <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              isCompleted 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                : isActive 
                                  ? 'bg-amber-400 border-amber-400 text-slate-850 animate-pulse'
                                  : 'bg-white border-slate-300'
                            }`}>
                              {isCompleted && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              {isActive && <div className="w-1.5 h-1.5 bg-slate-850 rounded-full" />}
                            </span>

                            <div className="space-y-0.5 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold  tracking-normal text-xs ${
                                  isCompleted ? 'text-emerald-800' : isActive ? 'text-amber-800' : 'text-slate-500'
                                }`}>
                                  Stage {stage.id}: {stage.label}
                                </span>
                                {isActive && (
                                  <span className="text-xs bg-amber-50 text-amber-700  font-extrabold border border-amber-200 px-1.5 rounded ">
                                    Current Active Target
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-500 text-xs">{stage.desc}</p>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-150 p-12 text-center text-slate-500 text-xs shadow-sm">
              Please select a research group from your advising portfolio portfolio on the left sidebar to inspect details.
            </div>
          )}
        </section>

      </div>

      {/* CONSULTATION SCHEDULER MODAL */}
      {showConsultModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleConsultSubmit} 
            className="bg-white rounded-xl border border-slate-150 w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-serif">
                <Calendar className="h-4.5 w-4.5 text-blue-700" />
                Schedule Consultation Slot
              </h3>
              <button 
                type="button" 
                onClick={() => setShowConsultModal(false)}
                className="text-slate-440 hover:text-slate-640 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500  block mb-1">Target Student Group</label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a Group Team...</option>
                  {users.filter(u => u.role === 'student').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500  block mb-1">Topic Coordinates</label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Chapter 3 database normalization review"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500  block mb-1">Date & Hour Slots</label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => setShowConsultModal(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Confirm Slot
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
