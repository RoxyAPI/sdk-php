/**
 * The one-line summary of a spec tag, for the resource docblocks and the domain tables.
 * Everything else about a tag (its namespace, its operations) is derived from the paths
 * in namespace.mjs; this file only shortens `tag.description`.
 */

/** The first sentence of the tag description, capped at 120 characters. */
export function tagSummary(tag) {
	const desc = (tag?.description || '').trim();
	if (!desc) return tag?.name || '';
	const firstSentence = desc.split(/\.\s+/, 1)[0].trim().replace(/\s+/g, ' ');
	return firstSentence.length > 120 ? firstSentence.slice(0, 117).trim() + '...' : firstSentence;
}
