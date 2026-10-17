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