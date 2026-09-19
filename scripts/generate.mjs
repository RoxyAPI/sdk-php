#!/usr/bin/env node
/**
 * RoxyAPI PHP SDK code generator.
 *
 * Fetches the live OpenAPI spec, writes it to specs/openapi.json (the
 * change-detection baseline), and emits one Saloon Resource class per URL path
 * segment and one Saloon Request class per operation into src/Generated/. Also
 * regenerates src/Roxy.php and src/Version.php, then runs sync-docs.mjs so the
 * README and AGENTS regions are asserted in the same drift diff.
 *
 *   node scripts/generate.mjs
 *
 * Output is deterministic: two consecutive runs produce byte-identical files.
 * The pre-push hook (lefthook.yml) and CI re-run this and fail if anything
 * differs from what is committed.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathNamespace, resourceClassName } from './namespace.mjs';
import { tagSummary } from './tag-descriptions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SPEC_URL = process.env.ROXYAPI_OPENAPI_URL || 'https://roxyapi.com/api/v2/openapi.json';
const SPEC_FILE = path.join(ROOT, 'specs', 'openapi.json');
const OUT_DIR = path.join(ROOT, 'src', 'Generated');
const RESOURCES_DIR = path.join(OUT_DIR, 'Resources');
const REQUESTS_DIR = path.join(OUT_DIR, 'Requests');
const VERSION_FILE = path.join(ROOT, 'src', 'Version.php');
const ROXY_FILE = path.join(ROOT, 'src', 'Roxy.php');

// ---------------------------------------------------------------------------
// 1. Fetch + patch + persist spec
// ---------------------------------------------------------------------------

/** Retry with exponential backoff: a transient upstream error (e.g. a CDN 520) must not fail the daily release run. */
async function fetchSpec(url, attempts = 5) {
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
			if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
			return await res.json();
		} catch (err) {
			if (attempt === attempts) {
				console.error(`[generate] fetch failed after ${attempts} attempts: ${err.message}`);
				process.exit(1);
			}
			const delay = 2 ** attempt;
			console.warn(`[generate] fetch attempt ${attempt}/${attempts} failed (${err.message}), retrying in ${delay}s`);
			await new Promise((resolve) => setTimeout(resolve, delay * 1000));
		}
	}
}

/**
 * Load the spec from disk when `ROXYAPI_SPEC_FILE` is set, from `SPEC_URL` otherwise.
 *
 * @remarks
 * Orthogonal to `ROXYAPI_OPENAPI_URL`, which points the fetch at a different server. This one skips
 * the network entirely, keeping generation offline and byte-reproducible, which is what the codegen
 * drift check in CI relies on.
 */
async function loadSpec() {
	const file = process.env.ROXYAPI_SPEC_FILE;
	if (file) {
		console.log(`[generate] reading ${file} (offline, ROXYAPI_SPEC_FILE)`);
		return JSON.parse(await fs.readFile(file, 'utf8'));
	}
	console.log(`[generate] fetching ${SPEC_URL}`);
	return fetchSpec(SPEC_URL);
}

const spec = await loadSpec();

// Patch server URL to absolute production URL so the connector works without
// users supplying a baseUrl (matches the TS + Python SDKs).
if (spec.servers?.[0]?.url === '/api/v2') {
	spec.servers[0].url = 'https://roxyapi.com/api/v2';
}

await fs.mkdir(path.dirname(SPEC_FILE), { recursive: true });
await fs.writeFile(SPEC_FILE, JSON.stringify(spec, null, 2) + '\n', 'utf8');
console.log(`[generate] wrote ${path.relative(ROOT, SPEC_FILE)}`);

// ---------------------------------------------------------------------------
// 2. Walk operations, group by the namespace of their path (sorted for determinism)
// ---------------------------------------------------------------------------

function fail(msg) {
	console.error(`[generate] ${msg}`);
	process.exit(1);
}

// Index the tag objects (with descriptions) for summary extraction.
const tagObjects = Object.fromEntries((spec.tags || []).map((t) => [t.name, t]));

/**
 * @typedef {{operationId: string, method: string, path: string, namespace: string, tag: string, summary: string, description: string, parameters: Array<any>, requestBody: any, responses: any}} Operation
 */

/** @type {Operation[]} */
const operations = [];
for (const apiPath of Object.keys(spec.paths || {}).sort()) {
	const pathItem = spec.paths[apiPath];
	for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
		const op = pathItem[method];
		if (!op) continue;
		if (!op.operationId) fail(`${method.toUpperCase()} ${apiPath} has no operationId`);
		if (!op.tags?.[0]) fail(`${method.toUpperCase()} ${apiPath} has no tag`);
		operations.push({
			operationId: op.operationId,
			method: method.toUpperCase(),
			path: apiPath,
			namespace: pathNamespace(apiPath),
			tag: op.tags[0],
			summary: (op.summary || '').trim(),
			description: (op.description || '').trim(),
			parameters: op.parameters || [],
			requestBody: op.requestBody || null,
			responses: op.responses || {},
		});
	}
}
operations.sort((a, b) => a.operationId.localeCompare(b.operationId));

/** @type {Record<string, Operation[]>} */
const opsByNamespace = {};
for (const op of operations) {
	(opsByNamespace[op.namespace] ??= []).push(op);
}

// One namespace is one tag and one tag is one namespace: the resource docblock reads the
// tag description, and the docs tables list one row per tag, so either side spanning two
// of the other has no single home and must fail here rather than land somewhere silently.
for (const [namespace, ops] of Object.entries(opsByNamespace)) {
	const tags = [...new Set(ops.map((op) => op.tag))];
	if (tags.length !== 1) fail(`namespace "${namespace}" spans ${tags.length} tags (${tags.join(', ')}); expected exactly one`);
}
for (const tag of new Set(operations.map((op) => op.tag))) {
	const namespaces = [...new Set(operations.filter((op) => op.tag === tag).map((op) => op.namespace))];
	if (namespaces.length !== 1) fail(`tag "${tag}" maps to ${namespaces.length} path segments (${namespaces.join(', ')}); expected exactly one`);
}

const namespaces = Object.keys(opsByNamespace).sort((a, b) => a.localeCompare(b));

console.log(`[generate] found ${operations.length} operations across ${namespaces.length} namespaces`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveRef(obj) {
	if (!obj || typeof obj !== 'object') return obj;
	if (obj.$ref) {
		const segments = obj.$ref.replace('#/', '').split('/');
		let resolved = spec;
		for (const seg of segments) resolved = resolved?.[seg];
		return resolved || obj;
	}
	if (Array.isArray(obj.allOf)) {
		let merged = { properties: {}, required: [] };
		for (const part of obj.allOf) {
			const r = resolveRef(part);
			merged = {
				...merged,
				...r,
				properties: { ...merged.properties, ...(r.properties || {}) },
				required: [...(merged.required || []), ...(r.required || [])],
			};
		}
		return merged;
	}
	return obj;
}

function pascalCase(str) {
	return str
		.replace(/(^|[^a-zA-Z0-9])([a-zA-Z])/g, (_, _sep, c) => c.toUpperCase())
		.replace(/[^a-zA-Z0-9]/g, '');
}

function camelCase(str) {
	const p = pascalCase(str);
	return p.charAt(0).toLowerCase() + p.slice(1);
}

/** Reserved PHP keywords/types we must not emit as parameter names. */
const PHP_RESERVED = new Set([
	'class', 'function', 'list', 'new', 'array', 'string', 'int', 'float',
	'bool', 'true', 'false', 'null', 'echo', 'if', 'else', 'for', 'foreach',
	'while', 'switch', 'case', 'break', 'continue', 'return', 'use', 'namespace',
	'default', 'const', 'public', 'private', 'protected', 'static', 'abstract',
	'final', 'interface', 'trait', 'extends', 'implements', 'try', 'catch',
	'finally', 'throw', 'object', 'callable', 'iterable', 'mixed', 'never',
	'void', 'self', 'parent', 'this', 'fn', 'match', 'enum', 'readonly',
]);

function safePhpVar(name) {
	const candidate = camelCase(name);
	return PHP_RESERVED.has(candidate) ? candidate + 'Param' : candidate;
}

function phpType(schema) {
	if (!schema || typeof schema !== 'object') return 'mixed';
	const resolved = resolveRef(schema);
	const t = resolved.type;
	if (t === 'integer') return 'int';
	if (t === 'number') return 'float';
	if (t === 'boolean') return 'bool';
	if (t === 'string') return 'string';
	if (t === 'array') return 'array';
	if (t === 'object') return 'array';
	return 'mixed';
}

/** Escape a string for PHP single-quoted literal. */
function phpStr(s) {
	return "'" + String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

/** Wrap a docblock-summary line at ~95 chars without breaking words. */
function wrapDoc(text, indent = ' * ') {
	if (!text) return [];
	const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
	const lines = [];
	let line = '';
	for (const w of words) {
		if ((line + ' ' + w).length > 92) {
			lines.push(indent + line.trim());
			line = w;
		} else {
			line = line ? line + ' ' + w : w;
		}
	}
	if (line) lines.push(indent + line.trim());
	return lines;
}

function bodyFields(op) {
	if (!op.requestBody) return { fields: [], hasBody: false };
	const content = op.requestBody.content?.['application/json'];
	if (!content?.schema) return { fields: [], hasBody: false };
	const schema = resolveRef(content.schema);
	const props = schema.properties || {};
	const required = new Set(schema.required || []);
	const fields = Object.keys(props)
		.sort()
		.map((name) => {
			const resolved = resolveRef(props[name]);
			return {
				name,
				required: required.has(name),
				type: phpType(resolved),
				description: (resolved.description || '').trim(),
			};
		});
	return { fields, hasBody: true };
}

function queryParams(op) {
	return (op.parameters || [])
		.filter((p) => p.in === 'query')
		.map((p) => {
			const schema = resolveRef(p.schema || {});
			return {
				name: p.name,
				required: p.required === true,
				type: phpType(schema),
				description: (p.description || schema.description || '').trim(),
			};
		})
		.sort((a, b) => {
			// required first, then alphabetical
			if (a.required !== b.required) return a.required ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
}

function pathParamsList(op) {
	return (op.parameters || [])
		.filter((p) => p.in === 'path')
		.map((p) => {
			const schema = resolveRef(p.schema || {});
			return {
				name: p.name,
				type: phpType(schema),
				description: (p.description || schema.description || '').trim(),
			};
		});
}

// ---------------------------------------------------------------------------
// 4. Emit Request classes
// ---------------------------------------------------------------------------

const HEADER = `<?php

declare(strict_types=1);

/**
 * AUTO-GENERATED by scripts/generate.mjs from the live OpenAPI spec.
 * Do not edit this file by hand. Regenerate with: node scripts/generate.mjs
 */
`;

function emitRequest(op) {
	const className = pascalCase(op.operationId) + 'Request';
	const pathArgs = pathParamsList(op);
	const queryArgs = queryParams(op);
	const { fields: bodyArgs, hasBody } = bodyFields(op);
	const isPostLike = op.method !== 'GET' && op.method !== 'DELETE';

	// Constructor parameter list: path params (required), then required body
	// fields, then required query, then optional body, then optional query.
	const ctorParts = [];
	for (const p of pathArgs) {
		ctorParts.push({
			name: safePhpVar(p.name),
			specName: p.name,
			type: p.type,
			required: true,
			kind: 'path',
			description: p.description,
		});
	}
	if (hasBody) {
		for (const f of bodyArgs.filter((f) => f.required)) {
			ctorParts.push({
				name: safePhpVar(f.name),
				specName: f.name,
				type: f.type,
				required: true,
				kind: 'body',
				description: f.description,
			});
		}
	}
	for (const q of queryArgs.filter((q) => q.required)) {
		ctorParts.push({
			name: safePhpVar(q.name),
			specName: q.name,
			type: q.type,
			required: true,
			kind: 'query',
			description: q.description,
		});
	}
	if (hasBody) {
		for (const f of bodyArgs.filter((f) => !f.required)) {
			ctorParts.push({
				name: safePhpVar(f.name),
				specName: f.name,
				type: f.type,
				required: false,
				kind: 'body',
				description: f.description,
			});
		}
	}
	for (const q of queryArgs.filter((q) => !q.required)) {
		ctorParts.push({
			name: safePhpVar(q.name),
			specName: q.name,
			type: q.type,
			required: false,
			kind: 'query',
			description: q.description,
		});
	}

	// Build constructor signature. `mixed` already includes null in PHP 8.2+,
	// so it cannot be marked nullable with `?`.
	const ctorLines = ctorParts.map((p) => {
		const phpType = p.required || p.type === 'mixed' ? p.type : '?' + p.type;
		const def = p.required ? '' : ' = null';
		return `        public readonly ${phpType} \$${p.name}${def},`;
	});

	// Path resolution
	let resolvedPath = op.path;
	for (const p of pathArgs) {
		resolvedPath = resolvedPath.replace(`{${p.name}}`, `{\$this->${safePhpVar(p.name)}}`);
	}
	const endpointBody = `        return "${resolvedPath}";`;

	// Body / query payload builders
	const bodyMethod = isPostLike && hasBody
		? `
    /**
     * @return array<string, mixed>
     */
    protected function defaultBody(): array
    {
        $body = [];
${bodyArgs
				.map((f) => {
					const v = safePhpVar(f.name);
					if (f.required) {
						return `        $body[${phpStr(f.name)}] = $this->${v};`;
					}
					return `        if ($this->${v} !== null) {\n            $body[${phpStr(f.name)}] = $this->${v};\n        }`;
				})
				.join('\n')}

        return $body;
    }
`
		: '';

	const queryMethod = queryArgs.length > 0
		? `
    /**
     * @return array<string, mixed>
     */
    protected function defaultQuery(): array
    {
        $query = [];
${queryArgs
				.map((q) => {
					const v = safePhpVar(q.name);
					if (q.required) {
						return `        $query[${phpStr(q.name)}] = $this->${v};`;
					}
					return `        if ($this->${v} !== null) {\n            $query[${phpStr(q.name)}] = $this->${v};\n        }`;
				})
				.join('\n')}

        return $query;
    }
`
		: '';

	const implementsClause = isPostLike && hasBody ? ' implements HasBody' : '';
	const useTrait = isPostLike && hasBody ? "    use HasJsonBody;\n\n" : '';
	const bodyImports = isPostLike && hasBody
		? "use Saloon\\Contracts\\Body\\HasBody;\nuse Saloon\\Traits\\Body\\HasJsonBody;\n"
		: '';

	// Class-level docblock
	const docLines = [];
	if (op.summary) docLines.push(...wrapDoc(op.summary));
	if (op.description && op.description !== op.summary) {
		if (docLines.length) docLines.push(' *');
		docLines.push(...wrapDoc(op.description));
	}
	if (docLines.length) docLines.push(' *');
	docLines.push(` * ${op.method} ${op.path}`);
	const docblock = `/**\n${docLines.join('\n')}\n */`;

	return `${HEADER}
namespace RoxyAPI\\Sdk\\Generated\\Requests;

use Saloon\\Enums\\Method;
use Saloon\\Http\\Request;
${bodyImports}
${docblock}
class ${className} extends Request${implementsClause}
{
${useTrait}    protected Method $method = Method::${op.method};

    public function __construct(
${ctorLines.join('\n')}
    ) {
    }

    public function resolveEndpoint(): string
    {
${endpointBody}
    }
${bodyMethod}${queryMethod}}
`;
}

// ---------------------------------------------------------------------------
// 5. Emit Resource classes (one per tag) with one method per operation
// ---------------------------------------------------------------------------

function emitResource(namespace, ops) {
	const className = resourceClassName(namespace);
	const tagName = ops[0].tag;
	const summary = tagSummary(tagObjects[tagName] ?? { name: tagName });
	ops.sort((a, b) => a.operationId.localeCompare(b.operationId));

	const methodSnippets = ops.map((op) => {
		const requestClass = pascalCase(op.operationId) + 'Request';
		const pathArgs = pathParamsList(op);
		const queryArgs = queryParams(op);
		const { fields: bodyArgs, hasBody } = bodyFields(op);
		const isPostLike = op.method !== 'GET' && op.method !== 'DELETE';

		// Same param ordering as the Request ctor.
		const params = [];
		for (const p of pathArgs) {
			params.push({ name: safePhpVar(p.name), type: p.type, required: true, description: p.description });
		}
		if (hasBody) {
			for (const f of bodyArgs.filter((f) => f.required)) {
				params.push({ name: safePhpVar(f.name), type: f.type, required: true, description: f.description });
			}
		}
		for (const q of queryArgs.filter((q) => q.required)) {
			params.push({ name: safePhpVar(q.name), type: q.type, required: true, description: q.description });
		}
		if (hasBody) {
			for (const f of bodyArgs.filter((f) => !f.required)) {
				params.push({ name: safePhpVar(f.name), type: f.type, required: false, description: f.description });
			}
		}
		for (const q of queryArgs.filter((q) => !q.required)) {
			params.push({ name: safePhpVar(q.name), type: q.type, required: false, description: q.description });
		}

		const sigParts = params.map((p) => {
			const phpType = p.required || p.type === 'mixed' ? p.type : '?' + p.type;
			const def = p.required ? '' : ' = null';
			return `${phpType} \$${p.name}${def}`;
		});
		const signature = sigParts.length === 0 ? '' : '\n        ' + sigParts.join(',\n        ') + '\n    ';

		const passArgs = params.map((p) => `${p.name}: \$${p.name}`).join(', ');
		const passLine = passArgs.length > 0 ? `new \\RoxyAPI\\Sdk\\Generated\\Requests\\${requestClass}(${passArgs})` : `new \\RoxyAPI\\Sdk\\Generated\\Requests\\${requestClass}()`;

		const docLines = [];
		if (op.summary) docLines.push(...wrapDoc(op.summary, '     * '));
		if (op.description && op.description !== op.summary) {
			if (docLines.length) docLines.push('     *');
			docLines.push(...wrapDoc(op.description, '     * '));
		}
		if (docLines.length) docLines.push('     *');
		docLines.push(`     * ${op.method} ${op.path}`);
		docLines.push('     *');
		for (const p of params) {
			const flat = p.description ? p.description.replace(/\s+/g, ' ').trim() : '';
			if (flat) {
				const wrapped = wrapDoc(flat, '     *   ');
				docLines.push(`     * @param ${p.required ? p.type : p.type + '|null'} \$${p.name}`);
				docLines.push(...wrapped);
			} else {
				docLines.push(`     * @param ${p.required ? p.type : p.type + '|null'} \$${p.name}`);
			}
		}
		docLines.push('     *');
		docLines.push('     * @return array<string, mixed>');
		const docblock = `    /**\n${docLines.join('\n')}\n     */`;

		return `${docblock}
    public function ${op.operationId}(${signature}): array
    {
        $request = ${passLine};

        return $this->callRequest($request);
    }`;
	});

	const docLines = [];
	docLines.push(...wrapDoc(summary || `${tagName} resource`));
	docLines.push(' *');
	docLines.push(` * Accessed via \$roxy->${namespace}.`);
	const classDoc = `/**\n${docLines.join('\n')}\n */`;

	return `${HEADER}
namespace RoxyAPI\\Sdk\\Generated\\Resources;

use RoxyAPI\\Sdk\\Generated\\Resources\\BaseResource;

${classDoc}
class ${className} extends BaseResource
{
${methodSnippets.join('\n\n')}
}
`;
}

// ---------------------------------------------------------------------------
// 6. Emit BaseResource (shared): calls connector, unwraps response, throws
// ---------------------------------------------------------------------------

const BASE_RESOURCE = `${HEADER}
namespace RoxyAPI\\Sdk\\Generated\\Resources;

use RoxyAPI\\Sdk\\RoxyApiException;
use Saloon\\Exceptions\\Request\\FatalRequestException;
use Saloon\\Http\\BaseResource as SaloonBaseResource;
use Saloon\\Http\\Request;

/**
 * Shared base for every generated Resource class. Sends a Saloon Request,
 * decodes the JSON body, and throws RoxyApiException for everything callers
 * should care about (4xx, 5xx, and transport failures) so consumers never
 * have to catch more than one exception type.
 */
abstract class BaseResource extends SaloonBaseResource
{
    /**
     * @return array<string, mixed>
     */
    protected function callRequest(Request $request): array
    {
        try {
            $response = $this->connector->send($request);
        } catch (FatalRequestException $e) {
            throw RoxyApiException::fromFatal($e);
        }

        if ($response->failed()) {
            throw RoxyApiException::fromResponse($response);
        }

        try {
            $decoded = $response->json();
        } catch (\\Throwable) {
            $decoded = null;
        }

        return is_array($decoded) ? $decoded : [];
    }
}
`;

// ---------------------------------------------------------------------------
// 7. Write everything
// ---------------------------------------------------------------------------

// Clean generated dirs first so deletions in the spec actually remove files.
await fs.rm(RESOURCES_DIR, { recursive: true, force: true });
await fs.rm(REQUESTS_DIR, { recursive: true, force: true });
await fs.mkdir(RESOURCES_DIR, { recursive: true });
await fs.mkdir(REQUESTS_DIR, { recursive: true });

// BaseResource never changes per spec, but is emitted every time so a single
// regenerate run lands a working tree.
await fs.writeFile(path.join(RESOURCES_DIR, 'BaseResource.php'), BASE_RESOURCE, 'utf8');

// Per-namespace Resource files
for (const namespace of namespaces) {
	await fs.writeFile(
		path.join(RESOURCES_DIR, resourceClassName(namespace) + '.php'),
		emitResource(namespace, opsByNamespace[namespace]),
		'utf8',
	);
}

// Per-operation Request files
for (const op of operations) {
	const file = path.join(REQUESTS_DIR, pascalCase(op.operationId) + 'Request.php');
	await fs.writeFile(file, emitRequest(op), 'utf8');
}

// ---------------------------------------------------------------------------
// 8. Regenerate Version.php from package.json
// ---------------------------------------------------------------------------

const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));
const versionFromPkg = pkg.version || '0.1.0';
const versionPhp = `<?php

declare(strict_types=1);

namespace RoxyAPI\\Sdk;

/**
 * AUTO-GENERATED by scripts/generate.mjs from package.json. Do not edit manually.
 */
final class Version
{
    public const VERSION = '${versionFromPkg}';
}
`;
await fs.writeFile(VERSION_FILE, versionPhp, 'utf8');

// ---------------------------------------------------------------------------
// 9. Auto-generate src/Roxy.php (RESOURCES map + @property block + Connector
//    setup). The Saloon plumbing is edited in the template below, never per namespace.
// ---------------------------------------------------------------------------

const useLines = namespaces
	.map((namespace) => `use RoxyAPI\\Sdk\\Generated\\Resources\\${resourceClassName(namespace)};`)
	.join('\n');

const propertyLines = namespaces
	.map((namespace) => ` * @property ${resourceClassName(namespace)} \$${namespace}`)
	.join('\n');

const resourceMapLines = namespaces
	.map((namespace) => `        '${namespace}' => ${resourceClassName(namespace)}::class,`)
	.join('\n');

const roxyPhp = `<?php

declare(strict_types=1);

/**
 * AUTO-GENERATED by scripts/generate.mjs from the live OpenAPI spec.
 * Do not edit this file by hand. Regenerate with: node scripts/generate.mjs.
 *
 * The hand-written surface lives in createRoxy.php, Auth/ApiKeyAuthenticator.php,
 * and RoxyApiException.php. Every resource in this file is derived from the URL
 * paths of specs/openapi.json.
 */

namespace RoxyAPI\\Sdk;

use RoxyAPI\\Sdk\\Auth\\ApiKeyAuthenticator;
${useLines}
use Saloon\\Contracts\\Authenticator;
use Saloon\\Http\\Connector;
use Saloon\\Traits\\Plugins\\AcceptsJson;

/**
 * Top-level RoxyAPI connector. One resource per URL path segment, lazy-instantiated
 * via the __get accessor below.
 *
${propertyLines}
 */
class Roxy extends Connector
{
    use AcceptsJson;

    /**
     * @var array<string, class-string>
     */
    private const RESOURCES = [
${resourceMapLines}
    ];

    /** @var array<string, object> */
    private array $resourceCache = [];

    public function __construct(public readonly string $apiKey)
    {
    }

    public function resolveBaseUrl(): string
    {
        return ${phpStr(spec.servers[0].url)};
    }

    protected function defaultAuth(): ?Authenticator
    {
        return new ApiKeyAuthenticator($this->apiKey);
    }

    /**
     * @return array<string, string>
     */
    protected function defaultHeaders(): array
    {
        return [
            'X-SDK-Client' => 'roxy-sdk-php/' . Version::VERSION,
        ];
    }

    public function __get(string $name): object
    {
        if (!isset(self::RESOURCES[$name])) {
            throw new \\InvalidArgumentException(sprintf('Unknown resource "%s" on Roxy. Known: %s', $name, implode(', ', array_keys(self::RESOURCES))));
        }

        return $this->resourceCache[$name] ??= new (self::RESOURCES[$name])($this);
    }

    public function __isset(string $name): bool
    {
        return isset(self::RESOURCES[$name]);
    }
}
`;

await fs.writeFile(ROXY_FILE, roxyPhp, 'utf8');

console.log(`[generate] wrote ${operations.length} requests, ${namespaces.length} resources, Roxy.php, Version ${versionFromPkg}`);

// ---------------------------------------------------------------------------
// 10. Sync the spec-derived regions of README.md and AGENTS.md
// ---------------------------------------------------------------------------

execFileSync(process.execPath, [path.join(__dirname, 'sync-docs.mjs')], { cwd: ROOT, stdio: 'inherit' });
console.log('[generate] done');
