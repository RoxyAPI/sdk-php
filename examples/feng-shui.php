<?php

declare(strict_types=1);

/*
 * Feng shui example: Kua number plus a flying star natal chart.
 *
 *   ROXY_API_KEY=your-key php examples/feng-shui.php
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
    // The entry point of the family: one birth date and a gender gives the
    // personal directions everything else reads off.
    $kua = $roxy->fengShui->calculateKuaNumber(date: '1990-07-04', gender: 'female');

    echo "=== Kua number (1990-07-04, female) ===\n";
    echo 'Kua ' . ($kua['kua'] ?? '?')
        . ', ' . ($kua['group'] ?? '?') . ' group'
        . ', trigram ' . ($kua['trigram']['english'] ?? '?') . "\n";
    // Chinese years resolve at Li Chun, computed astronomically, so a January or
    // early February birth date can belong to the previous solar year.
    echo 'Solar year ' . ($kua['solarYear'] ?? '?')
        . ' (boundary ' . ($kua['boundaryDate'] ?? '?') . ")\n";

    foreach ($kua['sectors'] ?? [] as $sector) {
        printf(
            "  %-10s %-10s %-13s rank %d  %s\n",
            $sector['direction'] ?? '?',
            $sector['starName'] ?? '?',
            $sector['nature'] ?? '?',
            $sector['rank'] ?? 0,
            $sector['domain'] ?? '?',
        );
    }
    echo "\n";

    // Period plus facing gives the nine palaces with base, mountain and water stars.
    // Send facing (a mountain id like "bing" or a compass label like "S2") or
    // facingDegrees, not neither.
    $chart = $roxy->fengShui->generateFlyingStarChart(facing: 'S2', period: 9);

    echo "=== Flying star natal chart (period 9, facing S2) ===\n";
    echo 'Facing ' . ($chart['facing']['label'] ?? '?')
        . ', sitting ' . ($chart['sitting']['label'] ?? '?')
        . ' - ' . ($chart['structure']['name'] ?? '?') . "\n";

    foreach ($chart['palaces'] ?? [] as $palace) {
        printf(
            "  %-10s base %d  mountain %d  water %d\n",
            $palace['palace'] ?? '?',
            $palace['base'] ?? 0,
            $palace['mountain'] ?? 0,
            $palace['water'] ?? 0,
        );
    }
} catch (RoxyApiException $e) {
    fwrite(STDERR, "[{$e->statusCode}] {$e->errorCode}: {$e->error}\n");
    exit(3);
}
