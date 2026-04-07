import {
	isApostropheLike,
	isContractionSuffix,
} from "./contraction-suffixes.js";
import { homoglyphMap } from "./homoglyph-map.js";
import { leetMap } from "./leet-map.js";
import { phoneticRules } from "./phonetic-map.js";

export interface TokenSequence {
	text: string;
	origIndices: { start: number; end: number }[];
}

export function normalizeText(
	text: string,
	options: {
		leet?: boolean;
		collapseRepeats?: boolean;
		ignoreSpaces?: boolean;
		ignoreIntrawordPunctuation?: boolean;
		ignoreIntrawordNoise?: boolean;
		homoglyphs?: boolean;
		phonetic?: boolean;
	},
): TokenSequence {
	const resultText: string[] = [];
	const origIndices: { start: number; end: number }[] = [];

	let offset = 0;
	const chars = [...text];
	for (let i = 0; i < chars.length; i++) {
		const origChar = chars[i];
		if (origChar === undefined) continue;

		const charLength = origChar.length;
		const charLower = origChar.toLowerCase();

		// Character status
		const isSpace = /[\p{Z}\s\u200B\u00AD]/u.test(origChar);
		const isPunct = /[\p{P}\p{Cf}\p{Sk}\p{Sm}]/u.test(origChar);
		const isNoise = /[\p{N}\p{So}\p{Sc}]/u.test(origChar);

		// Check for leet match first so we don't accidentally skip a leet char as punctuation
		const leetChar =
			options.leet && leetMap[charLower] ? leetMap[charLower] : null;

		if (options.ignoreSpaces && isSpace) {
			offset += charLength;
			continue;
		}
		if (options.ignoreIntrawordPunctuation && isPunct && !leetChar) {
			const keepApostrophe =
				isApostropheLike(origChar) && isContractionSuffix(chars, i + 1);
			if (!keepApostrophe) {
				offset += charLength;
				continue;
			}
		}
		if (options.ignoreIntrawordNoise && isNoise) {
			offset += charLength;
			continue;
		}

		// We can do advanced unicode un-combining
		const normalizedChars = origChar
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase();

		for (const char of normalizedChars) {
			let nextChar: string = char;

			// Handle leet
			const mappedLeet = leetMap[nextChar];
			if (options.leet && mappedLeet) {
				nextChar = mappedLeet;
			}

			// Handle homoglyphs
			const variants = homoglyphMap[nextChar];
			if (options.homoglyphs && variants) {
				if (nextChar === "\u0441" || nextChar === "\u0421") {
					// Contextual resolution for Cyrillic ES
					// If followed by e/i/y equivalents, it's phonetically 's'
					const nextOrig = chars[i + 1]
						?.normalize("NFKD")
						.replace(/[\u0300-\u036f]/g, "")
						.toLowerCase();
					if (nextOrig && /[eiy\u0435\u0438\u0443]/.test(nextOrig)) {
						nextChar = "s";
					} else {
						nextChar = "c";
					}
				} else {
					nextChar = variants[0] ?? nextChar;
				}
			}

			resultText.push(nextChar);
			origIndices.push({ start: offset, end: offset + charLength });
		}
		offset += charLength;
	}

	let finalText = resultText.join("");
	let finalIndices = [...origIndices];

	if (options.phonetic) {
		for (const [pattern, replacement] of phoneticRules) {
			const gRegex = new RegExp(
				pattern.source,
				pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
			);

			let newText = "";
			const newIndices: { start: number; end: number }[] = [];
			let lastIndex = 0;

			let match = gRegex.exec(finalText);
			while (match !== null) {
				const matchStart = match.index;
				const matchEnd = matchStart + match[0].length;

				for (let i = lastIndex; i < matchStart; i++) {
					newText += finalText[i];
					const idx = finalIndices[i];
					if (idx) newIndices.push(idx);
				}

				const origStart = finalIndices[matchStart]
					? finalIndices[matchStart]?.start
					: 0;
				const origEnd =
					matchEnd > 0 && finalIndices[matchEnd - 1]
						? finalIndices[matchEnd - 1]?.end || origStart
						: origStart;

				for (let i = 0; i < replacement.length; i++) {
					const rChar = replacement[i];
					if (rChar !== undefined) {
						newText += rChar;
						newIndices.push({ start: origStart, end: origEnd });
					}
				}

				lastIndex = matchEnd;

				if (match[0].length === 0) {
					gRegex.lastIndex++;
				}
				match = gRegex.exec(finalText);
			}

			for (let i = lastIndex; i < finalText.length; i++) {
				const char = finalText[i];
				const idx = finalIndices[i];
				if (char !== undefined && idx !== undefined) {
					newText += char;
					newIndices.push(idx);
				}
			}

			finalText = newText;
			finalIndices = newIndices;
		}
	}

	return {
		text: finalText,
		origIndices: finalIndices,
	};
}
