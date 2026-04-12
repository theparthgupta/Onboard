import { auth0 } from '@/lib/auth0/client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { JobList } from '@/components/dashboard/JobList';
import { Shield, Zap, FileText } from 'lucide-react';

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/auth/login');

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-8">
          <div>
            <h1 className="text-lg font-semibold text-[#f0f0f0] tracking-tight">Onboarding Jobs</h1>
            <p className="text-sm text-[#444] mt-0.5">Automated provisioning across all platforms.</p>
          </div>
          <Link
            href="/onboard/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-[#e8e8e8] active:scale-[0.98] transition-all duration-150 whitespace-nowrap sm:flex-shrink-0"
          >
            + New Hire
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon: Shield,   label: 'Token Vault',  value: '4 Active',           sub: 'GitHub · Slack · Gmail · Calendar' },
            { icon: Zap,      label: 'CIBA Flow',    value: 'Configured',         sub: 'Auth0 Guardian push notifications' },
            { icon: FileText, label: 'Audit Trail',  value: 'All actions logged',  sub: 'Timestamps · Token scopes · LLM decisions' },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#222] flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-[#555]" />
              </div>
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-sm font-medium text-[#e0e0e0]">{value}</p>
                <p className="text-[11px] text-[#333] mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <JobList />
      </main>
    </div>
  );
}
