<?php

declare(strict_types=1);

namespace RoxyAPI\Sdk\Retry;

use GuzzleHttp\Exception\ConnectException;
use RoxyAPI\Sdk\RoxyApiException;
use Saloon\Exceptions\Request\FatalRequestException;
use Saloon\Exceptions\Request\RequestException;
use Saloon\Http\Request;

/**
 * Retries for a Roxy client: two by default, `new RetryPolicy(maxRetries: 0)` turns them off.
 *
 * Retries HTTP 429, 500, 502, 503 and 504, plus connection failures where the request was
 * never sent (DNS failure, connection refused). Never a read timeout.
 *
 * A Retry-After header (seconds or HTTP-date) wins: a wait longer than `maxDelayMs`
 * is not retried and the error is thrown with `retryAfter` set; otherwise the wait is
 * the header value plus up to `initialDelayMs` of jitter. Without the header the wait is
 * a full-jitter exponential backoff capped at `maxDelayMs`.
 */
final class RetryPolicy
{
    private const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

    /** cURL errno for "could not resolve host" and "failed to connect". */
    private const NEVER_SENT_ERRNOS = [6, 7];

    /** @var \WeakMap<Request, int> retries already made per request */
    private \WeakMap $attempts;

    /**
     * @param int $maxRetries retries after the first attempt, 0 disables them
     * @param int $initialDelayMs base of the backoff and the jitter added to Retry-After
     * @param int $maxDelayMs longest wait the SDK will sit through
     * @param (\Closure(): float)|null $random uniform float in [0, 1), injectable for tests
     * @param (\Closure(int): void)|null $sleep sleeps for milliseconds, injectable for tests
     */
    public function __construct(
        public readonly int $maxRetries = 2,
        public readonly int $initialDelayMs = 500,
        public readonly int $maxDelayMs = 30000,
        private readonly ?\Closure $random = null,
        private readonly ?\Closure $sleep = null,
    ) {
        $this->attempts = new \WeakMap();
    }

    /**
     * Decide whether the failed request goes again, and wait before it does.
     * Called by Saloon between attempts, so the retry budget is already enforced.
     */
    public function shouldRetry(FatalRequestException|RequestException $exception, Request $request): bool
    {
        $attempt = $this->attempts[$request] ?? 0;
        $delayMs = $this->delayMs($exception, $attempt);
        if (null === $delayMs) {
            return false;
        }

        $this->attempts[$request] = $attempt + 1;
        ($this->sleep ?? static fn (int $ms) => usleep($ms * 1000))($delayMs);

        return true;
    }

    private function delayMs(FatalRequestException|RequestException $exception, int $attempt): ?int
    {
        $retryAfter = null;
        if ($exception instanceof RequestException) {
            $response = $exception->getResponse();
            if (!in_array($response->status(), self::RETRYABLE_STATUSES, true)) {
                return null;
            }
            $retryAfter = RoxyApiException::retryAfterSeconds($response);
        } elseif (!$this->neverSent($exception)) {
            return null;
        }

        if (null !== $retryAfter) {
            if ($retryAfter * 1000 > $this->maxDelayMs) {
                return null;
            }

            return min($this->maxDelayMs, (int) ($retryAfter * 1000 + $this->jitter() * $this->initialDelayMs));
        }

        return (int) ($this->jitter() * min($this->maxDelayMs, $this->initialDelayMs * 2 ** $attempt));
    }

    private function neverSent(FatalRequestException $exception): bool
    {
        $cause = $exception->getPrevious();

        return $cause instanceof ConnectException
            && 1 === preg_match('/^cURL error (?:' . implode('|', self::NEVER_SENT_ERRNOS) . '):/', $cause->getMessage());
    }

    private function jitter(): float
    {
        return $this->random ? ($this->random)() : mt_rand() / (mt_getrandmax() + 1);
    }
}
