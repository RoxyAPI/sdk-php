#!/usr/bin/env node
/**
 * Regenerate the domain tables in README.md and AGENTS.md from
 * specs/openapi.json. Mirrors the TypeScript SDK's docs:sync.
 *
 * Fails loudly if:
 *   - A new OpenAPI tag lands without a matching entry in scripts/tag-descriptions.mjs
 *   - An entry in scripts/tag-descriptions.mjs refers to a tag no longer in the spec
 *   - README.md or AGENTS.md is missing the <!-- BEGIN:DOMAINS --> markers
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { NAMESPACE_ALIASES, tagToNamespace, tagSummary } from './tag-descriptions.mjs';

const SPEC_PATH = 'specs/openapi.json';
const README_PATH = 'README.md';
const AGENTS_PATH = 'AGENTS.md';
const BEGIN = '<!-- BEGIN:DOMAINS -->';
const END = '<!-- END:DOMAINS -->';

function fail(msg) {
	console.error(`\nx sync-docs: ${msg}\n`);
	process.exit(1);
}

const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf-8'));
const specTags = (spec.tags ?? []).map((t) => t.name);
if (specTags.length === 0) fail(`${SPEC_PATH} has no .tags[] - spec malformed?`);

const tagObjects = Object.fromEntries((spec.tags ?? []).map((t) => [t.name, t]));

// Alias entries that reference tags no longer in the spec are stale config.
const stale = Object.keys(NAMESPACE_ALIASES).filter((t) => !specTags.includes(t));
if (stale.length > 0) {
	fail(
		`Stale namespace alias(es) in scripts/tag-descriptions.mjs (tag not in spec): ${stale.map((t) => `"${t}"`).join(', ')}. ` +
			`Remove them.`,
	);
}

const counts = new Map();
for (const methods of Object.values(spec.paths ?? {})) {
	for (const op of Object.values(methods)) {
		const tag = op.tags?.[0];
		if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1);
	}
}

function renderTable() {
	const header = '| Property | Endpoints | What it covers |\n|---|---|---|';
	const rows = specTags.map((tag) => {
		const ns = tagToNamespace(tag);
		const count = counts.get(tag) ?? 0;
		const summary = tagSummary(tagObjects[tag] ?? { name: tag });
		return `| \`$roxy->${ns}\` | ${count} | ${summary} |`;
	});
	return [BEGIN, header, ...rows, END].join('\n');
}

function syncFile(path) {
	const src = readFileSync(path, 'utf-8');
	const beginIdx = src.indexOf(BEGIN);
	const endIdx = src.indexOf(END);
	if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
		fail(`${path} is missing ${BEGIN} / ${END} markers`);
	}
	const before = src.slice(0, beginIdx);
	const after = src.slice(endIdx + END.length);
	const next = `${before}${renderTable()}${after}`;
	if (next === src) return false;
	writeFileSync(path, next);
	return true;
}

const readmeChanged = syncFile(README_PATH);
const agentsChanged = syncFile(AGENTS_PATH);

const total = [...counts.values()].reduce((a, b) => a + b, 0);
console.log(
	`OK sync-docs: ${specTags.length} tags, ${total} endpoints. ` +
		`README ${readmeChanged ? 'updated' : 'unchanged'}, ` +
		`AGENTS ${agentsChanged ? 'updated' : 'unchanged'}.`,
);
