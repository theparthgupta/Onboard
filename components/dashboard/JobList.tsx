'use client';

import { useEffect, useState } from 'react';
import { OnboardingJob } from '@/lib/types';
import { JobCard } from './JobCard';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export function JobList() {
  const [jobs, setJobs] = useState<OnboardingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/jobs');
      if (res.ok) setJobs(await res.json());
      setLoading(false);
    }
    load();
    const interval = setInterval(async () => {
      const res = await fetch('/api/jobs');
      if (res.ok) setJobs(await res.json());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="text-[#333] animate-spin" size={20} />
    </div>
  );

  if (jobs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#1e1e1e] rounded-xl gap-3">
      <p className="text-sm text-[#444]">No onboarding jobs yet</p>
      <Link
        href="/onboard/new"
        className="text-xs text-[#666] hover:text-[#f0f0f0] underline underline-offset-4 decoration-[#333] hover:decoration-[#666] transition-all duration-150"
      >
        Create your first one →
      </Link>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}
