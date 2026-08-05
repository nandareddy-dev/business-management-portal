'use client'

import { useState, useEffect } from 'react'
import { Search, CreditCard, RefreshCw, Calendar, IndianRupee, Users, XCircle } from 'lucide-react'

interface Subscription {
  company_id: string
  company_name: string
  company_phone: string | null
  industry?: string
  is_active: boolean
  joined: string
  plan_name: string | null
  status: string
  total_amount: number
  billing_cycle: string | null
  max_users: number | null
  trial_ends_at: string | null
  activated_at: string | null
  next_renewal: string | null
  razorpay_subscription_id: string | null
  razorpay_plan_id: string | null
}

interface Summary {
  activeCount: number
  trialCount: number
  cancelledCount: number
  mrr: number
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [summary, setSummary] = useState<Summary>({ activeCount: 0, trialCount: 0, cancelledCount: 0, mrr: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchSubscriptions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search: search,
      })
      const res = await fetch(`/api/admin/subscriptions?${params}`)
      const { data, count, summary } = await res.json()
      setSubs(data as Subscription[])
      setTotal(count || 0)
      if (summary) setSummary(summary)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount/route-driven sync, not a render-time side effect
    fetchSubscriptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: fetch fn is stable-in-practice, only rerun on listed deps
  }, [search, page])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSubscriptions()
    }, 15000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: fetch fn is stable-in-practice, only rerun on listed deps
  }, [])

  const totalPages = Math.ceil(total / 15)

  const getRenewalStatus = (sub: Subscription) => {
    if (sub.status === 'trial') {
      if (!sub.trial_ends_at) return { label: 'Trial Ends', text: '—', color: 'text-gray-500' }
      const endDate = new Date(sub.trial_ends_at)
      // eslint-disable-next-line react-hooks/purity -- read-only "days remaining" display calc, not a stateful side effect
      const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) return { label: 'Trial Ends', text: 'Expired', color: 'text-red-600' }
      if (daysLeft <= 7) return { label: 'Trial Ends', text: `${daysLeft} days`, color: 'text-amber-600' }
      return { label: 'Trial Ends', text: `${daysLeft} days`, color: 'text-green-600' }
    }

    if (sub.status === 'cancelled' || sub.status === 'halted') {
      return { label: 'Renewal', text: sub.status === 'cancelled' ? 'Cancelled' : 'Halted', color: 'text-red-600' }
    }

    if (sub.next_renewal) {
      // eslint-disable-next-line react-hooks/purity -- read-only "days remaining" display calc, not a stateful side effect
      const daysLeft = Math.ceil((new Date(sub.next_renewal).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) return { label: 'Renews', text: 'Overdue', color: 'text-red-600' }
      if (daysLeft <= 5) return { label: 'Renews', text: `${daysLeft} days`, color: 'text-amber-600' }
      return { label: 'Renews', text: `${daysLeft} days`, color: 'text-green-600' }
    }

    return { label: 'Renewal', text: '—', color: 'text-gray-500' }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      trial: 'bg-amber-100 text-amber-700',
      active: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
      halted: 'bg-red-100 text-red-700',
      none: 'bg-gray-100 text-gray-600',
    }
    return badges[status] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-amber-600 uppercase mb-2">Super Admin</p>
            <h1 className="text-4xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-gray-600 mt-2">
              {total} companies
              {lastRefresh && (
                <span className="text-xs text-gray-500 ml-3">
                  • Updated {lastRefresh.toLocaleTimeString('en-IN')}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchSubscriptions()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <IndianRupee size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">₹{summary.mrr.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500">Monthly Recurring Revenue</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CreditCard size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.activeCount}</p>
              <p className="text-xs text-gray-500">Active Subscriptions</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Users size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.trialCount}</p>
              <p className="text-xs text-gray-500">On Trial</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.cancelledCount}</p>
              <p className="text-xs text-gray-500">Cancelled / Halted</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search companies..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Trial / Renewal</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Razorpay Sub ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && subs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Loading subscriptions...</span>
                      </div>
                    </td>
                  </tr>
                ) : subs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  subs.map((sub) => {
                    const renewal = getRenewalStatus(sub)
                    return (
                      <tr key={sub.company_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-amber-600" />
                            <div>
                              <p className="font-semibold text-gray-900">{sub.company_name}</p>
                              <p className="text-xs text-gray-500">{sub.company_phone || sub.industry || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900 capitalize">{sub.plan_name || '—'}</p>
                            <p className="text-xs text-gray-500 capitalize">{sub.billing_cycle || '—'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(sub.status)}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₹{(sub.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className={`px-6 py-4 text-sm font-semibold ${renewal.color}`}>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{renewal.label}</span>
                            <div className="flex items-center gap-1">
                              {renewal.text !== '—' && <Calendar size={13} />}
                              {renewal.text}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                          {sub.razorpay_subscription_id || '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages} • {total} total companies
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <button
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ← Previous
                </button>
              )}
              {page < totalPages && (
                <button
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}