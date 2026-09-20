import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Clock, Landmark, Users, ChevronLeft, ChevronRight, AlertTriangle,
  ShieldCheck, Plus, Pencil, Trash2, Ban, List, Grid3x3,
} from 'lucide-react';
import { Schedule, Room, User, Research } from '../types';
import {
  Alert, Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, Input, Modal, PageHeader, Select, StatusBadge,
  cx, defenseTypeLabels, formatDate, formatDateLong, formatDateAndTime, formatTime, scheduleStatus,
} from '../ui';

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

// 'YYYY-MM-DD' in the person's own time zone
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulerCalendar({
  schedules, rooms, users, researchList, currentUser,
  onAddSchedule, onUpdateSchedule, onCancelSchedule, onDeleteSchedule, onUpdateResearchAdviser
}: SchedulerCalendarProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const todayIso = toIso(new Date());

  // Scheduling pop-up
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  // "Are you sure?" before cancelling or deleting a defense
  const [confirmAction, setConfirmAction] = useState<{ type: 'cancel' | 'delete'; id: string } | null>(null);

  // Form fields
  const [formResearchId, setFormResearchId] = useState('');
  const [formType, setFormType] = useState<Schedule['type']>('proposal');
  const [formDate, setFormDate] = useState(todayIso);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:30');
  const [formRoomId, setFormRoomId] = useState('');
  const [formPanelistIds, setFormPanelistIds] = useState<string[]>([]);
  const [formAdviserId, setFormAdviserId] = useState('');
  const [formStatus, setFormStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');

  const registeredAdvisers = useMemo(() => users.filter(u => u.role === 'adviser'), [users]);
  const registeredPanelists = useMemo(() => users.filter(u => u.role === 'panelist'), [users]);

  const getRoomName = (roomId: string) => {
    if (roomId === 'online') return 'Online meeting';
    const r = rooms.find(x => x.id === roomId);
    return r ? `${r.name} (${r.location})` : 'Room not found';
  };

  const getResearchTitle = (researchId: string) => researchList.find(x => x.id === researchId)?.title ?? 'Research paper';

  const getPanelistNames = (panelistIds: string[]) =>
    panelistIds.map(pid => users.find(x => x.id === pid)?.name ?? 'Panel Member');

  const getStudentNames = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    if (!res) return 'No students';
    return res.studentIds.map(sid => users.find(u => u.id === sid)?.name ?? 'Student').join(', ');
  };

  const getAdviserName = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    if (!res) return 'No adviser yet';
    return users.find(u => u.id === res.adviserId)?.name ?? 'No adviser yet';
  };

  const getResearchAdviserId = (researchId: string) => researchList.find(x => x.id === researchId)?.adviserId ?? '';

  const shortTitle = (researchId: string) => {
    const t = getResearchTitle(researchId);
    return t.length > 30 ? `${t.substring(0, 30)}…` : t;
  };

  // Picking a research paper also picks its current adviser
  const handleFormResearchChange = (id: string) => {
    setFormResearchId(id);
    setFormAdviserId(getResearchAdviserId(id));
  };

  // Finds double bookings (same room, same panel member, same student, same time)
  const schedulesWithValidation = useMemo(() => {
    return schedules.map(sched => {
      const conflicts: string[] = [];

      if (sched.status !== 'scheduled') return { ...sched, conflictsDetected: [] };

      // 1. Same room at the same time
      schedules.forEach(other => {
        if (other.id !== sched.id && other.status === 'scheduled' && other.date === sched.date && other.roomId === sched.roomId && other.roomId !== 'online') {
          if (sched.startTime < other.endTime && sched.endTime > other.startTime) {
            const otherRoom = rooms.find(r => r.id === sched.roomId)?.name || 'This room';
            conflicts.push(`Room already booked: ${otherRoom} is also used for “${shortTitle(other.researchId)}” at the same time.`);
          }
        }
      });

      // 2. Same panel member at the same time
      sched.panelistIds.forEach(pid => {
        schedules.forEach(other => {
          if (other.id !== sched.id && other.status === 'scheduled' && other.date === sched.date && other.panelistIds.includes(pid)) {
            if (sched.startTime < other.endTime && sched.endTime > other.startTime) {
              const panName = users.find(u => u.id === pid)?.name || 'A panel member';
              conflicts.push(`Panel member busy: ${panName} is also on the panel for “${shortTitle(other.researchId)}” at the same time.`);
            }
          }
        });
      });

      // 3. Same student at the same time
      const currentRes = researchList.find(r => r.id === sched.researchId);
      if (currentRes) {
        currentRes.studentIds.forEach(sid => {
          schedules.forEach(other => {
            if (other.id !== sched.id && other.status === 'scheduled' && other.date === sched.date) {
              const otherRes = researchList.find(r => r.id === other.researchId);
              if (otherRes && otherRes.studentIds.includes(sid)) {
                if (sched.startTime < other.endTime && sched.endTime > other.startTime) {
                  const studName = users.find(u => u.id === sid)?.name || 'A student';
                  conflicts.push(`Student busy: ${studName} has another defense at the same time.`);
                }
              }
            }
          });
        });
      }

      return { ...sched, conflictsDetected: conflicts };
    });
  }, [schedules, rooms, users, researchList]);

  // The same checks, live, for what is typed in the form
  const currentFormConflicts = useMemo(() => {
    if (!formResearchId || !formDate || !formStartTime || !formEndTime) return [];

    const conflicts: string[] = [];

    if (formRoomId && formRoomId !== 'online') {
      schedules.forEach(other => {
        if (other.id !== editingScheduleId && other.status === 'scheduled' && other.date === formDate && other.roomId === formRoomId) {
          if (formStartTime < other.endTime && formEndTime > other.startTime) {
            const rName = rooms.find(r => r.id === formRoomId)?.name || 'This room';
            conflicts.push(`${rName} is already booked for another defense at this time.`);
          }
        }
      });
    }

    formPanelistIds.forEach(pid => {
      schedules.forEach(other => {
        if (other.id !== editingScheduleId && other.status === 'scheduled' && other.date === formDate && other.panelistIds.includes(pid)) {
          if (formStartTime < other.endTime && formEndTime > other.startTime) {
            const pName = users.find(u => u.id === pid)?.name || 'A panel member';
            conflicts.push(`${pName} is already on the panel for another defense at this time.`);
          }
        }
      });
    });

    const currentRes = researchList.find(r => r.id === formResearchId);
    if (currentRes) {
      currentRes.studentIds.forEach(sid => {
        schedules.forEach(other => {
          if (other.id !== editingScheduleId && other.status === 'scheduled' && other.date === formDate) {
            const otherRes = researchList.find(r => r.id === other.researchId);
            if (otherRes && otherRes.studentIds.includes(sid)) {
              if (formStartTime < other.endTime && formEndTime > other.startTime) {
                const sName = users.find(u => u.id === sid)?.name || 'A student';
                conflicts.push(`${sName} has another defense at this time.`);
              }
            }
          }
        });
      });
    }

    return conflicts;
  }, [formResearchId, formDate, formStartTime, formEndTime, formRoomId, formPanelistIds, editingScheduleId, schedules, rooms, users, researchList]);

  const filteredSchedules = useMemo(() => {
    return schedulesWithValidation
      .filter(sched => selectedRoom === 'all' || sched.roomId === selectedRoom)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [schedulesWithValidation, selectedRoom]);

  // The month grid for whichever month is showing
  const monthCells = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const startOffset = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: { day: number; dateStr: string; isFiller: boolean; schedules: typeof filteredSchedules }[] = [];

    for (let i = 0; i < startOffset; i++) {
      const d = new Date(y, m, 1 - startOffset + i);
      cells.push({ day: d.getDate(), dateStr: toIso(d), isFiller: true, schedules: [] });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toIso(new Date(y, m, day));
      cells.push({ day, dateStr, isFiller: false, schedules: filteredSchedules.filter(s => s.date === dateStr) });
    }
    let extra = 1;
    while (cells.length % 7 !== 0) {
      const d = new Date(y, m + 1, extra++);
      cells.push({ day: d.getDate(), dateStr: toIso(d), isFiller: true, schedules: [] });
    }
    return cells;
  }, [currentDate, filteredSchedules]);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthSchedules = useMemo(() => {
    const prefix = toIso(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)).slice(0, 7);
    return filteredSchedules.filter(s => s.date.startsWith(prefix));
  }, [filteredSchedules, currentDate]);

  const goToMonth = (delta: number) =>
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  // Open the form to schedule a new defense
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingScheduleId(null);
    setFormResearchId(researchList[0]?.id || '');
    setFormType('proposal');
    setFormDate(todayIso);
    setFormStartTime('09:00');
    setFormEndTime('10:30');
    setFormRoomId(rooms[0]?.id || '');
    setFormPanelistIds(registeredPanelists.slice(0, 3).map(p => p.id));
    setFormAdviserId(researchList[0] ? getResearchAdviserId(researchList[0].id) : '');
    setFormStatus('scheduled');
    setShowModal(true);
  };

  // Open the form to change an existing defense
  const handleOpenEditModal = (sched: Schedule) => {
    setModalMode('edit');
    setEditingScheduleId(sched.id);
    setFormResearchId(sched.researchId);
    setFormType(sched.type);
    setFormDate(sched.date);
    setFormStartTime(sched.startTime);
    setFormEndTime(sched.endTime);
    setFormRoomId(sched.roomId);
    setFormPanelistIds(sched.panelistIds);
    setFormAdviserId(getResearchAdviserId(sched.researchId));
    setFormStatus(sched.status);
    setShowModal(true);
  };

  const handleTogglePanelist = (panelistId: string) => {
    setFormPanelistIds(prev => (prev.includes(panelistId) ? prev.filter(id => id !== panelistId) : [...prev, panelistId]));
  };

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
        type: formType
      };

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
        type: formType
      };

      if (formAdviserId && onUpdateResearchAdviser) {
        onUpdateResearchAdviser(formResearchId, formAdviserId);
      }

      onUpdateSchedule(updatedSchedule);
    }

    setShowModal(false);
  };

  const runConfirmedAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'cancel' && onCancelSchedule) onCancelSchedule(confirmAction.id);
    if (confirmAction.type === 'delete' && onDeleteSchedule) onDeleteSchedule(confirmAction.id);
    setConfirmAction(null);
  };

  const confirmTarget = confirmAction ? schedules.find(s => s.id === confirmAction.id) : null;

  // One defense, shown as a card (used in the list views)
  const renderSessionCard = (sched: (typeof filteredSchedules)[number]) => {
    const conflicts = sched.conflictsDetected ?? [];
    const hasConflicts = conflicts.length > 0;
    return (
      <Card as="article" className={cx('space-y-4', hasConflicts && 'border-rose-300')}>
        {hasConflicts && (
          <Alert tone="danger" title="This defense has a scheduling problem">
            <ul className="list-disc space-y-0.5 pl-5">
              {conflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
            <p className="mt-1">Change the date, time, room or panel to fix it.</p>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{defenseTypeLabels[sched.type] ?? sched.type}</Badge>
          <StatusBadge info={scheduleStatus[sched.status]} />
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Clock className="h-4 w-4 text-blue-800" aria-hidden="true" />
            {formatDateAndTime(sched.date, sched.startTime)} to {formatTime(sched.endTime)}
          </span>
        </div>

        <h3 className="text-lg font-bold leading-snug text-slate-900">{getResearchTitle(sched.researchId)}</h3>

        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="space-y-1 rounded-lg bg-slate-50 p-3">
            <p className="font-bold text-slate-900">Students and adviser</p>
            <p className="flex items-start gap-1.5 text-slate-800">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
              {getStudentNames(sched.researchId)}
            </p>
            <p className="text-slate-700">Adviser: <strong className="text-slate-900">{getAdviserName(sched.researchId)}</strong></p>
          </div>
          <div className="space-y-1 rounded-lg bg-slate-50 p-3">
            <p className="font-bold text-slate-900">Panel members</p>
            <ul className="space-y-0.5 text-slate-800">
              {getPanelistNames(sched.panelistIds).map((pname, i) => <li key={i}>{pname}</li>)}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex items-center gap-2 text-sm text-slate-800">
            <Landmark className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span>Where: <strong className="text-slate-900">{getRoomName(sched.roomId)}</strong></span>
            {hasConflicts ? (
              <Badge tone="danger" icon={AlertTriangle}>Has a problem</Badge>
            ) : (
              <Badge tone="success" icon={ShieldCheck}>No conflicts</Badge>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => handleOpenEditModal(sched)}>
              Change Date or Details
            </Button>
            {sched.status !== 'cancelled' && onCancelSchedule && (
              <Button variant="secondary" size="sm" icon={Ban} onClick={() => setConfirmAction({ type: 'cancel', id: sched.id })}>
                Cancel Defense
              </Button>
            )}
            {onDeleteSchedule && (
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmAction({ type: 'delete', id: sched.id })}>
                Delete Defense
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const canSave = formPanelistIds.length === 3;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Defenses"
        subtitle="Pick a date, room and panel for each defense. We warn you if something is double-booked."
        action={onAddSchedule ? <Button icon={Plus} onClick={handleOpenCreateModal}>Schedule a Defense</Button> : undefined}
      />

      {/* View options */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-72">
          <Select label="Show room" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
            <option value="all">All rooms</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="How to show the defenses">
          <Button variant={viewMode === 'month' ? 'primary' : 'secondary'} size="sm" icon={Grid3x3} aria-pressed={viewMode === 'month'} onClick={() => setViewMode('month')}>
            Month Calendar
          </Button>
          <Button variant={viewMode === 'week' ? 'primary' : 'secondary'} size="sm" icon={List} aria-pressed={viewMode === 'week'} onClick={() => setViewMode('week')}>
            List of All Defenses
          </Button>
        </div>
      </Card>

      {viewMode === 'month' ? (
        <div className="space-y-6">
          <Card padded={false} className="overflow-hidden">
            {/* Month name and buttons to change month */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
              <h2 className="text-lg font-bold text-slate-900" aria-live="polite">{monthLabel}</h2>
              <div className="flex items-center gap-2">
                <IconButton icon={ChevronLeft} variant="secondary" label="Show previous month" onClick={() => goToMonth(-1)} />
                <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
                <IconButton icon={ChevronRight} variant="secondary" label="Show next month" onClick={() => goToMonth(1)} />
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 py-2 text-center text-xs font-bold text-slate-700" aria-hidden="true">
              {weekdayNames.map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 border-b border-r border-slate-200">
              {monthCells.map((cell, idx) => {
                const isToday = cell.dateStr === todayIso;
                return (
                  <div
                    key={idx}
                    className={cx(
                      'flex min-h-16 flex-col gap-1 p-1 sm:min-h-28 sm:p-2',
                      cell.isFiller ? 'bg-slate-50 text-slate-500' : 'bg-white',
                    )}
                  >
                    <span
                      className={cx(
                        'flex h-7 w-7 items-center justify-center self-center rounded-full text-sm font-bold sm:self-start',
                        isToday ? 'bg-blue-800 text-white' : cell.isFiller ? 'text-slate-500' : 'text-slate-900',
                      )}
                      {...(isToday ? { 'aria-label': `${cell.day}, today` } : {})}
                    >
                      {cell.day}
                    </span>

                    {/* Small screens: just how many defenses */}
                    {!cell.isFiller && cell.schedules.length > 0 && (
                      <span className="self-center rounded-full bg-blue-800 px-2 py-0.5 text-xs font-bold text-white sm:hidden">
                        {cell.schedules.length}
                        <span className="sr-only"> {cell.schedules.length === 1 ? 'defense' : 'defenses'} on this day</span>
                      </span>
                    )}

                    {/* Larger screens: each defense, select to change it */}
                    <div className="hidden flex-1 space-y-1 overflow-y-auto sm:block">
                      {!cell.isFiller && cell.schedules.map(sched => {
                        const hasConflicts = (sched.conflictsDetected ?? []).length > 0;
                        return (
                          <button
                            key={sched.id}
                            type="button"
                            onClick={() => handleOpenEditModal(sched)}
                            title={`${getResearchTitle(sched.researchId)}. Select to change it.`}
                            className={cx(
                              'tap-auto block w-full rounded border px-1.5 py-1 text-left text-xs font-semibold cursor-pointer',
                              hasConflicts ? 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
                                : sched.status === 'completed' ? 'border-slate-300 bg-slate-100 text-slate-700'
                                : sched.status === 'cancelled' ? 'border-amber-300 bg-amber-50 text-amber-900 line-through'
                                : 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100',
                            )}
                          >
                            <span className="flex items-center justify-between gap-1">
                              {formatTime(sched.startTime)}
                              {hasConflicts && <AlertTriangle className="h-3 w-3 text-rose-700" aria-label="Has a scheduling problem" />}
                            </span>
                            <span className="block truncate">{getResearchTitle(sched.researchId)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Defenses in this month */}
          <section aria-labelledby="month-list-title" className="space-y-4">
            <h2 id="month-list-title" className="text-lg font-bold text-slate-900">
              Defenses in {monthLabel} ({monthSchedules.length})
            </h2>
            {monthSchedules.length === 0 ? (
              <Card padded={false}>
                <EmptyState
                  icon={CalendarIcon}
                  title="No defenses this month"
                  description={selectedRoom === 'all'
                    ? 'Use the arrows above to look at another month, or schedule a new defense.'
                    : 'Try another month, or choose “All rooms” above.'}
                  action={onAddSchedule ? <Button icon={Plus} onClick={handleOpenCreateModal}>Schedule a Defense</Button> : undefined}
                />
              </Card>
            ) : (
              <ul className="space-y-4">
                {monthSchedules.map(sched => <li key={sched.id}>{renderSessionCard(sched)}</li>)}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <section aria-label="All defenses" className="space-y-4">
          {filteredSchedules.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={CalendarIcon}
                title="No defenses to show"
                description={selectedRoom === 'all' ? 'Schedule the first defense to see it here.' : 'No defenses use this room. Choose “All rooms” above to see every defense.'}
                action={onAddSchedule ? <Button icon={Plus} onClick={handleOpenCreateModal}>Schedule a Defense</Button> : undefined}
              />
            </Card>
          ) : (
            <ul className="space-y-4">
              {filteredSchedules.map(sched => <li key={sched.id}>{renderSessionCard(sched)}</li>)}
            </ul>
          )}
        </section>
      )}

      {/* Schedule or change a defense */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Schedule a defense' : 'Change this defense'}
        description="Fields marked with * are required. Choose exactly 3 panel members."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" form="schedule-form" disabled={!canSave}>
              {modalMode === 'create' ? 'Save Defense Schedule' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form id="schedule-form" onSubmit={handleFormSubmit} className="space-y-5">
          {currentFormConflicts.length > 0 && (
            <Alert tone="danger" title="This time does not work">
              <ul className="list-disc space-y-0.5 pl-5">
                {currentFormConflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
              <p className="mt-1">Choose another date, time, room or panel member. You can still save, but people would be double-booked.</p>
            </Alert>
          )}

          <Select
            label="Research paper"
            required
            value={formResearchId}
            onChange={e => handleFormResearchChange(e.target.value)}
            hint="Choose the group that will defend."
          >
            <option value="" disabled>Choose a research paper…</option>
            {researchList.map(r => (
              <option key={r.id} value={r.id}>
                {r.title.substring(0, 50)}{r.title.length > 50 ? '…' : ''} ({getStudentNames(r.id)})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select label="Type of defense" value={formType} onChange={e => setFormType(e.target.value as Schedule['type'])}>
              <option value="proposal">Proposal Defense</option>
              <option value="final">Final Defense</option>
            </Select>
            <Select label="Status" value={formStatus} onChange={e => setFormStatus(e.target.value as typeof formStatus)}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Input label="Date" required type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
            <Input label="Start time" required type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} />
            <Input label="End time" required type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select label="Room" required value={formRoomId} onChange={e => setFormRoomId(e.target.value)}>
              <option value="" disabled>Choose a room…</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} - {r.location}</option>
              ))}
            </Select>
            <Select
              label="Adviser"
              required
              value={formAdviserId}
              onChange={e => setFormAdviserId(e.target.value)}
            >
              <option value="" disabled>Choose an adviser…</option>
              {registeredAdvisers.map(adv => (
                <option key={adv.id} value={adv.id}>{adv.name}</option>
              ))}
            </Select>
          </div>

          <fieldset className="space-y-2">
            <legend className="flex w-full flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-800">
              <span>Panel members <span className="text-rose-700" aria-hidden="true">*</span></span>
              <Badge tone={canSave ? 'success' : 'warning'}>
                {formPanelistIds.length} of 3 chosen
              </Badge>
            </legend>
            <p className="text-xs text-slate-600">
              {canSave ? 'You have chosen 3 panel members.' : 'Choose exactly 3 panel members to save this defense.'}
            </p>
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              {registeredPanelists.map(pan => {
                const isChecked = formPanelistIds.includes(pan.id);
                return (
                  <label
                    key={pan.id}
                    className={cx(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium',
                      isChecked ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePanelist(pan.id)}
                      className="h-5 w-5 shrink-0 accent-blue-800"
                    />
                    <span className="truncate">{pan.name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </form>
      </Modal>

      {/* Are you sure? */}
      <ConfirmDialog
        open={!!confirmAction}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
        destructive
        title={confirmAction?.type === 'delete' ? 'Delete this defense?' : 'Cancel this defense?'}
        message={
          confirmAction?.type === 'delete'
            ? `The defense for “${confirmTarget ? getResearchTitle(confirmTarget.researchId) : 'this paper'}” on ${confirmTarget ? formatDate(confirmTarget.date) : ''} will be removed for good. This cannot be undone.`
            : `The defense for “${confirmTarget ? getResearchTitle(confirmTarget.researchId) : 'this paper'}” on ${confirmTarget ? formatDate(confirmTarget.date) : ''} will be marked as cancelled. You can schedule it again later.`
        }
        confirmLabel={confirmAction?.type === 'delete' ? 'Yes, Delete Defense' : 'Yes, Cancel Defense'}
        cancelLabel="No, Keep Defense"
      />
    </div>
  );
}
