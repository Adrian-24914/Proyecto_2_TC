import {
	validateChomskyNormalForm,
	type CnfViolation,
} from './cnf-validator.ts';
import type { Grammar } from './grammar-reader.ts';

/** Representación de cada nodo del árbol sintáctico */
export interface ParseTreeNode {
	symbol: string;
	children: ParseTreeNode[];
	terminal?: string;
}

/** `table[length - 1][start]` contiene los no terminales de ese fragmento. */
export type CykTable = Set<string>[][];

export interface CykResult {
	isAccepted: boolean;
	tokens: string[];
	table: CykTable;
	parseTree: ParseTreeNode | null;
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
 * Ejecuta CYK sobre una secuencia de tokens, construye su tabla dinámica
 * y reconstruye el Parse Tree de la expresión analizada.
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
		const isAccepted = grammar.productions.some(
			(production) =>
				production.left === grammar.startSymbol && production.right.length === 0,
		);
		return {
			isAccepted,
			tokens,
			table: [],
			parseTree: isAccepted
				? { symbol: grammar.startSymbol, children: [], terminal: 'ε' }
				: null,
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

	// Tabla paralela que conserva los subárboles de cada símbolo en cada celda
	const treeTable: Map<string, ParseTreeNode>[][] = [
		tokens.map((token) => {
			const cellTrees = new Map<string, ParseTreeNode>();
			const producers = terminalProducers.get(token) ?? [];

			for (const producer of producers) {
				cellTrees.set(producer, {
					symbol: producer,
					terminal: token,
					children: [{ symbol: token, children: [] }],
				});
			}
			return cellTrees;
		}),
	];

	// Tabla pública con los conjuntos de símbolos Set<string>
	const table: CykTable = [
		treeTable[0]!.map((cellMap) => new Set(cellMap.keys())),
	];

	for (let length = 2; length <= tokens.length; length++) {
		const row: Set<string>[] = [];
		const treeRow: Map<string, ParseTreeNode>[] = [];

		for (let start = 0; start <= tokens.length - length; start++) {
			const cell = new Set<string>();
			const cellTrees = new Map<string, ParseTreeNode>();

			for (let leftLength = 1; leftLength < length; leftLength++) {
				const rightLength = length - leftLength;
				const leftTrees = treeTable[leftLength - 1]![start]!;
				const rightTrees = treeTable[rightLength - 1]![start + leftLength]!;

				if (leftTrees.size === 0 || rightTrees.size === 0) continue;

				for (const [leftSymbol, leftNode] of leftTrees.entries()) {
					for (const [rightSymbol, rightNode] of rightTrees.entries()) {
						const producers = binaryProducers.get(binaryKey(leftSymbol, rightSymbol));
						if (producers === undefined) continue;

						for (const producer of producers) {
							cell.add(producer);
							if (!cellTrees.has(producer)) {
								cellTrees.set(producer, {
									symbol: producer,
									children: [leftNode, rightNode],
								});
							}
						}
					}
				}
			}

			row.push(cell);
			treeRow.push(cellTrees);
		}

		table.push(row);
		treeTable.push(treeRow);
	}

	const isAccepted = table[tokens.length - 1]![0]!.has(grammar.startSymbol);
	const parseTree = isAccepted
		? treeTable[tokens.length - 1]![0]!.get(grammar.startSymbol) ?? null
		: null;

	return {
		isAccepted,
		tokens,
		table,
		parseTree,
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
