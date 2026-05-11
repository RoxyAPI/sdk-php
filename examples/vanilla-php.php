<?php

declare(strict_types=1);

/*
 * Minimal vanilla PHP example.
 *
 *   ROXY_API_KEY=your-key php examples/vanilla-php.php
 */

require __DIR__ . '/../vendor/autoload.php';

use RoxyAPI\Sdk\RoxyApiException;

use function RoxyAPI\Sdk\createRoxy;

$apiKey = getenv('ROXY_API_KEY') ?: '';
if ('' === $apiKey) {
    fwrite(STDERR, "Set ROXY_API_KEY before running this example.\n");
    exit(1);
}

$roxy = createRoxy($apiKey);

try {
    // 1. Daily horoscope (single GET).
    $horoscope = $roxy->astrology->getDailyHoroscope(sign: 'aries');
    echo "=== Aries daily horoscope ===\n";
    echo ($horoscope['overview'] ?? json_encode($horoscope)) . "\n\n";

    // 2. Geocode then natal chart (the standard two-step pattern).
    $cities = $roxy->location->searchCities(q: 'Mumbai');
    $first = $cities['cities'][0] ?? null;
    if (null === $first) {
        fwrite(STDERR, "No cities returned for Mumbai.\n");
        exit(2);
    }

    $chart = $roxy->astrology->generateNatalChart(
        date: '1990-01-15',
        time: '14:30:00',
        latitude: (float) $first['latitude'],
        longitude: (float) $first['longitude'],
        timezone: $first['timezone'] ?? 5.5,
    );

    // Planets come back as a list; index by name for display.
    $byName = [];
    foreach (($chart['planets'] ?? []) as $p) {
        if (isset($p['name'])) {
            $byName[strtolower((string) $p['name'])] = $p;
        }
    }

    echo "=== Natal chart (Mumbai, 1990-01-15 14:30) ===\n";
    echo 'Sun:       ' . ($byName['sun']['sign'] ?? '?') . "\n";
    echo 'Moon:      ' . ($byName['moon']['sign'] ?? '?') . "\n";
    echo 'Ascendant: ' . ($chart['ascendant']['sign'] ?? '?') . "\n";
} catch (RoxyApiException $e) {
    fwrite(STDERR, "[{$e->statusCode}] {$e->errorCode}: {$e->error}\n");
    exit(3);
}
