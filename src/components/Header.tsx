import React, { useState } from 'react';
import { Bell, Clock, Menu, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { User, SystemNotification } from '../types';

interface HeaderProps {
  user: User;
  notifications: SystemNotification[];
  onMarkNotificationsAsRead: () => void;
  onToggleSidebar: () => void;
  activeTab: string;
}

export default function Header({ 
  user, notifications, onMarkNotificationsAsRead, onToggleSidebar, activeTab 
}: HeaderProps) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const unreadCount = notifications.filter(n => n.userId === user.id && !n.read).length;
  const userNotifications = notifications.filter(n => n.userId === user.id);

  const getBreadcrumbs = () => {
    const formattedTab = activeTab
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return ['Academic Portal', formattedTab];
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
      default: return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <header className="bg-white/40 backdrop-blur-md border-b border-white/25 h-16 px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Left side: Hamburger and Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/30 border border-white/20 text-slate-500 cursor-pointer"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          {getBreadcrumbs().map((crumb, idx, arr) => (
            <React.Fragment key={idx}>
              <span className={idx === arr.length - 1 ? "text-slate-800 font-bold" : ""}>
                {crumb}
              </span>
              {idx < arr.length - 1 && <span className="text-[10px] text-slate-350">/</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right side: Time, Notifications, User details */}
      <div className="flex items-center gap-4">
        {/* Real-time UTC indicators / local time */}
        <div className="hidden md:flex items-center gap-1.5 bg-white/35 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20 text-[11px] font-mono font-medium text-slate-650">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>Jul 06, 2026 • 07:03 AM</span>
        </div>

        {/* Notifications Icon with dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-lg border border-white/20 bg-white/20 hover:bg-white/40 text-slate-650 relative transition-colors cursor-pointer"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white/80 backdrop-blur-md border border-white/30 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="bg-white/40 px-4 py-2.5 border-b border-white/20 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">Notifications ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => {
                      onMarkNotificationsAsRead();
                      setShowNotifDropdown(false);
                    }}
                    className="text-[10px] text-blue-800 font-semibold hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {userNotifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No notifications yet.
                  </div>
                ) : (
                  userNotifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-3 text-xs flex gap-2.5 items-start hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-blue-50/20' : ''}`}
                    >
                      {getNotificationIcon(notif.type)}
                      <div className="space-y-0.5">
                        <p className={`font-semibold ${!notif.read ? 'text-slate-800' : 'text-slate-600'}`}>{notif.title}</p>
                        <p className="text-slate-500 text-[11px] leading-relaxed">{notif.message}</p>
                        <span className="text-[9px] text-slate-450 block font-mono">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Frame */}
        <div className="flex items-center gap-2.5 border-l border-white/25 pl-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-800 block max-w-40 truncate">{user.name}</span>
            <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wide bg-blue-100/30 border border-blue-500/15 px-1.5 py-0.25 rounded">
              {user.role}
            </span>
          </div>
          <img 
            src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
            alt={user.name} 
            className="h-8 w-8 rounded-full border border-white/20 ring-2 ring-blue-100/30 shrink-0"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
