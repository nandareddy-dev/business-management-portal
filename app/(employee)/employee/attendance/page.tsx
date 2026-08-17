'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ArrowUpRight, ArrowDownLeft, CalendarDays, MapPin } from 'lucide-react'
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

const STAT_TABS = [
  { key: 'present',      label: 'Login',    bg: 'bg-gray-900',    text: 'text-white' },
  { key: 'half_day',     label: 'Half',     bg: 'bg-amber-500',   text: 'text-white' },
  { key: 'leave',        label: 'Leave',    bg: 'bg-purple-500',  text: 'text-white' },
  { key: 'lwp',          label: 'LWP',      bg: 'bg-fuchsia-600', text: 'text-white' },
  { key: 'absent',       label: 'Absent',   bg: 'bg-rose-500',    text: 'text-white' },
  { key: 'short_leave',  label: 'S.Leave',  bg: 'bg-pink-500',    text: 'text-white' },
  { key: 'short_login',  label: 'S.Login',  bg: 'bg-blue-500',    text: 'text-white' },
]

// Pill colors keyed by status, used in the day-wise list
const STATUS_PILL: Record<string, string> = {
  present:     'bg-emerald-50 text-emerald-700',
  half_day:    'bg-amber-50 text-amber-700',
  leave:       'bg-purple-50 text-purple-700',
  lwp:         'bg-fuchsia-50 text-fuchsia-700',
  absent:      'bg-rose-50 text-rose-700',
  short_leave: 'bg-pink-50 text-pink-700',
  short_login: 'bg-blue-50 text-blue-700',
  holiday:     'bg-gray-100 text-gray-500',
}

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
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)

  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
  const todayStr   = toISTDateStr(now)
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

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1)
    setExpandedDay(null)
  }
  const goNextMonth = () => {
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1)
    setExpandedDay(null)
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

  function calcWorkingHrs(checkIn?: string, checkOut?: string) {
    if (!checkIn || !checkOut) return '00:00'
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    if (diffMs <= 0) return '00:00'
    const h = Math.floor(diffMs / 3600000), m = Math.floor((diffMs % 3600000) / 60000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  function fmtTime(iso?: string) {
    return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'
  }

  const todayRec = dateMap[todayStr]

  const allDays = Array.from({ length: daysInMonth }, (_, i) => daysInMonth - i)
    .filter(d => new Date(viewYear, viewMonth, d) <= now)
    .map(d => {
      const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const info = dateMap[ds]
      const weekend = isWeekend(d)
      return {
        day: d, dateStr: ds,
        dayName: new Date(viewYear, viewMonth, d).toLocaleDateString('en-IN', { weekday: 'long' }),
        // Weekend (Sat/Sun) defaults to holiday, but a real punch-in that day overrides it to the actual status.
        status: info?.status ?? (weekend ? 'holiday' : 'absent'),
        checkIn: info?.checkIn, checkOut: info?.checkOut,
        checkInAddr: info?.checkInAddr, checkOutAddr: info?.checkOutAddr,
      }
    })

  if (loading) return (
    <div className="h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-4 px-4">

        {/* Header */}
        <div className="mb-4">
          <Link href="/employee" className="text-gray-400 text-xs flex items-center gap-1.5 mb-3 w-fit hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <h1 className="text-xl font-medium text-gray-900">My attendance</h1>
          <p className="text-xs text-gray-400 mt-0.5">Roster {ROSTER_START} – {ROSTER_END}</p>
        </div>

        {loadError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-between">
            <span>⚠ {loadError}</span>
            <button onClick={() => { setLoading(true); loadData() }} className="text-xs font-semibold underline ml-3 flex-shrink-0">
              Retry
            </button>
          </div>
        )}

        {/* Month nav */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <button onClick={goPrevMonth} className="text-gray-400 hover:text-gray-700 text-lg leading-none">‹</button>
          <p className="text-sm font-medium text-gray-900 w-32 text-center">{monthName} {viewYear}</p>
          <button onClick={goNextMonth} disabled={isCurrentMonth} className="text-gray-400 hover:text-gray-700 disabled:opacity-25 text-lg leading-none">›</button>
        </div>

        {/* Horizontal status chips — scrollable */}
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: 'none' }}>
          {STAT_TABS.map(t => (
            <div key={t.key}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${t.bg} ${t.text}`}>
              {t.label} ({statCounts[t.key]})
            </div>
          ))}
        </div>

        {/* Today card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-1.5 mb-3">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Today</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-900">
              {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" /> {fmtTime(todayRec?.checkIn)}
              </span>
              <span className="flex items-center gap-1 text-sm text-rose-500">
                <ArrowDownLeft className="w-3.5 h-3.5" /> {fmtTime(todayRec?.checkOut)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Roster<br /><span className="text-gray-700 font-medium">{ROSTER_START} - {ROSTER_END}</span></p>
            <p className="text-xs text-gray-400 text-right">Working hrs<br /><span className="text-gray-700 font-medium">{calcWorkingHrs(todayRec?.checkIn, todayRec?.checkOut)}</span></p>
          </div>
        </div>

        {/* Day-wise list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {allDays.map((d, idx) => {
            const isOpen = expandedDay === d.dateStr
            const pillClass = STATUS_PILL[d.status] ?? 'bg-gray-100 text-gray-500'
            return (
              <div key={d.dateStr} className={idx > 0 ? 'border-t border-gray-100' : ''}>
                <button onClick={() => setExpandedDay(isOpen ? null : d.dateStr)}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900">{d.dayName}-{d.day}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${pillClass}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Punch in / out</p>
                        <p className="text-sm text-gray-900 mt-1">{fmtTime(d.checkIn)} – {fmtTime(d.checkOut)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Working hrs</p>
                        <p className="text-sm text-gray-900 mt-1">{calcWorkingHrs(d.checkIn, d.checkOut)}</p>
                      </div>
                    </div>
                    {(d.checkInAddr || d.checkOutAddr) && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                        {d.checkInAddr && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" /> In: {d.checkInAddr}
                          </p>
                        )}
                        {d.checkOutAddr && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-500" /> Out: {d.checkOutAddr}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}