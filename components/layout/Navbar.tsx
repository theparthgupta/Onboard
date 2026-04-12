import Link from 'next/link';
import { auth0 } from '@/lib/auth0/client';
import { LogOut, User } from 'lucide-react';

export async function Navbar() {
  const session = await auth0.getSession();

  return (
    <nav className="border-b border-[#1a1a1a] bg-[#080808]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 h-13 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center group-hover:bg-[#e8e8e8] transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L11 6L6 11M1 6h10" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#f0f0f0] tracking-tight">Onboard</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          <Link
            href="/dashboard"
            className="hidden sm:block px-3 py-1.5 text-sm text-[#666] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] rounded-lg transition-all duration-150"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/accounts"
            className="hidden sm:block px-3 py-1.5 text-sm text-[#666] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] rounded-lg transition-all duration-150"
          >
            Accounts
          </Link>
          <Link
            href="/onboard/new"
            className="ml-1 px-3.5 py-1.5 text-sm bg-white text-black hover:bg-[#e8e8e8] rounded-lg transition-all duration-150 font-medium whitespace-nowrap"
          >
            + New Hire
          </Link>
        </div>

        {/* User */}
        {session && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#111] border border-[#1e1e1e]">
              <User size={12} className="text-[#444]" />
              <span className="text-xs text-[#666]">{session.user.name ?? session.user.email}</span>
            </div>
            <a
              href="/auth/logout"
              className="p-1.5 text-[#444] hover:text-[#888] hover:bg-[#1a1a1a] rounded-lg transition-all duration-150"
              title="Sign out"
            >
              <LogOut size={14} />
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
