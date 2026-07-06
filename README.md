<p align="center">
  <a href="https://roxyapi.com">
    <img src="https://raw.githubusercontent.com/RoxyAPI/sdk-php/main/assets/hero.png" alt="Roxy PHP SDK. Astrology, Vedic, numerology, tarot, and more behind one API key." width="100%">
  </a>
</p>

# roxyapi/sdk

[![Packagist](https://img.shields.io/packagist/v/roxyapi/sdk.svg)](https://packagist.org/packages/roxyapi/sdk)
[![PHP Version](https://img.shields.io/packagist/php-v/roxyapi/sdk.svg)](https://packagist.org/packages/roxyapi/sdk)

Official PHP SDK for [RoxyAPI](https://roxyapi.com): natal charts, daily horoscopes, synastry, Vedic kundli, tarot spreads, human design bodygraphs, and transit forecasts across Western and Vedic astrology, numerology, tarot, human design, forecast, biorhythm, I Ching, crystals, dreams, angel numbers, and location geocoding. 160+ endpoints across 12+ domains, one API key, one dependency (Saloon).

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
- `examples/render-with-ui.html` - server-side fetch + browser render via `@roxyapi/ui`

## Documentation

- API reference: <https://roxyapi.com/api-reference>
- Agent guide (`AGENTS.md`): bundled in the package, optimised for AI coding agents
- MCP setup for AI agents: <https://roxyapi.com/docs/mcp>
- Sibling SDKs: [TypeScript](https://www.npmjs.com/package/@roxyapi/sdk), [Python](https://pypi.org/project/roxy-sdk/)

## License

MIT
