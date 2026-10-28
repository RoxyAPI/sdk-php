# roxyapi/sdk - Agent Guide

PHP SDK for RoxyAPI. 18+ domains (Western astrology, Vedic astrology, forecast, human design, Chinese astrology, feng shui, Mesoamerican astrology, Vastu, numerology, Kabbalah, tarot, biorhythm, Ayurveda, I Ching, crystals, dreams, angel numbers, location) plus utility namespaces (usage, languages). One API key, one Composer package, zero hand-written endpoint code.

## Install and initialize

```bash
composer require roxyapi/sdk
```

```php
use function RoxyAPI\Sdk\createRoxy;

// Retries 429, 500, 502, 503 and 504 by default. Optional settings, shown with their defaults:
// createRoxy($key, new RetryPolicy(maxRetries: 2, initialDelayMs: 500, maxDelayMs: 30000))
$roxy = createRoxy(getenv('ROXY_API_KEY'));
```

`createRoxy` sets the base URL (`https://roxyapi.com/api/v2`) and the auth header automatically. Every method returns `array<string, mixed>` decoded from JSON, or throws `RoxyAPI\Sdk\RoxyApiException` on 4xx/5xx.

## Critical rule: geocode before any chart endpoint

Every chart, horoscope, panchang, dasha, dosha, navamsa, KP, synastry, compatibility, and natal endpoint needs `latitude`, `longitude`, and (for Western) `timezone`. **Never ask the user for coordinates.** Always call `$roxy->location->searchCities` first.

```php
$place = $roxy->location->searchCities(q: 'New York');
['latitude' => $latitude, 'longitude' => $longitude, 'timezone' => $timezone] = $place['cities'][0];
// `timezone` is the IANA string ("America/New_York"). Pass it directly to any chart endpoint.
// The server resolves it to the DST-correct decimal offset using the date of the chart itself,
// so a January 1990 New York chart gets EST (-5) even when you looked the city up in July.
// `utcOffset` is the offset in force today, not on the birth date, so pass the IANA `timezone` string.
```

`q` accepts bare city (`'Paris'`), city + country (`'Berlin Germany'`), or comma-qualified (`'Springfield, Illinois'`). Use the qualified form to disambiguate same-named cities.

## Domains

<!-- BEGIN:DOMAINS -->
| Property | What it covers |
|---|---|
| [`$roxy->astrology`](https://roxyapi.com/api-reference/western-astrology) | Western astrology API for natal birth charts, daily, weekly, monthly, and yearly horoscopes with unique content per s... |
| [`$roxy->vedicAstrology`](https://roxyapi.com/api-reference/vedic-astrology) | Vedic astrology (Jyotish) and KP API for kundli generation with the sixteen Shodasavarga divisional charts (D1 to D60... |
| [`$roxy->forecast`](https://roxyapi.com/api-reference/forecast) | Astrology forecast API that merges upcoming transit aspects, sign ingresses, retrograde stations, new and full moons,... |
| [`$roxy->humanDesign`](https://roxyapi.com/api-reference/human-design) | Human Design API that generates the full bodygraph from a birth moment: type, strategy, inner authority, profile, def... |
| [`$roxy->chineseAstrology`](https://roxyapi.com/api-reference/chinese-astrology) | Chinese zodiac and BaZi astrology API: Four Pillars charts, Chinese zodiac signs and the Chinese lunisolar calendar f... |
| [`$roxy->fengShui`](https://roxyapi.com/api-reference/feng-shui) | Compute classical feng shui from one API: Xuan Kong flying star natal charts for any of the nine periods and 24 mount... |
| [`$roxy->mesoamericanAstrology`](https://roxyapi.com/api-reference/mesoamerican-astrology) | Calculate Mayan astrology day signs, the Tzolkin sacred round, the Haab year, the full Long Count and the Aztec tonal... |
| [`$roxy->vastu`](https://roxyapi.com/api-reference/vastu) | Vastu Shastra API for directional home and plot analysis: entrance padas with the classical effect of each of the 32... |
| [`$roxy->numerology`](https://roxyapi.com/api-reference/numerology) | Numerology API for life path numbers, complete numerology charts and compatibility, in both Pythagorean and Chaldean... |
| [`$roxy->kabbalah`](https://roxyapi.com/api-reference/kabbalah) | Kabbalah API for gematria, the 72 names, the Tree of Life and the Hebrew birthday |
| [`$roxy->tarot`](https://roxyapi.com/api-reference/tarot) | Tarot reading API with the complete 78-card Rider-Waite-Smith deck and card meanings for love, career, health, and sp... |
| [`$roxy->biorhythm`](https://roxyapi.com/api-reference/biorhythm) | Biorhythm API for entertainment and reflection, with 10 model cycle types across 3 primary (physical, emotional, inte... |
| [`$roxy->ayurveda`](https://roxyapi.com/api-reference/ayurveda) | Ayurveda API for dosha profiles, the dinacharya daily routine and the ritucharya seasonal regimen, with a verse cited... |
| [`$roxy->iching`](https://roxyapi.com/api-reference/i-ching) | I-Ching oracle API with all 64 hexagrams, 384 changing lines, 8 trigrams, and modern interpretations for love, career... |
| [`$roxy->crystals`](https://roxyapi.com/api-reference/crystals-and-healing-stones) | Crystal healing API covering the most popular and widely-searched healing crystals and gemstones, from Amethyst and R... |
| [`$roxy->dreams`](https://roxyapi.com/api-reference/dreams) | Dream interpretation API with a 2,200+ symbol dream dictionary and psychological meanings covering animals, objects,... |
| [`$roxy->angelNumbers`](https://roxyapi.com/api-reference/angel-numbers) | Angel numbers API with meanings for 111, 222, 333, 444, 555, 666, 777, 888, 999, 1111, and 75+ sequences covering eve... |
| [`$roxy->location`](https://roxyapi.com/api-reference/location-and-timezone) | Timezone and location API with city search and geocoding across 5,180,000+ cities, towns and villages in 240+ countri... |
| [`$roxy->usage`](https://roxyapi.com/api-reference/usage) | Monitor your API usage, check rate limits, and track request consumption |
| [`$roxy->languages`](https://roxyapi.com/api-reference/languages) | List the response languages accepted by the `lang` query parameter on every i18n-aware endpoint |

The table above covers every endpoint and auto-syncs from the OpenAPI spec at release time.
<!-- END:DOMAINS -->

## Quality guidelines for agents

The rules to follow when writing any call with this SDK. Get these right and the generated resource classes do the rest.

- **Named arguments, flattened.** Every method takes path params, query params and body fields as one list of named arguments, camelCase, matching the spec verbatim. Right: `$roxy->astrology->getDailyHoroscope(sign: 'aries')`. Wrong: `$roxy->astrology->getDailyHoroscope(['sign' => 'aries'])`. A nested body object (`person1`, `birthData`, `plot`, `rooms`) is an associative array; a birth array spreads into the named arguments with `...$birth`.
- **Arrays back, never objects.** Every method returns `array<string, mixed>`. Access fields with `$result['key']['subkey']`, never `$result->key->subkey`: object syntax throws `Error: Attempt to read property "key" on array`. Sub-objects are arrays too: the natal-chart `ascendant` is `['sign' => ..., 'degree' => ...]`, so `echo $chart['ascendant']['sign']`, not `echo $chart['ascendant']`.
- **Method names match the OpenAPI `operationId` verbatim** (already camelCase). When in doubt, read `vendor/roxyapi/sdk/src/Generated/Resources/<Tag>Resource.php`: it lists every method with its full signature. Never invent a method from the URL path or a guess.
- **Response field names come from the response schema of the spec.** The OpenAPI spec at <https://roxyapi.com/api/v2/openapi.json> is the authoritative shape: drill into nested `.properties` for sub-objects and `.items.properties` for array items. An invented field is an `Undefined array key` warning at runtime, so read every field you name from a real response before shipping.
- **Look up any operation or field beyond this guide.** Query the combined OpenAPI spec at <https://roxyapi.com/api/v2/openapi.json> with the jq recipe in <https://roxyapi.com/AGENTS.md>, or search the keyless Docs MCP server at <https://roxyapi.com/mcp/docs> (one tool, `search_docs`).
- **Do not hand-roll requests.** No raw `curl`, no direct Guzzle. The SDK injects auth, the base URL and error decoding; it retries twice by default (see Error handling). `RoxyApiException` is a real PHP object: `$e->statusCode`, `$e->errorCode`, `$e->error`, `$e->docUrl`, `$e->retryAfter` use object syntax. Only successful payloads are arrays.

## Critical patterns

### Two-step pattern for coordinate-dependent endpoints

```php
$place = $roxy->location->searchCities(q: 'London');
['latitude' => $latitude, 'longitude' => $longitude, 'timezone' => $timezone] = $place['cities'][0];
$birth = ['date' => '1990-01-15', 'time' => '14:30:00', 'latitude' => $latitude, 'longitude' => $longitude, 'timezone' => $timezone];

$chart = $roxy->astrology->generateNatalChart(...$birth);
```

One lookup feeds every domain. The same `$birth` array spreads into `astrology->generateNatalChart`, `vedicAstrology->generateBirthChart`, `vedicAstrology->getCurrentDasha`, `ayurveda->calculateAyurvedicConstitution` and is the `birthData` of `forecast->forecastTransits`; the instant alone (`date`, `time`, `timezone`) is the input of `humanDesign->generateBodygraph`, `chineseAstrology->generateBaziChart` and `kabbalah->generateBirthProfile`. Never look the city up twice for one person.

### GET endpoints

Path params and query params are named arguments on the resource method.

```php
$roxy->astrology->getDailyHoroscope(sign: 'aries');
$roxy->crystals->getCrystalsByZodiac(sign: 'leo');
$roxy->crystals->searchCrystals(q: 'amethyst');
```

### POST endpoints

Body fields are named arguments on the resource method, no manual array building.

```php
$roxy->astrology->generateNatalChart(
    date: '1990-01-15', time: '14:30:00',
    latitude: 40.7128, longitude: -74.006, timezone: -5,
);

$roxy->vedicAstrology->generateBirthChart(
    date: '1990-01-15', time: '14:30:00',
    latitude: 28.6139, longitude: 77.2090,
);

$roxy->tarot->castCelticCross(question: 'What should I focus on?');

$roxy->numerology->calculateLifePath(year: 1990, month: 1, day: 15);
```

### Multi-language via `lang`

<!-- BEGIN:LANGS -->
10 languages: `en`, `tr`, `de`, `es`, `hi`, `pt`, `fr`, `ru`, `zh-Hans`, `zh-Hant`. Defaults to `en`. Supported: `astrology`, `vedicAstrology`, `forecast`, `humanDesign`, `chineseAstrology`, `fengShui`, `mesoamericanAstrology`, `vastu`, `numerology`, `kabbalah`, `tarot`, `biorhythm`, `ayurveda`, `iching`, `crystals`, `angelNumbers`, `languages`. English-only: `dreams`, `location`, `usage`.
<!-- END:LANGS -->

```php
$roxy->tarot->getDailyCard(date: '2026-04-22', lang: 'es');
$roxy->numerology->calculateLifePath(year: 1990, month: 1, day: 15, lang: 'hi');
```

The two Chinese scripts (`zh-Hans`, `zh-Hant`) currently ship on Chinese astrology and feng shui; every other domain answers those codes in English per field. To list supported codes at runtime, call `$roxy->languages->listLanguages()`.

### Rendering responses with `@roxyapi/ui`

This SDK does not do HTML rendering. To display API responses in a browser, fetch JSON server-side and hand it to the [@roxyapi/ui](https://github.com/roxyapi/ui) web components.

```php
// /api/natal-chart.php
use function RoxyAPI\Sdk\createRoxy;

header('Content-Type: application/json');
$roxy = createRoxy(getenv('ROXY_API_KEY'));
echo json_encode($roxy->astrology->generateNatalChart(
    date: $_GET['date'], time: $_GET['time'],
    latitude: (float) $_GET['lat'], longitude: (float) $_GET['lon'],
    timezone: $_GET['tz'],
));
```

```html
<!-- index.html -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@roxyapi/ui@latest/dist/cdn/roxy-ui.js"></script>
<roxy-natal-chart id="chart"></roxy-natal-chart>
<script>
  fetch('/api/natal-chart.php?date=1990-01-15&time=14:30:00&lat=40.7128&lon=-74.006&tz=-5')
    .then(r => r.json())
    .then(data => document.getElementById('chart').data = data);
</script>
```

See <https://raw.githubusercontent.com/RoxyAPI/sdk-php/main/examples/render-with-ui.html> for the full pattern. Component coverage: fetch <https://raw.githubusercontent.com/RoxyAPI/ui/main/AGENTS.md> whole with `curl -s`.

### Testing your integration

Use the Saloon `MockClient` to avoid live calls in tests.

```php
use RoxyAPI\Sdk\Generated\Requests\GetDailyHoroscopeRequest;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy('test-key');
$roxy->withMockClient(new MockClient([
    GetDailyHoroscopeRequest::class => MockResponse::make(['sign' => 'aries', 'overview' => 'fixture']),
]));

expect($roxy->astrology->getDailyHoroscope(sign: 'aries'))->toBe([
    'sign' => 'aries', 'overview' => 'fixture',
]);
```

## Common tasks

In the catalog order (Western astrology, Vedic astrology, forecast, Human Design, Chinese astrology, feng shui, Mesoamerican astrology, Vastu, numerology, Kabbalah, tarot, biorhythm, Ayurveda, I Ching, crystals, dreams, angel numbers, location, usage, languages). `$birth` is `['date' => ..., 'time' => ..., 'latitude' => ..., 'longitude' => ..., 'timezone' => ...]` from the two-step pattern above, and `$partner` is the same shape for a second person.

| Task | Code |
|------|------|
| Find city coordinates (do this first) | `$roxy->location->searchCities(q: 'Berlin')` |
| Daily horoscope | `$roxy->astrology->getDailyHoroscope(sign: 'aries')` |
| Natal chart (Western) | `$roxy->astrology->generateNatalChart(...$birth)` |
| Synastry | `$roxy->astrology->calculateSynastry(person1: $birth, person2: $partner)` |
| Compatibility score | `$roxy->astrology->calculateCompatibility(person1: $birth, person2: $partner)` |
| Current moon phase | `$roxy->astrology->getCurrentMoonPhase()` |
| Transits | `$roxy->astrology->calculateTransits(natalChart: $birth)` |
| Kundli (Vedic birth chart) | `$roxy->vedicAstrology->generateBirthChart(...$birth)` |
| Panchang (detailed) | `$roxy->vedicAstrology->getDetailedPanchang(date: ..., latitude: $latitude, longitude: $longitude, timezone: $timezone)` |
| Choghadiya | `$roxy->vedicAstrology->getChoghadiya(date: ..., latitude: $latitude, longitude: $longitude, timezone: $timezone)` |
| Current dasha | `$roxy->vedicAstrology->getCurrentDasha(...$birth)` |
| Mangal Dosha | `$roxy->vedicAstrology->checkManglikDosha(...$birth)` |
| Guna Milan (matching) | `$roxy->vedicAstrology->calculateGunMilan(person1: $birth, person2: $partner)` |
| Navamsa (D9) | `$roxy->vedicAstrology->generateNavamsa(...$birth)` |
| KP chart | `$roxy->vedicAstrology->generateKpChart(...$birth)` |
| KP ruling planets | `$roxy->vedicAstrology->getKpRulingPlanets(latitude: $latitude, longitude: $longitude, timezone: $timezone)` |
| Nakshatra detail | `$roxy->vedicAstrology->getNakshatra(id: 'ashwini')` |
| Transit forecast | `$roxy->forecast->forecastTransits(birthData: $birth, startDate: ..., endDate: ...)` |
| Cross-domain timeline | `$roxy->forecast->generateTimeline(birthData: $birth, startDate: ..., endDate: ...)` |
| Human Design bodygraph | `$roxy->humanDesign->generateBodygraph(date: ..., time: ..., timezone: ...)` |
| Human Design connection | `$roxy->humanDesign->calculateConnection(personA: [...], personB: [...])` |
| BaZi Four Pillars | `$roxy->chineseAstrology->generateBaziChart(date: ..., time: ..., timezone: ...)` |
| Chinese zodiac animal | `$roxy->chineseAstrology->calculateZodiacAnimal(date: ...)` |
| Almanac day (Tong Shu) | `$roxy->chineseAstrology->getAlmanacDay(date: ...)` |
| Kua number | `$roxy->fengShui->calculateKuaNumber(date: ..., gender: ...)` |
| Flying star natal chart | `$roxy->fengShui->generateFlyingStarChart(period: ..., facing: ...)` |
| Tzolkin day sign | `$roxy->mesoamericanAstrology->calculateTzolkin(date: ...)` |
| Full Maya chart | `$roxy->mesoamericanAstrology->generateMayanChart(date: ...)` |
| Vastu entrance | `$roxy->vastu->calculateEntrancePada(plot: [...], facing: ..., doorPosition: ...)` |
| Vastu room compliance | `$roxy->vastu->calculateRoomCompliance(plot: [...], facing: ..., rooms: [...])` |
| Life path number | `$roxy->numerology->calculateLifePath(year: ..., month: ..., day: ...)` |
| Full numerology chart | `$roxy->numerology->generateNumerologyChart(fullName: ..., year: ..., month: ..., day: ...)` |
| Personal year | `$roxy->numerology->calculatePersonalYear(month: ..., day: ...)` |
| Gematria | `$roxy->kabbalah->calculateGematria(text: ...)` |
| Kabbalah birth profile | `$roxy->kabbalah->generateBirthProfile(date: ..., time: ..., timezone: ...)` |
| Daily tarot card | `$roxy->tarot->getDailyCard(seed: ..., date: ...)` (both optional: `date` defaults to today UTC, no `seed` is an anonymous reading) |
| Three-card spread | `$roxy->tarot->castThreeCard(question: ...)` |
| Celtic Cross | `$roxy->tarot->castCelticCross(question: ...)` |
| Yes / no tarot | `$roxy->tarot->castYesNo(question: ...)` |
| Biorhythm reading | `$roxy->biorhythm->getReading(birthDate: ...)` |
| Daily biorhythm (seeded) | `$roxy->biorhythm->getDailyBiorhythm(seed: ...)` |
| Biorhythm forecast | `$roxy->biorhythm->getForecast(birthDate: ...)` |
| Biorhythm compatibility | `$roxy->biorhythm->calculateBioCompatibility(person1: [...], person2: [...])` |
| Ayurvedic constitution | `$roxy->ayurveda->calculateAyurvedicConstitution(...$birth)` |
| Dinacharya | `$roxy->ayurveda->getDinacharyaSchedule(date: ..., latitude: $latitude, longitude: $longitude, timezone: $timezone)` |
| Daily hexagram | `$roxy->iching->getDailyHexagram(seed: ...)` |
| Cast I Ching reading | `$roxy->iching->castReading()` |
| Hexagram detail | `$roxy->iching->getHexagram(number: 1)` |
| Crystal by zodiac | `$roxy->crystals->getCrystalsByZodiac(sign: ...)` |
| Crystal by chakra | `$roxy->crystals->getCrystalsByChakra(chakra: ...)` |
| Dream symbol lookup | `$roxy->dreams->getDreamSymbol(id: 'flying')` |
| Angel number meaning | `$roxy->angelNumbers->getAngelNumber(number: '1111')` |
| Universal number lookup | `$roxy->angelNumbers->analyzeNumberSequence(number: '1234')` |
| Check API usage | `$roxy->usage->getUsageStats()` |
| List supported languages | `$roxy->languages->listLanguages()` |

## Field formats that trip agents

These are the fields AI agents most often get wrong. Copy the format column exactly.

| Field | Format | Good | Bad |
|-------|--------|------|-----|
| `timezone` | Decimal hours (number) OR IANA string | `5.5`, `-5`, `0` (decimal) OR `'Asia/Kolkata'`, `'America/New_York'` (IANA, resolved to the DST-correct offset for the chart date) | `'5:30'`, `'+0530'`, `'GMT-5'` |
| `date` | ISO date string | `'1990-01-15'` | `'Jan 15 1990'`, `'15/01/1990'`, `'1990-1-15'` |
| `time` | 24-hour string with seconds | `'14:30:00'`, `'09:00:00'` | `'2:30 PM'`, `'14:30'`, `'9:0:0'` |
| `latitude` | Decimal degrees (float) | `51.5074`, `-33.8688`, `40.7128` | `"28°36'N"`, strings |
| `longitude` | Decimal degrees (float) | `-0.1278`, `-74.0060`, `139.6917` | DMS strings |
| `sign` (path) | Zodiac name, case-insensitive, lowercase is canonical | `'aries'`, `'Aries'`, `'pisces'` | `'1'`, `'ram'` |
| `chakra` (crystals path) | Title-case English name from the fixed enum | `'Root'`, `'Sacral'`, `'Solar Plexus'`, `'Heart'`, `'Throat'`, `'Third Eye'`, `'Crown'` | `'heart'`, `'third-eye'` |
| `fullName` (numerology) | Birth-certificate name | `'John William Smith'` | Nicknames, married names |
| `seed` | Any string (deterministic) | `'user-42'`, `'session-abc'` | Numbers, arrays |
| `number` (angel numbers path) | String | `'1111'`, `'777'`, `'1234'` | `1111` (int) fails the `string` parameter type |
| `id` (nakshatra / dream / tarot) | Slug | `'ashwini'`, `'flying'`, `'the-fool'` | Display names, uppercase, spaces |
| `houseSystem` | Enum | `'placidus'` (default), `'whole-sign'`, `'equal'`, `'koch'` | `'Placidus'`, `'whole_sign'`, `'WS'` |
| `ayanamsa` (KP) | Enum | `'kp-newcomb'` (default), `'kp-old'`, `'lahiri'`, `'custom'` | `'KP'`, `'New Comb'`, `'Lahiri'` |
| `nodeType` (KP) | Enum | `'mean'` (default, traditional Vedic), `'true'` (osculating with perturbation corrections) | `'true-node'`, `'mean-node'`, `'True Node'` |
| `count` (tarot draw) | Integer 1 to 78 | `3`, `10`, `78` | `0`, `79`, strings, floats |
| `mahadasha` (path) | Planet name | `'Ketu'`, `'Venus'`, `'Sun'`, `'Moon'`, `'Mars'`, `'Rahu'`, `'Jupiter'`, `'Saturn'`, `'Mercury'` | `'KETU'` (works, case-insensitive), `'ke'`, `'Ke-tu'` |
| `person1` / `person2` | Array with full birth data | `['date' => ..., 'time' => ..., 'latitude' => ..., 'longitude' => ..., 'timezone' => ...]` | Separate top-level fields, missing time, partial array |
| `question` (tarot / iching) | Optional string | `'Should I accept the job offer?'`, `'What should I focus on this week?'` | Omit for a general reading. More specific = better interpretation. |
| `year` / `month` / `day` (numerology) | Integer | `1990`, `1`, `15` | Zero-padded strings `'01'`, floats, full dates |

### Timezone cheat sheet (most-asked locations)

| Region | Decimal | Region | Decimal |
|--------|---------|--------|---------|
| UTC / London (winter) | `0` | Dubai | `4` |
| London (summer, BST) | `1` | Karachi | `5` |
| Berlin / Paris | `1` (winter) / `2` (summer) | Delhi (IST) | `5.5` |
| Istanbul | `3` | Kathmandu (NPT) | `5.75` |
| Moscow | `3` | Dhaka | `6` |
| Tehran | `3.5` (winter) / `4.5` (summer) | Bangkok | `7` |
| Adelaide | `9.5` (winter) / `10.5` (summer) | Singapore / Beijing | `8` |
| New York (EST / EDT) | `-5` / `-4` | Tokyo | `9` |
| Chicago (CST / CDT) | `-6` / `-5` | Sydney | `10` (winter) / `11` (summer) |
| Denver (MST / MDT) | `-7` / `-6` | Auckland | `12` (winter) / `13` (summer) |
| Los Angeles (PST / PDT) | `-8` / `-7` | Honolulu | `-10` |

DST matters. If the birth date falls inside a daylight-saving window, use the summer / DST offset, or pass the IANA string from the location lookup and let the server resolve it. India observes no DST, so a fixed `5.5` is always right there; anywhere else, a natal chart must carry the offset in force at the time of birth.

## Astrology domain gotchas for LLMs

LLMs hallucinate confidently in this category. These are the specific traps you will hit when writing client code:

- **Ayanamsa is server-side in Vedic.** LLMs default to tropical / Western math. Vedic endpoints apply sidereal Lahiri ayanamsa server-side. KP endpoints accept `ayanamsa` of `kp-newcomb` (default), `kp-old`, `lahiri`, or `custom`. Do not try to "correct" server output by subtracting ayanamsa in client code.
- **Tithi count is 30, not 2.** 15 Shukla (waxing) plus 15 Krishna (waning). Older LLM training data conflates Purnima and Amavasya as single tithis. Our panchang response carries a `paksha` field (`"Shukla"` or `"Krishna"`) plus a tithi number, so there are 30 distinct tithis in a lunar month.
- **Rahu and Ketu are shadow points, not planets.** They do not appear in a real ephemeris. Endpoints accept `nodeType` of `"mean"` (smooth mean node, traditional Vedic default) or `"true"` (osculating node with perturbation corrections) to select which calculation to use.
- **Nakshatra count is 27.** Abhijit is sometimes treated as a 28th in some schools, but this API uses the standard 27. `$roxy->vedicAstrology->listNakshatras()` returns an array of length 27.
- **Retrograde is per-planet, not global.** Natal chart planets and Vedic `meta` include `isRetrograde` (a boolean) per planet. KP planet lists use `retrograde`. Never generate "Mercury retrograde globally" UI copy, check the specific planet in the response.
- **Tarot reversals are a product choice.** `allowReversals: false` on a tarot draw means no reversed cards in that draw, period. It is not cosmically meaningful, it is a config flag.
- **Angel number lookup works for any positive integer.** Digit-root fallback covers non-canonical numbers. Do not generate validation logic that rejects anything other than `111` / `222` / `333`.
- **Seed-based daily endpoints are DETERMINISTIC per `(seed, date)` pair.** Same seed plus same date returns the same reading. This is by design for push-notification consistency. Do not describe it as "cached" or retry on stale responses.
- **Timezone affects Western calculations more than Vedic.** Western natal charts must respect DST at the time of birth. Vedic endpoints default to IST (`5.5`) which is DST-free. Pass the IANA `timezone` string from the location lookup (`"America/New_York"`, `"Asia/Kolkata"`) directly to chart calls and the server resolves the DST-correct offset for the chart `date`. Never pass the `utcOffset` of the city record (the offset in force today) or the clock of the user right now.

## Error handling

All errors throw `RoxyAPI\Sdk\RoxyApiException` with `statusCode`, `errorCode` (machine-readable, switch on this), `error` (human-readable, may change wording), `docUrl` (`?string`) and `retryAfter` (`?int` seconds from `Retry-After`). `$e->code()` returns the `RoxyAPI\Sdk\ErrorCode` enum case, or null for an unknown newer code. A `validation_error` also carries `issues` (list of `path`, `message`, `code`) and `$e->response` is the raw Saloon response.

```php
use RoxyAPI\Sdk\ErrorCode;
use RoxyAPI\Sdk\RoxyApiException;

try {
    $horoscope = $roxy->astrology->getDailyHoroscope(sign: 'aries');
    echo $horoscope['overview'];
} catch (RoxyApiException $e) {
    match ($e->code()) {
        ErrorCode::ValidationError => error_log("fix the request: {$e->error}"),
        default => error_log("[{$e->statusCode}] {$e->errorCode}: {$e->error}"),
    };
}
```

<!-- BEGIN:ERRORS -->
Every error returns `{ error, code, doc_url }`. Switch on `code`; `error` is readable text and may change. Each meaning below says whether and when to retry, and `Retry-After` carries the wait when the response sends it. Every code is documented at https://roxyapi.com/docs/errors.

| Status | Code | Meaning |
|---|---|---|
| 400 | `validation_error` | A field is missing or invalid. The body lists every failing field at once in issues, each with its path and the expected shape. |
| 400 | `bad_request` | The request was rejected as a whole, for example a body that is not valid JSON or a date range that ends before it starts. |
| 400 | `date_out_of_range` | A date lies outside the span the planetary positions are served for. The error names the supported dates. |
| 401 | `api_key_required` | No API key was sent. |
| 401 | `invalid_api_key` | The key sent is malformed or cannot be verified. |
| 401 | `api_key_revoked` | The key was valid once and has since been revoked from the account page. |
| 401 | `subscription_not_found` | The key verifies, but the subscription behind it no longer exists. |
| 401 | `subscription_inactive` | The subscription behind the key is cancelled, expired or suspended, or a trial is past its end date. |
| 401 | `publishable_key_not_allowed_on_mcp` | A publishable key was used on a Remote MCP server, which takes a secret key. |
| 401 | `invalid_client_ip` | A keyless request could not be attributed to a caller. |
| 401 | `unauthorized` | Authentication failed with no more specific reason to give. |
| 403 | `forbidden` | The key is valid, but this request is not permitted. |
| 403 | `origin_required` | A publishable key with an origin allowlist was used with no Origin header, as from a server or a native app. |
| 403 | `origin_not_allowed` | The calling site is not on the origin allowlist of this publishable key. |
| 404 | `not_found` | Nothing is served at this path, or the identifier in it does not exist. A path miss adds suggestions, the closest real endpoints. |
| 405 | `method_not_allowed` | The path exists for a different HTTP method. The body lists the accepted methods in allow, as does the Allow header. |
| 409 | `conflict` | The request cannot be applied in the current state. |
| 410 | `gone` | The path was removed permanently. |
| 413 | `payload_too_large` | The request body is larger than the API accepts. A body far over the cap is refused before it reaches the API and returns a bare 413 with no JSON body. |
| 415 | `unsupported_media_type` | A request with a body was sent without Content-Type: application/json. |
| 422 | `unprocessable_entity` | Every field is valid, but the combination cannot be computed. |
| 429 | `rate_limit_exceeded` | The monthly request allowance is used up. Retry-After gives the seconds to the reset. |
| 429 | `rate_limit_per_minute` | The per-minute limit of the plan was reached. Retry-After gives the seconds to the next minute, and the monthly allowance is not charged. |
| 429 | `rate_limited` | A rate limit was reached, reported without the plan detail. |
| 429 | `free_tier_exhausted` | A keyless request has used up its trial allowance. |
| 500 | `internal_error` | The request failed inside our service. Retry with exponential backoff. |
| 503 | `compute_saturated` | Heavy calculations are briefly at capacity. Send the same request again after Retry-After seconds. |
| Any | `error` | A fallback for a status with no more specific code. The status and the error field carry the signal. |
<!-- END:ERRORS -->

### Retries

The client retries twice by default: 429, 500, 502, 503, 504 and never-sent connection failures. It honours `Retry-After` and does not retry when the wait exceeds `maxDelayMs` (the error carries `retryAfter`). Never read timeouts. Tune with a policy, or turn off with `maxRetries: 0`.

```php
use RoxyAPI\Sdk\Retry\RetryPolicy;
use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy(getenv('ROXY_API_KEY'), new RetryPolicy(maxRetries: 0)); // retries off
// on failure: $e->errorCode e.g. 'rate_limit_per_minute' or 'compute_saturated', $e->docUrl, $e->retryAfter
```

## MCP equivalents

Every method has a matching MCP tool. The remote MCP server per domain is at `https://roxyapi.com/mcp/{domain}` (Streamable HTTP, no stdio / no self-hosting). Tool names follow `{method}_{path_snake_case}`, for example:

- `POST /astrology/natal-chart` -> `post_astrology_natal_chart` on `/mcp/astrology`
- `GET /astrology/horoscope/{sign}/daily` -> `get_astrology_horoscope_sign_daily` on `/mcp/astrology`
- `POST /vedic-astrology/birth-chart` -> `post_vedic_astrology_birth_chart` on `/mcp/vedic-astrology`
- `POST /tarot/spreads/celtic-cross` -> `post_tarot_spreads_celtic_cross` on `/mcp/tarot`

Use the SDK for PHP apps. Use MCP for AI agents (Claude Desktop, Cursor MCP, OpenAI agents) where the agent selects tools based on user intent.

## Gotchas

- **Geocode first.** Any chart, panchang, synastry, compatibility, or natal endpoint needs coordinates. Call `$roxy->location->searchCities` before the chart method.
- **Use named arguments.** Methods take many parameters; positional ordering is unstable across regenerations.
- **Do not guess method names.** They come from `operationId` in the OpenAPI spec, not URL paths; the generated resource class lists them.
- **Do not use raw `curl` or Guzzle directly.** The SDK handles auth, base URL, and error decoding.
- **Do not expose API keys client-side.** Call Roxy from server code only.
- **Date format is `YYYY-MM-DD`, time is `HH:MM:SS`.** Both are strings.
- **Western `timezone` is required** and accepts decimal (`-5`, `5.5`, `0`) or IANA (`'America/New_York'`, `'Asia/Kolkata'`). IANA is resolved to the DST-correct offset for the request `date`. Vedic endpoints accept an optional `timezone` that defaults to `5.5` (IST).
- **Switch on `$e->errorCode` (or `$e->code()`), not `$e->error`.** The message may change; the code is stable. `$e->getCode()` is the HTTP status int, never the API code.
- **A `validation_error` carries `issues`, each with `path` (the dot-separated field, such as `time` or `person1.date`), `message` and `code`.** Loop over them to show every failing field:
  ```php
  foreach ($e->issues ?? [] as $issue) {
      echo "{$issue['path']}: {$issue['message']} ({$issue['code']})\n";
  }
  ```
- **A city record has `city`, `province`, `country`, `iso2`, `latitude`, `longitude`, `timezone`, `utcOffset` and `population`.** The name is `city`, never `name`.
- **`utcOffset` on a city record is the offset in force today.** Pass the IANA `timezone` string to chart calls so the server resolves the offset for the birth date.
- **A natal chart `planets` is a list of objects.** Find a body by `name`: `array_values(array_filter($chart['planets'], fn ($p) => 'Moon' === $p['name']))[0]`.
- **In a Vedic chart `meta.Moon.rashi` is a string and `meta.Moon.nakshatra` is an object** (`name`, `pada`, `lord`). Display `$kundli['meta']['Moon']['nakshatra']['name']`.
- **`sign` is matched case-insensitively.** Lowercase is canonical.
- **Total requests on a persistent failure = 1 + retries.** The default `maxRetries` of 2 makes 3 requests; `maxRetries: 0` makes exactly one.
- **List endpoints return a paginated envelope**, `['total' => ..., 'limit' => ..., 'offset' => ...]` plus a named array (`cities`, `crystals`, `hexagrams`, `symbols`), never a bare list. Pass `limit:` to widen a page; `listHexagrams` defaults to 20 of 64.
- **Optional response fields are absent, not null.** Reading one that is not there is an `Undefined array key` warning: `$dosha['severity']` and `$dosha['remedies']` exist only when `$dosha['present']` is true, so guard with `??` or check the flag first.

## Links

- Documentation: https://roxyapi.com/docs
- Interactive API docs: https://roxyapi.com/api-reference
- Pricing and API keys: https://roxyapi.com/pricing
- MCP for AI agents: https://roxyapi.com/docs/mcp
- Templates: https://roxyapi.com/templates
- UI components: https://github.com/roxyapi/ui
- Source and issues: https://github.com/RoxyAPI/sdk-php
- Other SDKs: TypeScript https://www.npmjs.com/package/@roxyapi/sdk, Python https://pypi.org/project/roxy-sdk/, .NET https://www.nuget.org/packages/RoxyApi.Sdk, Go https://pkg.go.dev/github.com/RoxyAPI/sdk-go, Rust https://crates.io/crates/roxyapi
