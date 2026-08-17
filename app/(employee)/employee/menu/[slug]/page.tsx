import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Construction } from 'lucide-react'

export const dynamic = 'force-dynamic'

const LABELS: Record<string, string> = {
  'self-help':       'Self Help',
  'birthday-list':   'Birthday List',
  'audit-feedback':  'Audit Feedback',
  'announcements':   'Announcements',
  'pkt':             'PKT',
  'briefing':        'Briefing',
  'reference':       'Reference',
  'holidays':        'Holidays',
  'salary-cert':     'Salary Certificate',
  'qr-code':         'QR-Code',
  'privacy':         'Privacy',
  'posh-video':      'Posh Video',
  'share-location':  'Share Location',
}

export default async function MenuPlaceholderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Unknown slug — don't silently mask it as "coming soon"; a genuinely
  // missing/mistyped route should 404 so broken links surface, not hide.
  if (!LABELS[slug]) notFound()
  const label = LABELS[slug]

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

          <div className="bg-[#1C1712] px-6 py-5 lg:px-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05]" style={{
              backgroundImage: 'linear-gradient(#B8860B 1px, transparent 1px), linear-gradient(90deg, #B8860B 1px, transparent 1px)',
              backgroundSize: '28px 28px'
            }} />
            <div className="relative">
              <Link href="/employee/menu" className="text-white/40 text-[10px] tracking-[1.5px] uppercase flex items-center gap-1.5 mb-3 w-fit hover:text-[#D4A537] transition-colors" style={mono}>
                <ArrowLeft className="w-3 h-3" /> Back to menu
              </Link>
              <h1 className="text-[24px] text-white italic" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>{label}</h1>
            </div>
          </div>

          <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25 px-6 py-16 lg:px-8 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full border border-[#B8860B]/40 flex items-center justify-center mb-4">
              <Construction className="w-6 h-6 text-[#8B6914]" />
            </div>
            <p className="text-[16px] text-[#1C1712]" style={serif}>{label} is on its way</p>
            <p className="text-[12px] text-[#9A8F82] mt-2 max-w-xs">This section is being built. Check back soon.</p>
          </div>
        </div>
      </div>
    </div>
  )
}