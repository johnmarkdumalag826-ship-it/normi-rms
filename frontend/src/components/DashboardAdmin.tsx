import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, UserCheck, Shield, Calendar, Clock, MapPin, Save, Database, RotateCcw, Search,
  Eye, Pencil, Trash2, CheckCircle2, XCircle,
} from 'lucide-react';
import { Schedule, Research, User, UserRole, Room } from '../types';
import {
  Alert, Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, StatusBadge, Table,
  cx, defenseTypeLabels, formatDate, formatDateLong, formatTime, roleLabels, scheduleStatus, userStatus, type Column,
} from '../ui';

interface DashboardAdminProps {
  user: User;
  users: User[];
  schedules: Schedule[];
  researchList: Research[];
  departments: { id: string; name: string; code: string }[];
  courses: { id: string; name: string; code: string }[];
  rooms: Room[];
  activeSection?: 'dashboard' | 'user-management';
  onToggleUserStatus: (id: string) => void;
  onUpdateUserRole: (id: string, role: UserRole) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUserAccount: (id: string) => void;
  onBackupDatabase: () => void;
  onRestoreDatabase: () => void;
}

type Section = 'dashboard' | 'user-management' | 'schedules';

const sectionInfo: Record<Section, { label: string; title: string; subtitle: string }> = {
  dashboard: {
    label: 'Overview',
    title: 'Admin Home',
    subtitle: 'See how many accounts and defenses there are, and keep the system’s data safe.',
  },
  'user-management': {
    label: 'Accounts',
    title: 'Manage Accounts',
    subtitle: 'Approve or reject new registrations, and edit or delete accounts.',
  },
  schedules: {
    label: 'All Defenses',
    title: 'All Defenses',
    subtitle: 'Look at every defense in every department. You can only view them here. The coordinator makes changes.',
  },
};

const roleOptions: UserRole[] = ['student', 'adviser', 'panelist', 'coordinator', 'admin'];

export default function DashboardAdmin({
  user, users, schedules, researchList, departments, courses, rooms, activeSection = 'dashboard',
  onToggleUserStatus, onUpdateUserRole, onUpdateUser, onDeleteUserAccount,
  onBackupDatabase, onRestoreDatabase
}: DashboardAdminProps) {

  const [currentSection, setCurrentSection] = useState<Section>(
    activeSection === 'user-management' ? 'user-management' : 'dashboard'
  );

  // The menu can change the section while this page is already open
  useEffect(() => {
    setCurrentSection(activeSection === 'user-management' ? 'user-management' : 'dashboard');
  }, [activeSection]);

  // Accounts
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  // "Are you sure?" for risky actions
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToReject, setUserToReject] = useState<User | null>(null);
  const [confirmingRestore, setConfirmingRestore] = useState(false);

  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'student' as UserRole,
    departmentId: departments[0]?.id || '',
    courseId: courses[0]?.id || '',
    status: 'active' as User['status'],
  });

  // Defense filters
  const [schedDeptFilter, setSchedDeptFilter] = useState<string>('all');
  const [schedDateFilter, setSchedDateFilter] = useState<string>('');
  const [schedAdviserFilter, setSchedAdviserFilter] = useState<string>('all');
  const [schedPanelFilter, setSchedPanelFilter] = useState<string>('all');
  const [schedRoomFilter, setSchedRoomFilter] = useState<string>('all');
  const [schedStatusFilter, setSchedStatusFilter] = useState<string>('all');

  const userStats = useMemo(() => {
    return {
      total: users.length,
      students: users.filter(u => u.role === 'student').length,
      faculty: users.filter(u => u.role === 'adviser' || u.role === 'panelist').length,
      coordinators: users.filter(u => u.role === 'coordinator').length,
      admins: users.filter(u => u.role === 'admin').length,
      active: users.filter(u => u.status === 'active').length,
      pending: users.filter(u => u.status === 'pending').length,
    };
  }, [users]);

  // Pending accounts (waiting for approval) and everyone else are shown as two separate lists,
  // so an Admin never has to filter to find who needs a decision.
  const matchesSearchAndRole = (u: User) => {
    const q = userSearchQuery.toLowerCase();
    const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  };

  const pendingUsers = useMemo(
    () => users.filter(u => u.status === 'pending' && matchesSearchAndRole(u)),
    [users, userSearchQuery, userRoleFilter],
  );
  const otherUsers = useMemo(
    () => users.filter(u => u.status !== 'pending' && matchesSearchAndRole(u)),
    [users, userSearchQuery, userRoleFilter],
  );

  const advisersList = useMemo(() => users.filter(u => u.role === 'adviser'), [users]);
  const panelistsList = useMemo(() => users.filter(u => u.role === 'panelist'), [users]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(sched => {
      const res = researchList.find(r => r.id === sched.researchId);

      const matchesDept = schedDeptFilter === 'all' || (res && res.departmentId === schedDeptFilter);
      const matchesDate = !schedDateFilter || sched.date === schedDateFilter;
      const matchesAdviser = schedAdviserFilter === 'all' || (res && res.adviserId === schedAdviserFilter);
      const matchesPanel = schedPanelFilter === 'all' || sched.panelistIds.includes(schedPanelFilter);
      const matchesRoom = schedRoomFilter === 'all' || sched.roomId === schedRoomFilter;
      const matchesStatus = schedStatusFilter === 'all' || sched.status === schedStatusFilter;

      return matchesDept && matchesDate && matchesAdviser && matchesPanel && matchesRoom && matchesStatus;
    });
  }, [schedules, researchList, schedDeptFilter, schedDateFilter, schedAdviserFilter, schedPanelFilter, schedRoomFilter, schedStatusFilter]);

  const handleEditUserClick = (u: User) => {
    setEditingUser(u);
    setNewUserForm({
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.departmentId || departments[0]?.id || '',
      courseId: u.courseId || courses[0]?.id || '',
      status: u.status,
    });
    setShowEditUserModal(true);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updated: User = {
      ...editingUser,
      name: newUserForm.name,
      email: newUserForm.email,
      role: newUserForm.role,
      departmentId: newUserForm.departmentId,
      courseId: newUserForm.courseId,
      status: newUserForm.status
    };

    onUpdateUser(updated);
    setShowEditUserModal(false);
    setEditingUser(null);
  };

  const closeEdit = () => { setShowEditUserModal(false); setEditingUser(null); };

  const getRoomName = (roomId: string) => rooms.find(r => r.id === roomId)?.name ?? (roomId === 'online' || !roomId ? 'Online meeting' : 'Room not found');

  const personColumn: Column<User> = {
    key: 'person', header: 'Person', primary: true,
    render: u => (
      <span className="flex items-center gap-3">
        <Avatar name={u.name} src={u.avatar} size="sm" />
        <span className="font-semibold text-slate-900">{u.name}</span>
      </span>
    ),
  };
  const roleColumn: Column<User> = { key: 'role', header: 'Role', render: u => <Badge tone="info">{roleLabels[u.role]}</Badge> };
  const emailColumn: Column<User> = { key: 'email', header: 'Email', render: u => <span className="break-all">{u.email}</span> };

  const pendingColumns: Column<User>[] = [
    personColumn, roleColumn, emailColumn,
    {
      key: 'actions', header: 'What you can do',
      render: u => (
        <span className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={Eye} onClick={() => setSelectedUserDetails(u)}>Details</Button>
          <Button variant="secondary" size="sm" icon={Pencil} onClick={() => handleEditUserClick(u)}>Edit</Button>
          <Button variant="secondary" size="sm" icon={CheckCircle2} onClick={() => onToggleUserStatus(u.id)}>Approve</Button>
          <Button variant="danger" size="sm" icon={XCircle} onClick={() => setUserToReject(u)}>Reject</Button>
        </span>
      ),
    },
  ];

  const otherColumns: Column<User>[] = [
    personColumn, roleColumn, emailColumn,
    { key: 'status', header: 'Account', render: u => <StatusBadge info={userStatus[u.status] ?? userStatus.active} /> },
    {
      key: 'actions', header: 'What you can do',
      render: u => {
        const isMe = u.id === user.id;
        return (
          <span className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={Eye} onClick={() => setSelectedUserDetails(u)}>Details</Button>
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => handleEditUserClick(u)}>Edit</Button>
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              disabled={isMe}
              title={isMe ? 'You cannot delete your own account.' : undefined}
              onClick={() => setUserToDelete(u)}
            >
              Delete
            </Button>
          </span>
        );
      },
    },
  ];

  const info = sectionInfo[currentSection];

  return (
    <div className="space-y-6">
      <PageHeader title={info.title} subtitle={info.subtitle} />

      {/* Switch between the three views */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose what to look at">
        {(Object.keys(sectionInfo) as Section[]).map(s => (
          <Button
            key={s}
            variant={currentSection === s ? 'primary' : 'secondary'}
            aria-pressed={currentSection === s}
            onClick={() => setCurrentSection(s)}
          >
            {sectionInfo[s].label}
          </Button>
        ))}
      </div>

      {/* OVERVIEW */}
      {currentSection === 'dashboard' && (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icon: Users, tone: 'text-blue-800', label: 'Accounts', value: userStats.total },
              { icon: Shield, tone: 'text-indigo-700', label: 'Coordinators', value: userStats.coordinators },
              { icon: Calendar, tone: 'text-emerald-700', label: 'Defenses', value: schedules.length },
              { icon: UserCheck, tone: 'text-emerald-700', label: 'Active accounts', value: userStats.active },
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card as="section" className="lg:col-span-12">
              <CardHeader
                title="Keep the data safe"
                description="Save a copy of the system’s data, or go back to the last saved copy."
                icon={<Database className="h-5 w-5" aria-hidden="true" />}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Save className="h-5 w-5 text-blue-800" aria-hidden="true" />
                    Back up the data
                  </h3>
                  <p className="text-sm text-slate-700">
                    Saves a copy of all accounts, papers, defenses and comments. It is safe to do at any time.
                  </p>
                  <Button icon={Save} fullWidth onClick={onBackupDatabase}>Back Up Now</Button>
                </div>

                <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <RotateCcw className="h-5 w-5 text-amber-800" aria-hidden="true" />
                    Restore the last backup
                  </h3>
                  <p className="text-sm text-slate-800">
                    Puts the data back to how it was at the last backup. Anything added since then will be lost.
                  </p>
                  <Button variant="secondary" icon={RotateCcw} fullWidth onClick={() => setConfirmingRestore(true)}>
                    Restore Last Backup
                  </Button>
                </div>
              </div>
            </Card>

          </div>
        </div>
      )}

      {/* ACCOUNTS */}
      {currentSection === 'user-management' && (
        <div className="space-y-6">
          {userStats.pending > 0 && (
            <Alert tone="warning" title={`${userStats.pending} ${userStats.pending === 1 ? 'person is' : 'people are'} waiting for approval`}>
              <span className="block">
                They asked for an account and cannot sign in yet. Check that you know them, then press “Approve” next to their name.
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => document.getElementById('pending-accounts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Go to the list
              </Button>
            </Alert>
          )}

          <Card className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Search accounts</h2>
              <p className="text-sm text-slate-600">Applies to both lists below.</p>
            </div>

            <div className="relative">
              <label htmlFor="user-search" className="sr-only">Search accounts</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                id="user-search"
                type="search"
                placeholder="Search by name or email"
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-base text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
              />
            </div>

            <Select label="Role" value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
              <option value="all">All roles</option>
              {roleOptions.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
            </Select>
          </Card>

          {/* Waiting for approval: kept apart so it never gets lost among everyone else */}
          <section id="pending-accounts" aria-labelledby="pending-accounts-title" className="scroll-mt-4 space-y-3">
            <div>
              <h2 id="pending-accounts-title" className="text-base font-bold text-slate-900">
                Waiting for Approval ({pendingUsers.length})
              </h2>
              <p className="text-sm text-slate-600">New registrations. Approve someone you know, or reject the request.</p>
            </div>
            <Table
              caption="Accounts waiting for approval"
              columns={pendingColumns}
              rows={pendingUsers}
              rowKey={u => u.id}
              empty={
                <Card padded={false}>
                  <EmptyState
                    icon={Users}
                    title="Nobody is waiting"
                    description={userStats.pending === 0 ? 'No one has registered yet.' : 'No pending registration matches your search.'}
                  />
                </Card>
              }
            />
          </section>

          {/* Everyone already approved (or otherwise not pending) */}
          <section aria-labelledby="other-accounts-title" className="space-y-3">
            <div>
              <h2 id="other-accounts-title" className="text-base font-bold text-slate-900">
                Approved Accounts ({otherUsers.length})
              </h2>
              <p className="text-sm text-slate-600">Use the buttons next to a name to see, edit or delete an account.</p>
            </div>
            <Table
              caption="Approved accounts"
              columns={otherColumns}
              rows={otherUsers}
              rowKey={u => u.id}
              empty={
                <Card padded={false}>
                  <EmptyState
                    icon={Users}
                    title="No accounts match your search"
                    description="Try a shorter search, or choose “All roles”."
                  />
                </Card>
              }
            />
          </section>
        </div>
      )}

      {/* ALL DEFENSES */}
      {currentSection === 'schedules' && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Calendar className="h-5 w-5 text-blue-800" aria-hidden="true" />
              Filter the defenses
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select label="Department" value={schedDeptFilter} onChange={e => setSchedDeptFilter(e.target.value)}>
                <option value="all">All departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
              </Select>
              <Input label="Date" type="date" value={schedDateFilter} onChange={e => setSchedDateFilter(e.target.value)} />
              <Select label="Adviser" value={schedAdviserFilter} onChange={e => setSchedAdviserFilter(e.target.value)}>
                <option value="all">All advisers</option>
                {advisersList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
              <Select label="Panel member" value={schedPanelFilter} onChange={e => setSchedPanelFilter(e.target.value)}>
                <option value="all">All panel members</option>
                {panelistsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Select label="Room" value={schedRoomFilter} onChange={e => setSchedRoomFilter(e.target.value)}>
                <option value="all">All rooms</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
              <Select label="Status" value={schedStatusFilter} onChange={e => setSchedStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </Card>

          {filteredSchedules.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={Calendar}
                title="No defenses match your filters"
                description="Try clearing some of the filters above."
              />
            </Card>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSchedules.map(sched => {
                const res = researchList.find(r => r.id === sched.researchId);
                const dpt = departments.find(d => d.id === res?.departmentId);
                return (
                  <li key={sched.id}>
                    <Card as="article" className="flex h-full flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone="info">{dpt ? dpt.code : 'NORMI'}</Badge>
                        <StatusBadge info={scheduleStatus[sched.status]} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold leading-snug text-slate-900 line-clamp-3" title={res?.title}>
                          {res ? res.title : 'Research paper'}
                        </h3>
                        <p className="text-sm text-slate-700">{defenseTypeLabels[sched.type] ?? sched.type}</p>
                        <p className="flex items-center gap-1.5 text-sm text-slate-800">
                          <Clock className="h-4 w-4 text-blue-800" aria-hidden="true" />
                          {formatDate(sched.date)}, {formatTime(sched.startTime)} to {formatTime(sched.endTime)}
                        </p>
                      </div>
                      <div className="mt-auto space-y-1 border-t border-slate-200 pt-3 text-sm text-slate-700">
                        <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />{getRoomName(sched.roomId)}</p>
                        <p className="flex items-center gap-1.5"><Users className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />{sched.panelistIds.length} panel members</p>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Account details */}
      <Modal
        open={!!selectedUserDetails}
        onClose={() => setSelectedUserDetails(null)}
        title="Account details"
        size="sm"
        footer={<Button variant="secondary" onClick={() => setSelectedUserDetails(null)}>Close</Button>}
      >
        {selectedUserDetails && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Avatar name={selectedUserDetails.name} src={selectedUserDetails.avatar} size="lg" />
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900">{selectedUserDetails.name}</p>
                <p className="break-all text-sm text-slate-700">{selectedUserDetails.email}</p>
              </div>
            </div>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {[
                ['Role', roleLabels[selectedUserDetails.role]],
                ['Department', departments.find(d => d.id === selectedUserDetails.departmentId)?.name || '—'],
                ['Account', (userStatus[selectedUserDetails.status] ?? userStatus.active).label],
                ['Account created', selectedUserDetails.registeredAt ? formatDateLong(selectedUserDetails.registeredAt) : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 p-3">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="text-right font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>

      {/* Edit an account */}
      <Modal
        open={showEditUserModal && !!editingUser}
        onClose={closeEdit}
        title="Change account details"
        description="Fields marked with * are required."
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit}>Cancel</Button>
            <Button type="submit" form="edit-user-form">Save Changes</Button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={handleEditUserSubmit} className="space-y-5">
          <Input label="Full name" required value={newUserForm.name} onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })} />
          <Input label="Email" type="email" required value={newUserForm.email} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })} />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select label="Role" value={newUserForm.role} onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}>
              {roleOptions.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
            </Select>
            <Select label="Department" value={newUserForm.departmentId} onChange={e => setNewUserForm({ ...newUserForm, departmentId: e.target.value })}>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
            </Select>
          </div>
        </form>
      </Modal>

      {/* Are you sure? */}
      <ConfirmDialog
        open={!!userToDelete}
        onCancel={() => setUserToDelete(null)}
        onConfirm={() => {
          if (userToDelete) onDeleteUserAccount(userToDelete.id);
          setUserToDelete(null);
        }}
        title={`Delete ${userToDelete?.name ?? 'this account'}?`}
        message="This person will no longer be able to sign in, and the account will be removed for good. This cannot be undone."
        confirmLabel="Yes, Delete Account"
        cancelLabel="No, Keep Account"
        destructive
      />
      <ConfirmDialog
        open={!!userToReject}
        onCancel={() => setUserToReject(null)}
        onConfirm={() => {
          if (userToReject) onDeleteUserAccount(userToReject.id);
          setUserToReject(null);
        }}
        title={`Reject ${userToReject?.name ?? "this person"}'s registration?`}
        message="Their request is removed for good. If they still want an account, they will need to register again."
        confirmLabel="Yes, Reject Registration"
        cancelLabel="No, Keep Waiting"
        destructive
      />
      <ConfirmDialog
        open={confirmingRestore}
        onCancel={() => setConfirmingRestore(false)}
        onConfirm={() => { onRestoreDatabase(); setConfirmingRestore(false); }}
        title="Restore the last backup?"
        message="All data goes back to how it was at the last backup. Anything added since then will be lost. This cannot be undone."
        confirmLabel="Yes, Restore Backup"
        cancelLabel="No, Keep Current Data"
        destructive
      />
    </div>
  );
}
