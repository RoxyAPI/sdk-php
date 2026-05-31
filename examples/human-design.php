<?php

declare(strict_types=1);

/*
 * Human Design bodygraph example.
 *
 *   ROXY_API_KEY=your-key php examples/human-design.php
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
    // Full bodygraph in one call. timezone is decimal hours (5.5 = IST) or an IANA name.
    $chart = $roxy->humanDesign->generateBodygraph(
        date: '1990-07-04',
        time: '10:12:00',
        timezone: 5.5,
        latitude: 28.6139,
        longitude: 77.209,
    );

    echo "=== Human Design bodygraph (1990-07-04 10:12 IST) ===\n";
    echo 'Type:       ' . ($chart['type'] ?? '?') . "\n";
    echo 'Strategy:   ' . ($chart['strategy'] ?? '?') . "\n";
    echo 'Profile:    ' . ($chart['profile'] ?? '?') . "\n";
    echo 'Definition: ' . ($chart['definition'] ?? '?') . "\n";
} catch (RoxyApiException $e) {
    fwrite(STDERR, "[{$e->statusCode}] {$e->errorCode}: {$e->error}\n");
    exit(3);
}
