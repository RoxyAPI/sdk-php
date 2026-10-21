<?php

declare(strict_types=1);

/*
 * Opt-in retries, the extra RoxyApiException fields, and the generated ERRORS region.
 * Randomness and sleeping are injected so every delay is asserted exactly.
 */

use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Psr7\Request as PsrRequest;
use RoxyAPI\Sdk\ErrorCode;
use RoxyAPI\Sdk\Generated\Requests\GetDailyHoroscopeRequest;
use RoxyAPI\Sdk\Retry\RetryPolicy;
use RoxyAPI\Sdk\Roxy;
use RoxyAPI\Sdk\RoxyApiException;
use Saloon\Exceptions\Request\FatalRequestException;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

use function RoxyAPI\Sdk\createRoxy;

/**
 * @param list<MockResponse> $responses
 *
 * @return array{0: Roxy, 1: MockClient, 2: ArrayObject<int, int>}
 */
function retryingRoxy(array $responses, int $maxRetries = 3, float $random = 0.5): array
{
    /** @var ArrayObject<int, int> $slept */
    $slept = new ArrayObject();
    $policy = new RetryPolicy(
        maxRetries: $maxRetries,
        random: static fn (): float => $random,
        sleep: static function (int $ms) use ($slept): void {
            $slept[] = $ms;
        },
    );
    $mock = new MockClient($responses);
    $roxy = createRoxy('test-key', $policy);
    $roxy->withMockClient($mock);

    return [$roxy, $mock, $slept];
}

/** @param array<string, string> $headers */
function limited(string $code, int $status, array $headers = []): MockResponse
{
    return MockResponse::make(['error' => $code, 'code' => $code, 'doc_url' => 'https://roxyapi.com/docs/errors#' . $code], $status, $headers);
}

it('retries a 429 rate_limit_per_minute once, waits Retry-After plus jitter, then succeeds', function (): void {
    [$roxy, $mock, $slept] = retryingRoxy([
        limited('rate_limit_per_minute', 429, ['Retry-After' => '1']),
        MockResponse::make(['sign' => 'aries']),
    ]);

    expect($roxy->astrology->getDailyHoroscope(sign: 'aries'))->toBe(['sign' => 'aries'])
        ->and($mock->getRecordedResponses())->toHaveCount(2)
        ->and($slept->getArrayCopy())->toBe([1250]);
});

it('does not retry a Retry-After beyond the max delay and exposes it', function (): void {
    [$roxy, $mock, $slept] = retryingRoxy([limited('rate_limit_exceeded', 429, ['Retry-After' => '86400'])]);

    try {
        $roxy->astrology->getDailyHoroscope(sign: 'aries');
        expect(true)->toBeFalse('expected RoxyApiException');
    } catch (RoxyApiException $e) {
        expect($e->statusCode)->toBe(429)
            ->and($e->errorCode)->toBe('rate_limit_exceeded')
            ->and($e->docUrl)->toBe('https://roxyapi.com/docs/errors#rate_limit_exceeded')
            ->and($e->retryAfter)->toBe(86400)
            ->and($mock->getRecordedResponses())->toHaveCount(1)
            ->and($slept)->toHaveCount(0);
    }
});

it('retries a 503 compute_saturated with full-jitter exponential backoff, then gives up', function (): void {
    [$roxy, $mock, $slept] = retryingRoxy(array_fill(0, 3, limited('compute_saturated', 503)), maxRetries: 2);

    expect(fn () => $roxy->astrology->getDailyHoroscope(sign: 'aries'))->toThrow(RoxyApiException::class)
        ->and($mock->getRecordedResponses())->toHaveCount(3)
        ->and($slept->getArrayCopy())->toBe([250, 500]);
});

it('retries a 500, then succeeds', function (): void {
    [$roxy, $mock] = retryingRoxy([limited('internal_error', 500), MockResponse::make(['sign' => 'aries'])]);

    expect($roxy->astrology->getDailyHoroscope(sign: 'aries'))->toBe(['sign' => 'aries'])
        ->and($mock->getRecordedResponses())->toHaveCount(2);
});

it('retries twice by default', function (): void {
    $mock = new MockClient([limited('compute_saturated', 503), limited('compute_saturated', 503), MockResponse::make(['ok' => true])]);
    $roxy = createRoxy('test-key', new RetryPolicy(sleep: static function (int $ms): void {}));
    $roxy->withMockClient($mock);

    expect($roxy->astrology->getDailyHoroscope(sign: 'aries'))->toBe(['ok' => true])
        ->and($mock->getRecordedResponses())->toHaveCount(3);
});

it('never retries with maxRetries 0', function (): void {
    $mock = new MockClient([limited('compute_saturated', 503), MockResponse::make(['ok' => true])]);
    $roxy = createRoxy('test-key', new RetryPolicy(maxRetries: 0));
    $roxy->withMockClient($mock);

    expect(fn () => $roxy->astrology->getDailyHoroscope(sign: 'aries'))->toThrow(RoxyApiException::class)
        ->and($mock->getRecordedResponses())->toHaveCount(1);
});

it('does not retry a 4xx other than 429', function (): void {
    [$roxy, $mock] = retryingRoxy([limited('validation_error', 400)]);

    expect(fn () => $roxy->astrology->getDailyHoroscope(sign: 'aries'))->toThrow(RoxyApiException::class)
        ->and($mock->getRecordedResponses())->toHaveCount(1);
});

it('keeps jitter inside its bounds', function (float $random, int $expected): void {
    [$roxy, , $slept] = retryingRoxy([limited('compute_saturated', 503, ['Retry-After' => '2']), MockResponse::make([])], random: $random);
    $roxy->astrology->getDailyHoroscope(sign: 'aries');

    expect($slept->getArrayCopy())->toBe([$expected]);
})->with([[0.0, 2000], [0.999, 2499]]);

it('caps the backoff at the max delay', function (): void {
    /** @var ArrayObject<int, int> $slept */
    $slept = new ArrayObject();
    $policy = new RetryPolicy(maxRetries: 9, initialDelayMs: 20000, maxDelayMs: 30000, random: static fn (): float => 0.999, sleep: static function (int $ms) use ($slept): void {
        $slept[] = $ms;
    });
    $mock = new MockClient([limited('compute_saturated', 503), limited('compute_saturated', 503), MockResponse::make([])]);
    $roxy = createRoxy('test-key', $policy);
    $roxy->withMockClient($mock);
    $roxy->astrology->getDailyHoroscope(sign: 'aries');

    expect($slept->getArrayCopy())->toBe([19980, 29970]);
});

it('retries a connection failure that never sent the request, not a timeout', function (int $errno, int $sends): void {
    /** @var ArrayObject<int, int> $slept */
    $slept = new ArrayObject();
    $policy = new RetryPolicy(maxRetries: 2, random: static fn (): float => 0.0, sleep: static function (int $ms) use ($slept): void {
        $slept[] = $ms;
    });
    $roxy = createRoxy('test-key', $policy);
    $calls = 0;
    $mock = new MockClient([GetDailyHoroscopeRequest::class => function ($pending) use (&$calls, $errno) {
        ++$calls;
        throw new FatalRequestException(new ConnectException(sprintf('cURL error %d: boom', $errno), new PsrRequest('GET', '/')), $pending);
    }]);
    $roxy->withMockClient($mock);

    try {
        $roxy->astrology->getDailyHoroscope(sign: 'aries');
        expect(true)->toBeFalse('expected RoxyApiException');
    } catch (RoxyApiException $e) {
        expect($e->errorCode)->toBe('connection_error')
            ->and($calls)->toBe($sends);
    }
})->with([[7, 3], [6, 3], [28, 1]]);

it('parses Retry-After as seconds or HTTP-date', function (): void {
    [$roxy] = retryingRoxy([limited('rate_limit_per_minute', 429, ['Retry-After' => gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT'])], maxRetries: 0);

    try {
        $roxy->astrology->getDailyHoroscope(sign: 'aries');
    } catch (RoxyApiException $e) {
        expect($e->retryAfter)->toBeGreaterThan(3590)->toBeLessThanOrEqual(3600);
    }
});

it('leaves docUrl and retryAfter null when the response has neither', function (): void {
    [$roxy] = retryingRoxy([MockResponse::make(['error' => 'x', 'code' => 'not_found'], 404)], maxRetries: 0);

    try {
        $roxy->astrology->getDailyHoroscope(sign: 'aries');
    } catch (RoxyApiException $e) {
        expect($e->docUrl)->toBeNull()->and($e->retryAfter)->toBeNull();
    }
});

it('keeps README and AGENTS error tables identical to the spec codes', function (): void {
    $spec = json_decode((string) file_get_contents(__DIR__ . '/../specs/openapi.json'), true, 512, JSON_THROW_ON_ERROR);
    $expected = array_map(static fn (array $c): string => $c['code'], $spec['info']['x-error-codes']);

    foreach (['README.md', 'AGENTS.md'] as $file) {
        preg_match('/<!-- BEGIN:ERRORS -->(.*)<!-- END:ERRORS -->/s', (string) file_get_contents(__DIR__ . '/../' . $file), $region);
        preg_match_all('/^\| (?:\d{3}|Any) \| `([^`]+)` \|/m', $region[1] ?? '', $codes);
        expect($codes[1])->toBe($expected);
    }
});

it('has one ErrorCode case per spec code, in spec order, and code() is null for an unknown code', function (): void {
    $spec = json_decode((string) file_get_contents(__DIR__ . '/../specs/openapi.json'), true, 512, JSON_THROW_ON_ERROR);
    $expected = array_map(static fn (array $c): string => $c['code'], $spec['info']['x-error-codes']);

    expect(array_map(static fn (ErrorCode $c): string => $c->value, ErrorCode::cases()))->toBe($expected);

    $known = new RoxyApiException('x', 'compute_saturated', 503);
    $unknown = new RoxyApiException('x', 'a_future_code', 400);
    expect($known->code())->toBe(ErrorCode::ComputeSaturated)->and($unknown->code())->toBeNull();
});

it('exposes validation issues, the Saloon response, and getCode() as the HTTP status', function (): void {
    $issue = ['path' => 'time', 'message' => 'Required', 'code' => 'invalid_type'];
    $mock = new MockClient([MockResponse::make(['error' => 'Validation failed', 'code' => 'validation_error', 'issues' => [$issue]], 400)]);
    $roxy = createRoxy('test-key', new RetryPolicy(maxRetries: 0));
    $roxy->withMockClient($mock);

    try {
        $roxy->astrology->getDailyHoroscope(sign: 'aries');
        expect(true)->toBeFalse('expected RoxyApiException');
    } catch (RoxyApiException $e) {
        expect($e->issues)->toBe([$issue])
            ->and($e->code())->toBe(ErrorCode::ValidationError)
            ->and($e->getCode())->toBe(400)
            ->and($e->response?->status())->toBe(400);
    }
});

it('leaves issues null when the body has none', function (): void {
    expect((new RoxyApiException('x', 'not_found', 404))->issues)->toBeNull();
});

it('sends {} for a no-argument all-optional POST and keeps a non-empty body unchanged', function (): void {
    $mock = new MockClient([MockResponse::make(['ok' => true]), MockResponse::make(['ok' => true])]);
    $roxy = createRoxy('test-key');
    $roxy->withMockClient($mock);

    $roxy->tarot->getDailyCard();
    expect((string) lastPending($mock)->createPsrRequest()->getBody())->toBe('{}');

    $roxy->tarot->getDailyCard(seed: 'user-42');
    expect((string) lastPending($mock)->createPsrRequest()->getBody())->toBe('{"seed":"user-42"}');
});
