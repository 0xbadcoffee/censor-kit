/**
 * Common English contraction suffixes that appear after an apostrophe.
 * Used so that with ignoreIntrawordPunctuation we do not strip the apostrophe
 * in e.g. he'll, it's, don't (avoiding "he'll" -> "hell" false positive).
 */
export const CONTRACTION_SUFFIXES = new Set<string>([
	"ll",
	"s",
	"t",
	"d",
	"re",
	"ve",
	"m",
]);

const APOSTROPHE_LIKE = new Set(["'", "\u2019", "`"]);

export function isApostropheLike(char: string): boolean {
	return char.length === 1 && APOSTROPHE_LIKE.has(char);
}

export function isContractionSuffix(chars: string[], start: number): boolean {
	let run = "";
	for (let j = start; j < chars.length; j++) {
		const c = chars[j];
		if (!c || !/\p{L}/u.test(c)) break;
		run += c.toLowerCase();
	}
	return run.length > 0 && CONTRACTION_SUFFIXES.has(run);
}
