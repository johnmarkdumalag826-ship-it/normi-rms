import React, { useState, useMemo } from 'react';
import { BookOpen, Search, Download, Eye, Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import { Research, Department, Course, SchoolYear, User } from '../types';
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, ResearchStatusBadge, Select, Textarea, cx,
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

  // Everyone sees finished papers. Admins also see papers that are still in progress.
  const repoPapers = useMemo(() => {
    if (user.role === 'admin') {
      return researchList;
    }
    return researchList.filter(r => r.status === 'Completed' || r.status === 'Archived');
  }, [researchList, user.role]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !abstract || !departmentId || !courseId || !schoolYearId || !adviserId) return;

    const keywords = keywordsString.split(',').map(k => k.trim()).filter(Boolean);

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
      viewCount: 0,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAddPaper(newPaper);
    setShowAddModal(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaper || !title || !abstract || !departmentId || !courseId || !schoolYearId || !adviserId) return;

    const keywords = keywordsString.split(',').map(k => k.trim()).filter(Boolean);

    const updatedPaper: Research = {
      ...editingPaper,
      title,
      abstract,
      departmentId,
      courseId,
      schoolYearId,
      adviserId,
      keywords,
      updatedAt: new Date().toISOString()
    };

    onEditPaper(updatedPaper);
    setShowEditModal(false);
    setEditingPaper(null);
    resetForm();
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

  const handlePreview = (paper: Research) => {
    onIncrementCounts(paper.id, 'view');
    setPreviewingResearch(paper);
  };

  const handleDownload = (paper: Research) => {
    const mainDoc = getMainFile(paper);
    if (!mainDoc) return;
    onIncrementCounts(paper.id, 'download');
    window.open(mainDoc.url, '_blank');
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
    </div>
  );

  const previewFile = previewingResearch ? getMainFile(previewingResearch) : undefined;

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
                      <Button variant="secondary" size="sm" icon={Eye} onClick={() => handlePreview(paper)}>View Details</Button>
                      <Button
                        size="sm"
                        icon={Download}
                        onClick={() => handleDownload(paper)}
                        disabled={!hasFile}
                        title={hasFile ? undefined : 'No file has been uploaded for this paper yet.'}
                      >
                        Download Paper
                      </Button>
                      {user.role === 'admin' && (
                        <>
                          <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEditModal(paper)}>Edit Details</Button>
                          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setPaperToDelete(paper)}>Delete Paper</Button>
                        </>
                      )}
                    </div>
                  </div>
                  {!hasFile && (
                    <p className="text-xs text-slate-600">No file has been uploaded for this paper yet, so it cannot be downloaded.</p>
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
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewingResearch(null)}>Close</Button>
            {previewingResearch && (
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
              <p className="text-sm text-slate-600">No file has been uploaded for this paper yet, so it cannot be downloaded.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Add a paper */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add a finished paper to the Repository"
        description="The paper will be saved as finished and everyone will be able to find it. Fields marked with * are required."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" form="paper-add-form">Add Paper to Repository</Button>
          </>
        }
      >
        <form id="paper-add-form" onSubmit={handleAddSubmit}>{paperFormFields}</form>
      </Modal>

      {/* Edit a paper */}
      <Modal
        open={showEditModal && !!editingPaper}
        onClose={closeEdit}
        title="Edit paper details"
        description="Change the details people see in the Repository. Fields marked with * are required."
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit}>Cancel</Button>
            <Button type="submit" form="paper-edit-form">Save Changes</Button>
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
