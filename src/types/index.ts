export interface FilterOptions {
    /** Strip combining diacritics and apply NFKD unicode normalisation. Default: true */
    normalize?: boolean;
    /** Apply leet-speak substitution map (e.g. @ → a, 3 → e). Default: true */
    leet?: boolean;
    /** Collapse consecutive repeated characters before matching (fuuuck → fuck). Default: true */
    collapseRepeats?: boolean;
    /** Ignore whitespace / zero-width-space between characters so "f u c k" matches. Default: false */
    ignoreSpaces?: boolean;
    /** Ignore punctuation characters between letters so "f.u.c.k" matches. Default: false */
    ignoreIntrawordPunctuation?: boolean;
    /** Ignore numeric / symbol noise between letters so "fu2ck" matches. Default: false */
    ignoreIntrawordNoise?: boolean;
    /** Apply homoglyph map for Cyrillic/Greek lookalikes not handled by NFKD. Default: false */
    homoglyphs?: boolean;
    /** Apply phonetic normalisation (ph→f, ck→k endings, biatch→bitch). Default: false */
    phonetic?: boolean;
    /** Word boundary enforcement mode. Default: "strict" */
    boundaryMode?: "strict" | "loose" | "none";
    /**
     * Minimum ratio of match length vs the enclosing word length.
     * Helps avoid flagging "ass" in "assistant" even in loose mode.
     * Default: 0.5
     */
    minimumMatchRatio?: number;
    /** Array of custom transformation functions to run during normalisation */
    transformers?: ((text: string) => string)[];

    // ── Masking ──────────────────────────────────────────────────────────────
    /**
     * How to render a masked match.
     *
     * "char"    (default) — replace every character with maskChar  → "****"
     * "replace"           — replace entire match with `replacement`→ "[REDACTED]"
     * "fixed"             — replace entire match with `fixedMask`  → "***"
     */
    maskStyle?: "char" | "replace" | "fixed";
    /** Character used for "char" masking. Default: "*" */
    maskChar?: string;
    /** String used when maskStyle is "replace". Default: "[REDACTED]" */
    /** Array of built-in dictionaries to load (e.g. ['english', 'spanish']) */
    dictionaries?: ("english" | "spanish")[];
    /** Array of custom words or a single newline-separated string */
    customWords?: string[] | string;
    replacement?: string;
    /** String used when maskStyle is "fixed". Default: "***" */
    fixedMask?: string;
}

export interface MatchResult {
    /** The canonical dictionary word that matched */
    word: string;
    /** Start index in the *original* input string */
    index: number;
    /** End index (exclusive) in the *original* input string */
    end: number;
    /** The original (un-normalised) substring from the input */
    original: string;
    /** Severity score from the dictionary entry */
    severity?: number;
}

export interface FilterResult {
    /** Original input text */
    original: string;
    /** Text with matches replaced by the configured mask */
    cleaned: string;
    /** Every match that was found and applied */
    matches: MatchResult[];
}
