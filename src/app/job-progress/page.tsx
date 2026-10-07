'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import JobProgressPage from './components/JobProgressPage';

function JobProgressWrapper() {
  const searchParams = useSearchParams();
  const jobId = searchParams?.get('jobId') || undefined;
  return <JobProgressPage jobId={jobId} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <JobProgressWrapper />
    </Suspense>
  );
}
