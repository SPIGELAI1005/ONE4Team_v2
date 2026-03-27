# ONE4Team Investor Valuation Model (12M + 36M)

## Purpose
This model is designed for fundraising conversations and can be used as a valuation appendix for pre-seed and seed decks.

It includes:
- 12-month and 36-month operating cases,
- region assumptions for Germany (DE), broader Europe (EU), and United States (US),
- ARR-based valuation scenarios,
- suggested round sizing and dilution planning.

Use this as a decision model, not as legal or financial advice.

---

## 1) Modeling approach

This package uses a blended early-stage SaaS approach:
- **Operating model:** paying clubs x ARPC x 12,
- **Valuation model:** ARR multiple by scenario and time horizon,
- **Fundraising model:** runway-based raise size and target dilution bands.

Core formulas:
- `ARR = Paying clubs x ARPC_monthly x 12`
- `Enterprise value = ARR x Multiple`
- `Post-money = Pre-money + Raise`
- `New investor ownership = Raise / Post-money`
- `Existing holder dilution factor = Pre-money / Post-money`

---

## 2) Core assumptions by region

### Base-case regional assumptions (used for recommended investor narrative)

| Metric | DE (12M) | EU ex-DE (12M) | US (12M) | DE (36M) | EU ex-DE (36M) | US (36M) |
|---|---:|---:|---:|---:|---:|---:|
| Paying clubs | 189 | 126 | 105 | 770 | 660 | 770 |
| Monthly ARPC (EUR) | 22 | 20 | 30 | 33 | 31 | 49 |
| Annual logo churn | 9% | 11% | 13% | 8% | 10% | 11% |
| Gross margin | 84% | 83% | 81% | 85% | 84% | 82% |
| CAC per paid club (EUR) | 700 | 850 | 1,400 | 650 | 800 | 1,200 |
| Avg. sales cycle | 1.5 months | 2.0 months | 2.5 months | 1.5 months | 2.0 months | 2.5 months |

Base-case blended output:
- **12M ARR:** `EUR 120,960`
- **36M ARR:** `EUR 1,003,200`

---

## 3) 12M and 36M valuation scenarios

### Scenario definitions
- **Conservative:** slower logo growth, lower ARPC expansion, tighter multiples.
- **Base:** realistic execution with strong post-Phase-12 operational readiness.
- **Upside:** strong conversion, good retention, faster US scale, pricing power from add-ons.

| Scenario | 12M Paying Clubs | 12M ARPC (EUR/mo) | 12M ARR (EUR) | 12M Multiple | 12M Implied Value (EUR) |
|---|---:|---:|---:|---:|---:|
| Conservative | 220 | 21 | 55,440 | 4.0x | 221,760 |
| Base | 420 | 24 | 120,960 | 6.0x | 725,760 |
| Upside | 700 | 27 | 226,800 | 8.0x | 1,814,400 |

| Scenario | 36M Paying Clubs | 36M ARPC (EUR/mo) | 36M ARR (EUR) | 36M Multiple | 36M Implied Value (EUR) |
|---|---:|---:|---:|---:|---:|
| Conservative | 900 | 31 | 334,800 | 5.0x | 1,674,000 |
| Base | 2,200 | 38 | 1,003,200 | 7.0x | 7,022,400 |
| Upside | 4,000 | 46 | 2,208,000 | 10.0x | 22,080,000 |

---

## 4) Current fundraising valuation recommendation

Because ONE4Team is now beyond build-risk but still pre-scale in commercial proof, use a valuation range that balances product maturity with traction risk.

### Recommended current pre-money positioning
- **Defensible ask range:** `EUR 2.8M - EUR 4.8M pre-money`
- **Primary target ask:** `EUR 3.6M pre-money`
- **Floor for hard market conditions:** `EUR 2.4M pre-money`

Positioning rationale:
- product/compliance/ops maturity is materially above prototype stage,
- multi-tenant/RLS/CI/test/evidence gates reduce execution risk perception,
- value uplift now depends on paid traction and retention more than feature breadth.

---

## 5) Target round sizing (runway method)

### Formula
- `Raise = (Net monthly burn x runway months) + contingency buffer`
- Suggested contingency: 10% to 20%.

### Recommended plan

| Round | Timing | Net Burn Assumption | Runway Target | Buffer | Suggested Raise |
|---|---|---:|---:|---:|---:|
| Pre-seed | Now | EUR 75k/mo | 12 months | 15% | EUR 1.0M |
| Seed | Month 12-18 | EUR 165k/mo | 15 months | 15% | EUR 2.8M - EUR 3.0M |
| Series A-style | Month 28-34 | EUR 350k/mo | 18 months | 15% | EUR 7.2M - EUR 8.0M |

---

## 6) Dilution and cap table planning (illustrative)

### Target structure (illustrative base case)

| Round | Pre-money | Raise | Post-money | New Investor Ownership |
|---|---:|---:|---:|---:|
| Pre-seed | EUR 3.6M | EUR 0.9M | EUR 4.5M | 20.0% |
| Seed | EUR 8.5M | EUR 2.8M | EUR 11.3M | 24.8% |
| Series A-style | EUR 24.0M | EUR 7.5M | EUR 31.5M | 23.8% |

Assume a 10% employee option pool is established by pre-seed close.

### Ownership evolution (illustrative)

| Holder Group | Post Pre-seed | Post Seed | Post Series A-style |
|---|---:|---:|---:|
| Founders | 70.0% | 52.7% | 40.1% |
| ESOP | 10.0% | 7.5% | 5.7% |
| Pre-seed investors | 20.0% | 15.0% | 11.5% |
| Seed investors | - | 24.8% | 18.9% |
| Series A-style investors | - | - | 23.8% |

Notes:
- Any option-pool top-up before Seed or Series A will dilute existing holders further.
- Keep each institutional round in a typical **18% to 25%** new-money dilution band.

---

## 7) Investor narrative by region (DE / EU / US)

### Germany (DE)
- Strong compliance and trust narrative (legal stack + governance artifacts).
- Efficient CAC potential via local football club networks and federation-adjacent channels.
- Best wedge for early retention and case studies.

### Europe ex-DE
- Similar grassroots club pain points with moderate localization effort.
- ARPC typically below US but favorable payback possible with partnerships.
- Good second-stage expansion once DE reference logos exist.

### United States
- Higher ARPC potential and larger TAM, but higher CAC and longer sales cycle.
- Works best after DE/EU proof and a stronger payment/entitlements stack.
- Prioritize selectively by sub-segment to avoid CAC burn.

---

## 8) Sensitivity checks investors will ask for

Prepare these before live discussions:
- ARPC sensitivity: `-20%`, base, `+20%`.
- Churn sensitivity: base, `+5pp`, `+10pp`.
- CAC shock: base, `+25%`.
- Sales-cycle extension: base, `+1 month`.
- Gross margin sensitivity: base, `-5pp`.

If two or more downside shocks happen simultaneously, recalc runway and raise size.

---

## 9) What must be evidenced to justify upper valuation bands

To defend `EUR 4M+` pre-money in current market, show:
- 15 to 30 paying clubs with repeatable conversion from pilot to paid,
- 90-day retention above 85% logo retention in pilot cohorts,
- clean implementation references (case studies/testimonials),
- clear ICP and channel playbook by region,
- proof that onboarding + member operations reduce admin workload measurably.

---

## 10) Practical talk track for fundraising

Use this framing in investor conversations:
1) "Execution risk has dropped: multi-tenant security, compliance, and production controls are in place."
2) "Commercial upside is now a scale problem, not a build problem."
3) "We are raising to convert validated operations into repeatable growth across DE first, then EU/US."
4) "At target valuation, round size buys 12-15 months to reach the next measurable ARR and retention milestone."

---

## Appendix A: Quick formulas for spreadsheet

- `Blended_ARPC = SUMPRODUCT(ARPC_region, clubs_region) / SUM(clubs_region)`
- `ARR = SUM(clubs_region x ARPC_region x 12)`
- `Value_12M = ARR_12M x Multiple_12M`
- `Value_36M = ARR_36M x Multiple_36M`
- `Investor_% = Raise / (Pre + Raise)`
- `Holder_post_round = Holder_pre_round x (Pre / Post)`

