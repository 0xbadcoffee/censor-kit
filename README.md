# censor-kit

[![Build Status](https://github.com/0xbadcoffee/censor-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/0xbadcoffee/censor-kit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/censorkit)](https://www.npmjs.com/package/censorkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, developer-friendly profanity filter for modern applications. Trie-based matching, leetspeak and homoglyph normalisation, configurable boundaries, and built-in English/Spanish dictionaries.

---

## Features

- **Trie-based matching** – Fast word lookup with large dictionaries.
- **Normalisation** – Leetspeak (@→a, 3→e), homoglyphs (Cyrillic/Greek lookalikes), phonetic rules (ph→f, ck→k), repeated-character collapse.
- **Word boundaries** – Strict (default), loose, or none; avoids false positives like "ass" in "assistant" via `minimumMatchRatio`.
- **Contraction-aware** – With `ignoreIntrawordPunctuation`, common English contractions (he'll, it's, don't) are not treated as profanity; obfuscation like fu'ck is still caught.
- **Allowlist** – Mark words as safe (e.g. "Scunthorpe", "bass") so substrings are not censored.
- **Extensible** – Built-in English/Spanish dictionaries, custom word arrays or newline-separated strings, optional transformers.

**For AI agents:** See [llm.txt](./llm.txt) for a concise library usage guide.

---

## Installation

```bash
pnpm add censorkit
# or
npm install censorkit
```

---

## Quick Start

```javascript
import { WordFilter } from "censorkit";

const filter = new WordFilter({
  dictionaries: ["english"],
  customWords: ["my-forbidden-word"],
  normalize: true,
  leet: true,
});

const result = filter.clean("Don't use that word here!");
console.log(result.cleaned);
console.log(result.matches);
```

---

## Guide

### Creating a filter

`WordFilter` is the main class. Pass options into the constructor; you can also add words and change behaviour later.

```javascript
import { WordFilter } from "censorkit";

const filter = new WordFilter({
  dictionaries: ["english", "spanish"],
  customWords: ["spam", "banned"],
  normalize: true,
  leet: true,
  collapseRepeats: true,
  maskChar: "*",
  boundaryMode: "strict",
  minimumMatchRatio: 0.6,
});
```

### Constructor options (reference)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dictionaries` | `("english" \| "spanish")[]` | – | Load built-in dictionaries. |
| `customWords` | `string[]` or `string` | – | Extra words (string = newline-separated). |
| `normalize` | `boolean` | `true` | NFKD unicode normalisation, strip diacritics. |
| `leet` | `boolean` | `true` | Leetspeak map (@→a, 3→e, $→s, etc.). |
| `collapseRepeats` | `boolean` | `true` | fuuuck → fuck. |
| `ignoreSpaces` | `boolean` | `false` | Ignore spaces/zero-width between letters (f u c k matches). |
| `ignoreIntrawordPunctuation` | `boolean` | `false` | Ignore punctuation between letters (f.u.c.k, fu'ck). Contraction rule keeps he'll, it's, don't safe. |
| `ignoreIntrawordNoise` | `boolean` | `false` | Ignore digits/symbols between letters (fu2ck). |
| `homoglyphs` | `boolean` | `false` | Cyrillic/Greek lookalikes → Latin. |
| `phonetic` | `boolean` | `false` | ph→f, ck→k, biatch→bitch, etc. |
| `boundaryMode` | `"strict" \| "loose" \| "none"` | `"strict"` | Word boundaries; strict = no letter immediately before/after match. |
| `minimumMatchRatio` | `number` | `0.6` | Skip match if (match length / enclosing word length) < this (e.g. "ass" in "assistant"). |
| `maskStyle` | `"char" \| "replace" \| "fixed"` | `"char"` | How to mask: per-char, whole replace string, or fixed string. |
| `maskChar` | `string` | `"*"` | Character for `maskStyle: "char"`. |
| `replacement` | `string` | `"[REDACTED]"` | String for `maskStyle: "replace"`. |
| `fixedMask` | `string` | `"***"` | String for `maskStyle: "fixed"`. |
| `transformers` | `((text: string) => string)[]` | – | Run before normalisation (e.g. preprocess input). |

### Dictionaries

**Built-in**

- `english` – English profanity list.
- `spanish` – Spanish profanity list.

Load at construction or later:

```javascript
const filter = new WordFilter({ dictionaries: ["english"] });

// Or later
filter.loadDictionary("english");
filter.loadDictionary("spanish");
```

**Custom words**

- At construction: `customWords: ["word1", "word2"]` or `customWords: "word1\nword2"`.
- At runtime: `filter.addWord("word")`, `filter.addWords(["a", "b"])` or `filter.addWords("a\nb")`.

**From a file (Node)**

```javascript
import fs from "node:fs";
const filter = new WordFilter();
filter.addWords(fs.readFileSync("bad-words.txt", "utf-8"));
```

**Severity (optional)**

`addWord(word, severity)` – default severity is 1. Used for scoring; allowlisted words use severity 0.

### Cleaning text and reading results

```javascript
const result = filter.clean("Some text with bad words here.");

result.original;  // original input string
result.cleaned;   // input with matches replaced by mask
result.matches;   // array of MatchResult
```

**MatchResult** (each item in `result.matches`):

- `word` – dictionary word that matched (e.g. "fuck").
- `index` – start index in original string.
- `end` – end index (exclusive) in original string.
- `original` – exact substring that was matched (e.g. "f*ck").
- `severity` – from dictionary entry if set.

Example:

```javascript
const result = filter.clean("what the hell");
result.cleaned;                    // "what the ****"
result.matches.length;             // 1
result.matches[0].word;            // "hell"
result.matches[0].original;        // "hell"
result.matches[0].index;           // 9
result.matches[0].end;             // 13
```

### Allowlist (false positive prevention)

Use `allow(word)` so a word is never censored even if it contains a banned substring (e.g. "Scunthorpe", "bass", "hello"):

```javascript
filter.addWord("hell");
filter.allow("hello");
filter.allow("Scunthorpe");

filter.clean("hello world").cleaned;       // "hello world"
filter.clean("what the hell").cleaned;     // "what the ****"
filter.clean("Scunthorpe").cleaned;       // "Scunthorpe"
```

Allowlisted words do not appear in `getWords()`.

### Contractions and apostrophes

- **Default:** Apostrophe is not stripped. So `he'll` does not become "hell" and passes; `fu'ck` also passes (apostrophe breaks "fuck").
- **With `ignoreIntrawordPunctuation: true`:** Punctuation between letters is stripped for matching. The library uses a **contraction rule**: if the apostrophe is followed by a common English contraction suffix (`'ll`, `'s`, `'t`, `'d`, `'re`, `'ve`, `'m`), the apostrophe is **not** stripped. So:
  - `he'll`, `it's`, `don't` stay safe (no false positive).
  - `fu'ck` is normalised to "fuck" and is censored.

Recommended when you want to catch obfuscation like `f.u.c.k` or `fu'ck` without censoring real contractions:

```javascript
const filter = new WordFilter({
  dictionaries: ["english"],
  ignoreIntrawordPunctuation: true,
});
filter.clean("he'll be fine");   // unchanged
filter.clean("fu'ck that");     // censored
```

You can extend the contraction set via the exported `CONTRACTION_SUFFIXES` (see Exports).

### Masking styles

- **`char` (default)** – Replace each character of the match with `maskChar` (e.g. `****`).
- **`replace`** – Replace the whole match with `replacement` (e.g. `[REDACTED]`).
- **`fixed`** – Replace the whole match with `fixedMask` (e.g. `***`), same length regardless of match length.

```javascript
const f1 = new WordFilter({ maskStyle: "char", maskChar: "#" });
f1.clean("hell");  // "####"

const f2 = new WordFilter({ maskStyle: "replace", replacement: "[BLEEP]" });
f2.clean("hell");  // "[BLEEP]"

const f3 = new WordFilter({ maskStyle: "fixed", fixedMask: "***" });
f3.clean("hell");   // "***"
f3.clean("fuck");   // "***"
```

### Word boundaries

- **`strict` (default)** – Match only when there is no letter immediately before or after the match (avoids "ass" in "class" when "ass" is banned).
- **`loose`** – No boundary check.
- **`none`** – No boundary check.

Combined with `minimumMatchRatio`, "ass" in "assistant" can be suppressed (match length 3, word length 9, ratio 3/9 < 0.6).

### Dictionary management (runtime)

| Method | Description |
|--------|-------------|
| `addWord(word, severity?)` | Add one word; default severity 1. |
| `addWords(words)` | Add many (array or newline-separated string). |
| `removeWord(word)` | Remove one word. |
| `clearWords()` | Remove all words. |
| `hasWord(word)` | Whether the word is in the dictionary. |
| `getWords()` | All non-allowlist (severity ≠ 0) words. |
| `loadDictionary(dict)` | Load built-in (`"english"` / `"spanish"`) or custom `Dictionary` (array of strings or `{ word, severity? }`). |
| `allow(word)` | Add as allowlist (severity 0); substring will not be censored. |

After any change that adds/removes words, the matcher is rebuilt automatically.

### Transformers

Run custom logic on the input string before normalisation:

```javascript
const filter = new WordFilter({
  dictionaries: ["english"],
  transformers: [
    (text) => text.replace(/\s+/g, " "),
    (text) => text.toLowerCase(),
  ],
});
```

### Exports

You can use these in your code if you need to extend or reuse behaviour:

- `WordFilter` – main filter class.
- `FilterOptions`, `FilterResult`, `MatchResult` – types.
- `CONTRACTION_SUFFIXES`, `isApostropheLike`, `isContractionSuffix` – contraction rule (e.g. add suffixes: `CONTRACTION_SUFFIXES.add("nt")`).
- `normalizeText` – normaliser (options: leet, collapseRepeats, ignoreSpaces, ignoreIntrawordPunctuation, ignoreIntrawordNoise, homoglyphs, phonetic).
- `english`, `spanish` – built-in dictionary arrays.
- `Dictionary`, `DictionaryEntry`, `DictionaryManager` – dictionary types and manager.
- `Matcher`, `Trie` – core matching (advanced use).

---

## Examples

**Basic: English dictionary, char mask**

```javascript
const filter = new WordFilter({ dictionaries: ["english"] });
console.log(filter.clean("what the hell").cleaned);
```

**Strict moderation: catch obfuscation, keep contractions**

```javascript
const filter = new WordFilter({
  dictionaries: ["english"],
  ignoreIntrawordPunctuation: true,
  phonetic: true,
  homoglyphs: true,
});
filter.clean("he'll be fine");   // unchanged
filter.clean("fu'ck");           // censored
filter.clean("phuck");           // censored (phonetic)
```

**Custom list and allowlist**

```javascript
const filter = new WordFilter();
filter.addWords(["spam", "scam"]);
filter.allow("Scunthorpe");
filter.allow("bass");
```

**Check if text contains any match (no masking)**

```javascript
const result = filter.clean(userInput);
if (result.matches.length > 0) {
  // reject or flag
}
```

**Replace with custom string**

```javascript
const filter = new WordFilter({
  dictionaries: ["english"],
  maskStyle: "replace",
  replacement: "[FILTERED]",
});
filter.clean("bad word");  // "[FILTERED]"
```

---

## TypeScript

The package ships with types. Use `FilterOptions`, `FilterResult`, `MatchResult` as needed:

```typescript
import { WordFilter, type FilterResult, type MatchResult } from "censorkit";

const filter = new WordFilter({ dictionaries: ["english"] });
const result: FilterResult = filter.clean("hello");
result.matches.forEach((m: MatchResult) => {
  console.log(m.word, m.index, m.end);
});
```

---

## Contribution

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Implement changes and add tests.
4. Run `pnpm lint` and `pnpm format`.
5. Open a Pull Request.

---

## License

MIT. Maintained by [0xbadcoffee](https://github.com/0xbadcoffee).
