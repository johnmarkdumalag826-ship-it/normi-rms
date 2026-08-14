import React, { useState, useEffect } from 'react';
import {
  User, Research, ResearchVersion, ResearchComment, Announcement,
  SystemNotification, Consultation, Schedule, Evaluation, AuditLog, UserRole, ProposalFile,
  Department, Course, SchoolYear, Room, PanelAvailability, ResearchStatus,
} from './types';
import { ShieldAlert } from 'lucide-react';

import { fetchCurrentUser, logout as logoutRequest } from './api/auth';
import { ApiError } from './api/client';
import { listDirectory, createUser, updateUser as apiUpdateUser, deleteUser as apiDeleteUser } from './api/users';
import { listDepartments, listCourses, listSchoolYears, listRooms } from './api/lookups';
import {
  listResearch, createResearch, createArchivedResearch, updateResearch as apiUpdateResearch, deleteResearch,
  approveManuscript as apiApproveManuscript, updateResearchStatus as apiUpdateResearchStatus,
  updateResearchAdviser as apiUpdateResearchAdviser, incrementResearchCounts, updateProposalFiles as apiUpdateProposalFiles,
  listAllVersions, listVersionsForResearch, addVersion, updateChapterStatus as apiUpdateChapterStatus,
  listAllComments, listCommentsForResearch, createComment as apiCreateComment,
} from './api/research';
import { listNotifications, markAllNotificationsRead } from './api/notifications';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from './api/announcements';
import { listConsultations, createConsultation, approveConsultation } from './api/consultations';
import { listPanelAvailability } from './api/panelAvailability';
import {
  listSchedules, createSchedule, updateSchedule as apiUpdateSchedule,
  cancelSchedule as apiCancelSchedule, deleteSchedule as apiDeleteSchedule, clearDraftSchedules,
} from './api/schedules';
import { listEvaluations, createEvaluation } from './api/evaluations';
import { listAuditLogs, backupDatabase, restoreDatabase } from './api/auditLogs';

// Importing Modular sub-components
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import InteractiveERD from './components/InteractiveERD';
import RepositoryView from './components/RepositoryView';
import SchedulerCalendar from './components/SchedulerCalendar';
import DefenseSchedulesList from './components/DefenseSchedulesList';
import AutomatedScheduler from './components/AutomatedScheduler';
import ResearchDetailsView from './components/ResearchDetailsView';
import DocumentReview from './components/DocumentReview';

// Role Dashboards
import DashboardStudent from './components/DashboardStudent';
import DashboardAdviser from './components/DashboardAdviser';
import DashboardCoordinator from './components/DashboardCoordinator';
import DashboardPanelist from './components/DashboardPanelist';
import DashboardAdmin from './components/DashboardAdmin';
import ResearchInformationForm from './components/ResearchInformationForm';

export default function App() {
  // Session authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showPortal, setShowPortal] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'ready'>('checking');
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Database state — all real, fetched from the backend post-login (see the bulk-load
  // effect below). Nothing here is seeded from mock data or persisted to localStorage.
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [researchList, setResearchList] = useState<Research[]>([]);
  const [versions, setVersions] = useState<ResearchVersion[]>([]);
  const [comments, setComments] = useState<ResearchComment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [panelAvailabilities, setPanelAvailabilities] = useState<PanelAvailability[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Navigation tracking
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedResearchId, setSelectedResearchId] = useState<string | null>(null);

  // Toast / Status Alerts
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleApiError = (err: unknown, fallback: string) => {
    triggerAlert(err instanceof ApiError ? err.message : fallback, 'error');
  };

  // Public announcements are visible pre-login (LandingPage shows them), so fetch them
  // once on mount regardless of auth state.
  useEffect(() => {
    listAnnouncements().then(setAnnouncements).catch(() => {});
  }, []);

  // Silently re-authenticate from a stored JWT (real backend session) before rendering
  // anything, so a page reload doesn't bounce an already-logged-in user back to Login.
  useEffect(() => {
    (async () => {
      const restoredUser = await fetchCurrentUser();
      if (restoredUser) {
        setCurrentUser(restoredUser);
        setShowPortal(true);
      }
      setAuthStatus('ready');
    })();
  }, []);

  // Once authenticated, load every collection the app needs in one pass. Re-fires
  // whenever the logged-in identity changes (login, logout, or role emulation).
  useEffect(() => {
    if (!currentUser) {
      setUsers([]); setDepartments([]); setCourses([]); setSchoolYears([]); setRooms([]);
      setResearchList([]); setVersions([]); setComments([]);
      setNotifications([]); setConsultations([]); setPanelAvailabilities([]);
      setSchedules([]); setEvaluations([]); setAuditLogs([]);
      return;
    }

    let cancelled = false;
    setIsDataLoading(true);

    (async () => {
      try {
        const [
          directoryUsers, depts, crs, years, roomList,
          research, allVersions, allComments, notifs,
          consultList, availList, schedList, evalList,
        ] = await Promise.all([
          listDirectory(), listDepartments(), listCourses(), listSchoolYears(), listRooms(),
          listResearch(), listAllVersions(), listAllComments(), listNotifications(),
          listConsultations(), listPanelAvailability(), listSchedules(), listEvaluations(),
        ]);
        if (cancelled) return;

        setUsers(directoryUsers.some(u => u.id === currentUser.id) ? directoryUsers : [...directoryUsers, currentUser]);
        setDepartments(depts);
        setCourses(crs);
        setSchoolYears(years);
        setRooms(roomList);
        setResearchList(research);
        setVersions(allVersions);
        setComments(allComments);
        setNotifications(notifs);
        setConsultations(consultList);
        setPanelAvailabilities(availList);
        setSchedules(schedList);
        setEvaluations(evalList);

        if (currentUser.role === 'admin') {
          const logs = await listAuditLogs();
          if (!cancelled) setAuditLogs(logs);
        }
      } catch (err) {
        if (!cancelled) handleApiError(err, 'Failed to load application data. Please refresh.');
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Auth Operations
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setShowPortal(true);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    logoutRequest();
    setCurrentUser(null);
    setShowPortal(false);
    setActiveTab('dashboard');
    setSelectedResearchId(null);
  };

  // Client-side-only convenience for demos: switches which role's dashboard is shown
  // without a new login. Any write action taken while emulating is still authorized
  // under the REAL logged-in identity's JWT — the backend's RBAC is the actual gate,
  // so an emulated role attempting something it can't do will simply get a 403.
  const handleEmulateRole = (role: UserRole) => {
    const u = users.find(x => x.role === role && x.status === 'active');
    if (u) {
      setCurrentUser(u);
      setActiveTab('dashboard');
      setSelectedResearchId(null);
      triggerAlert(`Emulated role switched to: ${u.name}`);
    }
  };

  // Notifications
  const handleMarkNotificationsAsRead = async () => {
    if (!currentUser) return;
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n));
    } catch (err) {
      handleApiError(err, 'Could not mark notifications as read.');
    }
  };

  // Announcements
  const handleAddAnnouncement = async (ann: Announcement) => {
    try {
      const created = await createAnnouncement({ title: ann.title, content: ann.content, category: ann.category, isPinned: ann.isPinned });
      setAnnouncements(prev => [created, ...prev]);
      triggerAlert("Announcement published successfully!");
    } catch (err) {
      handleApiError(err, 'Could not publish announcement.');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      triggerAlert("Announcement deleted.");
    } catch (err) {
      handleApiError(err, 'Could not delete announcement.');
    }
  };

  // Research Management Details (Coordinator / Adviser)
  const handleApproveManuscript = async (
    id: string,
    approveOrDecision: boolean | 'Approve' | 'Revision' | 'Reject',
    feedbackNote?: string
  ) => {
    try {
      const updated = await apiApproveManuscript(id, approveOrDecision, feedbackNote);
      setResearchList(prev => prev.map(r => r.id === id ? updated : r));
      if (feedbackNote) {
        const researchComments = await listCommentsForResearch(id);
        setComments(prev => [...researchComments, ...prev.filter(c => c.researchId !== id)]);
      }
      const isApproved = approveOrDecision === true || approveOrDecision === 'Approve';
      triggerAlert(isApproved ? "Draft approved successfully!" : "Revisions requested.");
    } catch (err) {
      handleApiError(err, 'Could not update manuscript status.');
    }
  };

  // Chapter statuses (Adviser Panel)
  const handleUpdateChapterStatus = async (
    researchId: string, versionId: string, chapter: string,
    status: 'Approved' | 'Revision Required' | 'Pending', feedback: string
  ) => {
    try {
      const updatedVersion = await apiUpdateChapterStatus(versionId, chapter, status, feedback);
      setVersions(prev => prev.map(v => v.id === versionId ? updatedVersion : v));
      if (status === 'Revision Required') {
        setResearchList(prev => prev.map(r => r.id === researchId ? { ...r, status: 'Revision Required' } : r));
        const researchComments = await listCommentsForResearch(researchId);
        setComments(prev => [...researchComments, ...prev.filter(c => c.researchId !== researchId)]);
      }
      triggerAlert(`Chapter status updated to ${status}.`);
    } catch (err) {
      handleApiError(err, 'Could not update chapter status.');
    }
  };

  // Student upload revision
  const handleStudentUploadRevision = async (
    researchId: string,
    title: string,
    abstract: string,
    fileName: string,
    fileUrl: string,
    type: 'adviser_check' | 'defense_manuscript' = 'adviser_check'
  ) => {
    try {
      const newVersion = await addVersion(researchId, { title, abstract, fileName, fileUrl, type });
      setVersions(prev => [newVersion, ...prev]);
      setResearchList(prev => prev.map(r => r.id === researchId ? {
        ...r, title, abstract, status: type === 'adviser_check' ? 'Submitted' : r.status,
      } : r));
      triggerAlert(type === 'defense_manuscript'
        ? "Defense manuscript submitted to panel feed successfully!"
        : "Draft proposal submitted to adviser checking feed!");
    } catch (err) {
      handleApiError(err, 'Could not submit revision.');
    }
  };

  // Repository view increments
  const handleIncrementRepositoryCounts = async (id: string, type: 'view' | 'download') => {
    try {
      const updated = await incrementResearchCounts(id, type);
      setResearchList(prev => prev.map(r => r.id === id ? updated : r));
    } catch {
      // A failed view/download counter bump shouldn't interrupt the user with an alert.
    }
  };

  // Comments (ResearchDetailsView, DocumentReview)
  const handleAddComment = async (c: ResearchComment) => {
    try {
      const created = await apiCreateComment(c.researchId, { versionId: c.versionId, chapter: c.chapter, text: c.text });
      setComments(prev => [created, ...prev]);
    } catch (err) {
      handleApiError(err, 'Could not post comment.');
    }
  };

  // Interactive scheduler schedules
  const handleAddSchedule = async (sched: Schedule) => {
    try {
      const created = await createSchedule({
        researchId: sched.researchId, date: sched.date, startTime: sched.startTime,
        endTime: sched.endTime, roomId: sched.roomId, panelistIds: sched.panelistIds, type: sched.type,
      });
      setSchedules(prev => [created, ...prev]);
      setResearchList(prev => prev.map(r => r.id === created.researchId ? { ...r, status: 'Scheduled' } : r));
      triggerAlert("Schedule slot registered!");
    } catch (err) {
      handleApiError(err, 'Could not register schedule.');
    }
  };

  const handleUpdateSchedule = async (updated: Schedule) => {
    try {
      const { id, ...patch } = updated;
      const saved = await apiUpdateSchedule(id, patch);
      setSchedules(prev => prev.map(s => s.id === saved.id ? saved : s));
      triggerAlert("Defense schedule updated successfully!");
    } catch (err) {
      handleApiError(err, 'Could not update schedule.');
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      const updated = await apiCancelSchedule(scheduleId);
      setSchedules(prev => prev.map(s => s.id === scheduleId ? updated : s));
      setResearchList(prev => prev.map(r => r.id === updated.researchId ? { ...r, status: 'Approved by Adviser' } : r));
      triggerAlert("Defense schedule cancelled.", "error");
    } catch (err) {
      handleApiError(err, 'Could not cancel schedule.');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const schedObj = schedules.find(s => s.id === scheduleId);
      await apiDeleteSchedule(scheduleId);
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      if (schedObj) {
        setResearchList(prev => prev.map(r => r.id === schedObj.researchId ? { ...r, status: 'Approved by Adviser' } : r));
      }
      triggerAlert("Defense schedule deleted.");
    } catch (err) {
      handleApiError(err, 'Could not delete schedule.');
    }
  };

  const handleUpdateResearchAdviser = async (researchId: string, adviserId: string) => {
    try {
      const updated = await apiUpdateResearchAdviser(researchId, adviserId);
      setResearchList(prev => prev.map(r => r.id === researchId ? updated : r));
    } catch (err) {
      handleApiError(err, 'Could not reassign adviser.');
    }
  };

  const handleClearSchedules = async () => {
    try {
      await clearDraftSchedules();
      const [freshSchedules, freshResearch] = await Promise.all([listSchedules(), listResearch()]);
      setSchedules(freshSchedules);
      setResearchList(freshResearch);
      triggerAlert("Draft calendars cleared.");
    } catch (err) {
      handleApiError(err, 'Could not clear schedules.');
    }
  };

  // Evaluator sheets
  const handleAddEvaluation = async (evalObj: Evaluation) => {
    try {
      const created = await createEvaluation({
        scheduleId: evalObj.scheduleId, score1: evalObj.score1, score2: evalObj.score2,
        score3: evalObj.score3, score4: evalObj.score4, comment: evalObj.comment, recommendation: evalObj.recommendation,
      });
      setEvaluations(prev => [created, ...prev]);
      setSchedules(prev => prev.map(s => s.id === evalObj.scheduleId ? { ...s, status: 'completed' } : s));
      const sched = schedules.find(s => s.id === evalObj.scheduleId);
      if (sched) {
        setResearchList(prev => prev.map(r => r.id === sched.researchId ? {
          ...r, status: created.recommendation === 'Passed' ? 'Completed' : 'Revision Required',
        } : r));
      }
      triggerAlert("Jury evaluation submitted!");
    } catch (err) {
      handleApiError(err, 'Could not submit evaluation.');
    }
  };

  // Consultations
  const handleAddConsultation = async (cons: Consultation) => {
    try {
      const created = await createConsultation({
        adviserId: cons.adviserId, studentId: cons.studentId, dateTime: cons.dateTime, topic: cons.topic,
      });
      setConsultations(prev => [created, ...prev]);
      triggerAlert("Consultation slot registered.");
    } catch (err) {
      handleApiError(err, 'Could not register consultation.');
    }
  };

  const handleApproveConsultation = async (id: string) => {
    try {
      const updated = await approveConsultation(id);
      setConsultations(prev => prev.map(c => c.id === id ? updated : c));
      triggerAlert("Consultation slot approved!");
    } catch (err) {
      handleApiError(err, 'Could not approve consultation.');
    }
  };

  // Admin user directory
  const handleToggleUserStatus = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    try {
      const nextStatus = target.status === 'active' ? 'suspended' : 'active';
      const updated = await apiUpdateUser(id, { status: nextStatus });
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      triggerAlert("User status updated.");
    } catch (err) {
      handleApiError(err, 'Could not update user status.');
    }
  };

  const handleUpdateUserRole = async (id: string, role: UserRole) => {
    try {
      const updated = await apiUpdateUser(id, { role });
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      triggerAlert("User permission updated.");
    } catch (err) {
      handleApiError(err, 'Could not update user role.');
    }
  };

  // Database backup/restore — stub actions with no real infra behind them (a managed
  // Atlas cluster handles that), kept only so the admin audit trail stays complete.
  const handleBackupDatabase = async () => {
    try {
      await backupDatabase();
      setAuditLogs(await listAuditLogs());
      triggerAlert("Database backup completed.");
    } catch (err) {
      handleApiError(err, 'Backup failed.');
    }
  };

  const handleRestoreDatabase = async () => {
    try {
      await restoreDatabase();
      setAuditLogs(await listAuditLogs());
      triggerAlert("Database restore point recovered.");
    } catch (err) {
      handleApiError(err, 'Restore failed.');
    }
  };

  // Student & Faculty Profile Updater (admin editing another user's profile)
  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const { id, registeredAt, ...patch } = updatedUser;
      const saved = await apiUpdateUser(id, patch);
      setUsers(prev => prev.map(u => u.id === id ? saved : u));
      if (currentUser && currentUser.id === id) {
        setCurrentUser(saved);
      }
      triggerAlert("Researcher profile updated successfully!");
    } catch (err) {
      handleApiError(err, 'Could not update user profile.');
    }
  };

  const handleUpdateProposalFiles = async (researchId: string, files: ProposalFile[]) => {
    try {
      const updated = await apiUpdateProposalFiles(researchId, files);
      setResearchList(prev => prev.map(r => r.id === researchId ? updated : r));
      triggerAlert("Proposal attachments updated successfully!");
    } catch (err) {
      handleApiError(err, 'Could not update proposal attachments.');
    }
  };

  // Coordinator state flows Kanban board
  const handleUpdateResearchStatus = async (id: string, status: ResearchStatus) => {
    try {
      const updated = await apiUpdateResearchStatus(id, status);
      setResearchList(prev => prev.map(r => r.id === id ? updated : r));
      triggerAlert(`Status updated to: ${status}`);
    } catch (err) {
      handleApiError(err, 'Could not update research status.');
    }
  };

  // Admin repository management
  const handleAddRepositoryPaper = async (paper: Research) => {
    try {
      const created = await createArchivedResearch({
        title: paper.title, abstract: paper.abstract, departmentId: paper.departmentId,
        courseId: paper.courseId, schoolYearId: paper.schoolYearId, adviserId: paper.adviserId,
        keywords: paper.keywords, status: paper.status,
      });
      setResearchList(prev => [created, ...prev]);
      triggerAlert("New manuscript archived in repository!");
    } catch (err) {
      handleApiError(err, 'Could not archive manuscript.');
    }
  };

  const handleEditRepositoryPaper = async (paper: Research) => {
    try {
      const { id, ...patch } = paper;
      const updated = await apiUpdateResearch(id, patch);
      setResearchList(prev => prev.map(r => r.id === id ? updated : r));
      triggerAlert("Manuscript updated successfully!");
    } catch (err) {
      handleApiError(err, 'Could not update manuscript.');
    }
  };

  const handleDeleteRepositoryPaper = async (id: string) => {
    try {
      await deleteResearch(id);
      setResearchList(prev => prev.filter(r => r.id !== id));
      triggerAlert("Manuscript deleted from repository.");
    } catch (err) {
      handleApiError(err, 'Could not delete manuscript.');
    }
  };

  const handleAddUserAccount = async (newUser: User, password: string) => {
    try {
      const created = await createUser({
        email: newUser.email, password, name: newUser.name, role: newUser.role,
        departmentId: newUser.departmentId, courseId: newUser.courseId, phone: newUser.phone,
      });
      setUsers(prev => [...prev, created]);
      triggerAlert("New user account registered!");
    } catch (err) {
      handleApiError(err, 'Could not register user account.');
    }
  };

  const handleDeleteUserAccount = async (id: string) => {
    try {
      await apiDeleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      triggerAlert("User account deleted successfully.");
    } catch (err) {
      handleApiError(err, 'Could not delete user account.');
    }
  };

  const handleCreateTitleProposal = async (data: {
    title: string;
    abstract: string;
    keywords: string[];
    adviserId: string;
    members: string[];
    fileName: string;
    proposalFiles?: ProposalFile[];
  }) => {
    if (!currentUser) return;
    try {
      const created = await createResearch({
        title: data.title, abstract: data.abstract, keywords: data.keywords,
        adviserId: data.adviserId, fileName: data.fileName, proposalFiles: data.proposalFiles,
      });
      setResearchList(prev => [created, ...prev]);
      const freshVersions = await listVersionsForResearch(created.id);
      setVersions(prev => [...freshVersions, ...prev]);
      triggerAlert("Research Title Proposal submitted successfully!");
    } catch (err) {
      handleApiError(err, 'Could not submit research proposal.');
    }
  };

  // Navigation router view
  const renderTabContent = () => {
    // Enforce role-based access control
    const allowedTabs: Record<UserRole, string[]> = {
      student: ['dashboard', 'research-details', 'repository', 'calendar', 'database-erd'],
      adviser: ['dashboard', 'assigned-students', 'document-review', 'repository', 'calendar', 'database-erd'],
      coordinator: ['dashboard', 'coordinator-manuscripts', 'repository', 'calendar', 'database-erd'],
      panelist: ['dashboard', 'assigned-defenses', 'repository', 'calendar', 'database-erd'],
      admin: ['dashboard', 'user-management', 'repository', 'calendar', 'database-erd']
    };

    if (currentUser && !allowedTabs[currentUser.role].includes(activeTab)) {
      return (
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-rose-200 p-8 text-center space-y-4 shadow-sm max-w-md mx-auto mt-12 animate-in fade-in">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-full w-fit mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Access Restricted</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your designated institutional role (<span className="font-bold text-blue-950 uppercase font-mono">{currentUser.role}</span>) does not possess permission scopes to access the <span className="font-semibold text-slate-700">"{activeTab}"</span> section.
          </p>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-1.5 bg-blue-800 text-white rounded-lg text-xs font-semibold hover:bg-blue-900 cursor-pointer"
          >
            Return to Authorized Dashboard
          </button>
        </div>
      );
    }

    if (selectedResearchId) {
      const res = researchList.find(r => r.id === selectedResearchId)!;
      return (
        <ResearchDetailsView
          research={res}
          versions={versions}
          comments={comments}
          user={currentUser!}
          onBack={() => setSelectedResearchId(null)}
          onAddComment={handleAddComment}
          onUpdateChapterStatus={handleUpdateChapterStatus}
          onStudentUploadRevision={handleStudentUploadRevision}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        if (currentUser?.role === 'student') {
          const res = researchList.find(r => r.studentIds.includes(currentUser.id));
          const currentVer = res ? versions.filter(v => v.researchId === res.id).sort((a,b) => b.versionNumber - a.versionNumber)[0] : undefined;
          return (
            <DashboardStudent
              user={currentUser}
              research={res || null}
              currentVersion={currentVer}
              versions={versions}
              comments={comments}
              schedules={schedules}
              rooms={rooms}
              users={users}
              onNavigateToTimeline={() => {
                if (res) setSelectedResearchId(res.id);
              }}
              onStudentUploadRevision={handleStudentUploadRevision}
              onUpdateProposalFiles={handleUpdateProposalFiles}
              onUpdateResearchDetails={async (updated: Research) => {
                try {
                  const { id, ...patch } = updated;
                  const saved = await apiUpdateResearch(id, patch);
                  setResearchList(prev => prev.map(r => r.id === id ? saved : r));
                  triggerAlert("Capstone research parameters updated!");
                } catch (err) {
                  handleApiError(err, 'Could not update research details.');
                }
              }}
              onCreateTitleProposal={handleCreateTitleProposal}
            />
          );
        } else if (currentUser?.role === 'adviser') {
          return (
            <DashboardAdviser
              user={currentUser}
              researchList={researchList}
              versions={versions}
              comments={comments}
              consultations={consultations}
              users={users}
              onSelectResearch={(id) => setSelectedResearchId(id)}
              onApproveManuscript={handleApproveManuscript}
              onAddConsultation={handleAddConsultation}
              onApproveConsultation={handleApproveConsultation}
            />
          );
        } else if (currentUser?.role === 'coordinator') {
          return (
            <DashboardCoordinator
              user={currentUser}
              researchList={researchList}
              announcements={announcements}
              rooms={rooms}
              users={users}
              onAddAnnouncement={handleAddAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onApproveManuscript={handleApproveManuscript}
            />
          );
        } else if (currentUser?.role === 'panelist') {
          return (
            <DashboardPanelist
              user={currentUser}
              schedules={schedules}
              researchList={researchList}
              evaluations={evaluations}
              users={users}
              onAddEvaluation={handleAddEvaluation}
              onSelectResearch={(id) => setSelectedResearchId(id)}
            />
          );
        } else if (currentUser?.role === 'admin') {
          return (
            <DashboardAdmin
              user={currentUser}
              users={users}
              schedules={schedules}
              researchList={researchList}
              departments={departments}
              courses={courses}
              rooms={rooms}
              onToggleUserStatus={handleToggleUserStatus}
              onUpdateUserRole={handleUpdateUserRole}
              onAddUserAccount={handleAddUserAccount}
              onUpdateUser={handleUpdateUser}
              onDeleteUserAccount={handleDeleteUserAccount}
              onBackupDatabase={handleBackupDatabase}
              onRestoreDatabase={handleRestoreDatabase}
            />
          );
        }
        return <div className="text-xs text-slate-500">Dashboard loading...</div>;

      case 'repository':
        return (
          <RepositoryView
            user={currentUser!}
            researchList={researchList}
            departments={departments}
            courses={courses}
            schoolYears={schoolYears}
            users={users}
            onIncrementCounts={handleIncrementRepositoryCounts}
            onAddPaper={handleAddRepositoryPaper}
            onEditPaper={handleEditRepositoryPaper}
            onDeletePaper={handleDeleteRepositoryPaper}
          />
        );

      case 'calendar':
        if (currentUser?.role === 'coordinator') {
          return (
            <SchedulerCalendar
              schedules={schedules}
              rooms={rooms}
              users={users}
              researchList={researchList}
              currentUser={currentUser}
              onAddSchedule={handleAddSchedule}
              onUpdateSchedule={handleUpdateSchedule}
              onCancelSchedule={handleCancelSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onUpdateResearchAdviser={handleUpdateResearchAdviser}
            />
          );
        } else {
          return (
            <DefenseSchedulesList
              schedules={schedules}
              rooms={rooms}
              users={users}
              researchList={researchList}
              currentUser={currentUser!}
            />
          );
        }

      case 'database-erd':
        return <InteractiveERD />;

      case 'research-details':
        // For students, find their own research details immediately
        if (currentUser?.role === 'student') {
          const res = researchList.find(r => r.studentIds.includes(currentUser.id));
          if (res) {
            return (
              <ResearchDetailsView
                research={res}
                versions={versions}
                comments={comments}
                user={currentUser}
                onBack={() => setActiveTab('dashboard')}
                onAddComment={handleAddComment}
                onUpdateChapterStatus={handleUpdateChapterStatus}
                onStudentUploadRevision={handleStudentUploadRevision}
              />
            );
          }
        }
        return <div className="p-12 text-center text-slate-400 text-xs">Choose a manuscript from your panels or repositories list to see revision histories.</div>;

      case 'assigned-students':
        if (currentUser?.role === 'adviser') {
          return (
            <DashboardAdviser
              user={currentUser}
              researchList={researchList}
              versions={versions}
              comments={comments}
              consultations={consultations}
              users={users}
              onSelectResearch={(id) => setSelectedResearchId(id)}
              onApproveManuscript={handleApproveManuscript}
              onAddConsultation={handleAddConsultation}
              onApproveConsultation={handleApproveConsultation}
            />
          );
        }
        break;

      case 'coordinator-manuscripts':
        if (currentUser?.role === 'coordinator') {
          return (
            <DashboardCoordinator
              user={currentUser}
              researchList={researchList}
              announcements={announcements}
              rooms={rooms}
              users={users}
              onAddAnnouncement={handleAddAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onApproveManuscript={handleApproveManuscript}
            />
          );
        }
        break;

      case 'automated-scheduling':
        return (
          <AutomatedScheduler
            schedules={schedules}
            rooms={rooms}
            users={users}
            researchList={researchList}
            panelAvailabilities={panelAvailabilities}
            onAddSchedule={handleAddSchedule}
            onClearSchedules={handleClearSchedules}
          />
        );

      case 'announcements-board':
        if (currentUser?.role === 'coordinator') {
          return (
            <DashboardCoordinator
              user={currentUser}
              researchList={researchList}
              announcements={announcements}
              rooms={rooms}
              users={users}
              onAddAnnouncement={handleAddAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onApproveManuscript={handleApproveManuscript}
            />
          );
        }
        break;

      case 'assigned-defenses':
        if (currentUser?.role === 'panelist') {
          return (
            <DashboardPanelist
              user={currentUser}
              schedules={schedules}
              researchList={researchList}
              evaluations={evaluations}
              users={users}
              onAddEvaluation={handleAddEvaluation}
              onSelectResearch={(id) => setSelectedResearchId(id)}
            />
          );
        }
        break;

      case 'document-review':
        if (currentUser?.role === 'adviser') {
          return (
            <DocumentReview
              user={currentUser}
              researchList={researchList}
              versions={versions}
              comments={comments}
              onAddComment={handleAddComment}
              onApproveManuscript={handleApproveManuscript}
            />
          );
        }
        break;

      case 'user-management':
        if (currentUser?.role === 'admin') {
          return (
            <DashboardAdmin
              user={currentUser}
              users={users}
              schedules={schedules}
              researchList={researchList}
              departments={departments}
              courses={courses}
              rooms={rooms}
              activeSection="user-management"
              onToggleUserStatus={handleToggleUserStatus}
              onUpdateUserRole={handleUpdateUserRole}
              onAddUserAccount={handleAddUserAccount}
              onUpdateUser={handleUpdateUser}
              onDeleteUserAccount={handleDeleteUserAccount}
              onBackupDatabase={handleBackupDatabase}
              onRestoreDatabase={handleRestoreDatabase}
            />
          );
        }
        break;

      default:
        return <div className="p-12 text-center text-slate-400 text-xs">Tab selection is currently loading...</div>;
    }
  };

  // Wait for the silent session-restore check before deciding Landing vs Login vs Portal,
  // otherwise an already-logged-in user briefly flashes the Landing page on every reload.
  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#f1f5f9] via-[#f8fafc] to-[#e0e7ff]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-blue-800 border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Restoring secure session...</span>
        </div>
      </div>
    );
  }

  // Initial gate checking: Landing -> Login -> Portal Space
  if (!showPortal && !currentUser) {
    // Public entrance
    return (
      <LandingPage
        announcements={announcements}
        onEnterPortal={() => setShowPortal(true)}
        stats={{
          archived: researchList.filter(r => r.status === 'Completed' || r.status === 'Archived').length,
          active: researchList.filter(r => r.status !== 'Completed' && r.status !== 'Archived').length,
          advisers: users.filter(u => u.role === 'adviser').length,
          scheduled: schedules.filter(s => s.status === 'scheduled').length
        }}
      />
    );
  }

  if (showPortal && !currentUser) {
    // Portal secure entrance page
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        users={users}
        onBackToLanding={() => setShowPortal(false)}
      />
    );
  }

  // Once logged in, wait for the bulk data load before rendering dashboards — otherwise
  // every collection briefly renders empty while the initial fetch is still in flight.
  if (currentUser && isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#f1f5f9] via-[#f8fafc] to-[#e0e7ff]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-blue-800 border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  // Active Workspace
  if (currentUser && currentUser.role === 'student') {
    const hasResearch = researchList.some(r => r.studentIds.includes(currentUser.id));
    if (!hasResearch) {
      return (
        <ResearchInformationForm
          user={currentUser}
          advisers={users.filter(u => u.role === 'adviser')}
          onSubmit={handleCreateTitleProposal}
          onLogout={handleLogout}
        />
      );
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-tr from-[#f1f5f9] via-[#f8fafc] to-[#e0e7ff] text-slate-800 font-sans overflow-hidden relative">

      {/* Decorative ambient glowing blobs behind the frosted cards */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-300/15 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/15 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] left-[30%] w-[35%] h-[35%] rounded-full bg-sky-200/10 blur-[100px] pointer-events-none z-0"></div>

      {/* Toast notifications alert banners */}
      {alert && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-slate-100 py-2.5 px-5 rounded-full text-xs font-semibold shadow-2xl z-55 flex items-center gap-2 border border-white/10 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Persistent Left Sidebar with Switcher */}
      <Sidebar
        user={currentUser!}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedResearchId(null);
        }}
        onLogout={handleLogout}
        users={users}
        onEmulateRole={handleEmulateRole}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
      />

      {/* Main viewport area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

        {/* Unified Top header coordinates */}
        <Header
          user={currentUser!}
          notifications={notifications}
          onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          activeTab={selectedResearchId ? 'manuscript-details' : activeTab}
        />

        {/* Dynamic content canvas */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 relative z-10">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
