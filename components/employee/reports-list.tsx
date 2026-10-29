'use client'

import { useMemo, useState } from 'react'
import {
  Search, SearchX, X, Folder, Clock3, MessageSquare, CheckCircle2, Loader, ClipboardList,
} from 'lucide-react'

export interface Report {
  id: string
  status?: string
  report_date: string
  task_description?: string
  project_name?: string
  hours_spent?: number | string
  manager_comment?: string
}

const PREVIEW_COUNT = 5

const STATUS_UI: Record<string, { pill: string; bar: string; Icon: typeof Clock3 }> = {
  completed:   { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500', Icon: CheckCircle2 },
  in_progress: { pill: 'bg-blue-50 text-blue-700 ring-blue-200',          bar: 'bg-blue-500',    Icon: Loader },
  pending:     { pill: 'bg-amber-50 text-amber-700 ring-amber-200',       bar: 'bg-amber-500',   Icon: Clock3 },
}
const STATUS_FALLBACK = { pill: 'bg-stone-100 text-stone-500 ring-stone-200', bar: 'bg-stone-300', Icon: Clock3 }

const serif = { fontFamily: 'Georgia, serif' }

// Everything a person might type to find a report: task, project, status,
// manager comment and the date in a few spellings (2026-10-27, 27 October, Tue, Oct ...)
function buildHaystack(r: Report) {
  const d = new Date(r.report_date)
  const long = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const short = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  return [
    r.task_description,
    r.project_name,
    (r.status ?? '').replace(/_/g, ' '),
    r.manager_comment,
    r.report_date,
    long,
    short,
  ].filter(Boolean).join(' ').toLowerCase()
}

function ReportCard({ r }: { r: Report }) {
  const ui = (r.status && STATUS_UI[r.status]) || STATUS_FALLBACK
  const StatusIcon = ui.Icon
  const d = new Date(r.report_date)
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })
  const day = d.toLocaleDateString('en-IN', { day: 'numeric', timeZone: 'UTC' })
  const month = d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })

  return (
    <li className="relative overflow-hidden rounded-2xl border border-[#E6DECF] bg-white p-4 pl-5 shadow-sm">
      <span aria-hidden className={`absolute bottom-0 left-0 top-0 w-1.5 ${ui.bar}`} />

      <div className="flex items-start gap-3.5">
        {/* Date badge */}
        <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-[#F8F4EA] text-[#1C1712]">
          <span className="text-[11px] leading-none text-[#9A8F82]">{weekday}</span>
          <span className="mt-0.5 text-xl font-semibold leading-none tabular-nums" style={serif}>{day}</span>
          <span className="mt-0.5 text-[11px] leading-none text-[#9A8F82]">{month}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] leading-snug text-[#1C1712]" style={serif}>{r.task_description}</p>
            <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${ui.pill}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {(r.status ?? 'pending').replace(/_/g, ' ')}
            </span>
          </div>

          {(r.project_name || r.hours_spent) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {r.project_name && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F3ECDB] px-2.5 py-1 text-xs text-[#8B6914]">
                  <Folder className="h-3.5 w-3.5" /> {r.project_name}
                </span>
              )}
              {r.hours_spent && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                  <Clock3 className="h-3.5 w-3.5" /> {r.hours_spent}h
                </span>
              )}
            </div>
          )}

          {r.manager_comment && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p><span className="font-medium">Manager:</span> {r.manager_comment}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export function ReportsList({ reports }: { reports: Report[] }) {
  const [query, setQuery] = useState('')

  const indexed = useMemo(
    () => reports.map(r => ({ report: r, haystack: buildHaystack(r) })),
    [reports]
  )

  const trimmed = query.trim()
  const searching = trimmed.length > 0

  const visible = useMemo(() => {
    if (!searching) return reports.slice(0, PREVIEW_COUNT)
    const tokens = trimmed.toLowerCase().split(/\s+/)
    return indexed
      .filter(({ haystack }) => tokens.every(t => haystack.includes(t)))
      .map(({ report }) => report)
  }, [searching, trimmed, reports, indexed])

  const hiddenCount = Math.max(0, reports.length - PREVIEW_COUNT)

  return (
    <section className="border-t border-[#B8860B]/25 bg-[#FAF7F2] px-6 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg text-[#1C1712]" style={serif}>
          {searching ? 'Search results' : 'Recent reports'}
        </h2>
        <span className="text-xs text-[#9A8F82]">
          {searching
            ? `${visible.length} ${visible.length === 1 ? 'result' : 'results'}`
            : `${Math.min(PREVIEW_COUNT, reports.length)} of ${reports.length}`}
        </span>
      </div>

      {reports.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B5AA9A]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search reports"
              placeholder="Search by task, project, status or date"
              className="w-full rounded-xl border border-[#E6DECF] bg-white py-2.5 pl-10 pr-10 text-sm text-[#1C1712] outline-none transition placeholder:text-[#B5AA9A] focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#9A8F82] transition hover:bg-black/5 hover:text-[#1C1712] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {!searching && hiddenCount > 0 && (
            <p className="mt-2 text-xs text-[#9A8F82]">
              Showing the latest {PREVIEW_COUNT}. Search to find {hiddenCount} older {hiddenCount === 1 ? 'report' : 'reports'}.
            </p>
          )}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#DDD5C4] bg-white/60 px-6 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#E6DECF] bg-white text-[#B8860B]">
            <ClipboardList className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-[#1C1712]">No reports submitted yet</p>
          <p className="mt-1 text-sm text-[#9A8F82]">Use Submit report at the top to log your first one.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#DDD5C4] bg-white/60 px-6 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#E6DECF] bg-white text-[#B8860B]">
            <SearchX className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-[#1C1712]">No reports match “{trimmed}”</p>
          <p className="mt-1 text-sm text-[#9A8F82]">Try a project name, a status like completed, or a date like 12 Oct.</p>
          <button
            onClick={() => setQuery('')}
            className="mt-4 rounded-full bg-[#1C1712] px-4 py-2 text-xs font-medium text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="space-y-3" aria-live="polite">
          {visible.map(r => <ReportCard key={r.id} r={r} />)}
        </ul>
      )}
    </section>
  )
}