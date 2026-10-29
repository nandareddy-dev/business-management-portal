'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Minus, Clock3, FolderKanban, CheckCircle2, Loader2, CircleDashed, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Status = 'completed' | 'in_progress' | 'pending'

const STATUS_OPTIONS: {
  value: Status
  label: string
  hint: string
  icon: typeof CheckCircle2
  idle: string
  active: string
  iconColor: string
}[] = [
  {
    value: 'completed',
    label: 'Completed',
    hint: 'Finished today',
    icon: CheckCircle2,
    idle: 'border-[#E6DECF] bg-white hover:border-emerald-300',
    active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20',
    iconColor: 'text-emerald-600',
  },
  {
    value: 'in_progress',
    label: 'In progress',
    hint: 'Still working on it',
    icon: Loader,
    idle: 'border-[#E6DECF] bg-white hover:border-amber-300',
    active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20',
    iconColor: 'text-amber-600',
  },
  {
    value: 'pending',
    label: 'Pending',
    hint: 'Not started yet',
    icon: CircleDashed,
    idle: 'border-[#E6DECF] bg-white hover:border-stone-300',
    active: 'border-stone-500 bg-stone-100 ring-2 ring-stone-500/20',
    iconColor: 'text-stone-600',
  },
]

const QUICK_HOURS = [2, 4, 6, 8]
const MAX_CHARS = 500

const inputBase =
  'w-full bg-white border border-[#E6DECF] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] placeholder:text-[#B5AA9A] outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15'

export function SubmitReportButton({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ task_description: '', project_name: '' })
  const [hours, setHours] = useState(8)
  const [status, setStatus] = useState<Status>('completed')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const close = () => {
    if (loading) return
    setOpen(false)
    setError('')
  }

  // Close on Escape + lock background scroll while the modal is open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, loading])

  const handleSubmit = async () => {
    if (!form.task_description.trim()) {
      setError('Describe what you worked on before submitting.')
      return
    }
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { error: err } = await supabase.from('work_reports').insert({
      employee_id: employeeId,
      company_id: companyId,
      report_date: today,
      task_description: form.task_description.trim(),
      project_name: form.project_name.trim() || null,
      hours_spent: hours,
      status,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setOpen(false)
    setForm({ task_description: '', project_name: '' })
    setHours(8)
    setStatus('completed')
    router.refresh()
  }

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <style>{`
        @keyframes report-backdrop-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes report-sheet-in {
          from { opacity: 0; transform: translateY(24px) scale(0.98) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
        .report-backdrop { animation: report-backdrop-in 160ms ease-out both }
        .report-sheet { animation: report-sheet-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both }
        @media (prefers-reduced-motion: reduce) {
          .report-backdrop, .report-sheet { animation: none }
        }
      `}</style>

      <button
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_6px_16px_-6px_rgba(217,119,6,0.6)] transition hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30"
      >
        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
        Submit report
      </button>

      {open && (
        <div
          className="report-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#1C1712]/60 backdrop-blur-sm sm:items-center sm:px-4"
          onMouseDown={e => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="report-sheet flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[#E6DECF] bg-[#FEFCF8] shadow-2xl sm:rounded-3xl"
          >
            {/* Header */}
            <div className="relative border-b border-[#EFE8D9] bg-gradient-to-br from-amber-100/80 via-[#FEFCF8] to-[#FEFCF8] px-6 pb-4 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="report-title" className="text-lg font-semibold tracking-tight text-[#1C1712]">
                    Today&apos;s work report
                  </h2>
                  <p className="mt-0.5 text-sm text-[#7A6E60]">{todayLabel}</p>
                </div>
                <button
                  onClick={close}
                  aria-label="Close"
                  className="-mr-2 -mt-1 rounded-full p-2 text-[#9A8F82] transition hover:bg-black/5 hover:text-[#1C1712] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-5 overflow-y-auto px-6 py-5">
              {/* Task */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="task_description" className="text-sm font-medium text-[#3D342A]">
                    What did you work on?
                  </label>
                  <span
                    className={`text-xs tabular-nums ${
                      form.task_description.length > MAX_CHARS - 50 ? 'text-amber-700' : 'text-[#B5AA9A]'
                    }`}
                  >
                    {form.task_description.length}/{MAX_CHARS}
                  </span>
                </div>
                <textarea
                  id="task_description"
                  name="task_description"
                  value={form.task_description}
                  onChange={handleChange}
                  maxLength={MAX_CHARS}
                  rows={4}
                  autoFocus
                  placeholder="Fixed the login bug, reviewed two pull requests…"
                  className={`${inputBase} resize-none leading-relaxed`}
                />
              </div>

              {/* Project */}
              <div>
                <label htmlFor="project_name" className="mb-1.5 block text-sm font-medium text-[#3D342A]">
                  Project <span className="font-normal text-[#B5AA9A]">(optional)</span>
                </label>
                <div className="relative">
                  <FolderKanban className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B5AA9A]" />
                  <input
                    id="project_name"
                    name="project_name"
                    value={form.project_name}
                    onChange={handleChange}
                    placeholder="e.g. Website redesign"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              {/* Hours */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#3D342A]">Hours spent</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-[#E6DECF] bg-white p-1">
                    <button
                      type="button"
                      aria-label="Decrease hours"
                      onClick={() => setHours(h => Math.max(1, h - 1))}
                      disabled={hours <= 1}
                      className="rounded-lg p-2 text-[#7A6E60] transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="flex w-16 items-center justify-center gap-1.5 text-[#1C1712]">
                      <Clock3 className="h-4 w-4 text-amber-600" />
                      <span className="text-base font-semibold tabular-nums">{hours}</span>
                      <span className="text-xs text-[#9A8F82]">h</span>
                    </div>
                    <button
                      type="button"
                      aria-label="Increase hours"
                      onClick={() => setHours(h => Math.min(12, h + 1))}
                      disabled={hours >= 12}
                      className="rounded-lg p-2 text-[#7A6E60] transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-1 gap-1.5">
                    {QUICK_HOURS.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHours(h)}
                        className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                          hours === h
                            ? 'border-amber-500 bg-amber-500 text-gray-900'
                            : 'border-[#E6DECF] bg-white text-[#7A6E60] hover:border-amber-300 hover:text-amber-700'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status */}
              <fieldset>
                <legend className="mb-1.5 block text-sm font-medium text-[#3D342A]">Status</legend>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map(opt => {
                    const Icon = opt.icon
                    const selected = status === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setStatus(opt.value)}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30 ${
                          selected ? opt.active : opt.idle
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${selected ? opt.iconColor : 'text-[#B5AA9A]'}`} />
                        <span className="text-sm font-semibold leading-tight text-[#1C1712]">{opt.label}</span>
                        <span className="text-[11px] leading-tight text-[#7A6E60]">{opt.hint}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                >
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-[#EFE8D9] bg-[#FAF6EC] px-6 py-4">
              <button
                onClick={close}
                disabled={loading}
                className="flex-1 rounded-xl border border-[#DDD5C4] bg-white py-2.5 text-sm font-medium text-[#7A6E60] transition hover:bg-[#F5F0E8] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 py-2.5 text-sm font-semibold text-gray-900 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_6px_16px_-6px_rgba(217,119,6,0.6)] transition hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}