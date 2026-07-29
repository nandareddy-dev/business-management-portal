import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Clock, Calendar, FileText, User, HelpCircle, Cake, MessageSquareText,
  Megaphone, Lightbulb, ClipboardList, Users, Umbrella, FileBadge,
  QrCode, Lock, ShieldAlert, MapPin,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const menuItems = [
  { label: 'Attendance',     href: '/employee/attendance',           Icon: Clock,             color: '#16A34A' },
  { label: 'Leave',          href: '/employee/leave',                Icon: Calendar,          color: '#DC2626' },
  { label: 'Work Report',    href: '/employee/reports',              Icon: FileText,          color: '#2563EB' },
  { label: 'My Profile',     href: '/employee/profile',              Icon: User,              color: '#7C3AED' },
  { label: 'Self Help',      href: '/employee/menu/self-help',       Icon: HelpCircle,        color: '#0EA5E9' },
  { label: 'Birthday List',  href: '/employee/menu/birthday-list',   Icon: Cake,              color: '#F59E0B' },
  { label: 'Audit Feedback', href: '/employee/menu/audit-feedback',  Icon: MessageSquareText, color: '#22D3EE' },
  { label: 'Announcements',  href: '/employee/menu/announcements',   Icon: Megaphone,         color: '#16A34A' },
  { label: 'PKT',            href: '/employee/menu/pkt',             Icon: Lightbulb,         color: '#EC4899' },
  { label: 'Briefing',       href: '/employee/menu/briefing',        Icon: ClipboardList,     color: '#EA580C' },
  { label: 'Reference',      href: '/employee/menu/reference',       Icon: Users,             color: '#A855F7' },
  { label: 'Holidays',       href: '/employee/menu/holidays',        Icon: Umbrella,          color: '#1E293B' },
  { label: 'Salary Cert.',   href: '/employee/menu/salary-cert',     Icon: FileBadge,         color: '#059669' },
  { label: 'QR-Code',        href: '/employee/menu/qr-code',         Icon: QrCode,            color: '#334155' },
  { label: 'Privacy',        href: '/employee/menu/privacy',         Icon: Lock,              color: '#D97706' },
  { label: 'Posh Video',     href: '/employee/menu/posh-video',      Icon: ShieldAlert,       color: '#DC2626' },
  { label: 'Share Location', href: '/employee/menu/share-location',  Icon: MapPin,            color: '#15803D' },
]

export default async function EmployeeMenuPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
              <h1 className="text-[24px] text-white italic" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>Menu</h1>
              <p className="text-[11px] text-white/40 mt-1 tracking-wide" style={mono}>ALL SERVICES</p>
            </div>
          </div>

          {/* Grid */}
          <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25 px-6 py-6 lg:px-8">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-6">
              {menuItems.map((item) => {
                const Icon = item.Icon
                return (
                  <Link key={item.label} href={item.href} className="flex flex-col items-center gap-2 text-center hover:opacity-80 transition-opacity">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: item.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-[11px] text-[#1C1712] leading-tight" style={serif}>{item.label}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}