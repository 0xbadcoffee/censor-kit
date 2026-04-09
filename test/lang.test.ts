import { describe, expect, test } from "vitest";
import { spanish } from "../src/dictionaries/spanish.js";
import { WordFilter } from "../src/index.js";

describe("Multi-language support", () => {
	test("Testing build function with Spanish dictionary", () => {
		const filter = new WordFilter();
		// Testing the 'build' logic via loadDictionary(array)
		filter.loadDictionary(spanish);

		const r = filter.clean("Eres un pendejo de mierda");
		expect(r.cleaned).toBe("Eres un ******* de ******");
		expect(r.matches.length).toBe(2);
	});

	test("Testing leetspeak with Spanish words", () => {
		const filter = new WordFilter();
		filter.loadDictionary(spanish);

		// p3nd3j0 -> pendejo
		const r = filter.clean("Eres un p3nd3j0");
		expect(r.cleaned).toBe("Eres un *******");
	});
});
