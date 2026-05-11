<?php

declare(strict_types=1);

/*
 * Backend endpoint for examples/render-with-ui.html.
 *
 *   ROXY_API_KEY=your-key php -S 127.0.0.1:8080 -t examples
 *   then open http://127.0.0.1:8080/render-with-ui.html
 */

require __DIR__ . '/../vendor/autoload.php';

use RoxyAPI\Sdk\RoxyApiException;

use function RoxyAPI\Sdk\createRoxy;

header('Content-Type: application/json');

$roxy = createRoxy(getenv('ROXY_API_KEY') ?: '');

try {
    $tz = $_GET['tz'] ?? '5.5';
    echo json_encode($roxy->astrology->generateNatalChart(
        date: (string) ($_GET['date'] ?? ''),
        time: (string) ($_GET['time'] ?? ''),
        latitude: (float) ($_GET['lat'] ?? 0.0),
        longitude: (float) ($_GET['lon'] ?? 0.0),
        timezone: is_numeric($tz) ? (float) $tz : (string) $tz,
    ));
} catch (RoxyApiException $e) {
    http_response_code($e->statusCode);
    echo json_encode(['error' => $e->error, 'code' => $e->errorCode]);
}
