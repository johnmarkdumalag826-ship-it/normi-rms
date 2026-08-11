import { 
  User, Department, Course, SchoolYear, Research, ResearchVersion, 
  ResearchComment, SystemNotification, Announcement, Room, PanelAvailability, 
  Consultation, Schedule, Evaluation, AuditLog 
} from '../types';

export const DEPARTMENTS: Department[] = [
  { id: 'dept-cit', name: 'College of Information Technology', code: 'CIT' },
  { id: 'dept-cbe', name: 'College of Business Education', code: 'CBE' },
  { id: 'dept-cte', name: 'College of Teacher Education', code: 'CTE' },
  { id: 'dept-cas', name: 'College of Arts and Sciences', code: 'CAS' }
];

export const COURSES: Course[] = [
  { id: 'course-bsit', departmentId: 'dept-cit', name: 'Bachelor of Science in Information Technology', code: 'BSIT' },
  { id: 'course-bscs', departmentId: 'dept-cit', name: 'Bachelor of Science in Computer Science', code: 'BSCS' },
  { id: 'course-bsba', departmentId: 'dept-cbe', name: 'Bachelor of Science in Business Administration', code: 'BSBA' },
  { id: 'course-beed', departmentId: 'dept-cte', name: 'Bachelor of Elementary Education', code: 'BEEd' },
  { id: 'course-bsed', departmentId: 'dept-cte', name: 'Bachelor of Secondary Education', code: 'BSEd' }
];

export const SCHOOL_YEARS: SchoolYear[] = [
  { id: 'sy-2024-2025', name: 'A.Y. 2024-2025', isCurrent: false },
  { id: 'sy-2025-2026', name: 'A.Y. 2025-2026', isCurrent: true }
];

export const ROOMS: Room[] = [
  { id: 'room-lab1', name: 'IT Laboratory 1', location: 'Building A, 2nd Floor', capacity: 40 },
  { id: 'room-lab2', name: 'IT Laboratory 2', location: 'Building A, 2nd Floor', capacity: 40 },
  { id: 'room-avr', name: 'Audio-Visual Room (AVR)', location: 'Building B, Ground Floor', capacity: 80 },
  { id: 'room-conf', name: 'Dean\'s Conference Room', location: 'Building A, 3rd Floor', capacity: 20 },
  { id: 'room-lib', name: 'Library Discussion Room 1', location: 'Main Library, 2nd Floor', capacity: 15 }
];

export const INITIAL_USERS: User[] = [
  // Administrator
  {
    id: 'user-admin',
    email: 'admin@normi.edu.ph',
    name: 'Dr. Irish Mea D. Sajol',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    registeredAt: '2025-06-01T08:00:00Z',
    status: 'active'
  },
  // Coordinator
  {
    id: 'user-coord',
    email: 'coordinator@normi.edu.ph',
    name: 'Prof. Patrick Earl O. Kimpang',
    role: 'coordinator',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    departmentId: 'dept-cit',
    registeredAt: '2025-06-02T09:30:00Z',
    status: 'active'
  },
  // Advisers
  {
    id: 'user-adv1',
    email: 'adv.dumalag@normi.edu.ph',
    name: 'Dr. John Mark L. Dumalag',
    role: 'adviser',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    departmentId: 'dept-cit',
    phone: '+639171234567',
    registeredAt: '2025-06-03T10:00:00Z',
    status: 'active'
  },
  {
    id: 'user-adv2',
    email: 'adv.santos@normi.edu.ph',
    name: 'Dr. Elena M. Santos',
    role: 'adviser',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    departmentId: 'dept-cit',
    phone: '+639182345678',
    registeredAt: '2025-06-03T11:15:00Z',
    status: 'active'
  },
  {
    id: 'user-adv3',
    email: 'adv.garcia@normi.edu.ph',
    name: 'Prof. Robert J. Garcia',
    role: 'adviser',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    departmentId: 'dept-cit',
    phone: '+639193456789',
    registeredAt: '2025-06-04T14:20:00Z',
    status: 'active'
  },
  // Panelists
  {
    id: 'user-panel1',
    email: 'panel.pendelton@normi.edu.ph',
    name: 'Dr. Arthur S. Pendelton',
    role: 'panelist',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    departmentId: 'dept-cit',
    phone: '+639201234567',
    registeredAt: '2025-06-05T08:45:00Z',
    status: 'active'
  },
  {
    id: 'user-panel2',
    email: 'panel.dejesus@normi.edu.ph',
    name: 'Prof. Carmen R. De Jesus',
    role: 'panelist',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    departmentId: 'dept-cit',
    phone: '+639212345678',
    registeredAt: '2025-06-05T10:15:00Z',
    status: 'active'
  },
  {
    id: 'user-panel3',
    email: 'panel.alcantara@normi.edu.ph',
    name: 'Dr. Samuel V. Alcantara',
    role: 'panelist',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    departmentId: 'dept-cit',
    phone: '+639223456789',
    registeredAt: '2025-06-05T13:00:00Z',
    status: 'active'
  },
  {
    id: 'user-panel4',
    email: 'panel.lim@normi.edu.ph',
    name: 'Prof. Michelle T. Lim',
    role: 'panelist',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    departmentId: 'dept-cit',
    phone: '+639234567890',
    registeredAt: '2025-06-05T15:30:00Z',
    status: 'active'
  },
  // Students
  {
    id: 'user-stud1',
    email: 'student.capstone@normi.edu.ph',
    name: 'John Mark L. Dumalag, Irish Mea D. Sajol, Patrick Earl O. Kimpang',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    departmentId: 'dept-cit',
    courseId: 'course-bsit',
    phone: '+639304567890',
    registeredAt: '2025-06-06T09:00:00Z',
    status: 'active'
  },
  {
    id: 'user-stud2',
    email: 'student.plaza@normi.edu.ph',
    name: 'Jayson S. Plaza, Maria K. Cruz',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1524481909362-c9735328990d?w=150',
    departmentId: 'dept-cit',
    courseId: 'course-bsit',
    phone: '+639315678901',
    registeredAt: '2025-06-06T10:30:00Z',
    status: 'active'
  },
  {
    id: 'user-stud3',
    email: 'student.perez@normi.edu.ph',
    name: 'Liezel M. Perez, Kenji O. Sato',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    departmentId: 'dept-cit',
    courseId: 'course-bscs',
    phone: '+639326789012',
    registeredAt: '2025-06-07T11:00:00Z',
    status: 'active'
  },
  {
    id: 'user-stud4',
    email: 'student.cbe1@normi.edu.ph',
    name: 'Arnel G. Malasig, Sarah V. Tan',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150',
    departmentId: 'dept-cbe',
    courseId: 'course-bsba',
    phone: '+639337890123',
    registeredAt: '2025-06-08T13:45:00Z',
    status: 'active'
  }
];

export const INITIAL_RESEARCH: Research[] = [
  // Active Proposal 1: The user's Capstone project!
  {
    id: 'res-normi-sys',
    title: 'WEB-BASED RESEARCH MANAGEMENT AND MONITORING SYSTEM FOR NORTHERN MINDANAO COLLEGES, INC.',
    abstract: 'This project replaces the traditional, manual research processes of Northern Mindanao Colleges, Inc. (NORMI) with an integrated web platform. The proposed system digitizes the submission of manuscripts, manages versions, enables chapter-by-chapter comments, detects scheduling conflicts, schedules defenses automatically, and serves as an accessible institutional repository. The result is improved communication, high file availability, and structured academic workflows.',
    departmentId: 'dept-cit',
    courseId: 'course-bsit',
    schoolYearId: 'sy-2025-2026',
    status: 'Revision Required',
    studentIds: ['user-stud1'],
    adviserId: 'user-adv1',
    panelistIds: ['user-panel1', 'user-panel2', 'user-panel3'],
    createdAt: '2026-06-10T08:00:00Z',
    updatedAt: '2026-07-05T14:30:00Z',
    keywords: ['Research Management', 'Academic Workflow', 'Scheduling Automation', 'Conflict Detection', 'Institutional Repository'],
    viewCount: 45,
    downloadCount: 12
  },
  // Active Proposal 2: Jayson S. Plaza
  {
    id: 'res-iot-farm',
    title: 'IOT-BASED AGRICULTURAL MONITORING AND DYNAMIC IRRIGATION SYSTEM FOR CABADBARAN COCONUT PLANTERS',
    abstract: 'An automated IoT deployment aiming to assist local coconut and banana farmers in Cabadbaran City. Uses soil moisture, relative humidity, and temperature sensors to dynamic trigger watering intervals and optimize water usage while sending alerts via an Android dashboard.',
    departmentId: 'dept-cit',
    courseId: 'course-bsit',
    schoolYearId: 'sy-2025-2026',
    status: 'Approved by Adviser',
    studentIds: ['user-stud2'],
    adviserId: 'user-adv2',
    panelistIds: ['user-panel2', 'user-panel3', 'user-panel4'],
    createdAt: '2026-06-11T09:00:00Z',
    updatedAt: '2026-07-04T11:00:00Z',
    keywords: ['Internet of Things', 'Irrigation Automation', 'Precision Agriculture', 'Sensor Networks'],
    viewCount: 28,
    downloadCount: 3
  },
  // Active Proposal 3: Liezel M. Perez
  {
    id: 'res-nlp-senti',
    title: 'NATURAL LANGUAGE PROCESSING SENTIMENT CLASSIFICATION FOR LOCAL GOVERNMENT PUBLIC SERVICE TRANSPARENCY',
    abstract: 'A sentiment analysis tool designed for the Agusan del Norte municipal offices. Aggregates feedback from social media pages and citizen forums, categorizing complaints, inquiries, and praise into real-time analytics to improve policy-making speeds.',
    departmentId: 'dept-cit',
    courseId: 'course-bscs',
    schoolYearId: 'sy-2025-2026',
    status: 'Submitted',
    studentIds: ['user-stud3'],
    adviserId: 'user-adv3',
    panelistIds: [],
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-01T10:00:00Z',
    keywords: ['Natural Language Processing', 'Sentiment Analysis', 'E-Governance', 'Public Feedback'],
    viewCount: 15,
    downloadCount: 0
  },
  // Repository Item (Archived / Completed)
  {
    id: 'res-repo-rfid',
    title: 'RFID-BASED STUDENT ATTENDANCE AND REAL-TIME SMS ALERT SYSTEM FOR NORMI HIGH SCHOOL DEPARTMENT',
    abstract: 'An automated student tracking system using passive RFID tags and an integrated GSM gateway. Upon tapping, parent/guardian mobile phones are instantly alerted of their child\'s campus arrival or departure. Implemented and benchmarked to improve class attendance rates by 22%.',
    departmentId: 'dept-cit',
    courseId: 'course-bsit',
    schoolYearId: 'sy-2024-2025',
    status: 'Completed',
    studentIds: ['user-stud4'], // represent a previous student or general
    adviserId: 'user-adv1',
    panelistIds: ['user-panel1', 'user-panel3', 'user-panel4'],
    createdAt: '2024-11-05T08:00:00Z',
    updatedAt: '2025-03-20T16:00:00Z',
    keywords: ['RFID Tracking', 'SMS Gateway', 'Attendance Automation', 'School Safety'],
    viewCount: 342,
    downloadCount: 118
  },
  // Repository Item 2 (Completed CTE)
  {
    id: 'res-repo-cte',
    title: 'THE IMPACT OF MULTILINGUAL PORTABLE READERS ON ELEMENTARY READING SPEED IN SELECTED RURAL SCHOOLS',
    abstract: 'A rigorous mixed-methods study investigating pedagogical reading rates. Utilizing localized visual tablets in rural Agusan classrooms, the study assesses comprehension scores across 120 Grade-3 pupils, illustrating marked increases in phonetic mastery.',
    departmentId: 'dept-cte',
    courseId: 'course-beed',
    schoolYearId: 'sy-2024-2025',
    status: 'Completed',
    studentIds: [], // former
    adviserId: 'user-adv2',
    panelistIds: ['user-panel2', 'user-panel3'],
    createdAt: '2024-10-12T09:00:00Z',
    updatedAt: '2025-03-15T10:00:00Z',
    keywords: ['Multilingual Reading', 'Pedagogy', 'Elementary Education', 'Agusan Del Norte'],
    viewCount: 188,
    downloadCount: 64
  }
];

export const INITIAL_VERSIONS: ResearchVersion[] = [
  // For the active NORMI research system (version 1: initial, version 2: current with adviser feedback)
  {
    id: 'ver-normi-v1',
    researchId: 'res-normi-sys',
    versionNumber: 1,
    title: 'WEB-BASED RESEARCH MANAGEMENT SYSTEM FOR NORTHERN MINDANAO COLLEGES',
    abstract: 'An initial proposal to create a web portal for submissions.',
    fileUrl: 'manuscripts/proposal_v1.pdf',
    fileName: 'NORMI_Research_Proposal_V1.pdf',
    submittedBy: 'user-stud1',
    submittedAt: '2026-06-10T08:15:00Z',
    chapters: {
      chapter1: { status: 'Revision Required', feedback: 'Update the Situation Analysis with specific statistical data from interviews.' },
      chapter2: { status: 'Approved', feedback: 'Good local literature coverage.' },
      chapter3: { status: 'Revision Required', feedback: 'Detailed ERD and complete system architecture need to be added.' },
      chapter4: { status: 'Not Submitted' },
      chapter5: { status: 'Not Submitted' }
    }
  },
  {
    id: 'ver-normi-v2',
    researchId: 'res-normi-sys',
    versionNumber: 2,
    title: 'WEB-BASED RESEARCH MANAGEMENT AND MONITORING SYSTEM FOR NORTHERN MINDANAO COLLEGES, INC.',
    abstract: 'The updated and refined capstone proposal incorporating title refinements (adding "Monitoring" and official institution suffix "Inc.") and fleshing out the database design ERD and automated defense scheduling algorithms with conflict resolution.',
    fileUrl: 'manuscripts/proposal_v2.pdf',
    fileName: 'NORMI_Research_Proposal_V2_Draft.pdf',
    submittedBy: 'user-stud1',
    submittedAt: '2026-07-05T14:30:00Z',
    annotatedFileUrl: 'manuscripts/proposal_v2_annotated.pdf',
    annotatedFileName: 'NORMI_Proposal_V2_DrDumalag_Comments.pdf',
    chapters: {
      chapter1: { status: 'Approved', feedback: 'Situation analysis is significantly improved with proper citation of local challenges.', lastUpdated: '2026-07-06T02:00:00Z' },
      chapter2: { status: 'Approved', feedback: 'Excellent synthesis section.', lastUpdated: '2026-07-06T02:15:00Z' },
      chapter3: { status: 'Revision Required', feedback: 'The scheduling priority rules are clear, but please detail the exact conflict-checking query or code snippet in Chapter 3 under System Design.', lastUpdated: '2026-07-06T03:00:00Z' },
      chapter4: { status: 'Not Submitted' },
      chapter5: { status: 'Not Submitted' }
    }
  },
  // For the active IoT coconut project
  {
    id: 'ver-iot-v1',
    researchId: 'res-iot-farm',
    versionNumber: 1,
    title: 'IOT-BASED AGRICULTURAL MONITORING AND DYNAMIC IRRIGATION SYSTEM FOR CABADBARAN COCONUT PLANTERS',
    abstract: 'This study describes an automated agricultural device using soil moisture, relative humidity, and temperature sensors to trigger dynamic watering cycles.',
    fileUrl: 'manuscripts/iot_proposal_v1.pdf',
    fileName: 'Cabadbaran_IoT_Irrigation_Draft.pdf',
    submittedBy: 'user-stud2',
    submittedAt: '2026-06-11T09:30:00Z',
    chapters: {
      chapter1: { status: 'Approved', feedback: 'Very relevant focus on local Cabadbaran coconut agriculture.', lastUpdated: '2026-06-20T10:00:00Z' },
      chapter2: { status: 'Approved', feedback: 'Standard IoT literature is present.', lastUpdated: '2026-06-22T11:00:00Z' },
      chapter3: { status: 'Approved', feedback: 'Schematic drawings of the Arduino/ESP32 circuit look solid.', lastUpdated: '2026-07-04T11:00:00Z' },
      chapter4: { status: 'Not Submitted' },
      chapter5: { status: 'Not Submitted' }
    }
  },
  // For the active NLP sentiment project
  {
    id: 'ver-nlp-v1',
    researchId: 'res-nlp-senti',
    versionNumber: 1,
    title: 'NATURAL LANGUAGE PROCESSING SENTIMENT CLASSIFICATION FOR LOCAL GOVERNMENT PUBLIC SERVICE TRANSPARENCY',
    abstract: 'A sentiment classification system aggregating citizen posts in Agusan del Norte to assist municipalities in responsive governance.',
    fileUrl: 'manuscripts/nlp_proposal_v1.pdf',
    fileName: 'Agusan_NLP_Transparency_Proposal.pdf',
    submittedBy: 'user-stud3',
    submittedAt: '2026-07-01T10:15:00Z',
    chapters: {
      chapter1: { status: 'Pending', feedback: 'Awaiting adviser initial feedback.' },
      chapter2: { status: 'Pending' },
      chapter3: { status: 'Pending' },
      chapter4: { status: 'Not Submitted' },
      chapter5: { status: 'Not Submitted' }
    }
  }
];

export const INITIAL_COMMENTS: ResearchComment[] = [
  {
    id: 'comm-1',
    researchId: 'res-normi-sys',
    versionId: 'ver-normi-v2',
    authorId: 'user-adv1',
    authorName: 'Dr. John Mark L. Dumalag',
    authorRole: 'adviser',
    chapter: 'chapter1',
    text: 'Under "Situation Analysis" (page 4), excellent addition of interview statistics. This establishes a very solid foundation for the capstone motivation.',
    commentAt: '2026-07-06T02:00:00Z',
    resolved: false
  },
  {
    id: 'comm-2',
    researchId: 'res-normi-sys',
    versionId: 'ver-normi-v2',
    authorId: 'user-adv1',
    authorName: 'Dr. John Mark L. Dumalag',
    authorRole: 'adviser',
    chapter: 'chapter3',
    text: 'Please insert a high-resolution screenshot of the MySQL Entity-Relationship Diagram (ERD). Describe the relational logic between the Users table, Research table, and Schedules table in detail.',
    commentAt: '2026-07-06T03:00:00Z',
    resolved: false
  },
  {
    id: 'comm-3',
    researchId: 'res-normi-sys',
    versionId: 'ver-normi-v1',
    authorId: 'user-adv1',
    authorName: 'Dr. John Mark L. Dumalag',
    authorRole: 'adviser',
    chapter: 'chapter1',
    text: 'The title "Web-Based Research Management System" is a bit generic. Let us specify "and Monitoring" and name the target institution specifically: "for Northern Mindanao Colleges, Inc. (NORMI)" to make it highly localized.',
    commentAt: '2026-06-15T09:00:00Z',
    resolved: true,
    resolvedBy: 'user-stud1'
  }
];

export const PANEL_AVAILABILITY: PanelAvailability[] = [
  // Dr. Arthur Pendelton
  { id: 'av-p1-mon-am', panelistId: 'user-panel1', dayOfWeek: 'Monday', startTime: '09:00', endTime: '12:00', isAvailable: true },
  { id: 'av-p1-mon-pm', panelistId: 'user-panel1', dayOfWeek: 'Monday', startTime: '13:30', endTime: '17:00', isAvailable: true },
  { id: 'av-p1-wed-am', panelistId: 'user-panel1', dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '12:00', isAvailable: true },
  { id: 'av-p1-fri-am', panelistId: 'user-panel1', dayOfWeek: 'Friday', startTime: '09:00', endTime: '12:00', isAvailable: false },
  
  // Prof. Carmen De Jesus
  { id: 'av-p2-mon-pm', panelistId: 'user-panel2', dayOfWeek: 'Monday', startTime: '13:30', endTime: '17:00', isAvailable: true },
  { id: 'av-p2-tue-am', panelistId: 'user-panel2', dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '12:00', isAvailable: true },
  { id: 'av-p2-wed-pm', panelistId: 'user-panel2', dayOfWeek: 'Wednesday', startTime: '13:30', endTime: '17:00', isAvailable: true },
  
  // Dr. Samuel Alcantara
  { id: 'av-p3-tue-pm', panelistId: 'user-panel3', dayOfWeek: 'Tuesday', startTime: '13:30', endTime: '17:00', isAvailable: true },
  { id: 'av-p3-wed-am', panelistId: 'user-panel3', dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '12:00', isAvailable: true },
  { id: 'av-p3-thu-am', panelistId: 'user-panel3', dayOfWeek: 'Thursday', startTime: '09:00', endTime: '12:00', isAvailable: true },
  
  // Prof. Michelle Lim
  { id: 'av-p4-mon-am', panelistId: 'user-panel4', dayOfWeek: 'Monday', startTime: '09:00', endTime: '12:00', isAvailable: true },
  { id: 'av-p4-thu-pm', panelistId: 'user-panel4', dayOfWeek: 'Thursday', startTime: '13:30', endTime: '17:00', isAvailable: true },
  { id: 'av-p4-fri-pm', panelistId: 'user-panel4', dayOfWeek: 'Friday', startTime: '13:30', endTime: '17:00', isAvailable: true }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Submission Deadline for Research Proposals (A.Y. 2025-2026)',
    content: 'All BSIT and BSCS student groups must submit their updated Research Proposals (Chapters 1 to 3) via the system on or before July 15, 2026. Late submissions will affect scheduling placement for the upcoming July-August proposal defense sessions. Please coordinate with your designated advisers to secure early approval and annotations.',
    authorName: 'Prof. Patrick Earl O. Kimpang',
    isPinned: true,
    createdAt: '2026-07-01T08:00:00Z',
    category: 'deadline'
  },
  {
    id: 'ann-2',
    title: 'Interactive Institutional Repository Live!',
    content: 'We are pleased to introduce our web-based repository. Over 50+ approved research papers from the 2024-2025 batch have been archived, completely searchable by courses, keywords, and advisers. Students may search the repository for references and download full-text PDFs with the proper school logins.',
    authorName: 'Dr. Irish Mea D. Sajol',
    isPinned: false,
    createdAt: '2026-07-04T10:00:00Z',
    category: 'repository'
  },
  {
    id: 'ann-3',
    title: 'Schedule of Midyear Research Proposal Defense',
    content: 'The CIT Research Committee will convene midyear defenses from July 20 to July 25, 2026. Automated draft calendars will be published by the system next week. Panelists and students should configure their scheduling preferences and panelist availability slots as soon as possible to prevent conflict flags.',
    authorName: 'Prof. Patrick Earl O. Kimpang',
    isPinned: false,
    createdAt: '2026-07-05T09:30:00Z',
    category: 'defense'
  }
];

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  // For Team Alpha / Student 1
  {
    id: 'notif-1',
    userId: 'user-stud1',
    title: 'Adviser Left Feedback',
    message: 'Dr. John Mark Dumalag added a new comment on Chapter 3: requirements and ERD insertion requested.',
    type: 'warning',
    read: false,
    createdAt: '2026-07-06T03:02:00Z'
  },
  {
    id: 'notif-2',
    userId: 'user-stud1',
    title: 'Chapter 1 Approved',
    message: 'Your Chapter 1 (Introduction) has been approved by Dr. John Mark Dumalag.',
    type: 'success',
    read: true,
    createdAt: '2026-07-06T02:00:00Z'
  },
  // For Adviser 1
  {
    id: 'notif-3',
    userId: 'user-adv1',
    title: 'New Manuscript Upload',
    message: 'Team Alpha uploaded Chapter 1-3 Revision (Version 2) for review.',
    type: 'info',
    read: false,
    createdAt: '2026-07-05T14:31:00Z'
  },
  // For Coordinator
  {
    id: 'notif-4',
    userId: 'user-coord',
    title: 'Adviser Approval Alert',
    message: 'Dr. Elena Santos approved "IOT-BASED IRRIGATION SYSTEM" for Defense scheduling.',
    type: 'success',
    read: false,
    createdAt: '2026-07-04T11:05:00Z'
  }
];

export const INITIAL_CONSULTATIONS: Consultation[] = [
  {
    id: 'cons-1',
    adviserId: 'user-adv1',
    studentId: 'user-stud1',
    dateTime: '2026-07-08T10:00',
    topic: 'Relational Schema Design & Conflict Logic Discussion',
    status: 'approved',
    meetLink: 'https://meet.google.com/abc-normi-xyz'
  },
  {
    id: 'cons-2',
    adviserId: 'user-adv2',
    studentId: 'user-stud2',
    dateTime: '2026-07-09T14:00',
    topic: 'IoT Circuit board calibration review',
    status: 'pending'
  }
];

export const INITIAL_SCHEDULES: Schedule[] = [
  // Scheduled Defense for IoT agricultural monitoring
  {
    id: 'sched-iot',
    researchId: 'res-iot-farm',
    date: '2026-07-21',
    startTime: '09:00',
    endTime: '10:30',
    roomId: 'room-lab1',
    panelistIds: ['user-panel2', 'user-panel3', 'user-panel4'],
    status: 'scheduled',
    type: 'proposal'
  },
  // Previous completed defense RFID system
  {
    id: 'sched-rfid',
    researchId: 'res-repo-rfid',
    date: '2025-02-18',
    startTime: '13:00',
    endTime: '14:30',
    roomId: 'room-avr',
    panelistIds: ['user-panel1', 'user-panel3', 'user-panel4'],
    status: 'completed',
    type: 'final'
  }
];

export const INITIAL_EVALUATIONS: Evaluation[] = [
  {
    id: 'eval-rfid-p1',
    scheduleId: 'sched-rfid',
    panelistId: 'user-panel1',
    panelistName: 'Dr. Arthur S. Pendelton',
    score1: 19,
    score2: 28,
    score3: 28,
    score4: 18,
    totalScore: 93,
    comment: 'An exceptionally well-engineered system. The GSM hardware was demoed flawlessly, sending SMS within 2 seconds. The software user panel is clean.',
    recommendation: 'Passed',
    evaluatedAt: '2025-02-18T14:45:00Z'
  },
  {
    id: 'eval-rfid-p3',
    scheduleId: 'sched-rfid',
    panelistId: 'user-panel3',
    panelistName: 'Dr. Samuel V. Alcantara',
    score1: 18,
    score2: 26,
    score3: 27,
    score4: 17,
    totalScore: 88,
    comment: 'The RFID coverage and database triggers operate efficiently. Chapter 3 requires minor formatting revisions prior to hard binding.',
    recommendation: 'Minor Revision',
    evaluatedAt: '2025-02-18T14:50:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'user-stud1',
    userName: 'John Mark Dumalag',
    role: 'student',
    action: 'UPLOAD_MANUSCRIPT',
    ipAddress: '192.168.10.45',
    details: 'Uploaded Draft Proposal Chapters 1-3 Revision (Version 2) for "WEB-BASED RESEARCH MANAGEMENT SYSTEM"',
    createdAt: '2026-07-05T14:30:00Z'
  },
  {
    id: 'log-2',
    userId: 'user-adv1',
    userName: 'Dr. John Mark Dumalag',
    role: 'adviser',
    action: 'SUBMIT_COMMENT',
    ipAddress: '192.168.1.102',
    details: 'Reviewed Version 2 of CIT Capstone. Approved Chapter 1, Chapter 2. Requested Relational ERD updates on Chapter 3.',
    createdAt: '2026-07-06T03:00:00Z'
  },
  {
    id: 'log-3',
    userId: 'user-admin',
    userName: 'Dr. Irish Mea D. Sajol',
    role: 'admin',
    action: 'UPDATE_SYSTEM_SETTINGS',
    ipAddress: '200.15.42.11',
    details: 'Archived AY 2024-2025 records. Set AY 2025-2026 as active academic term.',
    createdAt: '2026-07-01T09:00:00Z'
  },
  {
    id: 'log-4',
    userId: 'user-coord',
    userName: 'Prof. Patrick Kimpang',
    role: 'coordinator',
    action: 'CREATE_ANNOUNCEMENT',
    ipAddress: '192.168.10.15',
    details: 'Published announcement regarding AY 2025-2026 midyear defenses and scheduling dates.',
    createdAt: '2026-07-05T09:35:00Z'
  }
];
