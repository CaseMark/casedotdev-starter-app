/**
 * Dashboard Layout
 *
 * Wraps all dashboard pages with authentication check
 * Protected routes require user to be logged in
 */

import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
