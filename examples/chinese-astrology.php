<?php

declare(strict_types=1);

/*
 * Chinese astrology example: BaZi four pillars plus the zodiac sign.
 *
 *   ROXY_API_KEY=your-key php examples/chinese-astrology.php
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
    // The anchor call of the domain: the rest of it reads off these four pillars.
    // timezone is an IANA name, decimal hours (5.5 = IST), or a fixed offset.
    // Prefer the IANA name: it resolves to the DST-correct offset for the birth date.
    $bazi = $roxy->chineseAstrology->generateBaziChart(
        date: '1990-07-04',
        time: '10:12:00',
        timezone: 'America/New_York',
    );

    echo "=== BaZi four pillars (1990-07-04 10:12 America/New_York) ===\n";
    foreach ($bazi['pillars'] ?? [] as $pillar) {
        printf(
            "%-6s %-10s %s %s / %s %s   %s\n",
            $pillar['position'] ?? '?',
            $pillar['id'] ?? '?',
            $pillar['stem']['chinese'] ?? '?',
            $pillar['stem']['element'] ?? '?',
            $pillar['branch']['chinese'] ?? '?',
            $pillar['branch']['animal'] ?? '?',
            $pillar['tenGod']['name'] ?? '?',
        );
    }
    echo 'Day Master: ' . ($bazi['dayMaster']['element'] ?? '?')
        . ' (' . ($bazi['dayMaster']['polarity'] ?? '?') . ")\n";

    // The conventions echo is what lets a caller reproduce a chart drawn elsewhere:
    // the three school splits are typed parameters, not hidden defaults.
    echo 'Conventions: ' . json_encode($bazi['conventions'] ?? []) . "\n\n";

    // The most searched question in the domain. Defaults yearBoundary to
    // "lunar-new-year", the folk rule people mean when they say which animal
    // they are; pass "li-chun" to match the classical BaZi boundary above.
    $sign = $roxy->chineseAstrology->calculateZodiacAnimal(date: '1990-07-04');

    echo "=== Chinese zodiac sign ===\n";
    echo 'Animal: ' . ($sign['animal']['name'] ?? '?')
        . ' (' . ($sign['animal']['element'] ?? '?') . ' ' . ($sign['animal']['polarity'] ?? '?') . ")\n";
    echo 'Year boundary used: ' . ($sign['conventions']['yearBoundary'] ?? '?') . "\n";
} catch (RoxyApiException $e) {
    fwrite(STDERR, "[{$e->statusCode}] {$e->errorCode}: {$e->error}\n");
    exit(3);
}
