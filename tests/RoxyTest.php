<?php

declare(strict_types=1);

use RoxyAPI\Sdk\Generated\Requests\GetDailyHoroscopeRequest;
use RoxyAPI\Sdk\Generated\Requests\ListLanguagesRequest;
use RoxyAPI\Sdk\Generated\Requests\SearchCitiesRequest;
use RoxyAPI\Sdk\Generated\Resources\AstrologyResource;
use RoxyAPI\Sdk\Roxy;
use RoxyAPI\Sdk\RoxyApiException;
use RoxyAPI\Sdk\Version;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

use function RoxyAPI\Sdk\createRoxy;

it('createRoxy returns a Roxy connector with the api key', function (): void {
    $roxy = createRoxy('test-key');

    expect($roxy)->toBeInstanceOf(Roxy::class)
        ->and($roxy->apiKey)->toBe('test-key');
});

it('exposes resource accessors as lazy properties', function (): void {
    $roxy = createRoxy('test-key');

    expect($roxy->astrology)->toBeInstanceOf(AstrologyResource::class)
        ->and($roxy->astrology)->toBe($roxy->astrology); // cached
});

it('throws on unknown resource accessor', function (): void {
    $roxy = createRoxy('test-key');
    $roxy->bogus; // @phpstan-ignore-line
})->throws(InvalidArgumentException::class);

it('sends X-API-Key, X-SDK-Client, and Accept on every request', function (): void {
    $mock = new MockClient([
        ListLanguagesRequest::class => MockResponse::make(['languages' => []]),
    ]);
    $roxy = createRoxy('secret-123');
    $roxy->withMockClient($mock);

    $roxy->languages->listLanguages();

    $mock->assertSent(function ($request, $response): bool {
        $headers = $response->getPendingRequest()->headers()->all();

        return ('secret-123' === ($headers['X-API-Key'] ?? null))
            && ('roxy-sdk-php/' . Version::VERSION === ($headers['X-SDK-Client'] ?? null))
            && ('application/json' === ($headers['Accept'] ?? null));
    });
});

it('decodes successful JSON responses to arrays', function (): void {
    $mock = new MockClient([
        GetDailyHoroscopeRequest::class => MockResponse::make([
            'sign' => 'aries',
            'overview' => 'Today is a fine day.',
        ]),
    ]);
    $roxy = createRoxy('test-key');
    $roxy->withMockClient($mock);

    $result = $roxy->astrology->getDailyHoroscope(sign: 'aries');

    expect($result)->toBe(['sign' => 'aries', 'overview' => 'Today is a fine day.']);
});

it('throws RoxyApiException on 4xx with structured error body', function (): void {
    $mock = new MockClient([
        SearchCitiesRequest::class => MockResponse::make([
            'error' => 'Missing required query parameter "q"',
            'code' => 'validation_error',
        ], 400),
    ]);
    $roxy = createRoxy('test-key');
    $roxy->withMockClient($mock);

    try {
        $roxy->location->searchCities(q: 'mumbai');
        expect(true)->toBeFalse('expected RoxyApiException');
    } catch (RoxyApiException $e) {
        expect($e->statusCode)->toBe(400)
            ->and($e->errorCode)->toBe('validation_error')
            ->and($e->error)->toBe('Missing required query parameter "q"');
    }
});

it('throws RoxyApiException on 5xx with code "unknown" when body lacks code', function (): void {
    $mock = new MockClient([
        ListLanguagesRequest::class => MockResponse::make('Server exploded', 500),
    ]);
    $roxy = createRoxy('test-key');
    $roxy->withMockClient($mock);

    try {
        $roxy->languages->listLanguages();
        expect(true)->toBeFalse('expected RoxyApiException');
    } catch (RoxyApiException $e) {
        expect($e->statusCode)->toBe(500)
            ->and($e->errorCode)->toBe('unknown');
    }
});

it('builds the correct URL for path + query parameters', function (): void {
    $mock = new MockClient([
        GetDailyHoroscopeRequest::class => MockResponse::make(['sign' => 'leo']),
    ]);
    $roxy = createRoxy('test-key');
    $roxy->withMockClient($mock);

    $roxy->astrology->getDailyHoroscope(sign: 'leo', lang: 'es');

    $mock->assertSent(function ($request, $response): bool {
        $pending = $response->getPendingRequest();
        $url = $pending->getUrl();
        $query = $pending->query()->all();

        return str_contains($url, '/astrology/horoscope/leo/daily')
            && ($query['lang'] ?? null) === 'es';
    });
});
