'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, CheckCircle2, XCircle, Clock,
  Navigation, MessageCircle, Copy, Check, ExternalLink,
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

  const mono = { fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }
  const serif = { fontFamily: 'Georgia, serif' }

  return (
    <div className="min-h-screen bg-[#EFE9DD]">
      <div className="max-w-3xl mx-auto py-4 px-3 lg:py-6 lg:px-6">

        <div className="relative border border-[#B8860B]/35">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#B8860B] pointer-events-none z-10" />

          {/* Hero */}
          <div className="bg-[#1C1712] px-6 py-5 lg:px-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05]" style={{
              backgroundImage: 'linear-gradient(#B8860B 1px, transparent 1px), linear-gradient(90deg, #B8860B 1px, transparent 1px)',
              backgroundSize: '28px 28px'
            }} />
            <div className="relative">
              <Link href="/employee/menu" className="text-white/40 text-[10px] tracking-[1.5px] uppercase flex items-center gap-1.5 mb-3 w-fit hover:text-[#D4A537] transition-colors" style={mono}>
                <ArrowLeft className="w-3 h-3" /> Back to menu
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#B8860B]/40 flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-4 h-4 text-[#D4A537]" />
                </div>
                <div>
                  <h1 className="text-[24px] text-white italic" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>Share Location</h1>
                  <p className="text-[11px] text-white/40 mt-0.5 tracking-wide" style={mono}>LIVE SITE-VISIT TRACKING</p>
                </div>
              </div>
            </div>
          </div>

          {/* §1 — New visit form */}
          <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25 px-6 py-5 lg:px-8">
            <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold mb-4 uppercase" style={mono}>§1 — New Site Visit</p>

            <label className="text-[10px] tracking-[1px] text-[#8B6914] font-medium uppercase mb-1.5 block" style={mono}>Client / Site Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. SUVE — Kukatpally site visit"
              className="w-full bg-white border border-[#E2D9C8] rounded-xl px-4 py-3 text-sm text-[#1C1712] outline-none focus:border-[#B8860B] transition-colors shadow-sm mb-4"
            />

            <label className="text-[10px] tracking-[1px] text-[#8B6914] font-medium uppercase mb-1.5 block" style={mono}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Purpose of visit, meeting notes, etc."
              rows={2}
              className="w-full bg-white border border-[#E2D9C8] rounded-xl px-4 py-3 text-sm text-[#1C1712] outline-none focus:border-[#B8860B] transition-colors shadow-sm mb-4"
            />

            <button
              onClick={handleShare}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-[#1C1712] hover:bg-[#2d2822] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Getting your location...</>
                : <><MapPin className="w-4 h-4 text-[#D4A537]" /> Share Current Location</>}
            </button>

            {message && (
              <p className={`text-xs mt-3 flex items-center gap-1.5 ${message.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {message.type === 'error'
                  ? <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  : <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                {message.text}
              </p>
            )}
          </div>

          {/* §2 — Live map preview after capture */}
          {captured && (
            <div className="bg-white border-t border-[#B8860B]/25 px-6 py-5 lg:px-8">
              <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold mb-4 uppercase" style={mono}>§2 — Captured Location</p>

              <div className="rounded-xl overflow-hidden border border-[#E2D9C8] mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={staticMapUrl(captured.lat, captured.lng)}
                  alt="Map preview of captured location"
                  className="w-full h-[220px] object-cover bg-[#F0EAE0]"
                />
              </div>

              {captured.address && (
                <p className="text-[12px] text-[#7A6E60] mb-3 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#B8860B] flex-shrink-0 mt-0.5" />
                  {captured.address}
                </p>
              )}
              <p className="text-[10px] text-[#B8B0A0] mb-4" style={mono}>
                {captured.lat.toFixed(6)}, {captured.lng.toFixed(6)}
              </p>

              <div className="grid grid-cols-3 gap-2">
                <a
                  href={googleMapsUrl(captured.lat, captured.lng)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border border-[#E2D9C8] hover:bg-[#FAF7F2] transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-[#1C1712]" />
                  <span className="text-[10px] font-medium text-[#7A6E60]">Open Map</span>
                </a>
                <a
                  href={whatsappShareUrl(captured.lat, captured.lng, clientName)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border border-[#E2D9C8] hover:bg-[#FAF7F2] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-medium text-[#7A6E60]">WhatsApp</span>
                </a>
                <button
                  onClick={() => handleCopy(captured.lat, captured.lng)}
                  className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border border-[#E2D9C8] hover:bg-[#FAF7F2] transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#1C1712]" />}
                  <span className="text-[10px] font-medium text-[#7A6E60]">{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* §3 — Recent visits */}
          <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25">
            <div className="flex items-center justify-between px-6 lg:px-8 pt-4 pb-1.5">
              <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold uppercase flex items-center gap-1.5" style={mono}>
                <Clock className="w-3 h-3" /> §3 — Recent Visits
              </p>
              <p className="text-[10px] text-[#9A8F82]">{recentVisits.length} logged</p>
            </div>

            {recentVisits.length === 0 ? (
              <div className="py-10 text-center px-6">
                <p className="text-[#9A8F82] text-sm">No site visits shared yet.</p>
                <p className="text-[#B8B0A0] text-xs mt-1">Your captured visits will appear here</p>
              </div>
            ) : (
              <div>
                {recentVisits.map((v, i) => (
                  <div key={v.id} className={`px-6 lg:px-8 py-3.5 flex items-start justify-between gap-3 ${i > 0 ? 'border-t border-[#F0EAE0]' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-[#1C1712]" style={serif}>{v.client_name}</p>
                      {v.address && (
                        <p className="text-[11px] text-[#9A8F82] mt-0.5 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" /> {v.address}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-[#9A8F82]">{fmtTime(v.created_at)}</span>
                      {v.latitude != null && v.longitude != null && (
                        <a
                          href={googleMapsUrl(v.latitude, v.longitude)}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[#B8860B] hover:text-[#8B6914]"
                          title="Open in Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
      <div className="h-20" />
    </div>
  )
}