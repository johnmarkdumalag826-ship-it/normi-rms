import React, { useMemo, useState } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Landmark, Users, User, ShieldCheck, 
  Video, Search, Tag, AlertTriangle, ChevronRight, BookOpen, Clock3,
  LayoutGrid, List, MapPin, ExternalLink, UserCheck, CheckCircle
} from 'lucide-react';
import { Schedule, Room, User as UserType, Research } from '../types';

interface DefenseSchedulesListProps {
  schedules: Schedule[];
  rooms: Room[];
  users: UserType[];
  researchList: Research[];
  currentUser: UserType;
}

export default function DefenseSchedulesList({
  schedules, rooms, users, researchList, currentUser
}: DefenseSchedulesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const getRoomName = (roomId: string) => {
    const r = rooms.find(x => x.id === roomId);
    return r ? r.name : 'Online Video Room';
  };

  const getRoomLocation = (roomId: string) => {
    const r = rooms.find(x => x.id === roomId);
    return r ? r.location : 'Google Meet Platform';
  };

  const getResearchTitle = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    return res ? res.title : 'Research Project';
  };

  const getAdviserName = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    if (!res) return 'Unassigned Adviser';
    const u = users.find(x => x.id === res.adviserId);
    return u ? u.name : 'Unassigned Adviser';
  };

  const getPanelistNames = (panelistIds: string[]) => {
    return panelistIds.map(pid => {
      const u = users.find(x => x.id === pid);
      return u ? u.name : 'Faculty Evaluator';
    });
  };

  const getStudentNames = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    if (!res) return 'No Authors';
    const students = res.studentIds.map(sid => {
      const u = users.find(x => x.id === sid);
      return u ? u.name : 'Unknown Student';
    });
    return students.join(', ');
  };

  // Check if a schedule belongs to the current user (if student, adviser, or panelist)
  const isMySchedule = (sched: Schedule) => {
    if (currentUser.role === 'coordinator' || currentUser.role === 'admin') return true;
    
    const res = researchList.find(r => r.id === sched.researchId);
    if (!res) return false;

    if (currentUser.role === 'student') {
      return res.studentIds.includes(currentUser.id);
    }
    if (currentUser.role === 'adviser') {
      return res.adviserId === currentUser.id;
    }
    if (currentUser.role === 'panelist') {
      return sched.panelistIds.includes(currentUser.id);
    }
    return false;
  };

  const filteredSchedules = useMemo(() => {
    return schedules
      .filter(sched => {
        const title = getResearchTitle(sched.researchId).toLowerCase();
        const students = getStudentNames(sched.researchId).toLowerCase();
        const adviser = getAdviserName(sched.researchId).toLowerCase();
        const roomName = getRoomName(sched.roomId).toLowerCase();
        const roomLoc = getRoomLocation(sched.roomId).toLowerCase();
        const query = searchQuery.toLowerCase();
        const matchQuery = title.includes(query) || students.includes(query) || adviser.includes(query) || roomName.includes(query) || roomLoc.includes(query);

        const matchType = typeFilter === 'all' || sched.type === typeFilter;
        const matchStatus = statusFilter === 'all' || sched.status === statusFilter;

        return matchQuery && matchType && matchStatus;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
  }, [schedules, searchQuery, typeFilter, statusFilter, researchList, users, rooms]);

  const mySchedules = useMemo(() => {
    return filteredSchedules.filter(isMySchedule);
  }, [filteredSchedules, currentUser, researchList]);

  const otherSchedules = useMemo(() => {
    return filteredSchedules.filter(s => !isMySchedule(s));
  }, [filteredSchedules, currentUser, researchList]);

  // Statistics calculation
  const stats = useMemo(() => {
    const active = schedules.filter(s => s.status === 'scheduled').length;
    const completed = schedules.filter(s => s.status === 'completed').length;
    const myCount = schedules.filter(isMySchedule).length;
    return { active, completed, myCount, total: schedules.length };
  }, [schedules, currentUser, researchList]);

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal ">Total Defenses</span>
            <span className="text-base font-extrabold text-slate-800">{stats.total} Sessions</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal ">Completed</span>
            <span className="text-base font-extrabold text-slate-800">{stats.completed} Presentations</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl">
            <Clock3 className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal ">Scheduled</span>
            <span className="text-base font-extrabold text-slate-800">{stats.active} Pending</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-800 rounded-xl">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal ">My Assignments</span>
            <span className="text-base font-extrabold text-slate-800">{stats.myCount} Slotted</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-sm flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by title, team members, adviser, or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 w-full"
            />
          </div>

          <div className="flex gap-2">
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
            >
              <option value="all">All Types</option>
              <option value="proposal">Proposal Defense</option>
              <option value="final">Final Defense</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg shrink-0 w-fit">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer ${
              viewMode === 'grid' ? 'bg-white shadow text-blue-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Card Feed</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer ${
              viewMode === 'table' ? 'bg-white shadow text-blue-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Table Registry</span>
          </button>
        </div>
      </div>

      {/* Render Content */}
      {viewMode === 'grid' ? (
        <div className="space-y-8">
          {/* My Assigned Defenses Panel */}
          {mySchedules.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-700 animate-pulse"></span>
                <h3 className="text-xs font-bold  tracking-normal text-blue-900">My Assigned Presentations</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {mySchedules.map(sched => (
                  <ScheduleCard 
                    key={sched.id} 
                    sched={sched} 
                    getRoomName={getRoomName}
                    getRoomLocation={getRoomLocation}
                    getResearchTitle={getResearchTitle}
                    getAdviserName={getAdviserName}
                    getPanelistNames={getPanelistNames}
                    getStudentNames={getStudentNames}
                    isHighlighted={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* General Calendar Directory */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold  tracking-normal text-slate-500">
                {currentUser.role === 'student' || currentUser.role === 'adviser' || currentUser.role === 'panelist' 
                  ? 'General Defense Calendar Feed' 
                  : 'Institutional Defense Registry'}
              </h3>
              <span className="text-xs text-slate-500  font-bold">
                Showing {otherSchedules.length} schedules
              </span>
            </div>

            {otherSchedules.length === 0 && mySchedules.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-450 text-xs">
                No confirmed defense sessions match your selected filter options.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {otherSchedules.map(sched => (
                  <ScheduleCard 
                    key={sched.id} 
                    sched={sched} 
                    getRoomName={getRoomName}
                    getRoomLocation={getRoomLocation}
                    getResearchTitle={getResearchTitle}
                    getAdviserName={getAdviserName}
                    getPanelistNames={getPanelistNames}
                    getStudentNames={getStudentNames}
                    isHighlighted={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Redesigned Table View */
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
          {filteredSchedules.length === 0 ? (
            <div className="p-12 text-center text-slate-450 text-xs">
              No confirmed defense sessions match your selected filter options.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-500  tracking-normal">
                    <th className="p-4">Type & Date</th>
                    <th className="p-4">Time & Venue</th>
                    <th className="p-4">Capstone Title & Team</th>
                    <th className="p-4">Adviser & Jury Panel</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchedules.map(sched => {
                    const isMySched = isMySchedule(sched);
                    const isOnline = sched.roomId === 'online' || !sched.roomId;
                    const typeLabel = sched.type === 'proposal' ? 'Proposal' : 'Final Defense';

                    const typeBadgeColor = sched.type === 'proposal' ? 'bg-blue-50 text-blue-800 border-blue-100'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-100';

                    return (
                      <tr 
                        key={sched.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isMySched ? 'bg-blue-50/10' : ''
                        }`}
                      >
                        {/* Type & Date */}
                        <td className="p-4 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-extrabold px-2 py-0.5 border rounded-lg  ${typeBadgeColor}`}>
                              {typeLabel}
                            </span>
                            {isMySched && (
                              <span className="text-xs bg-blue-700 text-white px-1.5 py-0.25 rounded font-bold ">
                                MY ASSIGNMENT
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                            <CalendarIcon className="h-3.5 w-3.5 text-slate-450" />
                            <span>{sched.date}</span>
                          </div>
                        </td>

                        {/* Time & Venue */}
                        <td className="p-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold ">
                            <Clock className="h-3.5 w-3.5 text-slate-450" />
                            <span>{sched.startTime} - {sched.endTime}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            {isOnline ? (
                              <Video className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <Landmark className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[150px] font-medium text-xs" title={getRoomName(sched.roomId)}>
                              {getRoomName(sched.roomId)}
                            </span>
                          </div>
                        </td>

                        {/* Capstone Title & Team */}
                        <td className="p-4 space-y-2 max-w-xs">
                          <h4 className="font-serif font-bold text-slate-800 line-clamp-2 leading-relaxed" title={getResearchTitle(sched.researchId)}>
                            {getResearchTitle(sched.researchId)}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-450 truncate" title={getStudentNames(sched.researchId)}>
                            <Users className="h-3.5 w-3.5 text-slate-350 shrink-0" />
                            <span className="font-medium">{getStudentNames(sched.researchId)}</span>
                          </div>
                        </td>

                        {/* Adviser & Jury Panel */}
                        <td className="p-4 space-y-2">
                          <div className="text-xs font-semibold text-slate-700">
                            <span className="text-xs  text-slate-500 block ">Adviser</span>
                            <span className="font-bold">{getAdviserName(sched.researchId)}</span>
                          </div>
                          <div>
                            <span className="text-xs  text-slate-500 block ">Jury Panel</span>
                            <span className="text-xs text-slate-600 font-medium line-clamp-1" title={getPanelistNames(sched.panelistIds).join(', ')}>
                              {getPanelistNames(sched.panelistIds).join(', ')}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          {sched.status === 'completed' && (
                            <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg font-bold ">
                              Completed
                            </span>
                          )}
                          {sched.status === 'cancelled' && (
                            <span className="text-xs bg-rose-50 text-rose-700 border border-rose-150 px-2 py-0.5 rounded-lg font-bold ">
                              Cancelled
                            </span>
                          )}
                          {sched.status === 'scheduled' && (
                            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-150 px-2 py-0.5 rounded-lg font-bold ">
                              Confirmed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Redesigned Single Schedule Card Sub-component
interface ScheduleCardProps {
  key?: string | number;
  sched: Schedule;
  getRoomName: (roomId: string) => string;
  getRoomLocation: (roomId: string) => string;
  getResearchTitle: (researchId: string) => string;
  getAdviserName: (researchId: string) => string;
  getPanelistNames: (panelistIds: string[]) => string[];
  getStudentNames: (researchId: string) => string;
  isHighlighted: boolean;
}

function ScheduleCard({
  sched, getRoomName, getRoomLocation, getResearchTitle, getAdviserName, getPanelistNames, getStudentNames, isHighlighted
}: ScheduleCardProps) {
  
  const isOnline = sched.roomId === 'online' || !sched.roomId;

  // Modern subtle thematic coloring depending on defense type
  const themeAccent = useMemo(() => {
    switch (sched.type) {
      case 'proposal':
        return {
          border: 'border-blue-150 hover:border-blue-300',
          badge: 'bg-blue-50 text-blue-800 border-blue-200',
          indicator: 'bg-blue-600',
          typeText: 'Proposal Defense'
        };
      case 'final':
        return {
          border: 'border-emerald-150 hover:border-emerald-300',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          indicator: 'bg-emerald-600',
          typeText: 'Final Capstone Defense'
        };
      default:
        const unhandledType: string = sched.type;
        return {
          border: 'border-slate-150 hover:border-slate-300',
          badge: 'bg-slate-50 text-slate-800 border-slate-200',
          indicator: 'bg-slate-500',
          typeText: unhandledType.toUpperCase()
        };
    }
  }, [sched.type]);

  return (
    <div className={`bg-white rounded-2xl border p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden ${
      isHighlighted 
        ? 'border-blue-300 ring-1 ring-blue-100 bg-gradient-to-br from-white to-blue-50/5' 
        : themeAccent.border
    }`}>
      {/* Visual Accent ribbon strip on the left margin */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${isHighlighted ? 'bg-blue-700' : themeAccent.indicator}`} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start pl-2">
        
        {/* Left column: Date/Time Slot (col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border  tracking-normal  ${themeAccent.badge}`}>
              {themeAccent.typeText}
            </span>

            {sched.status === 'completed' && (
              <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg font-bold ">
                Completed
              </span>
            )}
            {sched.status === 'cancelled' && (
              <span className="text-xs bg-rose-50 text-rose-700 border border-rose-150 px-2 py-0.5 rounded-lg font-bold ">
                Cancelled
              </span>
            )}
            {sched.status === 'scheduled' && (
              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-150 px-2 py-0.5 rounded-lg font-bold  animate-pulse">
                Scheduled
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-150/40">
            {/* Date block */}
            <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
              <CalendarIcon className="h-4.5 w-4.5 text-slate-500 shrink-0" />
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500 block   font-bold leading-none">Schedule Date</span>
                <span className="font-sans text-slate-800 font-bold">{sched.date}</span>
              </div>
            </div>

            {/* Time Block */}
            <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
              <Clock className="h-4.5 w-4.5 text-slate-500 shrink-0" />
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500 block   font-bold leading-none">Time Duration</span>
                <span className=" text-slate-800 font-bold">{sched.startTime} - {sched.endTime}</span>
              </div>
            </div>

            {/* Venue Block */}
            <div className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
              {isOnline ? (
                <Video className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              ) : (
                <Landmark className="h-4.5 w-4.5 text-slate-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-xs text-slate-500 block   font-bold leading-none">Presentation Venue</span>
                {isOnline ? (
                  <a 
                    href="https://meet.google.com/cit-capstone-session" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-800 hover:underline  text-xs break-all flex items-center gap-0.5 mt-0.5 font-bold"
                  >
                    <span>Google Meet Session</span>
                    <ExternalLink className="h-3 w-3 inline" />
                  </a>
                ) : (
                  <span className="text-slate-800 font-bold block truncate" title={`${getRoomName(sched.roomId)} (${getRoomLocation(sched.roomId)})`}>
                    {getRoomName(sched.roomId)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center column: Research Title and Authors (col-span-5) */}
        <div className="lg:col-span-5 space-y-4 border-t lg:border-t-0 lg:border-l lg:border-r border-slate-100 lg:px-5 pt-4 lg:pt-0">
          <div className="space-y-1">
            <span className="text-xs  font-bold text-slate-500 block tracking-normal ">Capstone Manuscript</span>
            <h4 className="text-xs font-bold text-slate-850 leading-relaxed font-serif " style={{ fontSize: '13px' }}>
              {getResearchTitle(sched.researchId)}
            </h4>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs  font-bold text-slate-500 block tracking-normal ">Authors / Research Team</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getStudentNames(sched.researchId).split(', ').map((student, sidx) => (
                <span key={sidx} className="bg-slate-50 text-slate-650 text-xs font-bold px-2.5 py-0.5 rounded-lg border border-slate-200">
                  {student}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Adviser and Committee Panelists (col-span-3) */}
        <div className="lg:col-span-3 space-y-4 pt-4 lg:pt-0">
          <div className="space-y-1.5">
            <span className="text-xs  font-bold text-slate-500 block  tracking-normal">Research Adviser</span>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500 shrink-0" />
              <p className="text-xs text-slate-700 font-bold truncate">{getAdviserName(sched.researchId)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs  font-bold text-slate-500 block  tracking-normal">Evaluation Panel jury</span>
            <div className="px-3 py-2.5 bg-blue-50/10 border border-blue-100/50 rounded-xl space-y-1.5">
              {getPanelistNames(sched.panelistIds).map((pname, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-slate-650 font-semibold min-w-0">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="truncate">{pname}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
