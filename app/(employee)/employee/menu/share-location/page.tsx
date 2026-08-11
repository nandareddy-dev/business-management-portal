'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface RecentVisit {
  id: string
  client_name: string
  address: string | null
  created_at: string
}

export default function ShareLocationPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [clientName, setClientName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([])

  const loadRecent = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: emp } = await supabase.from('employees').select('id').eq('email', user.email!).single()
    if (!emp) return
    const { data } = await supabase
      .from('site_visits')
      .select('id, client_name, address, created_at')
      .eq('employee_id', emp.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setRecentVisits(data ?? [])
  }

  useEffect(() => {
    loadRecent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { data: emp } = await supabase.from('employees').select('id').eq('email', user.email!).single()
      if (!emp) throw new Error('Employee profile not found')

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
        employee_id: emp.id,
        client_name: clientName.trim(),
        notes: notes.trim() || null,
        latitude: lat,
        longitude: lng,
        address,
      })
      if (error) throw error

      setMessage({ type: 'success', text: 'Location shared successfully' })
      setClientName('')
      setNotes('')
      loadRecent()
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to share location' })
    }
    setLoading(false)
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-4 px-4">

        <Link href="/employee/menu" className="text-gray-400 text-xs flex items-center gap-1.5 mb-3 w-fit hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to menu
        </Link>
        <h1 className="text-xl font-medium text-gray-900">Share location</h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-5">Let your team know where you are during a site visit</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <label className="text-xs text-gray-500 mb-1 block">Client / site name</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. SUVE — Kukatpally site visit"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 mb-3"
          />
          <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Purpose of visit, meeting notes, etc."
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 mb-3"
          />

          <button
            onClick={handleShare}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Getting location...</>
              : <><MapPin className="w-4 h-4" /> Share current location</>}
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

        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-500">Recent visits</p>
        </div>

        {recentVisits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-sm text-gray-400">No site visits shared yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {recentVisits.map((v, i) => (
              <div key={v.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{v.client_name}</p>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{fmtTime(v.created_at)}</span>
                </div>
                {v.address && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {v.address}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="h-20" />
    </div>
  )
}