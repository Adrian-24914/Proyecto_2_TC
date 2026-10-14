import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { isInChomskyNormalForm } from '../src/features/cfg-parser/algorighms/components/cnf-validator.ts';
import { convertToChomskyNormalForm } from '../src/features/cfg-parser/algorighms/components/cfg_minimization.ts';
import { parseGrammar } from '../src/features/cfg-parser/algorighms/components/grammar-reader.ts';

async function readFixture(name: string): Promise<string> {
	return readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

test('convierte 1.txt a una gramática en CNF', async () => {
	const source = parseGrammar(await readFixture('1.txt'));
	const result = convertToChomskyNormalForm(source);

	assert.equal(isInChomskyNormalForm(result.grammar), true);
	assert.equal(result.grammar.productions.length, 20);
	assert.equal(result.grammar.nonTerminals.size, 12);
	assert.deepEqual([...result.grammar.terminals].sort(), ['(', ')', '*', '+', 'id'].sort());
	assert.equal(
		result.grammar.productions.some((production) => production.right.length === 0),
		false,
	);
	assert.equal(
		result.grammar.productions.some(
			(production) =>
				production.right.length === 1 &&
				result.grammar.nonTerminals.has(production.right[0]!),
		),
		false,
	);
});

test('mantiene sin cambios una gramática que ya está en CNF', async () => {
	const source = parseGrammar(await readFixture('1-cnf.txt'));
	const result = convertToChomskyNormalForm(source);

	assert.equal(isInChomskyNormalForm(result.grammar), true);
	assert.deepEqual(result.grammar.productions, source.productions);
	assert.deepEqual([...result.grammar.nonTerminals], [...source.nonTerminals]);
	assert.deepEqual([...result.grammar.terminals], [...source.terminals]);
});

test('elimina épsilon y conserva las combinaciones necesarias', () => {
	const source = parseGrammar('S -> A B\nA -> ε | a\nB -> b');
	const result = convertToChomskyNormalForm(source);

	assert.equal(isInChomskyNormalForm(result.grammar), true);
	assert.ok(
		result.grammar.productions.some(
			(production) => production.left === 'S' && production.right.join(' ') === 'A B',
		),
	);
	assert.ok(
		result.grammar.productions.some(
			(production) => production.left === 'S' && production.right.join(' ') === 'b',
		),
	);
	assert.equal(
		result.grammar.productions.some((production) => production.right.length === 0),
		false,
	);
});

test('elimina cadenas de producciones unitarias', () => {
	const source = parseGrammar('S -> A\nA -> B\nB -> b');
	const result = convertToChomskyNormalForm(source);

	assert.deepEqual(result.grammar.productions, [{ left: 'S', right: ['b'] }]);
	assert.equal(isInChomskyNormalForm(result.grammar), true);
});

test('elimina símbolos no generadores e inalcanzables', () => {
	const source = parseGrammar('S -> A B\nA -> a\nB -> b\nC -> c\nD -> D');
	const result = convertToChomskyNormalForm(source);

	assert.equal(result.grammar.nonTerminals.has('C'), false);
	assert.equal(result.grammar.nonTerminals.has('D'), false);
	assert.equal(isInChomskyNormalForm(result.grammar), true);
});

test('conserva el símbolo inicial cuando la gramática genera el lenguaje vacío', () => {
	const source = parseGrammar('S -> A\nA -> A');
	const result = convertToChomskyNormalForm(source);

	assert.equal(result.grammar.startSymbol, 'S');
	assert.deepEqual([...result.grammar.nonTerminals], ['S']);
	assert.deepEqual(result.grammar.productions, []);
	assert.equal(isInChomskyNormalForm(result.grammar), true);
});

test('aísla terminales y divide producciones largas', () => {
	const source = parseGrammar('S -> a A B C\nA -> a\nB -> b\nC -> c');
	const result = convertToChomskyNormalForm(source);

	assert.equal(isInChomskyNormalForm(result.grammar), true);
	assert.ok(
		result.grammar.productions.every(
			(production) =>
				production.right.length <= 2 &&
				(production.right.length !== 2 ||
					production.right.every((symbol) => result.grammar.nonTerminals.has(symbol))),
		),
	);
});

test('reutiliza el mismo auxiliar para sufijos repetidos', () => {
	const source = parseGrammar('S -> a A B | b A B\nA -> a\nB -> b');
	const result = convertToChomskyNormalForm(source);
	const suffixProductions = result.grammar.productions.filter(
		(production) => production.right.join(' ') === 'A B',
	);

	assert.equal(isInChomskyNormalForm(result.grammar), true);
	assert.equal(suffixProductions.length, 1);
	const helper = suffixProductions[0]!.left;
	assert.equal(
		result.grammar.productions.filter((production) => production.right[1] === helper).length,
		2,
	);
});

test('crea un nuevo inicio cuando el inicio anulable aparece a la derecha', () => {
	const source = parseGrammar('S -> A S | ε\nA -> a');
	const result = convertToChomskyNormalForm(source);

	assert.notEqual(result.grammar.startSymbol, 'S');
	assert.equal(isInChomskyNormalForm(result.grammar), true);
	assert.ok(
		result.grammar.productions.some(
			(production) =>
				production.left === result.grammar.startSymbol && production.right.length === 0,
		),
	);
	assert.equal(
		result.grammar.productions.some((production) =>
			production.right.includes(result.grammar.startSymbol),
		),
		false,
	);
});

test('no modifica la gramática de entrada', async () => {
	const source = parseGrammar(await readFixture('1.txt'));
	const originalProductions = structuredClone(source.productions);

	convertToChomskyNormalForm(source);

	assert.deepEqual(source.productions, originalProductions);
});
