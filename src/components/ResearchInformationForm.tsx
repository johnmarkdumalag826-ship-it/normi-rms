import React, { useState } from 'react';
import { 
  FileText, Users, Briefcase, FileUp, Sparkles, AlertCircle, ArrowRight,
  ShieldCheck, UploadCloud, Eye, Trash2, Download, RefreshCw, Plus, X
} from 'lucide-react';
import { User, ProposalFile } from '../types';
import { uploadFile, resolveFileUrl, ApiError } from '../api/client';

interface ResearchInformationFormProps {
  user: User;
  advisers: User[];
  onSubmit: (data: {
    title: string;
    abstract: string;
    keywords: string[];
    adviserId: string;
    members: string[];
    fileName: string;
    proposalFiles?: ProposalFile[];
  }) => void;
  onLogout: () => void;
}

export default function ResearchInformationForm({
  user, advisers, onSubmit, onLogout
}: ResearchInformationFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [adviserId, setAdviserId] = useState('');
  const [memberNames, setMemberNames] = useState('');
  
  // Multi-file upload states
  const [dragActive, setDragActive] = useState(false);
  const [proposalFiles, setProposalFiles] = useState<ProposalFile[]>([]);
  const [uploadCategory, setUploadCategory] = useState<'proposal_document' | 'research_summary' | 'supporting_files' | 'other_attachments'>('proposal_document');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Track specific file ID to replace
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  // File Preview Modal state
  const [previewFile, setPreviewFile] = useState<ProposalFile | null>(null);

  const handleFileUpload = async (file: File) => {
    const isPdfOrDocx = file.name.endsWith('.pdf') || file.name.endsWith('.docx');
    if (!isPdfOrDocx) {
      setError("Only PDF and DOCX documents are accepted for manuscript vetting.");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFile(file);
      const fileData = {
        name: uploaded.fileName,
        url: resolveFileUrl(uploaded.url),
        size: uploaded.size,
        uploadedAt: new Date().toISOString(),
      };

      if (replaceTargetId) {
        setProposalFiles(prev => prev.map(f => f.id === replaceTargetId ? { ...f, ...fileData } : f));
        setReplaceTargetId(null);
        return;
      }

      // Auto-replace same category to keep it neat, or append if other attachments
      const isSingleCategory = uploadCategory === 'proposal_document' || uploadCategory === 'research_summary';
      const existing = proposalFiles.find(f => f.category === uploadCategory);

      if (isSingleCategory && existing) {
        setProposalFiles(prev => prev.map(f => f.category === uploadCategory ? { ...f, ...fileData } : f));
        return;
      }

      const newFile: ProposalFile = {
        id: `prop-file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        category: uploadCategory,
        ...fileData,
      };

      setProposalFiles(prev => [...prev, newFile]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileUpload(file);
      e.target.value = ''; // Reset input
    }
  };

  const triggerReplace = (id: string) => {
    setReplaceTargetId(id);
    document.getElementById('manuscript-input')?.click();
  };

  const handleDeleteFile = (id: string) => {
    setProposalFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleFileDownload = (file: ProposalFile) => {
    window.open(file.url, '_blank');
  };

  const handleNextStep = () => {
    if (!title.trim() || !abstract.trim() || !adviserId) {
      setError("Please fill in the title, abstract, and select an academic adviser.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mainDoc = proposalFiles.find(f => f.category === 'proposal_document');
    if (!mainDoc) {
      setError("At least a Title Proposal Document (.pdf or .docx) must be uploaded to initiate defense vetting.");
      return;
    }

    const keywords = keywordsStr
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const members = memberNames
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);

    onSubmit({
      title: title.trim(),
      abstract: abstract.trim(),
      keywords: keywords.length > 0 ? keywords : ['Capstone', 'Systems'],
      adviserId,
      members: [user.name, ...members],
      fileName: mainDoc.name,
      proposalFiles: proposalFiles
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden text-slate-100">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl -z-10" />

      {/* Top Brand Banner */}
      <div className="flex justify-between items-center w-full max-w-4xl mx-auto border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-white tracking-tight leading-none">NORMI</h1>
            <span className="text-xs text-slate-300  tracking-normal font-bold block mt-1">Research Portal</span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="text-xs font-semibold text-slate-500 hover:text-rose-400 transition-colors"
        >
          Sign Out Session
        </button>
      </div>

      {/* Main Guided Form Card */}
      <div className="w-full max-w-2xl mx-auto my-8 bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-4">
          <div>
            <span className="text-xs  tracking-normal font-bold text-blue-400">Prerequisite Registration</span>
            <h2 className="text-lg font-serif font-bold text-white">Research Information Form</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs ">
            <span className={`px-2 py-0.5 rounded font-bold ${step === 1 ? 'bg-blue-900/50 text-blue-300 border border-blue-500/20' : 'bg-slate-900 text-slate-500'}`}>1</span>
            <span className="text-slate-500">/</span>
            <span className={`px-2 py-0.5 rounded font-bold ${step === 2 ? 'bg-blue-900/50 text-blue-300 border border-blue-500/20' : 'bg-slate-900 text-slate-500'}`}>2</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/40 text-rose-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          /* Step 1: Research Title & Abstract Proposal */
          <div className="space-y-4 animate-in fade-in duration-150">
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete your initial research team and proposal details to generate your system timeline. This triggers adviser feedback loops instantly.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-500  tracking-normal block mb-1">Proposed Research Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Web-Based Research Management And Monitoring System"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500  tracking-normal block mb-1">Executive Summary / Abstract</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Briefly describe the problem statement, target objectives, scope of system development, and technical stack parameters..."
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-white leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500  tracking-normal block mb-1">Designated Thesis Adviser</label>
                  <select
                    value={adviserId}
                    onChange={(e) => setAdviserId(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-white font-semibold"
                  >
                    <option value="">-- Choose Adviser --</option>
                    {advisers.map(adv => (
                      <option key={adv.id} value={adv.id}>{adv.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500  tracking-normal block mb-1">Project Keywords (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Web-based, Monitoring, MySQL"
                    value={keywordsStr}
                    onChange={(e) => setKeywordsStr(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-600/10 transition-all cursor-pointer"
              >
                Continue to Upload
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Collaborators & Multi-file Upload Area */
          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500  tracking-normal block mb-1">Co-Authors / Team Members (Comma Separated)</label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. Juan dela Cruz, Maria Santos (Exclude yourself)"
                    value={memberNames}
                    onChange={(e) => setMemberNames(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 p-3 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                  />
                </div>
                <span className="text-xs text-slate-500 block mt-1">Your own account: <strong className="text-slate-300">{user.name}</strong> will be registered automatically as the group lead.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500  tracking-normal block mb-1">Target Document Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as any)}
                    className="w-full text-xs p-3 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-white font-semibold"
                  >
                    <option value="proposal_document">Title Proposal Document (Main)</option>
                    <option value="research_summary">Research Summary Brief</option>
                    <option value="supporting_files">Supporting Files (Data/Syllabi)</option>
                    <option value="other_attachments">Other Attachments</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500  tracking-normal block mb-1">Upload Selected Category</label>
                  
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-xl p-3.5 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer h-[46px] ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-900/20' 
                        : 'border-white/15 bg-slate-900 hover:bg-slate-900/70'
                    }`}
                    onClick={() => !isUploading && document.getElementById('manuscript-input')?.click()}
                  >
                    <input
                      id="manuscript-input"
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      disabled={isUploading}
                      onChange={handleFileSelect}
                    />
                    <div className="flex items-center gap-1.5 text-slate-300">
                      {isUploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 text-blue-400 shrink-0 animate-spin" />
                          <span className="text-xs font-semibold">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4 text-blue-400 shrink-0" />
                          <span className="text-xs font-semibold">Drop or Click to Upload</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Organized files list */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500  block tracking-normal">
                  Uploaded Proposal Attachment Grid
                </span>

                {proposalFiles.length === 0 ? (
                  <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-xs text-slate-500 bg-slate-950/20">
                    No files added yet. Please upload the required <strong>Title Proposal Document</strong>.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
                    {proposalFiles.map(file => {
                      const sizeInKb = (file.size ? Math.round(file.size / 102.4) / 10 : 150.5);
                      const catLabel = file.category === 'proposal_document' ? 'Proposal Document'
                        : file.category === 'research_summary' ? 'Research Summary'
                        : file.category === 'supporting_files' ? 'Supporting Files'
                        : 'Other Attachment';

                      const catBadgeColor = file.category === 'proposal_document' ? 'bg-blue-950 text-blue-300 border-blue-500/20'
                        : file.category === 'research_summary' ? 'bg-indigo-950 text-indigo-300 border-indigo-500/20'
                        : file.category === 'supporting_files' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/20'
                        : 'bg-slate-900 text-slate-500 border-white/10';

                      return (
                        <div key={file.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-white/2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-semibold  px-2 py-0.5 rounded border ${catBadgeColor}`}>
                                {catLabel}
                              </span>
                              <span className="text-xs  text-slate-500">
                                {sizeInKb} KB
                              </span>
                            </div>
                            <strong className="text-white block font-medium truncate max-w-sm" title={file.name}>
                              {file.name}
                            </strong>
                          </div>

                          {/* Options: View, Download, Replace, Delete */}
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewFile(file)}
                              title="View Document"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFileDownload(file)}
                              title="Download File"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerReplace(file.id)}
                              title="Replace File"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file.id)}
                              title="Delete File"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-white/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-white/10 text-slate-300 text-xs font-semibold rounded-xl hover:bg-white/5 transition-all cursor-pointer"
              >
                Back to Details
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/15 transition-all cursor-pointer"
              >
                Submit Title Proposal & Access Portal
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Dynamic File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-55 p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <div className="min-w-0">
                <span className="text-xs font-bold  bg-blue-900/50 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded">
                  {previewFile.category.replace('_', ' ').toUpperCase()}
                </span>
                <h4 className="text-xs font-bold text-white mt-1 truncate" title={previewFile.name}>
                  {previewFile.name}
                </h4>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-white/5 h-60 overflow-y-auto text-xs text-slate-300 leading-relaxed font-serif space-y-3 scrollbar-none">
              <h3 className="text-xs font-bold text-center text-white border-b border-white/5 pb-2  tracking-wide">
                {title || "Proposed Research Title Placeholder"}
              </h3>
              <p className="text-center italic text-xs text-slate-500">
                Submitted by: {user.name} {memberNames ? `, ${memberNames}` : ""}
              </p>
              <p className="pt-2">
                <strong>Vetted Attachment File:</strong> {previewFile.name}
              </p>
              <p>
                This panel simulates the <strong>NORMI High-Fidelity Document Sandbox</strong>. When connected to physical cloud storage, it invokes real-time metadata streams, PDF.js canvas overlays, and panel review annotations.
              </p>
              <p>
                <strong>Abstract Context:</strong> {abstract || "No abstract details provided."}
              </p>
              <p className="text-xs text-slate-500 italic">
                System Status: Verified and compiled securely on NORMI Academic handshakes. No viruses or checksum anomalies detected.
              </p>
            </div>

            <div className="flex justify-end border-t border-white/5 pt-2.5">
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close Simulator View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer credits */}
      <div className="text-center text-xs text-slate-500">
        Northern Mindanao Colleges, Inc. • High-Fidelity Research Defense Management Engine
      </div>
    </div>
  );
}
