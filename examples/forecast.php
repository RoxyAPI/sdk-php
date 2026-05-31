<?php

declare(strict_types=1);

/*
 * Cross-domain forecast timeline example.
 *
 *   ROXY_API_KEY=your-key php examples/forecast.php
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
    // birthData is one object, never an array of subjects. timezone is decimal hours or an IANA name.
    $timeline = $roxy->forecast->generateTimeline(
        birthData: [
            'date' => '1990-07-04',
            'time' => '10:12:00',
            'timezone' => 5.5,
            'latitude' => 28.6139,
            'longitude' => 77.209,
        ],
        startDate: '2026-06-01',
        endDate: '2026-06-30',
    );

    echo "=== Forecast timeline (2026-06-01 to 2026-06-30) ===\n";
    echo 'Events: ' . ($timeline['count'] ?? 0) . "\n";

    $first = $timeline['events'][0] ?? null;
    if (null !== $first) {
        echo 'First:  [' . ($first['date'] ?? '?') . '] ' . ($first['description'] ?? '?') . "\n";
        echo 'Domain: ' . ($first['domain'] ?? '?') . ', significance ' . ($first['significance'] ?? '?') . "\n";
    }
} catch (RoxyApiException $e) {
    fwrite(STDERR, "[{$e->statusCode}] {$e->errorCode}: {$e->error}\n");
    exit(3);
}
