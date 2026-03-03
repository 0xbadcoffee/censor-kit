import { describe, expect, test } from "vitest";
import { WordFilter } from "../src/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// ORIGINAL TESTS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

test("Basic matching", () => {
	const filter = new WordFilter();
	filter.addWord("fuck");
	filter.addWord("ass");

	let r = filter.clean("fuck you");
	expect(r.cleaned).toBe("**** you");
	expect(r.matches.length).toBe(1);

	r = filter.clean("kick ass");
	expect(r.cleaned).toBe("kick ***");
});

test("Boundary check avoids false positives (The Scunthorpe Problem)", () => {
	const filter = new WordFilter();
	filter.addWord("ass");

	const r = filter.clean("This is an assessment of the class");
	expect(r.cleaned).toBe("This is an assessment of the class");
	expect(r.matches.length).toBe(0);
});

test("Boundary does not prevent matching on punctuation", () => {
	const filter = new WordFilter();
	filter.addWord("ass");

	const r = filter.clean("kick ass!");
	expect(r.cleaned).toBe("kick ***!");
	expect(r.matches.length).toBe(1);

	const r2 = filter.clean("ass, hole");
	expect(r2.cleaned).toBe("***, hole");
});

test("Unicode Normalization", () => {
	const filter = new WordFilter();
	filter.addWord("fuck");

	const r = filter.clean("ｆｕｃｋ you");
	expect(r.cleaned).toBe("**** you");
});

test("Leetspeak normalization including ! for i", () => {
	const filter = new WordFilter();
	filter.addWord("dick");

	expect(filter.clean("d!ck").cleaned).toBe("****");
	expect(filter.clean("d1ck").cleaned).toBe("****");
});

test("Repeated char collapse in Matcher without altering text map", () => {
	const filter = new WordFilter({ collapseRepeats: true });
	filter.addWord("fuck");
	filter.addWord("ass");

	const r = filter.clean("fuuuuck");
	expect(r.cleaned).toBe("*******");
	expect(r.matches[0].word).toBe("fuck");

	const r2 = filter.clean("assss");
	expect(r2.cleaned).toBe("*****");
});

test("Exact matches without leet/normalize", () => {
	const filter = new WordFilter({
		leet: false,
		normalize: false,
		collapseRepeats: false,
	});
	filter.addWord("d!ck");

	expect(filter.clean("d!ck").cleaned).toBe("****");
});

test("Overlap resolution keeps the longest match", () => {
	const filter = new WordFilter();
	filter.addWord("ass");
	filter.addWord("asshole");

	const r = filter.clean("you asshole");
	expect(r.cleaned).toBe("you *******");
	expect(r.matches.length).toBe(1);
	expect(r.matches[0].word).toBe("asshole");
});

// ─────────────────────────────────────────────────────────────────────────────
// MATCH METADATA  (index, end, original)
// ─────────────────────────────────────────────────────────────────────────────

describe("Match metadata", () => {
	test("match.word is the canonical dictionary word", () => {
		const filter = new WordFilter();
		filter.addWord("ass");

		const r = filter.clean("kick ass");
		expect(r.matches[0].word).toBe("ass");
	});

	test("match.index is the start position in the original string", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		// "oh fuck" — 'f' is at index 3
		const r = filter.clean("oh fuck");
		expect(r.matches[0].index).toBe(3);
	});

	test("match.end is the exclusive end position in the original string", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		const r = filter.clean("oh fuck");
		expect(r.matches[0].end).toBe(7); // "oh fuck".length
	});

	test("match.original contains the exact un-normalised substring", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		// Fullwidth chars — original preserves them
		const r = filter.clean("ｆｕｃｋ");
		expect(r.matches[0].original).toBe("ｆｕｃｋ");
	});

	test("match.original preserves leet chars in the original", () => {
		const filter = new WordFilter();
		filter.addWord("shit");

		const r = filter.clean("5h1t");
		expect(r.matches[0].original).toBe("5h1t");
	});

	test("multiple matches report correct indices", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		const r = filter.clean("fuck and fuck");
		expect(r.matches.length).toBe(2);
		expect(r.matches[0].index).toBe(0);
		expect(r.matches[1].index).toBe(9);
	});

	test("match.severity reflects dictionary severity", () => {
		const filter = new WordFilter();
		filter.addWord("fuck", 3);

		const r = filter.clean("fuck");
		expect(r.matches[0].severity).toBe(3);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// MASKING OPTIONS  (maskStyle, maskChar, replacement, fixedMask)
// ─────────────────────────────────────────────────────────────────────────────

describe("Masking options", () => {
	test("default maskStyle 'char' replaces each char with maskChar", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.clean("fuck").cleaned).toBe("****");
	});

	test("custom maskChar '#'", () => {
		const filter = new WordFilter({ maskChar: "#" });
		filter.addWord("fuck");

		expect(filter.clean("fuck").cleaned).toBe("####");
	});

	test("custom maskChar 'X'", () => {
		const filter = new WordFilter({ maskChar: "X" });
		filter.addWord("shit");

		expect(filter.clean("shit").cleaned).toBe("XXXX");
	});

	test("maskStyle 'replace' substitutes entire match with replacement string", () => {
		const filter = new WordFilter({
			maskStyle: "replace",
			replacement: "[REDACTED]",
		});
		filter.addWord("fuck");

		expect(filter.clean("what the fuck").cleaned).toBe("what the [REDACTED]");
	});

	test("maskStyle 'replace' works with multiple matches", () => {
		const filter = new WordFilter({
			maskStyle: "replace",
			replacement: "[BLEEP]",
		});
		filter.addWord("fuck");
		filter.addWord("shit");

		expect(filter.clean("fuck and shit").cleaned).toBe("[BLEEP] and [BLEEP]");
	});

	test("maskStyle 'fixed' replaces entire match with fixedMask regardless of length", () => {
		const filter = new WordFilter({ maskStyle: "fixed", fixedMask: "***" });
		filter.addWord("fuck"); // 4 chars
		filter.addWord("shit"); // 4 chars

		expect(filter.clean("fuck and shit").cleaned).toBe("*** and ***");
	});

	test("maskStyle 'fixed' custom fixedMask value", () => {
		const filter = new WordFilter({ maskStyle: "fixed", fixedMask: "[?]" });
		filter.addWord("bastard"); // 7 chars

		expect(filter.clean("you bastard").cleaned).toBe("you [?]");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// ALLOWLIST / WHITELIST  — allow()
// ─────────────────────────────────────────────────────────────────────────────

describe("Allowlist (allow())", () => {
	test("allowed word containing a banned word is not censored", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.allow("bass");

		expect(filter.clean("bass guitar").cleaned).toBe("bass guitar");
		expect(filter.clean("bass guitar").matches.length).toBe(0);
	});

	test("banned word still censored when not inside an allowed word", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.allow("bass");

		expect(filter.clean("kick ass").cleaned).toBe("kick ***");
	});

	test("hello is allowed — hell inside it is not censored", () => {
		const filter = new WordFilter();
		filter.addWord("hell");
		filter.allow("hello");

		expect(filter.clean("hello world").cleaned).toBe("hello world");
		expect(filter.clean("hello world").matches.length).toBe(0);
	});

	test("hell is still censored when standalone", () => {
		const filter = new WordFilter();
		filter.addWord("hell");
		filter.allow("hello");

		expect(filter.clean("what the hell").cleaned).toBe("what the ****");
	});

	test("allowlist word does not appear in getWords()", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.allow("bass");

		expect(filter.getWords()).not.toContain("bass");
		expect(filter.getWords()).toContain("ass");
	});

	test("multiple allowlist entries", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.allow("bass");
		filter.allow("class");
		filter.allow("mass");

		expect(filter.clean("bass, class, mass").cleaned).toBe("bass, class, mass");
		expect(filter.clean("kick ass").cleaned).toBe("kick ***");
	});

	test("Scunthorpe — cunt is banned, Scunthorpe is allowed", () => {
		const filter = new WordFilter();
		filter.addWord("cunt");
		filter.allow("scunthorpe");

		expect(filter.clean("I visited Scunthorpe").cleaned).toBe(
			"I visited Scunthorpe",
		);
		expect(filter.clean("you cunt").cleaned).toBe("you ****");
	});
});

describe("Allowlist (allowWords option and method)", () => {
	test("constructor allowWords: list of allowed words not censored", () => {
		const filter = new WordFilter({
			customWords: ["ass"],
			allowWords: ["bass", "class", "mass"],
		});

		expect(filter.clean("bass, class, mass").cleaned).toBe("bass, class, mass");
		expect(filter.clean("kick ass").cleaned).toBe("kick ***");
	});

	test("constructor allowWords: Scunthorpe-style", () => {
		const filter = new WordFilter({
			customWords: ["cunt"],
			allowWords: ["scunthorpe"],
		});

		expect(filter.clean("I visited Scunthorpe").cleaned).toBe(
			"I visited Scunthorpe",
		);
		expect(filter.clean("you cunt").cleaned).toBe("you ****");
	});

	test("instance allowWords(words): batch add allowed words", () => {
		const filter = new WordFilter({ customWords: ["ass"] });
		filter.allowWords(["bass", "class", "mass"]);

		expect(filter.clean("bass, class, mass").cleaned).toBe("bass, class, mass");
		expect(filter.clean("kick ass").cleaned).toBe("kick ***");
	});

	test("allowWords entries do not appear in getWords()", () => {
		const filter = new WordFilter({
			customWords: ["ass"],
			allowWords: ["bass", "class"],
		});

		expect(filter.getWords()).not.toContain("bass");
		expect(filter.getWords()).not.toContain("class");
		expect(filter.getWords()).toContain("ass");
	});

	test("allow() and allowWords can be combined", () => {
		const filter = new WordFilter({ customWords: ["ass"] });
		filter.allowWords(["bass", "class"]);
		filter.allow("mass");

		expect(filter.clean("bass, class, mass").cleaned).toBe("bass, class, mass");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// PHONETIC NORMALISATION  — phonetic: true
// ─────────────────────────────────────────────────────────────────────────────

describe("Phonetic normalisation (phonetic: true)", () => {
	test("ph → f: 'phuck' matches 'fuck'", () => {
		// With phonetic: true, the normaliser applies ph→f before matching.
		// Both the input and the dictionary word are normalised the same way.
		// Dictionary word "fuck" → phonetic → "fuk" (ck→k rule).
		// Input "phuck"       → phonetic → ph→f → "fuck" → ck→k → "fuk". Match!
		const filter = new WordFilter({ phonetic: true });
		filter.addWord("fuck");

		expect(filter.clean("phuck you").matches.length).toBe(1);
		expect(filter.clean("phuck you").cleaned).toBe("***** you");
	});

	test("ph → f: 'phuk' also matches 'fuck'", () => {
		const filter = new WordFilter({ phonetic: true });
		filter.addWord("fuck");

		expect(filter.clean("phuk").matches.length).toBe(1);
	});

	test("fuk (missing c) matches fuck via ck→k phonetic collapse", () => {
		const filter = new WordFilter({ phonetic: true });
		filter.addWord("fuck"); // stored as "fuk" after phonetic normalisation

		expect(filter.clean("fuk you").matches.length).toBe(1);
		expect(filter.clean("fuk you").cleaned).toBe("*** you");
	});

	test("biatch matches bitch via ia→i phonetic rule", () => {
		const filter = new WordFilter({ phonetic: true });
		filter.addWord("bitch");

		expect(filter.clean("biatch").matches.length).toBe(1);
	});

	test("phonetic + leet combined: phü(k matches fuck", () => {
		const filter = new WordFilter({ phonetic: true });
		filter.addWord("fuck");

		// ph→f, ü (diacritic stripped)→u, (→c, k stays → normalises to "fuck" → "fuk"
		expect(filter.clean("phü(k").matches.length).toBe(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// HOMOGLYPH NORMALISATION  — homoglyphs: true
// ─────────────────────────────────────────────────────────────────────────────

describe("Homoglyph normalisation (homoglyphs: true)", () => {
	test("Cyrillic 'с'(c) 'е'(e) 'х'(x) → 'sex'", () => {
		const filter = new WordFilter({ homoglyphs: true });
		filter.addWord("sex");

		// Cyrillic: с=c, е=e, х=x
		expect(filter.clean("сех").matches.length).toBe(1);
	});

	test("Cyrillic с(c) о(o) с(c) + ASCII k → 'cock'", () => {
		const filter = new WordFilter({ homoglyphs: true });
		filter.addWord("cock");

		expect(filter.clean("сосk").matches.length).toBe(1);
	});

	test("Greek α → 'a': αss matches ass", () => {
		const filter = new WordFilter({ homoglyphs: true });
		filter.addWord("ass");

		expect(filter.clean("αss").matches.length).toBe(1);
	});

	test("homoglyphs: false — Cyrillic does not match", () => {
		const filter = new WordFilter({ homoglyphs: false });
		filter.addWord("sex");

		expect(filter.clean("сех").matches.length).toBe(0);
	});

	test("Cyrillic mixed with ASCII letters", () => {
		const filter = new WordFilter({ homoglyphs: true });
		filter.addWord("shit");

		// s(ASCII) h(ASCII) i(ASCII) t replaced by homoglyphs for some chars
		// т is Cyrillic T (not in our map as 't' — skip that one)
		// Use Cyrillic 'і' (BYELORUSSIAN I → i)
		expect(filter.clean("shіt").matches.length).toBe(1); // і = U+0456
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// IGNORE SPACES  — ignoreSpaces: true
// ─────────────────────────────────────────────────────────────────────────────

describe("ignoreSpaces option", () => {
	test("spaces between characters are ignored for matching", () => {
		const filter = new WordFilter({ ignoreSpaces: true });
		filter.addWord("fuck");

		// Each letter is masked; spaces are preserved in output
		expect(filter.clean("f u c k").cleaned).toBe("* * * *");
		expect(filter.clean("f u c k").matches.length).toBe(1);
	});

	test("s h i t with spaces matches shit", () => {
		const filter = new WordFilter({ ignoreSpaces: true });
		filter.addWord("shit");

		expect(filter.clean("s h i t").cleaned).toBe("* * * *");
	});

	test("zero-width spaces (U+200B) are treated as ignorable spaces", () => {
		const filter = new WordFilter({ ignoreSpaces: true });
		filter.addWord("fuck");

		const input = "f\u200Bu\u200Bc\u200Bk";
		expect(filter.clean(input).matches.length).toBe(1);
	});

	test("without ignoreSpaces, spaced characters do NOT match", () => {
		const filter = new WordFilter({ ignoreSpaces: false });
		filter.addWord("fuck");

		expect(filter.clean("f u c k").matches.length).toBe(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// IGNORE INTRA-WORD PUNCTUATION  — ignoreIntrawordPunctuation: true
// ─────────────────────────────────────────────────────────────────────────────

describe("ignoreIntrawordPunctuation option", () => {
	test("dots between characters: f.u.c.k matches fuck", () => {
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("fuck");

		// Letters are masked; separator chars preserved in output
		expect(filter.clean("f.u.c.k").cleaned).toBe("*.*.*.*");
	});

	test("hyphens between characters: f-u-c-k matches fuck", () => {
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("fuck");

		expect(filter.clean("f-u-c-k").cleaned).toBe("*-*-*-*");
	});

	test("a-s-s matches ass", () => {
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("ass");

		expect(filter.clean("a-s-s").cleaned).toBe("*-*-*");
	});

	test("underscores: s_h_i_t matches shit", () => {
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("shit");

		expect(filter.clean("s_h_i_t").cleaned).toBe("*_*_*_*");
	});

	test("mixed punctuation: f.u-c_k matches fuck", () => {
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("fuck");

		expect(filter.clean("f.u-c_k").cleaned).toBe("*.*-*_*");
	});

	test("soft hyphen (U+00AD) between characters is stripped", () => {
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("fuck");

		const input = "f\u00ADu\u00ADc\u00ADk";
		expect(filter.clean(input).matches.length).toBe(1);
	});

	test("user self-censor f**k: asterisks are punctuation and stripped, 'fk' ≠ 'fuck'", () => {
		// After stripping ** we get "fk", which is only 2 chars — doesn't match "fuck".
		// The filter correctly catches this as NOT a match (the user successfully
		// self-censored in a way that defeats the filter).
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("fuck");

		expect(filter.clean("f**k").cleaned).toBe("f**k");
		expect(filter.clean("f**k").matches.length).toBe(0);
	});

	test("leet chars that are punctuation (@, $, !, +, |) are NOT stripped", () => {
		// They are handled by the leet map, not stripped as punctuation
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("ass");
		filter.addWord("shit");

		expect(filter.clean("@ss").cleaned).toBe("***");
		expect(filter.clean("sh!t").cleaned).toBe("****");
	});

	test("fu'ck (apostrophe obfuscation) censored when ignoreIntrawordPunctuation: true", () => {
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("fuck");
		expect(filter.clean("fu'ck").matches.length).toBe(1);
		expect(filter.clean("fu'ck").cleaned).toBe("**'**");
	});

	test("he'll not censored with ignoreIntrawordPunctuation (contraction rule keeps apostrophe)", () => {
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("hell");
		expect(filter.clean("he'll be back").cleaned).toBe("he'll be back");
		expect(filter.clean("he'll").cleaned).toBe("he'll");
		expect(filter.clean("what the hell").cleaned).toBe("what the ****");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// IGNORE INTRA-WORD NOISE  — ignoreIntrawordNoise: true
// ─────────────────────────────────────────────────────────────────────────────

describe("ignoreIntrawordNoise option", () => {
	test("non-leet digit noise: fu2ck matches fuck", () => {
		const filter = new WordFilter({ ignoreIntrawordNoise: true });
		filter.addWord("fuck");

		expect(filter.clean("fu2ck").matches.length).toBe(1);
	});

	test("emoji inserted mid-word: fu😂ck matches fuck", () => {
		const filter = new WordFilter({ ignoreIntrawordNoise: true });
		filter.addWord("fuck");

		expect(filter.clean("fu😂ck").matches.length).toBe(1);
	});

	test("symbol noise: sh#it and s^hit match shit with ignoreIntrawordPunctuation", () => {
		// # and ^ are punctuation/symbol — use ignoreIntrawordPunctuation for these
		const filter = new WordFilter({ ignoreIntrawordPunctuation: true });
		filter.addWord("shit");

		expect(filter.clean("sh#it").matches.length).toBe(1);
		expect(filter.clean("s^hit").matches.length).toBe(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// LEETSPEAK SUBSTITUTIONS
// ─────────────────────────────────────────────────────────────────────────────

describe("Leetspeak substitutions", () => {
	test("classic leet: 5=s, 1=i, 3=e, 0=o", () => {
		const filter = new WordFilter();
		filter.addWord("shit");
		filter.addWord("hell");

		expect(filter.clean("5h1t").cleaned).toBe("****");
		expect(filter.clean("h3ll").cleaned).toBe("****");
		expect(filter.clean("sh!t").cleaned).toBe("****");
	});

	test("@ → a", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.addWord("bastard");

		expect(filter.clean("@ss").cleaned).toBe("***");
		expect(filter.clean("b@st@rd").cleaned).toBe("*******");
	});

	test("$ → s", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.addWord("shit");

		expect(filter.clean("a$$").cleaned).toBe("***");
		expect(filter.clean("$hit").cleaned).toBe("****");
	});

	test("4 → a", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.addWord("bastard");

		expect(filter.clean("4ss").cleaned).toBe("***");
		expect(filter.clean("b4stard").cleaned).toBe("*******");
	});

	test("3 → e", () => {
		const filter = new WordFilter();
		filter.addWord("sex");

		expect(filter.clean("s3x").cleaned).toBe("***");
	});

	test("0 → o", () => {
		const filter = new WordFilter();
		filter.addWord("cock");

		expect(filter.clean("c0ck").cleaned).toBe("****");
	});

	test("7 → t", () => {
		const filter = new WordFilter();
		filter.addWord("tit");

		expect(filter.clean("7it").cleaned).toBe("***");
		expect(filter.clean("ti7").cleaned).toBe("***");
		expect(filter.clean("7i7").cleaned).toBe("***");
	});

	test("| → i", () => {
		const filter = new WordFilter();
		filter.addWord("shit");

		expect(filter.clean("sh|t").cleaned).toBe("****");
	});

	test("+ → t", () => {
		const filter = new WordFilter();
		filter.addWord("shit");

		expect(filter.clean("shi+").cleaned).toBe("****");
	});

	test("( → c", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.clean("fu(k").cleaned).toBe("****");
	});

	test("combined leet substitutions in bitch variants", () => {
		const filter = new WordFilter();
		filter.addWord("bitch");

		expect(filter.clean("b!tch").cleaned).toBe("*****");
		expect(filter.clean("b1tch").cleaned).toBe("*****");
		expect(filter.clean("bi7ch").cleaned).toBe("*****");
		expect(filter.clean("b!7ch").cleaned).toBe("*****");
	});

	test("f00k does NOT match fuck — '00' normalises to 'oo', not 'uc'", () => {
		// 0→o in leet map; "f00k" → "fook" which is not "fuck".
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.clean("f00k").matches.length).toBe(0);
		expect(filter.clean("f00k").cleaned).toBe("f00k");
	});

	test("fu33k does NOT match fuck — '3' normalises to 'e', giving 'fueeek'", () => {
		// The leet map maps 3→e; "fu33k" → "fueek" ≠ "fuck".
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("fuck");

		expect(filter.clean("fu33k").matches.length).toBe(0);
	});

	test("@$$ matches ass — chained leet: @→a, $→s, $→s", () => {
		const filter = new WordFilter();
		filter.addWord("ass");

		expect(filter.clean("@$$").cleaned).toBe("***");
	});

	test("$h1t matches shit — chained leet", () => {
		const filter = new WordFilter();
		filter.addWord("shit");

		expect(filter.clean("$h1t").cleaned).toBe("****");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// REPEATED CHARACTER EVASION
// ─────────────────────────────────────────────────────────────────────────────

describe("Repeated character evasion (collapseRepeats: true)", () => {
	test("doubled letters", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("shit");
		filter.addWord("fuck");
		filter.addWord("ass");

		expect(filter.clean("sshit").cleaned).toBe("*****");
		expect(filter.clean("fuuck").cleaned).toBe("*****");
		expect(filter.clean("asss").cleaned).toBe("****");
	});

	test("triple and quadruple repeated letters", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("fuck");

		expect(filter.clean("fuuuck").cleaned).toBe("******");
		expect(filter.clean("fuuuuuck").cleaned).toBe("********");
		expect(filter.clean("fffuck").cleaned).toBe("******");
	});

	test("repeated letters combined with leet", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("shit");

		expect(filter.clean("5h11t").cleaned).toBe("*****");
		expect(filter.clean("shiiit").cleaned).toBe("******");
	});

	test("all characters repeated: aassss matches ass", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("ass");

		expect(filter.clean("aassss").cleaned).toBe("******");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// UNICODE / FULLWIDTH NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

describe("Unicode normalisation", () => {
	test("fullwidth Latin: ｆｕｃｋ matches fuck", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");
		filter.addWord("shit");
		filter.addWord("ass");

		expect(filter.clean("ｆｕｃｋ").cleaned).toBe("****");
		expect(filter.clean("ｓｈｉｔ").cleaned).toBe("****");
		expect(filter.clean("ａｓｓ").cleaned).toBe("***");
	});

	test("combining diacritics stripped: fück, fûck, füçk all match fuck", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.clean("fück").matches.length).toBe(1);
		expect(filter.clean("fûck").matches.length).toBe(1);
		expect(filter.clean("füçk").matches.length).toBe(1);
	});

	test("accented letters: àss, äss, âss all match ass", () => {
		const filter = new WordFilter();
		filter.addWord("ass");

		expect(filter.clean("àss").matches.length).toBe(1);
		expect(filter.clean("äss").matches.length).toBe(1);
		expect(filter.clean("âss").matches.length).toBe(1);
	});

	test("mathematical bold letters via NFKD: 𝐟𝐮𝐜𝐤 matches fuck", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.clean("𝐟𝐮𝐜𝐤").matches.length).toBe(1);
	});

	test("mixed unicode + ASCII: shｉt matches shit", () => {
		const filter = new WordFilter();
		filter.addWord("shit");

		expect(filter.clean("shｉt").matches.length).toBe(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE VARIATION
// ─────────────────────────────────────────────────────────────────────────────

describe("Case variation", () => {
	test("all uppercase", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.clean("FUCK").cleaned).toBe("****");
	});

	test("mixed case: FuCk, BiTcH, fUcK", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");
		filter.addWord("bitch");

		expect(filter.clean("FuCk").cleaned).toBe("****");
		expect(filter.clean("BiTcH").cleaned).toBe("*****");
		expect(filter.clean("fUcK").cleaned).toBe("****");
	});

	test("title case: Ass, Hell", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.addWord("hell");

		expect(filter.clean("Ass").cleaned).toBe("***");
		expect(filter.clean("Hell").cleaned).toBe("****");
	});

	test("mixed case with trailing punctuation", () => {
		const filter = new WordFilter();
		filter.addWord("shit");

		expect(filter.clean("ShIt!").cleaned).toBe("****!");
		expect(filter.clean("sHiT.").cleaned).toBe("****.");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// WORD BOUNDARIES
// ─────────────────────────────────────────────────────────────────────────────

describe("Word boundary behaviour", () => {
	test("profanity in quotes is still censored", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.clean('"fuck"').cleaned).toBe('"****"');
		expect(filter.clean("'fuck'").cleaned).toBe("'****'");
	});

	test("profanity in parentheses is still censored", () => {
		const filter = new WordFilter();
		filter.addWord("ass");

		expect(filter.clean("(ass)").cleaned).toBe("(***)");
	});

	test("profanity before comma/period/question/exclamation", () => {
		const filter = new WordFilter();
		filter.addWord("shit");
		filter.addWord("fuck");
		filter.addWord("hell");
		filter.addWord("damn");

		expect(filter.clean("shit, I forgot").cleaned).toBe("****, I forgot");
		expect(filter.clean("what the fuck.").cleaned).toBe("what the ****.");
		expect(filter.clean("what the hell?").cleaned).toBe("what the ****?");
		expect(filter.clean("damn!").cleaned).toBe("****!");
	});

	test("profanity at start / end / entire string", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.clean("fuck off").cleaned).toBe("**** off");
		expect(filter.clean("oh fuck").cleaned).toBe("oh ****");
		expect(filter.clean("fuck").cleaned).toBe("****");
	});

	test("profanity preceded by newline", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.clean("\nfuck this").cleaned).toBe("\n**** this");
	});

	test("kick-ass hyphenated compound: ass is censored", () => {
		const filter = new WordFilter();
		filter.addWord("ass");

		expect(filter.clean("kick-ass movie").cleaned).toBe("kick-*** movie");
	});

	test("Scunthorpe: cunt inside Scunthorpe is not censored (boundary mode strict)", () => {
		const filter = new WordFilter();
		filter.addWord("cunt");

		expect(filter.clean("Scunthorpe is a town").cleaned).toBe(
			"Scunthorpe is a town",
		);
	});

	test("Penistone: penis inside Penistone is not censored", () => {
		const filter = new WordFilter();
		filter.addWord("penis");

		expect(filter.clean("Penistone is near Sheffield").cleaned).toBe(
			"Penistone is near Sheffield",
		);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-WORD / PHRASE MATCHING
// ─────────────────────────────────────────────────────────────────────────────

describe("Multi-word and phrase matching", () => {
	test("phrase with internal space: 'mother fucker' (13 chars) → 13 asterisks", () => {
		// "mother fucker" = m-o-t-h-e-r-SPACE-f-u-c-k-e-r = 13 chars
		const filter = new WordFilter();
		filter.addWord("mother fucker");

		const r = filter.clean("you mother fucker!");
		expect(r.cleaned).toBe("you *************!");
		expect(r.matches.length).toBe(1);
		expect(r.matches[0].word).toBe("mother fucker");
	});

	test("longest match wins: asshole beats ass", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.addWord("asshole");

		const r = filter.clean("you asshole");
		expect(r.matches[0].word).toBe("asshole");
	});

	test("multiple profanities in one sentence", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");
		filter.addWord("shit");
		filter.addWord("ass");

		const r = filter.clean("what the fuck, this shit is ass");
		expect(r.cleaned).toBe("what the ****, this **** is ***");
		expect(r.matches.length).toBe(3);
	});

	test("back-to-back profanities with space: both censored", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");
		filter.addWord("ass");

		const r = filter.clean("fuck ass");
		expect(r.cleaned).toBe("**** ***");
		expect(r.matches.length).toBe(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// FALSE POSITIVE PREVENTION (extended Scunthorpe)
// ─────────────────────────────────────────────────────────────────────────────

describe("False positive prevention", () => {
	const safeAssWords = [
		"class is in session",
		"the grass is green",
		"bass guitar music",
		"a mass of people",
		"pass the ball",
		"an assessment",
		"harassment policy",
		"passionate about learning",
	];

	safeAssWords.forEach((phrase) => {
		test(`'ass' not triggered in: "${phrase}"`, () => {
			const filter = new WordFilter();
			filter.addWord("ass");

			const r = filter.clean(phrase);
			expect(r.cleaned).toBe(phrase);
			expect(r.matches.length).toBe(0);
		});
	});

	test("hell not triggered in: hello, shell, held", () => {
		const filter = new WordFilter();
		filter.addWord("hell");

		expect(filter.clean("hello world").cleaned).toBe("hello world");
		expect(filter.clean("a shell on the beach").cleaned).toBe(
			"a shell on the beach",
		);
		expect(filter.clean("she held it").cleaned).toBe("she held it");
	});

	test("he'll (contraction) not censored — apostrophe breaks hell match", () => {
		const filter = new WordFilter();
		filter.addWord("hell");
		expect(filter.clean("he'll be back").cleaned).toBe("he'll be back");
		expect(filter.clean("he'll").cleaned).toBe("he'll");
		expect(filter.clean("what the hell").cleaned).toBe("what the ****");
	});

	test("fu'ck (apostrophe obfuscation) not censored by default", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");
		expect(filter.clean("fu'ck").cleaned).toBe("fu'ck");
		expect(filter.clean("fu'ck").matches.length).toBe(0);
	});

	test("sex not triggered in: sextant, Essex, sextet", () => {
		const filter = new WordFilter();
		filter.addWord("sex");

		expect(filter.clean("navigate by sextant").cleaned).toBe(
			"navigate by sextant",
		);
		expect(filter.clean("Essex county").cleaned).toBe("Essex county");
		expect(filter.clean("a musical sextet").cleaned).toBe("a musical sextet");
	});

	test("dick not triggered in: Dickens, Benedict, dictionary", () => {
		const filter = new WordFilter();
		filter.addWord("dick");

		expect(filter.clean("Charles Dickens").cleaned).toBe("Charles Dickens");
		expect(filter.clean("Benedict Cumberbatch").cleaned).toBe(
			"Benedict Cumberbatch",
		);
		expect(filter.clean("look it up in the dictionary").cleaned).toBe(
			"look it up in the dictionary",
		);
	});

	test("shit not triggered in: Shinto, sushi", () => {
		const filter = new WordFilter();
		filter.addWord("shit");

		expect(filter.clean("Shinto temple").cleaned).toBe("Shinto temple");
		expect(filter.clean("sushi restaurant").cleaned).toBe("sushi restaurant");
	});

	test("cock not triggered in: cockatoo, cockerel", () => {
		const filter = new WordFilter();
		filter.addWord("cock");

		expect(filter.clean("a cockatoo bird").cleaned).toBe("a cockatoo bird");
		expect(filter.clean("the cockerel crowed").cleaned).toBe(
			"the cockerel crowed",
		);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// DICTIONARY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe("Dictionary management", () => {
	test("removeWord prevents matching", () => {
		const filter = new WordFilter();
		filter.addWord("ass");
		filter.removeWord("ass");

		const r = filter.clean("kick ass");
		expect(r.cleaned).toBe("kick ass");
		expect(r.matches.length).toBe(0);
	});

	test("adding duplicate word doesn't double-match", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");
		filter.addWord("fuck");

		expect(filter.clean("fuck").matches.length).toBe(1);
	});

	test("addWords batch method adds all words", () => {
		const filter = new WordFilter();
		filter.addWords(["fuck", "shit", "ass"]);

		const r = filter.clean("fuck shit ass");
		expect(r.matches.length).toBe(3);
	});

	test("clearWords removes all words", () => {
		const filter = new WordFilter();
		filter.addWords(["fuck", "shit", "ass"]);
		filter.clearWords();

		const r = filter.clean("fuck shit ass");
		expect(r.matches.length).toBe(0);
	});

	test("hasWord returns true for added words, false otherwise", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		expect(filter.hasWord("fuck")).toBe(true);
		expect(filter.hasWord("shit")).toBe(false);
	});

	test("getWords returns all added non-allowlist words", () => {
		const filter = new WordFilter();
		filter.addWords(["fuck", "shit"]);

		const words = filter.getWords();
		expect(words).toContain("fuck");
		expect(words).toContain("shit");
		expect(words.length).toBe(2);
	});

	test("adding empty string does not break filter", () => {
		const filter = new WordFilter();
		filter.addWord("");

		expect(filter.clean("hello").cleaned).toBe("hello");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE INPUTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Edge inputs", () => {
	test("empty string", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		const r = filter.clean("");
		expect(r.cleaned).toBe("");
		expect(r.matches.length).toBe(0);
	});

	test("whitespace-only string", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		const r = filter.clean("   ");
		expect(r.cleaned).toBe("   ");
		expect(r.matches.length).toBe(0);
	});

	test("numeric-only string", () => {
		const filter = new WordFilter();
		filter.addWord("ass");

		const r = filter.clean("12345");
		expect(r.cleaned).toBe("12345");
		expect(r.matches.length).toBe(0);
	});

	test("punctuation-only string", () => {
		const filter = new WordFilter();
		filter.addWord("ass");

		const r = filter.clean("!!! ???");
		expect(r.cleaned).toBe("!!! ???");
		expect(r.matches.length).toBe(0);
	});

	test("no words added — nothing censored", () => {
		const filter = new WordFilter();

		const r = filter.clean("fuck shit ass");
		expect(r.cleaned).toBe("fuck shit ass");
		expect(r.matches.length).toBe(0);
	});

	test("very long string with profanity near end", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");

		const prefix = "a".repeat(10_000);
		const r = filter.clean(`${prefix} fuck`);
		expect(r.cleaned).toBe(`${prefix} ****`);
		expect(r.matches.length).toBe(1);
	});

	test("1000 repetitions of 'ass'", () => {
		const filter = new WordFilter();
		filter.addWord("ass");

		const input = Array(1_000).fill("ass").join(" ");
		const expected = Array(1_000).fill("***").join(" ");
		const r = filter.clean(input);

		expect(r.matches.length).toBe(1_000);
		expect(r.cleaned).toBe(expected);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// EXHAUSTIVE VARIANT COVERAGE
// ─────────────────────────────────────────────────────────────────────────────

describe("Exhaustive profanity variant coverage", () => {
	test("fuck variants", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("fuck");

		for (const v of [
			"fuck",
			"FUCK",
			"Fuck",
			"fUcK",
			"ｆｕｃｋ",
			"fuuck",
			"fuuuck",
			"fffuck",
			"fu(k",
		]) {
			expect(filter.clean(v).matches.length).toBe(1);
		}
	});

	test("shit variants", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("shit");

		for (const v of [
			"shit",
			"SHIT",
			"Shit",
			"sh!t",
			"5h1t",
			"5hit",
			"sh1t",
			"shiiit",
			"ｓｈｉｔ",
		]) {
			expect(filter.clean(v).matches.length).toBeGreaterThan(0);
		}
	});

	test("ass variants", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("ass");

		for (const v of [
			"ass",
			"ASS",
			"Ass",
			"@ss",
			"a$$",
			"4ss",
			"asss",
			"aass",
			"ａｓｓ",
		]) {
			expect(filter.clean(v).matches.length).toBeGreaterThan(0);
		}
	});

	test("bitch variants", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("bitch");

		for (const v of [
			"bitch",
			"BITCH",
			"Bitch",
			"b!tch",
			"b1tch",
			"bi7ch",
			"b!7ch",
			"biiiitch",
		]) {
			expect(filter.clean(v).matches.length).toBeGreaterThan(0);
		}
	});

	test("dick variants", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("dick");

		for (const v of ["dick", "DICK", "Dick", "d!ck", "d1ck", "diick"]) {
			expect(filter.clean(v).matches.length).toBeGreaterThan(0);
		}
	});

	test("cock variants", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("cock");

		for (const v of ["cock", "COCK", "Cock", "c0ck", "cooock"]) {
			expect(filter.clean(v).matches.length).toBeGreaterThan(0);
		}
	});

	test("cunt variants (no phonetic/leet map entry for 7→t gives us cun7)", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("cunt");

		// cun7: 7→t via leet map, so "cun7" normalises to "cunt" ✓
		for (const v of ["cunt", "CUNT", "Cunt", "cun7", "cuunt"]) {
			expect(filter.clean(v).matches.length).toBeGreaterThan(0);
		}
	});

	test("bastard variants", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("bastard");

		for (const v of [
			"bastard",
			"BASTARD",
			"Bastard",
			"b@stard",
			"ba$tard",
			"b4stard",
			"baastard",
		]) {
			expect(filter.clean(v).matches.length).toBeGreaterThan(0);
		}
	});

	test("damn variants", () => {
		const filter = new WordFilter({ collapseRepeats: true });
		filter.addWord("damn");

		for (const v of ["damn", "DAMN", "Damn", "d@mn", "daaamn"]) {
			expect(filter.clean(v).matches.length).toBeGreaterThan(0);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance", () => {
	test("large dictionary (502 words) × 1000 cleans in under 5s", () => {
		const filter = new WordFilter();
		for (let i = 0; i < 500; i++) filter.addWord(`word${i}`);
		filter.addWord("fuck");
		filter.addWord("shit");

		const sentence =
			"this is a sentence with fuck and shit in it word250 and more text here";

		const start = Date.now();
		for (let i = 0; i < 1_000; i++) filter.clean(sentence);
		expect(Date.now() - start).toBeLessThan(5_000);
	});

	test("10,000-word sentence cleans in under 2s", () => {
		const filter = new WordFilter();
		filter.addWord("fuck");
		filter.addWord("shit");

		const words = Array(10_000).fill("hello");
		words[5_000] = "fuck";
		const sentence = words.join(" ");

		const start = Date.now();
		const r = filter.clean(sentence);
		expect(Date.now() - start).toBeLessThan(2_000);
		expect(r.matches.length).toBe(1);
	});
});

describe("minimumMatchRatio heuristic", () => {
	test("flags 'cock' in 'pea-cock' (ratio 1.0 because - is a symbol)", () => {
		const filter = new WordFilter({ minimumMatchRatio: 0.6 });
		filter.addWord("cock");
		expect(filter.clean("pea-cock").matches.length).toBe(1);
	});

	test("does NOT flag 'cock' in 'peacock' (ratio 4/7 = 0.57 < 0.6)", () => {
		const filter = new WordFilter({ minimumMatchRatio: 0.6 });
		filter.addWord("cock");
		expect(filter.clean("peacock").matches.length).toBe(0);
	});

	test("flags 'damn' in 'damn!' (ratio 1.0 because ! is a symbol)", () => {
		const filter = new WordFilter({ minimumMatchRatio: 0.6 });
		filter.addWord("damn");
		expect(filter.clean("damn!").matches.length).toBe(1);
	});

	test("ignores 'ass' in 'assistant' (ratio 3/9 = 0.33 < 0.6)", () => {
		const filter = new WordFilter({ minimumMatchRatio: 0.6 });
		filter.addWord("ass");
		expect(filter.clean("assistant").matches.length).toBe(0);
	});
});
