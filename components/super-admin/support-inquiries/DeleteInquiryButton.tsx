// components/super-admin/support-inquiries/DeleteInquiryButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, X, AlertTriangle } from 'lucide-react'

export default function DeleteInquiryButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/support-inquiries/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to delete. Try again.')
        setLoading(false)
        return
      }

      setShowModal(false)
      router.refresh() // re-fetch the server component's data
    } catch {
      alert('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
        title="Delete inquiry"
      >
        <Trash2 size={14} />
        Delete
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loading && setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-[#E2D9C8]">
            <button
              onClick={() => !loading && setShowModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-[#9A8F82] hover:bg-[#F5F0E8] hover:text-[#1C1712] transition-colors"
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle size={22} className="text-red-600" />
            </div>

            <h3 className="text-lg font-bold text-[#1C1712] mb-2">Delete this inquiry?</h3>
            <p className="text-sm text-[#7A6E60] mb-6">
              The message from <span className="font-semibold text-[#1C1712]">{name}</span> will be
              permanently deleted. This cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2D9C8] text-sm font-semibold text-[#1C1712] hover:bg-[#F5F0E8] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}