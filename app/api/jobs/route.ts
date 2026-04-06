import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0/client';
import { getAllJobs } from '@/lib/store/jobs';

export async function GET(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobs = getAllJobs();
  return NextResponse.json(jobs);
}
