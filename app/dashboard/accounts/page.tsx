import { auth0 } from '@/lib/auth0/client';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { AccountsList } from '@/components/accounts/AccountsList';

export default async function AccountsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/auth/login');

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-5 py-10">
        <div className="mb-7">
          <h1 className="text-lg font-semibold text-[#f0f0f0] tracking-tight">Connected Accounts</h1>
          <p className="text-sm text-[#444] mt-0.5">
            Credentials used by the onboarding agents to provision access.
          </p>
        </div>
        <AccountsList />
      </main>
    </div>
  );
}
