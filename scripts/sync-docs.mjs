#!/usr/bin/env node
/**
 * Regenerate the spec-derived regions of README.md and AGENTS.md from specs/openapi.json:
 *   - `<!-- BEGIN:DOMAINS -->`: one row per spec tag, in spec tag order, plus the endpoint total.
 *   - `<!-- BEGIN:LANGS -->`: the `lang` codes, the default, and which namespaces take `lang`.
 *
 * scripts/generate.mjs runs this after codegen, so the regions are asserted in the same
 * drift diff as the generated code. Run alone with: node scripts/sync-docs.mjs
 *
 * The namespace of a tag is derived from the URL paths of its operations exactly as the
 * generator derives it (see namespace.mjs). Fails loudly if:
 *   - A tag has no operations, or its operations sit under more than one path segment.
 *   - README.md or AGENTS.md is missing a BEGIN / END marker pair.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathNamespace } from './namespace.mjs';
import { tagSummary } from './tag-descriptions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_PATH = path.join(ROOT, 'specs', 'openapi.json');
const README_PATH = path.join(ROOT, 'README.md');
const AGENTS_PATH = path.join(ROOT, 'AGENTS.md');
const DOMAINS_BEGIN = '<!-- BEGIN:DOMAINS -->';
const DOMAINS_END = '<!-- END:DOMAINS -->';
const LANGS_BEGIN = '<!-- BEGIN:LANGS -->';
const LANGS_END = '<!-- END:LANGS -->';

function fail(msg) {
	console.error(`\nx sync-docs: ${msg}\n`);
	process.exit(1);
}

const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf-8'));
const specTagObjects = spec.tags ?? [];
const specTags = specTagObjects.map((t) => t.name);
if (specTags.length === 0) fail(`${path.relative(ROOT, SPEC_PATH)} has no .tags[], spec is malformed?`);
const tagByName = new Map(specTagObjects.map((t) => [t.name, t]));

/** Operations bucketed by their first tag, walked once and shared by every renderer. */
const opsByTag = new Map();
for (const [apiPath, methods] of Object.entries(spec.paths ?? {})) {
	for (const op of Object.values(methods)) {
		const tag = op.tags?.[0];
		if (!tag) continue;
		if (!opsByTag.has(tag)) opsByTag.set(tag, []);
		opsByTag.get(tag).push({ path: apiPath, op });
	}
}

/** The namespace of each tag, derived from its operations the way the generator derives it. */
const namespaceByTag = new Map();
for (const tag of specTags) {
	const namespaces = new Set((opsByTag.get(tag) ?? []).map(({ path: apiPath }) => pathNamespace(apiPath)));
	if (namespaces.size !== 1) {
		fail(`Tag "${tag}" maps to ${namespaces.size} path segments (${[...namespaces].join(', ')}); expected exactly one`);
	}
	namespaceByTag.set(tag, [...namespaces][0]);
}
const totalEndpoints = [...opsByTag.values()].reduce((sum, ops) => sum + ops.length, 0);

function renderDomains() {
	const rows = specTags.map((tag) => `| \`$roxy->${namespaceByTag.get(tag)}\` | ${tagSummary(tagByName.get(tag))} |`);
	const total = 'The table above covers every endpoint and auto-syncs from the OpenAPI spec at release time.';
	return [DOMAINS_BEGIN, '| Property | What it covers |', '|---|---|', ...rows, '', total, DOMAINS_END].join('\n');
}

/**
 * The `lang` facts the spec carries: the code list, the default, and the supported /
 * English-only split (which tags declare a `lang` query param at all). Display names and
 * per-domain script coverage are not in the spec and stay hand-written outside the markers.
 */
function langFacts() {
	const supportsLang = new Set();
	let codes = [];
	let fallback = null;
	for (const [tag, ops] of opsByTag) {
		for (const { op } of ops) {
			const lang = (op.parameters ?? []).find((p) => p.name === 'lang' && p.in === 'query');
			if (!lang) continue;
			supportsLang.add(tag);
			if (codes.length === 0 && lang.schema?.enum?.length) codes = lang.schema.enum.map(String);
			if (fallback === null && lang.schema?.default !== undefined) fallback = String(lang.schema.default);
		}
	}
	const list = (tags) => tags.map((t) => `\`${namespaceByTag.get(t)}\``).join(', ');
	return {
		codes: codes.map((c) => `\`${c}\``).join(', '),
		count: codes.length,
		fallback: fallback === null ? '' : ` Defaults to \`${fallback}\`.`,
		supported: list(specTags.filter((t) => supportsLang.has(t))),
		englishOnly: list(specTags.filter((t) => !supportsLang.has(t))),
	};
}

/** README gets the fuller sentence for a human reader; AGENTS keeps the terser register. */
function renderLangs(terse) {
	const { codes, count, fallback, supported, englishOnly } = langFacts();
	const note = terse
		? `${count} languages: ${codes}.${fallback} Supported: ${supported}. English-only: ${englishOnly}.`
		: `Interpretations and editorial text are available in ${count} languages: ${codes}. Pass \`lang:\` as a named argument on any supported method.${fallback} Supported: ${supported}. English-only: ${englishOnly}. Languages without translations yet fall back to English.`;
	return [LANGS_BEGIN, note, LANGS_END].join('\n');
}

function replaceRegion(src, file, begin, end, block) {
	const beginIdx = src.indexOf(begin);
	const endIdx = src.indexOf(end);
	if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) fail(`${file} is missing ${begin} / ${end} markers`);
	return src.slice(0, beginIdx) + block + src.slice(endIdx + end.length);
}

function syncFile(file, terseLangs) {
	const src = readFileSync(file, 'utf-8');
	const name = path.relative(ROOT, file);
	let next = replaceRegion(src, name, DOMAINS_BEGIN, DOMAINS_END, renderDomains());
	next = replaceRegion(next, name, LANGS_BEGIN, LANGS_END, renderLangs(terseLangs));
	if (next === src) return false;
	writeFileSync(file, next);
	return true;
}

const readmeChanged = syncFile(README_PATH, false);
const agentsChanged = syncFile(AGENTS_PATH, true);

console.log(
	`OK sync-docs: ${specTags.length} tags, ${totalEndpoints} endpoints. ` +
		`README ${readmeChanged ? 'updated' : 'unchanged'}, AGENTS ${agentsChanged ? 'updated' : 'unchanged'}.`,
);
