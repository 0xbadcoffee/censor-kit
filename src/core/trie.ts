export class TrieNode {
	children: Record<string, TrieNode> = {};
	isEnd = false;
	word?: string;
	severity?: number;
}
