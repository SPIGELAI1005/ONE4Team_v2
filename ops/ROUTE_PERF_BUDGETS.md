# Route-level performance budgets (optional, ST-012+)

CI already enforces **bundle size** (`npm run budget:bundle`). For route-level budgets:

1. **Lighthouse CI** in GitHub Actions against `npm run preview` + static auth bypass only in a dedicated test env (never production credentials in CI logs).
2. **RUM:** connect Web Vitals to your analytics provider; alert when LCP or INP regresses vs a 4-week baseline.

Recommended first routes: landing, dashboard shell, `Communication`, `Members`.

No workflow is wired by default—add when product prioritizes front-end perf SLIs.
