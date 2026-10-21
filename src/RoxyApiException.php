<?php

declare(strict_types=1);

namespace RoxyAPI\Sdk;

use Saloon\Exceptions\Request\FatalRequestException;
use Saloon\Http\Response;

/**
 * Thrown when RoxyAPI returns a 4xx/5xx response, or the request never reached it.
 *
 * The same shape every RoxyAPI SDK exposes: human-readable `error`, the stable
 * machine-readable `errorCode` to switch on, the HTTP `statusCode` (0 for a
 * transport failure), `docUrl` (the page documenting the code), `retryAfter` (whole
 * seconds the server asked to wait, from the Retry-After header), `issues` (the failing
 * fields of a validation_error, each with path, message and code), and the raw Saloon
 * Response for advanced inspection. getCode() is the HTTP status, never the API code.
 */
class RoxyApiException extends \RuntimeException
{
    /**
     * @param list<array<string, mixed>>|null $issues
     */
    public function __construct(
        public readonly string $error,
        public readonly string $errorCode,
        public readonly int $statusCode,
        public readonly ?Response $response = null,
        public readonly ?string $docUrl = null,
        public readonly ?int $retryAfter = null,
        public readonly ?array $issues = null,
    ) {
        parent::__construct(sprintf('[%d] %s: %s', $statusCode, $errorCode, $error), $statusCode);
    }

    /** The code as an enum case, or null for a code this SDK version does not know. */
    public function code(): ?ErrorCode
    {
        return ErrorCode::tryFrom($this->errorCode);
    }

    public static function fromResponse(Response $response): self
    {
        $body = [];
        try {
            /** @var array<string, mixed> $decoded */
            $decoded = (array) $response->json();
            $body = $decoded;
        } catch (\Throwable) {
            // not a JSON body: the raw text becomes the error below
        }

        $errorField = $body['error'] ?? null;
        $codeField = $body['code'] ?? null;
        $docUrlField = $body['doc_url'] ?? null;
        $issuesField = $body['issues'] ?? null;

        return new self(
            error: is_string($errorField) ? $errorField : ('' !== $response->body() ? $response->body() : 'Unknown error'),
            errorCode: is_string($codeField) ? $codeField : 'unknown',
            statusCode: $response->status(),
            response: $response,
            docUrl: is_string($docUrlField) ? $docUrlField : null,
            retryAfter: self::retryAfterSeconds($response),
            issues: is_array($issuesField) ? array_values($issuesField) : null,
        );
    }

    /** Whole seconds from a Retry-After header given as seconds or an HTTP-date, null when absent or unparseable. */
    public static function retryAfterSeconds(Response $response): ?int
    {
        $value = $response->header('Retry-After');
        $value = is_array($value) ? ($value[0] ?? null) : $value;
        if (!is_string($value) || '' === trim($value)) {
            return null;
        }
        $value = trim($value);
        if (ctype_digit($value)) {
            return (int) $value;
        }
        $at = strtotime($value);

        return false === $at ? null : max(0, $at - time());
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
