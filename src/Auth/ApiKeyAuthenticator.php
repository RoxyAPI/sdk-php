<?php

declare(strict_types=1);

namespace RoxyAPI\Sdk\Auth;

use Saloon\Contracts\Authenticator;
use Saloon\Http\PendingRequest;

/**
 * Injects the X-API-Key header on every outgoing request.
 *
 * RoxyAPI uses a single header-based key; this matches the Python and TypeScript
 * SDK behaviour exactly.
 */
final class ApiKeyAuthenticator implements Authenticator
{
    public function __construct(public readonly string $apiKey)
    {
    }

    public function set(PendingRequest $pendingRequest): void
    {
        $pendingRequest->headers()->add('X-API-Key', $this->apiKey);
    }
}
