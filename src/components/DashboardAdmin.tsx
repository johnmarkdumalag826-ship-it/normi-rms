import React, { useState, useMemo } from 'react';
import { 
  Users, UserCheck, Shield, ShieldAlert, Key, Edit3, Trash2, Search, Filter, 
  Plus, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Info, Eye, Save, Settings, Database, RotateCcw
} from 'lucide-react';
import { Schedule, Research, User, UserRole, Room } from '../types';

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
  onAddUserAccount: (newUser: User, password: string) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUserAccount: (id: string) => void;
  onBackupDatabase: () => void;
  onRestoreDatabase: () => void;
}

export default function DashboardAdmin({
  user, users, schedules, researchList, departments, courses, rooms, activeSection = 'dashboard',
  onToggleUserStatus, onUpdateUserRole, onAddUserAccount, onUpdateUser, onDeleteUserAccount,
  onBackupDatabase, onRestoreDatabase
}: DashboardAdminProps) {
  
  // Navigation section
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'user-management' | 'schedules'>(
    activeSection === 'user-management' ? 'user-management' : 'dashboard'
  );

  // States for User Management
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states for New / Edited User
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'student' as UserRole,
    departmentId: departments[0]?.id || '',
    courseId: courses[0]?.id || '',
    status: 'active' as User['status'],
    password: ''
  });

  // States for Schedule Filtering
  const [schedDeptFilter, setSchedDeptFilter] = useState<string>('all');
  const [schedDateFilter, setSchedDateFilter] = useState<string>('');
  const [schedAdviserFilter, setSchedAdviserFilter] = useState<string>('all');
  const [schedPanelFilter, setSchedPanelFilter] = useState<string>('all');
  const [schedRoomFilter, setSchedRoomFilter] = useState<string>('all');
  const [schedStatusFilter, setSchedStatusFilter] = useState<string>('all');

  // Stats summaries
  const userStats = useMemo(() => {
    return {
      total: users.length,
      students: users.filter(u => u.role === 'student').length,
      faculty: users.filter(u => u.role === 'adviser' || u.role === 'panelist').length,
      coordinators: users.filter(u => u.role === 'coordinator').length,
      admins: users.filter(u => u.role === 'admin').length,
      active: users.filter(u => u.status === 'active').length,
      suspended: users.filter(u => u.status === 'suspended').length
    };
  }, [users]);

  // Filtered Users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                            u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.id.toLowerCase().includes(userSearchQuery.toLowerCase());
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearchQuery, userRoleFilter, userStatusFilter]);

  // Faculty and advisers for filtering lists
  const advisersList = useMemo(() => {
    return users.filter(u => u.role === 'adviser');
  }, [users]);

  const panelistsList = useMemo(() => {
    return users.filter(u => u.role === 'panelist');
  }, [users]);

  // Filtered Schedules list
  const filteredSchedules = useMemo(() => {
    return schedules.filter(sched => {
      const res = researchList.find(r => r.id === sched.researchId);
      
      // Filter by Department
      const matchesDept = schedDeptFilter === 'all' || (res && res.departmentId === schedDeptFilter);
      
      // Filter by Date
      const matchesDate = !schedDateFilter || sched.date === schedDateFilter;
      
      // Filter by Adviser
      const matchesAdviser = schedAdviserFilter === 'all' || (res && res.adviserId === schedAdviserFilter);
      
      // Filter by Panelist
      const matchesPanel = schedPanelFilter === 'all' || sched.panelistIds.includes(schedPanelFilter);
      
      // Filter by Room
      const matchesRoom = schedRoomFilter === 'all' || sched.roomId === schedRoomFilter;
      
      // Filter by Status
      const matchesStatus = schedStatusFilter === 'all' || sched.status === schedStatusFilter;

      return matchesDept && matchesDate && matchesAdviser && matchesPanel && matchesRoom && matchesStatus;
    });
  }, [schedules, researchList, schedDeptFilter, schedDateFilter, schedAdviserFilter, schedPanelFilter, schedRoomFilter, schedStatusFilter]);

  // Handle adding user
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) return;

    const newId = `usr-${Date.now()}`;
    const userAccount: User = {
      id: newId,
      name: newUserForm.name,
      email: newUserForm.email,
      role: newUserForm.role,
      departmentId: newUserForm.departmentId,
      courseId: newUserForm.courseId,
      status: newUserForm.status,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(newUserForm.name)}`,
      registeredAt: new Date().toISOString()
    };

    onAddUserAccount(userAccount, newUserForm.password);
    setShowAddUserModal(false);
    // Reset form
    setNewUserForm({
      name: '',
      email: '',
      role: 'student',
      departmentId: departments[0]?.id || '',
      courseId: courses[0]?.id || '',
      status: 'active',
      password: ''
    });
  };

  // Handle editing user
  const handleEditUserClick = (u: User) => {
    setEditingUser(u);
    setNewUserForm({
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.departmentId || departments[0]?.id || '',
      courseId: u.courseId || courses[0]?.id || '',
      status: u.status,
      password: ''
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

  // Simulated Password Reset Action
  const handleResetPassword = (u: User) => {
    alert(`Reset Password link has been generated and queued for transmission to: ${u.email}\n\nTemporary Secret Hash: MD5_${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">NORMI Administrative Panel</span>
          <h2 className="text-xl font-bold text-slate-800 font-serif leading-none">Super Administrator Suite</h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Audit system operations, modify core records, configure role authorizations, and examine defense schedules across all departments.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setCurrentSection('dashboard')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              currentSection === 'dashboard'
                ? 'bg-blue-800 text-white shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            System Operations
          </button>
          <button
            onClick={() => setCurrentSection('user-management')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              currentSection === 'user-management'
                ? 'bg-blue-800 text-white shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            User & Role Management
          </button>
          <button
            onClick={() => setCurrentSection('schedules')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              currentSection === 'schedules'
                ? 'bg-blue-800 text-white shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            Defense Schedules
          </button>
        </div>
      </div>

      {/* 1. OPERATIONS DASHBOARD VIEW */}
      {currentSection === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total Accounts</span>
                <span className="text-base font-extrabold text-slate-800">{userStats.total} registered</span>
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Assigned Coordinators</span>
                <span className="text-base font-extrabold text-slate-800">{userStats.coordinators} active</span>
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Defense Schedules</span>
                <span className="text-base font-extrabold text-slate-800">{schedules.length} tracked</span>
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Vetted Accounts</span>
                <span className="text-base font-extrabold text-slate-800">{userStats.active} Active</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* System Status / Maintenance card */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-150 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  NORMI MySQL Schema Integrity & Maintenance
                </h3>
                <p className="text-xs text-slate-500">Perform institutional hot backups and database structural audits</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-800" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase">Physical Database Backups</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Trigger full DDL script transcription. This exports all tables (users, schedules, research, comments) into a secure standalone SQL backup archive.
                  </p>
                  <button
                    onClick={onBackupDatabase}
                    className="w-full py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Save className="h-4 w-4" />
                    Backup DDL Schema
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-indigo-800" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase">Hot Rollback Points</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Recover previous database states immediately. This restores all records to their latest secure rollback coordinates to clear system conflicts.
                  </p>
                  <button
                    onClick={onRestoreDatabase}
                    className="w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-500" />
                    Hot Recovery Restore
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnostics Panel */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                Operational Handshake Metrics
              </h3>
              
              <div className="space-y-4 text-xs font-mono text-slate-650">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>CPU Allocation</span>
                    <span className="text-blue-800">12.4% Optimal</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-700 rounded-full" style={{ width: '12%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Heap Memory Load</span>
                    <span className="text-blue-800">145MB / 512MB</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-700 rounded-full" style={{ width: '28%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Database Index Size</span>
                    <span className="text-blue-800">22KB Index | 14 Tables</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-700 rounded-full" style={{ width: '8%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. USER & ROLE MANAGEMENT VIEW */}
      {currentSection === 'user-management' && (
        <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
          
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4.5 w-4.5 text-blue-800" />
                Institutional Directory & Role Credentials
              </h3>
              <p className="text-xs text-slate-400">Search, edit, reset passwords, delete, and adjust system permissions for all campus personnel.</p>
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add User Account
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user accounts by name, email, or ID..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-800 font-semibold"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="adviser">Advisers</option>
                <option value="panelist">Panelists</option>
                <option value="coordinator">Coordinators</option>
                <option value="admin">Administrators</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left text-slate-650 border-collapse">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-200">
                <tr>
                  <th className="p-3">User/Researcher</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No registered user accounts match your search parameters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.id}`}
                            alt={u.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-slate-100 bg-slate-50"
                          />
                          <div>
                            <span className="font-bold text-slate-800 block leading-snug">{u.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">ID: {u.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded font-mono ${
                          u.role === 'admin' ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : u.role === 'coordinator' ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : u.role === 'adviser' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : u.role === 'panelist' ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-150'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-550">{u.email}</td>
                      <td className="p-3">
                        <button
                          onClick={() => onToggleUserStatus(u.id)}
                          className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded cursor-pointer border transition-colors ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-100 hover:bg-rose-100'
                          }`}
                        >
                          {u.status === 'active' ? '● Active' : '○ Suspended'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setSelectedUserDetails(u)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-all"
                            title="View Account Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-all"
                            title="Send Password Reset Link"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditUserClick(u)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-all"
                            title="Edit Account Information"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteUserAccount(u.id)}
                            disabled={u.id === user.id}
                            className={`p-1 rounded-lg transition-all ${
                              u.id === user.id 
                                ? 'text-slate-200 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            }`}
                            title="Delete Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. DEFENSE SCHEDULES MONITOR VIEW */}
      {currentSection === 'schedules' && (
        <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
          
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-blue-800" />
              Active Institutional Defense Schedules Monitor
            </h3>
            <p className="text-xs text-slate-400">
              Admin possesses read-only access to schedules and reserves the right to audit and filter schedules across all departments.
            </p>
          </div>

          {/* Multi filters bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Department</label>
              <select
                value={schedDeptFilter}
                onChange={(e) => setSchedDeptFilter(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Depts</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.code}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Date</label>
              <input
                type="date"
                value={schedDateFilter}
                onChange={(e) => setSchedDateFilter(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Adviser</label>
              <select
                value={schedAdviserFilter}
                onChange={(e) => setSchedAdviserFilter(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Advisers</option>
                {advisersList.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Panelist</label>
              <select
                value={schedPanelFilter}
                onChange={(e) => setSchedPanelFilter(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Panelists</option>
                {panelistsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Room</label>
              <select
                value={schedRoomFilter}
                onChange={(e) => setSchedRoomFilter(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Rooms</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Status</label>
              <select
                value={schedStatusFilter}
                onChange={(e) => setSchedStatusFilter(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Schedules list Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredSchedules.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-450 text-xs">
                No active defense schedules match your specified filter parameters.
              </div>
            ) : (
              filteredSchedules.map(sched => {
                const res = researchList.find(r => r.id === sched.researchId);
                const dpt = departments.find(d => d.id === (res?.departmentId));
                return (
                  <div key={sched.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden flex flex-col justify-between gap-3.5 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-150 uppercase">
                        {dpt ? dpt.code : 'NORMI'}
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        sched.status === 'completed' ? 'bg-emerald-50 text-emerald-700'
                          : sched.status === 'cancelled' ? 'bg-rose-50 text-rose-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {sched.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug" title={res?.title}>
                        {res ? res.title : 'Capstone Presentation Title'}
                      </h4>
                      <p className="text-[10px] text-slate-450 font-medium font-mono flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {sched.date} ({sched.startTime} - {sched.endTime})
                      </p>
                    </div>

                    <div className="border-t border-slate-200/60 pt-2 flex flex-col gap-1 text-[10px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{sched.roomId || 'Virtual Classroom'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Panelists: {sched.panelistIds.length} members</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW ACCOUNT DETAILS MODAL */}
      {selectedUserDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-150 w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="h-4.5 w-4.5 text-blue-800" />
                Researcher Details Record
              </h3>
              <button 
                type="button" 
                onClick={() => setSelectedUserDetails(null)}
                className="text-slate-450 hover:text-slate-650 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
              <img
                src={selectedUserDetails.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedUserDetails.id}`}
                alt={selectedUserDetails.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full border border-slate-200"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-800 leading-snug">{selectedUserDetails.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{selectedUserDetails.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-800 text-[9px] font-bold rounded uppercase font-mono">
                  {selectedUserDetails.role}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1 text-slate-600 font-medium">
              <div className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-150">
                <span className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Account ID</span>
                <span className="font-mono text-slate-800 font-bold">{selectedUserDetails.id}</span>
              </div>

              <div className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-150">
                <span className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Authorization Role</span>
                <span className="text-slate-800 font-bold capitalize">{selectedUserDetails.role}</span>
              </div>

              <div className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-150">
                <span className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Assigned Department</span>
                <span className="text-slate-800 font-bold">
                  {departments.find(d => d.id === selectedUserDetails.departmentId)?.code || 'N/A'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-150">
                <span className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Activity Status</span>
                <span className={`font-bold ${selectedUserDetails.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedUserDetails.status === 'active' ? 'Active' : 'Suspended'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setSelectedUserDetails(null)}
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleAddUserSubmit}
            className="bg-white rounded-xl border border-slate-150 w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="h-4.5 w-4.5 text-blue-800" />
                Register Campus Account
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-450 hover:text-slate-650 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arthur Pendelton"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-800 font-semibold"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. arthur.pendelton@cit.edu"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-800 font-semibold"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">System Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    <option value="student">Student</option>
                    <option value="adviser">Adviser</option>
                    <option value="panelist">Panelist</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Department</label>
                  <select
                    value={newUserForm.departmentId}
                    onChange={(e) => setNewUserForm({...newUserForm, departmentId: e.target.value})}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Register User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT USER DETAILS MODAL */}
      {showEditUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleEditUserSubmit}
            className="bg-white rounded-xl border border-slate-150 w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Edit3 className="h-4.5 w-4.5 text-blue-800" />
                Modify Account Details
              </h3>
              <button 
                type="button" 
                onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                className="text-slate-450 hover:text-slate-650 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-800 font-semibold"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">System Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    <option value="student">Student</option>
                    <option value="adviser">Adviser</option>
                    <option value="panelist">Panelist</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Department</label>
                  <select
                    value={newUserForm.departmentId}
                    onChange={(e) => setNewUserForm({...newUserForm, departmentId: e.target.value})}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
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
