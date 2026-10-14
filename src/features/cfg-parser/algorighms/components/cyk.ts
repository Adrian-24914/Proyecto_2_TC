import {
	validateChomskyNormalForm,
	type CnfViolation,
} from './cnf-validator.ts';
import type { Grammar } from './grammar-reader.ts';

/** `table[length - 1][start]` contiene los no terminales de ese fragmento. */
export type CykTable = Set<string>[][];

export interface CykResult {
	isAccepted: boolean;
	tokens: string[];
	table: CykTable;
}

export class CykGrammarError extends Error {
	readonly violations: CnfViolation[];

	constructor(violations: CnfViolation[]) {
		super('El algoritmo CYK requiere una gramática en Forma Normal de Chomsky');
		this.name = 'CykGrammarError';
		this.violations = violations;
	}
}

/**
 * Ejecuta CYK sobre una secuencia de tokens y construye su tabla dinámica.
 * La tokenización y normalización de la frase se realizan fuera de este módulo.
 */
export function runCyk(grammar: Grammar, inputTokens: readonly string[]): CykResult {
	const validation = validateChomskyNormalForm(grammar);
	if (!validation.isValid) {
		throw new CykGrammarError(validation.violations);
	}

	if (inputTokens.some((token) => token.length === 0)) {
		throw new Error('Los tokens de entrada no pueden estar vacíos');
	}

	const tokens = [...inputTokens];
	if (tokens.length === 0) {
		return {
			isAccepted: grammar.productions.some(
				(production) =>
					production.left === grammar.startSymbol && production.right.length === 0,
			),
			tokens,
			table: [],
		};
	}

	const terminalProducers = new Map<string, Set<string>>();
	const binaryProducers = new Map<string, Set<string>>();

	for (const production of grammar.productions) {
		if (production.right.length === 1) {
			addProducer(terminalProducers, production.right[0]!, production.left);
		} else if (production.right.length === 2) {
			addProducer(
				binaryProducers,
				binaryKey(production.right[0]!, production.right[1]!),
				production.left,
			);
		}
	}

	const table: CykTable = [
		tokens.map((token) => new Set(terminalProducers.get(token) ?? [])),
	];

	for (let length = 2; length <= tokens.length; length++) {
		const row: Set<string>[] = [];

		for (let start = 0; start <= tokens.length - length; start++) {
			const cell = new Set<string>();

			for (let leftLength = 1; leftLength < length; leftLength++) {
				const rightLength = length - leftLength;
				const leftCell = table[leftLength - 1]![start]!;
				const rightCell = table[rightLength - 1]![start + leftLength]!;

				for (const leftSymbol of leftCell) {
					for (const rightSymbol of rightCell) {
						const producers = binaryProducers.get(binaryKey(leftSymbol, rightSymbol));
						if (producers === undefined) continue;
						for (const producer of producers) cell.add(producer);
					}
				}
			}

			row.push(cell);
		}

		table.push(row);
	}

	return {
		isAccepted: table[tokens.length - 1]![0]!.has(grammar.startSymbol),
		tokens,
		table,
	};
}

function addProducer(index: Map<string, Set<string>>, key: string, producer: string): void {
	let producers = index.get(key);
	if (producers === undefined) {
		producers = new Set<string>();
		index.set(key, producers);
	}
	producers.add(producer);
}

function binaryKey(left: string, right: string): string {
	return JSON.stringify([left, right]);
}
