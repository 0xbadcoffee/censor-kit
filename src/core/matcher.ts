import type { DictionaryEntry } from "../dictionary/types.js";
import { TrieNode } from "./trie.js";

export interface RawMatch {
	word: string;
	/** Position in the *normalised* string */
	start: number;
	end: number;
	severity?: number;
}

export class Matcher {
	private root = new TrieNode();
	private collapseRepeats = false;

	build(entries: DictionaryEntry[], collapseRepeats = false) {
		this.root = new TrieNode();
		this.collapseRepeats = collapseRepeats;

		for (const entry of entries) {
			// Words with severity 0 are allowlist entries — stored with isEnd=false
			// so they are never emitted as matches, but their presence in the Trie
			// prevents longer words from matching inside them (handled in WordFilter).
			let node = this.root;
			for (const char of entry.word.toLowerCase()) {
				let nextNode = node.children[char];
				if (!nextNode) {
					nextNode = new TrieNode();
					node.children[char] = nextNode;
				}
				node = nextNode;
			}
			if (entry.severity === undefined || entry.severity >= 0) {
				node.isEnd = true;
				node.word = entry.word;
				node.severity = entry.severity ?? 1;
			}
		}
	}

	/**
	 * Find all matches in `text` (normalised string).
	 * When collapseRepeats is true, consecutive identical characters in the
	 * input are treated as a single character for Trie traversal purposes,
	 * but the end index still reflects the full span of repeated chars.
	 */
	find(text: string): RawMatch[] {
		const matches: RawMatch[] = [];

		for (let i = 0; i < text.length; i++) {
			let node = this.root;
			let j = i;
			let prevChar: string | undefined;

			while (j < text.length) {
				const char = text[j];
				if (char === undefined) break;

				const nextNode = node.children[char];
				if (nextNode) {
					// Normal advance
					node = nextNode;
					prevChar = char;
				} else if (this.collapseRepeats && char === prevChar) {
					// Repeated char — stay on current node, advance j
					// (don't update prevChar so triple+ chars still collapse)
				} else {
					break;
				}

				if (node.isEnd) {
					matches.push({
						word: node.word ?? "",
						start: i,
						end: j + 1,
						...(node.severity !== undefined && { severity: node.severity }),
					});
				}

				j++;
			}
		}

		return matches;
	}
}
