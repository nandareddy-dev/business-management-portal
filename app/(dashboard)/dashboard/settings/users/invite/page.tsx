'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ROLE_OPTIONS = [
  { value: 'employee', label: '👤 Staff' },
  { value: 'manager', label: '🎯 Manager' },
  { value: 'tenant_admin', label: '👑 Admin' },
]

const PERMISSION_OPTIONS = [
  { key: 'pipeline', label: 'Pipeline', color: '#7C3AED' },
  { key: 'projects', label: 'Projects', color: '#EA580C' },
  { key: 'hr', label: 'HR', color: '#0284C7' },
  { key: 'finance', label: 'Finance', color: '#16A34A' },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-bold text-[#7A6E60] uppercase tracking-wide mb-1.5">{children}</label>
}

export default function InviteStaffPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    const loadCompany = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('company_id').eq('id', user.id).single()
      if (profile?.company_id) setCompanyId(profile.company_id)
    }
    loadCompany()
  }, [])

  const togglePermission = (key: string) => {
    setPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
    let pass = ''
    for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)]
    setPassword(pass)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) { setError('Company not found'); return }
    if (!fullName || !email || !password) { setError('Name, email and password are required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName, email, password, role, designation, department,
          employeeCode, permissions, companyId,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create user')
        setSaving(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/dashboard/settings/users'), 1500)
    } catch (err) {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  return (
    <main className="flex-1 p-4 md:p-8" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <div className="max-w-[640px] mx-auto space-y-6">

        <div>
          <p className="text-[10px] font-bold text-[#B8860B] uppercase tracking-[4px] mb-1.5">Settings / Users</p>
          <h1 className="text-[28px] font-bold text-[#1C1712]">Add New Staff</h1>
          <p className="text-sm text-[#9A8F82] mt-1.5">Create a login for a new team member.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E8E2D8] rounded-2xl p-6 space-y-5"
          style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.03), 0 6px 18px rgba(28,23,18,0.05)' }}>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Full Name *</FieldLabel>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Hari Krishna"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]" />
            </div>
            <div>
              <FieldLabel>Employee Code</FieldLabel>
              <input type="text" value={employeeCode} onChange={e => setEmployeeCode(e.target.value)}
                placeholder="e.g. GKH-004"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]" />
            </div>
          </div>

          <div>
            <FieldLabel>Email *</FieldLabel>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="staff@example.com"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]" />
          </div>

          <div>
            <FieldLabel>Password *</FieldLabel>
            <div className="flex gap-2">
              <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]" />
              <button type="button" onClick={generatePassword}
                className="px-4 rounded-xl text-xs font-bold text-white flex-shrink-0" style={{ background: '#1C1712' }}>
                Generate
              </button>
            </div>
            <p className="text-[10px] text-[#B8B0A0] mt-1.5">Share this password with the employee securely. They can change it later.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Role *</FieldLabel>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]">
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Designation</FieldLabel>
              <input type="text" value={designation} onChange={e => setDesignation(e.target.value)}
                placeholder="e.g. CRE, Designer"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]" />
            </div>
          </div>

          <div>
            <FieldLabel>Department</FieldLabel>
            <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. Sales, Design, Operations"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]" />
          </div>

          <div>
            <FieldLabel>Module Access (leave empty for full access)</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {PERMISSION_OPTIONS.map(p => (
                <button key={p.key} type="button" onClick={() => togglePermission(p.key)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border-2"
                  style={{
                    background: permissions.includes(p.key) ? p.color : '#fff',
                    color: permissions.includes(p.key) ? '#fff' : p.color,
                    borderColor: p.color,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
              ⚠ {error}
            </div>
          )}

          {success && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}>
              ✅ Staff added successfully! Redirecting...
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-2">
            <button type="button" onClick={() => router.back()}
              className="px-5 py-3 rounded-xl text-sm font-bold text-[#7A6E60] bg-white border border-[#E8E2D8]">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
              style={{ background: '#1C1712', boxShadow: '0 4px 14px rgba(28,23,18,0.25)' }}>
              {saving ? '⏳ Creating...' : '➕ Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}