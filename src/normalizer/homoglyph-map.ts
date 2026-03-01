/**
 * Maps visually-similar non-ASCII characters to their ASCII equivalents.
 *
 * NFKD decomposition handles accented Latin letters (ü → u, â → a, etc.)
 * but it does NOT convert Cyrillic or Greek to Latin — they are distinct
 * scripts.  This table fills that gap.
 */
export const homoglyphMap: Record<string, string[]> = {
	// ── Cyrillic ─────────────────────────────────────────────────────────────
	"\u0430": ["a"], // а  CYRILLIC SMALL LETTER A
	"\u0410": ["a"], // А  CYRILLIC CAPITAL LETTER A
	"\u0435": ["e"], // е  CYRILLIC SMALL LETTER IE
	"\u0415": ["e"], // Е  CYRILLIC CAPITAL LETTER IE
	"\u0451": ["e"], // ё  CYRILLIC SMALL LETTER IO
	"\u0401": ["e"], // Ё  CYRILLIC CAPITAL LETTER IO
	"\u043E": ["o"], // о  CYRILLIC SMALL LETTER O
	"\u041E": ["o"], // О  CYRILLIC CAPITAL LETTER O
	"\u0440": ["p"], // р  CYRILLIC SMALL LETTER ER  (looks like p)
	"\u0420": ["p"], // Р  CYRILLIC CAPITAL LETTER ER
	"\u0441": ["c", "s"], // с  CYRILLIC SMALL LETTER ES  (looks like c)
	"\u0421": ["c", "s"], // С  CYRILLIC CAPITAL LETTER ES
	"\u0445": ["x"], // х  CYRILLIC SMALL LETTER HA  (looks like x)
	"\u0425": ["x"], // Х  CYRILLIC CAPITAL LETTER HA
	"\u0443": ["y"], // у  CYRILLIC SMALL LETTER U   (looks like y)
	"\u0423": ["y"], // У  CYRILLIC CAPITAL LETTER U
	"\u0456": ["i"], // і  CYRILLIC BYELORUSSIAN-UKRAINIAN I
	"\u0406": ["i"], // І  CYRILLIC CAPITAL BYELORUSSIAN-UKRAINIAN I
	"\u0432": ["b"], // в  CYRILLIC SMALL LETTER VE
	"\u0412": ["b"], // В  CYRILLIC CAPITAL LETTER VE
	"\u04BB": ["h"], // һ  CYRILLIC SMALL LETTER SHHA
	"\u04BA": ["h"], // Һ  CYRILLIC CAPITAL LETTER SHHA

	// ── Greek ─────────────────────────────────────────────────────────────────
	"\u03B1": ["a"], // α  GREEK SMALL LETTER ALPHA
	"\u0391": ["a"], // Α  GREEK CAPITAL LETTER ALPHA
	"\u03B2": ["b"], // β  GREEK SMALL LETTER BETA
	"\u0392": ["b"], // Β  GREEK CAPITAL LETTER BETA
	"\u03B5": ["e"], // ε  GREEK SMALL LETTER EPSILON
	"\u0395": ["e"], // Ε  GREEK CAPITAL LETTER EPSILON
	"\u03B9": ["i"], // ι  GREEK SMALL LETTER IOTA
	"\u0399": ["i"], // Ι  GREEK CAPITAL LETTER IOTA
	"\u03BA": ["k"], // κ  GREEK SMALL LETTER KAPPA
	"\u039A": ["k"], // Κ  GREEK CAPITAL LETTER KAPPA
	"\u03BD": ["v"], // ν  GREEK SMALL LETTER NU
	"\u039D": ["v"], // Ν  GREEK CAPITAL LETTER NU
	"\u03BF": ["o"], // ο  GREEK SMALL LETTER OMICRON
	"\u039F": ["o"], // Ο  GREEK CAPITAL LETTER OMICRON
	"\u03C1": ["p"], // ρ  GREEK SMALL LETTER RHO  (looks like p)
	"\u03A1": ["p"], // Ρ  GREEK CAPITAL LETTER RHO
	"\u03C5": ["u"], // υ  GREEK SMALL LETTER UPSILON
	"\u03A5": ["u"], // Υ  GREEK CAPITAL LETTER UPSILON
	"\u03C7": ["x"], // χ  GREEK SMALL LETTER CHI  (looks like x)
	"\u03A7": ["x"], // Χ  GREEK CAPITAL LETTER CHI

	// ── Miscellaneous lookalikes ──────────────────────────────────────────────
	"\u0283": ["f", "s"], // ʃ  LATIN SMALL LETTER ESH (often used for f)
	"\u0188": ["c"], // ƈ  LATIN SMALL LETTER C WITH HOOK
	"\u0106": ["c"], // Ć  LATIN CAPITAL LETTER C WITH ACUTE
	"\u0107": ["c"], // ć  LATIN SMALL LETTER C WITH ACUTE
	"\u0141": ["l"], // Ł  LATIN CAPITAL LETTER L WITH STROKE
	"\u0142": ["l"], // ł  LATIN SMALL LETTER L WITH STROKE
	"\u0D30": ["r"], // ര  MALAYALAM LETTER RA
};
