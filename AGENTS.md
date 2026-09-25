# roxyapi/sdk - Agent Guide

PHP SDK for RoxyAPI. 18+ domains (Western astrology, Vedic astrology, forecast, human design, Chinese astrology, feng shui, Mesoamerican astrology, Vastu, numerology, Kabbalah, tarot, biorhythm, Ayurveda, I Ching, crystals, dreams, angel numbers, location) plus utility namespaces (usage, languages). One API key, one Composer package, zero hand-written endpoint code.

## Install and initialize

```bash
composer require roxyapi/sdk
```

```php
use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy(getenv('ROXY_API_KEY'));
```

`createRoxy` sets the base URL (`https://roxyapi.com/api/v2`) and the auth header automatically. Every method returns `array<string, mixed>` decoded from JSON, or throws `RoxyAPI\Sdk\RoxyApiException` on 4xx/5xx.

## Critical rule: geocode before any chart endpoint

Every chart, horoscope, panchang, dasha, dosha, navamsa, KP, synastry, compatibility, and natal endpoint needs `latitude`, `longitude`, and (for Western) `timezone`. **Never ask the user for coordinates.** Always call `$roxy->location->searchCities` first.

```php
$place = $roxy->location->searchCities(q: 'New York');
['latitude' => $latitude, 'longitude' => $longitude, 'timezone' => $timezone] = $place['cities'][0];
// `timezone` is the IANA string ("America/New_York"). Pass it directly to any chart
// endpoint and the server resolves it to the DST-correct decimal offset using
// the `date` of the chart itself, so a January 1990 New York chart picks EST (-5) even
// when you looked the city up in July. If you prefer numbers, `utcOffset`
// (5.5, -5, 9, ...) also works and produces identical charts.
```

`q` accepts bare city (`'Paris'`), city + country (`'Berlin Germany'`), or comma-qualified (`'Springfield, Illinois'`). Use the qualified form to disambiguate same-named cities.

## Domains

<!-- BEGIN:DOMAINS -->
| Property | What it covers |
|---|---|
| `$roxy->astrology` | Western astrology API for natal birth charts, daily, weekly, monthly, and yearly horoscopes with unique content per s... |
| `$roxy->vedicAstrology` | Vedic astrology (Jyotish) and KP API for kundli generation with the sixteen Shodasavarga divisional charts (D1 to D60... |
| `$roxy->forecast` | Astrology forecast API that merges upcoming transit aspects, sign ingresses, retrograde stations, new and full moons,... |
| `$roxy->humanDesign` | Human Design API that generates the full bodygraph from a birth moment: type, strategy, inner authority, profile, def... |
| `$roxy->chineseAstrology` | Chinese zodiac and BaZi astrology API: Four Pillars charts, Chinese zodiac signs and the Chinese lunisolar calendar f... |
| `$roxy->fengShui` | Compute classical feng shui from one API: Xuan Kong flying star natal charts for any of the nine periods and 24 mount... |
| `$roxy->mesoamericanAstrology` | Calculate Mayan astrology day signs, the Tzolkin sacred round, the Haab year, the full Long Count and the Aztec tonal... |
| `$roxy->vastu` | Vastu Shastra API for directional home and plot analysis: entrance padas with the classical effect of each of the 32... |
| `$roxy->numerology` | Numerology API to calculate life path, expression, soul urge, personality, and maturity numbers, with Pinnacle and Ch... |
| `$roxy->kabbalah` | Kabbalah API for gematria, the 72 names, the Tree of Life and the Hebrew birthday, from one key |
| `$roxy->tarot` | Tarot reading API with the complete 78-card Rider-Waite-Smith deck and card meanings for love, career, health, and sp... |
| `$roxy->biorhythm` | The most complete biorhythm API: 10 cycle types across 3 primary (physical, emotional, intellectual), 4 secondary (in... |
| `$roxy->ayurveda` | Ayurveda API for dosha profiles, the dinacharya daily routine and the ritucharya seasonal regimen, with a verse cited... |
| `$roxy->iching` | I-Ching oracle API with all 64 hexagrams, 384 changing lines, 8 trigrams, and modern interpretations for love, career... |
| `$roxy->crystals` | Crystal healing API covering the most popular and widely-searched healing crystals and gemstones, from Amethyst and R... |
| `$roxy->dreams` | Dream interpretation API with a 2,000+ symbol dream dictionary and psychological meanings covering animals, objects,... |
| `$roxy->angelNumbers` | Angel numbers API with meanings for 111, 222, 333, 444, 555, 666, 777, 888, 999, 1111, and 75+ sequences covering eve... |
| `$roxy->location` | Timezone and location API with city search and geocoding across 235,000+ cities in 240+ countries, returning latitude... |
| `$roxy->usage` | Monitor your API usage, check rate limits, and track request consumption |
| `$roxy->languages` | List the response languages accepted by the `lang` query parameter on every i18n-aware endpoint |

The table above covers every endpoint and auto-syncs from the OpenAPI spec at release time.
<!-- END:DOMAINS -->

## Quality guidelines for agents

Five rules to follow when writing any call with this SDK. Get these right and the generated resource classes do the rest.

- **Named arguments, flattened.** Every method takes path params, query params and body fields as one list of named arguments, camelCase, matching the spec verbatim. Right: `$roxy->astrology->getDailyHoroscope(sign: 'aries')`. Wrong: `$roxy->astrology->getDailyHoroscope(['sign' => 'aries'])`. A nested body object (`person1`, `birthData`, `plot`, `rooms`) is an associative array; a birth array spreads into the named arguments with `...$birth`.
- **Arrays back, never objects.** Every method returns `array<string, mixed>`. Access fields with `$result['key']['subkey']`, never `$result->key->subkey`: object syntax throws `Error: Attempt to read property "key" on array`. Sub-objects are arrays too: the natal-chart `ascendant` is `['sign' => ..., 'degree' => ...]`, so `echo $chart['ascendant']['sign']`, not `echo $chart['ascendant']`.
- **Method names match the OpenAPI `operationId` verbatim** (already camelCase). When in doubt, read `vendor/roxyapi/sdk/src/Generated/Resources/<Tag>Resource.php`: it lists every method with its full signature. Never invent a method from the URL path or a guess.
- **Response field names come from the response schema of the spec.** The OpenAPI spec at <https://roxyapi.com/api/v2/openapi.json> is the authoritative shape: drill into nested `.properties` for sub-objects and `.items.properties` for array items. An invented field is an `Undefined array key` warning at runtime, so read every field you name from a real response before shipping.
- **Look up any operation or field beyond this guide.** Query the combined OpenAPI spec at <https://roxyapi.com/api/v2/openapi.json> with the jq recipe in <https://roxyapi.com/AGENTS.md>, or search the keyless Docs MCP server at <https://roxyapi.com/mcp/docs> (one tool, `search_docs`).
- **Do not hand-roll requests.** No raw `curl`, no direct Guzzle. The SDK injects auth, the base URL and error decoding; it does not retry, so wrap calls you want retried. `RoxyApiException` is a real PHP object: `$e->statusCode`, `$e->errorCode`, `$e->error` use object syntax. Only successful payloads are arrays.

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

### Error handling

All errors throw `RoxyAPI\Sdk\RoxyApiException` with `statusCode`, `errorCode` (machine-readable, switch on this), and `error` (human-readable, may change wording).

```php
use RoxyAPI\Sdk\RoxyApiException;

try {
    $horoscope = $roxy->astrology->getDailyHoroscope(sign: 'aries');
    echo $horoscope['overview'];
} catch (RoxyApiException $e) {
    error_log("[{$e->statusCode}] {$e->errorCode}: {$e->error}");
}
```

| Status | `errorCode` | When |
|--------|------|------|
| 400 | `validation_error` | Missing or invalid parameters |
| 401 | `api_key_required` | No API key provided |
| 401 | `invalid_api_key` | Key format invalid or tampered |
| 401 | `subscription_not_found` | Key references non-existent subscription |
| 401 | `subscription_inactive` | Subscription cancelled, expired, or suspended |
| 401 | `api_key_revoked` | Key was deleted from the account |
| 404 | `not_found` | Resource not found |
| 4xx | `bad_request` and other status-derived codes | A client error the endpoint itself detected, such as a date window whose `endDate` precedes `startDate` |
| 429 | `rate_limit_exceeded` | Monthly quota reached |
| 500 | `internal_error` | Server error |

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
| Daily tarot card | `$roxy->tarot->getDailyCard(seed: ...)` |
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

| Field | Format | Good | Bad |
|-------|--------|------|-----|
| `timezone` | Decimal hours (number) OR IANA string | `5.5`, `-5`, `0` (decimal) OR `'Asia/Kolkata'`, `'America/New_York'` (IANA, resolved to the DST-correct offset for the chart date) | `'5:30'`, `'+0530'`, `'GMT-5'` |
| `date` | ISO date string | `'1990-01-15'` | `'Jan 15 1990'`, `'15/01/1990'`, `'1990-1-15'` |
| `time` | 24-hour string with seconds | `'14:30:00'`, `'09:00:00'` | `'2:30 PM'`, `'14:30'`, `'9:0:0'` |
| `latitude` | Decimal degrees (float) | `51.5074`, `-33.8688`, `40.7128` | `"28°36'N"`, strings |
| `longitude` | Decimal degrees (float) | `-0.1278`, `-74.0060`, `139.6917` | DMS strings |
| `sign` (path) | Lowercase zodiac | `'aries'`, `'taurus'`, ... `'pisces'` | `'Aries'`, `'ARIES'`, `'1'` |
| `chakra` (crystals path) | Title-case English name from the fixed enum | `'Root'`, `'Sacral'`, `'Solar Plexus'`, `'Heart'`, `'Throat'`, `'Third Eye'`, `'Crown'` | `'heart'`, `'third-eye'` |
| `fullName` (numerology) | Birth-certificate name | `'John William Smith'` | Nicknames, married names |
| `seed` | Any string (deterministic) | `'user-42'`, `'session-abc'` | Numbers, arrays |
| `number` (angel numbers path) | String | `'1111'`, `'777'`, `'1234'` | `1111` (int) fails the `string` parameter type |
| `id` (nakshatra / dream / tarot) | Slug | `'ashwini'`, `'flying'`, `'the-fool'` | Display names, uppercase, spaces |
| `person1` / `person2` | Array with full birth data | `['date' => ..., 'time' => ..., 'latitude' => ..., 'longitude' => ..., 'timezone' => ...]` | Separate top-level fields, missing time, partial array |
| `year` / `month` / `day` (numerology) | Integer | `1990`, `1`, `15` | Zero-padded strings `'01'`, floats, full dates |

DST matters. If the birth date falls inside a daylight-saving window, use the summer / DST offset, or pass the IANA string from the location lookup and let the server resolve it. India observes no DST, so a fixed `5.5` is always right there; anywhere else, a natal chart must carry the offset in force at the time of birth.

## Rendering responses with `@roxyapi/ui`

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

## Testing your integration

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

## Gotchas

- **Geocode first.** Any chart, panchang, synastry, compatibility, or natal endpoint needs coordinates. Call `$roxy->location->searchCities` before the chart method.
- **Use named arguments.** Methods take many parameters; positional ordering is unstable across regenerations.
- **Do not guess method names.** They come from `operationId` in the OpenAPI spec, not URL paths; the generated resource class lists them.
- **Do not use raw `curl` or Guzzle directly.** The SDK handles auth, base URL, and error decoding.
- **Do not expose API keys client-side.** Call from server code only.
- **`date` is `YYYY-MM-DD`, `time` is `HH:MM:SS`.** Both strings.
- **Western `timezone` is required** and accepts decimal (`-5`, `5.5`, `0`) or IANA (`'America/New_York'`, `'Asia/Kolkata'`). IANA is resolved to the DST-correct offset for the request `date`. Vedic endpoints accept an optional `timezone` that defaults to `5.5` (IST).
- **Switch on `$e->errorCode`, not `$e->error`.** Code is stable; message may change.
- **List endpoints return a paginated envelope**, `['total' => ..., 'limit' => ..., 'offset' => ...]` plus a named array (`cities`, `crystals`, `hexagrams`, `symbols`), never a bare list. Pass `limit:` to widen a page; `listHexagrams` defaults to 20 of 64.
- **Optional response fields are absent, not null.** Reading one that is not there is an `Undefined array key` warning: `$dosha['severity']` and `$dosha['remedies']` exist only when `$dosha['present']` is true, so guard with `??` or check the flag first.

## Links

- API reference: <https://roxyapi.com/api-reference>
- Pricing and API keys: <https://roxyapi.com/pricing>
- MCP for AI agents: <https://roxyapi.com/docs/mcp>
- Templates: <https://roxyapi.com/templates>
- Sibling SDKs: TypeScript (`@roxyapi/sdk`), Python (`roxy-sdk`), .NET (`RoxyApi.Sdk`), Go (`github.com/RoxyAPI/sdk-go`)
- UI components: <https://github.com/roxyapi/ui>
