<?php

declare(strict_types=1);

namespace RoxyAPI\Sdk;

use Saloon\Exceptions\Request\FatalRequestException;
use Saloon\Http\Response;

/**
 * Thrown when RoxyAPI returns a 4xx/5xx response.
 *
 * Mirrors the Python SDK's RoxyAPIError exactly: human-readable `error`,
 * machine-readable stable `code`, original HTTP `statusCode`, and the raw
 * Saloon Response for advanced inspection.
 */
class RoxyApiException extends \RuntimeException
{
    public function __construct(
        public readonly string $error,
        public readonly string $errorCode,
        public readonly int $statusCode,
        public readonly ?Response $response = null,
    ) {
        parent::__construct(sprintf('[%d] %s: %s', $statusCode, $errorCode, $error), $statusCode);
    }

    public static function fromResponse(Response $response): self
    {
        $body = [];
        try {
            /** @var array<string, mixed> $decoded */
            $decoded = (array) $response->json();
            $body = $decoded;
        } catch (\Throwable) {
            // body wasn't JSON; leave as-is
        }

        $errorField = $body['error'] ?? null;
        $codeField = $body['code'] ?? null;

        return new self(
            error: is_string($errorField) ? $errorField : ('' !== $response->body() ? $response->body() : 'Unknown error'),
            errorCode: is_string($codeField) ? $codeField : 'unknown',
            statusCode: $response->status(),
            response: $response,
        );
    }

    public static function fromFatal(FatalRequestException $e): self
    {
        return new self(
            error: $e->getMessage(),
            errorCode: 'connection_error',
            statusCode: 0,
            response: null,
        );
    }
}
