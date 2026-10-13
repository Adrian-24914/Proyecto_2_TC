import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
	isInChomskyNormalForm,
	validateChomskyNormalForm,
} from '../src/features/cfg-parser/algorighms/components/cnf-validator.ts';
import { parseGrammar } from '../src/features/cfg-parser/algorighms/components/grammar-reader.ts';

async function readFixture(name: string): Promise<string> {
	return readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

test('acepta 1-cnf.txt como una gramática en CNF', async () => {
	const grammar = parseGrammar(await readFixture('1-cnf.txt'));
	const result = validateChomskyNormalForm(grammar);

	assert.equal(result.isValid, true);
	assert.deepEqual(result.violations, []);
	assert.equal(isInChomskyNormalForm(grammar), true);
});

test('rechaza 1.txt y señala sus cinco producciones inválidas', async () => {
	const grammar = parseGrammar(await readFixture('1.txt'));
	const result = validateChomskyNormalForm(grammar);

	assert.equal(result.isValid, false);
	assert.equal(result.violations.length, 5);
	assert.deepEqual(
		result.violations.map(({ production }) => production),
		[
			{ left: 'X', right: ['+', 'T', 'X'] },
			{ left: 'X', right: [] },
			{ left: 'Y', right: ['*', 'F', 'Y'] },
			{ left: 'Y', right: [] },
			{ left: 'F', right: ['(', 'E', ')'] },
		],
	);
	assert.equal(isInChomskyNormalForm(grammar), false);
});

test('acepta las producciones binarias y terminales de la gramática inglesa', () => {
	const grammar = parseGrammar(`
S -> NP VP
VP -> VP PP | V NP | cooks | drinks | eats | cuts
PP -> P NP
NP -> Det N | he | she
V -> cooks | drinks | eats | cuts
P -> in | with
N -> cat | dog | beer | cake | juice | meat | soup | fork | knife | oven | spoon
Det -> a | the
`);

	assert.equal(isInChomskyNormalForm(grammar), true);
});

test('rechaza una producción unitaria entre no terminales', () => {
	const result = validateChomskyNormalForm(parseGrammar('S -> A\nA -> a'));

	assert.equal(result.isValid, false);
	assert.deepEqual(result.violations[0]?.production, { left: 'S', right: ['A'] });
	assert.match(result.violations[0]?.reason ?? '', /terminal/u);
});

test('rechaza terminales mezclados en una producción binaria', () => {
	const result = validateChomskyNormalForm(parseGrammar('S -> a A\nA -> a'));

	assert.equal(result.isValid, false);
	assert.deepEqual(result.violations[0]?.production, { left: 'S', right: ['a', 'A'] });
	assert.match(result.violations[0]?.reason ?? '', /no terminales/u);
});

test('permite que solamente el símbolo inicial produzca épsilon', () => {
	const validGrammar = parseGrammar('S -> ε | a');
	const invalidGrammar = parseGrammar('S -> A\nA -> ε | a');

	assert.equal(isInChomskyNormalForm(validGrammar), true);
	assert.equal(isInChomskyNormalForm(invalidGrammar), false);
});

test('rechaza épsilon si el símbolo inicial aparece en un lado derecho', () => {
	const result = validateChomskyNormalForm(parseGrammar('S -> ε | A B\nA -> S B\nB -> b'));

	assert.equal(result.isValid, false);
	assert.equal(result.violations.length, 1);
	assert.deepEqual(result.violations[0]?.production, { left: 'S', right: [] });
	assert.match(result.violations[0]?.reason ?? '', /lado derecho/u);
});
