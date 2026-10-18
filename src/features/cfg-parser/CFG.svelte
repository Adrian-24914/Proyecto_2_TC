<script lang="ts">
	import { convertToChomskyNormalForm } from './algorighms/components/cfg_minimization.ts';
	import { runCyk } from './algorighms/components/cyk.ts';
	import { parseGrammar, type Grammar as GrammarData } from './algorighms/components/grammar-reader.ts';
	import { tokenizeSentence } from './algorighms/components/sentence-tokenizer.ts';
	import CYKRunner from './components/CYKRunner.svelte';
	import Grammar from './components/Grammar.svelte';
	import GrammarContainer from './components/GrammarContainer.svelte';

	function dedent(str: string): string {
		return str
			.trim()
			.split('\n')
			.map(line => line.trim())
			.join('\n');
	}

	const initialSource = dedent(`
		S -> NP VP
		VP -> VP PP
		VP -> V NP
		VP -> cooks | drinks | eats | cuts
		PP -> P NP
		NP -> Det N
		NP -> he | she
		V -> cooks | drinks | eats | cuts
		P -> in | with
		N -> cat | dog
		N -> beer | cake | juice | meat | soup
		N -> fork | knife | oven | spoon
		Det -> a | the
	`);

	let grammar = $state(parseGrammar(initialSource));
	let conversion = $derived(convertToChomskyNormalForm(grammar));
	let sentence = $state('She eats a cake with a fork');
	let sentenceTokens = $derived(tokenizeSentence(sentence));
	let cykResult = $derived(runCyk(conversion.grammar, sentenceTokens));
	let normalizationSteps = $derived([
		{
			heading: 'Paso 1: eliminación de producciones ε.',
			grammar: conversion.withoutEpsilonProductions
		},
		{
			heading: 'Paso 2: eliminación de producciones unitarias.',
			grammar: conversion.withoutUnitProductions
		},
		{
			heading: 'Paso 3: eliminación de símbolos inútiles.',
			grammar: conversion.withoutUselessSymbols
		},
		{
			heading: 'Paso 4 (final): forma normal de Chomsky.',
			grammar: conversion.grammar
		}
	]);

	function updateGrammar(updated: GrammarData): void {
		grammar = updated;
	}
</script>

<svelte:head>
	<title>Gramáticas libres de contexto</title>
	<meta
		name="description"
		content="Parsing de gramáticas libres de contexto"
	/>
</svelte:head>

<main class="paper">
	<header>
		<p class="eyebrow">Teoría de la computación</p>
		<h1>Gramáticas libres de contexto</h1>
		<section class="authors" aria-label="Autores">
			<span class="author">Adrian Penagos</span>
			<span class="author-sep" aria-hidden="true">•</span>
			<span class="author">Oscar Rompich</span>
			<span class="author-sep" aria-hidden="true">•</span>
			<span class="author">Wilson Arodi</span>
		</section>

		<section class="abstract" aria-label="Resumen">
			<h2 class="abstract-title">Resumen</h2>
			<p>
				Aplicación para validar oraciones simples en inglés mediante gramáticas 
				libres de contexto (CFG). El sistema convierte la gramática a 
				Forma Normal de Chomsky (CNF), normaliza la frase de entrada y, 
				a través del algoritmo CYK, evalúa su pertenencia al lenguaje reportando 
				la aceptación o rechazo, el tiempo de cómputo y el árbol sintáctico correspondiente 
				si es válida.
			</p>
		</section>
	</header>

	<section aria-labelledby="cnf-heading">
		<h2 id="cnf-heading" class="section-title">1. Definición de la gramática</h2>
		<Grammar
			grammar={grammar}
			source={initialSource}
			editable
			onGrammarChange={updateGrammar}
		/>
	</section>

	<section aria-labelledby="normalization-heading">
		<h2 id="normalization-heading" class="section-title">2. Simplificación de la gramática</h2>
		<GrammarContainer steps={normalizationSteps} />
	</section>

	<section aria-labelledby="cyk-heading">
		<h2 id="cyk-heading" class="section-title">3. Algoritmo Cocke-Younger-Kasami</h2>
		<CYKRunner
			result={cykResult}
			{sentence}
			onSentenceChange={(value) => (sentence = value)}
		/>
	</section>
</main>

<style>
	:global(html) {
		background-color: #e5e5e5;
		color-scheme: light;
	}

	:global(body) {
		margin: 0;
		padding: 3rem 1rem 6rem;
		width: 100%;
		max-width: none;
		min-height: 100vh;
		display: flex;
		justify-content: center;
		color: #000000;
		font-family: 'Latin Modern Roman', 'Computer Modern', Georgia, serif;
		-webkit-font-smoothing: antialiased;
		line-height: 1.5;
		box-sizing: border-box;
	}


	.paper {
		width: 100%;
		max-width: 48rem;
		margin: 0 auto;
		min-height: 842px;
		background: #ffffff;
		padding: 5rem 4.5rem 6rem;
		box-sizing: border-box;
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.08),
			0 8px 24px rgba(0, 0, 0, 0.09);
	}

	header {
		margin: 0 0 1.5rem;
		text-align: center;
	}

	.eyebrow {
		margin: 0 0 0.85rem;
		font-variant: small-caps;
		letter-spacing: 0.14em;
		font-size: 0.95rem;
		color: #333333;
	}

	h1 {
		margin: 0 0 2.25rem;
		font-size: 2.15rem;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}

	.authors {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 1.5rem;
		margin: 0 0 2.5rem;
		font-size: 1.05rem;
		color: #111111;
	}

	.author {
		margin: 0;
	}

	.author-sep {
		color: #888888;
		font-size: 0.75rem;
	}


	.abstract {
		max-width: 40rem;
		margin: 0 auto;
		text-align: justify;
		text-justify: inter-word;
	}

	.abstract-title {
		margin: 0 0 0.4rem;
		font-weight: 700;
		font-size: 0.92rem;
		text-align: center;
		font-variant: small-caps;
		letter-spacing: 0.05em;
		border: none;
		padding: 0;
	}

	.abstract p {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.45;
		color: #1a1a1a;
	}

	.section-title {
		margin: 3.5rem 0 0rem;
		font-size: 1.35rem;
		font-weight: 700;
		text-align: left;
	}

	@media (max-width: 768px) {
		:global(body) {
			padding: 0;
			background-color: #ffffff;
		}

		.paper {
			box-shadow: none;
			padding: 1.5rem 1.25rem 4rem;
			min-height: auto;
		}

		h1 {
			font-size: 1.75rem;
		}

		.abstract {
			text-align: left;
		}
	}
</style>
