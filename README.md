<p align="center">
  <a href="https://roxyapi.com">
    <img src="https://raw.githubusercontent.com/RoxyAPI/sdk-php/main/assets/hero.png" alt="Roxy PHP SDK. Astrology, Vedic, numerology, tarot, and more behind one API key." width="100%">
  </a>
</p>

# roxyapi/sdk

[![Packagist](https://img.shields.io/packagist/v/roxyapi/sdk.svg)](https://packagist.org/packages/roxyapi/sdk)
[![PHP Version](https://img.shields.io/packagist/php-v/roxyapi/sdk.svg)](https://packagist.org/packages/roxyapi/sdk)

Official PHP SDK for [RoxyAPI](https://roxyapi.com): natal charts, daily horoscopes, synastry, Vedic kundli, tarot spreads, human design bodygraphs, and transit forecasts across Western and Vedic astrology, forecast, human design, Chinese astrology, feng shui, Mesoamerican astrology, Vastu, numerology, Kabbalah, tarot, biorhythm, Ayurveda, I Ching, crystals, dreams, angel numbers, and location geocoding. 258+ endpoints across 18+ domains, one API key, one dependency (Saloon).

## Install

```bash
composer require roxyapi/sdk
```

Requires PHP 8.2+.

## Quick start

```php
<?php
require __DIR__ . '/vendor/autoload.php';

use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy(getenv('ROXY_API_KEY'));

// Daily horoscope
$horoscope = $roxy->astrology->getDailyHoroscope(sign: 'aries');
echo $horoscope['overview'], PHP_EOL;

// Geocode first, then chart
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

Get an API key at [roxyapi.com/pricing](https://roxyapi.com/pricing). All endpoints take an API key via the `X-API-Key` header (set automatically by the SDK).

## What is exposed

`createRoxy($apiKey)` returns a `Roxy` connector that lazy-loads one resource per OpenAPI tag:

<!-- BEGIN:DOMAINS -->
| Property | What it covers |
|---|---|
| `$roxy->astrology` | Western astrology API for natal birth charts, daily, weekly, monthly, and yearly horoscopes with unique content per s... |
| `$roxy->vedicAstrology` | Vedic astrology (Jyotish) and KP API for kundli generation with 15 divisional charts (D1-D60), Ashtakoot Gun Milan ku... |
| `$roxy->forecast` | Forecast API that merges upcoming transit aspects, sign ingresses, retrograde stations, new and full moons, biorhythm... |
| `$roxy->humanDesign` | Generate the full Human Design bodygraph from a birth moment: type, strategy, inner authority, profile, definition, i... |
| `$roxy->chineseAstrology` | Calculate BaZi Four Pillars charts, Chinese zodiac signs, and the Chinese lunisolar calendar from any birth moment: y... |
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
| `$roxy->location` | Location and timezone API with city search and geocoding across 235,000+ cities in 240+ countries, returning latitude... |
| `$roxy->usage` | Monitor your API usage, check rate limits, and track request consumption |
| `$roxy->languages` | List the response languages accepted by the `lang` query parameter on every i18n-aware endpoint |
<!-- END:DOMAINS -->

Every method returns `array<string, mixed>` decoded from JSON, or throws `RoxyAPI\Sdk\RoxyApiException` on 4xx/5xx.

## Error handling

```php
use RoxyAPI\Sdk\RoxyApiException;

try {
    $roxy->astrology->getDailyHoroscope(sign: 'invalid');
} catch (RoxyApiException $e) {
    // $e->statusCode (int)   - HTTP status, e.g. 400
    // $e->errorCode (string) - machine-readable, e.g. 'validation_error' (switch on this)
    // $e->error     (string) - human-readable message
    error_log("[{$e->statusCode}] {$e->errorCode}: {$e->error}");
}
```

Stable codes: `validation_error`, `api_key_required`, `invalid_api_key`, `subscription_inactive`, `not_found`, `rate_limit_exceeded`, `internal_error`.

## Multi-language responses

Pass `lang` (ISO 639-1) on supported endpoints. Defaults to English. Eight languages: `en`, `tr`, `de`, `es`, `fr`, `hi`, `pt`, `ru`.

```php
$roxy->tarot->getDailyCard(seed: 'user-42', lang: 'es');
$roxy->numerology->calculateLifePath(year: 1990, month: 1, day: 15, lang: 'hi');
```

`$roxy->languages->listLanguages()` returns the canonical list at runtime.

## Rendering with @roxyapi/ui

This SDK fetches JSON. For HTML rendering, hand the JSON to [@roxyapi/ui](https://github.com/roxyapi/ui) web components in the browser.

`examples/render-with-ui.html` shows the full pattern: PHP endpoint backed by the SDK, browser fetches JSON and assigns it to a `<roxy-natal-chart>` element. No PHP-side templating.

## Testing your integration

Saloon's `MockClient` lets you mock requests by class:

```php
use RoxyAPI\Sdk\Generated\Requests\GetDailyHoroscopeRequest;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy('test-key');
$roxy->withMockClient(new MockClient([
    GetDailyHoroscopeRequest::class => MockResponse::make([
        'sign' => 'aries', 'overview' => 'fixture',
    ]),
]));

$result = $roxy->astrology->getDailyHoroscope(sign: 'aries');
```

## Examples

- `examples/vanilla-php.php` - raw PHP, prints a horoscope
- `examples/laravel.php` - Laravel service provider snippet
- `examples/human-design.php` - full Human Design bodygraph, prints type, strategy, and profile
- `examples/forecast.php` - cross-domain forecast timeline, prints the event count and a sample event
- `examples/chinese-astrology.php` - BaZi four pillars plus the zodiac sign, prints the pillars and the conventions used
- `examples/feng-shui.php` - Kua number and a flying star natal chart, prints the eight sectors and the nine palaces
- `examples/render-with-ui.html` - server-side fetch + browser render via `@roxyapi/ui`

## Documentation

- API reference: <https://roxyapi.com/api-reference>
- Agent guide (`AGENTS.md`): bundled in the package, optimised for AI coding agents
- MCP setup for AI agents: <https://roxyapi.com/docs/mcp>
- Sibling SDKs: [TypeScript](https://www.npmjs.com/package/@roxyapi/sdk), [Python](https://pypi.org/project/roxy-sdk/)

## License

MIT
