import React, { useEffect } from 'react';
import {
  Landmark, Home, FileText, CalendarDays, BookOpen, ClipboardCheck,
  LogOut, X, FileSearch, UserCog,
  type LucideIcon,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { getPageTitle, cx } from '../ui';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  users: User[];
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
}

interface NavItem { id: string; icon: LucideIcon }
interface NavGroup { heading: string; items: NavItem[] }

/**
 * The menu. Page ids (dashboard, repository, ...) are internal and unchanged; only the
 * words people read come from getPageTitle(). Pages that were listed twice but opened the
 * exact same screen (e.g. "Adviser Dashboard" and "Assigned Groups") now appear once.
 */
function getNavGroups(role: UserRole): NavGroup[] {
  const work: Record<UserRole, NavItem[]> = {
    student: [
      { id: 'dashboard', icon: Home },
      { id: 'research-details', icon: FileText },
    ],
    adviser: [
      { id: 'dashboard', icon: Home },
      { id: 'document-review', icon: FileSearch },
    ],
    coordinator: [
      { id: 'dashboard', icon: ClipboardCheck },
    ],
    panelist: [
      { id: 'dashboard', icon: ClipboardCheck },
    ],
    admin: [
      { id: 'dashboard', icon: Home },
      { id: 'user-management', icon: UserCog },
    ],
  };

  return [
    { heading: 'My Work', items: work[role] },
    {
      heading: 'Explore',
      items: [
        { id: 'repository', icon: BookOpen },
        { id: 'calendar', icon: CalendarDays },
      ],
    },
  ];
}

export default function Sidebar({
  user, activeTab, setActiveTab, onLogout, isSidebarOpen, onCloseSidebar,
}: SidebarProps) {
  const groups = getNavGroups(user.role);

  // Esc closes the phone menu.
  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseSidebar();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSidebarOpen, onCloseSidebar]);

  return (
    <>
      {isSidebarOpen && (
        <div onClick={onCloseSidebar} aria-hidden="true" className="lg:hidden fixed inset-0 bg-slate-900/60 z-40" />
      )}

      <aside
        aria-label="Main menu"
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-navy-900 text-white shadow-xl transition-transform duration-200',
          'lg:static lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none shrink-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-navy-900 shrink-0">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-lg font-bold leading-none">NORMI</p>
              <p className="mt-1 text-xs text-blue-100 leading-tight">Research Management System</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseSidebar}
            aria-label="Close menu"
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Menu */}
        <nav aria-label="Pages" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map(group => (
            <div key={group.heading}>
              <p className="px-3 mb-1.5 text-xs font-bold text-blue-200">{group.heading}</p>
              <ul className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => { setActiveTab(item.id); onCloseSidebar(); }}
                        className={cx(
                          'flex w-full min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors cursor-pointer',
                          isActive
                            ? 'bg-white text-navy-900'
                            : 'text-blue-50 hover:bg-white/10',
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span>{getPageTitle(item.id, user.role)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom: sign out */}
        <div className="border-t border-white/10 px-3 py-4 space-y-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-blue-50 hover:bg-white/10 cursor-pointer"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
