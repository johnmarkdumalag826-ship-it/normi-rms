import React, { useState, useMemo } from 'react';
import { BookOpen, Search, Filter, Download, Eye, Tag, FileText, Landmark, X, FileCheck, HelpCircle, Plus, Trash, Edit, Save } from 'lucide-react';
import { Research, Department, Course, SchoolYear, User } from '../types';

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
  
  // PDF Preview simulation
  const [previewingResearch, setPreviewingResearch] = useState<Research | null>(null);

  // Administrative Repository Management
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPaper, setEditingPaper] = useState<Research | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [schoolYearId, setSchoolYearId] = useState(schoolYears[0]?.id || '');
  const [adviserId, setAdviserId] = useState('');
  const [keywordsString, setKeywordsString] = useState('');
  const [authorNamesString, setAuthorNamesString] = useState('');

  // Filter completed or archived papers for public repo
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
    setCourseId(courses[0]?.id || '');
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

  // Aggregate keywords
  const allKeywords = useMemo(() => {
    const keys = new Set<string>();
    repoPapers.forEach(p => {
      p.keywords?.forEach(k => keys.add(k));
    });
    return Array.from(keys);
  }, [repoPapers]);

  // Handle filtrations
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

  const getAdviserName = (adviserId: string) => {
    const u = users.find(x => x.id === adviserId);
    return u ? u.name : 'Unknown Adviser';
  };

  const getCourseCode = (courseId: string) => {
    const c = courses.find(x => x.id === courseId);
    return c ? c.code : 'BSIT';
  };

  const getDepartmentName = (deptId: string) => {
    const d = departments.find(x => x.id === deptId);
    return d ? d.name : 'College of IT';
  };

  const getSchoolYearName = (syId: string) => {
    const s = schoolYears.find(x => x.id === syId);
    return s ? s.name : 'A.Y. 2025';
  };

  const handlePreview = (paper: Research) => {
    onIncrementCounts(paper.id, 'view');
    setPreviewingResearch(paper);
  };

  const handleDownload = (paper: Research) => {
    onIncrementCounts(paper.id, 'download');
    // Simulate downloading PDF
    const blob = new Blob([JSON.stringify(paper, null, 2)], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${paper.title.substring(0, 30).replace(/\s+/g, '_')}_MANUSCRIPT.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top section: Heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Digital Research Repository
          </h2>
          <p className="text-xs text-slate-500">
            Archive of all approved capstone manuscripts and research theses of Northern Mindanao Colleges, Inc.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <button
              onClick={() => {
                resetForm();
                // Set default adviser
                const advisers = users.filter(u => u.role === 'adviser');
                if (advisers.length > 0) {
                  setAdviserId(advisers[0].id);
                }
                setShowAddModal(true);
              }}
              className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-850/10 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Archive New Manuscript
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <Landmark className="h-4 w-4 text-slate-400" />
            <span>NORMI Library Digitization</span>
          </div>
        </div>
      </div>

      {/* Grid: Search, Filters, and Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Filters Panel */}
        <aside className="lg:col-span-3 space-y-4 bg-white p-4 rounded-xl border border-slate-150 shadow-sm h-fit">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Search Filters</span>
          </div>

          <div className="space-y-3">
            {/* Department */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setSelectedCourse('all'); }}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Degree Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Courses</option>
                {courses
                  .filter(c => selectedDept === 'all' || c.departmentId === selectedDept)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                }
              </select>
            </div>

            {/* School Year */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Academic Year</label>
              <select
                value={selectedSY}
                onChange={(e) => setSelectedSY(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All School Years</option>
                {schoolYears.map(sy => (
                  <option key={sy.id} value={sy.id}>{sy.name}</option>
                ))}
              </select>
            </div>

            {/* Keyword tag filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Index Keywords</label>
              <select
                value={selectedKeyword}
                onChange={(e) => setSelectedKeyword(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Keywords</option>
                {allKeywords.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {/* Reset Filters button */}
            <button
              onClick={() => {
                setSelectedDept('all');
                setSelectedCourse('all');
                setSelectedSY('all');
                setSelectedKeyword('all');
                setSearchTerm('');
              }}
              className="w-full py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </aside>

        {/* Right Column: Search Bar & Grid */}
        <section className="lg:col-span-9 space-y-4">
          
          {/* Search bar inputs */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by research keywords, manuscript title, authors, or abstracts..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Results count label */}
          <div className="flex justify-between items-center text-xs text-slate-500 pl-1">
            <span>Found <span className="font-bold text-slate-800">{filteredPapers.length}</span> published academic manuscripts</span>
          </div>

          {/* Document list Grid */}
          {filteredPapers.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <BookOpen className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No matching manuscripts archived.</p>
              <p className="text-[11px] text-slate-400">Try modifying search tags, courses, or school years.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPapers.map(paper => (
                <article 
                  key={paper.id} 
                  className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-4 hover:border-blue-200 hover:shadow-md transition-all"
                >
                  {/* Top line departments & details */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">
                      {getCourseCode(paper.courseId)}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-semibold">{getDepartmentName(paper.departmentId)}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{getSchoolYearName(paper.schoolYearId)}</span>
                  </div>

                  {/* Title & Abstract */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 leading-snug">
                      {paper.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {paper.abstract}
                    </p>
                  </div>

                  {/* Keywords Tagging */}
                  <div className="flex flex-wrap gap-1.5">
                    {paper.keywords?.map(k => (
                      <span 
                        key={k} 
                        onClick={() => setSelectedKeyword(k)}
                        className={`text-[9px] px-1.5 py-0.5 rounded-full border cursor-pointer font-mono font-medium transition-colors ${selectedKeyword === k ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'}`}
                      >
                        <Tag className="h-2 w-2 inline shrink-0 mr-0.5" />
                        {k}
                      </span>
                    ))}
                  </div>

                  {/* Card bottom bar: Adviser and interactions */}
                  <div className="border-t border-slate-100 pt-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-[11px] text-slate-500">
                      <span>Adviser: <strong className="text-slate-700">{getAdviserName(paper.adviserId)}</strong></span>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span title="Views count">
                          <Eye className="h-3 w-3 inline shrink-0 mr-0.5 text-slate-450" /> {paper.viewCount} views
                        </span>
                        <span title="Downloads count">
                          <Download className="h-3 w-3 inline shrink-0 mr-0.5 text-slate-450" /> {paper.downloadCount} dl
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePreview(paper)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" /> Preview
                        </button>
                        <button
                          onClick={() => handleDownload(paper)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-blue-800 hover:bg-blue-900 text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="h-3 w-3" /> Download
                        </button>
                        {user.role === 'admin' && (
                          <>
                            <button
                              onClick={() => openEditModal(paper)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit className="h-3 w-3" /> Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this manuscript from the institutional repository?")) {
                                  onDeletePaper(paper.id);
                                }
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Trash className="h-3 w-3" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* PDF DOCUMENT PREVIEW MODAL */}
      {previewingResearch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-150 w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-slate-100 px-5 py-3 border-b border-slate-850 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-blue-400" />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-blue-300">NORMI SECURE DIGITAL PDF VIEW</span>
                  <h3 className="text-xs font-bold truncate max-w-xl text-white">{previewingResearch.title}</h3>
                </div>
              </div>
              <button 
                onClick={() => setPreviewingResearch(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Document body columns */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex gap-6">
              {/* Simulated PDF Canvas */}
              <div className="flex-1 bg-white border border-slate-200 p-8 shadow-md rounded-lg max-w-2xl mx-auto space-y-6 select-none relative overflow-hidden">
                <div className="absolute inset-0 border-4 border-double border-slate-100 pointer-events-none m-2"></div>
                <div className="absolute inset-x-0 top-1/2 opacity-[0.03] text-center font-bold text-3xl font-serif text-slate-800 -rotate-45">
                  NORMI REPOSITORY SECURITIES
                </div>

                {/* Cover Header */}
                <div className="text-center space-y-2 pb-6 border-b border-dashed border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">Northern Mindanao Colleges, Inc.</span>
                  <h2 className="text-sm font-serif font-bold text-slate-800 leading-snug tracking-tight px-4">{previewingResearch.title}</h2>
                  <p className="text-[9px] text-slate-500 font-medium">A Capstone Research Project Submitted to the CIT Faculty Department</p>
                </div>

                {/* Abstract Text */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 font-serif border-b border-slate-100 pb-1 uppercase tracking-wider">Abstract</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed text-justify first-letter:text-xl first-letter:font-bold first-letter:text-blue-900">
                    {previewingResearch.abstract}
                  </p>
                </div>

                {/* Key components simulation details */}
                <div className="space-y-3 pt-4">
                  <h4 className="text-xs font-bold text-slate-700 font-serif border-b border-slate-100 pb-1 uppercase tracking-wider">Archived Metadata</h4>
                  <table className="w-full text-[10px] text-slate-500 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-700">Course / Class</td>
                        <td className="py-1.5">{getCourseCode(previewingResearch.courseId)} - IT Department</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-700">Adviser Designation</td>
                        <td className="py-1.5">{getAdviserName(previewingResearch.adviserId)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-700">School Term</td>
                        <td className="py-1.5">{getSchoolYearName(previewingResearch.schoolYearId)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 font-bold text-slate-700">Indexing Key Tags</td>
                        <td className="py-1.5">{previewingResearch.keywords.join(', ')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* PDF Signatures Footer */}
                <div className="pt-8 text-center text-[9px] text-slate-400 font-mono space-y-1">
                  <div className="flex justify-center items-center gap-1.5 text-emerald-600 font-bold">
                    <FileCheck className="h-3 w-3" />
                    <span>AUTHENTICATED BY THE NORMI CIT BOARD FOR REPOSITORY HARDBOUND</span>
                  </div>
                  <p>Certificate Serial ID: RMMS-{previewingResearch.id}-SECURE-CERT</p>
                </div>
              </div>

              {/* Sidebar helper of Document Viewer */}
              <div className="w-64 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between shadow-sm hidden md:flex shrink-0">
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-800 font-bold uppercase tracking-wider text-[10px] border-b pb-1.5">
                    <FileText className="h-4 w-4" />
                    <span>Securities Verified</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This document has been fully checked, revisions addressed, panelists evaluated, and is archived under lock-and-key on the NORMI system.
                  </p>

                  <div className="space-y-1 bg-white p-2.5 border rounded-lg text-[10px]">
                    <span className="block text-slate-400 font-semibold uppercase">Document Statistics</span>
                    <span className="block text-slate-700 font-mono">Views: {previewingResearch.viewCount} reads</span>
                    <span className="block text-slate-700 font-mono">Downloads: {previewingResearch.downloadCount} prints</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleDownload(previewingResearch)}
                    className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> Download Full PDF
                  </button>
                  <button
                    onClick={() => setPreviewingResearch(null)}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-medium py-1.5 px-3 rounded-lg cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MANUSCRIPT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleAddSubmit}
            className="bg-white rounded-xl border border-slate-150 w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-serif">
                <Plus className="h-4.5 w-4.5 text-blue-700" />
                Archive Completed Manuscript
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded border">
              Add a fully vetted research paper directly to the institution's public digital search indexes.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Research Thesis Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  placeholder="e.g., Development of an Advanced Automated Enrollment System"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Thesis Abstract</label>
                <textarea
                  rows={4}
                  required
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  placeholder="Summarize the core research scope, methodologies, findings, and systems built..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Course Program</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">School Year</label>
                  <select
                    value={schoolYearId}
                    onChange={(e) => setSchoolYearId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {schoolYears.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Adviser</label>
                  <select
                    value={adviserId}
                    onChange={(e) => setAdviserId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {users.filter(u => u.role === 'adviser').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Index Keywords (comma separated)</label>
                <input
                  type="text"
                  required
                  value={keywordsString}
                  onChange={(e) => setKeywordsString(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  placeholder="e.g., Automation, Enrollment, Database, React"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Archive Paper
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MANUSCRIPT MODAL */}
      {showEditModal && editingPaper && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleEditSubmit}
            className="bg-white rounded-xl border border-slate-150 w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-serif">
                <Edit className="h-4.5 w-4.5 text-blue-700" />
                Edit Manuscript Metadata
              </h3>
              <button 
                type="button" 
                onClick={() => { setShowEditModal(false); setEditingPaper(null); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded border">
              Modify index descriptors, title coordinates, or advising details for manuscript archive ID: <span className="font-mono font-bold text-blue-900">{editingPaper.id}</span>
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Research Thesis Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Thesis Abstract</label>
                <textarea
                  rows={4}
                  required
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Course Program</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">School Year</label>
                  <select
                    value={schoolYearId}
                    onChange={(e) => setSchoolYearId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {schoolYears.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Adviser</label>
                  <select
                    value={adviserId}
                    onChange={(e) => setAdviserId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {users.filter(u => u.role === 'adviser').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Index Keywords (comma separated)</label>
                <input
                  type="text"
                  required
                  value={keywordsString}
                  onChange={(e) => setKeywordsString(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setEditingPaper(null); }}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
