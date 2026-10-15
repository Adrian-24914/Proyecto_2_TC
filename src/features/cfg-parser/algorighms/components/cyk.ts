import {
	validateChomskyNormalForm,
	type CnfViolation,
} from './cnf-validator.ts';
import type { Grammar } from './grammar-reader.ts';

/** `table[length - 1][start]` contiene los no terminales de ese fragmento. */
export type CykTable = Set<string>[][];

/** Cómo se obtuvo un no terminal dentro de una celda de la tabla. */
export type CykBackPointer =
	| { kind: 'terminal'; token: string }
	| {
			kind: 'binary';
			/** Longitud del fragmento izquierdo (donde se dividió el fragmento). */
			split: number;
			leftSymbol: string;
			rightSymbol: string;
	  };

/**
 * `backPointers[length - 1][start]` relaciona cada no terminal de la celda con
 * TODAS las derivaciones que lo produjeron (el arreglo permite ambigüedad).
 */
export type CykBackPointerTable = Map<string, CykBackPointer[]>[][];

/** Nodo del árbol de derivación. */
export interface ParseTreeNode {
	symbol: string;
	token?: string;
	children: ParseTreeNode[];
}

export interface CykResult {
	isAccepted: boolean;
	tokens: string[];
	table: CykTable;
	backPointers: CykBackPointerTable;
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
			backPointers: [],
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

	// Fila de longitud 1: cada A -> token usado guarda su token.
	const backPointers: CykBackPointerTable = [
		tokens.map((token) => {
			const cell = new Map<string, CykBackPointer[]>();
			for (const producer of terminalProducers.get(token) ?? []) {
				addBackPointer(cell, producer, { kind: 'terminal', token });
			}
			return cell;
		}),
	];

	for (let length = 2; length <= tokens.length; length++) {
		const row: Set<string>[] = [];
		const backRow: Map<string, CykBackPointer[]>[] = [];

		for (let start = 0; start <= tokens.length - length; start++) {
			const cell = new Set<string>();
			const backCell = new Map<string, CykBackPointer[]>();

			for (let leftLength = 1; leftLength < length; leftLength++) {
				const rightLength = length - leftLength;
				const leftCell = table[leftLength - 1]![start]!;
				const rightCell = table[rightLength - 1]![start + leftLength]!;

				for (const leftSymbol of leftCell) {
					for (const rightSymbol of rightCell) {
						const producers = binaryProducers.get(binaryKey(leftSymbol, rightSymbol));
						if (producers === undefined) continue;
						for (const producer of producers) {
							cell.add(producer);
							// Se agrega (no se sobrescribe) para conservar toda derivación.
							addBackPointer(backCell, producer, {
								kind: 'binary',
								split: leftLength,
								leftSymbol,
								rightSymbol,
							});
						}
					}
				}
			}

			row.push(cell);
			backRow.push(backCell);
		}

		table.push(row);
		backPointers.push(backRow);
	}

	return {
		isAccepted: table[tokens.length - 1]![0]!.has(grammar.startSymbol),
		tokens,
		table,
		backPointers,
	};
}

function addBackPointer(
	cell: Map<string, CykBackPointer[]>,
	symbol: string,
	pointer: CykBackPointer,
): void {
	const pointers = cell.get(symbol);
	if (pointers === undefined) cell.set(symbol, [pointer]);
	else pointers.push(pointer);
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