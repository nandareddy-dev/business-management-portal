import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Clock, Calendar, FileText, User, HelpCircle, Cake, MessageSquareText,
  Megaphone, Lightbulb, ClipboardList, Users, Umbrella, FileBadge,
  QrCode, Lock, ShieldAlert, MapPin, ChevronRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type Group = 'quick' | 'company' | 'more'

const menuItems: {
  label: string
  href: string
  Icon: typeof Clock
  color: string
  group: Group
  hint?: string
}[] = [
  // Quick access
  { label: 'Attendance',     href: '/employee/attendance',           Icon: Clock,             color: '#16A34A', group: 'quick', hint: 'Calendar & punches' },
  { label: 'Leave',          href: '/employee/leave',                Icon: Calendar,          color: '#DC2626', group: 'quick', hint: 'Balance & apply' },
  { label: 'Work Report',    href: '/employee/reports',              Icon: FileText,          color: '#2563EB', group: 'quick', hint: 'Daily report' },
  { label: 'My Profile',     href: '/employee/profile',              Icon: User,              color: '#7C3AED', group: 'quick', hint: 'Details & security' },

  // Company
  { label: 'Announcements',  href: '/employee/menu/announcements',   Icon: Megaphone,         color: '#16A34A', group: 'company' },
  { label: 'Holidays',       href: '/employee/menu/holidays',        Icon: Umbrella,          color: '#1E293B', group: 'company' },
  { label: 'Birthday List',  href: '/employee/menu/birthday-list',   Icon: Cake,              color: '#F59E0B', group: 'company' },
  { label: 'Briefing',       href: '/employee/menu/briefing',        Icon: ClipboardList,     color: '#EA580C', group: 'company' },
  { label: 'Reference',      href: '/employee/menu/reference',       Icon: Users,             color: '#A855F7', group: 'company' },
  { label: 'PKT',            href: '/employee/menu/pkt',             Icon: Lightbulb,         color: '#EC4899', group: 'company' },

  // Support & more
  { label: 'Salary Slips',   href: '/employee/menu/salary-slips',    Icon: FileBadge,         color: '#059669', group: 'more' },
  { label: 'Self Help',      href: '/employee/menu/self-help',       Icon: HelpCircle,        color: '#0EA5E9', group: 'more' },
  { label: 'Audit Feedback', href: '/employee/menu/audit-feedback',  Icon: MessageSquareText, color: '#22D3EE', group: 'more' },
  { label: 'QR-Code',        href: '/employee/menu/qr-code',         Icon: QrCode,            color: '#334155', group: 'more' },
  { label: 'Share Location', href: '/employee/menu/share-location',  Icon: MapPin,            color: '#15803D', group: 'more' },
  { label: 'Privacy',        href: '/employee/menu/privacy',         Icon: Lock,              color: '#D97706', group: 'more' },
  { label: 'Posh Video',     href: '/employee/menu/posh-video',      Icon: ShieldAlert,       color: '#DC2626', group: 'more' },
]

const SECTIONS: { key: Exclude<Group, 'quick'>; title: string; subtitle: string }[] = [
  { key: 'company', title: 'Company',          subtitle: 'News, holidays and team' },
  { key: 'more',    title: 'Support & more',   subtitle: 'Pay, help and policies' },
]

function MenuTile({ item }: { item: (typeof menuItems)[number] }) {
  const Icon = item.Icon

  return (
    <Link
      href={item.href}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-3.5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-105"
        style={{ backgroundColor: `${item.color}1A`, color: item.color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[11px] font-semibold leading-tight text-slate-800 sm:text-xs">{item.label}</p>
    </Link>
  )
}

export default async function EmployeeMenuPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const quick = menuItems.filter((i) => i.group === 'quick')

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-5 pb-28 lg:px-6 lg:py-6">

        {/* ── HERO ── */}
        <section className="relative isolate mb-6 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-7">
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

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Employee Portal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Menu</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-100">
            <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">All services</span>
            <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">{menuItems.length} items</span>
          </div>
        </section>

        {/* ── QUICK ACCESS ── */}
        <section className="mb-6">
          <div className="mb-3 px-1">
            <h2 className="text-sm font-bold text-slate-900">Quick access</h2>
            <p className="text-xs text-slate-500">Your everyday tools</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quick.map((item) => {
              const Icon = item.Icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-15 blur-xl"
                    style={{ backgroundColor: item.color }}
                  />
                  <div
                    className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg"
                    style={{ backgroundColor: item.color, boxShadow: `0 8px 18px -6px ${item.color}99` }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="relative mt-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{item.label}</p>
                      <p className="truncate text-[11px] text-slate-500">{item.hint}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── GROUPED SERVICES ── */}
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const items = menuItems.filter((i) => i.group === section.key)

            return (
              <section key={section.key} className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{section.title}</h2>
                    <p className="text-xs text-slate-500">{section.subtitle}</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {items.length}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
                  {items.map((item) => (
                    <MenuTile key={item.label} item={item} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}