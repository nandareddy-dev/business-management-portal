import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, FileText, CheckCircle2, Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Module {
  title: string
  description: string
  duration: string
  type: 'video' | 'doc'
  status: 'completed' | 'available' | 'locked'
}

// Static content — replace with a Supabase `training_modules` table if you want progress tracked per employee.
const MODULES: Module[] = [
  {
    title: 'GK Digital Solutions — company overview',
    description: 'Who we are, our services, and how we work with clients.',
    duration: '10 min',
    type: 'video',
    status: 'completed',
  },
  {
    title: 'Digital marketing services deep-dive',
    description: 'SEO, social media, paid ads — what we offer and how to pitch it.',
    duration: '15 min',
    type: 'video',
    status: 'completed',
  },
  {
    title: 'GK Home Interiors — product knowledge',
    description: 'Interior design packages, pricing tiers, and the sales process.',
    duration: '12 min',
    type: 'video',
    status: 'available',
  },
  {
    title: 'Handling common client objections',
    description: 'Scripts and approaches for pricing pushback, timeline concerns, and comparisons.',
    duration: '8 min read',
    type: 'doc',
    status: 'available',
  },
  {
    title: 'CRM pipeline stages explained',
    description: 'New → Follow up → Site visit → Quotation → Won/Lost — what happens at each stage.',
    duration: '6 min read',
    type: 'doc',
    status: 'available',
  },
  {
    title: 'Advanced closing techniques',
    description: 'Unlocks after completing the objection-handling module.',
    duration: '10 min',
    type: 'video',
    status: 'locked',
  },
]

const statusStyle = {
  completed: { icon: CheckCircle2, badge: 'bg-emerald-50 text-emerald-600', label: 'Completed' },
  available: { icon: PlayCircle, badge: 'bg-blue-50 text-blue-600', label: 'Start' },
  locked:    { icon: Lock,       badge: 'bg-gray-100 text-gray-400', label: 'Locked' },
}

export default async function PktPage() {
  // Primary auth gate is middleware on /employee/*. This check is a
  // consistency + defense-in-depth measure matching the other employee
  // sub-pages, in case the middleware matcher config ever changes.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const completedCount = MODULES.filter(m => m.status === 'completed').length
  const totalCount = MODULES.length
  const progressPct = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-4 px-4">

        <Link href="/employee/menu" className="text-gray-400 text-xs flex items-center gap-1.5 mb-3 w-fit hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to menu
        </Link>
        <h1 className="text-xl font-medium text-gray-900">PKT</h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-5">Product knowledge training modules</p>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Your progress</p>
            <p className="text-sm font-medium text-blue-600">{completedCount} / {totalCount} completed</p>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Modules list */}
        <div className="space-y-3">
          {MODULES.map((m) => {
            const s = statusStyle[m.status]
            const Icon = s.icon
            const TypeIcon = m.type === 'video' ? PlayCircle : FileText
            const isLocked = m.status === 'locked'
            return (
              <div
                key={m.title}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 ${isLocked ? 'opacity-60' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${s.badge}`}>
                  <TypeIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{m.duration}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Icon className={`w-5 h-5 ${m.status === 'completed' ? 'text-emerald-500' : m.status === 'locked' ? 'text-gray-300' : 'text-blue-500'}`} />
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="h-20" />
    </div>
  )
}