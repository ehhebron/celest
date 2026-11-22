# Celest

A precise, explorable natal chart: part instrument, part editorial art piece. Enter birth details, watch the chart draw itself, tap anything to read about it, scrub through time to watch today's planets move around your chart, open the real sky at your birth moment, and share a story-sized card.

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # calculation + behaviour tests (vitest)
pnpm build      # type-check and production build
```

## How it's built

| Area | Where | Notes |
| --- | --- | --- |
| Ephemeris | `src/astro/ephemeris.ts` | [astronomy-engine](https://github.com/cosinekitty/astronomy) for the Sun through Pluto (apparent geocentric, true ecliptic of date). True lunar node from the Moon's osculating orbit. Chiron interpolated from a JPL Horizons table (1800–2150). |
| Time zones | `src/astro/time.ts` | IANA tzdb via Luxon/Intl, with historical DST. Before a zone adopted standard time, local mean time is derived from the longitude. Skipped (DST gap) and repeated (DST overlap) wall times are detected and flagged. |
| Houses | `src/astro/houses.ts` | Whole Sign (default) and Placidus (semi-arc trisection with Newton refinement). Placidus falls back to Whole Sign inside the polar circles. |
| Aspects | `src/astro/aspects.ts` | Five major aspects. Orbs are configurable per aspect, with a luminary bonus and a minor-point factor. Exactness and applying/separating are reported. |
| Forecast | `src/astro/forecast.ts` | Transit *cycles* for Mars through Pluto, Chiron and the Node: when each comes into orb, every exact hit (including retrograde re-passes) and when it leaves. Also New and Full Moons placed in the houses, solar and lunar eclipses, retrograde stations near natal points, house ingresses, the progressed Moon and the next solar return. Every event gets a significance score. Runs in a Web Worker; copy is in `src/interpret/forecastText.ts`. |
| Transits | `src/astro/transits.ts` | Contacts within tight orbs and the nearest exact date (root-finding). Runs in a Web Worker in the UI. |
| Wheel | `src/ui/wheel/` | Hand-built SVG. Ascendant at 9 o'clock, collision fanning with leader lines, and a memoized natal layer so only the transit layer redraws while scrubbing. |
| Copy | `src/interpret/` | Warm, plain-language text composed from planet, sign, house and aspect pieces. |
| Share card | `src/ui/share/renderCard.ts` | 1080×1920 canvas. Star field, rays and palette are seeded from the chart, so every card is unique. |
| Birth sky | `src/ui/sky/` | Yale Bright Star Catalogue (V ≤ 5.2) and planets rotated into the observer's horizon frame. The Moon is drawn at its true phase with the lit limb toward the Sun. Optional constellation lines. |

## Accuracy

`src/astro/__tests__/reference.test.ts` checks 8 reference charts (including Einstein 1879 in local mean time, Kahlo 1907, the UK's 1968–71 year-round BST, and Sydney DST) against **JPL Horizons (DE441)**:

- Every body is within **0.1°**. The worst observed error is about 17″ (Neptune). Chiron is within 0.2″.
- The true node agrees with the Moon's osculating node from Horizons.
- Local sidereal time agrees with Horizons to within 0.005°.
- The Ascendant is checked geometrically: it is on the eastern horizon, and the MC is on the meridian, using Horizons' sidereal time.
- Placidus cusps satisfy semi-arc trisection to 1e-6°.
- The expected UTC for each birth is written by hand from historical clock rules, so time-zone handling is tested independently.

To regenerate the data: `node scripts/fetch-reference.ts`, `node scripts/fetch-chiron.ts`, `node scripts/fetch-sky.ts`.

## Appearance

Light, dark, or match the system (the default), chosen from the menu in the top-right corner. The choice is saved in `localStorage` and applied by an inline script in `index.html` before first paint, so there's no flash. Colours are CSS custom properties: the dark palette is in `:root, .theme-dark` and the light palette in `:root[data-theme='light']`, both in `src/index.css`. The Birth Sky is pinned to dark with `.theme-dark`, and the share card always renders on its night background.

## Privacy

There are no accounts. Charts are saved in `localStorage`, and a chart can be shared through a readable URL hash (`#/chart?date=…`). The only network call is the city search ([Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api)), which receives just the typed place name. Manual coordinate entry works offline.

## Data credits

- Star positions: Yale Bright Star Catalogue, 5th ed. (Hoffleit & Warren 1991).
- Constellation lines: [d3-celestial](https://github.com/ofrohn/d3-celestial) © Olaf Frohn, BSD-3-Clause.
- Chiron and reference positions: NASA/JPL Horizons.
