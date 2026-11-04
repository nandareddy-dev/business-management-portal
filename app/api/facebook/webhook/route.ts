import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================================================
// CONFIGURATION
// =====================================================

const GRAPH_VERSION = "v26.0";

const COMPANY_ID = "04e560cc-3bf4-4273-af1a-e4bfcd3902fe";

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// Recommended: configure the Facebook Page ID in Vercel.
// If configured, events from other pages will be rejected.
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

// =====================================================
// RESPONSE HELPER
// =====================================================

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

// =====================================================
// SUPABASE ADMIN CLIENT
// =====================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =====================================================
// GET: FACEBOOK WEBHOOK VERIFICATION
// =====================================================

export async function GET(req: NextRequest) {
  try {
    if (!VERIFY_TOKEN) {
      console.error("FACEBOOK_VERIFY_TOKEN is missing");
      return jsonError("Webhook verify token is not configured", 500);
    }

    const params = req.nextUrl.searchParams;

    const mode = params.get("hub.mode");
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token === VERIFY_TOKEN &&
      challenge !== null
    ) {
      console.log("Facebook Webhook Verification Successful");

      return new NextResponse(challenge, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    console.error("Facebook Webhook Verification Failed");

    return jsonError("Verification Failed", 403);
  } catch (error) {
    console.error("Facebook GET Webhook Error:", error);
    return jsonError("Webhook verification error", 500);
  }
}

// =====================================================
// SIGNATURE VERIFICATION
// =====================================================

function verifySignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!APP_SECRET || !signatureHeader) {
    return false;
  }

  // Meta sends: sha256=<hexadecimal HMAC>
  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }

  try {
    const expectedSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", APP_SECRET)
        .update(rawBody, "utf8")
        .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(signatureHeader, "utf8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    );
  } catch (error) {
    console.error("Facebook signature verification error:", error);
    return false;
  }
}

// =====================================================
// PHONE NORMALIZATION
// =====================================================

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-10);
}

// =====================================================
// FACEBOOK FORM FIELD MAPPING
// =====================================================

type FacebookField = {
  name: string;
  values?: string[];
};

function mapFieldData(fieldData: FacebookField[]) {
  const map: Record<string, string> = {};

  for (const field of fieldData || []) {
    if (!field?.name) continue;

    map[field.name.toLowerCase().trim()] =
      field.values?.[0] || "";
  }

  const leadName =
    map["full_name"] ||
    map["name"] ||
    `${map["first_name"] || ""} ${
      map["last_name"] || ""
    }`.trim();

  const phoneRaw =
    map["phone_number"] ||
    map["phone"] ||
    "";

  const email = map["email"] || "";

  const city =
    map["location"] ||
    map["city"] ||
    "";

  const propertyType =
    map["what_type_of_property_do_you_have?"] ||
    map["what_type_of_property_do_you_have"] ||
    map["property_type"] ||
    "";

  const budget =
    map["estimated_budget"] ||
    "";

  const interest =
    map["what_interior_services_are_you_looking_for?"] ||
    map["what_interior_services_are_you_looking_for"] ||
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

// =====================================================
// FETCH FACEBOOK LEAD DETAILS
// =====================================================

async function fetchLeadDetails(leadgenId: string) {
  if (!PAGE_ACCESS_TOKEN) {
    throw new Error(
      "FACEBOOK_PAGE_ACCESS_TOKEN is missing"
    );
  }

  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(
      leadgenId
    )}`
  );

  url.searchParams.set("access_token", PAGE_ACCESS_TOKEN);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const responseText = await response.text();

  let result: any;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Facebook Graph API returned invalid JSON (${response.status})`
    );
  }

  if (!response.ok || result.error) {
    console.error(
      "Facebook Graph API Error:",
      result.error?.message || response.status
    );

    throw new Error(
      result.error?.message ||
        `Unable to fetch Facebook lead (${response.status})`
    );
  }

  return result;
}

// =====================================================
// POST: FACEBOOK LEAD WEBHOOK
// =====================================================

export async function POST(req: NextRequest) {
  console.log("Facebook POST Webhook Received");

  try {
    // 1. Check required Facebook configuration

    if (!APP_SECRET) {
      console.error("FACEBOOK_APP_SECRET is missing");

      return jsonError(
        "Facebook App Secret is not configured",
        500
      );
    }

    // 2. Read raw body before parsing JSON

    const rawBody = await req.text();

    const signature = req.headers.get(
      "x-hub-signature-256"
    );

    console.log("Facebook signature header received:", Boolean(signature));

    // 3. Verify Facebook signature

    if (!verifySignature(rawBody, signature)) {
      console.error("Invalid Facebook signature - rejecting");

      return jsonError("Invalid Facebook signature", 403);
    }

    console.log("Facebook signature verified successfully");

    // 4. Parse request body

    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonError("Invalid JSON payload", 400);
    }

    // 5. Validate webhook object

    if (body.object !== "page") {
      console.warn("Unsupported Facebook webhook object");

      return NextResponse.json({
        success: true,
        message: "Event ignored",
      });
    }

    // 6. Validate Supabase configuration

    const supabase = getSupabaseAdmin();

    let processedCount = 0;
    let duplicateCount = 0;
    let ignoredCount = 0;

    // 7. Process Page entries

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") {
          ignoredCount++;
          continue;
        }

        const {
          leadgen_id,
          page_id,
          form_id,
          created_time,
        } = change.value || {};

        if (!leadgen_id || !page_id) {
          console.error(
            "Facebook event is missing leadgen_id or page_id"
          );

          ignoredCount++;
          continue;
        }

        const leadgenId = String(leadgen_id);
        const pageId = String(page_id);

        console.log("Facebook Lead Event Received:", leadgenId);

        // 8. Optional Page ID validation

        if (
          FACEBOOK_PAGE_ID &&
          pageId !== FACEBOOK_PAGE_ID
        ) {
          console.error(
            "Facebook event received from an unconfigured Page"
          );

          ignoredCount++;
          continue;
        }

        // 9. Check duplicate Facebook Lead ID

        const {
          data: existingLead,
          error: duplicateError,
        } = await supabase
          .from("leads")
          .select("id")
          .eq("facebook_leadgen_id", leadgenId)
          .maybeSingle();

        if (duplicateError) {
          throw duplicateError;
        }

        if (existingLead) {
          console.log(
            "Facebook lead already exists:",
            leadgenId
          );

          duplicateCount++;
          continue;
        }

        // 10. Fetch full lead details from Facebook

        const leadDetails = await fetchLeadDetails(leadgenId);

        const {
          leadName,
          phoneRaw,
          email,
          city,
          propertyType,
          budget,
          interest,
          timeline,
          raw,
        } = mapFieldData(
          leadDetails.field_data || []
        );

        // 11. Validate lead details

        if (!leadName && !phoneRaw && !email) {
          console.error(
            "Facebook lead does not contain basic contact details:",
            leadgenId
          );

          ignoredCount++;
          continue;
        }

        // 12. Insert lead into Supabase
        // Do not skip a new enquiry just because the phone exists.

        const createdAt = Number(created_time);

        const leadCreatedAt =
          Number.isFinite(createdAt) && createdAt > 0
            ? new Date(createdAt * 1000).toISOString()
            : new Date().toISOString();

        const {
          data: newLead,
          error: insertError,
        } = await supabase
          .from("leads")
          .insert({
            company_id: COMPANY_ID,
            industry: "interior-design",

            lead_name: leadName || "Facebook Lead",

            phone: phoneRaw,

            email,
            city,
            property_type: propertyType,
            budget,
            interest,

            source: "Facebook Meta",

            status: "New",
            pipeline_stage: "new",

            facebook_leadgen_id: leadgenId,
            facebook_form_id: form_id
              ? String(form_id)
              : null,
            facebook_page_id: pageId,

            raw_field_data: {
              ...raw,
              timeline,
            },

            created_at: leadCreatedAt,
          })
          .select()
          .single();

        if (insertError) {
          // Database unique constraint prevents concurrent duplicates.

          if (insertError.code === "23505") {
            console.log(
              "Duplicate Facebook lead prevented by database:",
              leadgenId
            );

            duplicateCount++;
            continue;
          }

          console.error(
            "Supabase Lead Insert Error:",
            insertError
          );

          throw insertError;
        }

        // 13. Create lead activity

        const { error: activityError } = await supabase
          .from("lead_activities")
          .insert({
            lead_id: newLead.id,
            company_id: COMPANY_ID,
            activity_type: "lead_created",
            notes: "Auto-created from Facebook Lead Ads",
          });

        if (activityError) {
          // Lead is already saved. Log activity failure separately.
          console.error(
            "Lead activity insert error:",
            activityError
          );
        }

        processedCount++;

        console.log(
          "Facebook Lead Saved Successfully:",
          newLead.id
        );
      }
    }

    // 14. Return successful response

    console.log("Facebook Webhook Processing Completed", {
      processedCount,
      duplicateCount,
      ignoredCount,
    });

    return NextResponse.json(
      {
        success: true,
        processed: processedCount,
        duplicates: duplicateCount,
        ignored: ignoredCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Facebook Webhook Processing Error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    // Return 500 for processing failures so Meta can retry.
    return jsonError(
      "Facebook webhook processing failed",
      500
    );
  }
}