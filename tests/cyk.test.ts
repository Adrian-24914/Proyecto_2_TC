import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { convertToChomskyNormalForm } from '../src/features/cfg-parser/algorighms/components/cfg_minimization.ts';
import {
	CykGrammarError,
	runCyk,
} from '../src/features/cfg-parser/algorighms/components/cyk.ts';
import { parseGrammar } from '../src/features/cfg-parser/algorighms/components/grammar-reader.ts';

async function readFixture(name: string): Promise<string> {
	return readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

test('acepta expresiones generadas por la gramática aritmética', async () => {
	const grammar = parseGrammar(await readFixture('1-cnf.txt'));

	assert.equal(runCyk(grammar, ['id']).isAccepted, true);
	assert.equal(runCyk(grammar, ['id', '+', 'id']).isAccepted, true);
	assert.equal(runCyk(grammar, ['id', '*', 'id', '+', 'id']).isAccepted, true);
	assert.equal(
		runCyk(grammar, ['(', 'id', '+', 'id', ')', '*', 'id']).isAccepted,
		true,
	);
});

test('rechaza expresiones que no pertenecen a la gramática aritmética', async () => {
	const grammar = parseGrammar(await readFixture('1-cnf.txt'));

	assert.equal(runCyk(grammar, ['+', 'id']).isAccepted, false);
	assert.equal(runCyk(grammar, ['id', '+']).isAccepted, false);
	assert.equal(runCyk(grammar, ['id', 'id']).isAccepted, false);
	assert.equal(runCyk(grammar, ['id', '+', '*', 'id']).isAccepted, false);
});

test('funciona con la salida del conversor de CNF', async () => {
	const source = parseGrammar(await readFixture('1.txt'));
	const grammar = convertToChomskyNormalForm(source).grammar;

	assert.equal(runCyk(grammar, ['id', '+', 'id', '*', 'id']).isAccepted, true);
	assert.equal(runCyk(grammar, ['(', 'id', ')']).isAccepted, true);
	assert.equal(runCyk(grammar, ['(', 'id']).isAccepted, false);
});

test('acepta y rechaza frases con la gramática inglesa del proyecto', () => {
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

	assert.equal(runCyk(grammar, ['she', 'eats', 'a', 'cake']).isAccepted, true);
	assert.equal(
		runCyk(grammar, ['the', 'cat', 'drinks', 'the', 'beer']).isAccepted,
		true,
	);
	assert.equal(
		runCyk(grammar, ['she', 'cuts', 'the', 'cake', 'with', 'a', 'knife']).isAccepted,
		true,
	);
	assert.equal(runCyk(grammar, ['she', 'cake', 'eats', 'a']).isAccepted, false);
	assert.equal(runCyk(grammar, ['she', 'eats', 'pizza']).isAccepted, false);
});

test('construye la tabla triangular en la posición esperada', () => {
	const grammar = parseGrammar('S -> A B\nA -> a\nB -> b');
	const result = runCyk(grammar, ['a', 'b']);

	assert.equal(result.table.length, 2);
	assert.deepEqual(result.table.map((row) => row.length), [2, 1]);
	assert.deepEqual([...result.table[0]![0]!], ['A']);
	assert.deepEqual([...result.table[0]![1]!], ['B']);
	assert.deepEqual([...result.table[1]![0]!], ['S']);
	assert.equal(result.isAccepted, true);
});

test('rechaza tokens desconocidos sin lanzar un error', () => {
	const grammar = parseGrammar('S -> known');
	const result = runCyk(grammar, ['unknown']);

	assert.equal(result.isAccepted, false);
	assert.deepEqual([...result.table[0]![0]!], []);
});

test('maneja la cadena vacía mediante la producción inicial épsilon', () => {
	const acceptsEmpty = parseGrammar('S -> ε | a');
	const rejectsEmpty = parseGrammar('S -> a');

	assert.equal(runCyk(acceptsEmpty, []).isAccepted, true);
	assert.equal(runCyk(rejectsEmpty, []).isAccepted, false);
	assert.deepEqual(runCyk(acceptsEmpty, []).table, []);
});

test('rechaza una gramática que no está en CNF', async () => {
	const grammar = parseGrammar(await readFixture('1.txt'));

	assert.throws(
		() => runCyk(grammar, ['id']),
		(error) => error instanceof CykGrammarError && error.violations.length === 5,
	);
});

test('rechaza tokens vacíos y no modifica la entrada', () => {
	const grammar = parseGrammar('S -> a');
	const tokens = ['a'];

	assert.throws(() => runCyk(grammar, ['']), /no pueden estar vacíos/u);
	runCyk(grammar, tokens);
	assert.deepEqual(tokens, ['a']);
});
