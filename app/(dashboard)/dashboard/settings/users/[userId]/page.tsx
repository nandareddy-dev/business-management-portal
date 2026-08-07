'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

const ini = (name: string) => name?.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase() || '?'

export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('employee')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [joinedAt, setJoinedAt] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, role, created_at')
          .eq('id', userId)
          .single()

        const { data: employee } = await supabase
          .from('employees')
          .select('designation, department, permissions, is_active, employee_code')
          .eq('user_id', userId)
          .single()

        if (profile) {
          setFullName(profile.full_name || '')
          setEmail(profile.email || '')
          setRole(profile.role || 'employee')
          setJoinedAt(profile.created_at)
        }
        if (employee) {
          setDesignation(employee.designation || '')
          setDepartment(employee.department || '')
          setPermissions(employee.permissions || [])
          setIsActive(employee.is_active ?? true)
          setEmployeeCode(employee.employee_code || '')
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load user')
      } finally {
        setLoading(false)
      }
    }
    if (userId) load()
  }, [userId])

  const togglePermission = (key: string) => {
    setPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/staff/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, role, designation, department, permissions, isActive }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Update failed')
        setSaving(false)
        return
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError('Network error. Please try again.')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/staff/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Delete failed')
        setDeleting(false)
        return
      }
      router.push('/dashboard/settings/users')
    } catch (err) {
      setError('Network error. Please try again.')
      setDeleting(false)
    }
  }

  if (loading) return (
    <main className="flex-1 p-4 md:p-8" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <div className="max-w-[640px] mx-auto space-y-5">
        <div className="skeleton h-9 w-52 rounded-lg" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
      <style>{`
        .skeleton { background: linear-gradient(90deg, #EDE8DC 25%, #F5F0E8 50%, #EDE8DC 75%); background-size: 200% 100%; animation: shimmer 1.4s ease infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </main>
  )

  return (
    <main className="flex-1 p-4 md:p-8" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <div className="max-w-[640px] mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
            {ini(fullName)}
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#B8860B] uppercase tracking-[4px] mb-1">Settings / Users</p>
            <h1 className="text-[26px] font-bold text-[#1C1712] leading-tight">{fullName || 'Edit User'}</h1>
            <p className="text-sm text-[#9A8F82]">{email}</p>
          </div>
        </div>

        {!isActive && (
          <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
            🚫 This user is deactivated and cannot log in.
          </div>
        )}

        <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 space-y-5"
          style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.03), 0 6px 18px rgba(28,23,18,0.05)' }}>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Full Name</FieldLabel>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]" />
            </div>
            <div>
              <FieldLabel>Employee Code</FieldLabel>
              <div className="readonly-field w-full rounded-xl px-3.5 py-2.5 text-sm" style={{ background: '#FAFAF8', color: '#9A8F82' }}>
                {employeeCode || '—'}
              </div>
            </div>
          </div>

          <div>
            <FieldLabel>Email</FieldLabel>
            <div className="w-full rounded-xl px-3.5 py-2.5 text-sm" style={{ background: '#FAFAF8', color: '#9A8F82' }}>{email}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Role</FieldLabel>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]">
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Designation</FieldLabel>
              <input type="text" value={designation} onChange={e => setDesignation(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]" />
            </div>
          </div>

          <div>
            <FieldLabel>Department</FieldLabel>
            <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1C1712] outline-none bg-white border-2 border-[#E2D9C8] focus:border-[#B8860B]" />
          </div>

          <div>
            <FieldLabel>Module Access</FieldLabel>
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

          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl" style={{ background: '#FAFAF8', border: '1px solid #F0EBE0' }}>
            <div>
              <p className="text-xs font-bold text-[#1C1712]">Account Status</p>
              <p className="text-[10px] text-[#9A8F82] mt-0.5">Deactivating blocks login immediately</p>
            </div>
            <div onClick={() => setIsActive(!isActive)}
              className="w-11 h-6 rounded-full flex items-center px-0.5 flex-shrink-0 cursor-pointer"
              style={{ background: isActive ? '#059669' : '#E2D9C8', justifyContent: isActive ? 'flex-end' : 'flex-start' }}>
              <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </div>
          </div>

          {joinedAt && (
            <p className="text-[10px] text-[#B8B0A0] text-center">
              Joined {new Date(joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
              ⚠ {error}
            </div>
          )}

          {success && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}>
              ✅ Changes saved
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-2">
            <button type="button" onClick={() => router.back()}
              className="px-5 py-3 rounded-xl text-sm font-bold text-[#7A6E60] bg-white border border-[#E8E2D8]">
              Back
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
              style={{ background: '#1C1712', boxShadow: '0 4px 14px rgba(28,23,18,0.25)' }}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white border border-[#FECACA] rounded-2xl p-5">
          <p className="text-xs font-black text-[#DC2626] uppercase tracking-wide mb-1">Danger Zone</p>
          <p className="text-[11px] text-[#9A8F82] mb-3">Permanently delete this user. This cannot be undone.</p>

          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#DC2626] border border-[#FECACA]" style={{ background: '#FEF2F2' }}>
              🗑️ Delete User
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-[#DC2626] font-semibold flex-1">Are you sure? This deletes their login permanently.</p>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-2 rounded-lg text-xs font-bold text-[#7A6E60] bg-white border border-[#E8E2D8]">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50" style={{ background: '#DC2626' }}>
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}