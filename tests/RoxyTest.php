<?php

declare(strict_types=1);

/*
 * The hand-written client: createRoxy, the connector headers and base URL, the resource
 * accessors, and the RoxyApiException shape. The generated surface is covered by SurfaceTest.
 */

use RoxyAPI\Sdk\Generated\Requests\GetDailyHoroscopeRequest;
use RoxyAPI\Sdk\Generated\Requests\ListLanguagesRequest;
use RoxyAPI\Sdk\Generated\Requests\SearchCitiesRequest;
use RoxyAPI\Sdk\Generated\Resources\AstrologyResource;
use RoxyAPI\Sdk\Roxy;
use RoxyAPI\Sdk\RoxyApiException;
use RoxyAPI\Sdk\Version;
use Saloon\Exceptions\Request\FatalRequestException;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Saloon\Http\PendingRequest;

use function RoxyAPI\Sdk\createRoxy;

/** @var array<string, mixed> $spec */
$spec = json_decode((string) file_get_contents(__DIR__ . '/../specs/openapi.json'), true, 512, JSON_THROW_ON_ERROR);
$baseUrl = $spec['servers'][0]['url'];

it('createRoxy returns a Roxy connector with the api key', function (): void {
    $roxy = createRoxy('test-key');

    expect($roxy)->toBeInstanceOf(Roxy::class)
        ->and($roxy->apiKey)->toBe('test-key');
});

it('exposes resource accessors as lazy properties, one instance per name', function (): void {
    $roxy = createRoxy('test-key');

    expect($roxy->astrology)->toBeInstanceOf(AstrologyResource::class)
        ->and($roxy->astrology)->toBe($roxy->astrology)
        ->and($roxy->astrology)->not->toBe($roxy->location);
});

it('throws on unknown resource accessor', function (): void {
    $roxy = createRoxy('test-key');
    $roxy->bogus; // @phpstan-ignore-line
})->throws(InvalidArgumentException::class);

it('calls the production base URL of the spec with the key and the SDK header', function () use ($baseUrl): void {
    $mock = new MockClient([
        GetDailyHoroscopeRequest::class => MockResponse::make(['sign' => 'leo']),
    ]);
    $roxy = createRoxy('secret-123');
    $roxy->withMockClient($mock);

    $roxy->astrology->getDailyHoroscope(sign: 'leo', lang: 'es');

    $pending = lastPending($mock);
    $headers = $pending->headers()->all();

    expect($pending->getUrl())->toBe($baseUrl . '/astrology/horoscope/leo/daily')
        ->and($pending->query()->all())->toBe(['lang' => 'es'])
        ->and($headers['X-API-Key'] ?? null)->toBe('secret-123')
        ->and($headers['X-SDK-Client'] ?? null)->toBe('roxy-sdk-php/' . Version::VERSION)
        ->and($headers['Accept'] ?? null)->toBe('application/json');
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

it('throws RoxyApiException carrying the error body of a 401', function (): void {
    $mock = new MockClient([
        SearchCitiesRequest::class => MockResponse::make([
            'error' => 'API key required',
            'code' => 'api_key_required',
        ], 401),
    ]);
    $roxy = createRoxy('test-key');
    $roxy->withMockClient($mock);

    try {
        $roxy->location->searchCities(q: 'London');
        expect(true)->toBeFalse('expected RoxyApiException');
    } catch (RoxyApiException $e) {
        expect($e->statusCode)->toBe(401)
            ->and($e->errorCode)->toBe('api_key_required')
            ->and($e->error)->toBe('API key required')
            ->and($e->getMessage())->toBe('[401] api_key_required: API key required')
            ->and($e->response?->status())->toBe(401);
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
            ->and($e->errorCode)->toBe('unknown')
            ->and($e->error)->toBe('Server exploded');
    }
});

it('returns [] when the server replies 200 with an empty body', function (): void {
    $mock = new MockClient([
        ListLanguagesRequest::class => MockResponse::make('', 200),
    ]);
    $roxy = createRoxy('test-key');
    $roxy->withMockClient($mock);

    expect($roxy->languages->listLanguages())->toBe([]);
});

it('wraps a Saloon FatalRequestException as RoxyApiException with code connection_error', function (): void {
    $roxy = createRoxy('test-key');
    $pending = new PendingRequest($roxy, new ListLanguagesRequest());
    $fatal = new FatalRequestException(new Exception('connect timeout'), $pending);

    $wrapped = RoxyApiException::fromFatal($fatal);

    expect($wrapped->statusCode)->toBe(0)
        ->and($wrapped->errorCode)->toBe('connection_error')
        ->and($wrapped->error)->toContain('connect timeout')
        ->and($wrapped->response)->toBeNull();
});
