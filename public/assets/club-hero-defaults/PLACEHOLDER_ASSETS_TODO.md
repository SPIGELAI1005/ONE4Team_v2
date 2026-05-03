# Club hero default images — TODO

**Place final raster assets in this folder** (`public/assets/club-hero-defaults/`) using the filenames referenced in `src/lib/club-hero-default-assets.ts`:

| File (expected) | Slot id |
|-----------------|--------|
| `football-team-huddle-neutral.png` | `football-team-huddle-neutral` |
| `football-training-pitch-neutral.png` | `football-training-pitch-neutral` |
| `youth-football-action-neutral.png` | `youth-football-action-neutral` |
| `clubhouse-community-neutral.png` | `clubhouse-community-neutral` |
| `abstract-sports-pattern-neutral.png` | `abstract-sports-pattern-neutral` |

- Use **neutral / desaturated** photography or illustration so **`HeroImageTint`** (grayscale + club-color overlay) reads well.
- Recommended export: **WebP + PNG fallback** — if you add `.webp`, update paths in `club-hero-default-assets.ts` accordingly.
- Until files exist, the public hero falls back to the **CSS gradient** when the image fails to load (`HeroImageTint` `onError`).
