'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Fingerprint,
  LogIn,
  LogOut,
  MapPin,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { distanceInMeters } from '@/lib/geofence'

interface Props {
  employeeId: string
  isCheckedIn: boolean
  isCheckedOut: boolean
  attendanceId: string | null
  checkInTimeISO?: string | null
  checkOutTimeISO?: string | null
}

/* -------------------------------------------------------------------------- */
/*  Small presentational pieces                                               */
/* -------------------------------------------------------------------------- */

function StepNode({
  icon: Icon,
  label,
  time,
  done,
  tone,
}: {
  icon: LucideIcon
  label: string
  time: string
  done: boolean
  tone: string
}) {
  return (
    <div className="flex w-20 flex-col items-center text-center">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 transition ${
          done ? tone : 'bg-slate-100 text-slate-400 ring-slate-200'
        }`}
      >
        <Icon size={18} />
      </div>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${done ? 'text-slate-900' : 'text-slate-300'}`}>{time}</p>
    </div>
  )
}

function VerifiedChip({ verified }: { verified: boolean | null }) {
  if (verified === null) return null

  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      <MapPin size={12} /> Location verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <MapPin size={12} /> Unverified
    </span>
  )
}

function messageTone(message: string): 'error' | 'warning' | 'success' {
  const m = message.toLowerCase()
  if (m.includes('fail') || m.includes('error')) return 'error'
  if (m.includes('dooram') || m.includes('ledu') || m.includes('unverified')) return 'warning'
  return 'success'
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function AttendanceMarkButton({
  employeeId, isCheckedIn, isCheckedOut, attendanceId,
  checkInTimeISO, checkOutTimeISO
}: Props) {
  const [loading, setLoading]           = useState(false)
  const [checkedIn, setCheckedIn]       = useState(isCheckedIn)
  const [checkedOut, setCheckedOut]     = useState(isCheckedOut)
  const [checkInTime, setCheckInTime]   = useState<string | null>(checkInTimeISO ?? null)
  const [checkOutTime, setCheckOutTime] = useState<string | null>(checkOutTimeISO ?? null)
  const [attId, setAttId]               = useState<string | null>(attendanceId)
  const [message, setMessage]           = useState<string | null>(null)
  const [currentTime, setCurrentTime]   = useState('')
  const [showRegularize, setShowRegularize] = useState(false)
  const [regularizeReason, setRegularizeReason] = useState('')
  const [checkInVerified, setCheckInVerified] = useState<boolean | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckedIn(isCheckedIn)
    setCheckedOut(isCheckedOut)
    setCheckInTime(checkInTimeISO ?? null)
    setCheckOutTime(checkOutTimeISO ?? null)
    setAttId(attendanceId)
  }, [isCheckedIn, isCheckedOut, checkInTimeISO, checkOutTimeISO, attendanceId])

  useEffect(() => {
    const update = () => setCurrentTime(
      new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    )
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fmtIST = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  function getLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Location not supported on this device')); return }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 })
    })
  }

  const handleCheckIn = async () => {
    if (checkedIn) return
    setLoading(true); setMessage(null)
    try {
      const now   = new Date().toISOString()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

      const { data: existing } = await supabase
        .from('attendance')
        .select('id, check_in, within_geofence')
        .eq('employee_id', employeeId)
        .eq('attendance_date', today)
        .maybeSingle()

      if (existing) {
        setAttId(existing.id)
        setCheckedIn(true)
        setCheckInTime(existing.check_in)
        setCheckInVerified(existing.within_geofence ?? null)
        setMessage('Already checked in')
        setLoading(false)
        return
      }

      const { data: emp } = await supabase
        .from('employees').select('company_id').eq('id', employeeId).single()

      let lat: number | null = null
      let lng: number | null = null
      let withinGeofence: boolean | null = null
      let distance: number | null = null

      try {
        const position = await getLocation()
        lat = position.coords.latitude
        lng = position.coords.longitude

        if (emp?.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('office_lat, office_lng, geofence_radius_meters')
            .eq('id', emp.company_id)
            .single()

          if (company?.office_lat && company?.office_lng) {
            distance = distanceInMeters(lat, lng, company.office_lat, company.office_lng)
            const radius = company.geofence_radius_meters ?? 200
            withinGeofence = distance <= radius

            if (!withinGeofence) {
              setLoading(false)
              setMessage(`Office nunchi ${Math.round(distance)}m dooram unnaru (allowed: ${radius}m). Regularization request pettandi.`)
              setShowRegularize(true)
              return
            }
          }
        }
      } catch {
        setMessage('Location access ledu — check-in ayyindi kani unverified.')
      }

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: employeeId,
          attendance_date: today,
          date: today,
          check_in: now, status: 'present',
          check_in_lat: lat, check_in_lng: lng,
          within_geofence: withinGeofence,
          check_in_distance_meters: distance,
        })
        .select().single()

      if (error) throw error
      setAttId(data.id)
      setCheckedIn(true)
      setCheckInTime(now)
      setCheckInVerified(withinGeofence)
      if (!message) setMessage('Checked in successfully')
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to check in')
    }
    setLoading(false)
  }

  const handleCheckOut = async () => {
    if (checkedOut) return
    setLoading(true); setMessage(null)
    try {
      const now = new Date().toISOString()
      let recordId = attId
      if (!recordId) {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        const { data: existing } = await supabase
          .from('attendance').select('id').eq('employee_id', employeeId).eq('attendance_date', today).maybeSingle()
        if (existing) recordId = existing.id
      }
      if (!recordId) throw new Error('No attendance record found')

      let lat: number | null = null, lng: number | null = null
      try {
        const position = await getLocation()
        lat = position.coords.latitude
        lng = position.coords.longitude
      } catch { /* proceed without location */ }

      const { error } = await supabase
        .from('attendance')
        .update({ check_out: now, check_out_lat: lat, check_out_lng: lng })
        .eq('id', recordId)

      if (error) throw error
      setCheckedOut(true)
      setCheckOutTime(now)
      setMessage('Checked out successfully')
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to check out')
    }
    setLoading(false)
  }

  const submitRegularization = async () => {
    if (!regularizeReason.trim()) return
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { error } = await supabase.from('attendance_regularization_requests').insert({
      employee_id: employeeId,
      attendance_date: today,
      reason: regularizeReason,
    })
    if (!error) {
      setMessage('Regularization request submitted — admin approval kosam wait cheyandi.')
      setShowRegularize(false)
      setRegularizeReason('')
    } else {
      setMessage(error.message)
    }
  }

  /* ------------------------------ Derived view data ------------------------------ */

  const [clock, meridiem] = (currentTime || '--:--').split(' ')

  const workedLabel = (() => {
    if (!checkInTime || !checkOutTime) return null
    const diff = new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()
    if (diff <= 0) return null
    const minutes = Math.floor(diff / 60000)
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
  })()

  const lineFill = checkedOut ? 100 : checkedIn ? 50 : 0
  const tone = message ? messageTone(message) : null

  /* ------------------------------------ View ------------------------------------ */

  return (
    <div className="space-y-5">
      {/* Live clock */}
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">India Standard Time</p>
        <p className="mt-1 flex items-baseline justify-center gap-1.5 tabular-nums">
          <span className="text-5xl font-extrabold tracking-tight text-slate-900">{clock}</span>
          {meridiem && <span className="text-sm font-bold uppercase text-slate-400">{meridiem}</span>}
        </p>
      </div>

      {/* Big punch button / completed state */}
      {checkedIn && checkedOut ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-b from-emerald-50 to-white py-6 ring-1 ring-emerald-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200">
            <CheckCircle2 size={32} />
          </div>
          <p className="text-sm font-bold text-emerald-800">Attendance complete for today</p>
          {workedLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-emerald-100">
              <Clock3 size={13} className="text-emerald-600" /> Worked {workedLabel}
            </span>
          )}
          <VerifiedChip verified={checkInVerified === true ? true : null} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {(() => {
            const isIn = !checkedIn
            const onClick = isIn ? handleCheckIn : handleCheckOut
            const disabled = isIn ? loading || !currentTime : loading

            return (
              <button
                onClick={onClick}
                disabled={disabled}
                aria-label={isIn ? 'Check in' : 'Check out'}
                className="group relative flex h-32 w-32 items-center justify-center disabled:opacity-60"
              >
                {!loading && (
                  <span
                    className={`absolute inset-0 animate-ping rounded-full opacity-30 [animation-duration:2.4s] ${
                      isIn ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                )}
                <span
                  className={`absolute inset-2 rounded-full ring-4 ${
                    isIn ? 'ring-emerald-100' : 'ring-rose-100'
                  }`}
                />
                <span
                  className={`relative flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full text-white shadow-xl transition group-active:scale-95 ${
                    isIn
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-300/60'
                      : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-300/60'
                  }`}
                >
                  {loading ? (
                    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-white border-t-transparent" />
                  ) : (
                    <Fingerprint size={32} />
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {loading ? 'Marking...' : isIn ? 'Check in' : 'Check out'}
                  </span>
                </span>
              </button>
            )
          })()}

          <p className="text-xs text-slate-400">
            {!checkedIn ? 'Tap to mark your attendance' : 'Tap to end your day'}
          </p>
        </div>
      )}

      {/* Check in → Check out track */}
      <div className="flex items-start justify-center gap-1">
        <StepNode
          icon={LogIn}
          label="Check in"
          time={checkedIn && checkInTime ? fmtIST(checkInTime) : '—'}
          done={checkedIn}
          tone="bg-emerald-50 text-emerald-600 ring-emerald-200"
        />

        <div className="mt-5 h-1 max-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-rose-400 transition-all duration-700"
            style={{ width: `${lineFill}%` }}
          />
        </div>

        <StepNode
          icon={LogOut}
          label="Check out"
          time={checkedOut && checkOutTime ? fmtIST(checkOutTime) : '—'}
          done={checkedOut}
          tone="bg-rose-50 text-rose-600 ring-rose-200"
        />
      </div>

      {checkedIn && !checkedOut && checkInVerified !== null && (
        <div className="flex justify-center">
          <VerifiedChip verified={checkInVerified} />
        </div>
      )}

      {/* Status message */}
      {message && tone && (
        <div
          className={`flex items-start gap-2 rounded-2xl px-3.5 py-3 text-sm font-medium ring-1 ${
            tone === 'error'
              ? 'bg-rose-50 text-rose-700 ring-rose-100'
              : tone === 'warning'
                ? 'bg-amber-50 text-amber-800 ring-amber-100'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
          }`}
        >
          {tone === 'error' ? (
            <XCircle size={16} className="mt-0.5 shrink-0" />
          ) : tone === 'warning' ? (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          )}
          <span className="min-w-0 break-words">{message}</span>
        </div>
      )}

      {/* Regularization request */}
      {showRegularize && (
        <div className="space-y-3 rounded-2xl bg-gradient-to-b from-amber-50 to-white p-4 ring-1 ring-amber-200">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <MapPin size={16} />
            </div>
            <p className="text-sm font-bold text-amber-900">Regularization request</p>
          </div>

          <textarea
            value={regularizeReason}
            onChange={e => setRegularizeReason(e.target.value)}
            placeholder="Reason (e.g. client site visit)"
            rows={3}
            className="w-full rounded-xl border border-amber-200 bg-white p-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 sm:text-sm"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setShowRegularize(false)}
              className="flex-1 rounded-xl border border-amber-200 bg-white py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"
            >
              Cancel
            </button>
            <button
              onClick={submitRegularization}
              disabled={!regularizeReason.trim()}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200 transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:shadow-none"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}