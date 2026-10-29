import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, FileText, CheckCircle2, Lock, Clock3, GraduationCap } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Module {
  title: string
  description: string
  duration: string
  type: 'video' | 'doc'
  status: 'completed' | 'available' | 'locked'
}

// Static content — replace with a Supabase `training_modules` table if you want progress tracked per employee.
const MODULES: Module[] = [
  {
    title: 'GK Digital Solutions — company overview',
    description: 'Who we are, our services, and how we work with clients.',
    duration: '10 min',
    type: 'video',
    status: 'completed',
  },
  {
    title: 'Digital marketing services deep-dive',
    description: 'SEO, social media, paid ads — what we offer and how to pitch it.',
    duration: '15 min',
    type: 'video',
    status: 'completed',
  },
  {
    title: 'GK Home Interiors — product knowledge',
    description: 'Interior design packages, pricing tiers, and the sales process.',
    duration: '12 min',
    type: 'video',
    status: 'available',
  },
  {
    title: 'Handling common client objections',
    description: 'Scripts and approaches for pricing pushback, timeline concerns, and comparisons.',
    duration: '8 min read',
    type: 'doc',
    status: 'available',
  },
  {
    title: 'CRM pipeline stages explained',
    description: 'New → Follow up → Site visit → Quotation → Won/Lost — what happens at each stage.',
    duration: '6 min read',
    type: 'doc',
    status: 'available',
  },
  {
    title: 'Advanced closing techniques',
    description: 'Unlocks after completing the objection-handling module.',
    duration: '10 min',
    type: 'video',
    status: 'locked',
  },
]

const statusStyle = {
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    node: 'bg-emerald-500 text-white shadow-md shadow-emerald-200',
    card: 'border-emerald-100 bg-emerald-50/40',
  },
  available: {
    icon: PlayCircle,
    label: 'Start',
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    node: 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-4 ring-indigo-100',
    card: 'border-slate-200 bg-white',
  },
  locked: {
    icon: Lock,
    label: 'Locked',
    badge: 'bg-slate-100 text-slate-500 ring-slate-200',
    node: 'bg-slate-200 text-slate-400',
    card: 'border-slate-200 bg-slate-50 opacity-70',
  },
}

const minutesOf = (duration: string) => parseInt(duration, 10) || 0

export default async function PktPage() {
  // Primary auth gate is middleware on /employee/*. This check is a
  // consistency + defense-in-depth measure matching the other employee
  // sub-pages, in case the middleware matcher config ever changes.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const completedCount = MODULES.filter(m => m.status === 'completed').length
  const totalCount = MODULES.length
  const progressPct = Math.round((completedCount / totalCount) * 100)

  const minutesLeft = MODULES.filter(m => m.status !== 'completed').reduce((sum, m) => sum + minutesOf(m.duration), 0)
  const upNextTitle = MODULES.find(m => m.status === 'available')?.title

  const ringR = 46
  const ringC = 2 * Math.PI * ringR

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-5 pb-28">

        {/* ── HERO ── */}
        <section className="relative isolate mb-6 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 left-6 -z-10 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />

          <Link
            href="/employee/menu"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 ring-1 ring-white/15 transition hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to menu
          </Link>

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Employee Portal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">PKT</h1>
          <p className="mt-1 text-sm text-slate-300">Product knowledge training modules</p>

          {/* Progress */}
          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
            <div className="relative h-24 w-24 flex-shrink-0">
              <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
                <circle cx="55" cy="55" r={ringR} fill="none" strokeWidth="10" className="stroke-white/15" />
                <circle
                  cx="55" cy="55" r={ringR} fill="none" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(progressPct / 100) * ringC} ${ringC}`}
                  className="stroke-emerald-400"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold tabular-nums">{progressPct}%</span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Your progress</p>
              <p className="mt-1 text-sm font-semibold">{completedCount} / {totalCount} completed</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                <Clock3 className="h-3.5 w-3.5" /> About {minutesLeft} min left
              </p>
              {upNextTitle && (
                <p className="mt-1 truncate text-xs text-slate-300">
                  Up next: <span className="font-semibold text-white">{upNextTitle}</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── LEARNING PATH ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <GraduationCap className="h-4 w-4 text-indigo-600" /> Learning path
            </h2>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {totalCount} modules
            </span>
          </div>

          <ol>
            {MODULES.map((m, i) => {
              const s = statusStyle[m.status]
              const StatusIcon = s.icon
              const TypeIcon = m.type === 'video' ? PlayCircle : FileText
              const isLocked = m.status === 'locked'
              const isUpNext = m.title === upNextTitle
              const isLast = i === MODULES.length - 1

              return (
                <li key={m.title} className="relative flex gap-3 pb-4 last:pb-0 sm:gap-4">
                  {!isLast && (
                    <span
                      aria-hidden
                      className={`absolute left-5 top-11 h-[calc(100%-2.5rem)] w-0.5 -translate-x-1/2 ${
                        m.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  {/* Step node */}
                  <div className={`z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.node}`}>
                    {m.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : isLocked ? <Lock className="h-4 w-4" /> : i + 1}
                  </div>

                  {/* Module card */}
                  <div
                    className={`min-w-0 flex-1 rounded-2xl border p-4 shadow-sm transition ${s.card} ${
                      isUpNext ? 'ring-2 ring-indigo-300' : ''
                    } ${!isLocked ? 'hover:shadow-md' : ''}`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        <TypeIcon className="h-3 w-3" /> {m.type === 'video' ? 'Video' : 'Read'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Clock3 className="h-3 w-3" /> {m.duration}
                      </span>
                      {isUpNext && (
                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Up next
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-bold leading-snug text-slate-900">{m.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{m.description}</p>

                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${s.badge}`}>
                        <StatusIcon className="h-3.5 w-3.5" /> {s.label}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </div>
  )
}