<?php

declare(strict_types=1);

/*
 * Laravel service provider snippet. Drop into app/Providers/RoxyServiceProvider.php
 * and register it in bootstrap/providers.php (Laravel 11+) or config/app.php.
 *
 * Set ROXY_API_KEY in your .env, then resolve the connector anywhere via the
 * `Roxy` facade or constructor injection of `RoxyAPI\Sdk\Roxy`.
 */

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use RoxyAPI\Sdk\Roxy;

use function RoxyAPI\Sdk\createRoxy;

class RoxyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Roxy::class, function () {
            $key = (string) config('services.roxyapi.key', env('ROXY_API_KEY', ''));
            if ('' === $key) {
                throw new \RuntimeException('ROXY_API_KEY is not configured.');
            }

            return createRoxy($key);
        });
    }
}

/*
 * config/services.php
 *
 *   'roxyapi' => [
 *       'key' => env('ROXY_API_KEY'),
 *   ],
 *
 * Controller usage:
 *
 *   use RoxyAPI\Sdk\Roxy;
 *
 *   public function show(Roxy $roxy, string $sign)
 *   {
 *       return $roxy->astrology->getDailyHoroscope(sign: $sign);
 *   }
 */
