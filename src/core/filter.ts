import { english } from "../dictionaries/english.js";
import { spanish } from "../dictionaries/spanish.js";
import { DictionaryManager } from "../dictionary/manager.js";
import type { Dictionary } from "../dictionary/types.js";
import { normalizeText } from "../normalizer/normalize.js";
import type {
	FilterOptions,
	FilterResult,
	MatchResult,
} from "../types/index.js";
import { Matcher } from "./matcher.js";

export class WordFilter {
	private dictionary = new DictionaryManager();
	private matcher = new Matcher();
	private options: FilterOptions;

	constructor(options: FilterOptions = {}) {
		this.options = {
			normalize: true,
			leet: true,
			collapseRepeats: true,
			maskChar: "*",
			boundaryMode: "strict",
			minimumMatchRatio: 0.6,
			...options,
		};

		if (this.options.dictionaries) {
			for (const lang of this.options.dictionaries) {
				if (lang === "english") {
					this.dictionary.load(english);
				} else if (lang === "spanish") {
					this.dictionary.load(spanish);
				}
			}
		}

		if (this.options.customWords) {
			this.dictionary.addWords(this.options.customWords);
		}

		if (this.options.allowWords?.length) {
			for (const word of this.options.allowWords) {
				this.dictionary.addWord(word, 0);
			}
		}

		this._rebuildMatcher();
	}

	loadDictionary(dictionary: Dictionary | "english" | "spanish") {
		if (dictionary === "english") {
			this.dictionary.load(english);
		} else if (dictionary === "spanish") {
			this.dictionary.load(spanish);
		} else {
			this.dictionary.load(dictionary);
		}
		this._rebuildMatcher();
	}

	addWord(word: string, severity = 1) {
		this.dictionary.addWord(word, severity);
		this._rebuildMatcher();
	}

	addWords(words: string[]) {
		this.dictionary.addWords(words);
		this._rebuildMatcher();
	}

	removeWord(word: string) {
		this.dictionary.removeWord(word);
		this._rebuildMatcher();
	}

	clearWords() {
		this.dictionary.clearWords();
		this._rebuildMatcher();
	}

	hasWord(word: string) {
		return this.dictionary.has(word);
	}

	getWords() {
		return this.dictionary
			.getAll()
			.filter((w) => this.dictionary.get(w)?.severity !== 0);
	}

	allow(word: string) {
		this.dictionary.addWord(word, 0);
		this._rebuildMatcher();
	}

	allowWords(words: string[]) {
		for (const word of words) {
			this.dictionary.addWord(word, 0);
		}
		this._rebuildMatcher();
	}

	private _rebuildMatcher() {
		const entries = this.dictionary.getAll().map((word) => {
			const dictEntry = this.dictionary.get(word);
			const entry = dictEntry
				? Object.assign({}, dictEntry)
				: { word, severity: 1 };
			if (this.options.phonetic) {
				entry.word = normalizeText(entry.word, { phonetic: true }).text;
			}
			return entry;
		});
		this.matcher.build(entries, this.options.collapseRepeats);
	}

	clean(text: string): FilterResult {
		let inputStr = text;

		if (this.options.transformers && this.options.transformers.length > 0) {
			for (const t of this.options.transformers) {
				inputStr = t(inputStr);
			}
			// Use the transformed string as the new "original" base for this clean session
			text = inputStr;
		}

		let normalizedStr = inputStr;
		let origIndices: { start: number; end: number }[] | null = null;

		if (this.options.normalize) {
			const sequence = normalizeText(inputStr, this.options);
			normalizedStr = sequence.text;
			origIndices = sequence.origIndices;
		}

		const rawMatches = this.matcher.find(normalizedStr);

		// 1. Boundary filter
		const boundaryMatches = rawMatches.filter((m) => {
			if (this.options.boundaryMode === "none") return true;

			let origStart = m.start;
			let origEnd = m.end;

			if (origIndices) {
				origStart = origIndices[m.start]?.start ?? origStart;
				origEnd = origIndices[m.end - 1]?.end ?? origEnd;
			}

			const valid = isValidBoundary(
				text,
				origStart,
				origEnd,
				this.options.boundaryMode,
			);
			return valid;
		});

		// 2. Resolve Overlaps and Safe Words (Scunthorpe solution)
		// Longer matches win. Safe words (severity 0) prevent any match inside them.
		const sorted = boundaryMatches.sort((a, b) => {
			const lenA = a.end - a.start;
			const lenB = b.end - b.start;
			if (lenA !== lenB) return lenB - lenA;
			return a.start - b.start;
		});

		const safeRanges = boundaryMatches.filter((m) => m.severity === 0);
		const resolvedMatches: typeof rawMatches = [];

		for (const m of sorted) {
			if (m.severity === 0) continue;

			// 2a. Safe word check (explicit allowlist)
			const isSafe = safeRanges.some(
				(safe) => m.start >= safe.start && m.end <= safe.end,
			);
			if (isSafe) continue;

			// 2b. Heuristic ratio check (Scunthorpe protection)
			// If the match is a small part of a larger normalized word, skip it.
			if (
				this.options.minimumMatchRatio &&
				this.options.minimumMatchRatio > 0
			) {
				const matchLen = m.end - m.start;
				const wordLen = getEnclosingWordLength(
					normalizedStr,
					m.start,
					m.end,
					origIndices,
					text,
				);
				if (matchLen / wordLen < this.options.minimumMatchRatio) {
					continue;
				}
			}

			const overlaps = resolvedMatches.some(
				(active) => m.start < active.end && m.end > active.start,
			);
			if (!overlaps) {
				resolvedMatches.push(m);
			}
		}

		// 3. Apply masking
		let cleaned = text;
		const finalMatches: MatchResult[] = [];

		resolvedMatches
			.sort((a, b) => b.start - a.start)
			.forEach((m) => {
				let origStart = m.start;
				let origEnd = m.end;

				if (origIndices) {
					origStart = origIndices[m.start]?.start ?? origStart;
					origEnd = origIndices[m.end - 1]?.end ?? origEnd;
				}

				let mask = "";
				if (this.options.maskStyle === "replace") {
					mask = this.options.replacement ?? "[REDACTED]";
				} else if (this.options.maskStyle === "fixed") {
					mask = this.options.fixedMask ?? "***";
				} else {
					const originalSub = text.slice(origStart, origEnd);
					const maskCh = this.options.maskChar ?? "*";

					if (!origIndices) {
						mask = maskCh.repeat(originalSub.length);
					} else {
						const matchCovered = new Set<number>();
						for (let i = m.start; i < m.end; i++) {
							const r = origIndices[i];
							if (r) {
								for (let j = r.start; j < r.end; j++) {
									matchCovered.add(j);
								}
							}
						}
						for (let i = origStart; i < origEnd; i++) {
							if (matchCovered.has(i)) {
								mask += maskCh;
							} else {
								mask += text[i];
							}
						}
					}
				}

				cleaned = cleaned.slice(0, origStart) + mask + cleaned.slice(origEnd);

				finalMatches.push({
					word: m.word,
					index: origStart,
					end: origEnd,
					original: text.slice(origStart, origEnd),
					...(m.severity !== undefined && { severity: m.severity }),
				});
			});

		return {
			original: text,
			cleaned,
			matches: finalMatches.sort((a, b) => a.index - b.index),
		};
	}
}

function isValidBoundary(
	text: string,
	start: number,
	end: number,
	mode: "strict" | "loose" | "none" = "strict",
) {
	const before = text[start - 1];
	const after = text[end];

	const isLetter = (c?: string) => !!c && /\p{L}/u.test(c);

	if (mode === "strict") {
		return !isLetter(before) && !isLetter(after);
	}

	return true;
}

function getEnclosingWordLength(
	normalizedText: string,
	start: number,
	end: number,
	origIndices: { start: number; end: number }[] | null,
	originalText: string,
): number {
	const isLetterOrDigit = (char: string) => /\p{L}|\p{N}/u.test(char);

	let left = start;
	while (left > 0) {
		const charIdx = origIndices ? origIndices[left - 1]?.start : left - 1;
		const char = charIdx !== undefined ? originalText[charIdx] : undefined;
		if (char === undefined || !isLetterOrDigit(char)) {
			break;
		}
		left--;
	}

	let right = end;
	while (right < normalizedText.length) {
		const charIdx = origIndices ? origIndices[right]?.start : right;
		const char = charIdx !== undefined ? originalText[charIdx] : undefined;
		if (char === undefined || !isLetterOrDigit(char)) {
			break;
		}
		right++;
	}

	return right - left;
}
