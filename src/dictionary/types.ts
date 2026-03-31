export interface DictionaryEntry {
	word: string;
	severity?: number;
}

export type Dictionary = (string | DictionaryEntry)[];
