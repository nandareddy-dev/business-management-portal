'use client'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, CheckCircle2, MessageSquareText, Palmtree, Plus, X, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LeaveBalance {
  cl_total?: number
  cl_used?: number
  sl_total?: number
  sl_used?: number
  el_total?: number
  el_used?: number
  [key: string]: unknown
}

interface Props {
  employeeId: string
  companyId: string
  balance: LeaveBalance
}

const LEAVE_TYPES = [
  { key: 'CL', label: 'Casual', selected: 'border-purple-400 bg-purple-50 ring-2 ring-purple-200', text: 'text-purple-700', tile: 'bg-purple-100 text-purple-700' },
  { key: 'SL', label: 'Sick',   selected: 'border-blue-400 bg-blue-50 ring-2 ring-blue-200',       text: 'text-blue-700',   tile: 'bg-blue-100 text-blue-700' },
  { key: 'EL', label: 'Earned', selected: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200', text: 'text-emerald-700', tile: 'bg-emerald-100 text-emerald-700' },
] as const

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 sm:text-sm'

export function ApplyLeaveButton({ employeeId, companyId, balance }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ leave_type: 'CL', from_date: '', to_date: '', reason: '' })

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const selectType = (key: string) => {
    setForm(prev => ({ ...prev, leave_type: key }))
    setError('')
  }

  const getDays = () => {
    if (!form.from_date || !form.to_date) return 0
    const from = new Date(form.from_date)
    const to = new Date(form.to_date)
    return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  }

  const remainingFor = (type: string) => {
    if (!balance) return 0
    if (type === 'CL') return (balance.cl_total ?? 0) - (balance.cl_used ?? 0)
    if (type === 'SL') return (balance.sl_total ?? 0) - (balance.sl_used ?? 0)
    if (type === 'EL') return (balance.el_total ?? 0) - (balance.el_used ?? 0)
    return 0
  }

  const getAvailable = () => remainingFor(form.leave_type)

  const handleSubmit = async () => {
    if (!form.from_date) { setError('From date required'); return }
    if (!form.to_date) { setError('To date required'); return }
    const days = getDays()
    if (days > getAvailable()) { setError(`Only ${getAvailable()} ${form.leave_type} days available`); return }

    setLoading(true)
    const { error: err } = await supabase.from('leave_applications').insert({
      employee_id: employeeId,
      company_id: companyId,
      leave_type: form.leave_type,
      from_date: form.from_date,
      to_date: form.to_date,
      days,
      reason: form.reason || null,
      status: 'pending',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    setForm({ leave_type: 'CL', from_date: '', to_date: '', reason: '' })
    router.refresh()
  }

  const days = getDays()
  const available = getAvailable()
  const exceeds = days > available
  const usagePct = days > 0 ? Math.min(100, available > 0 ? (days / available) * 100 : 100) : 0

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700"
      >
        <Plus className="h-4 w-4" /> Apply Leave
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Apply leave"
            className="relative isolate max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-slate-900 px-5 py-5 text-white">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
              <div
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              />
              <div className="pointer-events-none absolute -right-10 -top-10 -z-10 h-36 w-36 rounded-full bg-indigo-500/30 blur-3xl" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25">
                    <Palmtree size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Apply leave</h2>
                    <p className="text-xs text-slate-300">Choose type, dates and reason</p>
                  </div>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 ring-1 ring-white/15 transition hover:bg-white/20"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-5 pb-6 pt-5">
              {/* Leave type cards */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">Leave type</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {LEAVE_TYPES.map((t) => {
                    const left = remainingFor(t.key)
                    const active = form.leave_type === t.key

                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => selectType(t.key)}
                        aria-pressed={active}
                        className={`rounded-2xl border p-3 text-center transition ${
                          active ? t.selected : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold ${t.tile}`}>
                          {t.key}
                        </div>
                        <p className="mt-1.5 text-xs font-semibold text-slate-800">{t.label}</p>
                        <p className={`text-[11px] font-medium ${left <= 0 ? 'text-rose-500' : active ? t.text : 'text-slate-400'}`}>
                          {left} left
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <CalendarDays size={13} className="text-slate-400" /> From date
                  </label>
                  <input name="from_date" type="date" value={form.from_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <CalendarDays size={13} className="text-slate-400" /> To date
                  </label>
                  <input
                    name="to_date"
                    type="date"
                    value={form.to_date}
                    min={form.from_date}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Days summary */}
              {days > 0 && (
                <div
                  className={`rounded-2xl p-4 ring-1 ${
                    exceeds ? 'bg-rose-50 ring-rose-100' : 'bg-emerald-50 ring-emerald-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {exceeds ? (
                        <XCircle size={18} className="text-rose-600" />
                      ) : (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      )}
                      <p className={`text-sm font-bold ${exceeds ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {days} day{days > 1 ? 's' : ''} selected
                      </p>
                    </div>
                    <p className={`text-xs font-semibold ${exceeds ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {available} available
                    </p>
                  </div>

                  <div className={`mt-3 h-2 w-full overflow-hidden rounded-full ${exceeds ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${exceeds ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>

                  {exceeds && (
                    <p className="mt-2 text-xs font-medium text-rose-600">
                      You are requesting more days than your {form.leave_type} balance.
                    </p>
                  )}
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <MessageSquareText size={13} className="text-slate-400" /> Reason
                </label>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief reason for leave..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
                  <XCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || days > available}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? 'Submitting...' : 'Apply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}