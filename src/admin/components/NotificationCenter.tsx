import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell, CheckCheck, Trash2, Phone, MessageSquare, ExternalLink,
  UserPlus, Building2, AlertCircle, ShieldCheck, X, Volume2, VolumeX
} from 'lucide-react';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type AppNotification
} from '../../services/firebase';

// Synthesize pleasant sound using Web Audio API (no external MP3 needed)
const playChimeSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch {
    // Audio context may be restricted by autoplay policy
  }
};

const formatTimeAgo = (dateStr: string, isMr: boolean): string => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return isMr ? 'आत्ताच (Just now)' : 'Just now';
  if (minutes < 60) return isMr ? `${minutes} मिनिटांपूर्वी` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isMr ? `${hours} तासांपूर्वी` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isMr ? `${days} दिवसांपूर्वी` : `${days}d ago`;
};

export const NotificationCenter: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const navigate = useNavigate();

  // Request browser desktop notification permission
  const requestDesktopPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    const unsub = subscribeToNotifications((notifs) => {
      // Check for newly arrived notifications
      if (initialLoadDone.current && soundEnabled) {
        const hasNew = notifs.some(n => n.id && !knownIdsRef.current.has(n.id) && !n.read);
        if (hasNew) {
          playChimeSound();
          // Desktop alert if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            const latest = notifs[0];
            new Notification(isMr ? (latest.titleMr || latest.title || 'Sahyadri Notification') : (latest.title || latest.titleMr || 'Sahyadri Notification'), {
              body: isMr ? (latest.messageMr || latest.message || 'New update available') : (latest.message || latest.messageMr || 'New update available'),
              icon: '/favicon.ico'
            });
          }
        }
      }

      // Update known ids
      notifs.forEach(n => {
        if (n.id) knownIdsRef.current.add(n.id);
      });
      initialLoadDone.current = true;
      setNotifications(notifs);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [soundEnabled]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const displayedList = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const handleMarkAsRead = async (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read && n.id).map(n => n.id as string);
    if (unreadIds.length > 0) {
      await markAllNotificationsAsRead(unreadIds);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;
    await deleteNotification(id);
  };

  const handleNavigate = (link?: string, notifId?: string) => {
    if (notifId) markNotificationAsRead(notifId);
    setIsOpen(false);
    if (link) navigate(link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          requestDesktopPermission();
        }}
        className="relative p-2.5 rounded-full text-slate-600 hover:text-primary hover:bg-slate-100 transition-colors focus:outline-none"
        title={isMr ? "सूचना (Notifications)" : "Notifications"}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm tracking-wide">{isMr ? 'सूचना (Notifications)' : 'Notifications'}</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 rounded-full">
                  {unreadCount} {isMr ? 'नवीन' : 'New'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10"
                title={soundEnabled ? (isMr ? 'आवाज बंद करा' : 'Mute sound') : (isMr ? 'आवाज सुरू करा' : 'Enable sound')}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader Filters & Mark All */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isMr ? 'सर्व' : 'All'} ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isMr ? 'न वाचलेले' : 'Unread'} ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {isMr ? 'सर्व वाचले' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-500">{isMr ? 'सध्या कोणत्याही सूचना उपलब्ध नाहीत.' : 'No notifications available at the moment.'}</p>
              </div>
            ) : (
              displayedList.map((notif) => {
                const isReg = notif.type === 'new_registration';
                const isProp = notif.type === 'new_property';
                const meta = notif.metadata || {};

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-colors relative flex flex-col gap-2 ${
                      notif.read ? 'bg-white hover:bg-slate-50/80' : 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-l-primary'
                    }`}
                  >
                    {/* Top Row: Type Badge + Title + Time + Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            isReg
                              ? 'bg-blue-100 text-blue-600'
                              : isProp
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isReg ? <UserPlus className="w-3.5 h-3.5" /> : isProp ? <Building2 className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {isMr ? (notif.titleMr || notif.title) : (notif.title || notif.titleMr)}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(notif.createdAt, isMr)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(e, notif.id)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                            title={isMr ? "वाचले म्हणून चिन्हांकित करा" : "Mark as read"}
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, notif.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded"
                          title={isMr ? "हटवा" : "Delete"}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Message */}
                    <p className="text-xs text-slate-600 pl-9">
                      {isMr ? (notif.messageMr || notif.message) : (notif.message || notif.messageMr)}
                    </p>

                    {/* Specific Metadata Content */}
                    {isReg && meta.mobile && (
                      <div className="pl-9 flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          📱 {meta.mobile}
                        </span>
                        <a
                          href={`tel:${meta.mobile}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200 px-2 py-1 rounded transition-colors"
                        >
                          <Phone className="w-3 h-3" /> {isMr ? 'कॉल' : 'Call'}
                        </a>
                        <a
                          href={`https://wa.me/91${meta.mobile}?text=${encodeURIComponent(isMr ? 'नमस्कार, सह्याद्री लँड डेव्हलपर कडून संपर्क करत आहोत.' : 'Hello, contacting you from Sahyadri Land Developer.')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-100/70 hover:bg-green-200 px-2 py-1 rounded transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" /> {isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}
                        </a>
                      </div>
                    )}

                    {isProp && (
                      <div className="pl-9 flex flex-col gap-1.5 mt-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {meta.propertyCode && (
                            <span className="font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px]">
                              {meta.propertyCode}
                            </span>
                          )}
                          {meta.category && (
                            <span className="font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                              {meta.category}
                            </span>
                          )}
                          {meta.price && (
                            <span className="font-bold text-slate-900 text-[10px]">
                              ₹ {typeof meta.price === 'number' ? meta.price.toLocaleString('en-IN') : meta.price}
                            </span>
                          )}
                        </div>

                        {meta.ownerPhone && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{isMr ? `मालक: ${meta.ownerName || 'ग्राहक'}` : `Owner: ${meta.ownerName || 'Customer'}`}</span>
                            <a
                              href={`tel:${meta.ownerPhone}`}
                              className="text-emerald-600 hover:text-emerald-700 font-semibold"
                            >
                              📞 {meta.ownerPhone}
                            </a>
                            <a
                              href={`https://wa.me/91${meta.ownerPhone}?text=${encodeURIComponent(isMr ? `नमस्कार, आपल्या ${meta.title || meta.propertyCode || 'मालमत्ता'} विषयी सह्याद्री लँड डेव्हलपर कडून.` : `Hello, contacting you regarding your property ${meta.title || meta.propertyCode || ''} from Sahyadri Land Developer.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-green-600 hover:text-green-700 font-semibold"
                            >
                              💬 {isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}
                            </a>
                          </div>
                        )}

                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => handleNavigate(notif.link || (meta.type === 'rent' ? '/admin/property-rent/pending' : '/admin/property-sell/pending'), notif.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {isMr ? 'तपासा आणि मंजूर / रद्द करा' : 'Review & Approve / Reject'}
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
