'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService, type AppNotification } from '@/lib/services/notificationService';

/** Format a timestamp into a human-readable relative time string */
function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

/** Map notification type to an emoji icon for visual context */
function getNotificationIcon(type: AppNotification['type']): string {
  const icons: Record<string, string> = {
    new_job_match: '🔔',
    job_offer: '💼',
    job_assigned: '✅',
    job_started: '🚀',
    job_completed: '🎉',
    payment_confirmed: '💰',
    disbursement_processed: '💸',
    dispute_raised: '⚠️',
    provider_joined: '👋',
    availability_changed: '🟢',
    system: 'ℹ️',
    job_created: '📋',
  };
  return icons[type] || 'ℹ️';
}

/** Build the action URL for a notification (links to the relevant job/order) */
function getNotificationActionUrl(notification: AppNotification, userRole?: string): string | null {
  if (!notification.jobId) return null;

  if (userRole === 'provider') {
    // Providers go to active job or dashboard depending on notification type
    if (['job_assigned', 'job_started'].includes(notification.type)) {
      return `/active-job?jobId=${notification.jobId}`;
    }
    return `/provider-dashboard`;
  }

  // Customers go to job progress tracker
  return `/job-progress?jobId=${notification.jobId}`;
}

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        notificationService.getNotifications(user.id),
        notificationService.getUnreadCount(user.id),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load notifications on mount
  useEffect(() => {
    if (user) loadNotifications();
  }, [user, loadNotifications]);

  // Subscribe to real-time new notifications via Supabase Realtime
  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationService.subscribeToNotifications(user.id, (newNotif) => {
      // Prepend new notification to the list
      setNotifications((prev) => [newNotif, ...prev]);
      // Increment unread badge count
      setUnreadCount((prev) => prev + 1);
    });

    return unsubscribe;
  }, [user]);

  // Close drawer when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const success = await notificationService.markAsRead(notificationId);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    setMarkingAll(true);
    const success = await notificationService.markAllAsRead(user.id);
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
    setMarkingAll(false);
  };

  return (
    <div className={`relative ${className}`} ref={drawerRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="p-2 rounded-lg hover:bg-muted transition-colors relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={20} className="text-muted-foreground" />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Drawer */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs font-bold text-white bg-danger px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                  title="Mark all as read"
                >
                  {markingAll ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCheck size={14} />
                  )}
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell size={32} className="text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  You&apos;ll be notified about job updates and important events here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notif) => {
                  const actionUrl = getNotificationActionUrl(notif, profile?.role);
                  return (
                    <li
                      key={notif.id}
                      className={`px-4 py-3 transition-colors ${
                        !notif.isRead ? 'bg-navy-50/40' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">
                          {getNotificationIcon(notif.type)}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${!notif.isRead ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'}`}>
                              {notif.title}
                            </p>
                            {/* Unread dot */}
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" aria-label="Unread" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                            {notif.body}
                          </p>
                          <div className="flex items-center justify-between mt-1.5 gap-2">
                            <span className="text-[11px] text-muted-foreground/70">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                            <div className="flex items-center gap-2">
                              {/* Action link to relevant job */}
                              {actionUrl && (
                                <Link
                                  href={actionUrl}
                                  onClick={() => {
                                    if (!notif.isRead) handleMarkAsRead(notif.id);
                                    setIsOpen(false);
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                >
                                  View <ExternalLink size={10} />
                                </Link>
                              )}
                              {/* Mark as read button */}
                              {!notif.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Drawer Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
