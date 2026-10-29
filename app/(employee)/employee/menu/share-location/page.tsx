'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, CheckCircle2, XCircle, Clock,
  Navigation, MessageCircle, Copy, Check, ExternalLink, Building2, StickyNote, Crosshair,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface RecentVisit {
  id: string
  client_name: string
  address: string | null
  latitude?: number | null
  longitude?: number | null
  created_at: string
}

interface CapturedLocation {
  lat: number
  lng: number
  address: string | null
}

// GeolocationPositionError is a distinct Web API type — it does NOT extend
// Error, so `e instanceof Error` silently fails for it. This maps the real
// permission/timeout/unavailable reasons instead of a generic fallback.
function getLocationErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as GeolocationPositionError).code
    if (code === 1) return 'Location permission denied. Please enable location access in your browser/app settings.'
    if (code === 2) return 'Location unavailable. Please check your GPS/network and try again.'
    if (code === 3) return 'Location request timed out. Please try again.'
  }
  if (e instanceof Error) return e.message
  return 'Failed to share location'
}

function staticMapUrl(lat: number, lng: number, zoom = 15) {
  // Public OpenStreetMap static tile renderer — no API key required.
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=640x260&maptype=mapnik&markers=${lat},${lng},red-pushpin`
}
function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 sm:text-sm'

export default function ShareLocationPage() {
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([])
  const [captured, setCaptured] = useState<CapturedLocation | null>(null)
  const [copied, setCopied] = useState(false)

  const loadRecent = useCallback(async (empId: string) => {
    const { data } = await supabase
      .from('site_visits')
      .select('id, client_name, address, latitude, longitude, created_at')
      .eq('employee_id', empId)
      .order('created_at', { ascending: false })
      .limit(5)
    setRecentVisits(data ?? [])
  }, [supabase])

  const loadEmployeeAndRecent = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: emp } = await supabase.from('employees').select('id').eq('email', user.email!).single()
    if (!emp) return
    setEmployeeId(emp.id)
    loadRecent(emp.id)
  }, [supabase, loadRecent])

  useEffect(() => {
    loadEmployeeAndRecent()
  }, [loadEmployeeAndRecent])

  function getLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Location not supported on this device')); return }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 })
    })
  }

  const handleShare = async () => {
    if (!clientName.trim()) {
      setMessage({ type: 'error', text: 'Enter the client or site name' })
      return
    }
    setLoading(true)
    setMessage(null)
    setCaptured(null)
    setCopied(false)
    try {
      let empId = employeeId
      if (!empId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not logged in')
        const { data: emp } = await supabase.from('employees').select('id').eq('email', user.email!).single()
        if (!emp) throw new Error('Employee profile not found')
        empId = emp.id
        setEmployeeId(emp.id)
      }

      const position = await getLocation()
      const lat = position.coords.latitude
      const lng = position.coords.longitude

      let address: string | null = null
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        const geo = await res.json()
        address = geo?.display_name ?? null
      } catch { /* address lookup optional */ }

      const { error } = await supabase.from('site_visits').insert({
        employee_id: empId,
        client_name: clientName.trim(),
        notes: notes.trim() || null,
        latitude: lat,
        longitude: lng,
        address,
      })
      if (error) throw error

      setCaptured({ lat, lng, address })
      setMessage({ type: 'success', text: 'Location shared successfully' })
      setClientName('')
      setNotes('')
      loadRecent(empId)
    } catch (e: unknown) {
      setMessage({ type: 'error', text: getLocationErrorMessage(e) })
    }
    setLoading(false)
  }

  const handleCopy = async (lat: number, lng: number) => {
    try {
      await navigator.clipboard.writeText(googleMapsUrl(lat, lng))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable, ignore */ }
  }

  const whatsappShareUrl = (lat: number, lng: number, name: string) => {
    const text = `📍 Sharing my location${name ? ` — ${name}` : ''}: ${googleMapsUrl(lat, lng)}`
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-5 pb-28 lg:px-6 lg:py-6">

        {/* ── HERO ── */}
        <section className="relative isolate mb-5 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-7">
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

          <Link
            href="/employee/menu"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 ring-1 ring-white/15 transition hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to menu
          </Link>

          <div className="mt-5 flex items-center gap-3.5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur">
              <Navigation className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Employee Portal</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Share Location</h1>
              <p className="text-sm text-slate-300">Live site-visit tracking</p>
            </div>
          </div>
        </section>

        {/* ── NEW SITE VISIT ── */}
        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Crosshair className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">New site visit</h2>
              <p className="text-xs text-slate-500">Capture where you are right now</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Client / Site name</label>
              <div className="relative">
                <Building2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. SUVE — Kukatpally site visit"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Notes (optional)</label>
              <div className="relative">
                <StickyNote size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Purpose of visit, meeting notes, etc."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            <button
              onClick={handleShare}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 disabled:shadow-none"
            >
              {loading
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Getting your location...</>
                : <><MapPin className="h-4 w-4" /> Share Current Location</>}
            </button>

            {message && (
              <div
                className={`flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm font-medium ring-1 ${
                  message.type === 'error'
                    ? 'bg-rose-50 text-rose-700 ring-rose-100'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                }`}
              >
                {message.type === 'error'
                  ? <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  : <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                <span className="min-w-0 break-words">{message.text}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── CAPTURED LOCATION ── */}
        {captured && (
          <section className="mb-5 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staticMapUrl(captured.lat, captured.lng)}
                alt="Map preview of captured location"
                className="h-[220px] w-full bg-slate-100 object-cover"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg">
                <CheckCircle2 className="h-3.5 w-3.5" /> Captured
              </span>
              <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/80 px-3 py-1 font-mono text-[11px] text-white backdrop-blur">
                {captured.lat.toFixed(6)}, {captured.lng.toFixed(6)}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {captured.address && (
                <p className="mb-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm leading-snug text-slate-600 ring-1 ring-slate-100">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                  <span className="min-w-0 break-words">{captured.address}</span>
                </p>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <a
                  href={googleMapsUrl(captured.lat, captured.lng)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 py-3.5 ring-1 ring-indigo-100 transition hover:bg-indigo-100"
                >
                  <ExternalLink className="h-5 w-5 text-indigo-600" />
                  <span className="text-[11px] font-semibold text-indigo-700">Open Map</span>
                </a>
                <a
                  href={whatsappShareUrl(captured.lat, captured.lng, clientName)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 py-3.5 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
                >
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-[11px] font-semibold text-emerald-700">WhatsApp</span>
                </a>
                <button
                  onClick={() => handleCopy(captured.lat, captured.lng)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-50 py-3.5 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-slate-700" />}
                  <span className="text-[11px] font-semibold text-slate-600">{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── RECENT VISITS ── */}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Clock className="h-[18px] w-[18px]" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">Recent visits</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
              {recentVisits.length} logged
            </span>
          </div>

          {recentVisits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <MapPin className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-900">No site visits shared yet.</p>
              <p className="mt-1 text-sm text-slate-500">Your captured visits will appear here</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {recentVisits.map((v) => (
                <li
                  key={v.id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-200">
                    <MapPin className="h-[18px] w-[18px]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{v.client_name}</p>
                    {v.address && (
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">{v.address}</p>
                    )}
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                      <Clock className="h-3 w-3" /> {fmtTime(v.created_at)}
                    </p>
                  </div>

                  {v.latitude != null && v.longitude != null && (
                    <a
                      href={googleMapsUrl(v.latitude, v.longitude)}
                      target="_blank" rel="noopener noreferrer"
                      title="Open in Google Maps"
                      aria-label={`Open ${v.client_name} in Google Maps`}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 ring-1 ring-slate-200 transition hover:bg-indigo-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  )
}