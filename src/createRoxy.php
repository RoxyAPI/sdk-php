<?php

declare(strict_types=1);

namespace RoxyAPI\Sdk;

use RoxyAPI\Sdk\Retry\RetryPolicy;

if (!function_exists('RoxyAPI\\Sdk\\createRoxy')) {
    /**
     * Create an authenticated Roxy connector.
     *
     *   use function RoxyAPI\Sdk\createRoxy;
     *   $roxy = createRoxy('your-api-key');
     *   $roxy->astrology->getDailyHoroscope(sign: 'aries');
     *
     * Two retries are on by default; pass a policy to change or disable them:
     *
     *   $roxy = createRoxy('your-api-key', new RetryPolicy(maxRetries: 0));
     */
    function createRoxy(string $apiKey, RetryPolicy $retry = new RetryPolicy()): Roxy
    {
        return new Roxy($apiKey, $retry);
    }
}
