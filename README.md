<p align="center">
  <a href="https://roxyapi.com">
    <img src="https://raw.githubusercontent.com/RoxyAPI/sdk-php/main/assets/hero.png" alt="RoxyAPI PHP SDK, ship in an afternoon. The Spiritual OS layer for agentic AI. One key, flat pricing." width="100%">
  </a>
</p>

# roxyapi/sdk

[![Packagist](https://img.shields.io/packagist/v/roxyapi/sdk.svg)](https://packagist.org/packages/roxyapi/sdk)
[![PHP Version](https://img.shields.io/packagist/php-v/roxyapi/sdk.svg)](https://packagist.org/packages/roxyapi/sdk)

PHP SDK for astrology, Vedic astrology, numerology, tarot, and more.

One API key. Named arguments in, arrays out. Verified against NASA JPL Horizons.

The fastest way to add natal charts, daily horoscopes, synastry, Vedic kundli, tarot spreads, numerology, human design bodygraphs, and transit forecasts to PHP apps, Laravel and Symfony backends, and AI agents. 18+ domains behind a single [Roxy](https://roxyapi.com) subscription, interpretations in 10+ languages.

## Install

```bash
composer require roxyapi/sdk
```

Requires PHP 8.2+.

## Start with one call

Get real product value with a single call. No setup beyond your API key.

```php
<?php
require __DIR__ . '/vendor/autoload.php';

use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy(getenv('ROXY_API_KEY'));

$horoscope = $roxy->astrology->getDailyHoroscope(sign: 'aries');
echo $horoscope['overview'], PHP_EOL, $horoscope['love'], PHP_EOL, $horoscope['luckyNumber'], PHP_EOL;
```

Then expand into charts, compatibility, numerology, tarot, and more.

## Quick start

```php
<?php
require __DIR__ . '/vendor/autoload.php';

use function RoxyAPI\Sdk\createRoxy;

// Retries 429, 500, 502, 503 and 504 by default. Optional settings, shown with their defaults:
// createRoxy($key, new RetryPolicy(maxRetries: 2, initialDelayMs: 500, maxDelayMs: 30000))
$roxy = createRoxy(getenv('ROXY_API_KEY'));

// Step 1: geocode the birth city once. Every chart endpoint takes these three values.
$place = $roxy->location->searchCities(q: 'London');
['latitude' => $latitude, 'longitude' => $longitude, 'timezone' => $timezone] = $place['cities'][0];

// Step 2: a Western natal chart. `timezone` is the IANA string from the lookup
// ("Europe/London"); the server resolves it to the DST-correct offset for the
// date of the chart.
$chart = $roxy->astrology->generateNatalChart(
    date: '1990-01-15', time: '14:30:00', latitude: $latitude, longitude: $longitude, timezone: $timezone,
);

// Step 3: the same birth as a Vedic kundli. Same inputs, sidereal zodiac.
$kundli = $roxy->vedicAstrology->generateBirthChart(
    date: '1990-01-15', time: '14:30:00', latitude: $latitude, longitude: $longitude, timezone: $timezone,
);
```

`createRoxy` sets the base URL (`https://roxyapi.com/api/v2`) and injects the auth header and SDK identification header on every request. Every method returns `array<string, mixed>` decoded from JSON, or throws `RoxyAPI\Sdk\RoxyApiException` on 4xx / 5xx (see Error handling).

## Domains

`createRoxy($apiKey)` returns a `Roxy` connector that lazy-loads one resource per OpenAPI tag:

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
| [`$roxy->location`](https://roxyapi.com/api-reference/location-and-timezone) | Timezone and location API with city search and geocoding across 235,000+ cities in 240+ countries, returning latitude... |
| [`$roxy->usage`](https://roxyapi.com/api-reference/usage) | Monitor your API usage, check rate limits, and track request consumption |
| [`$roxy->languages`](https://roxyapi.com/api-reference/languages) | List the response languages accepted by the `lang` query parameter on every i18n-aware endpoint |

The table above covers every endpoint and auto-syncs from the OpenAPI spec at release time.
<!-- END:DOMAINS -->

## Most-used endpoints

The highest-demand endpoints by domain, in the order you are most likely to ship them. Every example below reads the same birth through a different domain, and every coordinate comes from one location lookup at the top: one API key, one lookup, and eighteen domains that compose into a single product instead of eighteen separate ones. Full catalog in the [API reference](https://roxyapi.com/api-reference).

### Location first: one lookup feeds every chart

Every chart, horoscope, panchang, dasha, dosha, synastry and compatibility endpoint needs `latitude`, `longitude` and `timezone`. Never ask users to type coordinates. Look the city up once and reuse the result in every domain below.

```php
// One lookup feeds every chart below. `timezone` is the IANA name from the city
// record; the server resolves it to the DST-correct offset for the date of each chart.
$place = $roxy->location->searchCities(q: 'New York');
['latitude' => $latitude, 'longitude' => $longitude, 'timezone' => $timezone] = $place['cities'][0];
$birth = ['date' => '1990-01-15', 'time' => '14:30:00', 'latitude' => $latitude, 'longitude' => $longitude, 'timezone' => $timezone];

// A second person for the two-chart calls (synastry, Guna Milan, Human Design connection).
$london = $roxy->location->searchCities(q: 'London');
['latitude' => $lat2, 'longitude' => $lon2, 'timezone' => $tz2] = $london['cities'][0];
$partner = ['date' => '1992-07-22', 'time' => '09:00:00', 'latitude' => $lat2, 'longitude' => $lon2, 'timezone' => $tz2];
```

### 1. Western astrology API (natal chart, daily horoscope, synastry)

Natal chart products, daily horoscope features, dating and compatibility apps, and lunar-cycle wellness apps start here.

```php
// Natal chart. The most requested Western call, run once at onboarding.
// `$birth` carries the latitude, longitude and timezone from the location lookup above,
// spread into the named arguments of the call.
$natal = $roxy->astrology->generateNatalChart(...$birth);
// $natal['planets'][n]['name'], ['sign'], ['house'], ['interpretation']['summary']; $natal['ascendant']['sign']; $natal['aspects']

// Daily horoscope. The highest per-user call frequency in the catalog: daily content, streaks, push.
$horoscope = $roxy->astrology->getDailyHoroscope(sign: 'aries');
// $horoscope['overview'], ['love'], ['career'], ['column'], ['events'], ['luckyNumber']

// Synastry. Full inter-aspect analysis between two charts, the relationship feature of dating apps.
$synastry = $roxy->astrology->calculateSynastry(person1: $birth, person2: $partner);
// $synastry['compatibilityScore'], ['interAspects'], ['analysis']['strengths']

// Moon phase. A zero-setup GET for wellness, cycle-tracking and meditation apps.
$moon = $roxy->astrology->getCurrentMoonPhase();
// $moon['phase'], ['illumination'], ['sign'], ['meaning']['description']
```

### 2. Vedic astrology API (kundli, panchang, dasha, Guna Milan, KP)

Kundli generators, matrimonial matching, muhurta and panchang apps, and KP practitioners. The same `$birth` array, read sidereally.

```php
// Vedic kundli. The same birth read sidereally: `$birth` reuses the location lookup above.
$kundli = $roxy->vedicAstrology->generateBirthChart(...$birth);
// $kundli['meta']['Moon']['rashi'], $kundli['meta']['Moon']['nakshatra'], $kundli['houses'], $kundli['combustion']

// Detailed panchang. Tithi, nakshatra, yoga, karana, rahu kaal and the muhurtas for a date and place.
$panchang = $roxy->vedicAstrology->getDetailedPanchang(
    date: '2026-10-01', latitude: $latitude, longitude: $longitude, timezone: $timezone,
);
// $panchang['tithi'], ['nakshatra'], ['rahuKaal'], ['abhijitMuhurta']

// Vimshottari dasha. The mahadasha, antardasha and pratyantardasha running right now.
$dasha = $roxy->vedicAstrology->getCurrentDasha(...$birth);
// $dasha['mahadasha'], ['antardasha'], ['remainingInMahadasha']

// Mangal Dosha. The most asked matrimonial check.
$dosha = $roxy->vedicAstrology->checkManglikDosha(...$birth);
// $dosha['present']; $dosha['severity'] and $dosha['remedies'] are set only when present is true

// Guna Milan. The 36-point Ashtakoota score behind kundli matching, both people from the lookups above.
$milan = $roxy->vedicAstrology->calculateGunMilan(person1: $birth, person2: $partner);
// $milan['total'], ['percentage'], ['isCompatible'], ['breakdown']

// KP ruling planets. Horary answers at the moment of the question, for the place looked up above.
$kp = $roxy->vedicAstrology->getKpRulingPlanets(latitude: $latitude, longitude: $longitude, timezone: $timezone);
// $kp['dayLord'], ['moonSublord'], ['rulingPlanets']
```

### 3. Astrology forecast API (transit forecast, cross-domain timeline)

Forecast feeds, transit alerts and timing tools. One call returns a dated, significance-scored event list; the timeline variant merges Vedic dasha boundaries and biorhythm critical days into the same list, which no single-domain API can do.

```php
// Transit forecast. Transit-to-natal aspects, sign ingresses and retrograde stations over a window.
// `birthData` is the same `$birth` array: date, time, latitude, longitude, timezone.
$transits = $roxy->forecast->forecastTransits(birthData: $birth, startDate: '2026-10-01', endDate: '2026-10-31');
// $transits['count'], $transits['events'][n]['date'], ['type'], ['body'], ['target'], ['aspect'], ['significance']

// Cross-domain timeline. The same window with Vedic dasha boundaries and biorhythm critical days merged in.
$timeline = $roxy->forecast->generateTimeline(birthData: $birth, startDate: '2026-10-01', endDate: '2026-10-31');
// $timeline['events'][n]['domain'] ('western' | 'vedic' | 'biorhythm'), ['description'], ['significance']
```

### 4. Human Design API (bodygraph, connection)

Self-discovery apps, coaching bots and compatibility products. The full bodygraph is one call, and the Design side is solved on the exact 88-degree solar arc rather than approximated as calendar days.

```php
// Bodygraph. Type, strategy, authority, profile, definition, centers, channels and all 26 gates in one call.
// Human Design needs only the birth instant, so it takes the date, time and timezone from the lookup above.
$hd = $roxy->humanDesign->generateBodygraph(date: $birth['date'], time: $birth['time'], timezone: $birth['timezone']);
// $hd['type'], ['strategy'], ['authority'], ['profile'], ['definition'], ['incarnationCross']['name'], ['centers'], ['channels'], ['gates']

// Connection. Two bodygraphs combined, each of the 36 channels classified by how the pair forms it.
$connection = $roxy->humanDesign->calculateConnection(
    personA: ['date' => $birth['date'], 'time' => $birth['time'], 'timezone' => $birth['timezone']],
    personB: ['date' => $partner['date'], 'time' => $partner['time'], 'timezone' => $partner['timezone']],
);
// $connection['totalChannels'], ['summary']['electromagnetic'], ['combinedDefinition']
```

### 5. Chinese zodiac API (BaZi four pillars, zodiac animal, almanac)

BaZi readings, zodiac content and Tong Shu date pages. The school splits that make two calculators disagree (`dayBoundary`, `yearBoundary`, `hourClock`) are typed request parameters with named defaults.

```php
// BaZi Four Pillars. The anchor call of the domain, from the same birth instant as every chart above.
// Each response echoes the `conventions` it was computed under, so a chart can be reproduced, not guessed.
$bazi = $roxy->chineseAstrology->generateBaziChart(date: $birth['date'], time: $birth['time'], timezone: $birth['timezone']);
// $bazi['pillars'][n]['position'] ('year' | 'month' | 'day' | 'hour'), ['stem']['element'], ['branch']['animal'], ['tenGod']['name']
// $bazi['dayMaster']['element'], $bazi['zodiacAnimal'], $bazi['fiveElements'], $bazi['conventions']

// Chinese zodiac animal. Defaults `yearBoundary` to the Lunar New Year, the folk rule people mean
// when they ask which animal they are. Pass 'li-chun' for the classical BaZi boundary.
$animal = $roxy->chineseAstrology->calculateZodiacAnimal(date: $birth['date']);
// $animal['animal']['name'], $animal['animal']['element'], $animal['element'] (the year stem element), $animal['interpretation']

// Almanac day. The Tong Shu view of a date: day officer, mansion, clash animal, favours and avoids.
$almanac = $roxy->chineseAstrology->getAlmanacDay(date: '2026-10-01');
// $almanac['dayPillar'], ['dayOfficer'], ['clashAnimal'], ['favours'], ['avoids']
```

### 6. Feng shui API (Kua number, flying star chart)

Kua numbers with the Eight Mansions map, Xuan Kong flying star charts for any of the nine periods and 24 mountains, annual and monthly star plates, and the annual afflictions.

```php
// Kua number. One birth date and a gender give the personal directions everything else reads off.
$kua = $roxy->fengShui->calculateKuaNumber(date: $birth['date'], gender: 'female');
// $kua['kua'], $kua['group'] ('east' | 'west'), $kua['trigram']['english'], $kua['sectors'][n]['direction'], ['nature'], ['rank']

// Flying star natal chart. Period plus facing gives the nine palaces with base, mountain and water stars.
// Send `facing` (a mountain id like 'bing' or a compass label like 'S2') or `facingDegrees`, not neither.
$stars = $roxy->fengShui->generateFlyingStarChart(period: 9, facing: 'S2');
// $stars['facing']['label'], $stars['sitting']['label'], $stars['structure']['name'], $stars['palaces'][n]['palace'], ['base'], ['mountain'], ['water'], ['reading']
```

### 7. Mayan astrology API (Tzolkin day sign, full Maya chart)

Maya day signs, the Haab and Long Count, and the Aztec tonalpohualli, every value a function of the date under a typed `correlation` convention echoed back in `conventions`.

```php
// Tzolkin day sign. The most asked Maya question, answered from a date alone.
$tzolkin = $roxy->mesoamericanAstrology->calculateTzolkin(date: $birth['date']);
// $tzolkin['daySign'], ['daySignName'], ['number'], ['trecena'], ['reading']

// Full Maya chart. Tzolkin, Haab, Long Count, Calendar Round, Lord of the Night, Year Bearer and the Cruz Maya.
$maya = $roxy->mesoamericanAstrology->generateMayanChart(date: $birth['date']);
// $maya['tzolkin'], ['haab'], ['longCount'], ['calendarRound'], ['yearBearer'], ['cross'], $maya['conventions']['correlation']
```

### 8. Vastu Shastra API (entrance analysis, room compliance)

Home and plot analysis from typed geometry. Every verdict carries a `source` object naming the text, chapter and verse it rests on, or a convention label where the texts are silent.

```php
// Entrance analysis. Plot, facing and door in; the pada, its devata, the classical effect and the recommended padas out.
$entrance = $roxy->vastu->calculateEntrancePada(
    plot: ['width' => 30, 'depth' => 40, 'unit' => 'feet'], facing: 'North', doorPosition: 0.4,
);
// $entrance['pada'], ['devata'], ['effect'], ['auspiciousness'], ['recommendedPadas'], ['source']

// Room compliance. A verdict per room with the verse or the convention it rests on, and a scored composite.
$rooms = $roxy->vastu->calculateRoomCompliance(
    plot: ['width' => 30, 'depth' => 40, 'unit' => 'feet'],
    facing: 'North',
    rooms: [
        ['type' => 'kitchen', 'direction' => 'Southeast'],
        ['type' => 'master-bedroom', 'direction' => 'Southwest'],
        ['type' => 'puja', 'direction' => 'Northeast'],
    ],
);
// $rooms['score'], $rooms['rooms'][n]['type'], ['verdict'], ['idealDirections'], ['source']
```

### 9. Numerology API (life path, full chart, personal year)

Works from the birth date and name alone, no coordinates, which makes it the easiest domain to integrate.

```php
// Life Path. The most searched numerology number, from the birth date alone.
$lifePath = $roxy->numerology->calculateLifePath(year: 1990, month: 1, day: 15);
// $lifePath['number'], $lifePath['type'] ('single' | 'master'), $lifePath['meaning']

// Full numerology chart. All six core numbers plus karmic lessons, pinnacles and the personal year in one call.
$numerology = $roxy->numerology->generateNumerologyChart(fullName: 'Jane Smith', year: 1990, month: 1, day: 15);
// $numerology['coreNumbers']['lifePath'], ['expression'], ['soulUrge'], $numerology['additionalInsights']['personalYear']

// Personal Year. The annual theme, the January feature of every numerology app.
$personalYear = $roxy->numerology->calculatePersonalYear(month: 1, day: 15, year: 2026);
// $personalYear['personalYear'], ['theme'], ['advice']
```

### 10. Kabbalah API (gematria, birth profile)

Gematria of a Latin name under a declared transliteration convention, the 72 names, the Tree of Life, and a Hebrew birthday computed from the same birth instant as every chart above.

```php
// Gematria. A Latin name transliterated under a declared convention, ten ciphers, each with its tradition and source.
$gematria = $roxy->kabbalah->calculateGematria(text: 'Sarah');
// $gematria['chosen'], $gematria['values'][n]['id'], ['name'], ['value'], $gematria['matches'], $gematria['conventions']

// Birth profile. The Hebrew date and birthday, the three birth angels and the birth sephirah from the instant above.
$kabbalah = $roxy->kabbalah->generateBirthProfile(date: $birth['date'], time: $birth['time'], timezone: $birth['timezone']);
// $kabbalah['hebrewDate'], ['hebrewBirthday'], ['angels'], ['sephirah']
```

### 11. Tarot API (daily card, three-card, Celtic Cross, yes or no)

The complete 78-card deck with meanings for love, career, health and spirit. Pass a `seed` per user for deterministic once-per-day draws.

```php
// Daily card. `seed` and `date` are both optional: `date` (YYYY-MM-DD) defaults to today (UTC),
// and without a `seed` the reading is anonymous. The same seed and date always give the same card.
$card = $roxy->tarot->getDailyCard(seed: 'user-42');
// $card['card']['name'], $card['card']['reversed'], $card['card']['imageUrl'], $card['dailyMessage']

// Three-card spread. Past, present, future: the most drawn spread on every tarot platform.
$three = $roxy->tarot->castThreeCard(question: 'My next quarter', seed: 'user-42');
// $three['positions'][n]['name'], ['card']['name'], ['interpretation']; $three['summary']

// Celtic Cross. The ten-position professional reading.
$celtic = $roxy->tarot->castCelticCross(question: 'What should I focus on?', seed: 'user-42');
// $celtic['positions'][n]['name'], ['card']['name'], ['interpretation']; $celtic['summary']

// Yes or no. One card, one answer, with its strength.
$answer = $roxy->tarot->castYesNo(question: 'Should I take the offer?');
// $answer['answer'] ('Yes' | 'No' | 'Maybe'), $answer['strength'], $answer['card']['name']
```

### 12. Biorhythm API (reading, forecast)

Ten cycle types across primary, secondary and extended cycles, for wellness, productivity, sports and couples apps.

```php
// Biorhythm reading. All ten cycles for a date, from the same birth date as every chart above.
$bio = $roxy->biorhythm->getReading(birthDate: $birth['date'], targetDate: '2026-10-01');
// $bio['cycles']['physical']['value'], ['phase']; $bio['energyRating'], ['overallPhase'], ['criticalAlerts'], ['interpretation']

// Forecast. Every cycle for every day of a window, with the best and worst days named.
$bioForecast = $roxy->biorhythm->getForecast(birthDate: $birth['date'], startDate: '2026-10-01', endDate: '2026-10-31');
// $bioForecast['summary']['bestDay'], ['worstDay'], ['averageEnergy']; $bioForecast['days'][n]['date'], ['physical'], ['emotional'], ['intellectual'], ['isCritical']
```

### 13. Ayurveda API (dosha constitution, dinacharya)

The dosha profile read from a verified sidereal chart with the verse on each factor, a daily routine anchored on the local sunrise, and the six seasons from real solar ingresses. Every response carries `meta.disclaimer`.

```php
// Constitution. The dosha profile read from the sidereal chart of the same birth, each factor with its verse.
$constitution = $roxy->ayurveda->calculateAyurvedicConstitution(...$birth);
// $constitution['composite'], $constitution['factors'][n]['id'], ['input'], ['doshas'], ['source'], $constitution['meta']['disclaimer']

// Dinacharya. Brahma muhurta, the dosha periods and the routine for a date at the place looked up above.
$dinacharya = $roxy->ayurveda->getDinacharyaSchedule(
    date: '2026-10-01', latitude: $latitude, longitude: $longitude, timezone: $timezone,
);
// $dinacharya['brahmaMuhurta'], ['doshaPeriods'], ['routine']
```

### 14. I Ching API (cast a reading, hexagram catalog)

All 64 hexagrams, 384 changing lines and 8 trigrams, for meditation apps, decision tools and wisdom chatbots.

```php
// Cast a reading. Three coins six times: the primary hexagram, the changing lines and the resulting hexagram.
$reading = $roxy->iching->castReading(seed: 'user-42');
// $reading['hexagram']['number'], $reading['hexagram']['english'], $reading['lines'], ['changingLinePositions'], ['resultingHexagram']

// Hexagram catalog. Paginated, 20 per page by default; ask for all 64 once and cache them.
$hexagrams = $roxy->iching->listHexagrams(limit: 64);
// $hexagrams['total'], $hexagrams['hexagrams'][n]['number'], ['english'], ['pinyin']; call $roxy->iching->getHexagram(number: ...) for the judgment and lines
```

### 15. Crystal healing API (by zodiac, by chakra, birthstone)

Crystal retail and metaphysical content: "crystals for [sign]" and "[chakra] chakra stones" pages, plus the birthstone for each month.

```php
// By zodiac. The most searched crystal query pattern.
$bySign = $roxy->crystals->getCrystalsByZodiac(sign: 'scorpio');
// $bySign['crystals'][n]['id'], ['name'], ['imageUrl'], ['colors']; call $roxy->crystals->getCrystal(id: ...) for full properties

// By chakra. Wellness and yoga content pages.
$byChakra = $roxy->crystals->getCrystalsByChakra(chakra: 'Heart');
// $byChakra['crystals'][n]['name'], ['colors']

// Birthstone. Evergreen gift and jewelry pages.
$birthstone = $roxy->crystals->getBirthstones(month: 1);
```

### 16. Dream interpretation API (symbol dictionary, search)

A 2,000+ symbol dream dictionary for journal apps, AI companions and self-discovery products.

```php
// Symbol detail. Every "what does it mean to dream about X" page lands here.
$symbol = $roxy->dreams->getDreamSymbol(id: 'flying');
// $symbol['id'], ['name'], ['meaning']

// Symbol search. Chatbots fetch the dictionary once and keep it locally.
$symbols = $roxy->dreams->searchDreamSymbols(q: 'water');
// $symbols['symbols'][n]['id'], ['name']
```

### 17. Angel numbers API (1111, 222, 333 meanings plus universal lookup)

Meanings for every common sequence, and a lookup that answers any positive integer through its digit root.

```php
// By number. Every "meaning of 1111" page is backed by this. The path param is a string.
$angel = $roxy->angelNumbers->getAngelNumber(number: '1111');
// $angel['title'], ['coreMessage'], $angel['meaning']['spiritual'], $angel['meaning']['love'], $angel['affirmation']

// Universal lookup. Any positive integer, with the digit root carrying the answer when no curated entry exists.
$sequence = $roxy->angelNumbers->analyzeNumberSequence(number: '4242');
// $sequence['digitRoot'], ['isRepeating'], ['knownMeaning'] (null when not curated), $sequence['digitRootMeaning']['title']
```

## Built for AI agents (Cursor, Claude Code, Copilot, Codex, Gemini CLI)

<p align="center">
  <img src="https://raw.githubusercontent.com/RoxyAPI/sdk-php/main/assets/agents.png" alt="Your coding agent already knows the API. Built for AI agents, Remote MCP, no local setup." width="100%">
</p>

This package ships with `AGENTS.md`, a quick start, patterns, gotchas and common-tasks reference that AI coding agents read directly from `vendor/`.

Agents supporting `AGENTS.md` (Claude Code, Cursor, GitHub Copilot, OpenAI Codex, Gemini CLI) will pick it up automatically. For other tools, point your agent to `vendor/roxyapi/sdk/AGENTS.md`.

Prefer MCP? Every domain has a [Remote MCP server](https://roxyapi.com/docs/mcp) at `https://roxyapi.com/mcp/{domain}` (Streamable HTTP, no stdio, no self-hosting). One-line Claude Code setup:

```bash
claude mcp add-json --scope user roxy-astrology \
  '{"type":"http","url":"https://roxyapi.com/mcp/astrology","headers":{"X-API-Key":"YOUR_KEY"}}'
```

## Authentication

Get your API key at [roxyapi.com/pricing](https://roxyapi.com/pricing). Instant delivery after checkout.

```php
use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy(getenv('ROXY_API_KEY'));
```

Never expose your API key client-side. Call Roxy from server code only.

## Multi-language responses

<!-- BEGIN:LANGS -->
Interpretations and editorial text are available in 10 languages: `en`, `tr`, `de`, `es`, `hi`, `pt`, `fr`, `ru`, `zh-Hans`, `zh-Hant`. Pass `lang:` as a named argument on any supported method. Defaults to `en`. Supported: `astrology`, `vedicAstrology`, `forecast`, `humanDesign`, `chineseAstrology`, `fengShui`, `mesoamericanAstrology`, `vastu`, `numerology`, `kabbalah`, `tarot`, `biorhythm`, `ayurveda`, `iching`, `crystals`, `angelNumbers`, `languages`. English-only: `dreams`, `location`, `usage`. Languages without translations yet fall back to English.
<!-- END:LANGS -->

```php
$roxy->tarot->getDailyCard(seed: 'user-42', lang: 'es');
$roxy->numerology->calculateLifePath(year: 1990, month: 1, day: 15, lang: 'hi');
```

The two Chinese scripts (`zh-Hans`, `zh-Hant`) currently ship on Chinese astrology and feng shui; every other domain answers those codes in English per field. `$roxy->languages->listLanguages()` returns the canonical list at runtime.

## Error handling

Every method throws `RoxyAPI\Sdk\RoxyApiException` on 4xx / 5xx, so a successful return is always the decoded payload. The exception carries `statusCode`, `errorCode` (machine-readable, stable: switch on this), `error` (human-readable, may change wording), `docUrl` (the page documenting the code, or null) and `retryAfter` (whole seconds from the `Retry-After` header, or null). `$e->code()` returns the `RoxyAPI\Sdk\ErrorCode` enum case for `errorCode`, or null for a code newer than your installed SDK. A `validation_error` also carries `issues`, and `$e->response` is the raw Saloon response. `$e->getCode()` is the HTTP status, not the API code.

```php
use RoxyAPI\Sdk\ErrorCode;
use RoxyAPI\Sdk\RoxyApiException;
use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy(getenv('ROXY_API_KEY'));

try {
    $roxy->astrology->getDailyHoroscope(sign: 'invalid');
} catch (RoxyApiException $e) {
    // $e->statusCode (int)   - HTTP status, e.g. 400
    // $e->errorCode (string) - machine-readable, e.g. 'validation_error' (switch on this)
    // $e->error     (string) - human-readable message
    // $e->docUrl    (?string) - page documenting the code
    // $e->retryAfter (?int)  - seconds to wait, when the response sends Retry-After
    match ($e->code()) {
        ErrorCode::ValidationError => error_log("fix the request: {$e->error}"),
        ErrorCode::RateLimitPerMinute => sleep($e->retryAfter ?? 1),
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

A `validation_error` lists every failing field in `issues`, each with `path` (a dot-separated field path), `message` and `code`:

```php
foreach ($e->issues ?? [] as $issue) {
    echo "{$issue['path']}: {$issue['message']} ({$issue['code']})\n";
}
```

### Retries

The client retries twice by default (a persistent failure sends 3 requests in total, and `maxRetries: 0` sends exactly one): HTTP 429, 500, 502, 503 and 504, plus connection failures where the request was never sent. A `Retry-After` header is honoured, with jitter added. A wait longer than `maxDelayMs` is not retried: the error is thrown with `retryAfter` set. Read timeouts are never retried. Pass a `RetryPolicy` to tune it, or `new RetryPolicy(maxRetries: 0)` to turn retries off.

```php
use RoxyAPI\Sdk\Retry\RetryPolicy;
use RoxyAPI\Sdk\RoxyApiException;
use function RoxyAPI\Sdk\createRoxy;

$roxy = createRoxy(
    getenv('ROXY_API_KEY'),
    new RetryPolicy(maxRetries: 4, initialDelayMs: 500, maxDelayMs: 30000),
);

try {
    $roxy->astrology->getDailyHoroscope(sign: 'aries');
} catch (RoxyApiException $e) {
    // e.g. 429 rate_limit_per_minute or 503 compute_saturated after the retries ran out
    error_log("{$e->errorCode} {$e->docUrl} retry in {$e->retryAfter}s");
}
```

## Rendering with @roxyapi/ui

This SDK fetches JSON. For HTML rendering, hand the JSON to [@roxyapi/ui](https://github.com/roxyapi/ui) web components in the browser.

[examples/render-with-ui.html](https://github.com/RoxyAPI/sdk-php/blob/main/examples/render-with-ui.html) shows the full pattern: a PHP endpoint backed by the SDK (`examples/natal-chart.php`), the browser fetches JSON and assigns it to a `<roxy-natal-chart>` element. No PHP-side templating.

## Testing your integration

Saloon `MockClient` lets you mock requests by class:

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

## Links

- [Documentation](https://roxyapi.com/docs)
- [API Reference](https://roxyapi.com/api-reference)
- [Pricing](https://roxyapi.com/pricing)
- [MCP setup for AI agents](https://roxyapi.com/docs/mcp)
- [Templates](https://roxyapi.com/templates)
- [Agent guide (AGENTS.md)](https://github.com/RoxyAPI/sdk-php/blob/main/AGENTS.md): bundled in the package, optimised for AI coding agents
- [Examples](https://github.com/RoxyAPI/sdk-php/tree/main/examples) on GitHub (not shipped in the Composer package):
  - `examples/vanilla-php.php` - raw PHP, prints a horoscope
  - `examples/laravel.php` - Laravel service provider snippet
  - `examples/human-design.php` - full Human Design bodygraph, prints type, strategy, and profile
  - `examples/forecast.php` - cross-domain forecast timeline, prints the event count and a sample event
  - `examples/chinese-astrology.php` - BaZi four pillars plus the zodiac sign, prints the pillars and the conventions used
  - `examples/feng-shui.php` - Kua number and a flying star natal chart, prints the eight sectors and the nine palaces
  - `examples/render-with-ui.html` + `examples/natal-chart.php` - server-side fetch + browser render via `@roxyapi/ui`
- [Issues](https://github.com/RoxyAPI/sdk-php/issues)
- Other SDKs: [TypeScript](https://www.npmjs.com/package/@roxyapi/sdk), [Python](https://pypi.org/project/roxy-sdk/), [.NET](https://www.nuget.org/packages/RoxyApi.Sdk), [Go](https://pkg.go.dev/github.com/RoxyAPI/sdk-go), [Rust](https://crates.io/crates/roxyapi)

## License

MIT
