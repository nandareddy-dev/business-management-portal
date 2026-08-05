'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Clock, Calendar, MapPin, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { RegularizationActions } from '@/components/super-admin/attendance/regularization-actions'

// Row shapes returned by the joined Supabase queries below — replaces `any` casts.
interface AttendanceRow {
  employee_id: string
  attendance_date: string
  status: string | null
  within_geofence: boolean | null
  is_regularized: boolean | null
  employees: { full_name: string } | null
}

interface RegularizationRow {
  id: string
  attendance_date: string
  reason: string
  requested_check_in?: string | null
  requested_check_out?: string | null
  employees: { full_name: string } | null
}

export default async function AttendancePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [{ data: attendance }, { data: regularizations }, { data: employees }] = await Promise.all([
    supabaseAdmin
      .from('attendance')
      .select('employee_id, attendance_date, status, within_geofence, is_regularized, employees(full_name)')
      .gte('attendance_date', monthStart)
      .lte('attendance_date', monthEnd),
    supabaseAdmin
      .from('attendance_regularization_requests')
      .select('*, employees(full_name)')
      .eq('company_id', profile.company_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('employees').select('id, full_name').eq('company_id', profile.company_id),
  ])

  // Aggregate per-employee summary
  type Summary = { name: string; present: number; absent: number; outsideGeofence: number; regularized: number }
  const summaryMap: Record<string, Summary> = {}

  employees?.forEach((e) => {
    summaryMap[e.id] = { name: e.full_name, present: 0, absent: 0, outsideGeofence: 0, regularized: 0 }
  })

  ;(attendance as unknown as AttendanceRow[] | null)?.forEach((row) => {
    const key = row.employee_id
    if (!summaryMap[key]) {
      summaryMap[key] = { name: row.employees?.full_name ?? 'Unknown', present: 0, absent: 0, outsideGeofence: 0, regularized: 0 }
    }
    if (row.status === 'present') summaryMap[key].present++
    if (row.status === 'absent') summaryMap[key].absent++
    if (row.within_geofence === false) summaryMap[key].outsideGeofence++
    if (row.is_regularized) summaryMap[key].regularized++
  })

  const summaryList = Object.values(summaryMap).sort((a, b) => b.present - a.present)
  const totalPresent = summaryList.reduce((s, e) => s + e.present, 0)
  const totalOutside = summaryList.reduce((s, e) => s + e.outsideGeofence, 0)
  const totalRegularized = summaryList.reduce((s, e) => s + e.regularized, 0)
  const pendingCount = regularizations?.length ?? 0

  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="sticky top-0 z-10 border-b border-black/8 bg-[#F5F0E8]/95 backdrop-blur-xl px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Clock size={11} className="text-blue-600" />
              <span className="text-[9px] font-bold tracking-widest uppercase text-blue-700/70">Workforce</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-[#1C1712]">Team Attendance</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-2 rounded-lg bg-white ring-1 ring-black/10 text-xs font-semibold text-black/70 flex items-center gap-2">
              <Calendar size={14} /> {monthLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Present', value: totalPresent, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Outside Geofence', value: totalOutside, icon: MapPin, color: 'text-purple-600' },
            { label: 'Regularized', value: totalRegularized, icon: AlertTriangle, color: 'text-amber-600' },
            { label: 'Pending Requests', value: pendingCount, icon: XCircle, color: 'text-rose-600' },
          ].map((m) => (
            <div key={m.label} className="bg-white ring-1 ring-black/8 rounded-2xl p-4 shadow-sm">
              <m.icon size={16} className={m.color} />
              <p className="text-2xl font-bold text-black/80 mt-2">{m.value}</p>
              <p className="text-[11px] text-black/50 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Pending regularization requests */}
        {pendingCount > 0 && (
          <div className="bg-white ring-1 ring-black/8 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-black/8 flex items-center justify-between">
              <h3 className="text-sm font-bold text-black/80">Pending Regularization Requests</h3>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{pendingCount} pending</span>
            </div>
            <div>
              {(regularizations as unknown as RegularizationRow[]).map((r, idx) => (
                <div key={r.id} className={`px-5 py-4 flex items-start justify-between gap-4 ${idx > 0 ? 'border-t border-black/5' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-black/80">{r.employees?.full_name ?? 'Unknown'}</p>
                      <span className="text-[10px] text-black/40">
                        {new Date(r.attendance_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-black/60">{r.reason}</p>
                    {(r.requested_check_in || r.requested_check_out) && (
                      <p className="text-[11px] text-black/40 mt-1">
                        {r.requested_check_in && `In: ${r.requested_check_in}`}
                        {r.requested_check_in && r.requested_check_out && ' · '}
                        {r.requested_check_out && `Out: ${r.requested_check_out}`}
                      </p>
                    )}
                  </div>
                  <RegularizationActions requestId={r.id} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-employee summary table */}
        <div className="bg-white ring-1 ring-black/8 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/8">
            <h3 className="text-sm font-bold text-black/80">Employee Summary — {monthLabel}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-black/40 border-b border-black/5">
                  <th className="px-5 py-2.5 font-semibold">Employee</th>
                  <th className="px-5 py-2.5 font-semibold text-center">Present</th>
                  <th className="px-5 py-2.5 font-semibold text-center">Outside Geofence</th>
                  <th className="px-5 py-2.5 font-semibold text-center">Regularized</th>
                </tr>
              </thead>
              <tbody>
                {summaryList.map((s, i) => (
                  <tr key={i} className={i > 0 ? 'border-t border-black/5' : ''}>
                    <td className="px-5 py-3 font-medium text-black/80">{s.name}</td>
                    <td className="px-5 py-3 text-center text-emerald-700 font-semibold">{s.present}</td>
                    <td className="px-5 py-3 text-center text-purple-700 font-semibold">{s.outsideGeofence || '—'}</td>
                    <td className="px-5 py-3 text-center text-amber-700 font-semibold">{s.regularized || '—'}</td>
                  </tr>
                ))}
                {!summaryList.length && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-black/40 text-xs">No attendance records this month</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}