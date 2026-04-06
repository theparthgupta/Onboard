import { auth0 } from '@/lib/auth0/client';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { NewHireForm } from '@/components/onboard/NewHireForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewHirePage() {
  const session = await auth0.getSession();
  if (!session) redirect('/auth/login');

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-5 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[#444] hover:text-[#888] transition-colors mb-7"
        >
          <ArrowLeft size={13} />
          Dashboard
        </Link>
        <div className="mb-7">
          <h1 className="text-lg font-semibold text-[#f0f0f0] tracking-tight">New Hire Onboarding</h1>
          <p className="text-sm text-[#444] mt-0.5">
            Fill in the details. Agents will provision access across all platforms automatically.
          </p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-6">
          <NewHireForm />
        </div>
        <p className="text-[11px] text-[#333] text-center mt-4">
          Credentials issued per-action via Auth0 Token Vault. Production access requires manager approval via CIBA.
        </p>
      </main>
    </div>
  );
}
