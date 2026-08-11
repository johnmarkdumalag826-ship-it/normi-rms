import React, { useState } from 'react';
import { 
  Users, CheckCircle2, Calendar, Megaphone, 
  Trash, ShieldCheck, Send, FileText
} from 'lucide-react';
import { User, Research, Announcement, Room } from '../types';

interface DashboardCoordinatorProps {
  user: User;
  researchList: Research[];
  announcements: Announcement[];
  rooms: Room[];
  users: User[];
  onAddAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onApproveManuscript: (id: string, approve: boolean) => void;
}

export default function DashboardCoordinator({
  user, researchList, announcements, rooms, users,
  onAddAnnouncement, onDeleteAnnouncement, onApproveManuscript
}: DashboardCoordinatorProps) {
  
  // Announcement States
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState<'general' | 'defense' | 'deadline'>('general');
  const [annIsPinned, setAnnIsPinned] = useState(false);

  // Statistics
  const totalStudents = users.filter(u => u.role === 'student').length;
  const pendingCoordinatorApproval = researchList.filter(r => r.status === 'Approved by Adviser').length;
  const totalApprovedArchives = researchList.filter(r => r.status === 'Completed' || r.status === 'Archived').length;
  const scheduledDefensesCount = researchList.filter(r => r.status === 'Scheduled').length;

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;

    onAddAnnouncement({
      id: `ann-${Date.now()}`,
      title: annTitle,
      content: annContent,
      authorName: user.name,
      isPinned: annIsPinned,
      category: annCategory,
      createdAt: new Date().toISOString()
    });

    setAnnTitle('');
    setAnnContent('');
    setAnnIsPinned(false);
  };

  const getAdviserName = (adviserId: string) => {
    const u = users.find(x => x.id === adviserId);
    return u ? u.name : 'Unassigned';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider font-sans">Registered Teams</span>
            <span className="text-sm font-extrabold text-slate-800">{totalStudents} active teams</span>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider font-sans">Vetted by Advisers</span>
            <span className="text-sm font-extrabold text-slate-800">{pendingCoordinatorApproval} papers ready</span>
          </div>
        </div>

        {/* Approved and Archived */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider font-sans">Archived in Repository</span>
            <span className="text-sm font-extrabold text-slate-800">{totalApprovedArchives} publications</span>
          </div>
        </div>

        {/* Defense Scheduled */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider font-sans">Defense Schedules</span>
            <span className="text-sm font-extrabold text-slate-800">{scheduledDefensesCount} slots locked</span>
          </div>
        </div>
      </div>

      {/* Title Header */}
      <div className="border-b border-slate-200 flex justify-between items-center pb-2.5">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Coordinator Control Workspace
        </h2>
        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Research Coordinator</span>
      </div>

      {/* Release Pipelines & Bulletins Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Submission Coordinator panel */}
        <section className="lg:col-span-8 space-y-6">
          
          {/* Adviser-approved release grid */}
          <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-150 px-5 py-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                Adviser Vetted Release Pipeline
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {researchList.filter(r => r.status === 'Approved by Adviser' || r.status === 'Pending Coordinator').length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No adviser-approved manuscripts are currently awaiting coordinator release parameters.
                </div>
              ) : (
                researchList
                  .filter(r => r.status === 'Approved by Adviser' || r.status === 'Pending Coordinator')
                  .map(res => (
                    <div key={res.id} className="p-5 hover:bg-slate-50/20 transition-colors space-y-2.5">
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-mono font-bold px-2 py-0.25 rounded uppercase">
                            Adviser Approved
                          </span>
                          <h4 className="text-xs font-bold text-slate-850 leading-snug">{res.title}</h4>
                        </div>

                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => onApproveManuscript(res.id, true)}
                            className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-1 px-2.5 text-[10px] rounded cursor-pointer transition-colors"
                          >
                            Mark Scheduled
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-mono">
                        <span>Adviser: <strong className="text-slate-700">{getAdviserName(res.adviserId)}</strong></span>
                        <span>•</span>
                        <span>Keywords: {res.keywords.slice(0, 3).join(', ')}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Active Announcements bulletin directory */}
          <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-150 px-5 py-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Pin bulletins</h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {announcements.length === 0 ? (
                <div className="p-8 text-center text-slate-450 text-xs">
                  No bulletins published yet. Use the right panel to publish rules and schedules.
                </div>
              ) : (
                announcements.map(ann => (
                  <div key={ann.id} className="p-4 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold uppercase border bg-slate-50 px-1.5 py-0.25 rounded">
                          {ann.category}
                        </span>
                        {ann.isPinned && (
                          <span className="font-mono text-[8px] bg-amber-50 text-amber-700 border border-amber-100 font-bold px-1.5 rounded">
                            PINNED
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">{ann.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{ann.content}</p>
                    </div>

                    <button
                      onClick={() => onDeleteAnnouncement(ann.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right Col: Announcements poster */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <Megaphone className="h-4.5 w-4.5 text-blue-700 animate-bounce" />
              Publish Bulletins
            </h3>

            <form onSubmit={handlePostAnnouncement} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bulletin Title</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Schedule of Proposal defense"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Announcement Body</label>
                <textarea
                  rows={4}
                  required
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Type important deadlines or rules here..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Category</label>
                  <select
                    value={annCategory}
                    onChange={(e) => setAnnCategory(e.target.value as any)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="defense">Defense</option>
                    <option value="deadline">Deadline</option>
                  </select>
                </div>

                <div className="flex items-center pt-5 pl-1">
                  <input
                    id="pin"
                    type="checkbox"
                    checked={annIsPinned}
                    onChange={(e) => setAnnIsPinned(e.target.checked)}
                    className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="pin" className="ml-1.5 text-[11px] text-slate-600 font-medium">
                    Pin Bulletin
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-blue-800/10 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Publish to Bulletins
              </button>
            </form>
          </div>
        </section>
      </div>

    </div>
  );
}
