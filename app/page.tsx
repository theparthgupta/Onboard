import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0/client';
import Link from 'next/link';
import {
  ArrowRight, GitBranch, MessageSquare, Mail, CalendarDays,
  Shield, ShieldCheck, Clock, CheckCircle2, Cpu, Eye,
  Key, Zap, Lock, FileText, ChevronRight, Sparkles,
} from 'lucide-react';

/* ─── tiny inline components ─────────────────────────────────────────── */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#555] bg-[#111] border border-[#1e1e1e] rounded-full px-3 py-1">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#444] mb-3">{children}</p>
  );
}

function Divider() {
  return <div className="h-px bg-[#111] w-full" />;
}

/* ─── page ────────────────────────────────────────────────────────────── */
export default async function Home() {
  const session = await auth0.getSession();
  if (session) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#080808] text-[#f0f0f0] flex flex-col overflow-x-hidden">

      {/* ── Subtle grid overlay ─────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="relative z-10 border-b border-[#111] bg-[#080808]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-5 h-13 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 6L6 11M1 6h10" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">Onboard</span>
          </div>
          <a
            href="/auth/login"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-[#e8e8e8] transition-all duration-150"
          >
            Sign in <ArrowRight size={13} />
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-5 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 mb-8">
          <Tag><Shield size={10} /> Token Vault + CIBA</Tag>
          <Tag><Cpu size={10} /> GPT-4o-mini</Tag>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-4 max-w-4xl">
          Onboarding
          <br />
          <span className="text-[#333]">on autopilot.</span>
        </h1>

        <p className="text-base md:text-xl text-[#444] max-w-xl leading-relaxed mb-8 font-medium">
          <span className="line-through text-[#333]">Day two. Still waiting on access.</span>
          {' '}<span className="text-white">Done.</span>
        </p>

        <p className="text-sm md:text-base text-[#555] max-w-2xl leading-relaxed mb-10">
          A multi-agent AI system that provisions every new hire across GitHub, Slack, Gmail and Google Calendar
          in under two minutes — with scoped credentials, human-in-the-loop approvals, and a complete audit trail.
        </p>

        <div className="flex items-center gap-3">
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-[#e8e8e8] active:scale-[0.98] transition-all duration-150"
          >
            Start onboarding <ArrowRight size={15} />
          </a>
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-3 text-[#555] hover:text-[#f0f0f0] text-sm font-medium rounded-xl border border-[#1e1e1e] hover:border-[#2a2a2a] transition-all duration-150"
          >
            How it works
          </Link>
        </div>

        {/* Platform pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-14">
          {[
            { icon: GitBranch, label: 'GitHub' },
            { icon: MessageSquare, label: 'Slack' },
            { icon: Mail, label: 'Gmail' },
            { icon: CalendarDays, label: 'Calendar' },
            { icon: Cpu, label: 'GPT-4o-mini' },
            { icon: ShieldCheck, label: 'Token Vault' },
            { icon: Clock, label: 'CIBA' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-[#555] bg-[#0e0e0e] border border-[#1a1a1a] rounded-full px-3 py-1.5">
              <Icon size={11} className="text-[#444]" /> {label}
            </span>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── What happens section ────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="text-center mb-14">
          <SectionLabel>The workflow</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">One form. Four agents. Zero manual steps.</h2>
          <p className="text-[#555] text-sm mt-3 max-w-xl mx-auto">
            Submit a new hire form and watch a LangGraph-orchestrated pipeline provision every platform in parallel.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            {
              step: '01',
              title: 'Submit new hire',
              desc: 'HR fills in name, role, team, GitHub username, and Slack channels. Optionally flags production access.',
              icon: FileText,
            },
            {
              step: '02',
              title: 'Agents spin up',
              desc: 'LangGraph launches 4 parallel agents. Each requests a scoped token from Auth0 Token Vault before acting.',
              icon: Zap,
            },
            {
              step: '03',
              title: 'AI reasons first',
              desc: 'GPT-4o-mini analyses the new hire\'s role and team, then plans what to do before calling any API.',
              icon: Cpu,
            },
            {
              step: '04',
              title: 'Provisioned + audited',
              desc: 'Every action is logged with timestamp, token scope, and agent decision. Human approval gates production.',
              icon: CheckCircle2,
            },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-5 relative">
              <span className="text-[10px] font-mono text-[#333] mb-4 block">{step}</span>
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#222] flex items-center justify-center mb-4">
                <Icon size={15} className="text-[#666]" />
              </div>
              <h3 className="text-sm font-semibold text-[#e0e0e0] mb-2">{title}</h3>
              <p className="text-[11px] text-[#555] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── The 4 Agents ────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="text-center mb-14">
          <SectionLabel>The agents</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Four agents, one pipeline.</h2>
          <p className="text-[#555] text-sm mt-3 max-w-xl mx-auto">
            Each agent is autonomous, reasoned by GPT-4o-mini, and operates only with the minimum scopes required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              icon: GitBranch,
              name: 'GitHub Agent',
              scope: 'read:user · repo · admin:org',
              actions: [
                'Looks up the new hire\'s GitHub user ID',
                'Sends an organisation invitation as direct_member',
                'Grants repository-level collaborator access',
                'GPT-4o-mini reasons about which repos fit the role',
              ],
              note: 'Org invite and repo grants are independent — a failed invite never blocks repo access.',
            },
            {
              icon: MessageSquare,
              name: 'Slack Agent',
              scope: 'chat:write · users:read · channels:read',
              actions: [
                'Resolves email → Slack user ID via users.lookupByEmail',
                'Lists all public channels to match configured names',
                'Invites user to each channel by ID (not email)',
                'GPT-4o-mini decides the best channels for the role',
              ],
              note: 'Channel invites use the Slack user ID — never the email address — avoiding API rejections.',
            },
            {
              icon: Mail,
              name: 'Gmail Agent',
              scope: 'gmail.send',
              actions: [
                'GPT-4o-mini writes a personalised HTML welcome email',
                'Email references the new hire\'s exact role, team, and repos',
                'Falls back to a handcrafted template if LLM is unavailable',
                'Sent via the gmail.users.messages.send API',
              ],
              note: 'The email body is AI-generated per new hire — not a generic template.',
            },
            {
              icon: CalendarDays,
              name: 'Calendar Agent',
              scope: 'calendar.events',
              actions: [
                'GPT-4o-mini generates 3 role-specific onboarding meetings as JSON',
                'Day 1: Welcome 1:1, Day 2: Team intro, Day 3: Systems check-in',
                'Meeting titles and descriptions tailored to role and team',
                'Events inserted with sendUpdates: all so the new hire gets invites',
              ],
              note: 'Meeting content is GPT-4o-mini-generated — personalised to title, team, and GitHub repos.',
            },
          ].map(({ icon: Icon, name, scope, actions, note }) => (
            <div key={name} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#222] flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-[#666]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#e0e0e0]">{name}</h3>
                  <p className="text-[10px] font-mono text-[#333] mt-0.5">{scope}</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4">
                {actions.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-[11px] text-[#666]">
                    <ChevronRight size={10} className="text-[#333] mt-0.5 flex-shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-[#444] bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2 leading-relaxed italic">
                {note}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Security architecture ───────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="text-center mb-14">
          <SectionLabel>Security</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Designed around least privilege.</h2>
          <p className="text-[#555] text-sm mt-3 max-w-xl mx-auto">
            Every credential is scoped, short-lived, and logged. Sensitive actions require explicit human sign-off.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {[
            {
              icon: ShieldCheck,
              title: 'Auth0 Token Vault',
              color: 'text-emerald-400',
              items: [
                'Agents never see long-lived credentials',
                'Short-lived scoped access tokens, issued per action',
                'Token is never stored — requested, used, discarded',
                'Backed by Auth0\'s secure token storage layer',
              ],
            },
            {
              icon: Clock,
              title: 'CIBA — Human Approval',
              color: 'text-amber-400',
              items: [
                'Production access requires out-of-band authorisation',
                'Push notification sent to manager\'s Auth0 Guardian app',
                'Agent pauses in awaiting_ciba state',
                'Cannot proceed without explicit human approval',
              ],
            },
            {
              icon: Eye,
              title: 'Full Audit Trail',
              color: 'text-[#888]',
              items: [
                'Every token issued logged with scope + timestamp',
                'Every API call recorded with platform + action',
                'AI reasoning steps stored (🤖 prefixed entries)',
                'Immutable per-job log, always visible in the UI',
              ],
            },
          ].map(({ icon: Icon, title, color, items }) => (
            <div key={title} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <Icon size={16} className={color} />
                <h3 className="text-sm font-semibold text-[#e0e0e0]">{title}</h3>
              </div>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-[#555]">
                    <span className="w-1 h-1 rounded-full bg-[#333] mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Fallback credential chain */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Key size={14} className="text-[#444] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#888] mb-1.5">Credential resolution chain</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="text-emerald-500 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1 rounded-lg">
                  1. Auth0 Token Vault
                </span>
                <ChevronRight size={12} className="text-[#333]" />
                <span className="text-[#888] bg-[#111] border border-[#1e1e1e] px-2.5 py-1 rounded-lg">
                  2. Env-var fallback (PAT / Bot token / OAuth refresh)
                </span>
                <ChevronRight size={12} className="text-[#333]" />
                <span className="text-red-500/70 bg-red-950/10 border border-red-900/20 px-2.5 py-1 rounded-lg">
                  3. Agent reports not configured
                </span>
              </div>
              <p className="text-[11px] text-[#444] mt-2.5 leading-relaxed">
                Token Vault is always attempted first. If not configured, agents fall back to securely stored
                environment credentials. Accounts status is visible on the Accounts page.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Tech stack ──────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="text-center mb-14">
          <SectionLabel>Stack</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Built on production-grade infrastructure.</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Next.js 16', sub: 'App Router + Server Components', icon: Zap },
            { label: 'Auth0 v4', sub: 'Token Vault · CIBA · Sessions', icon: Lock },
            { label: 'LangGraph', sub: 'Multi-agent orchestration graph', icon: Cpu },
            { label: 'GPT-4o-mini', sub: 'Per-agent AI reasoning + generation', icon: Sparkles },
            { label: 'Octokit REST', sub: 'GitHub API — orgs, repos, users', icon: GitBranch },
            { label: 'Slack SDK', sub: '@slack/web-api — channels, users', icon: MessageSquare },
            { label: 'Google APIs', sub: 'Gmail v1 · Calendar v3', icon: Mail },
            { label: 'TypeScript', sub: 'End-to-end type safety', icon: FileText },
          ].map(({ label, sub, icon: Icon }) => (
            <div key={label} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-4 flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-[#1a1a1a] border border-[#222] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={13} className="text-[#555]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#e0e0e0]">{label}</p>
                <p className="text-[10px] text-[#444] mt-0.5 leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl p-10 md:p-14 text-center">
          <SectionLabel>Get started</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Ready to onboard in 2 minutes?
          </h2>
          <p className="text-[#555] text-sm max-w-lg mx-auto mb-8 leading-relaxed">
            Sign in and provision your first new hire across GitHub, Slack, Gmail, and Calendar — fully automated, fully audited.
          </p>
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-[#e8e8e8] active:scale-[0.98] transition-all duration-150"
          >
            Sign in with Auth0 <ArrowRight size={15} />
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#111] px-5 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 6L6 11M1 6h10" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xs font-semibold">Onboard</span>
          </div>
          <p className="text-[11px] text-[#333] text-center">
            Token Vault · CIBA · LangGraph · GPT-4o-mini
          </p>
          <div className="flex items-center gap-3 text-[11px] text-[#333]">
            <span>Next.js 16</span>
            <span className="text-[#1e1e1e]">·</span>
            <span>Auth0 v4</span>
            <span className="text-[#1e1e1e]">·</span>
            <span>TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
