import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
	GrammarSyntaxError,
	parseGrammar,
} from '../src/features/cfg-parser/algorithms/grammar-reader.ts';

async function readFixture(name: string): Promise<string> {
	return readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

test('lee la gramática del archivo 1-cnf.txt', async () => {
	const grammar = parseGrammar(await readFixture('1-cnf.txt'));

	assert.equal(grammar.startSymbol, 'E');
	assert.equal(grammar.productions.length, 20);
	assert.deepEqual(
		[...grammar.nonTerminals],
		['E', 'X', 'T', 'Y', 'F', 'Z', 'W', 'V', 'L', 'R', 'P', 'M'],
	);
	assert.deepEqual([...grammar.terminals], ['id', '(', ')', '+', '*']);
	assert.deepEqual(grammar.productions[0], { left: 'E', right: ['T', 'X'] });
	assert.deepEqual(grammar.productions.at(-1), { left: 'M', right: ['*'] });
});

test('lee una gramática que todavía no está en CNF', async () => {
	const grammar = parseGrammar(await readFixture('1.txt'));

	assert.equal(grammar.startSymbol, 'E');
	assert.equal(grammar.productions.length, 8);
	assert.deepEqual([...grammar.nonTerminals], ['E', 'X', 'T', 'Y', 'F']);
	assert.deepEqual([...grammar.terminals], ['+', '*', '(', ')', 'id']);
	assert.equal(
		grammar.productions.filter((production) => production.right.length === 0).length,
		2,
	);
	assert.ok(
		grammar.productions.some(
			(production) =>
				production.left === 'F' &&
				production.right.join(' ') === '( E )',
		),
	);
});

test('infiere no terminales por el lado izquierdo y acepta la flecha Unicode', () => {
	const grammar = parseGrammar(
		`S → NP VP\nNP -> Det N\nVP -> eats NP\nDet -> the\nN -> cake`,
	);

	assert.deepEqual([...grammar.nonTerminals], ['S', 'NP', 'VP', 'Det', 'N']);
	assert.deepEqual([...grammar.terminals], ['eats', 'the', 'cake']);
});

test('ignora líneas vacías y conserva el orden de las alternativas', () => {
	const grammar = parseGrammar(`\nS -> a | b\n\n`);

	assert.deepEqual(grammar.productions, [
		{ left: 'S', right: ['a'] },
		{ left: 'S', right: ['b'] },
	]);
});

test('rechaza líneas sin flecha', () => {
	assert.throws(
		() => parseGrammar('S NP VP'),
		(error) => error instanceof GrammarSyntaxError && error.line === 1,
	);
});

test('rechaza alternativas vacías', () => {
	assert.throws(
		() => parseGrammar('S -> NP |'),
		(error) => error instanceof GrammarSyntaxError && error.line === 1,
	);
});

test('rechaza épsilon acompañado de otros símbolos', () => {
	assert.throws(
		() => parseGrammar('S -> ε A'),
		(error) => error instanceof GrammarSyntaxError && error.line === 1,
	);
});

test('rechaza una gramática vacía', () => {
	assert.throws(
		() => parseGrammar('  \n\n'),
		(error) => error instanceof GrammarSyntaxError && error.line === 1,
	);
});
