import katex from 'katex';
import type { Grammar } from '../algorighms/components/grammar-reader';

export interface GroupedProduction {
	left: string;
	alternatives: string[][];
}

export function groupProductions(grammar: Grammar): GroupedProduction[] {
	const groups = new Map<string, string[][]>();
	for (const prod of grammar.productions) {
		const list = groups.get(prod.left) ?? [];
		list.push(prod.right);
		groups.set(prod.left, list);
	}
	return [...groups].map(([left, alternatives]) => ({ left, alternatives }));
}

export function grammarToSource(grammar: Grammar): string {
	return groupProductions(grammar)
		.map(({ left, alternatives }) =>
			`${left} -> ${alternatives.map((rhs) => (rhs.length === 0 ? 'ε' : rhs.join(' '))).join(' | ')}`
		)
		.join('\n');
}

export function escapeMath(symbol: string): string {
	return `\\mathrm{${symbol
		.replaceAll('\\', '\\textbackslash{}')
		.replaceAll(/[{}#$%&_\^~]/gu, (c) => `\\${c}`)}}`;
}

export function renderMath(expression: string): string {
	return katex.renderToString(expression, {
		throwOnError: false,
		strict: false,
		trust: false
	});
}

export function renderSet(symbols: Iterable<string>): string {
	return renderMath(`\\{${[...symbols].map(escapeMath).join(',\\;')}\\}`);
}

export function renderProductionRight(alternatives: string[][]): string {
	const right = alternatives
		.map((syms) => (syms.length === 0 ? '\\varepsilon' : syms.map(escapeMath).join('\\,')))
		.join(' \\mid ');
	return renderMath(right);
}
