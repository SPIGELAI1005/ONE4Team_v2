const required = [
  "E2E_TRAINER_EMAIL",
  "E2E_TRAINER_PASSWORD",
  "E2E_PARENT_EMAIL",
  "E2E_PARENT_PASSWORD",
  "E2E_CHILD_DISPLAY_NAME",
  "E2E_PARENT_DISPLAY_NAME",
  "E2E_EXCLUDED_MEMBER_DISPLAY_NAME",
  "E2E_PLAYER_EMAIL",
  "E2E_PLAYER_PASSWORD",
  "E2E_PLAYER_PARENT_EMAIL",
  "E2E_PLAYER_PARENT_PASSWORD",
  "E2E_TRAINER_PARENT_EMAIL",
  "E2E_TRAINER_PARENT_PASSWORD",
];

const missing = required.filter((name) => !String(process.env[name] || "").trim());

if (missing.length > 0) {
  console.error("Team Ops E2E credentials are incomplete.");
  for (const name of missing) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`Team Ops E2E environment: OK (${required.length} required values).`);
