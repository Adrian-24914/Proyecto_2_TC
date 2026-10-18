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


export function renderSetItem(symbol: string, index: number, size: number): string {
		const openingBrace = index === 0 ? '\\{' : '';
		const ending = index === size - 1 ? '\\}' : ',\\;';
		return renderMath(`${openingBrace}${escapeMath(symbol)}${ending}`);
}

export function markWrappedAlternatives(node: HTMLElement, _alternatives: string[][]) {
	let destroyed = false;
	const update = () => {
		if (destroyed) return;
		let lineTop: number | undefined;
		for (const child of node.children) {
			const alternative = child as HTMLElement;
			const startsLine = lineTop !== undefined && alternative.offsetTop > lineTop + 1;
			alternative.classList.toggle('line-start', startsLine);
			if (lineTop === undefined || startsLine) lineTop = alternative.offsetTop;
		}
	};

	const observer = new ResizeObserver(update);
	observer.observe(node);
	queueMicrotask(update);
	void document.fonts.ready.then(update);

	return {
		update: () => queueMicrotask(update),
		destroy: () => {
			destroyed = true;
			observer.disconnect();
		}
	};
}