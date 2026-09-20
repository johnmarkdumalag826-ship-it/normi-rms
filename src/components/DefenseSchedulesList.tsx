import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon, Clock, Landmark, Users, User, ShieldCheck, Video, Search,
  LayoutGrid, List, ExternalLink, CheckCircle2, CalendarCheck, UserCheck, Compass,
} from 'lucide-react';
import { Schedule, Room, User as UserType, Research } from '../types';
import {
  Badge, Button, Card, EmptyState, PageHeader, Select, StatusBadge, Table, cx, defenseTypeLabels, formatDate, formatDateLong,
  formatDateAndTime, formatTime, scheduleStatus, type Column,
} from '../ui';

interface DefenseSchedulesListProps {
  schedules: Schedule[];
  rooms: Room[];
  users: UserType[];
  researchList: Research[];
  currentUser: UserType;
}

const subtitles: Record<string, string> = {
  student: 'See when and where your defense will be, and who your panel members are.',
  adviser: 'See the defense dates of your student groups.',
  panelist: 'See the defenses you will attend as a panel member.',
  coordinator: 'See every defense that is scheduled.',
  admin: 'See every defense that is scheduled.',
};

export default function DefenseSchedulesList({
  schedules, rooms, users, researchList, currentUser
}: DefenseSchedulesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const getRoomName = (roomId: string) => rooms.find(x => x.id === roomId)?.name ?? 'Online meeting';
  const getRoomLocation = (roomId: string) => rooms.find(x => x.id === roomId)?.location ?? 'Online';
  const getResearchTitle = (researchId: string) => researchList.find(x => x.id === researchId)?.title ?? 'Research paper';

  const getAdviserName = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    if (!res) return 'No adviser yet';
    return users.find(x => x.id === res.adviserId)?.name ?? 'No adviser yet';
  };

  const getPanelistNames = (panelistIds: string[]) =>
    panelistIds.map(pid => users.find(x => x.id === pid)?.name ?? 'Panel Member');

  const getStudentNames = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    if (!res) return 'No students';
    return res.studentIds.map(sid => users.find(x => x.id === sid)?.name ?? 'Student').join(', ');
  };

  // Is this defense connected to the person who is signed in?
  const isMySchedule = (sched: Schedule) => {
    if (currentUser.role === 'coordinator' || currentUser.role === 'admin') return true;

    const res = researchList.find(r => r.id === sched.researchId);
    if (!res) return false;

    if (currentUser.role === 'student') return res.studentIds.includes(currentUser.id);
    if (currentUser.role === 'adviser') return res.adviserId === currentUser.id;
    if (currentUser.role === 'panelist') return sched.panelistIds.includes(currentUser.id);
    return false;
  };

  const seesEverything = currentUser.role === 'coordinator' || currentUser.role === 'admin';

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

  const mySchedules = useMemo(() => filteredSchedules.filter(isMySchedule), [filteredSchedules, currentUser, researchList]);
  const otherSchedules = useMemo(() => filteredSchedules.filter(s => !isMySchedule(s)), [filteredSchedules, currentUser, researchList]);

  const stats = useMemo(() => {
    const active = schedules.filter(s => s.status === 'scheduled').length;
    const completed = schedules.filter(s => s.status === 'completed').length;
    const myCount = schedules.filter(isMySchedule).length;
    return { active, completed, myCount, total: schedules.length };
  }, [schedules, currentUser, researchList]);

  // The next defense that is still coming up for this person
  const today = new Date().toISOString().slice(0, 10);
  const nextDefense = useMemo(
    () =>
      schedules
        .filter(s => s.status === 'scheduled' && s.date >= today && isMySchedule(s))
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0],
    [schedules, currentUser, researchList, today],
  );

  const hasFilters = searchQuery !== '' || typeFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => { setSearchQuery(''); setTypeFilter('all'); setStatusFilter('all'); };

  const cardProps = { getRoomName, getRoomLocation, getResearchTitle, getAdviserName, getPanelistNames, getStudentNames };

  const columns: Column<Schedule>[] = [
    {
      key: 'when', header: 'Date and time', primary: true,
      render: s => (
        <span className="space-y-0.5">
          <span className="block font-bold text-slate-900">{formatDate(s.date)}</span>
          <span className="block text-sm font-normal text-slate-700">{formatTime(s.startTime)} to {formatTime(s.endTime)}</span>
        </span>
      ),
    },
    { key: 'type', header: 'Type', render: s => <Badge tone="info">{defenseTypeLabels[s.type] ?? s.type}</Badge> },
    {
      key: 'paper', header: 'Research paper and group',
      render: s => (
        <span className="block max-w-sm space-y-0.5">
          <span className="block font-semibold text-slate-900">{getResearchTitle(s.researchId)}</span>
          <span className="block text-sm text-slate-600">{getStudentNames(s.researchId)}</span>
        </span>
      ),
    },
    { key: 'room', header: 'Room', render: s => getRoomName(s.roomId) },
    {
      key: 'people', header: 'Adviser and panel',
      render: s => (
        <span className="block space-y-0.5 text-sm">
          <span className="block">Adviser: <strong>{getAdviserName(s.researchId)}</strong></span>
          <span className="block text-slate-700">Panel: {getPanelistNames(s.panelistIds).join(', ') || '—'}</span>
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: s => (
        <span className="flex flex-wrap gap-1.5">
          <StatusBadge info={scheduleStatus[s.status]} />
          {!seesEverything && isMySchedule(s) && <Badge tone="success">Yours</Badge>}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Defense Schedule" subtitle={subtitles[currentUser.role]} />

      {/* Your next defense */}
      {!seesEverything && (
        <section aria-labelledby="next-defense">
          <Card className={cx(nextDefense ? 'border-blue-200 bg-blue-50' : '')}>
            <p id="next-defense" className="flex items-center gap-2 text-sm font-bold text-blue-900">
              <Compass className="h-5 w-5" aria-hidden="true" />
              Your next defense
            </p>
            {nextDefense ? (
              <div className="mt-2 space-y-1">
                <h2 className="text-xl font-bold text-slate-900">{formatDateAndTime(nextDefense.date, nextDefense.startTime)}</h2>
                <p className="text-base text-slate-700">
                  {getResearchTitle(nextDefense.researchId)} · {getRoomName(nextDefense.roomId)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-base text-slate-700">
                {currentUser.role === 'student'
                  ? 'Your defense date is not set yet. After your adviser approves your paper, the coordinator will set it and you will get a notification.'
                  : 'You have no defense coming up right now.'}
              </p>
            )}
          </Card>
        </section>
      )}

      {/* Numbers */}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: CalendarIcon, tone: 'text-blue-800', label: 'All defenses', value: stats.total },
          { icon: CheckCircle2, tone: 'text-emerald-700', label: 'Finished', value: stats.completed },
          { icon: CalendarCheck, tone: 'text-amber-700', label: 'Coming up', value: stats.active },
          ...(seesEverything ? [] : [{ icon: UserCheck, tone: 'text-indigo-700', label: 'Yours', value: stats.myCount }]),
        ].map(({ icon: Icon, tone, label, value }) => (
          <Card key={label} className="flex items-start gap-3 !p-4">
            <Icon className={cx('mt-0.5 h-6 w-6 shrink-0', tone)} aria-hidden="true" />
            <div>
              <dd className="text-2xl font-bold text-slate-900">{value}</dd>
              <dt className="text-sm text-slate-600">{label}</dt>
            </div>
          </Card>
        ))}
      </dl>

      {/* Search and filters */}
      <Card as="section" aria-label="Search and filters" className="space-y-4">
        <div className="relative">
          <label htmlFor="defense-search" className="sr-only">Search defenses</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="defense-search"
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by paper title, student, adviser or room"
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-base text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
          />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Type of defense" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="proposal">Proposal Defense</option>
              <option value="final">Final Defense</option>
            </Select>
            <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="How to show the list">
            <Button variant={viewMode === 'grid' ? 'primary' : 'secondary'} size="sm" icon={LayoutGrid} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
              Cards
            </Button>
            <Button variant={viewMode === 'table' ? 'primary' : 'secondary'} size="sm" icon={List} aria-pressed={viewMode === 'table'} onClick={() => setViewMode('table')}>
              Table
            </Button>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear Search and Filters</Button>}
          </div>
        </div>
      </Card>

      {/* List */}
      {filteredSchedules.length === 0 ? (
        <Card padded={false}>
          {schedules.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No defenses are scheduled yet"
              description="When the coordinator sets a defense date, it will show here."
            />
          ) : (
            <EmptyState
              icon={Search}
              title="No defenses match your search"
              description="Try a shorter search, or clear the filters to see every defense."
              action={<Button variant="secondary" onClick={clearFilters}>Clear Search and Filters</Button>}
            />
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="space-y-8">
          {mySchedules.length > 0 && (
            <section className="space-y-4" aria-labelledby="mine-title">
              <h2 id="mine-title" className="text-lg font-bold text-slate-900">
                {seesEverything ? `All defenses (${mySchedules.length})` : `Your defenses (${mySchedules.length})`}
              </h2>
              <ul className="space-y-4">
                {mySchedules.map(sched => (
                  <li key={sched.id}><ScheduleCard sched={sched} highlighted={!seesEverything} {...cardProps} /></li>
                ))}
              </ul>
            </section>
          )}

          {otherSchedules.length > 0 && (
            <section className="space-y-4" aria-labelledby="others-title">
              <h2 id="others-title" className="text-lg font-bold text-slate-900">
                {mySchedules.length > 0 ? `Other defenses (${otherSchedules.length})` : `All defenses (${otherSchedules.length})`}
              </h2>
              <ul className="space-y-4">
                {otherSchedules.map(sched => (
                  <li key={sched.id}><ScheduleCard sched={sched} highlighted={false} {...cardProps} /></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <Table caption="Defense schedules" columns={columns} rows={filteredSchedules} rowKey={s => s.id} />
      )}
    </div>
  );
}

interface ScheduleCardProps {
  sched: Schedule;
  highlighted: boolean;
  getRoomName: (roomId: string) => string;
  getRoomLocation: (roomId: string) => string;
  getResearchTitle: (researchId: string) => string;
  getAdviserName: (researchId: string) => string;
  getPanelistNames: (panelistIds: string[]) => string[];
  getStudentNames: (researchId: string) => string;
}

function ScheduleCard({
  sched, highlighted, getRoomName, getRoomLocation, getResearchTitle, getAdviserName, getPanelistNames, getStudentNames,
}: ScheduleCardProps) {
  const isOnline = sched.roomId === 'online' || !sched.roomId;

  return (
    <Card as="article" className={cx('space-y-5', highlighted && 'border-blue-300 ring-1 ring-blue-100')}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{defenseTypeLabels[sched.type] ?? sched.type}</Badge>
        <StatusBadge info={scheduleStatus[sched.status]} />
        {highlighted && <Badge tone="success">Yours</Badge>}
      </div>

      <div>
        <h3 className="text-lg font-bold leading-snug text-slate-900">{getResearchTitle(sched.researchId)}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-700">
          <Users className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
          <span>{getStudentNames(sched.researchId)}</span>
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div className="flex items-start gap-2.5">
          <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
          <div>
            <dt className="text-slate-600">Date</dt>
            <dd className="font-semibold text-slate-900">{formatDateLong(sched.date)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
          <div>
            <dt className="text-slate-600">Time</dt>
            <dd className="font-semibold text-slate-900">{formatTime(sched.startTime)} to {formatTime(sched.endTime)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5 min-w-0">
          {isOnline ? (
            <Video className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
          ) : (
            <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <dt className="text-slate-600">Where</dt>
            <dd className="font-semibold text-slate-900">
              {isOnline ? (
                <a
                  href="https://meet.google.com/cit-capstone-session"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-800 underline underline-offset-2"
                >
                  Join online meeting
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <>
                  {getRoomName(sched.roomId)}
                  <span className="block text-xs font-normal text-slate-600">{getRoomLocation(sched.roomId)}</span>
                </>
              )}
            </dd>
          </div>
        </div>
      </dl>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-bold text-slate-900">Adviser</p>
          <p className="flex items-center gap-2 text-sm text-slate-800">
            <User className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
            {getAdviserName(sched.researchId)}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-bold text-slate-900">Panel members</p>
          <ul className="space-y-1 text-sm text-slate-800">
            {getPanelistNames(sched.panelistIds).map((pname, index) => (
              <li key={index} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
                {pname}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
