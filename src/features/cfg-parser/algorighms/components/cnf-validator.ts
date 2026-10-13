import type { Grammar, Production } from './grammar-reader.ts';

export interface CnfViolation {
	production: Production;
	productionIndex: number;
	reason: string;
}

export interface CnfValidationResult {
	isValid: boolean;
	violations: CnfViolation[];
}

/**
 * Comprueba que cada producción tenga una de las formas permitidas por CNF:
 * `A -> terminal`, `A -> B C` o, de manera opcional, `S -> ε`.
 */
export function validateChomskyNormalForm(grammar: Grammar): CnfValidationResult {
	const violations: CnfViolation[] = [];
	const startSymbolAppearsOnRight = grammar.productions.some((production) =>
		production.right.includes(grammar.startSymbol),
	);

	for (const [productionIndex, production] of grammar.productions.entries()) {
		const violation = validateProduction(
			production,
			grammar,
			startSymbolAppearsOnRight,
		);

		if (violation !== undefined) {
			violations.push({
				production,
				productionIndex,
				reason: violation,
			});
		}
	}

	return {
		isValid: violations.length === 0,
		violations,
	};
}

/** Devuelve solamente el resultado booleano cuando no se necesitan detalles. */
export function isInChomskyNormalForm(grammar: Grammar): boolean {
	return validateChomskyNormalForm(grammar).isValid;
}

function validateProduction(
	production: Production,
	grammar: Grammar,
	startSymbolAppearsOnRight: boolean,
): string | undefined {
	if (production.right.length === 0) {
		if (production.left !== grammar.startSymbol) {
			return 'solo el símbolo inicial puede producir épsilon';
		}

		if (startSymbolAppearsOnRight) {
			return 'el símbolo inicial no puede aparecer en un lado derecho si produce épsilon';
		}

		return undefined;
	}

	if (production.right.length === 1) {
		const [symbol] = production.right;
		return grammar.terminals.has(symbol)
			? undefined
			: 'una producción de un símbolo debe producir un terminal';
	}

	if (production.right.length === 2) {
		return production.right.every((symbol) => grammar.nonTerminals.has(symbol))
			? undefined
			: 'una producción de dos símbolos debe contener solamente no terminales';
	}

	return 'una producción no puede contener más de dos símbolos';
}
