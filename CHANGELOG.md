# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-03-02

### Added

- **Contraction rule** – With `ignoreIntrawordPunctuation: true`, common English apostrophe contractions (`'ll`, `'s`, `'t`, `'d`, `'re`, `'ve`, `'m`) are preserved so "he'll", "it's", "don't" are not falsely censored; obfuscation like "fu'ck" is still caught.
- **Contraction dictionary** – `CONTRACTION_SUFFIXES` set and helpers (`isApostropheLike`, `isContractionSuffix`) in `src/normalizer/contraction-suffixes.ts`, exported for extension.
- **README** – Full usage guide: options reference, dictionaries, allowlist, contractions, masking, boundaries, dictionary management, transformers, exports, examples, and TypeScript usage.

### Changed

- Normaliser preserves apostrophe when it is followed by a known contraction suffix (when `ignoreIntrawordPunctuation` is enabled).

## [0.1.0-beta]

- Initial beta release: trie-based filter, leet/homoglyph/phonetic normalisation, English/Spanish dictionaries, allowlist, configurable boundaries and masking.
