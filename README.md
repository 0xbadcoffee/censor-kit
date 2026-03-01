# censor-kit

[![Build Status](https://github.com/0xbadcoffee/censor-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/0xbadcoffee/censor-kit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@0xbadcoffee/censorkit)](https://www.npmjs.com/package/@0xbadcoffee/censorkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, developer-friendly profanity filter for modern applications.

## 🚀 Features

- **Trie-based Matching**: Blazing fast word lookup, even with large dictionaries.
- **Normalize & Resolve**: Handles leetspeak, homoglyphs, and phonetic variants automatically.
- **Boundary Control**: Configurable word boundary enforcement (strict, loose, or none).
- **Extensible**: Load built-in dictionaries, custom arrays, or raw newline-separated strings.
- **Performance Optimized**: Built for high-volume text processing with minimal overhead.

## 📦 Installation

```bash
pnpm add @0xbadcoffee/censorkit
# or
npm install @0xbadcoffee/censorkit
```

## 🛠️ Usage

### Quick Start

```javascript
import { WordFilter } from '@0xbadcoffee/censorkit';

const filter = new WordFilter({
    dictionaries: ['english'], // Load built-in English dictionary
    customWords: ['my-forbidden-word'],
    normalize: true,
    leet: true,
    homoglyphs: true
});

const result = filter.clean("Don't use p3nd3j0 in this chat!");
console.log(result.cleaned); // "Don't use ******* in this chat!"
```

### Advanced Configuration

```javascript
const filter = new WordFilter({
    ignoreIntrawordPunctuation: true, // "f-u-c-k" → "****"
    collapseRepeats: true,            // "fuuuuuck" → "****"
    minimumMatchRatio: 0.6            // Prevent false positives in "assistant"
});
```

### Loading from Files

```javascript
import fs from 'node:fs';
const filter = new WordFilter();

// Load raw multiline string directly
filter.addWords(fs.readFileSync('bad-words.txt', 'utf-8'));
```

## 🤝 Contribution

We welcome contributions! Please follow these steps:

1.  **Fork** the repository.
2.  **Create** a new branch: `git checkout -b feature/awesome-feature`.
3.  **Implement** your changes and add tests.
4.  **Lint** and **Format** using `pnpm lint` and `pnpm format`.
5.  **Submit** a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---
Maintained by [0xbadcoffee](https://github.com/0xbadcoffee)
