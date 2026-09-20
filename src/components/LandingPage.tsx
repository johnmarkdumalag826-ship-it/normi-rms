import React from 'react';
import {
  Landmark, ArrowRight, Upload, MessageSquareText, CalendarCheck, LibraryBig,
  Mail, Phone, MapPin, Pin, GraduationCap, Briefcase, Users, UserCheck, Shield,
  type LucideIcon,
} from 'lucide-react';
import { Announcement, UserRole } from '../types';
import { Button, Card, Badge, EmptyState, roleLabels, roleDescriptions, announcementCategory, formatDateLong } from '../ui';

interface LandingPageProps {
  announcements: Announcement[];
  onEnterPortal: () => void;
  stats: {
    archived: number;
    active: number;
    advisers: number;
    scheduled: number;
  };
}

const steps: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Upload, title: '1. Send your paper', text: 'Students upload their research paper and choose an adviser.' },
  { icon: MessageSquareText, title: '2. Get feedback', text: 'Your adviser reads each chapter and tells you what to change.' },
  { icon: CalendarCheck, title: '3. Get a defense date', text: 'The coordinator picks a date, a room and a panel for your defense.' },
  { icon: LibraryBig, title: '4. Saved in the Repository', text: 'After your defense, your final paper is kept safe for everyone to find.' },
];

const roleIcons: Record<UserRole, LucideIcon> = {
  student: GraduationCap,
  adviser: Briefcase,
  panelist: Users,
  coordinator: UserCheck,
  admin: Shield,
};

const roleOrder: UserRole[] = ['student', 'adviser', 'panelist', 'coordinator', 'admin'];

export default function LandingPage({ announcements, onEnterPortal, stats }: LandingPageProps) {
  // Pinned announcements first, then newest first. Show the top three.
  const latest = [...announcements]
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-blue-900 focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-sm font-bold text-navy-900">Northern Mindanao Colleges, Inc.</span>
              <span className="hidden sm:block text-xs text-slate-600">Research Management System</span>
            </span>
          </a>

          <nav aria-label="Page sections" className="hidden md:flex items-center gap-1">
            {[
              ['#how-it-works', 'How It Works'],
              ['#who-its-for', 'Who Uses It'],
              ['#announcements', 'Announcements'],
              ['#contact', 'Contact Us'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-900">
                {label}
              </a>
            ))}
          </nav>

          <Button id="nav-login-btn" onClick={onEnterPortal} size="sm" icon={ArrowRight}>
            Sign In
          </Button>
        </div>
      </header>

      <main id="content">
        {/* Hero */}
        <section id="top" className="bg-navy-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="max-w-3xl space-y-6">
              <p className="text-sm font-semibold text-blue-200">For students, advisers, panel members and coordinators</p>
              <h1 className="font-serif text-3xl font-bold leading-tight sm:text-5xl">
                Send, track and defend your research paper in one place.
              </h1>
              <p className="text-lg text-blue-100">
                This website helps Northern Mindanao Colleges handle thesis and capstone work online.
                Upload your paper, read your adviser’s feedback, and find out when your defense is.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onEnterPortal}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-base font-bold text-navy-900 hover:bg-blue-50 cursor-pointer"
                >
                  Sign In to Your Account
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 px-6 text-base font-semibold text-white hover:bg-white/10"
                >
                  See How It Works
                </a>
              </div>
            </div>

            {/* Numbers only load after sign-in, so hide them (instead of showing "0") until they are real. */}
            {stats.archived + stats.active + stats.advisers > 0 && (
            <dl className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                [stats.archived, 'research papers in the Repository'],
                [stats.active, 'research papers in progress'],
                [stats.advisers, 'advisers helping students'],
              ].map(([value, label]) => (
                <div key={label as string} className="rounded-xl bg-white/10 px-5 py-4">
                  <dd className="text-3xl font-bold">{value}</dd>
                  <dt className="mt-1 text-sm text-blue-100">{label}</dt>
                </div>
              ))}
            </dl>
            )}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600">Four simple steps from your first upload to your final paper.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Card className="h-full space-y-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-600">{text}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {/* Who it is for */}
        <section id="who-its-for" className="scroll-mt-20 border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-900">Who uses this system</h2>
            <p className="mt-2 max-w-2xl text-base text-slate-600">Everyone sees only the tools they need. Choose your role when you sign in.</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roleOrder.map(role => {
                const Icon = roleIcons[role];
                return (
                  <li key={role} className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-800 border border-slate-200">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{roleLabels[role]}</h3>
                      <p className="mt-1 text-sm text-slate-600">{roleDescriptions[role]}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Announcements */}
        <section id="announcements" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">Latest announcements</h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600">News about deadlines, defense schedules and the Repository.</p>
          <div className="mt-8">
            {latest.length === 0 ? (
              <Card padded={false}>
                <EmptyState
                  title="No announcements yet"
                  description="When the coordinator posts news, you will see it here."
                />
              </Card>
            ) : (
              <ul className="grid gap-4 md:grid-cols-3">
                {latest.map(a => (
                  <li key={a.id}>
                    <Card as="article" className="h-full space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="info">{announcementCategory[a.category] ?? a.category}</Badge>
                        {a.isPinned && <Badge tone="warning" icon={Pin}>Important</Badge>}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                      <p className="text-sm text-slate-700 line-clamp-4">{a.content}</p>
                      <p className="text-xs text-slate-600">{formatDateLong(a.createdAt)} · {a.authorName}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-20 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-900">Need help? Contact us</h2>
            <p className="mt-2 max-w-2xl text-base text-slate-600">
              Questions about sending your paper, joining a panel, or getting an account? The research office is happy to help.
            </p>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              <li className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <MapPin className="h-6 w-6 shrink-0 text-blue-800" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Visit us</h3>
                  <p className="mt-1 text-sm text-slate-700">NORMI Main Campus, City of Cabadbaran, Agusan del Norte, Philippines</p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <Mail className="h-6 w-6 shrink-0 text-blue-800" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">Email us</h3>
                  <p className="mt-1 break-words text-sm text-slate-700">coordinator@northernmindanaocolleges.edu.ph</p>
                  <p className="break-words text-sm text-slate-700">research.support@northernmindanaocolleges.edu.ph</p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <Phone className="h-6 w-6 shrink-0 text-blue-800" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Call us</h3>
                  <p className="mt-1 text-sm text-slate-700">+63 (085) 343-1254</p>
                  <p className="text-sm text-slate-700">+63 (0912) 456-7890</p>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="bg-navy-950 text-blue-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Northern Mindanao Colleges, Inc. All rights reserved.</p>
          <button type="button" onClick={onEnterPortal} className="inline-flex min-h-11 items-center font-semibold text-white underline underline-offset-4 cursor-pointer">
            Sign in to your account
          </button>
        </div>
      </footer>
    </div>
  );
}
