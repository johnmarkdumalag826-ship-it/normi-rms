import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Grid, Clock, Landmark, Users, ChevronLeft, 
  ChevronRight, AlertTriangle, ShieldCheck, Tag, Plus, Edit, Trash2, 
  X, CheckCircle, Video, UserPlus, Info, Save
} from 'lucide-react';
import { Schedule, Room, User, Research } from '../types';

interface SchedulerCalendarProps {
  schedules: Schedule[];
  rooms: Room[];
  users: User[];
  researchList: Research[];
  currentUser: User;
  onAddSchedule?: (sched: Schedule) => void;
  onUpdateSchedule?: (sched: Schedule) => void;
  onCancelSchedule?: (id: string) => void;
  onDeleteSchedule?: (id: string) => void;
  onUpdateResearchAdviser?: (researchId: string, adviserId: string) => void;
}

export default function SchedulerCalendar({
  schedules, rooms, users, researchList, currentUser,
  onAddSchedule, onUpdateSchedule, onCancelSchedule, onDeleteSchedule, onUpdateResearchAdviser
}: SchedulerCalendarProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 6)); // July 2026

  // Scheduling Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Form Field States
  const [formResearchId, setFormResearchId] = useState('');
  const [formType, setFormType] = useState('proposal');
  const [formDate, setFormDate] = useState('2026-07-06');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:30');
  const [formRoomId, setFormRoomId] = useState('');
  const [formMeetLink, setFormMeetLink] = useState('');
  const [formPanelistIds, setFormPanelistIds] = useState<string[]>([]);
  const [formAdviserId, setFormAdviserId] = useState('');
  const [formStatus, setFormStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');

  const registeredAdvisers = useMemo(() => users.filter(u => u.role === 'adviser'), [users]);
  const registeredPanelists = useMemo(() => users.filter(u => u.role === 'panelist'), [users]);

  const getRoomName = (roomId: string) => {
    if (roomId === 'online') return 'Online Video Conference';
    const r = rooms.find(x => x.id === roomId);
    return r ? `${r.name} (${r.location})` : 'Unknown Room';
  };

  const getResearchTitle = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    return res ? res.title : 'Research Project';
  };

  const getPanelistNames = (panelistIds: string[]) => {
    return panelistIds.map(pid => {
      const u = users.find(x => x.id === pid);
      return u ? u.name : 'Unknown Panelist';
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

  const getAdviserName = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    if (!res) return 'Not Assigned';
    const adviser = users.find(u => u.id === res.adviserId);
    return adviser ? adviser.name : 'Unknown Faculty';
  };

  const getResearchAdviserId = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    return res ? res.adviserId : '';
  };

  // Synchronize Adviser when a Research Project is selected in creation/editing
  const handleFormResearchChange = (id: string) => {
    setFormResearchId(id);
    const advId = getResearchAdviserId(id);
    setFormAdviserId(advId);
  };

  // Conflict Detector with detailed overlaps for double booking
  const schedulesWithValidation = useMemo(() => {
    return schedules.map(sched => {
      const conflicts: string[] = [];

      if (sched.status !== 'scheduled') return { ...sched, conflictsDetected: [] };

      // 1. Room Overlap Check
      schedules.forEach(other => {
        if (other.id !== sched.id && other.status === 'scheduled' && other.date === sched.date && other.roomId === sched.roomId && other.roomId !== 'online') {
          if (sched.startTime < other.endTime && sched.endTime > other.startTime) {
            const otherRoom = rooms.find(r => r.id === sched.roomId)?.name || 'Same Room';
            conflicts.push(`Room Overlap: Double-booking in ${otherRoom} with "${getResearchTitle(other.researchId).substring(0, 25)}..."`);
          }
        }
      });

      // 2. Panelist Overlap Check
      sched.panelistIds.forEach(pid => {
        schedules.forEach(other => {
          if (other.id !== sched.id && other.status === 'scheduled' && other.date === sched.date && other.panelistIds.includes(pid)) {
            if (sched.startTime < other.endTime && sched.endTime > other.startTime) {
              const panName = users.find(u => u.id === pid)?.name || 'Panelist';
              conflicts.push(`Panelist Conflict: ${panName} is double-booked for defense "${getResearchTitle(other.researchId).substring(0, 25)}..."`);
            }
          }
        });
      });

      // 3. Student Overlap Check
      const currentRes = researchList.find(r => r.id === sched.researchId);
      if (currentRes) {
        currentRes.studentIds.forEach(sid => {
          schedules.forEach(other => {
            if (other.id !== sched.id && other.status === 'scheduled' && other.date === sched.date) {
              const otherRes = researchList.find(r => r.id === other.researchId);
              if (otherRes && otherRes.studentIds.includes(sid)) {
                if (sched.startTime < other.endTime && sched.endTime > other.startTime) {
                  const studName = users.find(u => u.id === sid)?.name || 'Student';
                  conflicts.push(`Student Overlap: Author ${studName} is scheduled for another defense simultaneously.`);
                }
              }
            }
          });
        });
      }

      return {
        ...sched,
        conflictsDetected: conflicts
      };
    });
  }, [schedules, rooms, users, researchList]);

  // Real-time Conflict checking for current Form entry parameters
  const currentFormConflicts = useMemo(() => {
    if (!formResearchId || !formDate || !formStartTime || !formEndTime) return [];
    
    const conflicts: string[] = [];

    // 1. Room overlap
    if (formRoomId && formRoomId !== 'online') {
      schedules.forEach(other => {
        if (other.id !== editingScheduleId && other.status === 'scheduled' && other.date === formDate && other.roomId === formRoomId) {
          if (formStartTime < other.endTime && formEndTime > other.startTime) {
            const rName = rooms.find(r => r.id === formRoomId)?.name || 'Same Room';
            conflicts.push(`Room Double Booking: The room "${rName}" is already scheduled for another defense during this timeslot.`);
          }
        }
      });
    }

    // 2. Panelist overlap
    formPanelistIds.forEach(pid => {
      schedules.forEach(other => {
        if (other.id !== editingScheduleId && other.status === 'scheduled' && other.date === formDate && other.panelistIds.includes(pid)) {
          if (formStartTime < other.endTime && formEndTime > other.startTime) {
            const pName = users.find(u => u.id === pid)?.name || 'Panel member';
            conflicts.push(`Panel member Conflict: ${pName} is already assigned to a simultaneous presentation.`);
          }
        }
      });
    });

    // 3. Student overlap
    const currentRes = researchList.find(r => r.id === formResearchId);
    if (currentRes) {
      currentRes.studentIds.forEach(sid => {
        schedules.forEach(other => {
          if (other.id !== editingScheduleId && other.status === 'scheduled' && other.date === formDate) {
            const otherRes = researchList.find(r => r.id === other.researchId);
            if (otherRes && otherRes.studentIds.includes(sid)) {
              if (formStartTime < other.endTime && formEndTime > other.startTime) {
                const sName = users.find(u => u.id === sid)?.name || 'Student';
                conflicts.push(`Student Double Booking: Presenter "${sName}" is scheduled for another defense at this exact time.`);
              }
            }
          }
        });
      });
    }

    return conflicts;
  }, [formResearchId, formDate, formStartTime, formEndTime, formRoomId, formPanelistIds, editingScheduleId, schedules, rooms, users, researchList]);

  const filteredSchedules = useMemo(() => {
    return schedulesWithValidation.filter(sched => {
      return selectedRoom === 'all' || sched.roomId === selectedRoom;
    });
  }, [schedulesWithValidation, selectedRoom]);

  // July 2026 Monthly Grid Builder
  const daysInJuly2026 = useMemo(() => {
    const days = [];
    const firstDayIndex = 3; // Wednesday July 1 2026
    
    // Previous Month fillers
    for (let i = 28; i <= 30; i++) {
      days.push({ day: i, month: 5, year: 2026, isFiller: true });
    }

    // July Days
    for (let i = 1; i <= 31; i++) {
      const dateStr = `2026-07-${i.toString().padStart(2, '0')}`;
      const daySchedules = filteredSchedules.filter(s => s.date === dateStr);
      days.push({
        day: i,
        month: 6,
        year: 2026,
        dateStr,
        schedules: daySchedules,
        isFiller: false
      });
    }

    // Next Month fillers
    for (let i = 1; i <= 8; i++) {
      days.push({ day: i, month: 7, year: 2026, isFiller: true });
    }

    return days;
  }, [filteredSchedules]);

  // Open creation modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingScheduleId(null);
    setFormResearchId(researchList[0]?.id || '');
    setFormType('proposal');
    setFormDate('2026-07-06');
    setFormStartTime('09:00');
    setFormEndTime('10:30');
    setFormRoomId(rooms[0]?.id || 'online');
    setFormMeetLink('');
    setFormPanelistIds(registeredPanelists.slice(0, 3).map(p => p.id));
    setFormAdviserId(researchList[0] ? getResearchAdviserId(researchList[0].id) : '');
    setFormStatus('scheduled');
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEditModal = (sched: Schedule) => {
    setModalMode('edit');
    setEditingScheduleId(sched.id);
    setFormResearchId(sched.researchId);
    setFormType(sched.type);
    setFormDate(sched.date);
    setFormStartTime(sched.startTime);
    setFormEndTime(sched.endTime);
    setFormRoomId(sched.roomId);
    setFormMeetLink(sched.roomId === 'online' ? 'https://meet.google.com/cit-capstone-session' : '');
    setFormPanelistIds(sched.panelistIds);
    setFormAdviserId(getResearchAdviserId(sched.researchId));
    setFormStatus(sched.status);
    setShowModal(true);
  };

  // Panelist select toggle
  const handleTogglePanelist = (panelistId: string) => {
    setFormPanelistIds(prev => {
      if (prev.includes(panelistId)) {
        return prev.filter(id => id !== panelistId);
      } else {
        return [...prev, panelistId];
      }
    });
  };

  // Submit Modal form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formResearchId || !formDate || !formStartTime || !formEndTime) return;

    if (modalMode === 'create' && onAddSchedule) {
      const newSchedule: Schedule = {
        id: `sched-${Date.now()}`,
        researchId: formResearchId,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        roomId: formRoomId,
        panelistIds: formPanelistIds,
        status: formStatus,
        type: formType as any
      };
      
      // Update designated adviser if changed
      if (formAdviserId && onUpdateResearchAdviser) {
        onUpdateResearchAdviser(formResearchId, formAdviserId);
      }
      
      onAddSchedule(newSchedule);
    } else if (modalMode === 'edit' && editingScheduleId && onUpdateSchedule) {
      const updatedSchedule: Schedule = {
        id: editingScheduleId,
        researchId: formResearchId,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        roomId: formRoomId,
        panelistIds: formPanelistIds,
        status: formStatus,
        type: formType as any
      };

      // Update designated adviser if changed
      if (formAdviserId && onUpdateResearchAdviser) {
        onUpdateResearchAdviser(formResearchId, formAdviserId);
      }

      onUpdateSchedule(updatedSchedule);
    }

    setShowModal(false);
  };

  // Quick cancel schedule handler
  const handleCancelClick = (id: string) => {
    if (onCancelSchedule) {
      if (confirm("Are you sure you want to cancel this scheduled presentation session?")) {
        onCancelSchedule(id);
      }
    }
  };

  // Quick delete schedule handler
  const handleDeleteClick = (id: string) => {
    if (onDeleteSchedule) {
      if (confirm("Permanently delete this schedule slot? This operation is irreversible.")) {
        onDeleteSchedule(id);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls with action trigger */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-850" />
            Defense Scheduling Calendar
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Institutional scheduling, workspace conflict validation, and session release panel.
          </p>
        </div>

        {/* Filters & Manage buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {onAddSchedule && (
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-800 hover:bg-blue-900 text-white font-bold px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Schedule Defense Session
            </button>
          )}

          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-600"
          >
            <option value="all">All Locations</option>
            <option value="online">Online Conferencing</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${viewMode === 'month' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-505 hover:text-slate-700'}`}
            >
              Calendar Grid
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${viewMode === 'week' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-505 hover:text-slate-700'}`}
            >
              Sessions Index
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
          {/* Calendar Month Header bar */}
          <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-150 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 font-mono tracking-wider">JULY 2026</h3>
            <div className="flex gap-1.5">
              <button className="p-1 rounded border border-slate-200 bg-white text-slate-400 cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="p-1 rounded border border-slate-200 bg-white text-slate-400 cursor-not-allowed">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Days labels */}
          <div className="grid grid-cols-7 border-b border-slate-100 text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-150 border-b border-r border-slate-150 max-h-[520px] overflow-y-auto">
            {daysInJuly2026.map((dayObj, idx) => (
              <div 
                key={idx} 
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${dayObj.isFiller ? 'bg-slate-50/60 text-slate-300' : 'bg-white hover:bg-slate-50/40'} ${dayObj.dateStr === '2026-07-06' ? 'bg-blue-50/20' : ''}`}
              >
                {/* Centered Date Number */}
                <div className="flex flex-col items-center justify-center pt-1 pb-1">
                  <span className={`text-xs font-mono font-extrabold flex items-center justify-center h-6 w-6 rounded-full transition-all ${
                    dayObj.dateStr === '2026-07-06' 
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-100' 
                      : dayObj.isFiller 
                        ? 'text-slate-300' 
                        : 'text-slate-700'
                  }`}>
                    {dayObj.day}
                  </span>
                  {!dayObj.isFiller && dayObj.schedules && dayObj.schedules.length > 0 && (
                    <span className="text-[8px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1 py-0.25 rounded mt-1">
                      {dayObj.schedules.length} {dayObj.schedules.length === 1 ? 'Defense' : 'Defenses'}
                    </span>
                  )}
                </div>

                {/* Day events visual preview with Quick Edit callback click */}
                <div className="flex-1 mt-1.5 space-y-1 overflow-y-auto">
                  {!dayObj.isFiller && dayObj.schedules?.map(sched => {
                    const hasConflicts = sched.conflictsDetected && sched.conflictsDetected.length > 0;
                    return (
                      <button 
                        key={sched.id}
                        onClick={() => handleOpenEditModal(sched)}
                        className={`w-full text-left p-1 rounded text-[8px] font-semibold font-mono border block transition-all hover:scale-[1.02] ${
                          hasConflicts 
                            ? 'bg-rose-50 text-rose-750 border-rose-200 hover:bg-rose-100' 
                            : sched.status === 'completed' 
                              ? 'bg-slate-50 text-slate-500 border-slate-200' 
                              : sched.status === 'cancelled'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 line-through'
                                : 'bg-blue-50 text-blue-800 border-blue-150 hover:bg-blue-100'
                        }`}
                        title={`${getResearchTitle(sched.researchId)} (Click to edit/re-schedule)`}
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span>{sched.startTime}</span>
                          {hasConflicts && <AlertTriangle className="h-2.5 w-2.5 text-rose-600 animate-bounce" />}
                        </div>
                        <div className="truncate font-sans mt-0.5 font-bold">
                          {getResearchTitle(sched.researchId)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Agenda Feed List View with Management Triggers */
        <div className="space-y-4">
          {filteredSchedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs">
              No scheduled presentation slots matched the selected room filters.
            </div>
          ) : (
            filteredSchedules.map(sched => {
              const hasConflicts = sched.conflictsDetected && sched.conflictsDetected.length > 0;
              return (
                <div 
                  key={sched.id} 
                  className={`bg-white rounded-xl border p-5 shadow-sm space-y-4 transition-all hover:shadow-md ${hasConflicts ? 'border-rose-300 bg-rose-50/10' : 'border-slate-150'}`}
                >
                  {/* Validation Alerts Banner */}
                  {hasConflicts && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>RELATIONAL INTEGRITY SCHEDULING CONFLICT DETECTED!</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {sched.conflictsDetected?.map((conf, cidx) => (
                          <li key={cidx}>{conf}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Header info */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded font-bold uppercase">
                        {sched.type === 'proposal' ? 'Proposal Defense' : sched.type === 'final' ? 'Final Defense' : sched.type.replace('_', ' ')}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500 font-semibold flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                        {sched.date} • {sched.startTime} - {sched.endTime}
                      </span>
                      {sched.status === 'cancelled' && (
                        <span className="text-[9px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold font-mono">
                          CANCELLED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(sched)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded border border-slate-200 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title="Edit Defense Settings"
                      >
                        <Edit className="h-3 w-3" />
                        Edit / Reschedule
                      </button>
                      {sched.status !== 'cancelled' && onCancelSchedule && (
                        <button
                          onClick={() => handleCancelClick(sched.id)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-200 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                          title="Mark Cancelled"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </button>
                      )}
                      {onDeleteSchedule && (
                        <button
                          onClick={() => handleDeleteClick(sched.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded border border-rose-150 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                          title="Delete Permanently"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thesis Title */}
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Research Under Defense</span>
                    <h3 className="text-sm font-bold text-slate-800">{getResearchTitle(sched.researchId)}</h3>
                  </div>

                  {/* Group authors and Panelists list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="space-y-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Research Authors & Adviser</span>
                      <p className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                        <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {getStudentNames(sched.researchId)}
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        Adviser: <strong className="text-slate-600">{getAdviserName(sched.researchId)}</strong>
                      </span>
                    </div>

                    <div className="space-y-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Assigned Panel Committee</span>
                      <div className="space-y-0.5">
                        {getPanelistNames(sched.panelistIds).map((pname, index) => (
                          <p key={index} className="font-semibold text-slate-700 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                            {pname}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card footer: room */}
                  <div className="border-t border-slate-100 pt-3 flex flex-wrap justify-between items-center text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Landmark className="h-4 w-4 text-slate-400" />
                      <span>Scheduled venue: <strong className="text-slate-700 font-mono">{getRoomName(sched.roomId)}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold font-mono">
                      {hasConflicts ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Conflict Flags Active</span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> Conflict Free
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Creation and Modification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-150 px-5 py-3.5 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <CalendarIcon className="h-4.5 w-4.5 text-blue-800" />
                {modalMode === 'create' ? 'Create Defense Schedule' : 'Modify Defense Schedule'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-405 hover:text-slate-600 p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              
              {/* Dynamic Warning Alerts inside Modal */}
              {currentFormConflicts.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg flex flex-col gap-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1 font-bold text-rose-900">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>OVERLAP DETECTED IN SELECTED PARAMETERS!</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 font-semibold">
                    {currentFormConflicts.map((conf, cidx) => (
                      <li key={cidx}>{conf}</li>
                    ))}
                  </ul>
                  <span className="text-[9px] text-rose-500 mt-1 block">Scheduling overlaps can cause faculty and room double bookings.</span>
                </div>
              )}

              {/* Research Group selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Assigned Research Team</label>
                <select
                  required
                  value={formResearchId}
                  onChange={(e) => handleFormResearchChange(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                >
                  <option value="" disabled>Select Research Group</option>
                  {researchList.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title.substring(0, 50)}... ({getStudentNames(r.id)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Defense Type */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Defense Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 text-ellipsis"
                  >
                    <option value="title_proposal">Title Proposal</option>
                    <option value="proposal">Proposal Defense</option>
                    <option value="mock_defense">Mock Defense</option>
                    <option value="final">Final Defense</option>
                  </select>
                </div>

                {/* Status Selection (only for Edit mode) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Defense Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                  >
                    <option value="scheduled">Scheduled (Confirmed)</option>
                    <option value="completed">Completed (Graded)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Date & Timeslot */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date</label>
                  <input
                    required
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-semibold text-slate-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Start Time</label>
                  <input
                    required
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-semibold text-slate-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">End Time</label>
                  <input
                    required
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-semibold text-slate-700"
                  />
                </div>
              </div>

              {/* Venue Selection & Online Meeting Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Venue / Presentation Room</label>
                  <select
                    value={formRoomId}
                    onChange={(e) => setFormRoomId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                  >
                    <option value="online">Online Video Conference</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} - {r.location}</option>
                    ))}
                  </select>
                </div>

                {/* Adviser Assignment */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Designated Adviser</label>
                  <select
                    required
                    value={formAdviserId}
                    onChange={(e) => setFormAdviserId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                  >
                    <option value="" disabled>Assign Research Adviser</option>
                    {registeredAdvisers.map(adv => (
                      <option key={adv.id} value={adv.id}>{adv.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formRoomId === 'online' && (
                <div className="animate-in fade-in">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Video Call Link</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    value={formMeetLink}
                    onChange={(e) => setFormMeetLink(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
                  />
                </div>
              )}

              {/* Panel Committee Assignment */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Assign Panel Members</label>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${formPanelistIds.length === 3 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>
                    Selected: {formPanelistIds.length} of 3 required
                  </span>
                </div>
                
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 max-h-[140px] overflow-y-auto grid grid-cols-2 gap-2">
                  {registeredPanelists.map(pan => {
                    const isChecked = formPanelistIds.includes(pan.id);
                    return (
                      <button
                        key={pan.id}
                        type="button"
                        onClick={() => handleTogglePanelist(pan.id)}
                        className={`text-left p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-blue-50 border-blue-200 text-blue-900 ring-1 ring-blue-100' 
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] font-bold ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {isChecked && '✓'}
                        </span>
                        <span className="truncate">{pan.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal footer */}
              <div className="border-t border-slate-150 pt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formPanelistIds.length !== 3}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                    formPanelistIds.length === 3 
                      ? 'bg-blue-800 hover:bg-blue-900' 
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Save className="h-3.5 w-3.5" />
                  {modalMode === 'create' ? 'Save Schedule' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
