# roxyapi/sdk - Agent Guide

PHP SDK for RoxyAPI. 12+ domains (Western astrology, Vedic astrology, numerology, tarot, human design, forecast, biorhythm, I Ching, crystals, dreams, angel numbers, location) plus utility namespaces (usage, languages). One API key, one Composer package, zero hand-written endpoint code.

## Install and initialize

```bash
composer require roxyapi/sdk
```

```php
use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy(getenv('ROXY_API_KEY'));
```

`createRoxy` sets the base URL (`https://roxyapi.com/api/v2`) and the `X-API-Key` header automatically. Every method returns `array<string, mixed>` decoded from JSON, or throws `RoxyAPI\Sdk\RoxyApiException` on 4xx/5xx.

## Critical rule: geocode before any chart endpoint

Every chart, horoscope, panchang, dasha, dosha, navamsa, KP, synastry, compatibility, and natal endpoint needs `latitude`, `longitude`, and (for Western) `timezone`. Never ask the user for coordinates. Always call `$roxy->location->searchCities` first.

```php
$result = $roxy->location->searchCities(q: 'New York');
['latitude' => $lat, 'longitude' => $lon, 'timezone' => $tz] = $result['cities'][0];

// $tz is the IANA string ("America/New_York"). Pass it directly to chart calls and
// the server resolves it to the DST-correct offset for the chart `date`. The
// decimal `utcOffset` (5.5, -5, ...) also works if you prefer numbers.
```

`q` accepts bare city (`'Paris'`), city + country (`'Berlin Germany'`), or comma-qualified (`'Springfield, Illinois'`). Use the qualified form to disambiguate same-named cities.

## Domains

<!-- BEGIN:DOMAINS -->
| Property | What it covers |
|---|---|
| `$roxy->astrology` | Western astrology API for natal birth charts, daily, weekly, and monthly horoscopes with unique content per sign, syn... |
| `$roxy->vedicAstrology` | Vedic astrology (Jyotish) and KP API for kundli generation with 15 divisional charts (D1-D60), Ashtakoot Gun Milan ku... |
| `$roxy->numerology` | Numerology API to calculate life path, expression, soul urge, personality, and maturity numbers, with Pinnacle and Ch... |
| `$roxy->tarot` | Tarot reading API with the complete 78-card Rider-Waite-Smith deck and card meanings for love, career, health, and sp... |
| `$roxy->humanDesign` | Generate the full Human Design bodygraph from a birth moment: type, strategy, inner authority, profile, definition, i... |
| `$roxy->forecast` | Merge upcoming transit aspects, sign ingresses, retrograde stations, new and full moons, biorhythm critical days, and... |
| `$roxy->biorhythm` | The most complete biorhythm API: 10 cycle types across 3 primary (physical, emotional, intellectual), 4 secondary (in... |
| `$roxy->iching` | I-Ching oracle API with all 64 hexagrams, 384 changing lines, 8 trigrams, and modern interpretations for love, career... |
| `$roxy->crystals` | Crystal healing API covering the most popular and widely-searched healing crystals and gemstones, from Amethyst and R... |
| `$roxy->dreams` | Dream interpretation API with a 2,000+ symbol dream dictionary and psychological meanings covering animals, objects,... |
| `$roxy->angelNumbers` | Angel numbers API with meanings for 111, 222, 333, 444, 555, 666, 777, 888, 999, 1111, and 75+ sequences covering eve... |
| `$roxy->location` | City search and geocoding API with 23,000+ cities across 240+ countries, returning latitude, longitude, IANA timezone... |
| `$roxy->usage` | Monitor your API usage, check rate limits, and track request consumption |
| `$roxy->languages` | List the response languages accepted by the `lang` query parameter on every i18n-aware endpoint |
<!-- END:DOMAINS -->

160+ endpoints across 12+ product domains plus usage and languages. The table above auto-syncs from `specs/openapi.json` at release time.

## Critical patterns

### Two-step pattern for coordinate-dependent endpoints

```php
$cities = $roxy->location->searchCities(q: 'London');
['latitude' => $lat, 'longitude' => $lon, 'timezone' => $tz] = $cities['cities'][0];

$chart = $roxy->astrology->generateNatalChart(
    date: '1990-01-15',
    time: '14:30:00',
    latitude: $lat,
    longitude: $lon,
    timezone: $tz,
);
```

### GET endpoints

Path params and query params are named arguments on the resource method.

```php
$roxy->astrology->getDailyHoroscope(sign: 'aries');
$roxy->crystals->getCrystalsByZodiac(sign: 'leo');
$roxy->crystals->searchCrystals(q: 'amethyst');
```

### POST endpoints

Body fields are named arguments on the resource method - no manual array building.

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

Eight languages: `en`, `tr`, `de`, `es`, `fr`, `hi`, `pt`, `ru`. Defaults to `en`.

```php
$roxy->tarot->getDailyCard(date: '2026-04-22', lang: 'es');
$roxy->numerology->calculateLifePath(year: 1990, month: 1, day: 15, lang: 'hi');
```

Supported: `astrology`, `vedicAstrology`, `numerology`, `tarot`, `biorhythm`, `iching`, `crystals`, `angelNumbers`. English-only: `dreams`, `location`, `usage`, `languages`. To list supported codes at runtime, call `$roxy->languages->listLanguages()`.

### Error handling

All errors throw `RoxyAPI\Sdk\RoxyApiException` with `statusCode`, `errorCode` (machine-readable - switch on this), and `error` (human-readable - may change wording).

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
| 404 | `not_found` | Resource not found |
| 429 | `rate_limit_exceeded` | Monthly quota reached |
| 500 | `internal_error` | Server error |

## Field formats that trip agents

| Field | Format | Good | Bad |
|-------|--------|------|-----|
| `timezone` | Decimal hours (number) OR IANA string | `5.5`, `-5`, `0` (decimal) OR `'Asia/Kolkata'`, `'America/New_York'` | `'5:30'`, `'+0530'`, `'GMT-5'` |
| `date` | ISO date string | `'1990-01-15'` | `'Jan 15 1990'`, `'15/01/1990'`, `'1990-1-15'` |
| `time` | 24-hour string with seconds | `'14:30:00'`, `'09:00:00'` | `'2:30 PM'`, `'14:30'`, `'9:0:0'` |
| `latitude` | Decimal degrees (float) | `51.5074`, `-33.8688`, `40.7128` | `"28°36'N"`, strings |
| `longitude` | Decimal degrees (float) | `-0.1278`, `-74.0060`, `139.6917` | DMS strings |
| `sign` (path) | Lowercase zodiac | `'aries'`, `'taurus'`, ... `'pisces'` | `'Aries'`, `'ARIES'`, `'1'` |
| `fullName` (numerology) | Birth-certificate name | `'John William Smith'` | Nicknames, married names |
| `seed` | Any string (deterministic) | `'user-42'`, `'session-abc'` | Numbers, objects |

DST matters for Western charts. If the birth date falls in a DST window, use the summer offset, or pass the IANA `timezone` string and let the server resolve it.

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

See `examples/render-with-ui.html` for the full pattern. Component coverage and docs: <https://roxyapi.github.io/ui/>.

## Common tasks

| Task | Code |
|------|------|
| Daily horoscope | `$roxy->astrology->getDailyHoroscope(sign: 'aries')` |
| Natal chart | `$roxy->astrology->generateNatalChart(date: ..., time: ..., latitude: ..., longitude: ..., timezone: ...)` |
| Synastry | `$roxy->astrology->calculateSynastry(person1: [...], person2: [...])` |
| Current moon phase | `$roxy->astrology->getCurrentMoonPhase()` |
| Kundli (Vedic) | `$roxy->vedicAstrology->generateBirthChart(date: ..., time: ..., latitude: ..., longitude: ...)` |
| Detailed panchang | `$roxy->vedicAstrology->getDetailedPanchang(date: ..., latitude: ..., longitude: ...)` |
| Current dasha | `$roxy->vedicAstrology->getCurrentDasha(date: ..., time: ..., latitude: ..., longitude: ...)` |
| Manglik dosha | `$roxy->vedicAstrology->checkManglikDosha(date: ..., time: ..., latitude: ..., longitude: ...)` |
| Guna Milan | `$roxy->vedicAstrology->calculateGunMilan(person1: [...], person2: [...])` |
| Life path | `$roxy->numerology->calculateLifePath(year: ..., month: ..., day: ...)` |
| Daily tarot card | `$roxy->tarot->getDailyCard(seed: 'user-42')` |
| Three-card spread | `$roxy->tarot->castThreeCard(question: '...')` |
| Celtic Cross | `$roxy->tarot->castCelticCross(question: '...')` |
| Daily biorhythm | `$roxy->biorhythm->getDailyBiorhythm(seed: 'user-42')` |
| Cast I Ching | `$roxy->iching->castReading()` |
| Crystal by zodiac | `$roxy->crystals->getCrystalsByZodiac(sign: 'leo')` |
| Dream symbol | `$roxy->dreams->getDreamSymbol(id: 'flying')` |
| Angel number | `$roxy->angelNumbers->getAngelNumber(number: '1111')` |
| Find city coordinates | `$roxy->location->searchCities(q: 'Berlin')` |
| Check API usage | `$roxy->usage->getUsageStats()` |
| List languages | `$roxy->languages->listLanguages()` |

## Testing your integration

Use Saloon's `MockClient` to avoid live calls in tests.

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

- Geocode first. Any chart, panchang, synastry, compatibility, or natal endpoint needs coordinates. Call `$roxy->location->searchCities` before the chart method.
- Use named arguments. Methods take many parameters; positional ordering is unstable across regenerations.
- Do not use raw `curl` or `Guzzle` directly. The SDK handles auth, base URL, and error decoding.
- Do not expose API keys client-side. Call from server code only.
- `date` is `YYYY-MM-DD`, `time` is `HH:MM:SS`. Both strings.
- Western `timezone` is required and accepts decimal (`-5`, `5.5`, `0`) or IANA (`'America/New_York'`, `'Asia/Kolkata'`).
- Switch on `$e->errorCode`, not `$e->error`. Code is stable; message may change.

## Links

- API reference: <https://roxyapi.com/api-reference>
- Pricing and API keys: <https://roxyapi.com/pricing>
- MCP for AI agents: <https://roxyapi.com/docs/mcp>
- Sibling SDKs: TypeScript (`@roxyapi/sdk`), Python (`roxy-sdk`)
- UI components: <https://github.com/roxyapi/ui>

## Quality guidelines for agents

- This SDK returns `array<string, mixed>` from every method. Access fields with `$result['key']['subkey']`, never `$result->key->subkey`. Object syntax throws `Error: Attempt to read property "key" on array`.
- Method names match the OpenAPI spec's `operationId` verbatim (already camelCase). Params are camelCase named arguments matching the spec's `requestBody.properties`, path, and query names. Response field names match the spec's `responses.200.content.application/json.schema.properties` (drill into nested `.properties` for sub-objects, `.items.properties` for array items).
- Sub-objects are arrays, not scalars. The natal-chart `ascendant` is `['sign' => ..., 'degree' => ...]`, not a string — `echo $chart['ascendant']['sign']`, not `echo $chart['ascendant']`.
- `RoxyApiException` is a real PHP object — `$e->statusCode`, `$e->errorCode`, `$e->error` use object syntax. Only successful response payloads are arrays.
- When in doubt, check the SDK source: `vendor/roxyapi/sdk/src/Generated/Resources/<Tag>Resource.php` lists every method with its full signature, and `vendor/roxyapi/sdk/specs/openapi.json` is the authoritative shape. Never invent method names, parameter names, or response fields.
