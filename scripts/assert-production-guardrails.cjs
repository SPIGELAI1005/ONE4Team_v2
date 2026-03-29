#!/usr/bin/env node
/* Production safety checks for CI/release pipelines. */

function fail(message) {
  console.error(`guardrails: ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(`guardrails: ${message}`);
}

const env = process.env;
const isProductionMode = env.NODE_ENV === "production" || env.VITE_MODE === "production";
const requirePublicEnv = (env.GUARDRAILS_REQUIRE_PUBLIC_ENV || "").toLowerCase() === "true";

if (!isProductionMode) {
  info("Skipping strict checks outside production mode.");
  process.exit(0);
}

if ((env.VITE_DEV_UNLOCK_ALL_FEATURES || "").toLowerCase() === "true") {
  fail("VITE_DEV_UNLOCK_ALL_FEATURES must never be true in production mode.");
}

if ((env.VITE_DEV_AUTO_LOGIN_EMAIL || "").trim()) {
  fail("VITE_DEV_AUTO_LOGIN_EMAIL must be empty in production mode.");
}

if ((env.VITE_DEV_AUTO_LOGIN_PASSWORD || "").trim()) {
  fail("VITE_DEV_AUTO_LOGIN_PASSWORD must be empty in production mode.");
}

if (requirePublicEnv) {
  if (!(env.VITE_SUPABASE_URL || "").trim()) {
    fail("VITE_SUPABASE_URL is required in production mode.");
  }

  if (!(env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim()) {
    fail("VITE_SUPABASE_PUBLISHABLE_KEY is required in production mode.");
  }
}

info("Production guardrails passed.");
