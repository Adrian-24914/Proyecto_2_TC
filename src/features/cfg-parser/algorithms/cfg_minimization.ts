import type { Grammar, Production } from './grammar-reader.ts';

export interface CnfConversionResult {
	withoutEpsilonProductions: Grammar;
	withoutUnitProductions: Grammar;
	withoutUselessSymbols: Grammar;
	grammar: Grammar;
}

/**
 * Simplifica una CFG y la convierte a Forma Normal de Chomsky.
 * No modifica la gramática recibida.
 */
export function convertToChomskyNormalForm(grammar: Grammar): CnfConversionResult {
	const preparedGrammar = prepareNullableStartSymbol(grammar);
	const withoutEpsilonProductions = eliminateEpsilonProductions(preparedGrammar);
	const withoutUnitProductions = eliminateUnitProductions(withoutEpsilonProductions);
	const withoutUselessSymbols = eliminateUselessSymbols(withoutUnitProductions);
	const nameGenerator = createNameGenerator(withoutUselessSymbols.nonTerminals);
	const withoutMixedTerminals = isolateTerminals(withoutUselessSymbols, nameGenerator);
	const cnfGrammar = binarizeProductions(withoutMixedTerminals, nameGenerator);

	return {
		withoutEpsilonProductions,
		withoutUnitProductions,
		withoutUselessSymbols,
		grammar: cnfGrammar,
	};
}

function prepareNullableStartSymbol(grammar: Grammar): Grammar {
	const nullable = findNullableNonTerminals(grammar);
	const startAppearsOnRight = grammar.productions.some((production) =>
		production.right.includes(grammar.startSymbol),
	);

	if (!nullable.has(grammar.startSymbol) || !startAppearsOnRight) {
		return cloneGrammar(grammar);
	}

	const nextName = createNameGenerator(grammar.nonTerminals);
	const newStartSymbol = nextName('START');

	return buildGrammar(newStartSymbol, [
		{ left: newStartSymbol, right: [grammar.startSymbol] },
		...grammar.productions,
	]);
}

function eliminateEpsilonProductions(grammar: Grammar): Grammar {
	const nullable = findNullableNonTerminals(grammar);
	const productions: Production[] = [];

	for (const production of grammar.productions) {
		if (production.right.length === 0) continue;

		for (const right of createNullableVariants(production.right, nullable)) {
			if (right.length > 0 || production.left === grammar.startSymbol) {
				productions.push({ left: production.left, right });
			}
		}
	}

	if (nullable.has(grammar.startSymbol)) {
		productions.push({ left: grammar.startSymbol, right: [] });
	}

	return buildGrammar(grammar.startSymbol, productions);
}

function eliminateUnitProductions(grammar: Grammar): Grammar {
	const productions: Production[] = [];

	for (const left of grammar.nonTerminals) {
		const unitClosure = findUnitClosure(left, grammar);

		for (const source of unitClosure) {
			for (const production of grammar.productions) {
				if (production.left !== source || isUnitProduction(production, grammar)) continue;
				productions.push({ left, right: [...production.right] });
			}
		}
	}

	return buildGrammar(grammar.startSymbol, productions);
}

function eliminateUselessSymbols(grammar: Grammar): Grammar {
	const generating = findGeneratingNonTerminals(grammar);
	const generatingProductions = grammar.productions.filter(
		(production) =>
			generating.has(production.left) &&
			production.right.every(
				(symbol) => !grammar.nonTerminals.has(symbol) || generating.has(symbol),
			),
	);
	const generatingGrammar = buildGrammar(grammar.startSymbol, generatingProductions);
	const reachable = findReachableNonTerminals(generatingGrammar);

	return buildGrammar(
		grammar.startSymbol,
		generatingGrammar.productions.filter((production) => reachable.has(production.left)),
	);
}

function isolateTerminals(
	grammar: Grammar,
	nextName: (prefix: string) => string,
): Grammar {
	const terminalProducers = new Map<string, string>();
	const helperProductions: Production[] = [];

		const productionCount = new Map<string, number>();
	for (const production of grammar.productions) {
		productionCount.set(production.left, (productionCount.get(production.left) ?? 0) + 1);
	}

	// Solo se reutiliza un no terminal cuya única producción es `A -> terminal`;
	// si tuviera otras producciones, el reemplazo ampliaría el lenguaje.
	for (const production of grammar.productions) {
		if (
			production.right.length === 1 &&
			grammar.terminals.has(production.right[0]!) &&
			productionCount.get(production.left) === 1
		) {
			terminalProducers.set(production.right[0]!, production.left);
		}
	}

	const productions = grammar.productions.map((production) => {
		if (production.right.length < 2) {
			return { left: production.left, right: [...production.right] };
		}

		return {
			left: production.left,
			right: production.right.map((symbol) => {
				if (!grammar.terminals.has(symbol)) return symbol;

				let producer = terminalProducers.get(symbol);
				if (producer === undefined) {
					producer = nextName('TERM');
					terminalProducers.set(symbol, producer);
					helperProductions.push({ left: producer, right: [symbol] });
				}

				return producer;
			}),
		};
	});

	return buildGrammar(grammar.startSymbol, [...productions, ...helperProductions]);
}

function binarizeProductions(
	grammar: Grammar,
	nextName: (prefix: string) => string,
): Grammar {
	const productions: Production[] = [];
	const suffixHelpers = new Map<string, string>();
	const helperProductions: Production[] = [];

	const getSuffixHelper = (symbols: string[]): string => {
		const key = JSON.stringify(symbols);
		const existingHelper = suffixHelpers.get(key);
		if (existingHelper !== undefined) return existingHelper;

		const helper = nextName('BIN');
		suffixHelpers.set(key, helper);

		const right =
			symbols.length === 2
				? [...symbols]
				: [symbols[0]!, getSuffixHelper(symbols.slice(1))];
		helperProductions.push({ left: helper, right });
		return helper;
	};

	for (const production of grammar.productions) {
		if (production.right.length <= 2) {
			productions.push({ left: production.left, right: [...production.right] });
			continue;
		}

		productions.push({
			left: production.left,
			right: [production.right[0]!, getSuffixHelper(production.right.slice(1))],
		});
	}

	return buildGrammar(grammar.startSymbol, [...productions, ...helperProductions]);
}

function findNullableNonTerminals(grammar: Grammar): Set<string> {
	const nullable = new Set<string>();
	let changed = true;

	while (changed) {
		changed = false;

		for (const production of grammar.productions) {
			if (
				production.right.every(
					(symbol) => grammar.nonTerminals.has(symbol) && nullable.has(symbol),
				) &&
				!nullable.has(production.left)
			) {
				nullable.add(production.left);
				changed = true;
			}
		}
	}

	return nullable;
}

function createNullableVariants(right: string[], nullable: Set<string>): string[][] {
	let variants: string[][] = [[]];

	for (const symbol of right) {
		const withSymbol = variants.map((variant) => [...variant, symbol]);
		variants = nullable.has(symbol) ? [...withSymbol, ...variants] : withSymbol;
	}

	return deduplicateRights(variants);
}

function findUnitClosure(start: string, grammar: Grammar): Set<string> {
	const closure = new Set([start]);
	const pending = [start];

	while (pending.length > 0) {
		const current = pending.shift()!;

		for (const production of grammar.productions) {
			if (production.left !== current || !isUnitProduction(production, grammar)) continue;
			const target = production.right[0]!;
			if (closure.has(target)) continue;
			closure.add(target);
			pending.push(target);
		}
	}

	return closure;
}

function isUnitProduction(production: Production, grammar: Grammar): boolean {
	return (
		production.right.length === 1 && grammar.nonTerminals.has(production.right[0]!)
	);
}

function findGeneratingNonTerminals(grammar: Grammar): Set<string> {
	const generating = new Set<string>();
	let changed = true;

	while (changed) {
		changed = false;

		for (const production of grammar.productions) {
			if (
				production.right.every(
					(symbol) => !grammar.nonTerminals.has(symbol) || generating.has(symbol),
				) &&
				!generating.has(production.left)
			) {
				generating.add(production.left);
				changed = true;
			}
		}
	}

	return generating;
}

function findReachableNonTerminals(grammar: Grammar): Set<string> {
	const reachable = new Set([grammar.startSymbol]);
	const pending = [grammar.startSymbol];

	while (pending.length > 0) {
		const current = pending.shift()!;

		for (const production of grammar.productions) {
			if (production.left !== current) continue;
			for (const symbol of production.right) {
				if (!grammar.nonTerminals.has(symbol) || reachable.has(symbol)) continue;
				reachable.add(symbol);
				pending.push(symbol);
			}
		}
	}

	return reachable;
}

function createNameGenerator(existingNames: Iterable<string>): (prefix: string) => string {
	const usedNames = new Set(existingNames);
	const counters = new Map<string, number>();

	return (prefix: string): string => {
		let counter = counters.get(prefix) ?? 0;
		let candidate = counter === 0 ? prefix : `${prefix}_${counter}`;

		while (usedNames.has(candidate)) {
			counter++;
			candidate = `${prefix}_${counter}`;
		}

		counters.set(prefix, counter + 1);
		usedNames.add(candidate);
		return candidate;
	};
}

function cloneGrammar(grammar: Grammar): Grammar {
	return buildGrammar(
		grammar.startSymbol,
		grammar.productions.map((production) => ({
			left: production.left,
			right: [...production.right],
		})),
	);
}

function buildGrammar(startSymbol: string, productions: Production[]): Grammar {
	const uniqueProductions = deduplicateProductions(productions);
	const nonTerminals = new Set([
		startSymbol,
		...uniqueProductions.map((production) => production.left),
	]);
	const terminals = new Set<string>();

	for (const production of uniqueProductions) {
		for (const symbol of production.right) {
			if (!nonTerminals.has(symbol)) terminals.add(symbol);
		}
	}

	return {
		startSymbol,
		productions: uniqueProductions,
		nonTerminals,
		terminals,
	};
}

function deduplicateProductions(productions: Production[]): Production[] {
	const seen = new Set<string>();
	return productions.filter((production) => {
		const key = JSON.stringify([production.left, production.right]);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function deduplicateRights(rights: string[][]): string[][] {
	const seen = new Set<string>();
	return rights.filter((right) => {
		const key = JSON.stringify(right);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
