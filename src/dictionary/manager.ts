import type { Dictionary, DictionaryEntry } from "./types.js";

export class DictionaryManager {
    private words = new Map<string, DictionaryEntry>();

    load(dictionary: Dictionary) {
        for (const entryOrWord of dictionary) {
            if (typeof entryOrWord === "string") {
                this.words.set(entryOrWord.toLowerCase(), {
                    word: entryOrWord,
                    severity: 1,
                });
            } else {
                this.words.set(entryOrWord.word.toLowerCase(), entryOrWord);
            }
        }
    }

    addWord(word: string, severity = 1) {
        this.words.set(word.toLowerCase(), { word, severity });
    }

    addWords(words: string[] | string) {
        const list = typeof words === "string" ? words.split(/\r?\n/) : words;
        for (const w of list) {
            const trimmed = w.trim();
            if (trimmed) {
                this.addWord(trimmed);
            }
        }
    }

    has(word: string) {
        return this.words.has(word.toLowerCase());
    }

    get(word: string) {
        return this.words.get(word.toLowerCase());
    }

    getAll() {
        return Array.from(this.words.keys());
    }

    removeWord(word: string) {
        this.words.delete(word.toLowerCase());
    }

    clearWords() {
        this.words.clear();
    }
}
