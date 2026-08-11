'use client'

import { useState } from 'react'
import { KeyRound, X, CheckCircle2, XCircle } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export function ChangePasswordModal() {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const reset = () => {
    setNewPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  const close = () => {
    setOpen(false)
    reset()
  }

  const handleSubmit = async () => {
    setMessage(null)
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully' })
      setTimeout(close, 1200)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors px-4 py-3.5 text-left"
      >
        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
          <KeyRound className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Change password</p>
          <p className="text-xs text-gray-400">Set a new password for your account</p>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-medium text-gray-900">Change password</p>
              <button onClick={close} aria-label="Close" className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {message && (
              <p className={`text-xs mt-3 flex items-center gap-1.5 ${message.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {message.type === 'error'
                  ? <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  : <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                {message.text}
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={close}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !newPassword || !confirmPassword}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}