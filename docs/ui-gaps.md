# UI component gaps (May 2026)

Snapshot of RoxyAPI endpoints that have **no dedicated `@roxyapi/ui` component** as of the package's May 2026 component table. Consumers of `roxyapi/sdk` get raw JSON for these and must render manually (or fall back to `<roxy-data>`, the generic JSON renderer).

This file is informational - it lives in the PHP SDK repo so the maintainer of [@roxyapi/ui](https://github.com/roxyapi/ui) has a running list without us polluting that repo's commits.

## Current gaps

| Domain | Endpoints | Status |
|---|---|---|
| Crystals (`/crystals/*`) | 12 endpoints (search, by zodiac, by chakra, by element, birthstone, daily, random, pairings, lookup, all, hardness, vibration) | No card / grid component |
| Angel Numbers (`/angel-numbers/*`) | 4 endpoints (lookup, sequence analysis, daily, by type) | No card component |
| Dreams (`/dreams/*`) | 5 endpoints (symbol, search, A-Z, random, popular) | No symbol-card / dictionary component |
| Languages (`/languages`) | 1 endpoint (list supported response languages) | No selector helper component |
| Usage (`/usage/*`) | 1 endpoint (current usage stats) | No usage-meter component |
| Advanced KP | `/vedic-astrology/kp/{ruling-planets,ruling-planets-interval,sublord-changes,rasi-changes,planets-interval,ayanamsa,cusps,chart}` | Only `<roxy-kp-planets-table>` exists; ruling-planets / interval / sublord-changes have no dedicated view |
| Vedic divisional listings | 15 divisional charts (D2 Hora through D60 Shashtiamsa) covered by one generic `<roxy-divisional-chart>`; per-varga deep-dive views (e.g. D9 Navamsa specific) do not exist | One-size-fits-all today |
| Numerology helper views | `/numerology/{lucky-numbers,bridge-numbers,karmic-debt,karmic-lessons,subconscious-self,maturity-number,personality-number,birth-day,balance-number,challenges,pinnacles}` are folded under `<roxy-numerology-card>`; per-aspect breakdowns do not exist | Single-card aggregate today |

## Decision tree for SDK consumers

If your endpoint has a dedicated component:
1. Fetch with the SDK server-side.
2. Pass the JSON to the matching `<roxy-*>` element in the browser.

If it does not (this list):
1. Fetch with the SDK server-side.
2. Either render manually (PHP -> HTML), or assign the JSON to `<roxy-data>` for a generic structured display.

## How this list is maintained

Manual diff of `specs/openapi.json` x the `BEGIN:COMPONENTS` table in the [@roxyapi/ui AGENTS.md](https://github.com/roxyapi/ui/blob/main/AGENTS.md). When `@roxyapi/ui` ships a new component for one of the gaps above, drop the row.
