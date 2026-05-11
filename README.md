<p align="center">
  <a href="https://roxyapi.com">
    <img src="https://raw.githubusercontent.com/RoxyAPI/sdk-php/main/assets/hero.png" alt="Roxy PHP SDK. Astrology, Vedic, numerology, tarot, and more behind one API key." width="100%">
  </a>
</p>

# roxyapi/sdk

[![Packagist](https://img.shields.io/packagist/v/roxyapi/sdk.svg)](https://packagist.org/packages/roxyapi/sdk)
[![PHP Version](https://img.shields.io/packagist/php-v/roxyapi/sdk.svg)](https://packagist.org/packages/roxyapi/sdk)

Official PHP SDK for [RoxyAPI](https://roxyapi.com): Western and Vedic astrology, numerology, tarot, biorhythm, I Ching, crystals, dreams, angel numbers, location geocoding, and more. 131 endpoints across 12 domains, one API key, one dependency (Saloon).

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
$cities = $roxy->location->searchCities(q: 'Mumbai');
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
| Property | Endpoints | What it covers |
|---|---|---|
| `$roxy->astrology` | 22 | Production-ready Western astrology API + remote MCP for AI agents and developers |
| `$roxy->vedicAstrology` | 42 | Production-grade Vedic (Jyotish) and KP astrology API + remote MCP for AI agents and developers |
| `$roxy->numerology` | 16 | Production-ready Pythagorean numerology API + hosted MCP for AI agents and developers |
| `$roxy->tarot` | 10 | Production-ready tarot card reading API + hosted MCP for AI agents and developers |
| `$roxy->biorhythm` | 6 | The most complete biorhythm API + remote MCP for AI agents and developers |
| `$roxy->iching` | 9 | I-Ching oracle API + hosted MCP for AI agents and developers |
| `$roxy->crystals` | 12 | Production-ready crystal healing API + hosted MCP for AI agents and developers |
| `$roxy->dreams` | 5 | Dream interpretation API + hosted MCP for AI agents and developers |
| `$roxy->angelNumbers` | 4 | Production-ready angel numbers API + hosted MCP for AI agents and developers |
| `$roxy->location` | 3 | City search and geocoding API + hosted MCP for AI agents and astrology apps |
| `$roxy->usage` | 1 | Monitor your API usage, check rate limits, and track request consumption |
| `$roxy->languages` | 1 | List the response languages accepted by the `lang` query parameter on every i18n-aware endpoint |
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
- `examples/render-with-ui.html` - server-side fetch + browser render via `@roxyapi/ui`

## Documentation

- API reference: <https://roxyapi.com/api-reference>
- Agent guide (`AGENTS.md`): bundled in the package, optimised for AI coding agents
- MCP setup for AI agents: <https://roxyapi.com/docs/mcp>
- Sibling SDKs: [TypeScript](https://www.npmjs.com/package/@roxyapi/sdk), [Python](https://pypi.org/project/roxy-sdk/)

## License

MIT
