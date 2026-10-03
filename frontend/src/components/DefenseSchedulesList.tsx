import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon, Clock, Landmark, Users, User, ShieldCheck, Video, Search,
  LayoutGrid, List, Compass,
} from 'lucide-react';
import { Schedule, Room, User as UserType, Research } from '../types';
import {
  Badge, Button, Card, EmptyState, PageHeader, Select, StatusBadge, Table, cx, defenseTypeLabels, formatDate, formatDateLong,
  formatTime, scheduleStatus, scheduleSubjectId, subjectStudentId, type Column, type Tone,
} from '../ui';

interface DefenseSchedulesListProps {
  schedules: Schedule[];
  rooms: Room[];
  users: UserType[];
  researchList: Research[];
  currentUser: UserType;
}

const subtitles: Record<string, string> = {
  student: 'When and where your defense is, and who is on your panel.',
  adviser: 'The defense dates of your student groups.',
  panelist: 'The defenses you will attend as a panel member.',
  coordinator: 'Every defense that is scheduled.',
  admin: 'Every defense that is scheduled.',
};

type Tab = Schedule['status'];

const tabLabels: Record<Tab, string> = {
  scheduled: 'Coming up',
  completed: 'Finished',
  cancelled: 'Cancelled',
};

// 'YYYY-MM-DD' in the person's own time zone (not UTC, which can be the day before in the morning)
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysFromToday = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date();
  const a = new Date(y, m - 1, d).getTime();
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((a - b) / 86_400_000);
};

/** "Today", "Tomorrow", "In 5 days" for a defense that is still coming up. */
const whenLabel = (sched: Schedule): { text: string; tone: Tone } => {
  if (sched.status === 'completed') return { text: 'Finished', tone: 'success' };
  if (sched.status === 'cancelled') return { text: 'Cancelled', tone: 'danger' };
  const days = daysFromToday(sched.date);
  if (days === 0) return { text: 'Today', tone: 'warning' };
  if (days === 1) return { text: 'Tomorrow', tone: 'warning' };
  if (days > 1) return { text: `In ${days} days`, tone: 'info' };
  return { text: 'Date has passed', tone: 'neutral' };
};

export default function DefenseSchedulesList({
  schedules, rooms, users, researchList, currentUser
}: DefenseSchedulesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tab, setTab] = useState<Tab>('scheduled');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const seesEverything = currentUser.role === 'coordinator' || currentUser.role === 'admin';

  const getRoomName = (roomId: string) => rooms.find(x => x.id === roomId)?.name ?? 'Online meeting';
  const getRoomLocation = (roomId: string) => rooms.find(x => x.id === roomId)?.location ?? 'Online';

  const getPanelistNames = (panelistIds: string[]) =>
    panelistIds.map(pid => users.find(x => x.id === pid)?.name ?? 'Panel Member');

  // "subject" = a research paper's id, or a student with no research yet (see scheduleSubjectId)
  const getStudentNames = (subject: string) => {
    const alone = subjectStudentId(subject);
    if (alone) return users.find(x => x.id === alone)?.name ?? 'Student';
    const res = researchList.find(x => x.id === subject);
    if (!res) return 'No students';
    return res.studentIds.map(sid => users.find(x => x.id === sid)?.name ?? 'Student').join(', ');
  };

  const getAdviserName = (subject: string) => {
    const res = researchList.find(x => x.id === subject);
    if (!res) return 'No adviser yet';
    return users.find(x => x.id === res.adviserId)?.name ?? 'No adviser yet';
  };

  // The big line of a defense: the paper's title, or who a paper-less title hearing is for
  const getHeading = (sched: Schedule) => {
    const subject = scheduleSubjectId(sched);
    if (subjectStudentId(subject)) return `Title hearing for ${getStudentNames(subject)}`;
    return researchList.find(x => x.id === subject)?.title ?? 'Research paper';
  };

  // The small line under it: the group, or why there is no paper
  const getSubheading = (sched: Schedule) => {
    const subject = scheduleSubjectId(sched);
    return subjectStudentId(subject) ? 'Has not added research yet' : getStudentNames(subject);
  };

  // Is this defense connected to the person who is signed in?
  const isMySchedule = (sched: Schedule) => {
    if (seesEverything) return true;
    if (sched.studentId) return currentUser.role === 'student' && sched.studentId === currentUser.id;

    const res = researchList.find(r => r.id === sched.researchId);
    if (!res) return false;

    if (currentUser.role === 'student') return res.studentIds.includes(currentUser.id);
    if (currentUser.role === 'adviser') return res.adviserId === currentUser.id;
    if (currentUser.role === 'panelist') return sched.panelistIds.includes(currentUser.id);
    return false;
  };

  // Everyone except the coordinator and admin only sees their own defenses
  const visible = useMemo(
    () => schedules.filter(isMySchedule),
    [schedules, currentUser, researchList],
  );

  const counts = useMemo(() => ({
    scheduled: visible.filter(s => s.status === 'scheduled').length,
    completed: visible.filter(s => s.status === 'completed').length,
    cancelled: visible.filter(s => s.status === 'cancelled').length,
  }), [visible]);

  const byTime = (a: Schedule, b: Schedule) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);

  const shown = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = visible.filter(sched => {
      if (sched.status !== tab) return false;
      if (typeFilter !== 'all' && sched.type !== typeFilter) return false;
      if (!query) return true;
      const subject = scheduleSubjectId(sched);
      return [getHeading(sched), getStudentNames(subject), getAdviserName(subject), getRoomName(sched.roomId), getRoomLocation(sched.roomId)]
        .some(text => text.toLowerCase().includes(query));
    });
    // soonest first for what is coming; most recent first for what is done
    return list.sort((a, b) => (tab === 'scheduled' ? byTime(a, b) : byTime(b, a)));
  }, [visible, tab, typeFilter, searchQuery, researchList, users, rooms]);

  // The next defense that is still coming up for this person
  const today = localIso(new Date());
  const nextDefense = useMemo(
    () => visible.filter(s => s.status === 'scheduled' && s.date >= today).sort(byTime)[0],
    [visible, today],
  );

  const hasFilters = searchQuery !== '' || typeFilter !== 'all';
  const clearFilters = () => { setSearchQuery(''); setTypeFilter('all'); };
  // Search and filters only help when there are many defenses to look through
  const showSearch = seesEverything || visible.length > 4;

  const cardProps = {
    getRoomName, getRoomLocation, getHeading, getSubheading, getAdviserName, getPanelistNames,
    subjectOf: scheduleSubjectId,
  };

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
          <span className="block font-semibold text-slate-900">{getHeading(s)}</span>
          <span className="block text-sm text-slate-600">{getSubheading(s)}</span>
        </span>
      ),
    },
    { key: 'room', header: 'Room', render: s => getRoomName(s.roomId) },
    {
      key: 'people', header: 'Adviser and panel',
      render: s => (
        <span className="block space-y-0.5 text-sm">
          <span className="block">Adviser: <strong>{getAdviserName(scheduleSubjectId(s))}</strong></span>
          <span className="block text-slate-700">Panel: {getPanelistNames(s.panelistIds).join(', ') || '—'}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: s => <StatusBadge info={scheduleStatus[s.status]} /> },
  ];

  const emptyText: Record<Tab, { title: string; description: string }> = {
    scheduled: {
      title: 'Nothing is coming up',
      description: seesEverything
        ? 'Use Schedule Defenses to set a date for a group.'
        : 'When the coordinator sets a date for you, it will show here and you will get a notification.',
    },
    completed: { title: 'Nothing is finished yet', description: 'Defenses that were held will show here.' },
    cancelled: { title: 'Nothing was cancelled', description: 'Cancelled defenses will show here.' },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Defense Schedule" subtitle={subtitles[currentUser.role]} />

      {/* Your next defense (with only one coming up, the list below already shows it) */}
      {!seesEverything && counts.scheduled !== 1 && (
        <section aria-labelledby="next-defense">
          <Card className={cx(nextDefense ? 'border-blue-200 bg-blue-50' : '')}>
            <p id="next-defense" className="flex items-center gap-2 text-sm font-bold text-blue-900">
              <Compass className="h-5 w-5" aria-hidden="true" />
              Your next defense
            </p>
            {nextDefense ? (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{defenseTypeLabels[nextDefense.type] ?? nextDefense.type}</Badge>
                  <Badge tone={whenLabel(nextDefense).tone}>{whenLabel(nextDefense).text}</Badge>
                </div>
                <h2 className="text-2xl font-bold leading-snug text-slate-900">{formatDateLong(nextDefense.date)}</h2>
                <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-base text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-5 w-5 text-blue-800" aria-hidden="true" />
                    {formatTime(nextDefense.startTime)} to {formatTime(nextDefense.endTime)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Landmark className="h-5 w-5 text-blue-800" aria-hidden="true" />
                    {nextDefense.roomId === 'online' ? 'Online meeting' : `${getRoomName(nextDefense.roomId)}, ${getRoomLocation(nextDefense.roomId)}`}
                  </span>
                </p>
                <p className="text-sm text-slate-700">{getHeading(nextDefense)}</p>
              </div>
            ) : (
              <p className="mt-2 text-base text-slate-700">
                {currentUser.role === 'student'
                  ? 'No defense date is set for you yet. The coordinator will set it and you will get a notification.'
                  : 'You have no defense coming up right now.'}
              </p>
            )}
          </Card>
        </section>
      )}

      {/* Which defenses to show */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Which defenses to show">
          {(Object.keys(tabLabels) as Tab[]).map(key => (
            <Button
              key={key}
              variant={tab === key ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {tabLabels[key]} ({counts[key]})
            </Button>
          ))}
        </div>
        {seesEverything && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="How to show the list">
            <Button variant={viewMode === 'grid' ? 'primary' : 'secondary'} size="sm" icon={LayoutGrid} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
              Cards
            </Button>
            <Button variant={viewMode === 'table' ? 'primary' : 'secondary'} size="sm" icon={List} aria-pressed={viewMode === 'table'} onClick={() => setViewMode('table')}>
              Table
            </Button>
          </div>
        )}
      </div>

      {/* Search and filters */}
      {showSearch && (
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="sm:w-72">
              <Select label="Type of defense" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>
                <option value="title_hearing">Title Hearing</option>
                <option value="proposal">Proposal Defense</option>
                <option value="final">Final Defense</option>
              </Select>
            </div>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear Search and Filters</Button>}
          </div>
        </Card>
      )}

      {/* List */}
      {shown.length === 0 ? (
        <Card padded={false}>
          {hasFilters ? (
            <EmptyState
              icon={Search}
              title="No defenses match your search"
              description="Try a shorter search, or clear the filters."
              action={<Button variant="secondary" onClick={clearFilters}>Clear Search and Filters</Button>}
            />
          ) : (
            <EmptyState icon={CalendarIcon} title={emptyText[tab].title} description={emptyText[tab].description} />
          )}
        </Card>
      ) : viewMode === 'grid' || !seesEverything ? (
        <ul className="space-y-4">
          {shown.map(sched => (
            <li key={sched.id}><ScheduleCard sched={sched} {...cardProps} /></li>
          ))}
        </ul>
      ) : (
        <Table caption="Defense schedules" columns={columns} rows={shown} rowKey={s => s.id} />
      )}
    </div>
  );
}

interface ScheduleCardProps {
  sched: Schedule;
  subjectOf: (s: Schedule) => string;
  getRoomName: (roomId: string) => string;
  getRoomLocation: (roomId: string) => string;
  getHeading: (s: Schedule) => string;
  getSubheading: (s: Schedule) => string;
  getAdviserName: (subject: string) => string;
  getPanelistNames: (panelistIds: string[]) => string[];
}

function ScheduleCard({
  sched, subjectOf, getRoomName, getRoomLocation, getHeading, getSubheading, getAdviserName, getPanelistNames,
}: ScheduleCardProps) {
  const isOnline = sched.roomId === 'online' || !sched.roomId;
  const when = whenLabel(sched);
  const subject = subjectOf(sched);
  const noPaper = !!subjectStudentId(subject);

  return (
    <Card as="article" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="info">{defenseTypeLabels[sched.type] ?? sched.type}</Badge>
        <Badge tone={when.tone}>{when.text}</Badge>
      </div>

      <div>
        <h3 className="text-lg font-bold leading-snug text-slate-900">{getHeading(sched)}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-700">
          <Users className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
          <span>{getSubheading(sched)}</span>
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
        <div className="flex min-w-0 items-start gap-2.5">
          {isOnline ? (
            <Video className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
          ) : (
            <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <dt className="text-slate-600">Where</dt>
            <dd className="font-semibold text-slate-900">
              {isOnline ? (
                <span>Online meeting</span>
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
            {noPaper ? 'Chosen when the student adds research' : getAdviserName(subject)}
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
