'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { MapPin, CheckCircle2, XCircle } from 'lucide-react'
import { distanceInMeters } from '@/lib/geofence'

interface Props {
  employeeId: string
  isCheckedIn: boolean
  isCheckedOut: boolean
  attendanceId: string | null
  checkInTimeISO?: string | null
  checkOutTimeISO?: string | null
}

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

  if (checkedIn && checkedOut) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-500">Check in: {checkInTime ? fmtIST(checkInTime) : '—'}</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs text-gray-500">Check out: {checkOutTime ? fmtIST(checkOutTime) : '—'}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">Attendance complete for today</p>
          {checkInVerified === true && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
              <MapPin size={10} /> Verified
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${checkedIn ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          <span className="text-xs text-gray-500">Check in: {checkedIn && checkInTime ? fmtIST(checkInTime) : '—'}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${checkedOut ? 'bg-rose-500' : 'bg-gray-200'}`} />
          <span className="text-xs text-gray-500">Check out: {checkedOut && checkOutTime ? fmtIST(checkOutTime) : '—'}</span>
        </div>
      </div>

      {!checkedIn && (
        <button onClick={handleCheckIn} disabled={loading || !currentTime}
          className="w-full py-3.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Marking...</>
            : <>Check in — {currentTime}</>}
        </button>
      )}

      {checkedIn && (
        <div className="py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5 bg-emerald-50">
          <p className="text-xs font-medium text-emerald-700">Checked in at {checkInTime ? fmtIST(checkInTime) : '—'}</p>
          {checkInVerified === true && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
              <MapPin size={10} /> Verified
            </span>
          )}
          {checkInVerified === false && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              <MapPin size={10} /> Unverified
            </span>
          )}
        </div>
      )}

      {checkedIn && !checkedOut && (
        <button onClick={handleCheckOut} disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Marking...</>
            : <>Check out — {currentTime}</>}
        </button>
      )}

      {message && (
        <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
          {message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
            ? <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            : null}
          {message}
        </p>
      )}

      {showRegularize && (
        <div className="mt-1 p-3 rounded-xl bg-amber-50 space-y-2">
          <p className="text-xs font-medium text-amber-800">Regularization request</p>
          <textarea value={regularizeReason} onChange={e => setRegularizeReason(e.target.value)}
            placeholder="Reason (e.g. client site visit)" rows={2}
            className="w-full border border-amber-200 rounded-lg p-2 text-xs bg-white" />
          <div className="flex gap-2">
            <button onClick={() => setShowRegularize(false)} className="flex-1 py-2 text-xs border border-amber-200 rounded-lg text-amber-700">Cancel</button>
            <button onClick={submitRegularization} disabled={!regularizeReason.trim()}
              className="flex-1 py-2 text-xs bg-amber-600 text-white rounded-lg disabled:opacity-50">Submit</button>
          </div>
        </div>
      )}
    </div>
  )
}