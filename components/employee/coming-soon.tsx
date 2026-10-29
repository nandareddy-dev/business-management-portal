import Link from 'next/link'
import { ArrowLeft, Construction, Hammer, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ComingSoonProps {
  title: string
  /** Small line under the title in the hero */
  subtitle?: string
  /** Icon shown in the hero and the centre illustration */
  icon?: LucideIcon
  /** Message under the heading */
  message?: string
  backHref?: string
  backLabel?: string
}

// Reusable placeholder for menu sections that are still being built.
export function ComingSoon({
  title,
  subtitle = 'Employee services',
  icon: Icon = Construction,
  message = 'This section is being built. Check back soon.',
  backHref = '/employee/menu',
  backLabel = 'Back to menu',
}: ComingSoonProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      <style>{`
        @keyframes cs-slide { 0% { transform: translateX(-120%) } 100% { transform: translateX(320%) } }
        @keyframes cs-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        .cs-bar { animation: cs-slide 1.6s ease-in-out infinite }
        .cs-float { animation: cs-float 3s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .cs-bar, .cs-float { animation: none } }
      `}</style>

      <div className="mx-auto max-w-2xl px-4 py-5 pb-28">

        {/* ── HERO ── */}
        <section className="relative isolate mb-5 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-7">
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
            href={backHref}
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
          </Link>

          <div className="mt-5 flex items-center gap-3.5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur">
              <Icon className="h-6 w-6 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">{subtitle}</p>
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            </div>
          </div>
        </section>

        {/* ── PLACEHOLDER CARD ── */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />

          <div className="relative">
            <div className="cs-float relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
              <span aria-hidden className="absolute inset-0 animate-ping rounded-3xl bg-indigo-200/60 [animation-duration:2.8s]" />
              <span className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-xl shadow-indigo-200">
                <Construction className="h-11 w-11" />
              </span>
              <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-lg ring-4 ring-white">
                <Hammer className="h-4 w-4" />
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> In development
            </span>

            <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">{title} is on its way</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{message}</p>

            {/* Indeterminate progress bar */}
            <div className="mx-auto mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
              <div className="cs-bar h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400" />
            </div>

            <Link
              href={backHref}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700"
            >
              <ArrowLeft className="h-4 w-4" /> {backLabel}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}