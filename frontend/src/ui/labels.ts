// Friendly words for values the system stores. The stored values (status codes,
// role names, etc.) are NEVER changed — this file only decides what people read
// on screen. Follow the glossary: Research paper, Adviser, Panel Member, Defense,
// Approved by Adviser, Repository, Revision needed.
import {
  Archive, CalendarCheck, CheckCircle2, Clock, Eye, Hourglass, Send, Wrench, XCircle,
  Award, type LucideIcon,
} from 'lucide-react';
import type {
  ResearchStatus, UserRole, ChapterStatus, Schedule, Consultation, User, Announcement, Evaluation,
} from '../types';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** Tailwind classes for each tone (text + background + border, all AA contrast). */
export const toneClasses: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-300',
  info: 'bg-blue-50 text-blue-900 border-blue-200',
  success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-300',
  danger: 'bg-rose-50 text-rose-900 border-rose-200',
};

// ---------------------------------------------------------------- Roles
export const roleLabels: Record<UserRole, string> = {
  student: 'Student',
  adviser: 'Adviser',
  panelist: 'Panel Member',
  coordinator: 'Coordinator',
  admin: 'Admin',
};

export const roleDescriptions: Record<UserRole, string> = {
  student: 'Send in your research paper, follow your progress, and upload changes.',
  adviser: 'Guide your student groups, read their papers, and give feedback.',
  panelist: 'Read papers assigned to you and score defenses.',
  coordinator: 'Set defense dates, rooms and panels, and post announcements.',
  admin: 'Manage user accounts and keep the system running.',
};

// ------------------------------------------------------- Research status
export interface StatusInfo {
  label: string;
  tone: Tone;
  icon: LucideIcon;
  /** What this status means, in one plain sentence. */
  meaning: string;
  /** What happens next, from the student's point of view. */
  next: string;
}

export const researchStatus: Record<ResearchStatus, StatusInfo> = {
  'Submitted': {
    label: 'Submitted',
    tone: 'info',
    icon: Send,
    meaning: 'Your research paper was sent to your adviser.',
    next: 'Your adviser will start reading it soon.',
  },
  'Under Review': {
    label: 'Adviser is reviewing',
    tone: 'info',
    icon: Eye,
    meaning: 'Your adviser is reading your paper.',
    next: 'Wait for feedback. You will get a notification.',
  },
  'Revision Required': {
    label: 'Revision needed',
    tone: 'warning',
    icon: Wrench,
    meaning: 'Your adviser asked for some changes.',
    next: 'Read the feedback, fix your paper, then upload the new version.',
  },
  'Approved by Adviser': {
    label: 'Approved by Adviser',
    tone: 'success',
    icon: CheckCircle2,
    meaning: 'Your adviser approved your paper.',
    next: 'The coordinator will set your defense date.',
  },
  'Pending Coordinator': {
    label: 'Waiting for Coordinator',
    tone: 'warning',
    icon: Hourglass,
    meaning: 'The coordinator is preparing your defense.',
    next: 'You will be told the date, time and room.',
  },
  'Scheduled': {
    label: 'Defense scheduled',
    tone: 'success',
    icon: CalendarCheck,
    meaning: 'Your defense has a date, time and room.',
    next: 'Prepare your presentation and arrive on time.',
  },
  'Completed': {
    label: 'Defense completed',
    tone: 'success',
    icon: Award,
    meaning: 'Your defense is finished.',
    next: 'Fix any panel comments, then upload your final paper.',
  },
  'Archived': {
    label: 'In the Repository',
    tone: 'neutral',
    icon: Archive,
    meaning: 'Your final paper is saved in the Research Repository.',
    next: 'Nothing more to do. Congratulations!',
  },
};

export const getResearchStatus = (status: string): StatusInfo =>
  researchStatus[status as ResearchStatus] ?? {
    label: status, tone: 'neutral', icon: Clock, meaning: '', next: '',
  };

// ---------------------------------------------------------- Chapter status
export const chapterStatus: Record<ChapterStatus['status'], StatusInfo> = {
  'Not Submitted': {
    label: 'Not sent yet', tone: 'neutral', icon: Clock,
    meaning: 'This chapter has not been uploaded.', next: 'Upload it when it is ready.',
  },
  'Pending': {
    label: 'Waiting for review', tone: 'info', icon: Hourglass,
    meaning: 'Your adviser has not checked this chapter yet.', next: 'Wait for feedback.',
  },
  'Approved': {
    label: 'Approved', tone: 'success', icon: CheckCircle2,
    meaning: 'Your adviser approved this chapter.', next: 'Nothing more to do here.',
  },
  'Revision Required': {
    label: 'Revision needed', tone: 'warning', icon: Wrench,
    meaning: 'Your adviser asked for changes to this chapter.', next: 'Read the feedback and upload a new version.',
  },
};

export const chapterNames: Record<string, string> = {
  chapter1: 'Chapter 1 · Introduction',
  chapter2: 'Chapter 2 · Review of Related Literature',
  chapter3: 'Chapter 3 · Methodology',
  chapter4: 'Chapter 4 · Results and Discussion',
  chapter5: 'Chapter 5 · Conclusion and Recommendations',
  general: 'General comment',
};

// ---------------------------------------------------------------- Defense
export const scheduleStatus: Record<Schedule['status'], StatusInfo> = {
  scheduled: {
    label: 'Scheduled', tone: 'info', icon: CalendarCheck,
    meaning: 'The defense has a date, time and room.', next: 'Be there on time.',
  },
  completed: {
    label: 'Completed', tone: 'success', icon: CheckCircle2,
    meaning: 'The defense is finished.', next: '',
  },
  cancelled: {
    label: 'Cancelled', tone: 'danger', icon: XCircle,
    meaning: 'This defense was cancelled.', next: 'The coordinator will set a new date.',
  },
};

export const defenseTypeLabels: Record<Schedule['type'], string> = {
  proposal: 'Proposal Defense',
  final: 'Final Defense',
};

// ----------------------------------------------------------- Consultations
export const consultationStatus: Record<Consultation['status'], StatusInfo> = {
  pending: {
    label: 'Waiting for approval', tone: 'warning', icon: Hourglass,
    meaning: 'The adviser has not answered this request yet.', next: 'Wait for a reply.',
  },
  approved: {
    label: 'Approved', tone: 'success', icon: CheckCircle2,
    meaning: 'The meeting is confirmed.', next: 'Join at the set time.',
  },
  completed: {
    label: 'Done', tone: 'neutral', icon: CheckCircle2,
    meaning: 'The meeting is finished.', next: '',
  },
  cancelled: {
    label: 'Cancelled', tone: 'danger', icon: XCircle,
    meaning: 'This meeting was cancelled.', next: '',
  },
};

// ------------------------------------------------------------ User account
export const userStatus: Record<User['status'], StatusInfo> = {
  pending: {
    label: 'Waiting for approval', tone: 'warning', icon: Hourglass,
    meaning: 'This account cannot sign in yet.', next: 'An admin must activate it.',
  },
  active: {
    label: 'Active', tone: 'success', icon: CheckCircle2,
    meaning: 'This person can sign in.', next: '',
  },
  suspended: {
    label: 'Suspended', tone: 'danger', icon: XCircle,
    meaning: 'This person cannot sign in.', next: 'An admin can reactivate the account.',
  },
};

// ---------------------------------------------------------- Announcements
export const announcementCategory: Record<Announcement['category'], string> = {
  general: 'General',
  defense: 'Defense',
  deadline: 'Deadline',
  repository: 'Repository',
};

// -------------------------------------------------------- Panel evaluation
export const recommendationLabels: Record<Evaluation['recommendation'], { label: string; tone: Tone }> = {
  'Passed': { label: 'Passed', tone: 'success' },
  'Minor Revision': { label: 'Passed with small changes', tone: 'warning' },
  'Major Revision': { label: 'Needs big changes', tone: 'danger' },
  'Failed': { label: 'Did not pass', tone: 'danger' },
};

// ------------------------------------------------------------- Page titles
/** Names shown in the top bar for each page (keyed by the internal page id). */
export const pageTitles: Record<string, string> = {
  dashboard: 'Home',
  'research-details': 'My Research',
  'assigned-students': 'My Student Groups',
  'document-review': 'Review Papers',
  'coordinator-manuscripts': 'Research Papers',
  'assigned-defenses': 'My Defenses',
  'user-management': 'Manage Accounts',
  repository: 'Research Repository',
  calendar: 'Defense Schedule',
  'manuscript-details': 'Research Details',
  'automated-scheduling': 'Automatic Scheduling',
  'announcements-board': 'Announcements',
};

// ----------------------------------------------------------------- Dates
const parse = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  // 'YYYY-MM-DD' must be read as a local date, otherwise it can show as the day before.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
};

const isValid = (d: Date) => !Number.isNaN(d.getTime());

/** "Tue, Oct 6" */
export const formatDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = parse(value);
  return isValid(d) ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';
};

/** "Tue, Oct 6, 2026" — use when the year matters (e.g. history, archive). */
export const formatDateLong = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = parse(value);
  return isValid(d)
    ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
};

/** "9:00 AM" from "09:00", or from a full date. */
export const formatTime = (value?: string | Date | null): string => {
  if (!value) return '—';
  const hm = typeof value === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(value) : null;
  const d = hm ? new Date(2000, 0, 1, Number(hm[1]), Number(hm[2])) : parse(value);
  return isValid(d) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
};

/** "Tue, Oct 6 · 9:00 AM" */
export const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = parse(value);
  return isValid(d) ? `${formatDate(d)} · ${formatTime(d)}` : '—';
};

/** Date plus a start time that is stored separately: "Tue, Oct 6 · 9:00 AM". */
export const formatDateAndTime = (date: string, time: string): string =>
  `${formatDate(date)} · ${formatTime(time)}`;

/** The name of a page for the top bar. The coordinator's calendar is where they set dates. */
export const getPageTitle = (tab: string, role?: UserRole): string =>
  tab === 'calendar' && role === 'coordinator' ? 'Schedule Defenses' : pageTitles[tab] ?? 'Home';
