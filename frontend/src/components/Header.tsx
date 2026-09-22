import React, { useEffect, useRef, useState } from 'react';
import { Bell, Clock, Menu, CheckCircle2, AlertTriangle, Info, KeyRound } from 'lucide-react';
import { User, SystemNotification } from '../types';
import { roleLabels, getPageTitle, formatDateTime, Avatar, Badge, IconButton } from '../ui';

interface HeaderProps {
  user: User;
  notifications: SystemNotification[];
  onMarkNotificationsAsRead: () => void;
  onToggleSidebar: () => void;
  onOpenChangePassword: () => void;
  activeTab: string;
}

export default function Header({
  user, notifications, onMarkNotificationsAsRead, onToggleSidebar, onOpenChangePassword, activeTab,
}: HeaderProps) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const notifRef = useRef<HTMLDivElement>(null);

  const userNotifications = notifications.filter(n => n.userId === user.id);
  const unreadCount = userNotifications.filter(n => !n.read).length;

  // Real clock, refreshed every 30 seconds.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Close the notification list with Esc or a click outside it.
  useEffect(() => {
    if (!showNotifDropdown) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowNotifDropdown(false);
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifDropdown(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [showNotifDropdown]);

  const notificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" aria-hidden="true" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0" aria-hidden="true" />;
      default: return <Info className="h-5 w-5 text-blue-800 shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Left: menu button (phones) and the name of the current page */}
      <div className="flex items-center gap-2 min-w-0">
        <IconButton icon={Menu} label="Open menu" onClick={onToggleSidebar} className="lg:hidden -ml-2" />
        <p className="truncate text-sm font-semibold text-slate-600">
          <span className="hidden sm:inline">You are here: </span>
          <span className="text-slate-900">{getPageTitle(activeTab, user.role)}</span>
        </p>
      </div>

      {/* Right: date and time, notifications, who is signed in */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <time dateTime={now.toISOString()}>{formatDateTime(now)}</time>
        </div>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifDropdown(v => !v)}
            aria-expanded={showNotifDropdown}
            aria-haspopup="true"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} new` : 'Notifications, none new'}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-700 px-1 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-50">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Notifications {unreadCount > 0 && <span className="font-normal text-slate-600">({unreadCount} new)</span>}
                </h2>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => { onMarkNotificationsAsRead(); setShowNotifDropdown(false); }}
                    className="min-h-11 px-2 text-sm font-semibold text-blue-800 hover:underline cursor-pointer"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {userNotifications.length === 0 ? (
                  <li className="p-6 text-center text-sm text-slate-600">
                    You have no notifications yet. We will tell you here when something changes.
                  </li>
                ) : (
                  userNotifications.map(n => (
                    <li key={n.id} className={`flex gap-3 p-4 ${!n.read ? 'bg-blue-50' : ''}`}>
                      {notificationIcon(n.type)}
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900">
                          {n.title}
                          {!n.read && <span className="ml-2 text-xs font-bold text-blue-800">New</span>}
                        </p>
                        <p className="text-sm text-slate-700">{n.message}</p>
                        <p className="text-xs text-slate-600">{formatDateTime(n.createdAt)}</p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Who is signed in, and a button to change your own password */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3 sm:pl-4">
          <div className="hidden sm:block text-right min-w-0">
            <p className="max-w-44 truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <Badge tone="info">{roleLabels[user.role]}</Badge>
          </div>
          <Avatar name={user.name} src={user.avatar} size="md" />
          <IconButton icon={KeyRound} label="Change my password" onClick={onOpenChangePassword} />
        </div>
      </div>
    </header>
  );
}
