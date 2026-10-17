import assert from 'node:assert/strict';
import test from 'node:test';

import { runCyk } from '../src/features/cfg-parser/algorighms/components/cyk.ts';
import { parseGrammar } from '../src/features/cfg-parser/algorighms/components/grammar-reader.ts';
import { tokenizeSentence } from '../src/features/cfg-parser/algorighms/components/sentence-tokenizer.ts';

const englishGrammar = `
S -> NP VP
VP -> VP PP | V NP | cooks | drinks | eats | cuts
PP -> P NP
NP -> Det N | he | she
V -> cooks | drinks | eats | cuts
P -> in | with
N -> cat | dog | beer | cake | juice | meat | soup | fork | knife | oven | spoon
Det -> a | the
`;

test('convierte mayúsculas a minúsculas', () => {
	assert.deepEqual(tokenizeSentence('SHE Eats A CaKe'), ['she', 'eats', 'a', 'cake']);
});

test('elimina . , ; : ? !', () => {
	assert.deepEqual(tokenizeSentence('She eats a cake with a fork;'), [
		'she', 'eats', 'a', 'cake', 'with', 'a', 'fork',
	]);
	assert.deepEqual(tokenizeSentence('he, eats. a: cake? yes!;'), [
		'he', 'eats', 'a', 'cake', 'yes',
	]);
});

test('trata espacios repetidos, tabulaciones y saltos de línea como un separador', () => {
	assert.deepEqual(tokenizeSentence('  THE   CAT\tdrinks the beer.  '), [
		'the', 'cat', 'drinks', 'the', 'beer',
	]);
	assert.deepEqual(tokenizeSentence('the\ncat\r\n\tdrinks \n\n the   beer'), [
		'the', 'cat', 'drinks', 'the', 'beer',
	]);
});

test('devuelve [] con entrada vacía o solo espacios', () => {
	assert.deepEqual(tokenizeSentence(''), []);
	assert.deepEqual(tokenizeSentence(' \t\n  '), []);
});

test('devuelve [] con entrada formada solo por puntuación', () => {
	assert.deepEqual(tokenizeSentence('.,;:?!'), []);
	assert.deepEqual(tokenizeSentence(' ! ? . \n , '), []);
});

test('conserva palabras desconocidas', () => {
	assert.deepEqual(tokenizeSentence('She eats pizza.'), ['she', 'eats', 'pizza']);
});

test('conserva paréntesis, + y *', () => {
	assert.deepEqual(tokenizeSentence('( id + id ) * id'), ['(', 'id', '+', 'id', ')', '*', 'id']);
});

test('no modifica palabras ni agrega tokens', () => {
	assert.deepEqual(tokenizeSentence('Cats running'), ['cats', 'running']);
});

test('integración: "She eats a cake" es aceptada por CYK', () => {
	const grammar = parseGrammar(englishGrammar);
	const tokens = tokenizeSentence('She eats a cake');

	assert.deepEqual(tokens, ['she', 'eats', 'a', 'cake']);
	assert.equal(runCyk(grammar, tokens).isAccepted, true);
});

test('integración: una palabra desconocida llega completa a CYK y se rechaza', () => {
	const grammar = parseGrammar(englishGrammar);
	const tokens = tokenizeSentence('She eats a pizza.');

	assert.deepEqual(tokens, ['she', 'eats', 'a', 'pizza']);
	assert.equal(runCyk(grammar, tokens).isAccepted, false);
});