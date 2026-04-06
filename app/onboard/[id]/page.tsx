import { auth0 } from '@/lib/auth0/client';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { ProvisioningStatus } from '@/components/onboard/ProvisioningStatus';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobStatusPage({ params }: Props) {
  const session = await auth0.getSession();
  if (!session) redirect('/auth/login');

  const { id } = await params;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <ProvisioningStatus jobId={id} />
      </main>
    </div>
  );
}
