import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Onboard — Autonomous Developer Onboarding',
  description:
    'Provision new developers across GitHub, Slack, Gmail, and Calendar in under 2 minutes — with scoped credentials and human approval for every high-stakes action.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full bg-slate-950 text-slate-100 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
