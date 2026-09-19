/**
 * The SDK namespace of an operation is the first segment of its URL path in camelCase:
 * `/vedic-astrology/birth-chart` -> `vedicAstrology`, `/crystals/{id}` -> `crystals`.
 * The generator and the docs sync both derive it here, and the spec-driven test restates
 * the same rule in PHP, so a new package in the spec needs no configuration anywhere.
 */
export function pathNamespace(path) {
	const segment = path.split('/').filter(Boolean)[0];
	if (!segment) throw new Error(`SDK: cannot derive a namespace from path "${path}"`);
	return segment.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** The Saloon resource class of a namespace: `vedicAstrology` -> `VedicAstrologyResource`. */
export function resourceClassName(namespace) {
	return namespace[0].toUpperCase() + namespace.slice(1) + 'Resource';
}
