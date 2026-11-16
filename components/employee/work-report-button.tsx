'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { createBrowserClient } from '@supabase/ssr'
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pencil,
  Send,
  X,
} from 'lucide-react'

interface ExistingReport {
  tasks_done?: string | null
  blockers?: string | null
  tomorrow_plan?: string | null
}

interface Props {
  employeeId: string
  /** Today's date (yyyy-mm-dd, IST) — same value the page uses for `report_date` */
  reportDate: string
  /** Already submitted report for today, if any (allows editing) */
  existing?: ExistingReport | null
}

const MAX = 1000

export function WorkReportButton({ employeeId, reportDate, existing }: Props) {
  const router = useRouter()
  const submitted = !!existing

  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tasksDone, setTasksDone] = useState(existing?.tasks_done ?? '')
  const [blockers, setBlockers] = useState(existing?.blockers ?? '')
  const [tomorrowPlan, setTomorrowPlan] = useState(existing?.tomorrow_plan ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => setMounted(true), [])

  // Lock page scroll + close on Escape while the popup is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, saving])

  function openModal() {
    setTasksDone(existing?.tasks_done ?? tasksDone)
    setBlockers(existing?.blockers ?? blockers)
    setTomorrowPlan(existing?.tomorrow_plan ?? tomorrowPlan)
    setError(null)
    setDone(false)
    setOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!tasksDone.trim()) {
      setError("Please write what you completed today.")
      return
    }
    setSaving(true)
    setError(null)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: dbError } = await supabase.from('work_reports').upsert(
      {
        employee_id: employeeId,
        report_date: reportDate,
        tasks_done: tasksDone.trim(),
        blockers: blockers.trim() || null,
        tomorrow_plan: tomorrowPlan.trim() || null,
      },
      { onConflict: 'employee_id,report_date' }
    )

    setSaving(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    setDone(true)
    router.refresh()
    setTimeout(() => setOpen(false), 1400)
  }

  const inputCls =
    'w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:text-sm'

  return (
    <>
      {/* ── TRIGGER CARD ── */}
      <button
        type="button"
        onClick={openModal}
        className={`group relative isolate flex w-full items-center gap-2 overflow-hidden rounded-xl px-2.5 py-2 text-left shadow transition hover:shadow-md ${
          submitted
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-200'
            : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-700 shadow-blue-200'
        }`}
      >
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 -z-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
          {submitted ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <ClipboardList className="h-3.5 w-3.5 text-white" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold text-white">
            {submitted ? "Today's report submitted" : "Submit today's report"}
          </span>
          <span className="block truncate text-[10px] text-white/80">
            {submitted ? 'Tap to view or edit' : 'Tell us what you worked on today'}
          </span>
        </span>
        {submitted ? (
          <Pencil className="h-3.5 w-3.5 shrink-0 text-white/80" />
        ) : (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700">Report</span>
        )}
      </button>

      {/* ── POPUP ── */}
      {mounted && open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="wr-title">
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => !saving && setOpen(false)}
            />

            <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
              {/* header */}
              <div className="relative isolate shrink-0 overflow-hidden bg-slate-900 px-4 pb-3 pt-3.5 text-white">
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
                <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 -z-10 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  aria-label="Close"
                  className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25">
                    <ClipboardList className="h-4 w-4 text-indigo-200" />
                  </span>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Daily work report</p>
                    <h2 id="wr-title" className="text-sm font-bold">
                      {new Date(reportDate + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'long', day: 'numeric', month: 'short',
                      })}
                    </h2>
                  </div>
                </div>
              </div>

              {done ? (
                <div className="flex flex-col items-center px-5 py-8 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <p className="text-base font-bold text-slate-900">Report submitted</p>
                  <p className="mt-0.5 text-xs text-slate-500">Thank you, have a great evening!</p>
                </div>
              ) : (
                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
                    <div>
                      <label htmlFor="wr-done" className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <span>What did you complete today? <span className="text-rose-500">*</span></span>
                        <span className="font-normal text-slate-400">{tasksDone.length}/{MAX}</span>
                      </label>
                      <textarea
                        id="wr-done"
                        rows={4}
                        maxLength={MAX}
                        value={tasksDone}
                        onChange={(e) => setTasksDone(e.target.value)}
                        placeholder="e.g. Followed up 8 leads, finished the Sharma site measurements, updated quotation…"
                        className={inputCls}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label htmlFor="wr-block" className="mb-1 block text-[11px] font-semibold text-slate-700">
                        Blockers / issues <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <textarea
                        id="wr-block"
                        rows={2}
                        maxLength={MAX}
                        value={blockers}
                        onChange={(e) => setBlockers(e.target.value)}
                        placeholder="Anything that slowed you down?"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label htmlFor="wr-plan" className="mb-1 block text-[11px] font-semibold text-slate-700">
                        Plan for tomorrow <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <textarea
                        id="wr-plan"
                        rows={2}
                        maxLength={MAX}
                        value={tomorrowPlan}
                        onChange={(e) => setTomorrowPlan(e.target.value)}
                        placeholder="What will you work on next?"
                        className={inputCls}
                      />
                    </div>

                    {error && (
                      <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 ring-1 ring-rose-100">
                        {error}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      disabled={saving}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex flex-[1.5] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {saving ? 'Submitting…' : submitted ? 'Update report' : 'Submit report'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}