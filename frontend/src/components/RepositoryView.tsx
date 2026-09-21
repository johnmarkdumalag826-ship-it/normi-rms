import React, { useState, useMemo } from 'react';
import { BookOpen, Search, Download, Eye, Tag, Plus, Pencil, Trash2, FileText, ExternalLink } from 'lucide-react';
import { Research, Department, Course, SchoolYear, User, ProposalFile } from '../types';
import { uploadFile, resolveFileUrl, ApiError } from '../api/client';
import { downloadFile, openFile, useFileLink, fileErrorMessage } from '../api/files';
import {
  Alert, Badge, Button, Card, ConfirmDialog, PdfReader, EmptyState, Input, Modal, PageHeader, ResearchStatusBadge, Select, Textarea, cx,
} from '../ui';

interface RepositoryViewProps {
  user: User;
  researchList: Research[];
  departments: Department[];
  courses: Course[];
  schoolYears: SchoolYear[];
  users: User[];
  onIncrementCounts: (id: string, type: 'view' | 'download') => void;
  onAddPaper: (paper: Research) => void;
  onEditPaper: (paper: Research) => void;
  onDeletePaper: (id: string) => void;
}

export default function RepositoryView({
  user, researchList, departments, courses, schoolYears, users, onIncrementCounts, onAddPaper, onEditPaper, onDeletePaper
}: RepositoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSY, setSelectedSY] = useState('all');
  const [selectedKeyword, setSelectedKeyword] = useState('all');

  // Paper details pop-up
  const [previewingResearch, setPreviewingResearch] = useState<Research | null>(null);

  // Admin: add, edit and delete papers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPaper, setEditingPaper] = useState<Research | null>(null);
  const [paperToDelete, setPaperToDelete] = useState<Research | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [courseId, setCourseId] = useState(courses.find(c => c.departmentId === departments[0]?.id)?.id || '');
  const [schoolYearId, setSchoolYearId] = useState(schoolYears[0]?.id || '');
  const [adviserId, setAdviserId] = useState('');
  const [keywordsString, setKeywordsString] = useState('');
  const [authorNamesString, setAuthorNamesString] = useState('');
  // The PDF of the finished paper. It is uploaded when the person clicks Publish / Save Changes.
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Shown when a file could not be opened (for example: not allowed, or no internet)
  const [fileNotice, setFileNotice] = useState<string | null>(null);

  // Everyone sees finished papers. Admins also see papers that are still in progress.
  const repoPapers = useMemo(() => {
    if (user.role === 'admin') {
      return researchList;
    }
    return researchList.filter(r => r.status === 'Completed' || r.status === 'Archived');
  }, [researchList, user.role]);

  const uploadPaperFile = async (file: File): Promise<ProposalFile> => {
    const uploaded = await uploadFile(file);
    return {
      id: `prop-file-${Date.now()}`,
      name: uploaded.fileName,
      url: resolveFileUrl(uploaded.url),
      size: uploaded.size,
      uploadedAt: new Date().toISOString(),
      category: 'proposal_document',
    };
  };

  const uploadErrorText = (err: unknown) =>
    err instanceof ApiError ? err.message : 'We could not upload the file. Please check your internet connection and try again.';

  const handleFileChoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Please choose a PDF file.');
      setPaperFile(null);
      e.target.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setFileError('That file is too big. Please choose a PDF smaller than 15 MB.');
      setPaperFile(null);
      e.target.value = '';
      return;
    }
    setPaperFile(file);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !abstract || !departmentId || !courseId || !schoolYearId || !adviserId) return;
    if (!paperFile) {
      setFileError('Please choose the PDF file of the finished paper.');
      return;
    }

    const keywords = keywordsString.split(',').map(k => k.trim()).filter(Boolean);

    setIsSaving(true);
    setFileError(null);
    try {
      const file = await uploadPaperFile(paperFile);

      const newPaper: Research = {
        id: `repo-paper-${Date.now()}`,
        title,
        abstract,
        status: 'Archived',
        departmentId,
        courseId,
        schoolYearId,
        adviserId,
        studentIds: [],
        panelistIds: [],
        keywords,
        proposalFiles: [file],
        viewCount: 0,
        downloadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onAddPaper(newPaper);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      setFileError(uploadErrorText(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaper || !title || !abstract || !departmentId || !courseId || !schoolYearId || !adviserId) return;

    const keywords = keywordsString.split(',').map(k => k.trim()).filter(Boolean);

    setIsSaving(true);
    setFileError(null);
    try {
      // A new PDF replaces the old main document. Other files stay as they are.
      let proposalFiles = editingPaper.proposalFiles;
      if (paperFile) {
        const file = await uploadPaperFile(paperFile);
        proposalFiles = [...(editingPaper.proposalFiles ?? []).filter(f => f.category !== 'proposal_document'), file];
      }

      const updatedPaper: Research = {
        ...editingPaper,
        title,
        abstract,
        departmentId,
        courseId,
        schoolYearId,
        adviserId,
        keywords,
        proposalFiles,
        updatedAt: new Date().toISOString()
      };

      onEditPaper(updatedPaper);
      setShowEditModal(false);
      setEditingPaper(null);
      resetForm();
    } catch (err) {
      setFileError(uploadErrorText(err));
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setAbstract('');
    setDepartmentId(departments[0]?.id || '');
    setCourseId(courses.find(c => c.departmentId === departments[0]?.id)?.id || '');
    setSchoolYearId(schoolYears[0]?.id || '');
    setAdviserId(users.filter(u => u.role === 'adviser')[0]?.id || '');
    setKeywordsString('');
    setAuthorNamesString('');
    setPaperFile(null);
    setFileError(null);
  };

  const openEditModal = (paper: Research) => {
    setEditingPaper(paper);
    setTitle(paper.title);
    setAbstract(paper.abstract);
    setDepartmentId(paper.departmentId);
    setCourseId(paper.courseId);
    setSchoolYearId(paper.schoolYearId);
    setAdviserId(paper.adviserId);
    setKeywordsString(paper.keywords.join(', '));
    setPaperFile(null);
    setFileError(null);
    setShowEditModal(true);
  };

  // All keywords used in the papers, for the keyword filter
  const allKeywords = useMemo(() => {
    const keys = new Set<string>();
    repoPapers.forEach(p => {
      p.keywords?.forEach(k => keys.add(k));
    });
    return Array.from(keys);
  }, [repoPapers]);

  const filteredPapers = useMemo(() => {
    return repoPapers.filter(paper => {
      const matchSearch = searchTerm === '' ||
        paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        paper.abstract.toLowerCase().includes(searchTerm.toLowerCase()) ||
        paper.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchDept = selectedDept === 'all' || paper.departmentId === selectedDept;
      const matchCourse = selectedCourse === 'all' || paper.courseId === selectedCourse;
      const matchSY = selectedSY === 'all' || paper.schoolYearId === selectedSY;
      const matchKeyword = selectedKeyword === 'all' || paper.keywords.includes(selectedKeyword);

      return matchSearch && matchDept && matchCourse && matchSY && matchKeyword;
    });
  }, [repoPapers, searchTerm, selectedDept, selectedCourse, selectedSY, selectedKeyword]);

  const hasActiveFilters =
    searchTerm !== '' || selectedDept !== 'all' || selectedCourse !== 'all' || selectedSY !== 'all' || selectedKeyword !== 'all';

  const clearFilters = () => {
    setSelectedDept('all');
    setSelectedCourse('all');
    setSelectedSY('all');
    setSelectedKeyword('all');
    setSearchTerm('');
  };

  const getAdviserName = (id: string) => users.find(x => x.id === id)?.name ?? 'Unknown adviser';
  const getCourseCode = (id: string) => courses.find(x => x.id === id)?.code ?? '—';
  const getCourseName = (id: string) => courses.find(x => x.id === id)?.name ?? '—';
  const getDepartmentName = (id: string) => departments.find(x => x.id === id)?.name ?? '—';
  const getSchoolYearName = (id: string) => schoolYears.find(x => x.id === id)?.name ?? '—';

  const getMainFile = (paper: Research) => paper.proposalFiles?.find(f => f.category === 'proposal_document');

  // Students can only read a published paper. Everyone else can also download it.
  const canDownload = user.role !== 'student';

  const handlePreview = (paper: Research) => {
    onIncrementCounts(paper.id, 'view');
    setPreviewingResearch(paper);
  };

  const handleDownload = (paper: Research) => {
    const mainDoc = getMainFile(paper);
    if (!mainDoc) return;
    setFileNotice(null);
    // The server gives a short download link only to people who may have this file.
    downloadFile(mainDoc.url, mainDoc.name)
      .then(() => onIncrementCounts(paper.id, 'download'))
      .catch(err => setFileNotice(fileErrorMessage(err)));
  };

  const closeEdit = () => { setShowEditModal(false); setEditingPaper(null); };

  // The same fields are used to add a paper and to edit one.
  const paperFormFields = (
    <div className="space-y-5">
      <Input
        label="Research title"
        required
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Development of an Automated Enrollment System"
      />
      <Textarea
        label="Short summary (abstract)"
        required
        rows={4}
        value={abstract}
        onChange={e => setAbstract(e.target.value)}
        hint="Explain the problem, the method and the result in a few sentences."
      />
      <Select
        label="Department"
        required
        value={departmentId}
        onChange={e => {
          const newDeptId = e.target.value;
          setDepartmentId(newDeptId);
          const firstMatch = courses.find(c => c.departmentId === newDeptId);
          if (firstMatch) setCourseId(firstMatch.id);
        }}
      >
        {departments.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </Select>
      <Select label="Course" required value={courseId} onChange={e => setCourseId(e.target.value)}>
        {courses.filter(c => c.departmentId === departmentId).map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select label="School year" required value={schoolYearId} onChange={e => setSchoolYearId(e.target.value)}>
          {schoolYears.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Select label="Adviser" required value={adviserId} onChange={e => setAdviserId(e.target.value)}>
          {users.filter(u => u.role === 'adviser').map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </Select>
      </div>
      <Input
        label="Keywords"
        required
        value={keywordsString}
        onChange={e => setKeywordsString(e.target.value)}
        hint="Separate each keyword with a comma."
        placeholder="e.g. Automation, Enrollment, Database"
      />

      {/* The PDF people will download */}
      <div className="space-y-1.5">
        <label htmlFor="paper-file" className="block text-sm font-semibold text-slate-800">
          Paper file (PDF)
          {showAddModal ? <span className="ml-1 text-rose-700" aria-hidden="true">*</span> : <span className="ml-1.5 text-xs font-normal text-slate-600">(optional)</span>}
          {showAddModal && <span className="sr-only"> (required)</span>}
        </label>
        <p id="paper-file-hint" className="text-xs text-slate-600">
          {showAddModal
            ? 'Add the finished paper as a PDF, smaller than 15 MB. This is the file people download.'
            : 'Choose a new PDF only if you want to replace the current file.'}
        </p>
        {showEditModal && editingPaper && (
          <p className="text-sm text-slate-800">
            Current file: <strong>{editingPaper.proposalFiles?.find(f => f.category === 'proposal_document')?.name ?? 'none yet'}</strong>
          </p>
        )}
        <input
          id="paper-file"
          type="file"
          accept=".pdf,application/pdf"
          required={showAddModal && !paperFile}
          aria-describedby="paper-file-hint"
          aria-invalid={!!fileError || undefined}
          onChange={handleFileChoice}
          disabled={isSaving}
          className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-800 file:mr-4 file:min-h-11 file:cursor-pointer file:border-0 file:bg-blue-800 file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-900"
        />
        {paperFile && (
          <p className="flex items-center gap-2 text-sm text-slate-800">
            <FileText className="h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
            <span className="min-w-0 break-all">Chosen file: <strong>{paperFile.name}</strong> ({Math.round(paperFile.size / 102.4) / 10} KB)</span>
          </p>
        )}
        {fileError && (
          <Alert tone="danger" title="There is a problem with the file">{fileError}</Alert>
        )}
      </div>
    </div>
  );

  const previewFile = previewingResearch ? getMainFile(previewingResearch) : undefined;
  // A short, private link for the paper shown in the dialog
  const previewLink = useFileLink(previewFile?.url);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Research Repository"
        subtitle={
          user.role === 'admin'
            ? 'Every research paper in the system, including papers still in progress. Other people only see finished papers.'
            : 'Search finished research papers from Northern Mindanao Colleges, Inc.'
        }
        action={
          user.role === 'admin' ? (
            <Button
              icon={Plus}
              onClick={() => {
                resetForm();
                const advisers = users.filter(u => u.role === 'adviser');
                if (advisers.length > 0) {
                  setAdviserId(advisers[0].id);
                }
                setShowAddModal(true);
              }}
            >
              Add Paper to Repository
            </Button>
          ) : undefined
        }
      />

      {fileNotice && (
        <Alert tone="danger" title="We could not open the file">{fileNotice}</Alert>
      )}

      {/* Search and filters, always visible at the top */}
      <Card as="section" aria-label="Search and filters" className="space-y-4">
        <div className="relative">
          <label htmlFor="repo-search" className="sr-only">Search research papers</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="repo-search"
            type="search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by title, keyword or summary"
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-base text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Department"
            value={selectedDept}
            onChange={e => { setSelectedDept(e.target.value); setSelectedCourse('all'); }}
          >
            <option value="all">All departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </Select>
          <Select label="Course" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
            <option value="all">All courses</option>
            {courses
              .filter(c => selectedDept === 'all' || c.departmentId === selectedDept)
              .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </Select>
          <Select label="School year" value={selectedSY} onChange={e => setSelectedSY(e.target.value)}>
            <option value="all">All school years</option>
            {schoolYears.map(sy => (
              <option key={sy.id} value={sy.id}>{sy.name}</option>
            ))}
          </Select>
          <Select label="Keyword" value={selectedKeyword} onChange={e => setSelectedKeyword(e.target.value)}>
            <option value="all">All keywords</option>
            {allKeywords.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-700" role="status" aria-live="polite">
            Showing <strong className="text-slate-900">{filteredPapers.length}</strong>{' '}
            {filteredPapers.length === 1 ? 'research paper' : 'research papers'}
          </p>
          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={clearFilters}>Clear Search and Filters</Button>
          )}
        </div>
      </Card>

      {/* Results */}
      {filteredPapers.length === 0 ? (
        <Card padded={false}>
          {repoPapers.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="The Repository is empty for now"
              description="Finished research papers will appear here after their defense and once they are saved by the school."
            />
          ) : (
            <EmptyState
              icon={Search}
              title="No research papers match your search"
              description="Try a shorter search, or clear the filters to see every paper."
              action={<Button variant="secondary" onClick={clearFilters}>Clear Search and Filters</Button>}
            />
          )}
        </Card>
      ) : (
        <ul className="space-y-4">
          {filteredPapers.map(paper => {
            const hasFile = !!getMainFile(paper);
            return (
              <li key={paper.id}>
                <Card as="article" className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{getCourseCode(paper.courseId)}</Badge>
                    <span className="text-sm text-slate-700">{getDepartmentName(paper.departmentId)}</span>
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span className="text-sm text-slate-700">{getSchoolYearName(paper.schoolYearId)}</span>
                    {user.role === 'admin' && paper.status !== 'Archived' && paper.status !== 'Completed' && (
                      <ResearchStatusBadge status={paper.status} />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold leading-snug text-slate-900">{paper.title}</h2>
                    <p className="text-sm text-slate-700 line-clamp-3">{paper.abstract}</p>
                  </div>

                  {paper.keywords?.length > 0 && (
                    <ul className="flex flex-wrap gap-2" aria-label="Keywords. Select one to filter.">
                      {paper.keywords.map(k => (
                        <li key={k}>
                          <button
                            type="button"
                            aria-pressed={selectedKeyword === k}
                            onClick={() => setSelectedKeyword(selectedKeyword === k ? 'all' : k)}
                            className={cx(
                              'tap-auto inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer',
                              selectedKeyword === k
                                ? 'border-blue-800 bg-blue-800 text-white'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-blue-700',
                            )}
                          >
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {k}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1 text-sm text-slate-700">
                      <p>Adviser: <strong className="text-slate-900">{getAdviserName(paper.adviserId)}</strong></p>
                      <p className="flex items-center gap-4 text-slate-600">
                        <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" aria-hidden="true" /> {paper.viewCount} views</span>
                        <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" aria-hidden="true" /> {paper.downloadCount} downloads</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant={canDownload ? 'secondary' : 'primary'}
                        size="sm"
                        icon={Eye}
                        onClick={() => handlePreview(paper)}
                      >
                        {canDownload ? 'View Details' : 'Read the Paper'}
                      </Button>
                      {canDownload && (
                        <Button
                          size="sm"
                          icon={Download}
                          onClick={() => handleDownload(paper)}
                          disabled={!hasFile}
                          title={hasFile ? undefined : 'No file has been uploaded for this paper yet.'}
                        >
                          Download Paper
                        </Button>
                      )}
                      {user.role === 'admin' && (
                        <>
                          <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEditModal(paper)}>Edit Details</Button>
                          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setPaperToDelete(paper)}>Delete Paper</Button>
                        </>
                      )}
                    </div>
                  </div>
                  {!hasFile && (
                    <p className="text-xs text-slate-600">
                      {canDownload
                        ? 'No file has been uploaded for this paper yet, so it cannot be downloaded.'
                        : 'The paper file is not available yet.'}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Paper details */}
      <Modal
        open={!!previewingResearch}
        onClose={() => setPreviewingResearch(null)}
        title={previewingResearch?.title ?? 'Paper details'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewingResearch(null)}>Close</Button>
            {previewingResearch && canDownload && (
              <Button icon={Download} disabled={!previewFile} onClick={() => handleDownload(previewingResearch)}>
                Download Paper
              </Button>
            )}
          </>
        }
      >
        {previewingResearch && (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 text-base font-bold text-slate-900">Summary</h3>
              <p className="text-base leading-relaxed text-slate-800">{previewingResearch.abstract}</p>
            </section>

            {previewFile && (
              <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">Read the paper</h3>
                  {canDownload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={ExternalLink}
                      onClick={() => {
                        setFileNotice(null);
                        openFile(previewFile.url).catch(err => setFileNotice(fileErrorMessage(err)));
                      }}
                    >
                      Open in a New Tab
                    </Button>
                  )}
                </div>
                {previewFile.name.toLowerCase().endsWith('.pdf') ? (
                  previewLink.loading ? (
                    <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Opening the paper…</p>
                  ) : previewLink.error ? (
                    <Alert tone="danger" title="We could not open the paper">{previewLink.error}</Alert>
                  ) : previewLink.url ? (
                    canDownload ? (
                      <iframe
                        key={previewLink.url}
                        src={previewLink.url}
                        title={`Paper: ${previewFile.name}`}
                        className="h-[70vh] min-h-[420px] w-full rounded-lg border border-slate-300 bg-slate-100"
                      />
                    ) : (
                      // Students get a read-only reader: no download, print, edit or summarize buttons.
                      <PdfReader key={previewLink.url} url={previewLink.url} title={previewingResearch.title} />
                    )
                  ) : null
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {canDownload
                      ? 'This paper is a Word file, so it cannot be shown here. Use “Download Paper” to read it.'
                      : 'This paper is a Word file, so it cannot be shown on this page.'}
                  </p>
                )}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-base font-bold text-slate-900">Details</h3>
              <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                {[
                  ['Course', getCourseName(previewingResearch.courseId)],
                  ['Department', getDepartmentName(previewingResearch.departmentId)],
                  ['Adviser', getAdviserName(previewingResearch.adviserId)],
                  ['School year', getSchoolYearName(previewingResearch.schoolYearId)],
                  ['Keywords', previewingResearch.keywords.join(', ') || '—'],
                  ['Times viewed', String(previewingResearch.viewCount)],
                  ['Times downloaded', String(previewingResearch.downloadCount)],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5 p-3 sm:flex-row sm:gap-4">
                    <dt className="w-40 shrink-0 text-slate-600">{label}</dt>
                    <dd className="font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {!previewFile && (
              <p className="text-sm text-slate-600">
                {canDownload
                  ? 'No file has been uploaded for this paper yet, so it cannot be downloaded.'
                  : 'The paper file is not available yet.'}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Add a paper */}
      <Modal
        open={showAddModal}
        onClose={() => !isSaving && setShowAddModal(false)}
        title="Add a finished paper to the Repository"
        description="Publishing saves the paper as finished, and everyone will be able to find and download it. Fields marked with * are required."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" form="paper-add-form" loading={isSaving}>{isSaving ? 'Publishing…' : 'Publish'}</Button>
          </>
        }
      >
        <form id="paper-add-form" onSubmit={handleAddSubmit}>{paperFormFields}</form>
      </Modal>

      {/* Edit a paper */}
      <Modal
        open={showEditModal && !!editingPaper}
        onClose={() => !isSaving && closeEdit()}
        title="Edit paper details"
        description="Change the details people see in the Repository. Fields marked with * are required."
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit} disabled={isSaving}>Cancel</Button>
            <Button type="submit" form="paper-edit-form" loading={isSaving}>{isSaving ? 'Saving…' : 'Save Changes'}</Button>
          </>
        }
      >
        <form id="paper-edit-form" onSubmit={handleEditSubmit}>{paperFormFields}</form>
      </Modal>

      {/* Confirm before deleting */}
      <ConfirmDialog
        open={!!paperToDelete}
        onCancel={() => setPaperToDelete(null)}
        onConfirm={() => {
          if (paperToDelete) onDeletePaper(paperToDelete.id);
          setPaperToDelete(null);
        }}
        title="Delete this paper?"
        message={`“${paperToDelete?.title ?? 'This paper'}” will be removed from the Repository. This cannot be undone.`}
        confirmLabel="Yes, Delete Paper"
        cancelLabel="No, Keep Paper"
        destructive
      />
    </div>
  );
}
