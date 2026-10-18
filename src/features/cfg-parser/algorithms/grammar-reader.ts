export interface Production {
	left: string;
	right: string[];
}

export interface Grammar {
	startSymbol: string;
	productions: Production[];
	nonTerminals: Set<string>;
	terminals: Set<string>;
}

const EPSILON_SYMBOLS = new Set(['e', 'ε']);
const ARROW_PATTERN = /->|→/g;

export class GrammarSyntaxError extends Error {
	readonly line: number;

	constructor(message: string, line: number) {
		super(`Línea ${line}: ${message}`);
		this.name = 'GrammarSyntaxError';
		this.line = line;
	}
}

/**
 * Convierte una gramática escrita como `A -> B C | terminal` a una
 * representación que puedan consumir los algoritmos de simplificación y CYK.
 */
export function parseGrammar(source: string): Grammar {
	const productions: Production[] = [];
	const nonTerminals = new Set<string>();
	let startSymbol: string | undefined;

	for (const [index, originalLine] of source.split(/\r?\n/u).entries()) {
		const lineNumber = index + 1;
		const line = originalLine.trim();

		if (line === '') continue;

		const arrows = [...line.matchAll(ARROW_PATTERN)];
		if (arrows.length !== 1) {
			throw new GrammarSyntaxError('se esperaba exactamente una flecha `->` o `→`', lineNumber);
		}

		const arrow = arrows[0];
		const arrowIndex = arrow.index!;
		const left = line.slice(0, arrowIndex).trim();
		const rightText = line.slice(arrowIndex + arrow[0].length).trim();

		if (left === '' || /\s|\|/u.test(left)) {
			throw new GrammarSyntaxError('el lado izquierdo debe contener un solo símbolo', lineNumber);
		}

		if (EPSILON_SYMBOLS.has(left)) {
			throw new GrammarSyntaxError('épsilon no puede usarse como lado izquierdo', lineNumber);
		}

		if (rightText === '') {
			throw new GrammarSyntaxError('la producción no tiene lado derecho', lineNumber);
		}

		startSymbol ??= left;
		nonTerminals.add(left);

		for (const alternativeText of rightText.split('|')) {
			const alternative = alternativeText.trim();
			if (alternative === '') {
				throw new GrammarSyntaxError('se encontró una alternativa vacía', lineNumber);
			}

			const symbols = alternative.split(/\s+/u);
			const epsilonSymbols = symbols.filter((symbol) => EPSILON_SYMBOLS.has(symbol));

			if (epsilonSymbols.length > 0 && symbols.length > 1) {
				throw new GrammarSyntaxError('épsilon debe aparecer solo en su alternativa', lineNumber);
			}

			productions.push({
				left,
				right: epsilonSymbols.length === 1 ? [] : symbols,
			});
		}
	}

	if (startSymbol === undefined) {
		throw new GrammarSyntaxError('la gramática está vacía', 1);
	}

	const terminals = new Set<string>();
	for (const production of productions) {
		for (const symbol of production.right) {
			if (!nonTerminals.has(symbol)) terminals.add(symbol);
		}
	}

	return {
		startSymbol,
		productions,
		nonTerminals,
		terminals,
	};
}
