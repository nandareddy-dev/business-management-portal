import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const VERIFY_TOKEN =
  process.env.FACEBOOK_VERIFY_TOKEN || "GK_HOME_INTERIORS_VERIFY_TOKEN_2026";
const APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;
const GRAPH_VERSION = "v26.0";

const GK_HOME_INTERIORS_COMPANY_ID = "04e560cc-3bf4-4273-af1a-e4bfcd3902fe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------- GET: Webhook Verification ----------
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Facebook Webhook Verified");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ error: "Verification Failed" }, { status: 403 });
}

// ---------- Signature Verification ----------
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader)
    );
  } catch {
    return false; // length mismatch etc.
  }
}

// ---------- Phone normalization ----------
// Matches your existing bulk-lead pattern: right(regexp_replace(phone, '\D', '', 'g'), 10)
function normalizePhone(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  return digitsOnly.slice(-10);
}

// ---------- Field mapping helper ----------
// Meta form field "name" keys are the lowercased/underscored version of the
// question text. Confirm exact keys against a real Graph API response before
// relying on this in production — question wording changes will break matches.
function mapFieldData(fieldData: { name: string; values: string[] }[]) {
  const map: Record<string, string> = {};
  for (const f of fieldData) {
    map[f.name.toLowerCase().trim()] = f.values?.[0] || "";
  }

  const leadName =
    map["full_name"] ||
    map["name"] ||
    `${map["first_name"] || ""} ${map["last_name"] || ""}`.trim();

  const phoneRaw = map["phone_number"] || map["phone"] || "";
  const email = map["email"] || "";
  const city = map["location"] || map["city"] || "";
  const propertyType = map["property_type"] || "";
  const budget = map["estimated_budget"] || "";

  const interest =
    map["what_type_of_interior_service_are_you_looking_for?"] ||
    map["what_type_of_interior_service_are_you_looking_for"] ||
    "";

  const timeline =
    map["when_are_you_planning_to_start_your_interiors?"] ||
    map["when_are_you_planning_to_start_your_interiors"] ||
    "";

  return {
    leadName,
    phoneRaw,
    email,
    city,
    propertyType,
    budget,
    interest,
    timeline,
    raw: map,
  };
}

// ---------- Fetch full lead from Graph API ----------
async function fetchLeadDetails(leadgenId: string) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${leadgenId}?access_token=${PAGE_ACCESS_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API error (${res.status}): ${errText}`);
  }
  return res.json();
}

// ---------- POST: Lead Event Handler ----------
export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // need raw text for signature check
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    console.error("Invalid Facebook signature - rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const body = JSON.parse(rawBody);

  try {
    if (body.object === "page") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "leadgen") continue;

          const { leadgen_id, page_id, form_id, created_time } = change.value;

          // 1. Dedupe check - avoid double insert if Meta retries webhook
          const { data: existingByLeadgenId } = await supabaseAdmin
            .from("leads")
            .select("id")
            .eq("facebook_leadgen_id", leadgen_id)
            .maybeSingle();

          if (existingByLeadgenId) {
            console.log(`Lead ${leadgen_id} already processed, skipping`);
            continue;
          }

          // 2. Fetch full lead details from Graph API
          const leadDetails = await fetchLeadDetails(leadgen_id);
          const {
            leadName,
            phoneRaw,
            email,
            city,
            propertyType,
            budget,
            interest,
            raw,
          } = mapFieldData(leadDetails.field_data || []);

          const phoneNormalized = normalizePhone(phoneRaw);

          // 2b. Secondary dedupe - same pattern used for bulk lead import,
          // in case the same person already exists via another source
          if (phoneNormalized) {
            const { data: existingByPhone } = await supabaseAdmin
              .from("leads")
              .select("id")
              .eq("company_id", GK_HOME_INTERIORS_COMPANY_ID)
              .eq("phone_normalized", phoneNormalized)
              .maybeSingle();

            if (existingByPhone) {
              console.log(
                `Lead with phone ${phoneNormalized} already exists (id: ${existingByPhone.id}), skipping insert`
              );
              continue;
            }
          }

          // 3. Insert into Supabase leads table (confirmed actual schema columns)
          const { data: newLead, error: insertError } = await supabaseAdmin
            .from("leads")
            .insert({
              company_id: GK_HOME_INTERIORS_COMPANY_ID,
              lead_name: leadName || "Facebook Lead",
              phone: phoneRaw,
              phone_normalized: phoneNormalized,
              email,
              city,
              property_type: propertyType,
              budget,
              interest,
              source: "facebook_ads",
              status: "New",
              pipeline_stage: "new",
              facebook_leadgen_id: leadgen_id,
              facebook_form_id: form_id,
              facebook_page_id: page_id,
              raw_field_data: raw,
              created_at: created_time
                ? new Date(created_time * 1000).toISOString()
                : new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            console.error("Supabase insert error:", insertError);
            continue;
          }

          // 4. Log activity (matches your lead_activities pattern)
          await supabaseAdmin.from("lead_activities").insert({
            lead_id: newLead.id,
            company_id: GK_HOME_INTERIORS_COMPANY_ID,
            activity_type: "lead_created",
            notes: "Auto-created from Facebook Lead Ads",
          });

          console.log(`New lead saved: ${newLead.id} (${leadName})`);

          // TODO: WhatsApp/notification trigger ikkada add cheyochu (WATI etc.)
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    // IMPORTANT: still return 200 to Meta even on internal errors,
    // otherwise Meta disables the webhook after repeated failures.
    return NextResponse.json({ success: false, message: "Processing error" });
  }
}