#!/usr/bin/env node
/* Phase 12 artifact and guardrail audit */

const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertIncludes(content, needle, context) {
  if (!content.includes(needle)) {
    console.error(`phase12-audit: missing "${needle}" in ${context}`);
    process.exit(1);
  }
}

const requiredFiles = [
  "supabase/migrations/20260305193000_member_drafts.sql",
  "supabase/migrations/20260305204500_club_public_join_flow.sql",
  "supabase/migrations/20260305220000_invite_join_rate_limits.sql",
  "supabase/migrations/20260305224500_abuse_slice2_device_escalation_audit.sql",
  "supabase/migrations/20260305231500_abuse_slice3_gateway_alert_hooks.sql",
  "supabase/PHASE12_VERIFY.sql",
  "supabase/APPLY_CHECKLIST_PHASE12.md",
  "ENVIRONMENT_MATRIX.md",
  "PHASE12_VALIDATION_MATRIX.md",
  "PHASE12_GO_NO_GO_CHECKLIST.md",
];

for (const file of requiredFiles) {
  const abs = path.join(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    console.error(`phase12-audit: required file missing: ${file}`);
    process.exit(1);
  }
}

const verifySql = read("supabase/PHASE12_VERIFY.sql");
assertIncludes(verifySql, "public.club_member_drafts", "supabase/PHASE12_VERIFY.sql");
assertIncludes(verifySql, "public.request_rate_limits", "supabase/PHASE12_VERIFY.sql");
assertIncludes(verifySql, "public.abuse_alerts", "supabase/PHASE12_VERIFY.sql");
assertIncludes(verifySql, "public.get_club_abuse_alerts", "supabase/PHASE12_VERIFY.sql");
assertIncludes(verifySql, "public.resolve_club_abuse_alert", "supabase/PHASE12_VERIFY.sql");

const appContent = read("src/App.tsx");
assertIncludes(appContent, "returnTo=", "src/App.tsx");

const authContent = read("src/pages/Auth.tsx");
assertIncludes(authContent, "sanitizeReturnTo", "src/pages/Auth.tsx");

const membersContent = read("src/pages/Members.tsx");
assertIncludes(membersContent, "get_club_request_abuse_audit", "src/pages/Members.tsx");
assertIncludes(membersContent, "get_club_abuse_alerts", "src/pages/Members.tsx");
assertIncludes(membersContent, "resolve_club_abuse_alert", "src/pages/Members.tsx");

console.log("audit-phase12: OK");

