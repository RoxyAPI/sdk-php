<?php

declare(strict_types=1);

/*
 * The generated surface mirrors the committed spec. Every operation of specs/openapi.json is
 * a method on the resource of its URL path segment, and calling it sends the verb of the spec
 * to the path of the spec with every required parameter, so a generator that drops, renames
 * or misroutes an operation fails here naming it.
 */

use RoxyAPI\Sdk\Roxy;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

use function RoxyAPI\Sdk\createRoxy;

/** @var array<string, mixed> $spec */
$spec = json_decode((string) file_get_contents(__DIR__ . '/../specs/openapi.json'), true, 512, JSON_THROW_ON_ERROR);

/** The first URL segment in camelCase, the rule scripts/namespace.mjs states for the generator. */
function namespaceOf(string $path): string
{
    $segment = explode('/', trim($path, '/'))[0];

    return (string) preg_replace_callback('/-([a-z])/', static fn (array $m): string => strtoupper($m[1]), $segment);
}

/**
 * @param array<string, mixed> $spec
 *
 * @return array<int, array{path: string, verb: string, namespace: string, operationId: string, tag: string, required: array<string, list<string>>}>
 */
function operationsOf(array $spec): array
{
    $ops = [];
    foreach ($spec['paths'] as $path => $methods) {
        foreach ($methods as $verb => $op) {
            $required = ['path' => [], 'query' => [], 'body' => []];
            foreach ($op['parameters'] ?? [] as $param) {
                if ('path' === $param['in'] || ($param['required'] ?? false)) {
                    $required[$param['in']][] = $param['name'];
                }
            }
            $body = $op['requestBody']['content']['application/json']['schema'] ?? null;
            if (isset($body['$ref'])) {
                $body = $spec['components']['schemas'][basename($body['$ref'])];
            }
            $required['body'] = $body['required'] ?? [];
            $ops[] = [
                'path' => $path,
                'verb' => strtoupper($verb),
                'namespace' => namespaceOf($path),
                'operationId' => $op['operationId'],
                'tag' => $op['tags'][0],
                'required' => $required,
            ];
        }
    }

    return $ops;
}

/** A value of the declared PHP type, so every generated signature can be called without knowing the domain. */
function sampleFor(ReflectionParameter $param): mixed
{
    $type = $param->getType();
    $name = $type instanceof ReflectionNamedType ? $type->getName() : 'mixed';

    return match ($name) {
        'int' => 7,
        'float' => 7.5,
        'bool' => true,
        'array' => ['sample' => true],
        default => 'sample',
    };
}

$operations = operationsOf($spec);

it('covers every operation of the spec with a method on the namespace of its path', function () use ($operations): void {
    expect(count($operations))->toBeGreaterThan(200);
    $roxy = createRoxy('test-key');
    foreach ($operations as $op) {
        expect(isset($roxy->{$op['namespace']}))->toBeTrue("no resource \$roxy->{$op['namespace']} for {$op['path']}");
        expect(method_exists($roxy->{$op['namespace']}, $op['operationId']))
            ->toBeTrue("\$roxy->{$op['namespace']}->{$op['operationId']}() is missing for {$op['verb']} {$op['path']}");
    }
});

it('exposes no resource the spec does not have', function () use ($operations): void {
    $expected = array_unique(array_column($operations, 'namespace'));
    sort($expected);
    $constant = new ReflectionClassConstant(Roxy::class, 'RESOURCES');
    /** @var array<string, class-string> $resources */
    $resources = $constant->getValue();
    $actual = array_keys($resources);
    sort($actual);
    expect($actual)->toBe($expected);
});

it('maps each spec tag to exactly one namespace and each namespace to exactly one tag', function () use ($spec, $operations): void {
    foreach ($spec['tags'] as $tag) {
        $namespaces = array_unique(array_column(array_filter($operations, static fn (array $op): bool => $op['tag'] === $tag['name']), 'namespace'));
        expect($namespaces)->toHaveCount(1, "tag {$tag['name']} spans " . implode(', ', $namespaces));
    }
    foreach (array_unique(array_column($operations, 'namespace')) as $namespace) {
        $tags = array_unique(array_column(array_filter($operations, static fn (array $op): bool => $op['namespace'] === $namespace), 'tag'));
        expect($tags)->toHaveCount(1, "namespace {$namespace} spans " . implode(', ', $tags));
    }
});

it('sends every operation to the verb and path of the spec with every required parameter', function () use ($spec, $operations): void {
    $baseUrl = $spec['servers'][0]['url'];
    $mock = new MockClient([parse_url($baseUrl, PHP_URL_HOST) . '/*' => MockResponse::make(['ok' => true])]);
    $roxy = createRoxy('test-key');
    $roxy->withMockClient($mock);

    foreach ($operations as $op) {
        $resource = $roxy->{$op['namespace']};
        $method = new ReflectionMethod($resource, $op['operationId']);
        $args = [];
        foreach ($method->getParameters() as $param) {
            if (!$param->isDefaultValueAvailable()) {
                $args[$param->getName()] = sampleFor($param);
            }
        }

        $result = $resource->{$op['operationId']}(...$args);
        expect($result)->toBe(['ok' => true], "{$op['operationId']} did not decode the mocked body");

        $pending = lastPending($mock);
        $expectedPath = $op['path'];
        foreach ($op['required']['path'] as $name) {
            $expectedPath = str_replace('{' . $name . '}', (string) $args[$name], $expectedPath);
        }
        expect($pending->getMethod()->value)->toBe($op['verb'], "{$op['operationId']} verb");
        expect($pending->getUrl())->toBe($baseUrl . $expectedPath, "{$op['operationId']} url");
        foreach ($op['required']['query'] as $name) {
            expect(array_key_exists($name, $pending->query()->all()))->toBeTrue("{$op['operationId']} sends no query {$name}");
        }
        if ('GET' !== $op['verb']) {
            /** @var array<string, mixed> $body */
            $body = $pending->body()?->all() ?? [];
            foreach ($op['required']['body'] as $name) {
                expect(array_key_exists($name, $body))->toBeTrue("{$op['operationId']} sends no body field {$name}");
            }
        }
    }
    $mock->assertSentCount(count($operations));
});
