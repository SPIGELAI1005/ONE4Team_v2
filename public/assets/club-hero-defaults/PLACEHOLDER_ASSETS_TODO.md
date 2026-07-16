# Club hero default images

Neutral platform default hero assets live in this folder (`public/assets/club-hero-defaults/`), referenced by `src/lib/club-hero-default-assets.ts`:

| File | Slot id | Status |
|------|---------|--------|
| `football-team-huddle-neutral.png` | `football-team-huddle-neutral` | Shipped (2026-07-16) |
| `football-training-pitch-neutral.png` | `football-training-pitch-neutral` | Shipped |
| `youth-football-action-neutral.png` | `youth-football-action-neutral` | Shipped |
| `clubhouse-community-neutral.png` | `clubhouse-community-neutral` | Shipped |
| `abstract-sports-pattern-neutral.png` | `abstract-sports-pattern-neutral` | Shipped |

- Prefer **neutral / desaturated** photography or illustration so **`HeroImageTint`** (grayscale + club-color overlay) reads well.
- Optional follow-up: add **WebP** variants and update paths in `club-hero-default-assets.ts`.
- If an image fails to load, the public hero falls back to the **CSS gradient** (`HeroImageTint` `onError`).
- **Never** reuse pilot-club photography (e.g. TSV Allach camp images under `public/images/camps/`) as a platform-wide default — see tenant-isolation tests.
