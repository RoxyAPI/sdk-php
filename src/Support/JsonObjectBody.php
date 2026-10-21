<?php

declare(strict_types=1);

namespace RoxyAPI\Sdk\Support;

use Saloon\Http\PendingRequest;
use Saloon\Repositories\Body\JsonBodyRepository;

/**
 * A JSON body that encodes as `{}` when empty. PHP encodes an empty array as `[]`, which the
 * API rejects for an endpoint whose body fields are all optional. A non-empty body, and every
 * nested array in it, encodes exactly as before.
 */
final class JsonObjectBody extends JsonBodyRepository
{
    /** Request middleware: swap an empty JSON body for one that encodes as an object. */
    public static function onRequest(PendingRequest $pendingRequest): PendingRequest
    {
        $body = $pendingRequest->body();
        if ($body instanceof JsonBodyRepository && [] === $body->all()) {
            $pendingRequest->setBody((new self())->setJsonFlags($body->getJsonFlags()));
        }

        return $pendingRequest;
    }

    public function __toString(): string
    {
        $json = json_encode([] === $this->all() ? new \stdClass() : $this->all(), $this->getJsonFlags());

        return false === $json ? '' : $json;
    }
}
