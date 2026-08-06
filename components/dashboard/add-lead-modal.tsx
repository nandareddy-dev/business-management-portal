'use client'

import { useState, useRef } from 'react'
import {
  X, Plus, Trash2, User, Users, ChevronDown,
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2,
  Zap, Database, Phone, UserX,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
interface SingleLead {
  name: string
  phone: string
  email: string
  source: string
  budget: string
  propertyType: string
  city: string
  manualCity: string
  interest: string
  status: string
  notes: string
}

export interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadsAdded?: (leads: SingleLead[]) => void
  industry?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const emptyLead: SingleLead = {
  name: '', phone: '', email: '',
  source: '', budget: '', propertyType: '',
  city: '', manualCity: '', interest: '',
  status: 'new', notes: '',
}

// Placeholder texts shown in inputs — NEVER allow these to be saved as real values.
const BUDGET_PLACEHOLDER_PATTERNS = ['₹5–8l', '₹5-8l']

// Statuses that mean "this old lead is dead" — if a duplicate phone matches a lead
// in one of these states, it's reactivated (moved back to New) instead of being
// treated as a blocking duplicate. Any other status still blocks as a true duplicate.
const REACTIVATABLE_STATUSES = new Set(['lost', 'not_interested', 'notinterested'])

function isReactivatableStatus(s?: string | null): boolean {
  if (!s) return false
  return REACTIVATABLE_STATUSES.has(s.toLowerCase().trim().replace(/\s+/g, '_'))
}

const sources = [
  'Instagram', 'Facebook', 'WhatsApp', 'Google Ads', 'YouTube',
  'LinkedIn', 'Justdial', 'IndiaMART', 'UrbanClap', 'Housing.com',
  '99acres', 'MagicBricks', 'Direct Walk-In', 'Referral',
  'SMS Campaign', 'Flyers', 'Hoardings', 'Newspaper Ads',
  'Lokal App', 'Email Campaign', 'Other',
]

const propertyTypes = [
  '1 BHK Apartment', '2 BHK Apartment', '3 BHK Apartment', '4 BHK Apartment',
  'Villa / Independent House', 'Row House', 'Plot / Land', 'Commercial Space',
  'Office Space', 'Shop / Showroom', 'Penthouse', 'Studio Apartment', 'Other',
]

const tsCities = ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Nalgonda', 'Rangareddy', 'Siddipet', 'Suryapet', 'Sangareddy']
const apCities = ['Vijayawada', 'Visakhapatnam', 'Tirupati', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Kakinada', 'Anantapur', 'Eluru', 'YSR Kadapa']

// ─── Phone helpers ──────────────────────────────────────────────────────────
// Only accepts EXACTLY 10 digits (after stripping an optional 91/0 prefix).
// Anything else — too short, too long, name mixed in — is rejected, NEVER truncated.
function getPhoneDigits(phone: string): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits.length === 10 ? digits : ''  // reject, don't truncate
}

function formatIndianPhone(phone: string): string {
  const last10 = getPhoneDigits(phone)
  return last10.length === 10 ? `+91${last10}` : phone.trim()
}

function isSamePhone(phone1: string, phone2: string): boolean {
  const d1 = getPhoneDigits(phone1)
  const d2 = getPhoneDigits(phone2)
  return d1.length === 10 && d1 === d2
}

// A phone field is "invalid" (should show red) once the person has typed something
// that isn't a clean phone number — an empty field is just incomplete, not invalid.
// Two ways a phone can be invalid:
//   1. It has letters mixed in (e.g. "Ramesh 9876543210") — even though 10 digits can be
//      extracted, this needs a human's eyes before saving, so it's flagged for review.
//   2. The digit count isn't exactly 10 after stripping a country/trunk prefix.
function isPhoneInvalid(phone: string): boolean {
  const trimmed = phone.trim()
  if (!trimmed) return false
  if (/[a-zA-Z]/.test(trimmed)) return true  // letters present — flag for manual review
  return getPhoneDigits(trimmed).length !== 10
}

// Human-readable reason shown under an invalid phone field.
function phoneInvalidReason(phone: string): string {
  const trimmed = phone.trim()
  if (/[a-zA-Z]/.test(trimmed)) return 'Remove extra text — phone should be numbers only'
  return 'Must be exactly 10 digits'
}

// ─── Budget helper ────────────────────────────────────────────────────────────
function cleanBudget(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (BUDGET_PLACEHOLDER_PATTERNS.includes(trimmed.toLowerCase())) return null
  return trimmed
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getCompanyId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
    return data?.company_id || null
  } catch { return null }
}

function toRow(lead: SingleLead, companyId: string | null, industry: string) {
  const finalCity = lead.city === '__manual__' ? lead.manualCity : lead.city
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return {
    company_id: companyId,
    lead_name: lead.name.trim(),
    phone: lead.phone.trim() ? formatIndianPhone(lead.phone) : null,
    email: lead.email.trim() || null,
    source: lead.source || null,
    status: lead.status.charAt(0).toUpperCase() + lead.status.slice(1),
    budget: cleanBudget(lead.budget),
    property_type: lead.propertyType || null,
    city: finalCity || null,
    interest: lead.interest || null,
    notes: lead.notes || null,
    industry,
    date: today,
  }
}

// Fields to overwrite on an existing DB row when reactivating a lost/not-interested
// lead back to fresh — carries the new contact's updated info onto the old record
// instead of leaving stale data, while resetting the pipeline position to New.
function toReactivateRow(lead: SingleLead) {
  const finalCity = lead.city === '__manual__' ? lead.manualCity : lead.city
  return {
    lead_name: lead.name.trim(),
    email: lead.email.trim() || null,
    source: lead.source || null,
    status: 'New',
    pipeline_stage: 'new',
    budget: cleanBudget(lead.budget),
    property_type: lead.propertyType || null,
    city: finalCity || null,
    interest: lead.interest || null,
    notes: lead.notes || null,
  }
}

// Case/whitespace-insensitive match against a known options list — returns the
// canonical option string if found, otherwise null.
function matchOption(raw: string, options: string[]): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const found = options.find(o => o.toLowerCase() === trimmed.toLowerCase())
  return found || null
}

function parseCSV(text: string, knownCities: string[], knownSources: string[]): SingleLead[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = headers.indexOf(k)
        if (idx !== -1 && cols[idx]) return cols[idx]
      }
      return ''
    }

    // City: match against the known TS/AP list case-insensitively. If matched,
    // use the canonical name; if not, keep the raw value as-is — the caller
    // adds it as an extra dropdown option so it shows up selected, not blank.
    const rawCity = get(['city', 'location'])
    const cityMatch = matchOption(rawCity, knownCities)
    const city = cityMatch || rawCity

    // Source: match against the known list case-insensitively. If the CSV has
    // a source we don't recognize, keep the raw value as-is — the caller adds
    // it as an extra dropdown option so it still shows selected, not blank.
    const rawSource = get(['source', 'lead_source'])
    const sourceMatch = matchOption(rawSource, knownSources)
    const source = sourceMatch || rawSource

    return {
      name: get(['name', 'full_name', 'lead_name']),
      phone: get(['phone', 'mobile', 'contact']),
      email: get(['email', 'email_address']) || '',
      source,
      budget: get(['budget']),
      propertyType: get(['property_type', 'type', 'property']),
      city,
      manualCity: '',
      interest: get(['interest', 'requirement']),
      status: get(['status', 'lead_status']) || 'new',
      notes: get(['notes', 'remarks']),
    }
  }).filter(l => l.name || l.phone)
}

// ─── Animation styles (scoped, injected once per mount) ──────────────────────
const MODAL_ANIMATIONS = `
@keyframes gkBackdropIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes gkModalIn {
  from { opacity: 0; transform: translateY(18px) scale(0.96) }
  to   { opacity: 1; transform: translateY(0) scale(1) }
}
@keyframes gkFieldIn {
  from { opacity: 0; transform: translateY(8px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes gkRowIn {
  from { opacity: 0; transform: translateY(-6px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes gkShake {
  10%, 90% { transform: translateX(-1px) }
  20%, 80% { transform: translateX(2px) }
  30%, 50%, 70% { transform: translateX(-4px) }
  40%, 60% { transform: translateX(4px) }
}
@keyframes gkPopIn {
  0% { opacity: 0; transform: scale(0.6) }
  60% { opacity: 1; transform: scale(1.08) }
  100% { opacity: 1; transform: scale(1) }
}
@keyframes gkPulseBorder {
  0%, 100% { border-color: #B8860B; box-shadow: 0 0 0 0 rgba(184,134,11,0.15) }
  50% { border-color: #D4A017; box-shadow: 0 0 0 8px rgba(184,134,11,0.06) }
}
.gk-backdrop { animation: gkBackdropIn 200ms ease both }
.gk-modal { animation: gkModalIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both }
.gk-field { opacity: 0; animation: gkFieldIn 380ms cubic-bezier(0.22, 1, 0.36, 1) both }
.gk-row-in { animation: gkRowIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both }
.gk-shake { animation: gkShake 420ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both }
.gk-pop { animation: gkPopIn 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both }
.gk-drop-active { animation: gkPulseBorder 1.1s ease-in-out infinite }
.gk-input-focus { transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease }
.gk-input-focus:focus { box-shadow: 0 0 0 4px rgba(184,134,11,0.12) }
.gk-btn { transition: transform 150ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 150ms ease, background-color 180ms ease, border-color 180ms ease }
.gk-btn:hover:not(:disabled) { transform: translateY(-1px) }
.gk-btn:active:not(:disabled) { transform: translateY(0) scale(0.97) }
.gk-icon-btn { transition: transform 150ms ease, background-color 150ms ease, color 150ms ease }
.gk-icon-btn:hover:not(:disabled) { transform: scale(1.06) }
.gk-icon-btn:active:not(:disabled) { transform: scale(0.92) }
.gk-tab-thumb { transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1) }
.gk-table-row { transition: background-color 150ms ease }
@media (prefers-reduced-motion: reduce) {
  .gk-backdrop, .gk-modal, .gk-field, .gk-row-in, .gk-shake, .gk-pop, .gk-drop-active { animation: none !important }
  .gk-btn, .gk-icon-btn, .gk-tab-thumb { transition: none !important }
}
`

// ─── Component ────────────────────────────────────────────────────────────────
export function AddLeadModal({ isOpen, onClose, onLeadsAdded, industry = 'general' }: AddLeadModalProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [bulkTab, setBulkTab] = useState<'manual' | 'upload'>('manual')
  const [singleLead, setSingleLead] = useState<SingleLead>(emptyLead)
  const [bulkLeads, setBulkLeads] = useState<SingleLead[]>([{ ...emptyLead }, { ...emptyLead }])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; count: number } | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [dbDuplicatePhones, setDbDuplicatePhones] = useState<Set<string>>(new Set())
  const [errorShakeKey, setErrorShakeKey] = useState(0)
  const [newRowIndices, setNewRowIndices] = useState<Set<number>>(new Set())
  // Source values found in an uploaded file that aren't in the built-in `sources`
  // list — added as extra dropdown options so an uploaded lead's source shows
  // selected instead of appearing blank.
  const [customSources, setCustomSources] = useState<string[]>([])
  // Same idea for city — CSV localities/towns not in the built-in TS/AP list
  // (e.g. "Bachupally") get added as extra dropdown options.
  const [customCities, setCustomCities] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const isManualCity = singleLead.city === '__manual__'
  // Combined dropdown lists: built-in options + anything unrecognized pulled
  // in from an uploaded file, so uploaded rows always show a selected value.
  const allSources = [...sources, ...customSources]

  // ── Computed counts (derived from current bulkLeads) ──
  const noPhoneCount = bulkLeads.filter(l => l.name.trim() && !l.phone.trim()).length
  const noNameCount  = bulkLeads.filter(l => !l.name.trim()).length
  const invalidPhoneCount = bulkLeads.filter(l => isPhoneInvalid(l.phone)).length
  const totalInvalid = bulkLeads.filter(l => !l.name.trim() || !l.phone.trim() || isPhoneInvalid(l.phone)).length
  const activeLead   = bulkLeads.filter(l => l.name.trim()).length

  // Duplicate count — compares by last-10-digits, not raw string
  const dupPhoneCount = (() => {
    const seen = new Set<string>()
    return bulkLeads.filter(l => {
      const d = getPhoneDigits(l.phone)
      if (d.length !== 10) return false
      if (seen.has(d)) return true
      seen.add(d); return false
    }).length
  })()

  // ── Error flags ──
  const hasPhoneErr    = errors.some(e => e.includes('Phone required'))
  const hasNameErr     = errors.some(e => e.includes('Name required'))
  const hasBatchDup    = errors.some(e => e.includes('Duplicate phones'))
  const hasDbDup       = errors.some(e => e.includes('Already exists in DB'))
  const hasInvalidErr  = errors.some(e => e.includes('Invalid phone'))
  const showFixBar     = mode === 'bulk' && (hasPhoneErr || hasNameErr || hasBatchDup || hasDbDup || hasInvalidErr)

  const pushErrors = (errs: string[]) => {
    setErrors(errs)
    setErrorShakeKey(k => k + 1)
  }

  // ── Validation ──
  const validateSingle = () => {
    const errs: string[] = []
    if (!singleLead.name.trim()) errs.push('Name is required')
    if (!singleLead.phone.trim()) errs.push('Phone is required')
    else if (isPhoneInvalid(singleLead.phone)) errs.push('Invalid phone — must be exactly 10 digits')
    if (!singleLead.source) errs.push('Source is required')
    return errs
  }

  const validateBulk = () => {
    const errs: string[] = []
    bulkLeads.forEach((lead, i) => {
      if (!lead.name.trim()) errs.push(`Row ${i + 1}: Name required`)
      if (!lead.phone.trim()) errs.push(`Row ${i + 1}: Phone required`)
      else if (isPhoneInvalid(lead.phone)) errs.push(`Row ${i + 1}: Invalid phone — must be exactly 10 digits`)
    })
    return errs
  }

  // ── Submit ──
  const handleSubmit = async () => {
    const errs = mode === 'single' ? validateSingle() : validateBulk()
    if (errs.length > 0) { pushErrors(errs); return }
    setErrors([])
    setLoading(true)

    try {
      const companyId = await getCompanyId()

      if (mode === 'single') {
        const phoneDigits = getPhoneDigits(singleLead.phone)

        const { data: candidates } = await supabase
          .from('leads').select('id, lead_name, phone, pipeline_stage, status')
          .eq('company_id', companyId)
          .like('phone', `%${phoneDigits}`)

        const existing = candidates?.find(c => isSamePhone(c.phone || '', singleLead.phone))

        if (existing) {
          const existingStatus = existing.pipeline_stage || existing.status
          if (isReactivatableStatus(existingStatus)) {
            // Old lead is lost / not-interested — reactivate it back to fresh
            // instead of blocking as a duplicate.
            const { error: reactivateError } = await supabase
              .from('leads')
              .update(toReactivateRow(singleLead))
              .eq('id', existing.id)
            if (reactivateError) {
              pushErrors([`Reactivate failed: ${reactivateError.message}`])
              setLoading(false); return
            }
          } else {
            pushErrors([`⚠ Phone ${formatIndianPhone(singleLead.phone)} already exists — registered as "${existing.lead_name}".`])
            setLoading(false); return
          }
        } else {
          const { error } = await supabase.from('leads').insert(toRow(singleLead, companyId, industry))
          if (error) {
            pushErrors([error.code === '23505' ? '⚠ This phone number is already registered' : `Save failed: ${error.message}`])
            setLoading(false); return
          }
        }

      } else {
        const validLeads = bulkLeads.filter(l => l.name.trim())
        if (!validLeads.length) { pushErrors(['At least one lead with a name is required']); setLoading(false); return }

        const phonesInBatch = validLeads.map(l => l.phone.trim()).filter(Boolean)
        const digitsInBatch = phonesInBatch.map(getPhoneDigits).filter(d => d.length === 10)
        const uniqueDigits = new Set(digitsInBatch)
        if (uniqueDigits.size !== digitsInBatch.length) {
          const seen = new Set<string>()
          const dupDigits = digitsInBatch.filter(d => { if (seen.has(d)) return true; seen.add(d); return false })
          const dupPhonesDisplay = [...new Set(dupDigits)].map(d => `+91${d}`)
          pushErrors([`⚠ Duplicate phones in this batch: ${dupPhonesDisplay.join(', ')}`])
          setLoading(false); return
        }

        // Chunk the duplicate-check lookup — a single `.or()` filter with hundreds
        // of clauses can exceed Supabase's query/URL size limits and silently
        // return incomplete results, letting real duplicates slip through to the
        // insert (where they'd fail as a generic, unhelpful 23505 error). Chunking
        // keeps every query well within limits regardless of batch size.
        const CHUNK_SIZE = 150
        type ExistingLeadRow = { id: string; phone: string; lead_name: string; pipeline_stage: string | null; status: string | null }
        const existingInDB: ExistingLeadRow[] = []
        for (let i = 0; i < digitsInBatch.length; i += CHUNK_SIZE) {
          const chunk = digitsInBatch.slice(i, i + CHUNK_SIZE)
          const orFilter = chunk.map(d => `phone.like.%${d}`).join(',')
          if (!orFilter) continue
          const { data, error: lookupError } = await supabase
            .from('leads').select('id, phone, lead_name, pipeline_stage, status')
            .eq('company_id', companyId)
            .or(orFilter)
          if (lookupError) {
            pushErrors([`Duplicate check failed: ${lookupError.message}`])
            setLoading(false); return
          }
          if (data) existingInDB.push(...(data as ExistingLeadRow[]))
        }

        const matchedDupes = existingInDB.filter(e =>
          phonesInBatch.some(p => isSamePhone(e.phone || '', p))
        )

        // Split matches: lost/not-interested → reactivate; anything else → true blocking duplicate.
        const reactivateMatches = matchedDupes.filter(e => isReactivatableStatus(e.pipeline_stage || e.status))
        const blockingMatches   = matchedDupes.filter(e => !isReactivatableStatus(e.pipeline_stage || e.status))

        if (blockingMatches.length > 0) {
          const dupPhones = new Set(blockingMatches.map(e => getPhoneDigits(e.phone)))
          setDbDuplicatePhones(dupPhones)
          const dupList = blockingMatches.slice(0, 20).map(e => `${formatIndianPhone(e.phone)} (${e.lead_name})`).join(', ')
          const suffix = blockingMatches.length > 20 ? ` and ${blockingMatches.length - 20} more` : ''
          pushErrors([`⚠ Already exists in DB (${blockingMatches.length} total): ${dupList}${suffix}`])
          setLoading(false); return
        }

        // Reactivate any lost/not-interested matches — carry the fresh data onto
        // the existing record and reset its pipeline stage to New. Chunked to
        // avoid hammering the DB with hundreds of parallel requests at once.
        if (reactivateMatches.length > 0) {
          for (let i = 0; i < reactivateMatches.length; i += CHUNK_SIZE) {
            const chunk = reactivateMatches.slice(i, i + CHUNK_SIZE)
            await Promise.all(chunk.map(match => {
              const matchedLead = validLeads.find(l => isSamePhone(l.phone, match.phone))
              if (!matchedLead) return Promise.resolve()
              return supabase.from('leads').update(toReactivateRow(matchedLead)).eq('id', match.id)
            }))
          }
        }

        // Insert only the leads that weren't just reactivated above — chunked so
        // large uploads (hundreds of rows) don't risk a single oversized request.
        const reactivatedDigits = new Set(reactivateMatches.map(e => getPhoneDigits(e.phone)))
        const leadsToInsert = validLeads.filter(l => !reactivatedDigits.has(getPhoneDigits(l.phone)))

        for (let i = 0; i < leadsToInsert.length; i += CHUNK_SIZE) {
          const chunk = leadsToInsert.slice(i, i + CHUNK_SIZE)
          const { error } = await supabase.from('leads').insert(chunk.map(l => toRow(l, companyId, industry)))
          if (error) {
            pushErrors([error.code === '23505' ? '⚠ One or more phone numbers already registered' : `Save failed: ${error.message}`])
            setLoading(false); return
          }
        }
      }

      onLeadsAdded?.(mode === 'single' ? [singleLead] : bulkLeads.filter(l => l.name.trim()))
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setSingleLead(emptyLead)
        setBulkLeads([{ ...emptyLead }, { ...emptyLead }])
        setUploadedFile(null)
        onClose()
      }, 1200)

    } catch (err: unknown) {
      pushErrors([`Error: ${err instanceof Error ? err.message : 'Unknown error'}`])
    } finally {
      setLoading(false)
    }
  }

  // ── Bulk row helpers ──
  const addBulkRow = () => {
    setBulkLeads(p => {
      const nextIndex = p.length
      setNewRowIndices(prev => new Set(prev).add(nextIndex))
      return [...p, { ...emptyLead }]
    })
  }
  const removeBulkRow = (i: number) => { if (bulkLeads.length > 1) setBulkLeads(p => p.filter((_, idx) => idx !== i)) }
  const updateBulkLead = (i: number, field: keyof SingleLead, value: string) => {
    setBulkLeads(p => { const u = [...p]; u[i] = { ...u[i], [field]: value }; return u })
  }

  // ── Smart fix handlers ──
  const clearAndSwitch = (filtered: SingleLead[]) => {
    setBulkLeads(filtered.length > 0 ? filtered : [{ ...emptyLead }])
    setUploadedFile(null)
    setErrors([])
  }

  const fixNoPhone = () => clearAndSwitch(bulkLeads.filter(l => l.phone.trim()))
  const fixNoName  = () => clearAndSwitch(bulkLeads.filter(l => l.name.trim()))
  const fixAll     = () => clearAndSwitch(bulkLeads.filter(l => l.name.trim() && l.phone.trim() && !isPhoneInvalid(l.phone)))
  const fixInvalidPhone = () => clearAndSwitch(bulkLeads.filter(l => !isPhoneInvalid(l.phone)))

  const fixBatchDuplicates = () => {
    const seen2 = new Set<string>()
    clearAndSwitch(bulkLeads.filter(l => {
      const d = getPhoneDigits(l.phone)
      if (d.length !== 10) return true
      if (seen2.has(d)) return false
      seen2.add(d); return true
    }))
  }

  const fixDbDuplicates = () => {
    clearAndSwitch(bulkLeads.filter(l => !dbDuplicatePhones.has(getPhoneDigits(l.phone))))
    setDbDuplicatePhones(new Set())
  }

  // ── File processing ──
  const processFile = (file: File) => {
    setUploadError(''); setUploadedFile(null)
    const isCSV  = file.name.endsWith('.csv')
    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    if (!isCSV && !isXLSX) { setUploadError('Only .csv, .xlsx, or .xls files supported.'); return }

    const knownCities = [...tsCities, ...apCities]

    const applyParsedLeads = (leads: SingleLead[]) => {
      if (!leads.length) { setUploadError('No valid data found in the file.'); return }
      // Collect any source/city strings the file used that aren't in our
      // built-in lists, so the dropdowns can show them as real selected options.
      const unmatchedSources = [...new Set(
        leads.map(l => l.source.trim()).filter(s => s && !sources.includes(s))
      )]
      if (unmatchedSources.length) setCustomSources(prev => [...new Set([...prev, ...unmatchedSources])])

      const unmatchedCities = [...new Set(
        leads.map(l => l.city.trim()).filter(c => c && c !== '__manual__' && !knownCities.includes(c))
      )]
      if (unmatchedCities.length) setCustomCities(prev => [...new Set([...prev, ...unmatchedCities])])

      setBulkLeads(leads); setUploadedFile({ name: file.name, count: leads.length })
    }

    if (isXLSX) {
      const reader = new FileReader()
      reader.onload = (e) => {
        import('xlsx').then(XLSX => {
          const wb = XLSX.read(e.target?.result, { type: 'array' })
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])
          applyParsedLeads(parseCSV(csv, knownCities, sources))
        }).catch(() => setUploadError('Install xlsx package: npm i xlsx'))
      }
      reader.readAsArrayBuffer(file); return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      applyParsedLeads(parseCSV(e.target?.result as string, knownCities, sources))
    }
    reader.readAsText(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f) }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }

  const downloadSample = () => {
    const csv = [
      'name,phone,source,budget,property_type,city,interest',
      'Rajesh Kumar,9876543210,Instagram,₹5-8L,2 BHK Apartment,Hyderabad,Living Room',
      'Priya Sharma,9123456789,Referral,₹10-15L,Villa / Independent House,Vijayawada,Full Interior',
    ].join('\n')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'leads_sample.csv',
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  // ── Style constants ──
  const inp  = "gk-input-focus w-full bg-[#F5F0E8] border border-[#E2D9C8] rounded-lg px-3 py-2 text-sm text-[#1C1712] placeholder:text-[#B8B0A0] outline-none focus:border-[#B8860B]"
  const lbl  = "text-[10px] font-semibold text-[#7A6E60] uppercase tracking-wide block mb-1"
  const sel  = "gk-input-focus w-full bg-[#F5F0E8] border border-[#E2D9C8] rounded-lg px-3 py-2 text-sm text-[#1C1712] outline-none focus:border-[#B8860B] appearance-none"
  const bInp = "gk-input-focus w-full bg-[#F5F0E8] border border-[#E2D9C8] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1712] outline-none focus:border-[#B8860B]"

  const singlePhoneInvalid = isPhoneInvalid(singleLead.phone)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <style>{MODAL_ANIMATIONS}</style>
      <div className="gk-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="gk-modal relative bg-[#FDFAF4] rounded-2xl border border-[#E2D9C8] w-full shadow-2xl shadow-black/20 flex flex-col"
        style={{ maxWidth: mode === 'bulk' ? '980px' : '540px', maxHeight: '92vh' }}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2D9C8] flex-shrink-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Plus size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-serif text-lg text-[#1C1712] leading-tight">Add Leads</h2>
              <p className="text-[10px] text-[#9A8F82] flex items-center gap-1 mt-0.5">
                <Database size={9} /> Saved directly to Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="gk-icon-btn w-8 h-8 rounded-lg border border-[#E2D9C8] flex items-center justify-center text-[#7A6E60] hover:bg-[#F0EBE0] hover:text-[#1C1712]">
            <X size={14} />
          </button>
        </div>

        {/* ── Mode Toggle (sliding thumb) ── */}
        <div className="px-5 pt-4 flex-shrink-0">
          <div className="relative flex gap-1.5 p-1 bg-[#F0EBE0] rounded-xl w-fit">
            <div
              className="gk-tab-thumb absolute top-1 bottom-1 left-1 rounded-lg bg-[#1C1712] shadow-md"
              style={{
                width: 'calc(50% - 4px)',
                transform: mode === 'bulk' ? 'translateX(calc(100% + 6px))' : 'translateX(0)',
              }}
            />
            {(['single', 'bulk'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setErrors([]) }}
                className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                  mode === m ? 'text-white' : 'text-[#7A6E60] hover:text-[#1C1712]'
                }`}>
                {m === 'single' ? <User size={13} /> : <Users size={13} />}
                {m === 'single' ? 'Single Lead' : 'Bulk Leads'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ── SINGLE LEAD FORM ── */}
          {mode === 'single' && (
            <div key="single-form" className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 gk-field" style={{ animationDelay: '0ms' }}>
                <div>
                  <label className={lbl}>Full Name *</label>
                  <input type="text" placeholder="Rajesh Kumar"
                    value={singleLead.name}
                    onChange={e => setSingleLead({ ...singleLead, name: e.target.value })}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>
                    Phone *
                    {singlePhoneInvalid && <span className="ml-1.5 text-red-500 normal-case font-semibold">— {phoneInvalidReason(singleLead.phone)}</span>}
                  </label>
                  <div className={`gk-input-focus flex rounded-lg overflow-hidden border ${
                    singlePhoneInvalid ? 'border-red-300' : 'border-[#E2D9C8] focus-within:border-[#B8860B]'
                  }`}>
                    <div className={`flex items-center px-3 text-sm font-bold border-r flex-shrink-0 select-none ${
                      singlePhoneInvalid ? 'bg-red-50 text-red-400 border-red-200' : 'text-[#7A6E60] bg-[#EDE8DC] border-[#E2D9C8]'
                    }`}>+91</div>
                    <input type="tel" placeholder="98765 43210"
                      value={singleLead.phone.replace(/^\+91/, '')}
                      onChange={e => setSingleLead({ ...singleLead, phone: '+91' + e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className={`flex-1 px-3 py-2 text-sm placeholder:text-[#B8B0A0] outline-none min-w-0 ${
                        singlePhoneInvalid ? 'bg-red-50 text-red-700' : 'bg-[#F5F0E8] text-[#1C1712]'
                      }`} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 gk-field" style={{ animationDelay: '40ms' }}>
                <div>
                  <label className={lbl}>Lead Source *</label>
                  <div className="relative">
                    <select value={singleLead.source} onChange={e => setSingleLead({ ...singleLead, source: e.target.value })} className={sel}>
                      <option value="">Select source</option>
                      {sources.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6E60] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Budget</label>
                  <input type="text" placeholder="₹5–8L" value={singleLead.budget}
                    onChange={e => setSingleLead({ ...singleLead, budget: e.target.value })} className={inp} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 gk-field" style={{ animationDelay: '80ms' }}>
                <div>
                  <label className={lbl}>Property Type</label>
                  <div className="relative">
                    <select value={singleLead.propertyType} onChange={e => setSingleLead({ ...singleLead, propertyType: e.target.value })} className={sel}>
                      <option value="">Select type</option>
                      {propertyTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6E60] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Location / City</label>
                  <div className="relative">
                    <select value={singleLead.city}
                      onChange={e => setSingleLead({ ...singleLead, city: e.target.value, manualCity: '' })} className={sel}>
                      <option value="">Select city</option>
                      <optgroup label="Telangana (TS)">{tsCities.map(c => <option key={c}>{c}</option>)}</optgroup>
                      <optgroup label="Andhra Pradesh (AP)">{apCities.map(c => <option key={c}>{c}</option>)}</optgroup>
                      {customCities.length > 0 && (
                        <optgroup label="Other">{customCities.map(c => <option key={c}>{c}</option>)}</optgroup>
                      )}
                      <option value="__manual__">+ Enter manually</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6E60] pointer-events-none" />
                  </div>
                  {isManualCity && (
                    <input type="text" placeholder="Type city name..." value={singleLead.manualCity}
                      onChange={e => setSingleLead({ ...singleLead, manualCity: e.target.value })}
                      className={`${inp} mt-2 gk-field`} autoFocus />
                  )}
                </div>
              </div>

              <div className="gk-field" style={{ animationDelay: '120ms' }}>
                <label className={lbl}>Email (optional)</label>
                <input type="email" placeholder="customer@email.com" value={singleLead.email}
                  onChange={e => setSingleLead({ ...singleLead, email: e.target.value })} className={inp} />
              </div>

              <div className="gk-field" style={{ animationDelay: '150ms' }}>
                <label className={lbl}>Requirement</label>
                <input type="text" placeholder="Living Room Makeover, Full Interior..." value={singleLead.interest}
                  onChange={e => setSingleLead({ ...singleLead, interest: e.target.value })} className={inp} />
              </div>

              <div className="gk-field" style={{ animationDelay: '180ms' }}>
                <label className={lbl}>Notes</label>
                <textarea placeholder="Any additional notes..." value={singleLead.notes}
                  onChange={e => setSingleLead({ ...singleLead, notes: e.target.value })}
                  rows={3} className={`${inp} resize-none`} />
              </div>
            </div>
          )}

          {/* ── BULK LEADS ── */}
          {mode === 'bulk' && (
            <div key="bulk-form" className="gk-field" style={{ animationDelay: '0ms' }}>
              {/* Sub-tab */}
              <div className="flex gap-1 mb-4 p-1 bg-[#F0EBE0] rounded-xl w-fit">
                {(['manual', 'upload'] as const).map(t => (
                  <button key={t} onClick={() => setBulkTab(t)}
                    className={`gk-btn flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold ${
                      bulkTab === t ? 'bg-[#1C1712] text-white shadow-md' : 'text-[#7A6E60] hover:text-[#1C1712] hover:bg-[#E8E0D0]'
                    }`}>
                    {t === 'manual' ? <Plus size={11} /> : <Upload size={11} />}
                    {t === 'manual' ? 'Manual Entry' : 'Upload CSV / Excel'}
                  </button>
                ))}
              </div>

              {/* Upload panel */}
              {bulkTab === 'upload' && (
                <div className="space-y-3 gk-field" style={{ animationDelay: '0ms' }}>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${
                      dragOver ? 'gk-drop-active bg-amber-50/60' : 'border-[#E2D9C8] hover:border-[#B8860B] hover:bg-[#FDFAF4]'
                    }`}>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                    <div className={`w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 transition-transform duration-200 ${dragOver ? 'scale-110' : ''}`}>
                      <FileSpreadsheet size={28} className="text-[#B8860B]" />
                    </div>
                    <p className="text-sm font-bold text-[#1C1712]">Drag a CSV or Excel file here</p>
                    <p className="text-xs text-[#7A6E60] mt-1">or click to select</p>
                    <p className="text-[10px] text-[#B8B0A0] mt-3 bg-[#F0EBE0] px-3 py-1 rounded-full">.csv · .xlsx · .xls</p>
                  </div>

                  {uploadError && (
                    <div className="gk-shake flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                      <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-600">{uploadError}</p>
                    </div>
                  )}

                  {uploadedFile && (
                    <div className="gk-pop flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-emerald-700 truncate">{uploadedFile.name}</p>
                        <p className="text-[10px] text-emerald-600">{uploadedFile.count} leads loaded</p>
                      </div>
                      <button
                        onClick={() => { setUploadedFile(null); setBulkLeads([{ ...emptyLead }, { ...emptyLead }]) }}
                        className="gk-btn text-[10px] font-semibold text-red-500 hover:text-red-700 flex-shrink-0">
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-[#F5F0E8] border border-[#E2D9C8] rounded-xl p-3">
                    <div>
                      <p className="text-xs font-bold text-[#1C1712]">Need a sample file?</p>
                      <p className="text-[10px] text-[#7A6E60]">Download CSV with correct column format</p>
                    </div>
                    <button onClick={downloadSample} className="gk-btn flex items-center gap-1.5 text-xs font-bold text-[#B8860B] hover:text-[#9A7009] flex-shrink-0">
                      <Upload size={11} className="rotate-180" /> Download Sample
                    </button>
                  </div>

                  <div className="bg-[#F5F0E8] border border-[#E2D9C8] rounded-xl p-3">
                    <p className="text-[10px] font-bold text-[#7A6E60] uppercase tracking-wider mb-2">Expected column headers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['name', 'phone', 'source', 'budget', 'property_type', 'city', 'interest', 'status', 'notes'].map(h => (
                        <span key={h} className="bg-white border border-[#E2D9C8] text-[#1C1712] text-[10px] font-mono px-2 py-0.5 rounded-md shadow-sm">{h}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Table — show in manual mode OR after upload */}
              {(bulkTab === 'manual' || uploadedFile) && (
                <div className={bulkTab === 'upload' ? 'mt-4 gk-field' : ''}>
                  {/* Table header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1C1712]">{bulkLeads.length}</span>
                      <span className="text-sm text-[#7A6E60]">leads ready</span>
                      {activeLead < bulkLeads.length && (
                        <span className="gk-pop text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                          {bulkLeads.length - activeLead} incomplete
                        </span>
                      )}
                      {invalidPhoneCount > 0 && (
                        <span className="gk-pop text-[10px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                          {invalidPhoneCount} invalid phone{invalidPhoneCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {bulkTab === 'manual' && (
                      <button onClick={addBulkRow}
                        className="gk-btn flex items-center gap-1.5 bg-[#1C1712] hover:bg-[#2d2822] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm">
                        <Plus size={11} /> Add Row
                      </button>
                    )}
                  </div>

                  {bulkTab === 'upload' && uploadedFile && (
                    <p className="text-xs text-[#7A6E60] mb-2 font-semibold flex items-center gap-1">
                      <Zap size={10} className="text-[#B8860B]" /> Preview — you can edit before saving
                    </p>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-[#E2D9C8]">
                    <table className="w-full" style={{ minWidth: '880px' }}>
                      <thead>
                        <tr className="bg-[#F5F0E8] border-b border-[#E2D9C8]">
                          {['#', 'Name *', 'Phone * (+91)', 'Source', 'Budget', 'Property Type', 'City', ''].map((h, i) => (
                            <th key={i} className="text-left text-[9px] font-bold text-[#7A6E60] uppercase tracking-wider py-2.5 px-2 first:pl-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkLeads.map((lead, i) => {
                          const missingPhone = errors.length > 0 && !lead.phone.trim()
                          const phoneInvalid = isPhoneInvalid(lead.phone)
                          const phoneHasError = missingPhone || phoneInvalid
                          const rowInvalid = !lead.name.trim() || !lead.phone.trim() || phoneInvalid
                          const isDbDup = dbDuplicatePhones.has(getPhoneDigits(lead.phone))
                          const isNewRow = newRowIndices.has(i)
                          return (
                            <tr key={i} className={`gk-table-row border-b border-[#F0EBE0] last:border-0 ${isNewRow ? 'gk-row-in' : ''} ${
                              isDbDup ? 'bg-blue-50/50' : rowInvalid && errors.length > 0 ? 'bg-red-50/40' : 'hover:bg-[#FDFAF4]'
                            }`}>
                              <td className="py-2 pl-3 pr-2 text-xs text-[#9A8F82] font-semibold w-8">{i + 1}</td>
                              <td className="py-2 pr-2">
                                <input type="text" placeholder="Full name" value={lead.name}
                                  onChange={e => updateBulkLead(i, 'name', e.target.value)}
                                  className={`${bInp} ${!lead.name.trim() && errors.length > 0 ? 'border-red-300 bg-red-50' : ''}`} />
                              </td>
                              <td className="py-2 pr-2">
                                <div className={`gk-input-focus flex rounded-lg overflow-hidden border ${
                                  phoneHasError ? 'border-red-300' : 'border-[#E2D9C8] focus-within:border-[#B8860B]'
                                }`}>
                                  <span className={`flex items-center px-2 text-[10px] font-bold border-r select-none flex-shrink-0 ${
                                    phoneHasError ? 'bg-red-50 text-red-400 border-red-200' : 'text-[#7A6E60] bg-[#EDE8DC] border-[#E2D9C8]'
                                  }`}>+91</span>
                                  <input type="tel" placeholder="9876543210"
                                    value={lead.phone.replace(/^\+91/, '')}
                                    onChange={e => updateBulkLead(i, 'phone', '+91' + e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className={`flex-1 px-2 py-1.5 text-xs placeholder:text-[#B8B0A0] outline-none min-w-0 ${
                                      phoneHasError ? 'bg-red-50 text-red-700' : 'bg-[#F5F0E8] text-[#1C1712]'
                                    }`} />
                                </div>
                                {phoneInvalid && (
                                  <p className="text-[9px] text-red-500 font-semibold mt-1">{phoneInvalidReason(lead.phone)}</p>
                                )}
                              </td>
                              <td className="py-2 pr-2">
                                <select value={lead.source} onChange={e => updateBulkLead(i, 'source', e.target.value)} className={bInp}>
                                  <option value="">Source</option>
                                  {allSources.map(s => <option key={s}>{s}</option>)}
                                </select>
                              </td>
                              <td className="py-2 pr-2">
                                <input type="text" placeholder="₹5–8L" value={lead.budget}
                                  onChange={e => updateBulkLead(i, 'budget', e.target.value)} className={bInp} />
                              </td>
                              <td className="py-2 pr-2">
                                <select value={lead.propertyType} onChange={e => updateBulkLead(i, 'propertyType', e.target.value)} className={bInp}>
                                  <option value="">Type</option>
                                  {propertyTypes.map(t => <option key={t}>{t}</option>)}
                                </select>
                              </td>
                              <td className="py-2 pr-2">
                                <select value={lead.city} onChange={e => updateBulkLead(i, 'city', e.target.value)} className={bInp}>
                                  <option value="">City</option>
                                  <optgroup label="TS">{tsCities.map(c => <option key={c}>{c}</option>)}</optgroup>
                                  <optgroup label="AP">{apCities.map(c => <option key={c}>{c}</option>)}</optgroup>
                                  {customCities.length > 0 && (
                                    <optgroup label="Other">{customCities.map(c => <option key={c}>{c}</option>)}</optgroup>
                                  )}
                                  <option value="__manual__">+ Enter manually</option>
                                </select>
                                {lead.city === '__manual__' && (
                                  <input type="text" placeholder="Type city name..." value={lead.manualCity}
                                    onChange={e => updateBulkLead(i, 'manualCity', e.target.value)}
                                    className={`${bInp} mt-1`} />
                                )}
                              </td>
                              <td className="py-2 pr-2">
                                <button onClick={() => removeBulkRow(i)} disabled={bulkLeads.length <= 1}
                                  className="gk-icon-btn w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 hover:text-red-600 disabled:opacity-20">
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {bulkTab === 'manual' && (
                    <button onClick={addBulkRow}
                      className="gk-btn mt-3 flex items-center gap-2 w-full py-2.5 border-2 border-dashed border-[#E2D9C8] rounded-xl text-xs font-semibold text-[#7A6E60] hover:border-[#B8860B] hover:text-[#B8860B] justify-center">
                      <Plus size={13} /> Add Another Row
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ERRORS + SMART FIX BAR ── */}
          {errors.length > 0 && (
            <div key={errorShakeKey} className="gk-shake mt-4 rounded-xl border border-red-200 overflow-hidden shadow-sm">

              {/* Smart fix buttons */}
              {showFixBar && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100 p-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Zap size={10} className="text-red-600" />
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Quick Fix — one click to clean</p>
                  </div>
                  <div className="flex flex-wrap gap-2">

                    {hasPhoneErr && noPhoneCount > 0 && (
                      <button onClick={fixNoPhone}
                        className="gk-btn flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                        <Phone size={10} />
                        Remove {noPhoneCount} rows without phone
                      </button>
                    )}

                    {hasInvalidErr && invalidPhoneCount > 0 && (
                      <button onClick={fixInvalidPhone}
                        className="gk-btn flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                        <Phone size={10} />
                        Remove {invalidPhoneCount} invalid phone rows
                      </button>
                    )}

                    {hasNameErr && noNameCount > 0 && (
                      <button onClick={fixNoName}
                        className="gk-btn flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                        <UserX size={10} />
                        Remove {noNameCount} rows without name
                      </button>
                    )}

                    {hasBatchDup && dupPhoneCount > 0 && (
                      <button onClick={fixBatchDuplicates}
                        className="gk-btn flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                        <Trash2 size={10} />
                        Remove {dupPhoneCount} duplicate phone rows
                      </button>
                    )}

                    {hasDbDup && dbDuplicatePhones.size > 0 && (
                      <button onClick={fixDbDuplicates}
                        className="gk-btn flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                        <Database size={10} />
                        Remove {dbDuplicatePhones.size} already-in-DB rows
                      </button>
                    )}

                    {totalInvalid > 0 && (
                      <button onClick={fixAll}
                        className="gk-btn flex items-center gap-1.5 bg-[#1C1712] hover:bg-[#2d2822] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                        <Zap size={10} />
                        Remove all {totalInvalid} invalid rows
                      </button>
                    )}

                  </div>
                </div>
              )}

              {/* Error list */}
              <div className="bg-red-50 p-3 max-h-32 overflow-y-auto space-y-1">
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                    <AlertCircle size={11} className="flex-shrink-0 mt-0.5" /> {err}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 px-5 py-4 border-t border-[#E2D9C8] flex-shrink-0 bg-white rounded-b-2xl">
          <button onClick={onClose}
            className="gk-btn flex-1 border-2 border-[#E2D9C8] text-[#1C1712] py-2.5 rounded-xl text-sm font-semibold hover:bg-[#F0EBE0] hover:border-[#D0C8B8]">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading || success}
            className={`gk-btn flex-1 py-2.5 rounded-xl text-sm font-semibold shadow-lg disabled:opacity-60 ${
              success
                ? 'gk-pop bg-emerald-500 text-white shadow-emerald-200'
                : 'bg-[#1C1712] text-white hover:bg-[#2d2822] shadow-black/15'
            }`}>
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</span>
              : success
              ? <span className="flex items-center justify-center gap-1.5"><span className="gk-pop inline-block">✓</span> {mode === 'bulk' ? `${activeLead} Leads` : 'Lead'} Saved!</span>
              : mode === 'bulk' ? `Add ${activeLead} Leads →` : 'Add Lead →'}
          </button>
        </div>

      </div>
    </div>
  )
}