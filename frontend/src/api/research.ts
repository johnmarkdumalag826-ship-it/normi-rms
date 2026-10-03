import { api } from './client';
import { Research, ResearchStatus, ResearchVersion, ResearchComment, ProposalFile, CommentAnchor } from '../types';

export const listResearch = (): Promise<Research[]> => api.get('/research');
export const getResearch = (id: string): Promise<Research> => api.get(`/research/${id}`);

// A student starts by registering their group (name, adviser, other members). The title,
// summary and main document come later through submitTitleProposal.
export const createResearch = (input: {
  groupName?: string; adviserId: string; members?: string[];
  title?: string; abstract?: string; keywords?: string[]; fileName?: string; proposalFiles?: ProposalFile[];
}): Promise<Research> => api.post('/research', input);

// The registered group sends its chosen title, summary, keywords and main document.
export const submitTitleProposal = (id: string, input: {
  title: string; abstract: string; keywords: string[]; proposalFiles: ProposalFile[];
}): Promise<Research> => api.post(`/research/${id}/title-proposal`, input);

// The group sends one file with the titles it prepared for the title hearing (sending again replaces it).
export const sendTitleList = (id: string, file: { name: string; url: string; size: number }): Promise<Research> =>
  api.post(`/research/${id}/title-list`, file);

// Admin archiving a manuscript directly into the repository (no student submitter/version)
export const createArchivedResearch = (input: {
  title: string; abstract: string; departmentId: string; courseId: string; schoolYearId: string;
  adviserId: string; keywords?: string[]; status?: ResearchStatus; proposalFiles?: ProposalFile[];
}): Promise<Research> => api.post('/research/archived', input);

export const updateResearch = (id: string, patch: Partial<Research>): Promise<Research> =>
  api.patch(`/research/${id}`, patch);

export const deleteResearch = (id: string): Promise<void> => api.del(`/research/${id}`);

export const approveManuscript = (
  id: string,
  decision: boolean | 'Approve' | 'Revision' | 'Reject',
  feedback?: string,
): Promise<Research> => api.post(`/research/${id}/approve`, { decision, feedback });

export const updateResearchStatus = (id: string, status: ResearchStatus): Promise<Research> =>
  api.patch(`/research/${id}/status`, { status });

export const updateResearchAdviser = (id: string, adviserId: string): Promise<Research> =>
  api.patch(`/research/${id}/adviser`, { adviserId });

export const incrementResearchCounts = (id: string, type: 'view' | 'download'): Promise<Research> =>
  api.post(`/research/${id}/increment`, { type });

export const updateProposalFiles = (id: string, proposalFiles: ProposalFile[]): Promise<Research> =>
  api.patch(`/research/${id}/proposal-files`, { proposalFiles });

// Versions
export const listAllVersions = (): Promise<ResearchVersion[]> => api.get('/versions');
export const listVersionsForResearch = (researchId: string): Promise<ResearchVersion[]> =>
  api.get(`/research/${researchId}/versions`);

export const addVersion = (
  researchId: string,
  input: { title: string; abstract: string; fileName: string; fileUrl: string; type?: 'adviser_check' | 'defense_manuscript' },
): Promise<ResearchVersion> => api.post(`/research/${researchId}/versions`, input);

export const updateChapterStatus = (
  versionId: string,
  chapter: string,
  status: 'Approved' | 'Revision Required' | 'Pending',
  feedback: string,
): Promise<ResearchVersion> => api.patch(`/versions/${versionId}/chapters/${chapter}`, { status, feedback });

export const annotateVersion = (versionId: string, annotatedFileUrl: string, annotatedFileName: string): Promise<ResearchVersion> =>
  api.patch(`/versions/${versionId}/annotate`, { annotatedFileUrl, annotatedFileName });

// Comments
export const listAllComments = (): Promise<ResearchComment[]> => api.get('/comments');
export const listCommentsForResearch = (researchId: string): Promise<ResearchComment[]> =>
  api.get(`/research/${researchId}/comments`);

export const createComment = (
  researchId: string,
  input: { versionId?: string; chapter?: ResearchComment['chapter']; text: string; anchor?: CommentAnchor },
): Promise<ResearchComment> => api.post(`/research/${researchId}/comments`, input);

export const resolveComment = (id: string): Promise<ResearchComment> => api.patch(`/comments/${id}`, {});
