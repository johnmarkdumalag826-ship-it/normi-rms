export type UserRole = 'student' | 'adviser' | 'coordinator' | 'panelist' | 'admin';

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Course {
  id: string;
  departmentId: string;
  name: string;
  code: string;
}

export interface SchoolYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  departmentId?: string;
  courseId?: string;
  phone?: string;
  registeredAt: string;
  status: 'pending' | 'active' | 'suspended';
}

export type ResearchStatus = 
  | 'Submitted'
  | 'Under Review'
  | 'Revision Required'
  | 'Approved by Adviser'
  | 'Pending Coordinator'
  | 'Scheduled'
  | 'Completed'
  | 'Archived';

export interface ProposalFile {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  category: 'proposal_document' | 'research_summary' | 'supporting_files' | 'other_attachments';
}

export interface Research {
  id: string;
  title: string;
  abstract: string;
  departmentId: string;
  courseId: string;
  schoolYearId: string;
  status: ResearchStatus;
  studentIds: string[];
  adviserId: string;
  panelistIds: string[]; // Panelist User IDs
  createdAt: string;
  updatedAt: string;
  keywords: string[];
  viewCount: number;
  downloadCount: number;
  proposalFiles?: ProposalFile[];
}

export interface ChapterStatus {
  status: 'Pending' | 'Approved' | 'Revision Required' | 'Not Submitted';
  feedback?: string;
  lastUpdated?: string;
}

export interface ResearchVersion {
  id: string;
  researchId: string;
  versionNumber: number;
  title: string;
  abstract: string;
  fileUrl: string;
  fileName: string;
  submittedBy: string; // Student User ID
  submittedAt: string;
  annotatedFileUrl?: string; // Uploaded by Adviser
  annotatedFileName?: string;
  type?: 'adviser_check' | 'defense_manuscript';
  chapters: {
    chapter1: ChapterStatus; // Introduction
    chapter2: ChapterStatus; // Review of Related Literature
    chapter3: ChapterStatus; // Requirements Analysis / Methodology
    chapter4: ChapterStatus; // Results and Discussion (if applicable)
    chapter5: ChapterStatus; // Conclusion and Recommendations
  };
}

export interface ResearchComment {
  id: string;
  researchId: string;
  versionId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  chapter: 'chapter1' | 'chapter2' | 'chapter3' | 'chapter4' | 'chapter5' | 'general';
  text: string;
  commentAt: string;
  resolved: boolean;
  resolvedBy?: string;
}

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  isPinned: boolean;
  createdAt: string;
  category: 'general' | 'defense' | 'deadline' | 'repository';
}

export interface Room {
  id: string;
  name: string;
  location: string;
  capacity: number;
}

export interface PanelAvailability {
  id: string;
  panelistId: string;
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  startTime: string; // '08:00'
  endTime: string; // '17:00'
  isAvailable: boolean;
}

export interface Consultation {
  id: string;
  adviserId: string;
  studentId: string;
  dateTime: string;
  topic: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  meetLink?: string;
}

export interface Schedule {
  id: string;
  researchId: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // '09:00'
  endTime: string; // '10:30'
  roomId: string;
  panelistIds: string[]; // 3 panelists
  status: 'scheduled' | 'completed' | 'cancelled';
  conflictsDetected?: string[];
  type: 'proposal' | 'final';
}

export interface Evaluation {
  id: string;
  scheduleId: string;
  panelistId: string;
  panelistName: string;
  score1: number; // Criteria 1: Problem statement & relevance (20)
  score2: number; // Criteria 2: Literature Review & Methodology (30)
  score3: number; // Criteria 3: System Design & Implementation (30)
  score4: number; // Criteria 4: Presentation & Q&A (20)
  totalScore: number; // calculated 0-100
  comment: string;
  recommendation: 'Passed' | 'Minor Revision' | 'Major Revision' | 'Failed';
  evaluatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  ipAddress: string;
  details: string;
  createdAt: string;
}
