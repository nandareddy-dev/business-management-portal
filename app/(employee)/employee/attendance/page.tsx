'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  LogIn, LogOut, CalendarDays, MapPin, Clock3, AlertTriangle, RotateCw, Hourglass, MousePointerClick, X,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

interface AttendanceRecord {
  id: string
  employee_id: string
  attendance_date: string
  status?: string
  check_in?: string
  check_out?: string
  check_in_address?: string
  check_out_address?: string
}
interface LeaveApp { from_date: string; to_date: string; leave_type: string; status: string }

const ROSTER_START = '09:30'
const ROSTER_END   = '18:30'
const ROSTER_MINS  = 9 * 60

// Summary legend — `bar` is the status colour, reused in the distribution bar and the calendar dots
const STAT_TABS = [
  { key: 'present',     label: 'Login',    bar: 'bg-emerald-500' },
  { key: 'half_day',    label: 'Half day', bar: 'bg-amber-500' },
  { key: 'leave',       label: 'Leave',    bar: 'bg-purple-500' },
  { key: 'lwp',         label: 'LWP',      bar: 'bg-fuchsia-600' },
  { key: 'absent',      label: 'Absent',   bar: 'bg-rose-500' },
  { key: 'short_leave', label: 'S. leave', bar: 'bg-pink-500' },
  { key: 'short_login', label: 'S. login', bar: 'bg-blue-500' },
]

// Solid colours keyed by status (popup avatar)
const STATUS_CELL: Record<string, string> = {
  present:     'bg-emerald-500 text-white',
  half_day:    'bg-amber-500 text-white',
  leave:       'bg-purple-500 text-white',
  lwp:         'bg-fuchsia-600 text-white',
  absent:      'bg-rose-500 text-white',
  short_leave: 'bg-pink-500 text-white',
  short_login: 'bg-blue-500 text-white',
  holiday:     'bg-slate-200 text-slate-500',
}

// Soft calendar cells keyed by status
const STATUS_SOFT: Record<string, { cell: string; dot: string }> = {
  present:     { cell: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  half_day:    { cell: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-500' },
  leave:       { cell: 'bg-purple-50 text-purple-700 ring-purple-200',    dot: 'bg-purple-500' },
  lwp:         { cell: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', dot: 'bg-fuchsia-600' },
  absent:      { cell: 'bg-rose-50 text-rose-700 ring-rose-200',          dot: 'bg-rose-500' },
  short_leave: { cell: 'bg-pink-50 text-pink-700 ring-pink-200',          dot: 'bg-pink-500' },
  short_login: { cell: 'bg-blue-50 text-blue-700 ring-blue-200',          dot: 'bg-blue-500' },
  holiday:     { cell: 'bg-slate-100 text-slate-400 ring-slate-200',      dot: 'bg-slate-300' },
}
const SOFT_FALLBACK = { cell: 'bg-slate-100 text-slate-500 ring-slate-200', dot: 'bg-slate-400' }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Timezone-safe YYYY-MM-DD formatting for Asia/Kolkata — avoids the
// new Date(...).toISOString() off-by-one bug for IST users (UTC+5:30),
// where local midnight rolls back to the previous UTC day.
function toISTDateStr(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export default function EmployeeAttendancePage() {
  const router = useRouter()
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  const [records, setRecords]   = useState<AttendanceRecord[]>([])
  const [leaveApps, setLeaveApps] = useState<LeaveApp[]>([])
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const requestIdRef = useRef(0)

  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
  const todayStr   = toISTDateStr(now)
  // Date whose details popup is open (null = closed)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const monthName  = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', { month: 'long' })

  // Timezone-safe month bounds (fixes last-day-of-month data loss for IST users)
  const monthStart = toISTDateStr(new Date(viewYear, viewMonth, 1))
  const monthEnd   = toISTDateStr(new Date(viewYear, viewMonth + 1, 0))

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoadError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: emp, error: empErr } = await supabase
        .from('employees').select('id, full_name').eq('email', user.email!).single()

      // Stale response guard — ignore if a newer request has since fired
      if (requestId !== requestIdRef.current) return

      if (empErr || !emp) {
        setLoadError('Could not load your employee record. Please try again or contact admin.')
        setLoading(false)
        return
      }

      const [{ data: recs, error: recsErr }, { data: leaves, error: leavesErr }] = await Promise.all([
        supabase.from('attendance').select('*')
          .eq('employee_id', emp.id)
          .gte('attendance_date', monthStart)
          .lte('attendance_date', monthEnd)
          .order('attendance_date', { ascending: false }),
        // Overlap query — catches leaves that span across the month boundary,
        // not just leaves fully contained within it.
        supabase.from('leave_applications').select('from_date, to_date, leave_type, status')
          .eq('employee_id', emp.id)
          .eq('status', 'approved')
          .lte('from_date', monthEnd)
          .gte('to_date', monthStart),
      ])

      if (requestId !== requestIdRef.current) return

      if (recsErr || leavesErr) {
        setLoadError('Could not load attendance data. Please try again.')
        setLoading(false)
        return
      }

      setRecords(recs ?? [])
      setLeaveApps(leaves ?? [])
    } catch (e) {
      console.error(e)
      if (requestId === requestIdRef.current) {
        setLoadError('Something went wrong loading attendance. Please try again.')
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [supabase, router, monthStart, monthEnd])

  // Intentional refetch on month navigation; loadData itself sets loading=false
  // when done, this just flips the spinner on immediately for a responsive switch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    loadData()
  }, [loadData])

  // Close popup on Escape + lock background scroll while it is open
  useEffect(() => {
    if (!selectedDay) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedDay(null) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [selectedDay])

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1)
    setSelectedDay(null)
  }
  const goNextMonth = () => {
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1)
    setSelectedDay(null)
  }

  const dateMap: Record<string, { status: string; checkIn?: string; checkOut?: string; checkInAddr?: string; checkOutAddr?: string }> = {}
  for (const r of records) {
    dateMap[r.attendance_date] = {
      status: r.status?.toLowerCase() ?? 'present',
      checkIn: r.check_in, checkOut: r.check_out,
      checkInAddr: r.check_in_address, checkOutAddr: r.check_out_address,
    }
  }
  for (const l of leaveApps) {
    const from = new Date(l.from_date), to = new Date(l.to_date)
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = toISTDateStr(d)
      if (!dateMap[key]) dateMap[key] = { status: 'leave' }
    }
  }

  const statCounts: Record<string, number> = {}
  STAT_TABS.forEach(t => {
    statCounts[t.key] = Object.values(dateMap).filter(v => v.status === t.key).length
  })
  const statTotal = STAT_TABS.reduce((sum, t) => sum + statCounts[t.key], 0)

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  // Weekend = Saturday & Sunday (both treated as default holiday below)
  function isWeekend(day: number) { return [0, 6].includes(new Date(viewYear, viewMonth, day).getDay()) }

  function calcWorkingMins(checkIn?: string, checkOut?: string) {
    if (!checkIn || !checkOut) return 0
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    return diffMs > 0 ? Math.floor(diffMs / 60000) : 0
  }
  function calcWorkingHrs(checkIn?: string, checkOut?: string) {
    const mins = calcWorkingMins(checkIn, checkOut)
    const h = Math.floor(mins / 60), m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  function fmtTime(iso?: string) {
    return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'
  }

  const todayRec = dateMap[todayStr]
  const todayMins = calcWorkingMins(todayRec?.checkIn, todayRec?.checkOut)
  const todayProgress = Math.min(100, Math.round((todayMins / ROSTER_MINS) * 100))

  // Calendar cells: 1..daysInMonth in order, with blank cells before the 1st
  const leadingBlanks = new Date(viewYear, viewMonth, 1).getDay()
  const cells = Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const info = dateMap[ds]
    const weekend = isWeekend(d)
    const dateObj = new Date(viewYear, viewMonth, d)
    return {
      day: d, dateStr: ds,
      future: dateObj > now,
      dayName: dateObj.toLocaleDateString('en-IN', { weekday: 'long' }),
      fullLabel: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }),
      // Weekend (Sat/Sun) defaults to holiday, but a real punch-in that day overrides it to the actual status.
      status: info?.status ?? (weekend ? 'holiday' : 'absent'),
      checkIn: info?.checkIn, checkOut: info?.checkOut,
      checkInAddr: info?.checkInAddr, checkOutAddr: info?.checkOutAddr,
    }
  })
  const selected = cells.find(c => c.dateStr === selectedDay && !c.future) ?? null

  // Attendance rate: full-credit for present / short login / short leave, half for half day.
  // Holidays, future days and approved leave are not counted against the employee.
  const countableDays = cells.filter(c => !c.future && c.status !== 'holiday' && c.status !== 'leave')
  const attendedScore = countableDays.reduce((sum, c) => {
    if (c.status === 'present' || c.status === 'short_login' || c.status === 'short_leave') return sum + 1
    if (c.status === 'half_day') return sum + 0.5
    return sum
  }, 0)
  const attendanceRate = countableDays.length > 0
    ? Math.min(100, Math.round((attendedScore / countableDays.length) * 100))
    : 0
  const ringRadius = 46
  const ringCircumference = 2 * Math.PI * ringRadius

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      <style>{`
        @keyframes att-backdrop-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes att-sheet-in {
          from { opacity: 0; transform: translateY(24px) scale(0.98) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
        .att-backdrop { animation: att-backdrop-in 160ms ease-out both }
        .att-sheet { animation: att-sheet-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both }
        @media (prefers-reduced-motion: reduce) { .att-backdrop, .att-sheet { animation: none } }
      `}</style>

      <div className="mx-auto max-w-2xl px-4 pb-28 pt-5">

        {loadError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {loadError}
            </span>
            <button
              onClick={() => { setLoading(true); loadData() }}
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
            >
              <RotateCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {/* ── HERO: title, month switcher, attendance rate, today ── */}
        <section className="relative isolate mb-5 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-6">
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

          <div className="flex items-center justify-between gap-3">
            <Link
              href="/employee"
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100 ring-1 ring-white/15">
              <Clock3 className="h-3.5 w-3.5" /> {ROSTER_START} – {ROSTER_END}
            </span>
          </div>

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Employee Portal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">My attendance</h1>

          {/* Month nav */}
          <div className="mt-4 inline-flex items-center rounded-full bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
            <button
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="rounded-full p-2 text-slate-200 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="w-36 text-center text-sm font-semibold">{monthName} {viewYear}</p>
            <button
              onClick={goNextMonth}
              disabled={isCurrentMonth}
              aria-label="Next month"
              className="rounded-full p-2 text-slate-200 transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Attendance rate ring */}
          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
            <div className="relative h-24 w-24 flex-shrink-0">
              <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
                <circle cx="55" cy="55" r={ringRadius} fill="none" strokeWidth="10" className="stroke-white/15" />
                <circle
                  cx="55" cy="55" r={ringRadius} fill="none" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(attendanceRate / 100) * ringCircumference} ${ringCircumference}`}
                  className="stroke-emerald-400 transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold tabular-nums">{attendanceRate}%</span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Attendance rate</p>
              <p className="mt-1 text-sm font-semibold">
                {attendedScore % 1 === 0 ? attendedScore : attendedScore.toFixed(1)} of {countableDays.length} working days
              </p>
              <p className="mt-0.5 text-xs text-slate-300">Holidays, leave and future days not counted</p>
            </div>
          </div>

          {/* Today (current month only) */}
          {isCurrentMonth && (
            <div className="mt-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-indigo-200">
                  <CalendarDays className="h-3.5 w-3.5" /> Today
                </span>
                <p className="text-sm font-medium text-white/80">
                  {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
                  <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                    <LogIn className="h-3.5 w-3.5" /> Punch in
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{fmtTime(todayRec?.checkIn)}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
                  <p className="flex items-center gap-1.5 text-xs text-rose-300">
                    <LogOut className="h-3.5 w-3.5" /> Punch out
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{fmtTime(todayRec?.checkOut)}</p>
                </div>
              </div>

              <div className="mt-3.5">
                <div className="mb-1.5 flex items-baseline justify-between text-xs text-white/60">
                  <span>Working hours</span>
                  <span>
                    <span className="text-sm font-semibold tabular-nums text-white">
                      {calcWorkingHrs(todayRec?.checkIn, todayRec?.checkOut)}
                    </span>{' '}
                    of 09:00
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={todayProgress}
                  aria-label="Working hours completed today"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-300 transition-[width] duration-700"
                    style={{ width: `${todayProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── MONTH SUMMARY: distribution bar + legend ── */}
        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Month summary</h2>
            <span className="text-xs font-medium text-slate-400">{statTotal} recorded day{statTotal === 1 ? '' : 's'}</span>
          </div>

          <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {statTotal > 0 && STAT_TABS.filter(t => statCounts[t.key] > 0).map(t => (
              <div
                key={t.key}
                className={`${t.bar} h-full`}
                style={{ width: `${(statCounts[t.key] / statTotal) * 100}%` }}
                title={`${t.label}: ${statCounts[t.key]}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {STAT_TABS.map(t => (
              <div key={t.key} className="rounded-2xl bg-slate-50 px-2 py-2.5 text-center ring-1 ring-slate-100">
                <p className="text-xl font-extrabold tabular-nums leading-none text-slate-900">{statCounts[t.key]}</p>
                <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500">
                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${t.bar}`} />
                  <span className="truncate">{t.label}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CALENDAR ── */}
        <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAYS.map(w => (
              <p key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{w}</p>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} aria-hidden />
            ))}

            {cells.map(c => {
              const isToday = c.dateStr === todayStr
              const isSelected = c.dateStr === selectedDay
              if (c.future) {
                return (
                  <div
                    key={c.dateStr}
                    aria-hidden
                    className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm tabular-nums text-slate-300"
                  >
                    {c.day}
                  </div>
                )
              }
              const soft = STATUS_SOFT[c.status] ?? SOFT_FALLBACK
              return (
                <button
                  key={c.dateStr}
                  onClick={() => setSelectedDay(c.dateStr)}
                  aria-haspopup="dialog"
                  aria-label={`${c.dayName} ${c.fullLabel}, ${c.status.replace(/_/g, ' ')}`}
                  className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl text-sm font-bold tabular-nums ring-1 transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${soft.cell} ${
                    isSelected
                      ? '!ring-2 !ring-slate-900 ring-offset-2 ring-offset-white'
                      : isToday
                        ? '!ring-2 !ring-indigo-500 ring-offset-2 ring-offset-white'
                        : ''
                  }`}
                >
                  {c.day}
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${soft.dot}`} />
                </button>
              )
            })}
          </div>
        </section>

        {/* ── DETAILS POPUP ── */}
        {selected && (
          <div
            className="att-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:px-4"
            onMouseDown={e => { if (e.target === e.currentTarget) setSelectedDay(null) }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="att-dialog-title"
              className="att-sheet w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            >
              {/* Header */}
              <div className="relative isolate overflow-hidden bg-slate-900 px-5 pb-5 pt-5 text-white">
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 -z-10 h-36 w-36 rounded-full bg-indigo-500/30 blur-3xl" />

                <div className="flex items-start gap-3.5">
                  <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold tabular-nums shadow-lg ${STATUS_CELL[selected.status] ?? 'bg-slate-200 text-slate-600'}`}>
                    {selected.day}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 id="att-dialog-title" className="text-lg font-bold tracking-tight">
                      {selected.dayName}
                    </h2>
                    <p className="text-sm text-slate-300">
                      {selected.fullLabel} {viewYear}
                      {selected.dateStr === todayStr && <span className="ml-2 text-xs font-semibold text-emerald-300">Today</span>}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ring-white/25">
                      {selected.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    aria-label="Close"
                    autoFocus
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-200 ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 pb-6 pt-4">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                    <p className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <LogIn className="h-3.5 w-3.5" /> In
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-slate-900">{fmtTime(selected.checkIn)}</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-100">
                    <p className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                      <LogOut className="h-3.5 w-3.5" /> Out
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-slate-900">{fmtTime(selected.checkOut)}</p>
                  </div>
                  <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                    <p className="flex items-center gap-1 text-xs font-semibold text-indigo-700">
                      <Hourglass className="h-3.5 w-3.5" /> Hours
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-slate-900">
                      {calcWorkingHrs(selected.checkIn, selected.checkOut)}
                    </p>
                  </div>
                </div>

                {selected.checkIn && selected.checkOut && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Roster {ROSTER_START} – {ROSTER_END}</span>
                      <span>{Math.min(100, Math.round((calcWorkingMins(selected.checkIn, selected.checkOut) / ROSTER_MINS) * 100))}% of 09:00</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400"
                        style={{ width: `${Math.min(100, (calcWorkingMins(selected.checkIn, selected.checkOut) / ROSTER_MINS) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {!selected.checkIn && !selected.checkOut && (
                  <p className="mt-4 rounded-2xl border border-dashed border-slate-200 py-3 text-center text-sm text-slate-400">
                    No punch recorded for this day.
                  </p>
                )}

                {(selected.checkInAddr || selected.checkOutAddr) && (
                  <div className="mt-4 space-y-2">
                    {selected.checkInAddr && (
                      <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-snug text-slate-600 ring-1 ring-slate-100">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                        <span className="break-words">In: {selected.checkInAddr}</span>
                      </p>
                    )}
                    {selected.checkOutAddr && (
                      <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-snug text-slate-600 ring-1 ring-slate-100">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                        <span className="break-words">Out: {selected.checkOutAddr}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <MousePointerClick className="h-3.5 w-3.5" /> Tap a date to see its punch details
        </p>
      </div>
    </div>
  )
}