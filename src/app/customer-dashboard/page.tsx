'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { customerService } from '@/lib/services/dataService';
import CustomerDashboardPage from './components/CustomerDashboardPage';

/**
 * Customer routing logic:
 * - Unauthenticated → middleware redirects to login
 * - Authenticated, first-time (no orders) → redirect to booking form
 * - Authenticated, returning (has orders) → show Customer Dashboard
 * 
 * Note: If hasOrderHistory check fails (network error, RLS issue),
 * we default to showing the dashboard rather than redirecting,
 * to prevent customers from losing access to their orders.
 */
export default function CustomerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router?.replace('/unified-authentication-portal');
      return;
    }

    // Check if this customer has any order history
    customerService?.hasOrderHistory(user?.id)?.then((hasHistory) => {
      if (hasHistory) {
        // Returning customer — show the dashboard
        setShowDashboard(true);
      } else {
        // First-time customer — send them to the booking form
        router?.replace('/service-request-order-form');
      }
      setChecking(false);
    })?.catch(() => {
      // If the check fails for any reason, show the dashboard
      // rather than redirecting (safer default for returning customers)
      setShowDashboard(true);
      setChecking(false);
    });
  }, [user, authLoading, router]);

  // Show loading spinner while checking order history
  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!showDashboard) return null;

  return <CustomerDashboardPage />;
}
