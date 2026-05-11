<?php

declare(strict_types=1);

namespace RoxyAPI\Sdk;

if (!function_exists('RoxyAPI\\Sdk\\createRoxy')) {
    /**
     * Create an authenticated Roxy connector.
     *
     *   use function RoxyAPI\Sdk\createRoxy;
     *   $roxy = createRoxy('your-api-key');
     *   $roxy->astrology->getDailyHoroscope(sign: 'aries');
     */
    function createRoxy(string $apiKey): Roxy
    {
        return new Roxy($apiKey);
    }
}
