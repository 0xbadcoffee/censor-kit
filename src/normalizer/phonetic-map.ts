/**
 * Ordered list of [pattern, replacement] regex pairs applied to the
 * already-lowercased normalised string to collapse common phonetic variants.
 *
 * Rules are applied in order — put more-specific rules before general ones.
 * All patterns are treated as global regexes on the normalised string.
 */
export const phoneticRules: [RegExp, string][] = [
	// ph → f  (phuck → fuck, phuk → fuk then → fuck via ck rule)
	[/ph/g, "f"],

	// soft c → s before e, i, y (cex → sex, etc.)
	[/c(?=[eiy])/g, "s"],

	// ck / k endings  (fuk → fuck is tricky because we need to ADD a c)
	[/ck/g, "k"],

	// qu → kw
	[/qu/g, "kw"],

	// x → ks  (sex → seks — avoid over-matching so skip for now)

	// Vowel normalisation for "biatch" → "bitch":
	// ia → i when followed by tch  (biatch → bitch)
	[/ia(?=tch)/g, "i"],

	// tch → ch  (normalise "tch" digraph)
	[/tch/g, "ch"],

	// Common suffix: -er / -a / -uh at end (loosely same sound)
	// Skip — too aggressive

	// Double consonants → single (already handled by collapseRepeats in the
	// Trie, but phonetic mode also collapses in the normalised string)
	// Covered by collapseRepeats option.
];
