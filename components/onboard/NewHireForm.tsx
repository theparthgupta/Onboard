'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserPlus, GitBranch, MessageSquare, Shield } from 'lucide-react';

const TEAM_OPTIONS = ['Platform', 'Product', 'Data', 'DevOps', 'Design', 'Backend', 'Frontend', 'Mobile'];

const inputCls = 'w-full bg-[#1a1a1a] border border-[#222] hover:border-[#2a2a2a] focus:border-[#333] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm placeholder-[#333] outline-none transition-all duration-150';
const labelCls = 'block text-xs font-medium text-[#666] mb-1.5';
const sectionHeadingCls = 'text-[10px] font-semibold text-[#444] uppercase tracking-widest mb-3';

export function NewHireForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    role: '',
    team: 'Platform',
    githubUsername: '',
    startDate: '',
    managerId: '',
    requiresProductionAccess: false,
    githubRepos: '',
    slackChannels: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...form,
        githubRepos: form.githubRepos.split(',').map((s) => s.trim()).filter(Boolean),
        slackChannels: form.slackChannels.split(',').map((s) => s.trim()).filter(Boolean),
      };

      const res = await fetch('/api/onboard/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to start onboarding');
      }

      const { jobId } = await res.json();
      router.push(`/onboard/${jobId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Personal Info */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={13} className="text-[#444]" />
          <h2 className={sectionHeadingCls}>Personal Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>First Name *</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
              placeholder="Ada"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Last Name *</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
              placeholder="Lovelace"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Work Email *</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="ada@company.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              Personal Email *
              <span className="text-[#333] font-normal ml-1">(for initial contact)</span>
            </label>
            <input
              name="personalEmail"
              type="email"
              value={form.personalEmail}
              onChange={handleChange}
              required
              placeholder="ada@gmail.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Role *</label>
            <input
              name="role"
              value={form.role}
              onChange={handleChange}
              required
              placeholder="Senior Frontend Engineer"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Team *</label>
            <select
              name="team"
              value={form.team}
              onChange={handleChange}
              required
              className={inputCls}
            >
              {TEAM_OPTIONS.map((t) => (
                <option key={t} value={t} className="bg-[#1a1a1a]">{t} Team</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Start Date *</label>
            <input
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Manager Auth0 ID</label>
            <input
              name="managerId"
              value={form.managerId}
              onChange={handleChange}
              placeholder="auth0|..."
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Platform Access */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={13} className="text-[#444]" />
          <h2 className={sectionHeadingCls}>Platform Access</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1.5">
                <GitBranch size={11} className="text-[#444]" /> GitHub Username *
              </span>
            </label>
            <input
              name="githubUsername"
              value={form.githubUsername}
              onChange={handleChange}
              required
              placeholder="ada-lovelace"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1.5">
                <GitBranch size={11} className="text-[#444]" /> GitHub Repos
                <span className="text-[#333] font-normal">(comma-separated)</span>
              </span>
            </label>
            <input
              name="githubRepos"
              value={form.githubRepos}
              onChange={handleChange}
              placeholder="frontend-app, design-system, docs"
              className={inputCls}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare size={11} className="text-[#444]" /> Slack Channels
                <span className="text-[#333] font-normal">(comma-separated)</span>
              </span>
            </label>
            <input
              name="slackChannels"
              value={form.slackChannels}
              onChange={handleChange}
              placeholder="general, engineering, platform-team, announcements"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Production Access — CIBA trigger */}
      <section>
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="requiresProductionAccess"
              checked={form.requiresProductionAccess}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-[#333] bg-[#1a1a1a] accent-white"
            />
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Shield size={13} className="text-[#555]" />
                <span className="text-sm font-medium text-[#e0e0e0]">Requires Production Access</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-[#1a1a1a] border border-amber-900/40 text-amber-600 px-2 py-0.5 rounded-md">
                  <span className="w-1 h-1 rounded-full bg-amber-500 inline-block" />
                  CIBA approval required
                </span>
              </div>
              <p className="text-xs text-[#444] leading-relaxed">
                Enabling this will pause onboarding and send a push notification to the manager's Auth0 Guardian app
                requesting explicit approval before any production credentials are granted. The agent cannot proceed
                without human sign-off.
              </p>
            </div>
          </label>
        </div>
      </section>

      {error && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <p className="text-xs text-[#333]">
          All credentials are scoped via Auth0 Token Vault.
        </p>
        <Button type="submit" loading={submitting} size="lg" className="w-full sm:w-auto">
          <UserPlus size={15} />
          {submitting ? 'Starting…' : 'Start Onboarding'}
        </Button>
      </div>
    </form>
  );
}
