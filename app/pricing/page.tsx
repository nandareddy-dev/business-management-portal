"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

// ── DATA ──────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { id: "interior",   label: "Interior Design", desc: "Lead pipeline, projects, designs & materials",  icon: "🛋️", locked: false, color: "from-purple-500 to-violet-700" },
  { id: "realestate", label: "Real Estate",      desc: "Property leads, site visits & deal management", icon: "🏠", locked: true,  color: "from-blue-500 to-cyan-700" },
  { id: "hospital",   label: "Hospital",          desc: "Patients, doctors, appointments & billing",     icon: "🏥", locked: true,  color: "from-red-500 to-rose-700" },
  { id: "b2b",        label: "B2B Business",      desc: "Clients, deals, invoices & pipeline",          icon: "🤝", locked: true,  color: "from-amber-500 to-orange-700" },
  { id: "clinic",     label: "Clinics",            desc: "Patients, prescriptions, doctors & billing",  icon: "🩺", locked: true,  color: "from-emerald-500 to-teal-700" },
];

const PLANS = [
  {
    id: "starter",
    label: "Starter",
    price: 999,
    users: "Up to 10 users",
    color: "#6B7280",
    bgLight: "#f3f4f6",
    features: [
      "Lead pipeline (7-stage)",
      "Team member access (up to 10)",
      "Basic dashboard",
      "Email support",
    ],
  },
  {
    id: "professional",
    label: "Professional",
    price: 2999,
    users: "Up to 20 users",
    color: "#B8860B",
    bgLight: "#fffbeb",
    features: [
      "Everything in Starter",
      "Client management",
      "Quotations (PDF)",
      "HRMS & Attendance (leave, clock-in/out, payslips)",
      "Project Management (budgets, timelines, materials)",
      "GST billing & invoices",
      "Priority support",
      "Real-time dashboard",
      "Advanced reports",
    ],
  },
  {
    id: "business",
    label: "Business",
    price: 5999,
    users: "Up to 50 users",
    color: "#7C3AED",
    bgLight: "#f5f3ff",
    features: [
      "Everything in Professional",
      "Unlimited leads",
      "Advanced analytics",
      "Priority support (faster SLA)",
      "WhatsApp/AI tools — free when launched",
    ],
  },
];

const BUNDLE_DISCOUNT = 0.1;

const PRICING_FAQS = [
  { q: "What happens after the 14-day trial?",     a: "Your account stays active but locked. You can subscribe to any plan without losing your data. No auto-charges — you choose when to upgrade." },
  { q: "Is there a setup fee or hidden charges?",  a: "Zero setup fee. Price shown is all-inclusive. No per-seat fees beyond the plan limit." },
  { q: "What's the difference between Starter and Professional?", a: "Starter covers lead management, clients, quotations, and team member access — perfect to get moving. Professional adds the full HRMS module (attendance, leave, payslips), project management (budgets, timelines, materials), GST billing, and advanced reports for growing teams." },
  { q: "Can I add more team members later?",       a: "Starter supports up to 10 users, Professional up to 20, Business up to 50. Need more? Contact us for a custom plan — we accommodate growing teams." },
  { q: "What payment methods do you accept?",      a: "UPI, credit/debit cards, net banking via Razorpay. Monthly billing with auto-renewal. Cancel anytime from account settings." },
  { q: "Do AI integrations cost extra?",           a: "No. When N8N, Vapi.ai, and WhatsApp integrations launch, they will be included on the Professional plan at no extra cost." },
];

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

// ── SUBCOMPONENTS ─────────────────────────────────────────────────────────

function PricingFAQ() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="py-14 md:py-20 bg-[#F5F0E8]">
      <div className="max-w-2xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-3">FAQ</p>
          <h2 className="font-serif text-3xl text-[#1C1712]">Pricing questions</h2>
        </div>
        <div className="space-y-2.5">
          {PRICING_FAQS.map((faq, i) => (
            <div key={i}
              className={`border rounded-2xl overflow-hidden transition-all duration-300 ${active === i ? 'border-[#B8860B]/40 bg-white shadow-md' : 'border-[#E2D9C8] bg-white'}`}>
              <button onClick={() => setActive(active === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FDFAF8] transition-colors">
                <span className="text-sm font-semibold text-[#1C1712] pr-4">{faq.q}</span>
                <span className={`text-[#B8860B] text-xl transition-transform duration-300 flex-shrink-0 ${active === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${active === i ? 'max-h-40' : 'max-h-0'}`}>
                <p className="text-sm text-[#7A6E60] px-5 pb-5 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────

export default function GKCRMPricing() {
  const router = useRouter();

  type StateMap = Record<string, { active: boolean; plan: string | null }>;
  const [state, setState] = useState<StateMap>(() => {
    const s: StateMap = {};
    INDUSTRIES.forEach((i) => (s[i.id] = { active: false, plan: null }));
    return s;
  });

  const summary = useMemo(() => {
    const groups: Record<string, { id: string; label: string }[]> = {};
    PLANS.forEach((p) => (groups[p.id] = []));
    INDUSTRIES.forEach((ind) => {
      const s = state[ind.id];
      if (s.active && s.plan) groups[s.plan].push({ id: ind.id, label: ind.label });
    });
    const rows: { plan: typeof PLANS[0]; industries: { id: string; label: string }[]; base: number; discount: number; final: number }[] = [];
    let total = 0, savings = 0;
    PLANS.forEach((p) => {
      const group = groups[p.id];
      if (!group.length) return;
      const base = p.price * group.length;
      const discount = group.length > 1 ? Math.round(base * BUNDLE_DISCOUNT) : 0;
      savings += discount;
      total += base - discount;
      rows.push({ plan: p, industries: group, base, discount, final: base - discount });
    });
    return { rows, total, savings };
  }, [state]);

  const [showSummary, setShowSummary] = useState(false);

  function toggleInd(id: string) {
    const ind = INDUSTRIES.find((i) => i.id === id);
    if (ind?.locked) return;
    setState((prev) => {
      const activating = !prev[id].active;
      // Starter default entry-level plan గా set చేయి — pro కాదు
      return { ...prev, [id]: { active: activating, plan: activating ? "starter" : null } };
    });
  }

  function selectPlan(indId: string, planId: string) {
    setState((prev) => ({ ...prev, [indId]: { active: true, plan: planId } }));
  }

  const canStartTrial = summary.total > 0;

  function handleStartTrial() {
    if (!canStartTrial) return;
    // ఎంచుకున్న actual plan(s) ప్రకారం URL build చేయి — hardcoded 'pro' తీసేశాను
    const params = new URLSearchParams();
    const industries = summary.rows.flatMap((row) => row.industries.map((i) => i.id));
    const primaryPlan = summary.rows[0]?.plan.id ?? "starter";
    params.set("industry", industries.join(",") || "interior");
    params.set("plan", primaryPlan);
    router.push(`/signup?${params.toString()}`);
  }

  // ── Summary Panel — render function (not a component) to avoid React remount ──
  function renderSummary() { return (
    <div className="bg-[#1C1712] rounded-2xl p-6 shadow-2xl shadow-black/20">
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-[3px] mb-5">Your Plan Summary</p>

      {summary.rows.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-4">☝️</p>
          <p className="text-sm text-white/30">Toggle an industry above to build your plan</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-5">
          {summary.rows.map((row) => (
            <div key={row.plan.id} className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-3.5">
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: row.plan.bgLight, color: row.plan.color }}>
                    {row.plan.label}
                  </span>
                  {row.discount > 0 && (
                    <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full">Bundle −10%</span>
                  )}
                </div>
                <p className="text-sm font-bold text-white">{fmt(row.final)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {row.industries.map((ind) => (
                  <span key={ind.id} className="text-[10px] text-white/40 bg-white/[0.06] px-2 py-0.5 rounded-md">{ind.label}</span>
                ))}
              </div>
              {row.discount > 0 && (
                <p className="text-[10px] text-emerald-400 mt-2">You save {fmt(row.discount)}/mo</p>
              )}
            </div>
          ))}
        </div>
      )}

      {summary.savings > 0 && (
        <div className="bg-emerald-950/50 border border-emerald-500/20 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
          <span className="text-xs text-emerald-400">Total bundle savings</span>
          <span className="text-sm font-bold text-emerald-400">{fmt(summary.savings)}/mo</span>
        </div>
      )}

      <div className="border-t border-white/10 pt-4 mb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/40">Total / month</span>
          <span className="font-serif text-3xl text-white">{summary.total > 0 ? fmt(summary.total) : '—'}</span>
        </div>
        {summary.total > 0 && (
          <p className="text-[10px] text-white/20 text-right">≈ {fmt(Math.round(summary.total / 30))}/day</p>
        )}
      </div>

      <button onClick={handleStartTrial}
        disabled={!canStartTrial}
        aria-disabled={!canStartTrial}
        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 mb-3 ${
          canStartTrial
            ? 'bg-[#B8860B] text-white hover:bg-[#9A7009] shadow-lg shadow-amber-900/30 cursor-pointer'
            : 'bg-white/10 text-white/30 cursor-not-allowed shadow-none'
        }`}>
        Start Free Trial →
      </button>

      <div className="flex items-center justify-center gap-4">
        {['14-day free', 'No card', 'Cancel anytime'].map((t) => (
          <span key={t} className="text-[9px] text-white/25 font-medium">✓ {t}</span>
        ))}
      </div>
    </div>
  ); }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .pricing-grid  { grid-template-columns: 1fr !important; }
          .pricing-sticky { display: none !important; }
        }
        .mobile-cta { display: none; }
        @media (max-width: 768px) { .mobile-cta { display: flex !important; } }
      `}</style>

      {/* ── PRICING HEADER ────────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#F5F0E8] pt-16 md:pt-24 pb-0">
        <div className="max-w-5xl mx-auto px-4 md:px-6 text-center">
          <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-4">Pricing</p>
          <h2 className="font-serif text-4xl md:text-[56px] text-[#1C1712] leading-[1.05] mb-4">
            Build your own{" "}
            <em className="italic font-normal text-[#B8860B]">perfect plan</em>
          </h2>
          <p className="text-[#7A6E60] text-base md:text-lg max-w-xl mx-auto mb-8">
            Pick exactly which industries you need, and the plan that fits your team size.
          </p>

          {/* Trust strip */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-10 md:mb-14">
            {[
              { icon: '🎁', text: '14-day free trial' },
              { icon: '💳', text: 'No credit card' },
              { icon: '⚡', text: '5-min setup' },
              { icon: '🔐', text: 'Data fully isolated' },
              { icon: '❌', text: 'Cancel anytime' },
            ].map((item) => (
              <span key={item.text}
                className="flex items-center gap-1.5 bg-white border border-[#E2D9C8] text-[#7A6E60] text-xs font-medium px-3 py-1.5 rounded-full">
                <span>{item.icon}</span> {item.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN PRICING GRID ─────────────────────────────────────────── */}
      <section className="bg-[#F5F0E8] pb-16 md:pb-20">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="pricing-grid grid gap-6 md:gap-8" style={{ gridTemplateColumns: '1fr 340px' }}>

            {/* LEFT: Industry selector */}
            <div>
              <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-[3px] mb-4">
                Select industries &amp; plan
              </p>

              <div className="flex flex-col gap-3">
                {INDUSTRIES.map((ind) => {
                  const s = state[ind.id];
                  const locked = ind.locked;
                  return (
                    <div key={ind.id}
                      className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                        locked
                          ? 'border-[#E2D9C8] bg-[#F0EBE0] opacity-60'
                          : s.active
                          ? 'border-[#B8860B]/50 bg-white shadow-lg shadow-amber-100/50'
                          : 'border-[#E2D9C8] bg-[#EDEADD] hover:border-[#B8860B]/30 hover:bg-white cursor-pointer'
                      }`}
                      onClick={() => { if (!locked && !s.active) toggleInd(ind.id); }}
                    >
                      {/* Card header */}
                      <div className="flex items-center gap-3 p-4 md:p-5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-colors ${
                          s.active && !locked ? 'bg-amber-50' : 'bg-[#F5F0E8]'
                        }`}>
                          {ind.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${locked ? 'text-[#9A8F82]' : s.active ? 'text-[#1C1712]' : 'text-[#7A6E60]'}`}>
                            {ind.label}
                          </p>
                          <p className="text-[11px] text-[#9A8F82] truncate">{ind.desc}</p>
                        </div>

                        {/* Toggle or badge */}
                        {locked ? (
                          <span className="flex-shrink-0 text-[9px] font-bold text-[#9A8F82] bg-[#E2D9C8] border border-[#CFC8B8] px-2.5 py-1 rounded-full uppercase tracking-wide">
                            🔒 Soon
                          </span>
                        ) : (
                          <div
                            onClick={(e) => { e.stopPropagation(); toggleInd(ind.id); }}
                            className={`flex-shrink-0 w-11 h-6 rounded-full border transition-all duration-200 relative cursor-pointer ${
                              s.active ? 'bg-[#B8860B] border-[#B8860B]' : 'bg-[#D5CFC3] border-[#C5BFB3]'
                            }`}
                          >
                            <div className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-all duration-200 ${
                              s.active ? 'left-[22px]' : 'left-[3px]'
                            }`} />
                          </div>
                        )}
                      </div>

                      {/* Plan selection — expands when active — 3 plans side by side */}
                      {s.active && !locked && (
                        <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-[#F0EBE0] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
                          {PLANS.map((p) => {
                            const sel = s.plan === p.id;
                            return (
                              <button key={p.id}
                                onClick={() => selectPlan(ind.id, p.id)}
                                className={`w-full h-full rounded-xl border-2 p-3 md:p-4 text-left transition-all duration-200 ${
                                  sel ? 'border-[#B8860B] bg-amber-50' : 'border-[#E2D9C8] bg-[#F5F0E8] hover:border-[#B8860B]/40'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                                  <span className={`text-xs font-bold uppercase tracking-wide ${sel ? 'text-[#B8860B]' : 'text-[#9A8F82]'}`}>
                                    {p.label}
                                  </span>
                                  {sel && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Selected ✓</span>}
                                </div>
                                <p className={`text-lg font-bold ${sel ? 'text-[#1C1712]' : 'text-[#7A6E60]'}`}>{fmt(p.price)}</p>
                                <p className="text-[10px] text-[#9A8F82] mb-2">/month · {p.users}</p>
                                {sel && (
                                  <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-amber-200/50">
                                    {p.features.map((f) => (
                                      <div key={f} className="flex items-center gap-1.5 text-[10px] text-[#B8860B] font-medium">
                                        <span className="font-bold text-xs">✓</span> {f}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bundle discount note */}
              <div className="mt-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <span className="text-emerald-600 text-lg">🎉</span>
                <div>
                  <p className="text-xs font-bold text-emerald-800">Bundle discount available</p>
                  <p className="text-[11px] text-emerald-700">Select 2+ industries on the same plan → save 10% automatically</p>
                </div>
              </div>

              {/* Mobile CTA */}
              <div className="mobile-cta hidden mt-5 flex-col gap-3">
                {summary.total > 0 && (
                  <div className="bg-[#1C1712] rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Total / month</p>
                      <p className="font-serif text-2xl text-white">{fmt(summary.total)}</p>
                      {summary.savings > 0 && <p className="text-xs text-emerald-400 mt-0.5">Saving {fmt(summary.savings)}</p>}
                    </div>
                    <button onClick={() => setShowSummary(true)}
                      className="text-xs font-bold text-[#B8860B] bg-[#B8860B]/10 border border-[#B8860B]/20 px-4 py-2 rounded-xl">
                      View Plan →
                    </button>
                  </div>
                )}
                <button onClick={handleStartTrial}
                  disabled={!canStartTrial}
                  aria-disabled={!canStartTrial}
                  className={`w-full py-4 rounded-xl font-bold transition-all ${
                    canStartTrial
                      ? 'bg-[#B8860B] text-white hover:bg-[#9A7009] cursor-pointer'
                      : 'bg-[#D5CFC3] text-[#9A8F82] cursor-not-allowed'
                  }`}>
                  Start Free Trial →
                </button>
                <p className="text-center text-xs text-[#9A8F82]">14-day free · No credit card</p>
              </div>
            </div>

            {/* RIGHT: Sticky summary */}
            <div className="pricing-sticky" style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
              { renderSummary() }

              {/* Support note */}
              <div className="mt-4 text-center">
                <p className="text-[11px] text-[#9A8F82]">
                  Need a custom plan?{" "}
                  <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer"
                    className="text-[#B8860B] font-semibold hover:underline">
                    WhatsApp us →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING FAQ ───────────────────────────────────────────────── */}
      <PricingFAQ />

      {/* ── BOTTOM CTA ────────────────────────────────────────────────── */}
      <div className="bg-[#F5F0E8] pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="bg-[#1C1712] rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 30% 50%, #B8860B, transparent 50%), radial-gradient(circle at 70% 50%, #7C3AED, transparent 50%)',
            }} />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-2">Questions?</p>
                <h3 className="font-serif text-2xl md:text-3xl text-white mb-2">We&apos;re here before you sign up</h3>
                <p className="text-sm text-white/50">Talk to our team — no sales pitch, just honest answers.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#1ea952] transition-all">
                  💬 WhatsApp Us
                </a>
                <a href="mailto:supportcrm@gkdigitalsolutions.in"
                  className="flex items-center gap-2 border-2 border-white/20 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">
                  📧 Email Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE SUMMARY BOTTOM SHEET ───────────────────────────────── */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSummary(false)} />
          <div className="relative bg-[#1C1712] rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-bold text-white/70">Plan Summary</p>
              <button onClick={() => setShowSummary(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm">✕</button>
            </div>
            { renderSummary() }
          </div>
        </div>
      )}
    </>
  );
}