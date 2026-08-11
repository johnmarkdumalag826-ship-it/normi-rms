import React, { useState, useEffect } from 'react';
import { 
  DEPARTMENTS, COURSES, SCHOOL_YEARS, ROOMS, INITIAL_USERS, 
  INITIAL_RESEARCH, INITIAL_VERSIONS, INITIAL_COMMENTS, 
  PANEL_AVAILABILITY, INITIAL_ANNOUNCEMENTS, INITIAL_NOTIFICATIONS, 
  INITIAL_CONSULTATIONS, INITIAL_SCHEDULES, INITIAL_EVALUATIONS, 
  INITIAL_AUDIT_LOGS 
} from './db/mockData';
import { 
  User, Research, ResearchVersion, ResearchComment, Announcement, 
  SystemNotification, Consultation, Schedule, Evaluation, AuditLog, UserRole, ProposalFile 
} from './types';
import { ShieldAlert } from 'lucide-react';

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

  // Database States (persisted in localStorage or initialized with realistic data)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('normi_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [researchList, setResearchList] = useState<Research[]>(() => {
    const saved = localStorage.getItem('normi_research');
    return saved ? JSON.parse(saved) : INITIAL_RESEARCH;
  });

  const [versions, setVersions] = useState<ResearchVersion[]>(() => {
    const saved = localStorage.getItem('normi_versions');
    return saved ? JSON.parse(saved) : INITIAL_VERSIONS;
  });

  const [comments, setComments] = useState<ResearchComment[]>(() => {
    const saved = localStorage.getItem('normi_comments');
    return saved ? JSON.parse(saved) : INITIAL_COMMENTS;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('normi_announcements');
    return saved ? JSON.parse(saved) : INITIAL_ANNOUNCEMENTS;
  });

  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    const saved = localStorage.getItem('normi_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [consultations, setConsultations] = useState<Consultation[]>(() => {
    const saved = localStorage.getItem('normi_consultations');
    return saved ? JSON.parse(saved) : INITIAL_CONSULTATIONS;
  });

  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const saved = localStorage.getItem('normi_schedules');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULES;
  });

  const [evaluations, setEvaluations] = useState<Evaluation[]>(() => {
    const saved = localStorage.getItem('normi_evaluations');
    return saved ? JSON.parse(saved) : INITIAL_EVALUATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('normi_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [defenseTypes, setDefenseTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('normi_defense_types');
    return saved ? JSON.parse(saved) : ['Proposal Defense', 'Final Defense', 'Mock Defense'];
  });

  // Navigation tracking
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedResearchId, setSelectedResearchId] = useState<string | null>(null);

  // Toast / Status Alerts
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('normi_users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem('normi_research', JSON.stringify(researchList));
  }, [researchList]);
  useEffect(() => {
    localStorage.setItem('normi_versions', JSON.stringify(versions));
  }, [versions]);
  useEffect(() => {
    localStorage.setItem('normi_comments', JSON.stringify(comments));
  }, [comments]);
  useEffect(() => {
    localStorage.setItem('normi_announcements', JSON.stringify(announcements));
  }, [announcements]);
  useEffect(() => {
    localStorage.setItem('normi_notifications', JSON.stringify(notifications));
  }, [notifications]);
  useEffect(() => {
    localStorage.setItem('normi_consultations', JSON.stringify(consultations));
  }, [consultations]);
  useEffect(() => {
    localStorage.setItem('normi_schedules', JSON.stringify(schedules));
  }, [schedules]);
  useEffect(() => {
    localStorage.setItem('normi_evaluations', JSON.stringify(evaluations));
  }, [evaluations]);
  useEffect(() => {
    localStorage.setItem('normi_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    localStorage.setItem('normi_defense_types', JSON.stringify(defenseTypes));
  }, [defenseTypes]);

  // Alert handler
  const triggerAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  // Helper to log transaction
  const logTransaction = (action: string, details: string, opRole?: UserRole, opName?: string, opId?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: opId || currentUser?.id || 'anonymous',
      userName: opName || currentUser?.name || 'Anonymous User',
      role: opRole || currentUser?.role || 'student',
      action,
      ipAddress: '192.168.10.12',
      details,
      createdAt: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Auth Operations
  const handleLoginSuccess = (user: User) => {
    setUsers(prev => {
      const exists = prev.some(u => u.email.toLowerCase() === user.email.toLowerCase());
      if (!exists) {
        return [...prev, user];
      }
      return prev;
    });
    setCurrentUser(user);
    setActiveTab('dashboard');
    logTransaction('USER_LOGIN', 'User authenticated via security handshake and completed 2FA simulation.', user.role, user.name, user.id);
  };

  const handleLogout = () => {
    if (currentUser) {
      logTransaction('USER_LOGOUT', 'User ended secure session.', currentUser.role, currentUser.name, currentUser.id);
    }
    setCurrentUser(null);
    setShowPortal(false);
  };

  const handleEmulateRole = (role: UserRole) => {
    const u = users.find(x => x.role === role && x.status === 'active');
    if (u) {
      setCurrentUser(u);
      setActiveTab('dashboard');
      setSelectedResearchId(null);
      logTransaction('ROLE_EMULATION', `Emulated session parameters for ${role} role account: ${u.name}`, u.role, u.name, u.id);
      triggerAlert(`Emulated role switched to: ${u.name}`);
    }
  };

  // Notifications
  const handleMarkNotificationsAsRead = () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n));
  };

  // Announcements
  const handleAddAnnouncement = (ann: Announcement) => {
    setAnnouncements(prev => [ann, ...prev]);
    logTransaction('CREATE_ANNOUNCEMENT', `Published institutional bulletin: "${ann.title}"`);
    triggerAlert("Announcement published successfully!");
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    logTransaction('DELETE_ANNOUNCEMENT', `Deleted institutional bulletin ID: ${id}`);
    triggerAlert("Announcement deleted.");
  };

  // Research Management Details (Coordinator / Adviser)
  const handleApproveManuscript = (
    id: string, 
    approveOrDecision: boolean | 'Approve' | 'Revision' | 'Reject', 
    feedbackNote?: string
  ) => {
    const isApproved = approveOrDecision === true || approveOrDecision === 'Approve';
    const isRejected = approveOrDecision === 'Reject';
    const newStatus = isApproved 
      ? 'Approved by Adviser' 
      : isRejected 
        ? 'Revision Required' 
        : 'Revision Required';

    setResearchList(prev => prev.map(r => {
      if (r.id === id) {
        // Notify student group
        r.studentIds.forEach(sid => {
          setNotifications(n => [
            {
              id: `notif-${Date.now()}-${sid}`,
              userId: sid,
              title: isApproved ? 'Manuscript Vetted' : 'Revision Action Required',
              message: isApproved 
                ? 'Your adviser approved your manuscript draft. Coordinator will lock defense date.' 
                : 'Your adviser requested revisions on your chapters. Please check timelines.',
              type: isApproved ? 'success' : 'warning',
              read: false,
              createdAt: new Date().toISOString()
            },
            ...n
          ]);
        });

        logTransaction(
          isApproved ? 'APPROVE_MANUSCRIPT' : 'REQUEST_REVISIONS', 
          `Research supervisor ${currentUser?.name} set status for ID ${id} to: ${newStatus}`
        );

        if (feedbackNote) {
          // Add general feedback comment
          const newComment: ResearchComment = {
            id: `comm-auto-vett-${Date.now()}`,
            researchId: id,
            versionId: 'general',
            authorId: currentUser?.id || 'system',
            authorName: currentUser?.name || 'Adviser',
            authorRole: (currentUser?.role || 'adviser') as any,
            text: feedbackNote,
            chapter: 'general',
            commentAt: new Date().toISOString(),
            resolved: false
          };
          setComments(prev => [newComment, ...prev]);
        }

        return { ...r, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return r;
    }));

    triggerAlert(isApproved ? "Draft approved successfully!" : "Revisions requested.");
  };

  // Chapter statuses (Adviser Panel)
  const handleUpdateChapterStatus = (
    researchId: string, versionId: string, chapter: string, 
    status: 'Approved' | 'Revision Required' | 'Pending', feedback: string
  ) => {
    setVersions(prev => prev.map(v => {
      if (v.id === versionId) {
        const updatedChapters = {
          ...v.chapters,
          [chapter]: { status, feedback, lastUpdated: new Date().toISOString() }
        };

        // If a chapter is Revision Required, let's flag the research title status as well
        if (status === 'Revision Required') {
          setResearchList(r => r.map(res => res.id === researchId ? { ...res, status: 'Revision Required', updatedAt: new Date().toISOString() } : res));
          // Create comment
          setComments(c => [
            {
              id: `comm-auto-${Date.now()}`,
              researchId,
              versionId,
              authorId: currentUser?.id || 'system',
              authorName: currentUser?.name || 'Adviser',
              authorRole: 'adviser',
              chapter: chapter as any,
              text: feedback,
              commentAt: new Date().toISOString(),
              resolved: false
            },
            ...c
          ]);
        }

        return { ...v, chapters: updatedChapters };
      }
      return v;
    }));

    // Trigger notification
    const resObj = researchList.find(x => x.id === researchId);
    if (resObj) {
      resObj.studentIds.forEach(sid => {
        setNotifications(n => [
          {
            id: `notif-${Date.now()}-${sid}`,
            userId: sid,
            title: `Chapter Status Updated`,
            message: `Dr. John Dumalag updated ${chapter.toUpperCase()} to: ${status}`,
            type: status === 'Approved' ? 'success' : 'warning',
            read: false,
            createdAt: new Date().toISOString()
          },
          ...n
        ]);
      });
    }

    logTransaction('UPDATE_CHAPTER_STATUS', `Supervisor ${currentUser?.name} marked ${chapter.toUpperCase()} as ${status}.`);
    triggerAlert(`Chapter status updated to ${status}.`);
  };

  // Student upload revision
  const handleStudentUploadRevision = (
    researchId: string, 
    title: string, 
    abstract: string, 
    fileName: string,
    type: 'adviser_check' | 'defense_manuscript' = 'adviser_check'
  ) => {
    const resObj = researchList.find(r => r.id === researchId);
    if (!resObj || !currentUser) return;

    // Get next version number
    const myVers = versions.filter(v => v.researchId === researchId);
    const nextVerNum = myVers.length + 1;

    const newVersion: ResearchVersion = {
      id: `ver-auto-${Date.now()}`,
      researchId,
      versionNumber: nextVerNum,
      title,
      abstract,
      fileUrl: `manuscripts/${fileName}`,
      fileName,
      submittedBy: currentUser.id,
      submittedAt: new Date().toISOString(),
      type,
      chapters: {
        chapter1: { status: 'Pending' },
        chapter2: { status: 'Pending' },
        chapter3: { status: 'Pending' },
        chapter4: { status: 'Not Submitted' },
        chapter5: { status: 'Not Submitted' }
      }
    };

    setVersions(prev => [newVersion, ...prev]);
    
    // Update Research status
    setResearchList(prev => prev.map(r => r.id === researchId ? { 
      ...r, 
      title, 
      abstract, 
      status: type === 'adviser_check' ? 'Submitted' : r.status, 
      updatedAt: new Date().toISOString() 
    } : r));

    // Handle notifications depending on type
    if (type === 'defense_manuscript') {
      const activeSched = schedules.find(s => s.researchId === researchId);
      const newNotifs: any[] = [];
      
      if (activeSched) {
        activeSched.panelistIds.forEach(pid => {
          newNotifs.push({
            id: `notif-panv-${Date.now()}-${pid}`,
            userId: pid,
            title: 'Defense Manuscript Submitted',
            message: `Student group submitted presentation manuscript for your reception & evaluation: ${fileName}`,
            type: 'info',
            read: false,
            createdAt: new Date().toISOString()
          });
        });
      }
      
      if (newNotifs.length > 0) {
        setNotifications(n => [...newNotifs, ...n]);
      }
      
      logTransaction('UPLOAD_REVISION', `Student uploaded Version ${nextVerNum} defense manuscript for panel reception: ${fileName}`);
      triggerAlert("Defense manuscript submitted to panel feed successfully!");
    } else {
      // Notify Adviser
      setNotifications(n => [
        {
          id: `notif-newv-${Date.now()}`,
          userId: resObj.adviserId,
          title: 'New Manuscript Upload',
          message: `Your student group submitted Version ${nextVerNum} Draft: ${fileName}`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString()
        },
        ...n
      ]);

      logTransaction('UPLOAD_REVISION', `Student uploaded Version ${nextVerNum} draft proposal for adviser checking: ${fileName}`);
      triggerAlert("Draft proposal submitted to adviser checking feed!");
    }
  };

  // Repository view increments
  const handleIncrementRepositoryCounts = (id: string, type: 'view' | 'download') => {
    setResearchList(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          viewCount: type === 'view' ? r.viewCount + 1 : r.viewCount,
          downloadCount: type === 'download' ? r.downloadCount + 1 : r.downloadCount
        };
      }
      return r;
    }));
  };

  // Interactive scheduler schedules
  const handleAddSchedule = (sched: Schedule) => {
    setSchedules(prev => [sched, ...prev]);
    
    // Update Research Status to scheduled
    setResearchList(prev => prev.map(r => r.id === sched.researchId ? { ...r, status: 'Scheduled', updatedAt: new Date().toISOString() } : r));

    // Notify authors
    const res = researchList.find(r => r.id === sched.researchId);
    if (res) {
      res.studentIds.forEach(sid => {
        setNotifications(n => [
          {
            id: `notif-sched-${Date.now()}-${sid}`,
            userId: sid,
            title: 'Defense Schedule Published!',
            message: `Your defense is set for ${sched.date} @ ${sched.startTime} in the presentation rooms. Check coordinates.`,
            type: 'success',
            read: false,
            createdAt: new Date().toISOString()
          },
          ...n
        ]);
      });
    }

    logTransaction('CREATE_SCHEDULE', `Coordinator registered defense slot ID ${sched.id} for research ${sched.researchId}`);
    triggerAlert("Schedule slot registered!");
  };

  const handleUpdateSchedule = (updated: Schedule) => {
    setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
    logTransaction('UPDATE_SCHEDULE', `Coordinator updated defense schedule ID ${updated.id} date/time coordinates.`);
    triggerAlert("Defense schedule updated successfully!");
  };

  const handleCancelSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, status: 'cancelled' } : s));
    const schedObj = schedules.find(s => s.id === scheduleId);
    if (schedObj) {
      setResearchList(prev => prev.map(r => r.id === schedObj.researchId ? { ...r, status: 'Approved by Adviser', updatedAt: new Date().toISOString() } : r));
    }
    logTransaction('CANCEL_SCHEDULE', `Coordinator cancelled defense schedule ID ${scheduleId}`);
    triggerAlert("Defense schedule cancelled.", "error");
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    const schedObj = schedules.find(s => s.id === scheduleId);
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    if (schedObj) {
      setResearchList(prev => prev.map(r => r.id === schedObj.researchId ? { ...r, status: 'Approved by Adviser', updatedAt: new Date().toISOString() } : r));
    }
    logTransaction('DELETE_SCHEDULE', `Coordinator permanently deleted schedule ID ${scheduleId}`);
    triggerAlert("Defense schedule deleted.");
  };

  const handleUpdateResearchAdviser = (researchId: string, adviserId: string) => {
    setResearchList(prev => prev.map(r => r.id === researchId ? { ...r, adviserId, updatedAt: new Date().toISOString() } : r));
    logTransaction('UPDATE_ADVISER', `Coordinator reassigned adviser ID ${adviserId} to research group ID ${researchId}`);
  };

  const handleClearSchedules = () => {
    // Keep completed historical schedules, delete draft proposal ones for demo reset
    setSchedules(prev => prev.filter(s => s.status === 'completed'));
    // Revert research status to Approved by Adviser
    setResearchList(prev => prev.map(r => r.status === 'Scheduled' ? { ...r, status: 'Approved by Adviser' } : r));
    logTransaction('CLEAR_SCHEDULES', "Coordinator cleared draft scheduling calendars.");
    triggerAlert("Draft calendars cleared.");
  };

  // Evaluator sheets
  const handleAddEvaluation = (evalObj: Evaluation) => {
    setEvaluations(prev => [evalObj, ...prev]);

    // Update schedule state to completed if appropriate
    setSchedules(prev => prev.map(s => s.id === evalObj.scheduleId ? { ...s, status: 'completed' } : s));

    // If defense is completed, move research status to completed or archived
    const sched = schedules.find(s => s.id === evalObj.scheduleId);
    if (sched) {
      setResearchList(prev => prev.map(r => {
        if (r.id === sched.researchId) {
          // Notify student
          r.studentIds.forEach(sid => {
            setNotifications(n => [
              {
                id: `notif-eval-${Date.now()}`,
                userId: sid,
                title: 'Jury Recommendation Published',
                message: `Panelist evaluated defense with recommendation: ${evalObj.recommendation} (Score: ${evalObj.totalScore}/100)`,
                type: evalObj.recommendation === 'Failed' ? 'error' : 'success',
                read: false,
                createdAt: new Date().toISOString()
              },
              ...n
            ]);
          });

          return { 
            ...r, 
            status: evalObj.recommendation === 'Passed' ? 'Completed' : 'Revision Required', 
            updatedAt: new Date().toISOString() 
          };
        }
        return r;
      }));
    }

    logTransaction('LOCK_EVALUATION', `Jury member ${currentUser?.name} submitted grade evaluation out of 100: ${evalObj.totalScore}`);
    triggerAlert("Jury evaluation submitted!");
  };

  // Consultations
  const handleAddConsultation = (cons: Consultation) => {
    setConsultations(prev => [cons, ...prev]);
    logTransaction('ADD_CONSULTATION', `Supervisor scheduled consultation slot: "${cons.topic}"`);
    triggerAlert("Consultation slot registered.");
  };

  const handleApproveConsultation = (id: string) => {
    setConsultations(prev => prev.map(c => c.id === id ? { 
      ...c, status: 'approved', meetLink: 'https://meet.google.com/normi-abc-xyz' 
    } : c));
    triggerAlert("Consultation slot approved!");
  };

  // Admin user directory
  const handleToggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'active' ? 'suspended' : 'active';
        logTransaction('TOGGLE_USER_STATUS', `Super Admin set account status of ${u.name} to: ${nextStatus}`);
        return { ...u, status: nextStatus };
      }
      return u;
    }));
    triggerAlert("User status updated.");
  };

  const handleUpdateUserRole = (id: string, role: UserRole) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        logTransaction('UPDATE_USER_ROLE', `Super Admin updated role of ${u.name} to: ${role}`);
        return { ...u, role };
      }
      return u;
    }));
    triggerAlert("User permission updated.");
  };

  // SQL Backups
  const handleBackupDatabase = () => {
    logTransaction('BACKUP_DATABASE', "Super Admin triggered physical hot backup of MySQL schemas and DDL transcripts.");
    triggerAlert("Database backup completed (normi_backup.sql generated).");
  };

  const handleRestoreDatabase = () => {
    logTransaction('RESTORE_DATABASE', "Super Admin triggered a hot rollback recover to the latest restore point coordinates.");
    triggerAlert("Database restore point recovered.");
  };

  // Student & Faculty Profile Updater
  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    logTransaction('UPDATE_USER_PROFILE', `Updated user profile/researcher information for: ${updatedUser.name}`, updatedUser.role, updatedUser.name, updatedUser.id);
    triggerAlert("Researcher profile updated successfully!");
  };

  const handleUpdateProposalFiles = (researchId: string, files: ProposalFile[]) => {
    setResearchList(prev => prev.map(r => r.id === researchId ? { ...r, proposalFiles: files, updatedAt: new Date().toISOString() } : r));
    logTransaction('UPDATE_PROPOSAL_FILES', `Student updated proposal files/attachments list for Research ID: ${researchId}`);
    triggerAlert("Proposal attachments updated successfully!");
  };

  // Coordinator state flows Kanban board
  const handleUpdateResearchStatus = (id: string, status: any) => {
    setResearchList(prev => prev.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r));
    logTransaction('UPDATE_RESEARCH_STATUS', `Coordinator updated research status of ID ${id} to ${status}`);
    triggerAlert(`Status updated to: ${status}`);
  };

  // Admin repository management
  const handleAddRepositoryPaper = (paper: Research) => {
    setResearchList(prev => [paper, ...prev]);
    logTransaction('ADD_REPOSITORY_MANUSCRIPT', `Super Admin archived new manuscript: "${paper.title}"`);
    triggerAlert("New manuscript archived in repository!");
  };

  const handleEditRepositoryPaper = (paper: Research) => {
    setResearchList(prev => prev.map(r => r.id === paper.id ? paper : r));
    logTransaction('EDIT_REPOSITORY_MANUSCRIPT', `Super Admin updated manuscript metadata of ID: ${paper.id}`);
    triggerAlert("Manuscript updated successfully!");
  };

  const handleDeleteRepositoryPaper = (id: string) => {
    setResearchList(prev => prev.filter(r => r.id !== id));
    logTransaction('DELETE_REPOSITORY_MANUSCRIPT', `Super Admin deleted manuscript of ID: ${id}`);
    triggerAlert("Manuscript deleted from repository.");
  };

  const handleAddUserAccount = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    logTransaction('REGISTER_USER_ACCOUNT', `Academic account registered: ${newUser.name} (${newUser.email})`);
    triggerAlert("New user account registered!");
  };

  const handleDeleteUserAccount = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    logTransaction('DELETE_USER_ACCOUNT', `Academic account deleted: ID ${id}`);
    triggerAlert("User account deleted successfully.");
  };

  const handleAddDefenseType = (type: string) => {
    setDefenseTypes(prev => {
      if (prev.includes(type)) return prev;
      logTransaction('ADD_DEFENSE_TYPE', `Institutional defense type category configured: "${type}"`);
      triggerAlert(`Defense type "${type}" added successfully!`);
      return [...prev, type];
    });
  };

  const handleDeleteDefenseType = (type: string) => {
    setDefenseTypes(prev => {
      const filtered = prev.filter(t => t !== type);
      logTransaction('DELETE_DEFENSE_TYPE', `Removed institutional defense type category: "${type}"`);
      triggerAlert(`Defense type "${type}" deleted.`);
      return filtered;
    });
  };

  const handleCreateTitleProposal = (data: {
    title: string;
    abstract: string;
    keywords: string[];
    adviserId: string;
    members: string[];
    fileName: string;
    proposalFiles?: ProposalFile[];
  }) => {
    if (!currentUser) return;

    const newResearchId = `res-${Date.now()}`;
    const newResearch: Research = {
      id: newResearchId,
      studentIds: [currentUser.id],
      adviserId: data.adviserId,
      panelistIds: [],
      title: data.title,
      abstract: data.abstract,
      keywords: data.keywords,
      status: 'Submitted',
      departmentId: currentUser.departmentId || DEPARTMENTS[0].id,
      courseId: currentUser.courseId || COURSES[0].id,
      schoolYearId: SCHOOL_YEARS.find(s => s.isCurrent)?.id || SCHOOL_YEARS[0].id,
      viewCount: 0,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      proposalFiles: data.proposalFiles || []
    };

    // Create primary version 1 record
    const newVersion: ResearchVersion = {
      id: `ver-${Date.now()}`,
      researchId: newResearchId,
      versionNumber: 1,
      title: data.title,
      abstract: data.abstract,
      fileUrl: `manuscripts/${data.fileName}`,
      fileName: data.fileName,
      submittedBy: currentUser.id,
      submittedAt: new Date().toISOString(),
      chapters: {
        chapter1: { status: 'Pending' },
        chapter2: { status: 'Pending' },
        chapter3: { status: 'Pending' },
        chapter4: { status: 'Not Submitted' },
        chapter5: { status: 'Not Submitted' }
      }
    };

    setResearchList(prev => [newResearch, ...prev]);
    setVersions(prev => [newVersion, ...prev]);

    // Send dispatch notification to Adviser
    setNotifications(n => [
      {
        id: `notif-newprop-${Date.now()}`,
        userId: data.adviserId,
        title: 'New Research Title Proposal',
        message: `Student group submitted a new Research Proposal: "${data.title}"`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      },
      ...n
    ]);

    logTransaction('SUBMIT_PROPOSAL', `Student team submitted new Research Proposal Form: "${data.title}"`);
    triggerAlert("Research Title Proposal submitted successfully!");
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
          onAddComment={(c) => setComments(prev => [c, ...prev])}
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
              rooms={ROOMS}
              users={users}
              onNavigateToTimeline={() => {
                if (res) setSelectedResearchId(res.id);
              }}
              onStudentUploadRevision={handleStudentUploadRevision}
              onUpdateProposalFiles={handleUpdateProposalFiles}
              onUpdateResearchDetails={(updated: Research) => {
                setResearchList(prev => prev.map(r => r.id === updated.id ? updated : r));
                logTransaction('UPDATE_RESEARCH_METADATA', `Student updated metadata for capstone: "${updated.title}"`);
                triggerAlert("Capstone research parameters updated!");
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
              rooms={ROOMS}
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
              departments={DEPARTMENTS}
              courses={COURSES}
              rooms={ROOMS}
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
            departments={DEPARTMENTS}
            courses={COURSES}
            schoolYears={SCHOOL_YEARS}
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
              rooms={ROOMS}
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
              rooms={ROOMS}
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
                onAddComment={(c) => setComments(prev => [c, ...prev])}
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
              rooms={ROOMS}
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
            rooms={ROOMS}
            users={users}
            researchList={researchList}
            panelAvailabilities={PANEL_AVAILABILITY}
            onAddSchedule={handleAddAddSchedule => handleAddSchedule(handleAddAddSchedule)}
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
              rooms={ROOMS}
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
              onAddComment={(c) => setComments(prev => [c, ...prev])}
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
              departments={DEPARTMENTS}
              courses={COURSES}
              rooms={ROOMS}
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

  // Initial gate checking: Landing -> Login -> Portal Space
  if (!showPortal && !currentUser) {
    // Public entrance
    return (
      <LandingPage
        announcements={announcements}
        onEnterPortal={() => setShowPortal(true)}
        stats={{
          archived: researchList.filter(r => r.status === 'Completed' || r.status === 'Archived').length + 50, // simulated archival count
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
