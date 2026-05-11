#!/usr/bin/env node
/**
 * RoxyAPI PHP SDK code generator.
 *
 * Fetches the live OpenAPI spec, writes it to specs/openapi.json (the
 * change-detection baseline), and emits one Saloon Resource class per OpenAPI
 * tag and one Saloon Request class per operation into src/Generated/. Also
 * regenerates src/Version.php from package.json.
 *
 *   node scripts/generate.mjs
 *
 * Output is deterministic: two consecutive runs produce byte-identical files.
 * The pre-push hook (lefthook.yml) and CI re-run this and fail if anything
 * differs from what's committed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tagToNamespace, tagToClassName, tagSummary } from './tag-descriptions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SPEC_URL = process.env.ROXYAPI_OPENAPI_URL || 'https://roxyapi.com/api/v2/openapi.json';
const SPEC_FILE = path.join(ROOT, 'specs', 'openapi.json');
const OUT_DIR = path.join(ROOT, 'src', 'Generated');
const RESOURCES_DIR = path.join(OUT_DIR, 'Resources');
const REQUESTS_DIR = path.join(OUT_DIR, 'Requests');
const DTO_DIR = path.join(OUT_DIR, 'Dto');
const VERSION_FILE = path.join(ROOT, 'src', 'Version.php');
const ROXY_FILE = path.join(ROOT, 'src', 'Roxy.php');
const TESTS_GENERATED_DIR = path.join(ROOT, 'tests', 'Generated');

// ---------------------------------------------------------------------------
// 1. Fetch + patch + persist spec
// ---------------------------------------------------------------------------

console.log(`[generate] fetching ${SPEC_URL}`);
const response = await fetch(SPEC_URL, { headers: { 'Cache-Control': 'no-cache' } });
if (!response.ok) {
	console.error(`[generate] fetch failed: ${response.status} ${response.statusText}`);
	process.exit(1);
}
const spec = await response.json();

// Patch server URL to absolute production URL so the connector works without
// users supplying a baseUrl (matches the TS + Python SDKs).
if (spec.servers?.[0]?.url === '/api/v2') {
	spec.servers[0].url = 'https://roxyapi.com/api/v2';
}

await fs.mkdir(path.dirname(SPEC_FILE), { recursive: true });
await fs.writeFile(SPEC_FILE, JSON.stringify(spec, null, 2) + '\n', 'utf8');
console.log(`[generate] wrote ${path.relative(ROOT, SPEC_FILE)}`);

// ---------------------------------------------------------------------------
// 2. Collect tag list from operations
// ---------------------------------------------------------------------------

const specTags = new Set();
for (const path of Object.values(spec.paths || {})) {
	for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
		const op = path[method];
		if (!op) continue;
		for (const t of op.tags || []) specTags.add(t);
	}
}

// Index the tag objects (with descriptions) for summary extraction.
const tagObjects = Object.fromEntries((spec.tags || []).map((t) => [t.name, t]));

// ---------------------------------------------------------------------------
// 3. Walk operations, group by tag (sorted for determinism)
// ---------------------------------------------------------------------------

/**
 * @typedef {{operationId: string, method: string, path: string, tag: string, summary: string, description: string, parameters: Array<any>, requestBody: any, responses: any}} Operation
 */

/** @type {Operation[]} */
const operations = [];
for (const apiPath of Object.keys(spec.paths || {}).sort()) {
	const pathItem = spec.paths[apiPath];
	for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
		const op = pathItem[method];
		if (!op || !op.operationId) continue;
		operations.push({
			operationId: op.operationId,
			method: method.toUpperCase(),
			path: apiPath,
			tag: (op.tags || ['Other'])[0],
			summary: (op.summary || '').trim(),
			description: (op.description || '').trim(),
			parameters: op.parameters || [],
			requestBody: op.requestBody || null,
			responses: op.responses || {},
		});
	}
}
operations.sort((a, b) => a.operationId.localeCompare(b.operationId));

console.log(`[generate] found ${operations.length} operations across ${specTags.size} tags`);

/** @type {Record<string, Operation[]>} */
const opsByTag = {};
for (const op of operations) {
	(opsByTag[op.tag] ??= []).push(op);
}

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

function pathParams(apiPath) {
	return (apiPath.match(/\{([^}]+)\}/g) || []).map((m) => m.slice(1, -1));
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

	// Constructor parameter list — path params (required), then required body
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

function emitResource(tagName, ops) {
	const namespace = tagToNamespace(tagName);
	const className = tagToClassName(tagName);
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
			const desc = p.description ? ' ' + p.description.replace(/\s+/g, ' ').slice(0, 90) : '';
			docLines.push(`     * @param ${p.required ? p.type : p.type + '|null'} \$${p.name}${desc}`);
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
// 6. Emit BaseResource (shared) — calls connector, unwraps response, throws
// ---------------------------------------------------------------------------

const BASE_RESOURCE = `${HEADER}
namespace RoxyAPI\\Sdk\\Generated\\Resources;

use RoxyAPI\\Sdk\\RoxyApiException;
use Saloon\\Http\\BaseResource as SaloonBaseResource;
use Saloon\\Http\\Request;

/**
 * Shared base for every generated Resource class. Sends a Saloon Request,
 * decodes the JSON body, and throws RoxyApiException on 4xx/5xx so callers
 * never have to inspect HTTP status codes.
 */
abstract class BaseResource extends SaloonBaseResource
{
    /**
     * @return array<string, mixed>
     */
    protected function callRequest(Request $request): array
    {
        $response = $this->connector->send($request);

        if ($response->failed()) {
            throw RoxyApiException::fromResponse($response);
        }

        $decoded = $response->json();

        return is_array($decoded) ? $decoded : ['data' => $decoded];
    }
}
`;

// ---------------------------------------------------------------------------
// 7. Emit per-resource smoke test stubs (mocked Saloon::fake)
// ---------------------------------------------------------------------------

function emitResourceTest(tagName, ops) {
	const namespace = tagToNamespace(tagName);
	// Pick the first GET operation with no required body/path/query, else first op.
	const sample = ops.find((o) => o.method === 'GET' && pathParamsList(o).length === 0 && queryParams(o).filter((q) => q.required).length === 0)
		|| ops[0];
	const requestClass = pascalCase(sample.operationId) + 'Request';

	const args = [];
	for (const p of pathParamsList(sample)) args.push(`${safePhpVar(p.name)}: 'sample'`);
	const { fields: bodyArgs, hasBody } = bodyFields(sample);
	if (hasBody) {
		for (const f of bodyArgs.filter((f) => f.required)) {
			const v = safePhpVar(f.name);
			if (f.type === 'int') args.push(`${v}: 1`);
			else if (f.type === 'float') args.push(`${v}: 0.0`);
			else if (f.type === 'bool') args.push(`${v}: false`);
			else if (f.type === 'array') args.push(`${v}: []`);
			else args.push(`${v}: 'sample'`);
		}
	}
	for (const q of queryParams(sample).filter((q) => q.required)) {
		const v = safePhpVar(q.name);
		if (q.type === 'int') args.push(`${v}: 1`);
		else if (q.type === 'float') args.push(`${v}: 0.0`);
		else if (q.type === 'bool') args.push(`${v}: false`);
		else args.push(`${v}: 'sample'`);
	}
	const argsStr = args.join(', ');

	return `${HEADER}
use RoxyAPI\\Sdk\\Generated\\Requests\\${requestClass};
use Saloon\\Config;
use Saloon\\Http\\Faking\\MockClient;
use Saloon\\Http\\Faking\\MockResponse;

use function RoxyAPI\\Sdk\\createRoxy;

it('${namespace} resource sends ${sample.operationId} and parses JSON', function (): void {
    $mock = new MockClient([
        ${requestClass}::class => MockResponse::make(['ok' => true]),
    ]);
    Config::preventStrayRequests();

    $roxy = createRoxy('test-key');
    $roxy->withMockClient($mock);

    $result = $roxy->${namespace}->${sample.operationId}(${argsStr});

    expect($result)->toBe(['ok' => true]);
    $mock->assertSent(${requestClass}::class);
});
`;
}

// ---------------------------------------------------------------------------
// 8. Write everything
// ---------------------------------------------------------------------------

// Clean generated dirs first so deletions in the spec actually remove files.
await fs.rm(RESOURCES_DIR, { recursive: true, force: true });
await fs.rm(REQUESTS_DIR, { recursive: true, force: true });
await fs.rm(DTO_DIR, { recursive: true, force: true });
await fs.rm(TESTS_GENERATED_DIR, { recursive: true, force: true });
await fs.mkdir(RESOURCES_DIR, { recursive: true });
await fs.mkdir(REQUESTS_DIR, { recursive: true });
await fs.mkdir(DTO_DIR, { recursive: true });
await fs.mkdir(TESTS_GENERATED_DIR, { recursive: true });

// BaseResource (committed once, never changes per spec — but emit every time
// so a single regenerate run lands a working tree).
await fs.writeFile(path.join(RESOURCES_DIR, 'BaseResource.php'), BASE_RESOURCE, 'utf8');

// Per-tag Resource files
for (const tag of Object.keys(opsByTag).sort()) {
	await fs.writeFile(
		path.join(RESOURCES_DIR, tagToClassName(tag) + '.php'),
		emitResource(tag, opsByTag[tag]),
		'utf8',
	);
}

// Per-operation Request files
for (const op of operations) {
	const file = path.join(REQUESTS_DIR, pascalCase(op.operationId) + 'Request.php');
	await fs.writeFile(file, emitRequest(op), 'utf8');
}

// Placeholder so the empty Dto dir survives codegen and the package ships consistently.
await fs.writeFile(
	path.join(DTO_DIR, '.gitkeep'),
	'# Reserved for future typed response DTOs. Methods currently return array<string, mixed>.\n',
	'utf8',
);

// Per-tag smoke tests
for (const tag of Object.keys(opsByTag).sort()) {
	const file = path.join(TESTS_GENERATED_DIR, tagToClassName(tag) + 'Test.php');
	await fs.writeFile(file, emitResourceTest(tag, opsByTag[tag]), 'utf8');
}

// ---------------------------------------------------------------------------
// 9. Regenerate Version.php from package.json
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
// 10. Auto-generate src/Roxy.php (RESOURCES map + @property block + Connector
//     setup). Hand-edited only for cross-cutting Saloon plumbing, not per-tag.
// ---------------------------------------------------------------------------

const sortedTags = Object.keys(opsByTag).sort((a, b) =>
	tagToNamespace(a).localeCompare(tagToNamespace(b)),
);

const useLines = sortedTags
	.map((tag) => `use RoxyAPI\\Sdk\\Generated\\Resources\\${tagToClassName(tag)};`)
	.join('\n');

const propertyLines = sortedTags
	.map((tag) => ` * @property ${tagToClassName(tag)} \$${tagToNamespace(tag)}`)
	.join('\n');

const resourceMapLines = sortedTags
	.map(
		(tag) =>
			`        '${tagToNamespace(tag)}' => ${tagToClassName(tag)}::class,`,
	)
	.join('\n');

const roxyPhp = `<?php

declare(strict_types=1);

/**
 * AUTO-GENERATED by scripts/generate.mjs from the live OpenAPI spec.
 * Do not edit this file by hand. Regenerate with: node scripts/generate.mjs.
 *
 * The hand-written surface lives in createRoxy.php, Auth/ApiKeyAuthenticator.php,
 * and RoxyApiException.php. Everything per-tag in this file is derived from
 * specs/openapi.json + scripts/tag-descriptions.mjs (namespace aliases only).
 */

namespace RoxyAPI\\Sdk;

use RoxyAPI\\Sdk\\Auth\\ApiKeyAuthenticator;
${useLines}
use Saloon\\Contracts\\Authenticator;
use Saloon\\Http\\Connector;
use Saloon\\Traits\\Plugins\\AcceptsJson;

/**
 * Top-level RoxyAPI connector. One resource per OpenAPI tag, lazy-instantiated
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
        return 'https://roxyapi.com/api/v2';
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
            'Accept' => 'application/json',
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

console.log(`[generate] wrote ${operations.length} requests, ${Object.keys(opsByTag).length} resources, Roxy.php, Version ${versionFromPkg}`);
console.log('[generate] done');
