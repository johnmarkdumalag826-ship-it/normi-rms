import React from 'react';
import { 
  Landmark, LayoutDashboard, FileUp, ListTodo, Calendar, BookOpen, 
  Settings, Users, ClipboardList, Database, LogOut, RefreshCw, 
  HelpCircle, UserCheck, Volume2 
} from 'lucide-react';
import { User, UserRole } from '../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  users: User[];
  onEmulateRole: (role: UserRole) => void;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export default function Sidebar({
  user, activeTab, setActiveTab, onLogout, users, onEmulateRole, isSidebarOpen, onCloseSidebar
}: SidebarProps) {
  
  const getNavItems = () => {
    const isCoordinator = user.role === 'coordinator';
    const common = [
      { id: 'repository', label: 'Digital Repository', icon: BookOpen },
      { id: 'calendar', label: isCoordinator ? 'Defense Calendar' : 'Defense Schedules', icon: Calendar },
      { id: 'database-erd', label: 'MySQL ERD Schema', icon: Database },
    ];

    switch (user.role) {
      case 'student':
        return [
          { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
          { id: 'research-details', label: 'My Research Timeline', icon: ListTodo },
          ...common
        ];
      case 'adviser':
        return [
          { id: 'dashboard', label: 'Adviser Dashboard', icon: LayoutDashboard },
          { id: 'assigned-students', label: 'Assigned Groups', icon: Users },
          { id: 'document-review', label: 'Document Review', icon: FileUp },
          ...common
        ];
      case 'coordinator':
        return [
          { id: 'dashboard', label: 'Coordinator Dashboard', icon: LayoutDashboard },
          { id: 'coordinator-manuscripts', label: 'Research Proposals', icon: ClipboardList },
          ...common
        ];
      case 'panelist':
        return [
          { id: 'dashboard', label: 'Evaluation Panel', icon: LayoutDashboard },
          { id: 'assigned-defenses', label: 'Assigned Defenses', icon: ClipboardList },
          ...common
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
          { id: 'user-management', label: 'User & Role Management', icon: Users },
          ...common
        ];
      default:
        return common;
    }
  };

  const navItems = getNavItems();

  // Emulation list
  const emulableRoles: { role: UserRole; label: string; name: string }[] = [
    { role: 'student', label: 'Student', name: 'Team Alpha' },
    { role: 'adviser', label: 'Adviser', name: 'Dr. John Dumalag' },
    { role: 'coordinator', label: 'Coordinator', name: 'Prof. Patrick Kimpang' },
    { role: 'panelist', label: 'Panelist', name: 'Dr. Arthur Pendelton' },
    { role: 'admin', label: 'Admin', name: 'Dr. Irish Sajol' }
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          onClick={onCloseSidebar}
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-45"
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 glass-panel-dark text-slate-100 w-64 p-5 flex flex-col justify-between z-50 transition-transform duration-300 shadow-xl
        lg:translate-x-0 lg:static lg:h-screen shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-serif font-bold text-white tracking-tight leading-none">NORMI</h1>
              <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold block mt-1">Research System</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onCloseSidebar();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer
                    ${isActive 
                      ? 'bg-blue-600/80 text-white shadow-lg border border-white/15' 
                      : 'hover:bg-white/5 hover:text-white text-slate-300'}
                  `}
                >
                  <IconComponent className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Panel: Emulation Widget & Logout */}
        <div className="space-y-4 border-t border-white/10 pt-5">
          {/* Real-time Role Switcher for presentation ease */}
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />
              <span>Role Switcher Emulation</span>
            </div>
            
            <div className="grid grid-cols-1 gap-1 text-[10px]">
              {emulableRoles.map((emul) => (
                <button
                  key={emul.role}
                  onClick={() => onEmulateRole(emul.role)}
                  className={`
                    w-full text-left px-2 py-1 rounded transition-colors flex justify-between items-center cursor-pointer
                    ${user.role === emul.role 
                      ? 'bg-blue-900/40 border border-blue-500/20 text-blue-200' 
                      : 'hover:bg-white/5 text-slate-300'}
                  `}
                >
                  <span className="font-medium truncate">{emul.label}</span>
                  {user.role === emul.role && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                </button>
              ))}
            </div>
          </div>

          {/* Logout Action */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-300 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-400" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
