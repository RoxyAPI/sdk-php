<?php

declare(strict_types=1);

/*
 * Pest bootstrap: the default TestCase for every spec file, plus the helpers shared by them.
 */

use Saloon\Http\Faking\MockClient;
use Saloon\Http\PendingRequest;

uses()->in(__DIR__);

/** The request the mock recorded last; a missing one is a send that never happened. */
function lastPending(MockClient $mock): PendingRequest
{
    return $mock->getLastPendingRequest() ?? throw new RuntimeException('no request was sent');
}
