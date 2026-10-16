import { readFile } from 'node:fs/promises';

import { validateChomskyNormalForm } from '../src/features/cfg-parser/algorighms/components/cnf-validator.ts';
import {
	runCyk,
	type ParseTreeNode,
} from '../src/features/cfg-parser/algorighms/components/cyk.ts';
import { convertToChomskyNormalForm } from '../src/features/cfg-parser/algorighms/components/cfg_minimization.ts';
import {
	parseGrammar,
	type Grammar,
} from '../src/features/cfg-parser/algorighms/components/grammar-reader.ts';

const grammarText = await readFile(
	new URL('../cfg-input/gramatica.txt', import.meta.url),
	'utf8',
);
const inputText = await readFile(
	new URL('../cfg-input/cadena.txt', import.meta.url),
	'utf8',
);
const sourceGrammar = parseGrammar(grammarText);
const tokens = inputText.trim() === '' ? [] : inputText.trim().split(/\s+/u);
const initialValidation = validateChomskyNormalForm(sourceGrammar);

console.log('=== ENTRADA ===');
printGrammar('Gramática ingresada', sourceGrammar);
console.log(`Cadena: ${tokens.length === 0 ? 'ε' : tokens.join(' ')}`);

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

const result = runCyk(grammar, tokens);

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
console.log(result.isAccepted ? 'CADENA ACEPTADA' : 'CADENA RECHAZADA');

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
