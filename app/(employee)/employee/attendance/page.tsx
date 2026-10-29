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

// Summary tiles — dot is the status colour, same colour is used on the calendar boxes
const STAT_TABS = [
  { key: 'present',     label: 'Login',    dot: 'bg-emerald-500' },
  { key: 'half_day',    label: 'Half day', dot: 'bg-amber-500' },
  { key: 'leave',       label: 'Leave',    dot: 'bg-purple-500' },
  { key: 'lwp',         label: 'LWP',      dot: 'bg-fuchsia-600' },
  { key: 'absent',      label: 'Absent',   dot: 'bg-rose-500' },
  { key: 'short_leave', label: 'S. leave', dot: 'bg-pink-500' },
  { key: 'short_login', label: 'S. login', dot: 'bg-blue-500' },
]

// Calendar box colours keyed by status
const STATUS_CELL: Record<string, string> = {
  present:     'bg-emerald-500 text-white',
  half_day:    'bg-amber-500 text-white',
  leave:       'bg-purple-500 text-white',
  lwp:         'bg-fuchsia-600 text-white',
  absent:      'bg-rose-500 text-white',
  short_leave: 'bg-pink-500 text-white',
  short_login: 'bg-blue-500 text-white',
  holiday:     'bg-stone-200 text-stone-500',
}

// Pill colours keyed by status, used in the details panel
const STATUS_PILL: Record<string, string> = {
  present:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  half_day:    'bg-amber-50 text-amber-700 ring-amber-200',
  leave:       'bg-purple-50 text-purple-700 ring-purple-200',
  lwp:         'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  absent:      'bg-rose-50 text-rose-700 ring-rose-200',
  short_leave: 'bg-pink-50 text-pink-700 ring-pink-200',
  short_login: 'bg-blue-50 text-blue-700 ring-blue-200',
  holiday:     'bg-stone-100 text-stone-500 ring-stone-200',
}

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
  const scrollRef = useRef<HTMLDivElement>(null)
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

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F8F4EA]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8F4EA]">
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

        {/* Header */}
        <div className="mb-5">
          <Link
            href="/employee"
            className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#E6DECF] bg-white/70 px-3 py-1.5 text-xs font-medium text-[#7A6E60] transition hover:bg-white hover:text-[#1C1712] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1C1712]">My attendance</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              <Clock3 className="h-3.5 w-3.5" /> {ROSTER_START} – {ROSTER_END}
            </span>
          </div>
        </div>

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

        {/* Month nav */}
        <div className="mx-auto mb-4 flex w-fit items-center rounded-full border border-[#E6DECF] bg-white p-1 shadow-sm">
          <button
            onClick={goPrevMonth}
            aria-label="Previous month"
            className="rounded-full p-2 text-[#7A6E60] transition hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="w-36 text-center text-sm font-semibold text-[#1C1712]">{monthName} {viewYear}</p>
          <button
            onClick={goNextMonth}
            disabled={isCurrentMonth}
            aria-label="Next month"
            className="rounded-full p-2 text-[#7A6E60] transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-[#7A6E60] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Summary tiles — scrollable */}
        <div ref={scrollRef} className="-mx-4 mb-5 flex gap-2.5 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
          {STAT_TABS.map(t => (
            <div
              key={t.key}
              className="min-w-[84px] flex-shrink-0 rounded-2xl border border-[#E6DECF] bg-white px-3.5 py-3 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                <span className="whitespace-nowrap text-xs text-[#7A6E60]">{t.label}</span>
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums leading-none text-[#1C1712]">
                {statCounts[t.key]}
              </p>
            </div>
          ))}
        </div>

        {/* Today card */}
        <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2B2118] to-[#1C1712] p-5 text-white shadow-lg shadow-amber-900/10">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/25 blur-3xl" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-amber-200">
                <CalendarDays className="h-3.5 w-3.5" /> Today
              </span>
              <p className="text-sm font-medium text-white/80">
                {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.07] p-3.5">
                <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <LogIn className="h-3.5 w-3.5" /> Punch in
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{fmtTime(todayRec?.checkIn)}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.07] p-3.5">
                <p className="flex items-center gap-1.5 text-xs text-rose-300">
                  <LogOut className="h-3.5 w-3.5" /> Punch out
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{fmtTime(todayRec?.checkOut)}</p>
              </div>
            </div>

            <div className="mt-4">
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
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-[width] duration-700"
                  style={{ width: `${todayProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-3xl border border-[#E6DECF] bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAYS.map(w => (
              <p key={w} className="text-center text-xs font-medium text-[#9A8F82]">{w}</p>
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
                    className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[#E6DECF] text-sm tabular-nums text-[#CFC6B6]"
                  >
                    {c.day}
                  </div>
                )
              }
              return (
                <button
                  key={c.dateStr}
                  onClick={() => setSelectedDay(c.dateStr)}
                  aria-haspopup="dialog"
                  aria-label={`${c.dayName} ${c.fullLabel}, ${c.status.replace(/_/g, ' ')}`}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                    STATUS_CELL[c.status] ?? 'bg-stone-200 text-stone-600'
                  } ${
                    isSelected
                      ? 'ring-2 ring-[#1C1712] ring-offset-2 ring-offset-white'
                      : isToday
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white'
                        : ''
                  }`}
                >
                  {c.day}
                  {isToday && (
                    <span aria-hidden className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-80" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Details popup */}
        {selected && (
          <div
            className="att-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-[#1C1712]/60 backdrop-blur-sm sm:items-center sm:px-4"
            onMouseDown={e => { if (e.target === e.currentTarget) setSelectedDay(null) }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="att-dialog-title"
              className="att-sheet w-full max-w-md overflow-hidden rounded-t-3xl border border-[#E6DECF] bg-[#FEFCF8] shadow-2xl sm:rounded-3xl"
            >
              {/* Header */}
              <div className="flex items-start gap-3.5 border-b border-[#EFE8D9] bg-gradient-to-br from-amber-100/70 via-[#FEFCF8] to-[#FEFCF8] px-5 pb-4 pt-5">
                <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold tabular-nums ${STATUS_CELL[selected.status] ?? 'bg-stone-200 text-stone-600'}`}>
                  {selected.day}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="att-dialog-title" className="text-lg font-semibold tracking-tight text-[#1C1712]">
                    {selected.dayName}
                  </h2>
                  <p className="text-sm text-[#7A6E60]">
                    {selected.fullLabel} {viewYear}
                    {selected.dateStr === todayStr && <span className="ml-2 text-xs font-medium text-amber-700">Today</span>}
                  </p>
                  <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_PILL[selected.status] ?? 'bg-stone-100 text-stone-500 ring-stone-200'}`}>
                    {selected.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  aria-label="Close"
                  autoFocus
                  className="-mr-2 -mt-1 rounded-full p-2 text-[#9A8F82] transition hover:bg-black/5 hover:text-[#1C1712] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 pb-6 pt-4">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl bg-[#FAF6EC] p-3">
                    <p className="flex items-center gap-1 text-xs text-emerald-700">
                      <LogIn className="h-3.5 w-3.5" /> Punch in
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-[#1C1712]">{fmtTime(selected.checkIn)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#FAF6EC] p-3">
                    <p className="flex items-center gap-1 text-xs text-rose-600">
                      <LogOut className="h-3.5 w-3.5" /> Punch out
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-[#1C1712]">{fmtTime(selected.checkOut)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#FAF6EC] p-3">
                    <p className="flex items-center gap-1 text-xs text-amber-700">
                      <Hourglass className="h-3.5 w-3.5" /> Hours
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-[#1C1712]">
                      {calcWorkingHrs(selected.checkIn, selected.checkOut)}
                    </p>
                  </div>
                </div>

                {!selected.checkIn && !selected.checkOut && (
                  <p className="mt-3 text-sm text-[#9A8F82]">No punch recorded for this day.</p>
                )}

                {(selected.checkInAddr || selected.checkOutAddr) && (
                  <div className="mt-4 space-y-2 border-t border-[#F1EBDD] pt-4">
                    {selected.checkInAddr && (
                      <p className="flex items-start gap-1.5 text-xs text-[#7A6E60]">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                        <span>In: {selected.checkInAddr}</span>
                      </p>
                    )}
                    {selected.checkOutAddr && (
                      <p className="flex items-start gap-1.5 text-xs text-[#7A6E60]">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                        <span>Out: {selected.checkOutAddr}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#9A8F82]">
          <MousePointerClick className="h-3.5 w-3.5" /> Tap a date to see its punch details
        </p>
      </div>
    </div>
  )
}