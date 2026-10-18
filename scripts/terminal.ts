import { readFile } from 'node:fs/promises';

import { validateChomskyNormalForm } from '../src/features/cfg-parser/algorithms/cnf-validator.ts';
import {
	runCyk,
	type ParseTreeNode,
} from '../src/features/cfg-parser/algorithms/cyk.ts';
import { tokenizeSentence } from '../src/features/cfg-parser/algorithms/sentence-tokenizer.ts';
import { convertToChomskyNormalForm } from '../src/features/cfg-parser/algorithms/cfg_minimization.ts';
import {
	parseGrammar,
	type Grammar,
} from '../src/features/cfg-parser/algorithms/grammar-reader.ts';

const grammarText = await readFile(
	new URL('../cfg-input/gramatica.txt', import.meta.url),
	'utf8',
);
const inputText = await readFile(
	new URL('../cfg-input/cadena.txt', import.meta.url),
	'utf8',
);
const sourceGrammar = parseGrammar(grammarText);
const tokens = tokenizeSentence(inputText);
if (tokens.length === 0) {
	console.log('La frase está vacía: escriba una frase en cfg-input/cadena.txt');
	process.exit(1);
}
const initialValidation = validateChomskyNormalForm(sourceGrammar);

console.log('=== ENTRADA ===');
printGrammar('Gramática ingresada', sourceGrammar);
console.log(`Frase: ${inputText.trim()}`);
console.log(`Tokens: ${tokens.join(' ')}`);

let grammar = sourceGrammar;
if (initialValidation.isValid) {
	console.log('\nLa gramática ya está en Forma Normal de Chomsky.');
} else {
	console.log('\n=== CONVERSIÓN A FORMA NORMAL DE CHOMSKY ===');
	console.log('Producciones que no cumplen CNF:');
	for (const { production, reason } of initialValidation.violations) {
		console.log(`  ${formatProduction(production.left, production.right)} (${reason})`);
	}

	const conversion = convertToChomskyNormalForm(sourceGrammar);
	printGrammar('1. Sin producciones épsilon', conversion.withoutEpsilonProductions);
	printGrammar('2. Sin producciones unitarias', conversion.withoutUnitProductions);
	printGrammar('3. Sin símbolos inútiles', conversion.withoutUselessSymbols);
	printGrammar('4. Gramática final en CNF', conversion.grammar);
	grammar = conversion.grammar;
}

const cykStart = performance.now();
const result = runCyk(grammar, tokens);
const cykDuration = performance.now() - cykStart;

console.log('\n=== PROCESO CYK ===');
if (result.table.length === 0) {
	console.log('La cadena es vacía; se comprueba la producción inicial de ε.');
} else {
	for (const [rowIndex, row] of result.table.entries()) {
		const length = rowIndex + 1;
		console.log(`Longitud ${length}:`);
		for (const [start, symbols] of row.entries()) {
			const fragment = tokens.slice(start, start + length).join(' ');
			console.log(`  [${fragment}] = {${[...symbols].join(', ') || '∅'}}`);
		}
	}
}

console.log('\n=== RESULTADO ===');
console.log(result.isAccepted ? 'SÍ' : 'NO');
console.log(`Tiempo de ejecución CYK: ${cykDuration.toFixed(3)} ms`);

if (result.parseTree !== null) {
	console.log('\nÁrbol sintáctico:');
	printParseTree(result.parseTree);
}

function printGrammar(title: string, grammarToPrint: Grammar): void {
	console.log(`\n${title}:`);
	console.log(`  Símbolo inicial: ${grammarToPrint.startSymbol}`);
	for (const production of grammarToPrint.productions) {
		console.log(`  ${formatProduction(production.left, production.right)}`);
	}
}

function formatProduction(left: string, right: string[]): string {
	return `${left} -> ${right.length === 0 ? 'ε' : right.join(' ')}`;
}

function printParseTree(node: ParseTreeNode, indent = ''): void {
	console.log(`${indent}${node.symbol}`);
	for (const child of node.children) {
		printParseTree(child, `${indent}  `);
	}
}