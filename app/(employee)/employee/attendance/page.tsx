'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ArrowUpRight, ArrowDownLeft, CalendarDays } from 'lucide-react'
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

const ROSTER_START = '10:00'
const ROSTER_END   = '19:00'

const STAT_TABS = [
  { key: 'present',      label: 'Login',    color: '#1C1712' },
  { key: 'half_day',     label: 'Half',     color: '#C2410C' },
  { key: 'leave',        label: 'Leave',    color: '#B45309' },
  { key: 'lwp',          label: 'LWP',      color: '#9333EA' },
  { key: 'absent',       label: 'Absent',   color: '#DC2626' },
  { key: 'short_leave',  label: 'S.Leave',  color: '#DB2777' },
  { key: 'short_login',  label: 'S.Login',  color: '#2563EB' },
]

export default function EmployeeAttendancePage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [records, setRecords]   = useState<AttendanceRecord[]>([])
  const [leaveApps, setLeaveApps] = useState<LeaveApp[]>([])
  const [loading, setLoading]   = useState(true)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
  const todayStr   = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const monthName  = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', { month: 'long' })

  const monthStart = new Date(viewYear, viewMonth, 1).toISOString().split('T')[0]
  const monthEnd   = new Date(viewYear, viewMonth + 1, 0).toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: emp } = await supabase
        .from('employees').select('id, full_name').eq('email', user.email!).single()
      if (!emp) { router.push('/login'); return }

      const [{ data: recs }, { data: leaves }] = await Promise.all([
        supabase.from('attendance').select('*')
          .eq('employee_id', emp.id)
          .gte('attendance_date', monthStart)
          .lte('attendance_date', monthEnd)
          .order('attendance_date', { ascending: false }),
        supabase.from('leave_applications').select('from_date, to_date, leave_type, status')
          .eq('employee_id', emp.id)
          .eq('status', 'approved')
          .gte('from_date', monthStart)
          .lte('to_date', monthEnd),
      ])
      setRecords(recs ?? [])
      setLeaveApps(leaves ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [supabase, router, monthStart, monthEnd])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional
    // refetch on month navigation; loadData itself sets loading=false when done,
    // this just flips the spinner on immediately for a responsive month switch.
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
      const key = d.toISOString().split('T')[0]
      if (!dateMap[key]) dateMap[key] = { status: 'leave' }
    }
  }

  const statCounts: Record<string, number> = {}
  STAT_TABS.forEach(t => {
    statCounts[t.key] = Object.values(dateMap).filter(v => v.status === t.key).length
  })

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
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
  const mono = { fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }
  const serif = { fontFamily: 'Georgia, serif' }

  const allDays = Array.from({ length: daysInMonth }, (_, i) => daysInMonth - i)
    .filter(d => new Date(viewYear, viewMonth, d) <= now)
    .map(d => {
      const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const info = dateMap[ds]
      const weekend = isWeekend(d)
      return {
        day: d, dateStr: ds,
        dayName: new Date(viewYear, viewMonth, d).toLocaleDateString('en-IN', { weekday: 'long' }),
        status: weekend ? 'holiday' : (info?.status ?? 'absent'),
        checkIn: info?.checkIn, checkOut: info?.checkOut,
        checkInAddr: info?.checkInAddr, checkOutAddr: info?.checkOutAddr,
      }
    })

  function statusColor(status: string) {
    const found = STAT_TABS.find(t => t.key === status)
    return found?.color ?? '#9A8F82'
  }

  if (loading) return (
    <div className="h-screen bg-[#EFE9DD] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#EFE9DD]">
      <div className="max-w-3xl mx-auto py-4 px-3 lg:py-6 lg:px-6">
        <div className="relative border border-[#B8860B]/35">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#B8860B] pointer-events-none z-10" />

          {/* Hero */}
          <div className="bg-[#1C1712] px-6 py-4 lg:px-8 flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05]" style={{
              backgroundImage: 'linear-gradient(#B8860B 1px, transparent 1px), linear-gradient(90deg, #B8860B 1px, transparent 1px)',
              backgroundSize: '28px 28px'
            }} />
            <div className="relative">
              <Link href="/employee" className="text-white/40 text-[10px] tracking-[1.5px] uppercase flex items-center gap-1.5 mb-2 w-fit hover:text-[#D4A537] transition-colors" style={mono}>
                <ArrowLeft className="w-3 h-3" /> Back
              </Link>
              <h1 className="text-[20px] text-white italic" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>My Attendance</h1>
              <p className="text-[10px] text-white/40 mt-0.5 tracking-wide" style={mono}>ROSTER {ROSTER_START} – {ROSTER_END}</p>
            </div>
          </div>

          {/* Month nav */}
          <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25 px-6 py-2.5 lg:px-8 flex items-center justify-center gap-6">
            <button onClick={goPrevMonth} className="text-[#1C1712] hover:text-[#B8860B]">‹</button>
            <p className="text-[14px] text-[#1C1712] w-28 text-center" style={serif}>{monthName} {viewYear}</p>
            <button onClick={goNextMonth} disabled={isCurrentMonth} className="text-[#1C1712] hover:text-[#B8860B] disabled:opacity-25">›</button>
          </div>

          {/* Horizontal status pills — scrollable, matches Cogent style */}
          <div ref={scrollRef} className="flex gap-2 overflow-x-auto px-6 py-3 lg:px-8 bg-white border-t border-[#B8860B]/25 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {STAT_TABS.map(t => (
              <div key={t.key}
                className="flex-shrink-0 px-3.5 py-1.5 text-[11px] font-medium text-white whitespace-nowrap"
                style={{ background: t.color }}>
                {t.label} ({statCounts[t.key]})
              </div>
            ))}
          </div>

          {/* Today card — punch in/out + roster/working hrs */}
          <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25 px-6 py-4 lg:px-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1C1712] text-[#D4A537] text-[10px] tracking-[1px] uppercase w-fit" style={mono}>
                <CalendarDays className="w-3 h-3" /> Today
              </div>
            </div>
            <div className="bg-white border border-[#E2D9C8] px-4 py-3 flex items-center justify-between">
              <p className="text-[11px] text-[#9A8F82]">
                {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-[12px] text-[#1C1712]" style={mono}>
                  <ArrowUpRight className="w-3 h-3 text-emerald-600" /> {fmtTime(todayRec?.checkIn)}
                </span>
                <span className="flex items-center gap-1 text-[12px] text-[#1C1712]" style={mono}>
                  <ArrowDownLeft className="w-3 h-3 text-rose-500" /> {fmtTime(todayRec?.checkOut)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <p className="text-[10px] text-[#9A8F82]">Roster<br /><span className="text-[#1C1712]" style={serif}>{ROSTER_START} - {ROSTER_END}</span></p>
              <p className="text-[10px] text-[#9A8F82] text-right">Working Hrs<br /><span className="text-[#1C1712]" style={serif}>{calcWorkingHrs(todayRec?.checkIn, todayRec?.checkOut)}</span></p>
            </div>
          </div>

          {/* Day-wise list — Friday-10 style */}
          <div className="bg-white border-t border-[#B8860B]/25">
            {allDays.map((d, idx) => {
              const isOpen = expandedDay === d.dateStr
              const color = statusColor(d.status)
              return (
                <div key={d.dateStr} className={idx > 0 ? 'border-t border-[#F0EAE0]' : ''}>
                  <button onClick={() => setExpandedDay(isOpen ? null : d.dateStr)}
                    className="w-full px-6 lg:px-8 py-3.5 flex items-center justify-between hover:bg-[#FAF7F2] transition-colors">
                    <p className="text-[14px] text-[#1C1712]" style={serif}>{d.dayName}-{d.day}</p>
                    <div className="flex items-center gap-2">
                      {d.status !== 'future' && (
                        <span className="text-[10px] px-2 py-0.5 text-white uppercase tracking-[0.5px]" style={{ background: color, ...mono }}>
                          {d.status.replace('_', ' ')}
                        </span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-[#9A8F82] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-6 lg:px-8 pb-4 bg-[#FAF7F2]">
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                          <p className="text-[9px] tracking-[1px] text-[#9A8F82] uppercase" style={mono}>Punch In / Out</p>
                          <p className="text-[13px] text-[#1C1712] mt-1" style={serif}>{fmtTime(d.checkIn)} – {fmtTime(d.checkOut)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] tracking-[1px] text-[#9A8F82] uppercase" style={mono}>Working Hrs</p>
                          <p className="text-[13px] text-[#1C1712] mt-1" style={serif}>{calcWorkingHrs(d.checkIn, d.checkOut)}</p>
                        </div>
                      </div>
                      {(d.checkInAddr || d.checkOutAddr) && (
                        <div className="mt-3 pt-3 border-t border-[#E2D9C8] space-y-1">
                          {d.checkInAddr && <p className="text-[11px] text-[#9A8F82]">📍 In: {d.checkInAddr}</p>}
                          {d.checkOutAddr && <p className="text-[11px] text-[#9A8F82]">📍 Out: {d.checkOutAddr}</p>}
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
    </div>
  )
}