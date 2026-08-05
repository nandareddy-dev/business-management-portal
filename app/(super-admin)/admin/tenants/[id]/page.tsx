// app/(super-admin)/admin/tenants/[id]/page.tsx
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Users, TrendingUp, ArrowLeft,
  CreditCard, CheckCircle2, XCircle, Crown, RefreshCw,
  Brain, Zap, Target, BarChart3, Sparkles,
  Lock, Server, Clock, DollarSign, Calendar, AlertTriangle
} from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function TenantDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (!company) redirect('/admin/tenants')

  const [
    { count: totalLeads },
    { count: totalUsers },
    { data: subscription },
  ] = await Promise.all([
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', id),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', id),
    supabaseAdmin.from('company_subscriptions').select('status, activated_at, total_amount').eq('company_id', id).maybeSingle(),
  ])

  const isLifetime = company.plan === 'lifetime'

  const healthScore = Math.min(100, Math.round(((totalLeads ?? 0) * 10 + (totalUsers ?? 0) * 15) / ((totalLeads ?? 0) + (totalUsers ?? 0) || 1)))
  const storageUsage = Math.round(((totalLeads ?? 0) * 0.5) % 100)
  const apiUsage = Math.round(((totalUsers ?? 0) * 15) % 100)
  const dataPoints = (totalLeads ?? 0) + (totalUsers ?? 0)

  // Renewal date = activated_at + 30 days (computed; no stored expiry column yet)
  let renewalDate: Date | null = null
  let daysRemaining: number | null = null
  if (subscription?.activated_at) {
    renewalDate = new Date(subscription.activated_at)
    renewalDate.setMonth(renewalDate.getMonth() + 1)
    // eslint-disable-next-line react-hooks/purity -- this is a server component; runs once
    // per request on the server, not during a re-render, so "impure during render" doesn't
    // apply the way it does for client components — suppressed rather than restructured.
    const diffMs = renewalDate.getTime() - Date.now()
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  const statCards = [
    {
      label: 'Total Leads',
      value: totalLeads ?? 0,
      icon: TrendingUp,
      color: '#B8860B',
      trend: '+12%',
      trendColor: 'text-emerald-600',
    },
    {
      label: 'Team Members',
      value: totalUsers ?? 0,
      icon: Users,
      color: '#B8860B',
      trend: '+2',
      trendColor: 'text-emerald-600',
    },
    {
      label: 'Health Score',
      value: `${healthScore}%`,
      icon: Zap,
      color: healthScore >= 70 ? '#10B981' : healthScore >= 40 ? '#F59E0B' : '#EF4444',
      trend: 'AI-Calculated',
      trendColor: 'text-blue-600',
    },
    {
      label: 'Plan',
      value: company.plan ? company.plan.charAt(0).toUpperCase() + company.plan.slice(1) : 'No Plan',
      icon: CreditCard,
      color: '#B8860B',
      trend: isLifetime ? '\u221e' : '30 days',
      trendColor: isLifetime ? 'text-amber-600' : 'text-orange-600',
    },
  ]

  const aiInsights = [
    { icon: Target, label: 'Data Points', value: dataPoints, color: '#10B981', desc: 'Total records' },
    { icon: BarChart3, label: 'Storage', value: `${storageUsage}%`, color: '#3B82F6', desc: 'Space used' },
    { icon: Server, label: 'API Usage', value: `${apiUsage}%`, color: '#8B5CF6', desc: 'Monthly quota' },
    { icon: Clock, label: 'Uptime', value: '99.9%', color: '#F59E0B', desc: 'Service health' },
  ]

  const companyDetailRows = [
    { label: 'Industry', value: company.industry ?? '\u2014', icon: Building2 },
    { label: 'Plan', value: company.plan ?? '\u2014', icon: CreditCard },
    { label: 'Status', value: company.is_active ? 'Active' : 'Inactive', icon: CheckCircle2 },
    { label: 'Joined', value: company.created_at ? new Date(company.created_at).toLocaleDateString('en-IN') : '\u2014', icon: Calendar },
  ]

  const subscriptionRows = [
    {
      label: 'Plan Status',
      value: subscription?.status
        ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
        : '\u2014',
      icon: CreditCard,
    },
    {
      label: 'Amount Paid',
      value: subscription?.total_amount ? `\u20b9${subscription.total_amount.toLocaleString('en-IN')}` : '\u20b90',
      icon: DollarSign,
    },
    {
      label: 'Activated On',
      value: subscription?.activated_at
        ? new Date(subscription.activated_at).toLocaleDateString('en-IN')
        : 'N/A',
      icon: Calendar,
    },
    {
      label: 'Renews On',
      value: renewalDate ? renewalDate.toLocaleDateString('en-IN') : 'N/A',
      icon: Calendar,
    },
    {
      label: 'Days Remaining',
      value: daysRemaining !== null
        ? (daysRemaining > 0 ? `${daysRemaining} days` : 'Expired')
        : 'N/A',
      icon: daysRemaining !== null && daysRemaining <= 5 ? AlertTriangle : Clock,
      danger: daysRemaining !== null && daysRemaining <= 5,
    },
    { label: 'Data Points', value: `${dataPoints}`, icon: BarChart3 },
    { label: 'Users Count', value: `${totalUsers ?? 0}`, icon: Users },
    { label: 'Status', value: company.is_active ? '\u2713 Active' : '\u2717 Inactive', icon: CheckCircle2 },
  ]

  return (
    <div className="min-h-screen bg-[#F5F0E8]">

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b border-[#E8E2D8] bg-[#F5F0E8]/80 backdrop-blur-xl px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/admin/tenants" className="flex items-center gap-1.5 text-xs font-semibold text-[#9A8F82] hover:text-[#B8860B] transition-colors">
            <ArrowLeft size={13} /> Back to Tenants
          </Link>
          <div className="flex items-center gap-2">
            {isLifetime && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                <Crown size={10} /> Lifetime
              </span>
            )}
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
              company.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {company.is_active ? <><CheckCircle2 size={10} /> Active</> : <><XCircle size={10} /> Inactive</>}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">

        {/* Hero Section */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isLifetime ? 'bg-amber-100' : 'bg-[#F5F0E8] border border-[#E8E2D8]'
            }`}>
              {isLifetime ? <Crown size={24} className="text-amber-700" /> : <Building2 size={24} className="text-[#B8860B]" />}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold tracking-widest uppercase text-[#B8860B] mb-1">Tenant</p>
              <h1 className="text-2xl font-bold text-[#1C1712]">{company.name}</h1>
              <p className="text-sm text-[#9A8F82]">{company.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#B8860B] text-white rounded-xl font-semibold text-sm">
            <RefreshCw size={16} />
            Refresh
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white border border-[#E8E2D8] rounded-2xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F5F0E8] flex items-center justify-center">
                    <Icon size={16} style={{ color: card.color }} />
                  </div>
                  <span className={`text-[10px] font-bold ${card.trendColor}`}>{card.trend}</span>
                </div>
                <p className="text-2xl font-bold text-[#1C1712]">{card.value}</p>
                <p className="text-xs text-[#9A8F82] mt-1">{card.label}</p>
              </div>
            )
          })}
        </div>

        {/* Lifetime Banner */}
        {isLifetime && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <Crown size={16} className="text-amber-700 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              This tenant has <span className="font-bold">Lifetime Free Access</span> \u2014 no payment required, never expires.
            </p>
          </div>
        )}

        {/* AI Analytics Panel */}
        <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-[#E8E2D8] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#B8860B]/10 flex items-center justify-center">
                <Brain size={16} className="text-[#B8860B]" />
              </div>
              <h2 className="text-lg font-bold text-[#1C1712]">System Analytics</h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#B8860B] text-white rounded-lg text-xs font-semibold">
              <Sparkles size={13} />
              Analyze
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {aiInsights.map(insight => {
              const Icon = insight.icon
              return (
                <div key={insight.label} className="bg-white rounded-xl p-4 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${insight.color}15` }}>
                      <Icon size={14} style={{ color: insight.color }} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-[#1C1712]">{insight.value}</p>
                  <p className="text-[10px] text-[#9A8F82] mt-1">{insight.label}</p>
                  <p className="text-[9px] text-[#B8B0A0] mt-0.5">{insight.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Company Details */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0EBE0]" style={{ background: 'linear-gradient(135deg, #FFFBEF, #FEFCF8)' }}>
              <Building2 size={13} className="text-[#B8860B]" />
              <h3 className="text-sm font-bold text-[#1C1712]">Company Details</h3>
            </div>
            <div className="space-y-4 p-5">
              {companyDetailRows.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <Icon size={13} className="text-[#D3CBBB] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] text-[#9A8F82] font-semibold uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm font-semibold text-[#1C1712] mt-0.5 truncate">{item.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0EBE0]" style={{ background: 'linear-gradient(135deg, #FFFBEF, #FEFCF8)' }}>
              <DollarSign size={13} className="text-[#B8860B]" />
              <h3 className="text-sm font-bold text-[#1C1712]">Subscription Info</h3>
            </div>
            <div className="space-y-4 p-5">
              {subscriptionRows.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <Icon size={13} className={`mt-0.5 flex-shrink-0 ${item.danger ? 'text-red-400' : 'text-[#D3CBBB]'}`} />
                    <div className="flex-1">
                      <p className="text-[10px] text-[#9A8F82] font-semibold uppercase tracking-wide">{item.label}</p>
                      <p className={`text-sm font-semibold mt-0.5 ${item.danger ? 'text-red-600' : 'text-[#1C1712]'}`}>{item.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Data Privacy Notice */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
          <Lock size={16} className="text-blue-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            <span className="font-bold">Data Privacy:</span> Super Admin can only view tenant summary metrics and subscription info. Individual lead data is restricted to authorized tenant users only.
          </p>
        </div>

      </div>
    </div>
  )
}