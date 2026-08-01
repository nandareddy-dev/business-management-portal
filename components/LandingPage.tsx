'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, TrendingUp, CheckCircle2, Clock3 } from 'lucide-react'
import GKCRMPricing from "@/app/pricing/page"
import GKFooter from "@/components/GKFooter"
import GKHeader from "@/components/GKHeader"

// ── DATA ──────────────────────────────────────────────────────────────────

const industries = [
  { id: 'interior-design', name: 'Interior Design', icon: '🛋️', color: 'from-purple-500 to-violet-700', desc: 'Lead pipeline, projects, designs & materials tracking', comingSoon: false },
  { id: 'real-estate',     name: 'Real Estate',     icon: '🏠', color: 'from-blue-500 to-cyan-700',    desc: 'Property leads, site visits & deal management',    comingSoon: true },
  { id: 'hospital',        name: 'Hospital',         icon: '🏥', color: 'from-red-500 to-rose-700',     desc: 'Patients, doctors, appointments & billing',          comingSoon: true },
  { id: 'b2b-business',    name: 'B2B Business',     icon: '🤝', color: 'from-amber-500 to-orange-700', desc: 'Clients, deals, invoices & pipeline management',     comingSoon: true },
  { id: 'clinics',         name: 'Clinics',          icon: '🩺', color: 'from-emerald-500 to-teal-700', desc: 'Patients, prescriptions, doctors & billing',         comingSoon: true },
]

const features = [
  { icon: '🎯', title: 'Smart Lead Pipeline',   desc: 'New → Called → Follow Up → Site Visit → Quotation → Won. Every stage tracked with full team visibility.', tag: 'Core' },
  { icon: '📞', title: 'One-Click Calling',      desc: 'Call any lead directly from CRM. Log call notes and update stage right from the popup.',                   tag: 'Productivity' },
  { icon: '⚡', title: 'Real-time Updates',      desc: 'Supabase Realtime — lead additions, stage changes and team activity sync instantly across devices.',        tag: 'Live' },
  { icon: '👑', title: 'Role-Based Access',      desc: 'Admin sees all leads. CRE sees only their pipeline. Zero data leaks, zero confusion.',                      tag: 'Security' },
  { icon: '📅', title: 'Attendance & HRMS',      desc: 'Clock-in/out, leave requests, salary slips and team performance — unified HR in one module.',               tag: 'HR' },
  { icon: '💳', title: 'Billing & Invoices',     desc: 'GST invoices, Razorpay payment links, partial payments. Track paid, partial and overdue in real-time.',     tag: 'Finance' },
  { icon: '🏗️', title: 'Project Management',    desc: 'Budgets, timelines, site photos, material tracker. From won lead to delivered project.',                     tag: 'Projects' },
  { icon: '📊', title: 'Analytics & Reports',    desc: 'Win rates, revenue, pipeline health, team leaderboard. Make decisions with real data, not guesses.',         tag: 'Analytics' },
]

const aiIntegrations = {
  inputs: [
    { icon: '📘', name: 'Meta Ads',   color: '#1877F2', desc: 'Facebook & Instagram lead forms auto-captured' },
    { icon: '🔍', name: 'Google Ads', color: '#4285F4', desc: 'Google lead gen forms → instant CRM entry' },
    { icon: '💬', name: 'WhatsApp',   color: '#25D366', desc: 'Inbound leads via WATI webhook automation' },
    { icon: '🎙️', name: 'AI Voice',  color: '#7C3AED', desc: 'Vapi.ai auto-calls new leads in 60 seconds' },
    { icon: '📋', name: 'Web Forms',  color: '#F59E0B', desc: 'WordPress & custom forms via N8N webhook' },
  ],
  outputs: [
    { icon: '🎯', name: 'Pipeline',   color: '#B8860B', desc: '7-stage visual lead pipeline' },
    { icon: '📊', name: 'Analytics',  color: '#059669', desc: 'Revenue & conversion dashboards' },
    { icon: '🧾', name: 'Invoices',   color: '#DC2626', desc: 'GST billing & payment tracking' },
    { icon: '📱', name: 'WhatsApp',   color: '#25D366', desc: 'Auto follow-up & notifications' },
    { icon: '📈', name: 'Reports',    color: '#7C3AED', desc: 'Team performance & win rates' },
  ],
}

const integrationBadges = [
  { name: 'N8N Automation', icon: '⚙️' },
  { name: 'Vapi.ai Voice',  icon: '🎙️' },
  { name: 'WATI WhatsApp',  icon: '💬' },
  { name: 'Meta Ads',       icon: '📘' },
  { name: 'Google Ads',     icon: '🔍' },
  { name: 'Razorpay',       icon: '💳' },
  { name: 'WordPress',      icon: '🌐' },
  { name: 'Supabase',       icon: '🔐' },
]

const pipelineStages = [
  { label: 'New',        count: 48, color: '#6366F1', bg: '#EEF2FF' },
  { label: 'RNR',        count: 23, color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Follow-up',  count: 31, color: '#3B82F6', bg: '#EFF6FF' },
  { label: 'Site Visit', count: 18, color: '#8B5CF6', bg: '#F5F3FF' },
  { label: 'Quotation',  count: 14, color: '#EC4899', bg: '#FDF2F8' },
  { label: 'Won ✅',     count: 38, color: '#10B981', bg: '#ECFDF5' },
]

const pipelineLeads = [
  { name: 'Rajesh Kumar', area: '2BHK Full Interior · Banjara Hills',  val: '₹4.5L', time: '2h ago' },
  { name: 'Priya Sharma', area: 'Office Renovation · Jubilee Hills',   val: '₹8.2L', time: '45m ago' },
  { name: 'Mohammed Ali', area: '3BHK Interior · Gachibowli',          val: '₹6.8L', time: '3h ago' },
]

const howItWorks = [
  { step: '01', icon: '📝', title: 'Sign Up in 5 Minutes', desc: 'Create your company, add your team, configure your industry pipeline. No technical setup needed — you are live immediately.' },
  { step: '02', icon: '📥', title: 'Import & Capture Leads', desc: 'Add leads manually, bulk import via CSV, or connect Meta/Google Ads through N8N automation. Every lead lands in your pipeline instantly.' },
  { step: '03', icon: '📈', title: 'Close Deals Faster', desc: 'Move leads through stages, schedule site visits, send quotations, collect payments. Track everything in real-time from one dashboard.' },
]

const testimonials = [
  { name: 'Rajesh Kumar',   role: 'Interior Designer, Hyderabad',  init: 'RK', bg: '#EEEDFE', fg: '#3C3489', text: 'GK CRM transformed how we handle leads. Our conversion rate jumped 40% in 3 months. The pipeline view is incredible — every stage is crystal clear.' },
  { name: 'Priya Sharma',   role: 'Real Estate Agency Owner',       init: 'PS', bg: '#E6F1FB', fg: '#0C447C', text: 'We manage 200+ leads a month. Before GK CRM it was complete chaos. Now everything is organized — site visits, follow-ups, deals. Night and day difference.' },
  { name: 'Dr. Venkat Rao', role: 'Clinic Director, Warangal',      init: 'VR', bg: '#E1F5EE', fg: '#085041', text: 'Patient management, billing and doctor schedules in one place. My staff adapted within a day. Exactly what we needed for a busy multi-doctor clinic.' },
  { name: 'Mohammed Ali',   role: 'B2B Business Owner',             init: 'MA', bg: '#FAEEDA', fg: '#633806', text: 'The role-based access is perfect. My sales team sees their leads, I see everything. Clean, fast and reliable. Best investment for our agency this year.' },
  { name: 'Sunitha Reddy',  role: 'Hospital Administrator',         init: 'SR', bg: '#FCEBEB', fg: '#791F1F', text: 'Appointment tracking and billing used to take hours. Now it takes minutes. GK CRM paid for itself in week one — I recommend it to every hospital admin I know.' },
]

const stats = [
  { icon: User,         value: 3800, suffix: '+',    label: 'Active Users',     tint: '#EEEDFE', fg: '#7F77DD' },
  { icon: TrendingUp,   value: 120,  prefix: '₹', suffix: 'Cr+', label: 'Revenue Tracked', tint: '#E1F5EE', fg: '#1D9E75' },
  { icon: CheckCircle2, value: 99.9, suffix: '%',   label: 'Uptime',           tint: '#FAEEDA', fg: '#BA7517' },
  { icon: Clock3,       value: 48,   suffix: 'hrs', label: 'Avg Onboarding',   tint: '#E6F1FB', fg: '#378ADD' },
]

const faqs = [
  { q: 'Can I switch industries after signup?',    a: 'Yes! Admin can manage multiple industries from the same portal with no extra setup or data migration.' },
  { q: 'Is my data secure?',                       a: 'Absolutely. We use Supabase with Row Level Security — your company data is completely isolated from other tenants.' },
  { q: 'Can staff members see all leads?',          a: 'No. Staff (CRE role) only see leads assigned in their pipeline. Admin sees all leads across the full team.' },
  { q: 'Is there a free trial?',                    a: 'Yes — Professional plan comes with 14 days free, no credit card required. Cancel anytime with no questions asked.' },
  { q: 'How do I add team members?',                a: 'Admin can add unlimited staff from the Users page with CRE role. Each CRE gets their own secure login immediately.' },
  { q: 'Does it work on mobile?',                   a: 'Yes — GK CRM is fully responsive and works on desktop, tablet and mobile browsers without any app install.' },
  { q: 'What AI tools integrate with GK CRM?',     a: 'We support N8N for automation, Vapi.ai for AI voice agents, WATI for WhatsApp, and Meta/Google Ads for lead capture. More integrations shipping soon.' },
]

const liveActivities = [
  { icon: '🎯', text: 'New lead from Meta Ads — Rajesh Kumar, Hyderabad' },
  { icon: '📞', text: 'Priya Sharma called — moved to Follow-up stage' },
  { icon: '✅', text: 'Deal WON — Suresh Nair ₹8.5L Interior Design' },
  { icon: '🏠', text: 'Site Visit scheduled — Mohammed Ali, Banjara Hills' },
  { icon: '💰', text: 'Invoice paid — ₹2.2L received from Kavitha Reddy' },
  { icon: '🎙️', text: 'AI Voice Agent called new lead — 45 second response time' },
  { icon: '🎯', text: 'New lead from Google Ads — Dr. Venkat, Warangal' },
]

// ── HOOKS ─────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 2200, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
      else setCount(target)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ── SUBCOMPONENTS ─────────────────────────────────────────────────────────

function LiveTicker() {
  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setShow(false)
      setTimeout(() => { setIdx(i => (i + 1) % liveActivities.length); setShow(true) }, 350)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-[#0F0D0A] border-b border-white/10 py-2">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">LIVE</span>
        </div>
        <div className="h-3 w-px bg-white/20 flex-shrink-0" />
        <div className={`transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
          <span className="text-xs text-white/60">
            <span className="mr-2">{liveActivities[idx].icon}</span>
            {liveActivities[idx].text}
          </span>
        </div>
        <div className="ml-auto flex-shrink-0 hidden md:flex items-center gap-2 text-[10px] text-white/25 font-medium">
          <span>Just now</span>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, value, prefix = '', suffix = '', label, tint, fg, start, delay = 0 }: {
  icon: React.ElementType; value: number; prefix?: string; suffix?: string; label: string;
  tint: string; fg: string; start: boolean; delay?: number
}) {
  const count = useCountUp(value, 2200, start)
  const display = value % 1 !== 0 ? (start ? value.toFixed(1) : '0.0') : count.toLocaleString()
  return (
    <div
      className="bg-[#F7F5F1] rounded-2xl p-5 md:p-6 text-center hover:-translate-y-1 hover:shadow-md transition-all duration-300"
      style={{
        opacity: start ? 1 : 0,
        transform: start ? 'translateY(0)' : 'translateY(14px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: tint, color: fg }}
      >
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <p className="font-serif text-2xl md:text-3xl font-bold text-[#1C1712] tabular-nums mb-1">
        {prefix}{display}{suffix}
      </p>
      <p className="text-xs md:text-sm text-[#9A8F82] font-medium">{label}</p>
    </div>
  )
}

function AIEcosystemSection() {
  const { ref, visible } = useInView(0.15)

  return (
    <section ref={ref} id="ai-tools" className="py-16 md:py-24 bg-white relative overflow-hidden">
      {/* Subtle grid bg — light version */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(28,23,18,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(28,23,18,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      {/* Glow orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 md:px-6 relative">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-[#B8860B] text-xs font-bold px-4 py-2 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B] animate-pulse" />
            AI-Powered Integrations — Coming Soon
          </span>
          <h2 className="font-serif text-3xl md:text-5xl text-[#1C1712] mb-4 md:mb-5 leading-tight">
            Your entire growth engine<br />
            <em className="italic font-normal text-[#B8860B]">in one connected system</em>
          </h2>
          <p className="text-[#7A6E60] text-base md:text-lg max-w-xl mx-auto">
            Every lead source, every automation tool, every follow-up — flowing into GK CRM automatically. Zero manual work.
          </p>
        </div>

        {/* Ecosystem visual */}
        <div className="flex items-stretch justify-between gap-4 md:gap-6 lg:gap-10 max-w-5xl mx-auto">

          {/* Left: Inputs */}
          <div className="flex flex-col gap-2.5 flex-shrink-0 w-32 md:w-44 lg:w-52">
            <p className="text-[9px] font-bold text-[#9A8F82] uppercase tracking-[3px] text-center mb-1">Lead Sources</p>
            {aiIntegrations.inputs.map((item, i) => (
              <div
                key={i}
                className="bg-[#F5F0E8] border border-[#E2D9C8] rounded-xl p-2.5 md:p-3 hover:bg-white hover:border-[#B8860B]/40 hover:shadow-sm transition-all duration-300 group"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `opacity 0.6s ease ${i * 80}ms, transform 0.6s ease ${i * 80}ms`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm md:text-base">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1C1712] truncate">{item.name}</p>
                    <p className="text-[9px] text-[#9A8F82] leading-tight hidden md:block truncate">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Center: Connecting lines + Hub */}
          <div className="flex-1 relative flex items-center justify-center min-h-[260px]">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              {/* Input lines — className-only, no inline animation to avoid React style conflicts */}
              {[10, 27.5, 45, 62.5, 80].map((y, i) => (
                <line key={`in-${i}`}
                  x1="0%" y1={`${y}%`} x2="50%" y2="50%"
                  stroke="#B8860B" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.35"
                  className={visible ? `gk-in-${i}` : ''}
                />
              ))}
              {/* Output lines */}
              {[10, 27.5, 45, 62.5, 80].map((y, i) => (
                <line key={`out-${i}`}
                  x1="50%" y1="50%" x2="100%" y2={`${y}%`}
                  stroke="#B8860B" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.35"
                  className={visible ? `gk-out-${i}` : ''}
                />
              ))}
            </svg>

            {/* Hub */}
            <div
              className="relative z-10"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'scale(1)' : 'scale(0.5)',
                transition: 'opacity 0.8s ease 0.3s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s',
              }}
            >
              <div className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#B8860B] via-[#9A7009] to-[#7A5807] flex flex-col items-center justify-center shadow-2xl shadow-[#B8860B]/30 border border-[#B8860B]/20 relative">
                <div className="text-white font-serif text-2xl md:text-3xl font-bold mb-0.5">G</div>
                <p className="text-white/80 text-[8px] md:text-[10px] font-bold tracking-widest">GK · CRM</p>
              </div>
              {/* Pulse rings — CSS class only, no inline animation */}
              {[1, 2].map(ring => (
                <div key={ring}
                  className={`absolute inset-0 rounded-2xl md:rounded-3xl border-2 border-[#B8860B]/40 gk-ring-${ring}`}
                />
              ))}
            </div>
          </div>

          {/* Right: Outputs */}
          <div className="flex flex-col gap-2.5 flex-shrink-0 w-32 md:w-44 lg:w-52">
            <p className="text-[9px] font-bold text-[#9A8F82] uppercase tracking-[3px] text-center mb-1">CRM Output</p>
            {aiIntegrations.outputs.map((item, i) => (
              <div
                key={i}
                className="bg-[#F5F0E8] border border-[#E2D9C8] rounded-xl p-2.5 md:p-3 hover:bg-white hover:border-[#B8860B]/40 hover:shadow-sm transition-all duration-300"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(20px)',
                  transition: `opacity 0.6s ease ${i * 80 + 200}ms, transform 0.6s ease ${i * 80 + 200}ms`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm md:text-base">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1C1712] truncate">{item.name}</p>
                    <p className="text-[9px] text-[#9A8F82] leading-tight hidden md:block truncate">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {integrationBadges.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-[#F5F0E8] border border-[#E2D9C8] rounded-full px-3 md:px-4 py-1.5 md:py-2 hover:bg-white hover:border-[#B8860B]/30 hover:shadow-sm transition-all cursor-default"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: `opacity 0.5s ease ${i * 60 + 400}ms, transform 0.5s ease ${i * 60 + 400}ms`,
              }}
            >
              <span className="text-sm">{badge.icon}</span>
              <span className="text-xs font-medium text-[#7A6E60]">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* gkDash keyframe + all animation classes defined in LandingPage <style> block */}
    </section>
  )
}

function PipelineSection() {
  const [activeStage, setActiveStage] = useState(0)
  const { ref, visible } = useInView(0.15)

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => setActiveStage(i => (i + 1) % pipelineStages.length), 1800)
    return () => clearInterval(interval)
  }, [visible])

  return (
    <section ref={ref} className="py-16 md:py-24 bg-[#F5F0E8]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-4">Pipeline</p>
          <h2 className="font-serif text-3xl md:text-5xl text-[#1C1712] mb-4">
            7-stage pipeline — <em className="italic font-normal text-[#B8860B]">live & visual</em>
          </h2>
          <p className="text-[#7A6E60] max-w-lg mx-auto">Every lead&apos;s journey mapped from first contact to deal closure. Nothing slips through the cracks.</p>
        </div>

        {/* Stage cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-3 mb-6">
          {pipelineStages.map((stage, i) => (
            <button
              key={i}
              onClick={() => setActiveStage(i)}
              className="rounded-2xl p-3 md:p-4 border-2 text-left transition-all duration-500 cursor-pointer"
              style={{
                background: stage.bg,
                borderColor: activeStage === i ? stage.color : 'transparent',
                transform: visible ? (activeStage === i ? 'scale(1.04) translateY(-3px)' : 'scale(1)') : 'scale(0.85)',
                opacity: visible ? 1 : 0,
                boxShadow: activeStage === i ? `0 8px 24px ${stage.color}30` : 'none',
                transition: `all 0.5s ease ${i * 70}ms`,
              }}
            >
              <div
                className="w-7 h-7 rounded-xl mb-2.5 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: stage.color }}
              >{i + 1}</div>
              <p className="text-[10px] md:text-xs font-bold text-[#1C1712] mb-1 leading-tight">{stage.label}</p>
              <p className="font-serif text-xl md:text-2xl font-bold" style={{ color: stage.color }}>{stage.count}</p>
              <p className="text-[8px] md:text-[9px] text-[#9A8F82] mt-0.5">leads</p>
            </button>
          ))}
        </div>

        {/* Active stage leads */}
        <div className="bg-white rounded-2xl border border-[#E2D9C8] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-[#9A8F82] uppercase tracking-widest">
              {pipelineStages[activeStage].label} — Current Leads
            </p>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: pipelineStages[activeStage].color }}
            >
              {pipelineStages[activeStage].count} leads
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pipelineLeads.map((lead, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F0E8] border border-[#E2D9C8] hover:border-[#B8860B]/30 transition-all cursor-default"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: pipelineStages[activeStage].color }}
                >
                  {lead.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#1C1712] truncate">{lead.name}</p>
                  <p className="text-[10px] text-[#9A8F82] truncate">{lead.area}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-[#B8860B]">{lead.val}</p>
                  <p className="text-[9px] text-[#B8B0A0]">{lead.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const { ref, visible } = useInView(0.15)

  return (
    <section ref={ref} className="py-16 md:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-4">How It Works</p>
          <h2 className="font-serif text-3xl md:text-5xl text-[#1C1712]">Up and running in under an hour</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {/* Desktop connector */}
          <div className="hidden md:block absolute top-14 left-1/3 right-1/3 h-px bg-gradient-to-r from-[#E2D9C8] via-[#B8860B] to-[#E2D9C8] pointer-events-none" />

          {howItWorks.map((step, i) => (
            <div
              key={i}
              className="relative bg-[#F5F0E8] border border-[#E2D9C8] rounded-2xl p-6 md:p-8 hover:border-[#B8860B]/30 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.6s ease ${i * 150}ms, transform 0.6s ease ${i * 150}ms`,
              }}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#1C1712] group-hover:bg-[#B8860B] transition-colors duration-300 flex items-center justify-center text-xl flex-shrink-0">
                  {step.icon}
                </div>
                <span className="font-serif text-5xl text-[#E2D9C8] font-bold leading-none select-none">{step.step}</span>
              </div>
              <h3 className="font-bold text-[#1C1712] text-sm md:text-base mb-3">{step.title}</h3>
              <p className="text-sm text-[#7A6E60] leading-relaxed">{step.desc}</p>
              <div className="mt-5 h-0.5 w-0 group-hover:w-full bg-[#B8860B] rounded-full transition-all duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsOwlCarousel() {
  const [startIdx, setStartIdx] = useState(0)
  const [cardsPerView, setCardsPerView] = useState(3)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const updateCards = () => {
      if (window.innerWidth < 768) setCardsPerView(1)
      else if (window.innerWidth < 1024) setCardsPerView(2)
      else setCardsPerView(3)
    }
    updateCards()
    window.addEventListener('resize', updateCards)
    return () => window.removeEventListener('resize', updateCards)
  }, [])

  const maxIdx = Math.max(0, testimonials.length - cardsPerView)

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, maxIdx))
    setStartIdx(clamped)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setStartIdx(i => (i >= maxIdx ? 0 : i + 1))
    }, 3800)
  }

  useEffect(() => {
    goTo(0)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsPerView])

  const cardWidthPct = 100 / cardsPerView

  return (
    <section className="bg-[#F5F0E8] py-16 md:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-4">Testimonials</p>
          <h2 className="font-serif text-3xl md:text-5xl text-[#1C1712]">
            What our customers <em className="italic font-normal text-[#B8860B]">say</em>
          </h2>
        </div>

        {/* Track viewport */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${startIdx * cardWidthPct}%)` }}
          >
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="flex-shrink-0 px-2.5"
                style={{ width: `${cardWidthPct}%` }}
              >
                <div className="bg-white border border-[#E2D9C8] rounded-2xl p-6 h-full relative overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-[#B8860B]/30 transition-all duration-300 flex flex-col">
                  <span className="absolute top-3 left-5 font-serif text-6xl text-[#B8860B] opacity-10 leading-none select-none italic">&ldquo;</span>

                  <div className="flex gap-1 mb-4 relative">
                    {[...Array(5)].map((_, j) => <span key={j} className="text-[#B8860B] text-xs">★</span>)}
                  </div>

                  <p className="text-[#4A4035] text-sm font-light leading-relaxed mb-6 flex-1 relative min-h-[100px]">
                    &ldquo;{t.text}&rdquo;
                  </p>

                  <div className="flex items-center gap-3 border-t border-[#E2D9C8] pt-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={{ background: t.bg, color: t.fg }}
                    >
                      {t.init}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1C1712] truncate">{t.name}</p>
                      <p className="text-xs text-[#9A8F82] truncate">{t.role}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-100 flex items-center justify-center text-[7px] text-emerald-600">✓</span>
                      Verified
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-5 mt-8">
          <button onClick={() => goTo(startIdx - 1)}
            className="w-10 h-10 rounded-full bg-white border border-[#E2D9C8] text-[#7A6E60] flex items-center justify-center hover:bg-[#1C1712] hover:text-white hover:border-[#1C1712] transition-all">←</button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxIdx + 1 }).map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === startIdx ? 'w-6 bg-[#B8860B]' : 'w-1.5 bg-[#D3CBBB] hover:bg-[#B8860B]/40'}`} />
            ))}
          </div>
          <button onClick={() => goTo(startIdx + 1)}
            className="w-10 h-10 rounded-full bg-white border border-[#E2D9C8] text-[#7A6E60] flex items-center justify-center hover:bg-[#1C1712] hover:text-white hover:border-[#1C1712] transition-all">→</button>
        </div>
      </div>
    </section>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter()
  const [activeFaq, setActiveFaq]       = useState<number | null>(null)
  const [industryIdx, setIndustryIdx]   = useState(0)

  // ── Support form state (wired to /api/support-inquiry) ──
  const [supportForm, setSupportForm]     = useState({ name: '', email: '', message: '' })
  const [supportSent, setSupportSent]     = useState(false)
  const [supportError, setSupportError]   = useState('')
  const [supportLoading, setSupportLoading] = useState(false)

  const [statsVisible, setStatsVisible] = useState(false)
  const [heroVisible, setHeroVisible]   = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setTimeout(() => setHeroVisible(true), 80) }, [])

  // URL hash (e.g. /#pricing) ఉంటే, page load అయిన తర్వాత ఆ section కి scroll చేయు
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '')
      const timer = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Support form submit handler ──
  const handleSupportSubmit = async () => {
    setSupportError('')

    if (!supportForm.name || !supportForm.email || !supportForm.message) {
      setSupportError('Please fill all fields')
      return
    }

    setSupportLoading(true)
    try {
      const res = await fetch('/api/support-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supportForm),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setSupportError(data.error || 'Failed to send message. Try again.')
        setSupportLoading(false)
        return
      }

      setSupportSent(true)
    } catch {
      setSupportError('Network error. Please try again.')
    } finally {
      setSupportLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes strokeCycle {
          0%   { stroke: #ef4444; } 16% { stroke: #84cc16; } 32% { stroke: #06b6d4; }
          48%  { stroke: #8b5cf6; } 64% { stroke: #f43f5e; } 80% { stroke: #22c55e; }
          100% { stroke: #ef4444; }
        }
        @keyframes colorCycle {
          0%   { background-color: #ef4444; } 20% { background-color: #22c55e; }
          40%  { background-color: #3b82f6; } 60% { background-color: #ec4899; }
          80%  { background-color: #f59e0b; } 100% { background-color: #ef4444; }
        }
        @keyframes gkFloat {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-8px); }
        }
        @keyframes gkFloatSlow {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-5px); }
        }
        @keyframes gkPing {
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes gkDash { to { stroke-dashoffset: -20; } }

        /* ── Floating card animations (CSS classes avoid React inline-style conflicts) ── */
        .gk-float    { animation: gkFloat    3.2s ease-in-out       infinite; }
        .gk-float-d1 { animation: gkFloat    3.2s ease-in-out 1.6s  infinite; }
        .gk-float-d2 { animation: gkFloatSlow 4s  ease-in-out 0.8s  infinite; }

        /* ── Hub pulse rings ── */
        .gk-ring-1 { animation: gkPing 2.5s cubic-bezier(0,0,0.2,1) 0.7s  infinite; }
        .gk-ring-2 { animation: gkPing 2.5s cubic-bezier(0,0,0.2,1) 1.4s  infinite; }

        /* ── SVG ecosystem flow lines ── */
        .gk-in-0  { animation: gkDash 2.5s linear 0.0s infinite; }
        .gk-in-1  { animation: gkDash 2.5s linear 0.3s infinite; }
        .gk-in-2  { animation: gkDash 2.5s linear 0.6s infinite; }
        .gk-in-3  { animation: gkDash 2.5s linear 0.9s infinite; }
        .gk-in-4  { animation: gkDash 2.5s linear 1.2s infinite; }
        .gk-out-0 { animation: gkDash 2.5s linear 0.8s infinite; }
        .gk-out-1 { animation: gkDash 2.5s linear 1.1s infinite; }
        .gk-out-2 { animation: gkDash 2.5s linear 1.4s infinite; }
        .gk-out-3 { animation: gkDash 2.5s linear 1.7s infinite; }
        .gk-out-4 { animation: gkDash 2.5s linear 2.0s infinite; }
      `}</style>

      <div className="bg-[#F5F0E8] overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── LIVE TICKER ── */}
        <LiveTicker />

        {/* ── NAVBAR ── */}
        <GKHeader />

        {/* ── HERO ── */}
        <section className="relative max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-12 md:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-14 items-center overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-72 h-72 bg-purple-100/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-blue-50/50 rounded-full blur-2xl pointer-events-none" />

          {/* Left content */}
          <div
            className="relative"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(28px)',
              transition: 'opacity 0.9s ease, transform 0.9s ease',
            }}
          >
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ animation: 'colorCycle 60s linear infinite' }} />
              #1 CRM for Indian Businesses · Hyderabad
            </div>

            <h1 className="font-serif text-[38px] sm:text-5xl md:text-[64px] text-[#1C1712] leading-[1.05] mb-5">
              One CRM.<br />
              <span className="relative inline-block">
                <span className="text-[#B8860B]">Every Industry.</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 300 6" fill="none">
                  <path d="M0 3 Q75 0 150 3 Q225 6 450 3" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8"
                    style={{ animation: 'strokeCycle 60s linear infinite' }} />
                </svg>
              </span>
            </h1>

            <p className="text-base md:text-lg text-[#7A6E60] leading-relaxed mb-8 max-w-lg">
              Leads, pipeline, projects, staff, billing and AI automations — managed from one premium portal built for every Indian business.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button onClick={() => scrollTo('pricing')}
                className="w-full sm:w-auto bg-[#1C1712] text-white px-8 py-4 rounded-xl text-sm font-bold hover:bg-[#B8860B] transition-all duration-300 shadow-xl shadow-black/15 text-center">
                Start Free Trial — 14 Days →
              </button>
              <button onClick={() => scrollTo('ai-tools')}
                className="w-full sm:w-auto border-2 border-[#E2D9C8] text-[#1C1712] px-8 py-4 rounded-xl text-sm font-bold hover:bg-[#F0EBE0] hover:border-[#B8860B] transition-all text-center">
                See AI Integrations ⚡
              </button>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              {[
                { val: '14 days', lbl: 'Free trial' },
                { val: 'No card',  lbl: 'Required' },
                { val: '5 min',    lbl: 'Setup time' },
              ].map(s => (
                <div key={s.lbl} className="flex items-center gap-2">
                  <span className="text-emerald-500 text-lg">✓</span>
                  <div>
                    <p className="text-xs font-bold text-[#1C1712]">{s.val}</p>
                    <p className="text-[10px] text-[#9A8F82]">{s.lbl}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop dashboard mockup */}
          <div
            className="relative hidden lg:block"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(28px)',
              transition: 'opacity 0.9s ease 0.25s, transform 0.9s ease 0.25s',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 to-purple-200/20 rounded-3xl blur-xl" />
            <div className="relative bg-white rounded-2xl border border-[#E2D9C8] shadow-2xl shadow-black/15 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 bg-[#FDFAF8] border-b border-[#F0EBE0]">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-[#9A8F82] font-medium">GK CRM — Interior Design Dashboard</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  <span className="text-[9px] text-emerald-600 font-semibold">LIVE</span>
                </div>
              </div>
              <div className="p-5">
                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Total Leads', value: '248',   color: 'text-blue-600',    bg: 'bg-blue-50' },
                    { label: 'Today',       value: '12',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Revenue',     value: '₹4.2L', color: 'text-amber-600',   bg: 'bg-amber-50' },
                    { label: 'Won',         value: '38',    color: 'text-purple-600',  bg: 'bg-purple-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
                      <p className={`font-serif text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] text-[#9A8F82] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Chart */}
                <div className="bg-[#F7F5F1] rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-wide">Pipeline Overview</p>
                    <span className="text-[9px] text-emerald-600 font-semibold">↑ 24% this month</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-14">
                    {[35, 60, 42, 78, 55, 88, 67, 92].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-md" style={{
                        height: `${h}%`,
                        background: 'linear-gradient(to top, #1C1712, #B8860B)',
                        opacity: 0.6 + i * 0.05,
                      }} />
                    ))}
                  </div>
                </div>
                {/* Activity feed */}
                <div className="flex flex-col gap-1.5">
                  {[
                    { name: 'Rajesh Kumar', action: 'moved to Site Visit 🏠', time: '2m ago',  dot: 'bg-orange-400' },
                    { name: 'Priya Sharma', action: 'new lead added 🎯',       time: '5m ago',  dot: 'bg-blue-400' },
                    { name: 'Suresh Nair',  action: 'deal won ✅ ₹8.5L',       time: '12m ago', dot: 'bg-emerald-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-[#F0EBE0] last:border-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dot}`} />
                      <p className="text-[10px] text-[#1C1712] font-semibold">{item.name}</p>
                      <p className="text-[10px] text-[#9A8F82] flex-1">{item.action}</p>
                      <p className="text-[9px] text-[#B8B0A0]">{item.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating stat cards — CSS class animations only, zero inline style */}
            <div className="absolute -bottom-4 -left-4 bg-[#1C1712] text-white rounded-2xl px-4 py-3 shadow-xl gk-float">
              <p className="text-[10px] text-white/50 uppercase tracking-widest">Win Rate</p>
              <p className="font-serif text-2xl text-emerald-400">+38%</p>
            </div>
            <div className="absolute -top-4 -right-4 bg-white border border-[#E2D9C8] rounded-2xl px-4 py-3 shadow-xl gk-float-d1">
              <p className="text-[10px] text-[#9A8F82] uppercase tracking-widest">Live Leads</p>
              <p className="font-serif text-2xl text-[#B8860B]">248</p>
            </div>
            <div className="absolute top-1/2 -right-5 -translate-y-1/2 bg-emerald-500 text-white rounded-xl px-3 py-2 shadow-xl gk-float-d2">
              <p className="text-[9px] font-bold whitespace-nowrap">🎯 New Lead!</p>
              <p className="text-[9px] text-white/70">Meta Ads</p>
            </div>
          </div>

          {/* Mobile mockup */}
          <div
            className="lg:hidden bg-white rounded-2xl border border-[#E2D9C8] shadow-lg overflow-hidden"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(28px)',
              transition: 'opacity 0.9s ease 0.25s, transform 0.9s ease 0.25s',
            }}
          >
            <div className="flex items-center gap-1.5 px-4 py-3 bg-[#FDFAF8] border-b border-[#F0EBE0]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[10px] text-[#9A8F82]">GK CRM Dashboard</span>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[9px] text-emerald-600 font-semibold">LIVE</span>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Leads',   value: '248',   color: 'text-blue-600',    bg: 'bg-blue-50' },
                  { label: 'Today',   value: '12',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Revenue', value: '₹4.2L', color: 'text-amber-600',   bg: 'bg-amber-50' },
                  { label: 'Won',     value: '38',    color: 'text-purple-600',  bg: 'bg-purple-50' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
                    <p className={`font-serif text-base font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[8px] text-[#9A8F82]">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1 h-10 bg-[#F7F5F1] rounded-xl px-3 py-2">
                {[35, 60, 42, 78, 55, 88, 67, 92].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{
                    height: `${h}%`,
                    background: 'linear-gradient(to top, #1C1712, #B8860B)',
                    opacity: 0.6 + i * 0.05,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section ref={statsRef} className="bg-white mx-4 md:mx-8 lg:mx-16 rounded-2xl relative overflow-hidden py-10 md:py-14 border border-[#E2D9C8]">
          <h2 className="text-center font-serif text-xl md:text-2xl font-bold text-[#1C1712] mb-8 md:mb-10">
            Our growing stats
          </h2>
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((s, i) => (
              <StatCard
                key={s.label}
                icon={s.icon}
                value={s.value}
                prefix={s.prefix}
                suffix={s.suffix}
                label={s.label}
                tint={s.tint}
                fg={s.fg}
                start={statsVisible}
                delay={i * 90}
              />
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-16">
            <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-4">Features</p>
            <h2 className="font-serif text-3xl md:text-5xl text-[#1C1712] mb-4 md:mb-5">Everything your business needs</h2>
            <p className="text-[#7A6E60] max-w-xl mx-auto text-base md:text-lg">From first lead to final invoice — your entire workflow in one premium portal.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div key={i}
                className="group bg-white border border-[#E2D9C8] rounded-2xl p-5 md:p-6 hover:-translate-y-2 hover:shadow-xl hover:border-[#B8860B]/30 transition-all duration-300 cursor-default">
                <div className="flex items-start justify-between mb-4 md:mb-5">
                  <div className="w-12 h-12 bg-[#F5F0E8] group-hover:bg-amber-50 rounded-2xl flex items-center justify-center text-2xl transition-colors">{f.icon}</div>
                  <span className="text-[9px] font-bold text-[#B8860B] bg-amber-50 border border-amber-100 px-2 py-1 rounded-full uppercase tracking-wider">{f.tag}</span>
                </div>
                <h3 className="font-bold text-[#1C1712] mb-2 text-sm">{f.title}</h3>
                <p className="text-sm text-[#7A6E60] leading-relaxed">{f.desc}</p>
                <div className="mt-4 h-0.5 w-0 bg-[#B8860B] group-hover:w-full transition-all duration-500 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        {/* ── AI ECOSYSTEM ── */}
        <AIEcosystemSection />

        {/* ── PIPELINE ── */}
        <PipelineSection />

        {/* ── HOW IT WORKS ── */}
        <HowItWorksSection />

        {/* ── INDUSTRIES ── */}
        <section id="industries" className="bg-[#F5F0E8] py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="text-center mb-10 md:mb-16">
              <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-4">Industries</p>
              <h2 className="font-serif text-3xl md:text-5xl text-[#1C1712] mb-4 md:mb-5">Built for every sector</h2>
              <p className="text-[#7A6E60] text-base md:text-lg">One platform, five industries. Choose yours and get started in minutes.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {industries.map((ind, i) => (
                <button key={ind.id}
                  disabled={ind.comingSoon}
                  onClick={() => { if (ind.comingSoon) return; setIndustryIdx(i); router.push(`/signup?industry=${ind.id}`) }}
                  onMouseEnter={() => { if (!ind.comingSoon) setIndustryIdx(i) }}
                  className={`group relative overflow-hidden rounded-2xl p-4 md:p-5 text-left transition-all duration-300 ${
                    ind.comingSoon ? 'opacity-60 cursor-not-allowed' :
                    `hover:-translate-y-1 hover:shadow-xl ${industryIdx === i ? 'shadow-xl -translate-y-1' : ''}`
                  }`}>
                  {ind.comingSoon ? (
                    <div className="absolute inset-0 bg-[#F7F5F1] border border-[#E2D9C8] rounded-2xl" />
                  ) : (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-br ${ind.color} ${industryIdx === i ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity duration-300`} />
                      <div className={`absolute inset-0 bg-[#F7F5F1] border border-[#E2D9C8] rounded-2xl ${industryIdx === i ? 'opacity-0' : 'opacity-100'} group-hover:opacity-0 transition-opacity duration-300`} />
                    </>
                  )}
                  <div className="relative">
                    <p className="text-3xl md:text-4xl mb-3">{ind.icon}</p>
                    <h3 className={`font-bold text-xs md:text-sm mb-1.5 transition-colors ${
                      ind.comingSoon ? 'text-[#9A8F82]' : industryIdx === i ? 'text-white' : 'text-[#1C1712] group-hover:text-white'
                    }`}>{ind.name}</h3>
                    <p className={`text-[10px] md:text-xs leading-relaxed transition-colors hidden sm:block ${
                      ind.comingSoon ? 'text-[#B8B0A0]' : industryIdx === i ? 'text-white/80' : 'text-[#9A8F82] group-hover:text-white/80'
                    }`}>{ind.desc}</p>
                    {ind.comingSoon ? (
                      <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-bold mt-3 text-[#B8860B] bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        🔒 Coming Soon
                      </span>
                    ) : (
                      <p className={`text-xs font-bold mt-3 transition-colors ${industryIdx === i ? 'text-white' : 'text-[#B8860B] group-hover:text-white'}`}>Start →</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing">
          <GKCRMPricing />
        </section>

        {/* ── TESTIMONIALS ── */}
        <TestimonialsOwlCarousel />

        {/* ── FAQ ── */}
        <section className="max-w-3xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-4">FAQ</p>
            <h2 className="font-serif text-3xl md:text-5xl text-[#1C1712]">Frequently asked</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i}
                className={`border rounded-2xl overflow-hidden transition-all duration-300 ${activeFaq === i ? 'border-[#B8860B]/40 shadow-md bg-white' : 'border-[#E2D9C8] bg-white'}`}>
                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 md:px-6 py-4 md:py-5 text-left hover:bg-[#FDFAF8] transition-colors">
                  <span className="text-sm font-semibold text-[#1C1712] pr-4">{faq.q}</span>
                  <span className={`text-[#B8860B] text-xl transition-transform duration-300 flex-shrink-0 ${activeFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${activeFaq === i ? 'max-h-40' : 'max-h-0'}`}>
                  <p className="text-sm text-[#7A6E60] px-5 md:px-6 pb-5 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SUPPORT ── */}
        <section id="support" className="bg-white py-16 md:py-24">
          <div className="text-center px-4">
            <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-4">Support</p>
            <h2 className="font-serif text-3xl md:text-5xl text-[#1C1712] mb-4 md:mb-5">We&apos;re here to help</h2>
            <p className="text-[#7A6E60] mb-8 md:mb-10 text-base md:text-lg">Our team responds within 24 hours. For urgent issues, WhatsApp us directly.</p>
          </div>
          <div className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-start">
            <div className="space-y-3">
              {[
                { icon: '📧', label: 'Email',    value: 'supportcrm@gkdigitalsolutions.in',    sub: 'Reply within 24 hours' },
                { icon: '📞', label: 'Phone',    value: '+91 7095815427',      sub: 'Mon–Sat, 9:00AM – 7:00PM' },
                { icon: '💬', label: 'WhatsApp', value: 'Chat instantly',       sub: 'For urgent support' },
                { icon: '📍', label: 'Location', value: 'Hyderabad, Telangana', sub: 'India' },
              ].map(item => (
                <div key={item.label}
                  className="flex items-center gap-4 bg-[#F7F5F1] border border-[#E2D9C8] rounded-2xl p-4 hover:border-[#B8860B]/30 transition-colors group">
                  <div className="w-11 h-11 bg-white group-hover:bg-amber-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-[#E2D9C8] shadow-sm transition-colors">{item.icon}</div>
                  <div>
                    <p className="text-[10px] text-[#9A8F82] font-semibold uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-bold text-[#1C1712]">{item.value}</p>
                    <p className="text-[10px] text-[#B8B0A0]">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[#F7F5F1] border border-[#E2D9C8] rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="font-serif text-2xl text-[#1C1712] mb-1">Send us a message</h3>
              <p className="text-sm text-[#9A8F82] mb-6">We&apos;ll get back to you within 24 hours.</p>
              {supportSent ? (
                <div className="text-center py-10 md:py-14">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
                  <p className="font-bold text-[#1C1712] text-lg">Message sent!</p>
                  <p className="text-sm text-[#9A8F82] mt-2">We&apos;ll reply within 24 hours.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'name',  label: 'Your Name', placeholder: 'Ghana Kumar',   type: 'text' },
                      { key: 'email', label: 'Email',     placeholder: 'you@email.com', type: 'email' },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="text-[10px] font-bold text-[#7A6E60] uppercase tracking-wider block mb-1.5">{field.label}</label>
                        <input type={field.type} placeholder={field.placeholder}
                          value={supportForm[field.key as 'name' | 'email']}
                          onChange={e => setSupportForm(f => ({ ...f, [field.key]: e.target.value }))}
                          className="w-full bg-white border border-[#E2D9C8] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#B8860B] transition-colors" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7A6E60] uppercase tracking-wider block mb-1.5">Message</label>
                    <textarea rows={5} placeholder="How can we help you?"
                      value={supportForm.message}
                      onChange={e => setSupportForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full bg-white border border-[#E2D9C8] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#B8860B] transition-colors resize-none" />
                  </div>

                  {supportError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {supportError}
                    </p>
                  )}

                  <button
                    onClick={handleSupportSubmit}
                    disabled={supportLoading}
                    className="w-full bg-[#1C1712] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#B8860B] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    {supportLoading ? 'Sending...' : 'Send Message →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-16 md:pb-15">
          <div className="relative bg-[#1C1712] rounded-3xl px-6 md:px-10 py-12 md:py-16 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 30% 50%, #B8860B, transparent 50%), radial-gradient(circle at 70% 50%, #6B3FA0, transparent 50%)',
            }} />
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }} />
            <div className="relative">
              <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-4">Get Started Today</p>
              <h2 className="font-serif text-3xl md:text-5xl text-white mb-4 md:mb-5">Ready to grow your business?</h2>
              <p className="text-white/50 text-base md:text-lg mb-8 md:mb-10 max-w-xl mx-auto">
                Join 3,800+ businesses using GK CRM to manage leads, projects, staff and billing — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => scrollTo('pricing')}
                  className="bg-[#B8860B] text-white px-8 md:px-10 py-4 rounded-xl text-sm font-bold hover:bg-[#9A7009] transition-all shadow-xl shadow-amber-900/30">
                  Start Free Trial — 14 Days →
                </button>
                <button onClick={() => router.push('/login')}
                  className="border-2 border-white/20 text-white px-8 md:px-10 py-4 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <GKFooter activePage="home" />
      </div>
    </>
  )
}