<script lang="ts">
	import { parseGrammar, type Grammar } from '../algorighms/components/grammar-reader.ts';
	import { groupProductions, grammarToSource, escapeMath, renderMath, renderProductionRule } from '../utils/grammar-format.ts';

	interface Props {
		grammar: Grammar;
		heading?: string;
		editable?: boolean;
		source?: string;
		onGrammarChange?: (grammar: Grammar, source: string) => void;
	}

	let {
		grammar,
		heading = 'Definición 1.1 (Gramática Libre de Contexto).',
		editable = false,
		source,
		onGrammarChange
	}: Props = $props();

	let draft = $state(initialDraft());
	let editedGrammar = $state<Grammar | null>(null);
	let error = $state('');
	let textarea = $state<HTMLTextAreaElement>();

	let currentGrammar = $derived(editedGrammar ?? grammar);
	let groupedProductions = $derived(groupProductions(currentGrammar));

	function initialDraft(): string {
		return source ?? grammarToSource(grammar);
	}

	function handleInput(value: string): void {
		draft = value;
		try {
			const parsed = parseGrammar(value);
			editedGrammar = parsed;
			error = '';
			onGrammarChange?.(parsed, value);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'La gramática no es válida';
		}
	}

	function renderSetItem(symbol: string, index: number, size: number): string {
		const openingBrace = index === 0 ? '\\{' : '';
		const ending = index === size - 1 ? '\\}' : ',\\;';
		return renderMath(`${openingBrace}${escapeMath(symbol)}${ending}`);
	}
</script>

{#snippet symbolSet(symbols: Set<string>)}
	<span class="set">
		{#if symbols.size === 0}
			{@html renderMath('\\varnothing')}
		{:else}
			{#each symbols as symbol, index (symbol)}
				<span class="set-item">{@html renderSetItem(symbol, index, symbols.size)}</span>
			{/each}
		{/if}
	</span>
{/snippet}

<article class="grammar" class:editable>
	<p class="heading"><strong>{heading}</strong></p>

	<p>{#if editable} Sea la gramática {/if} {@html renderMath('G = (V, \\Sigma, R, S)')}, donde:</p>

	<dl>
		<div>
			<dt>Variables ({@html renderMath('V')}):</dt>
			<dd>{@render symbolSet(currentGrammar.nonTerminals)}</dd>
		</div>

		<div>
			<dt>Terminales ({@html renderMath('\\Sigma')}):</dt>
			<dd>{@render symbolSet(currentGrammar.terminals)}</dd>
		</div>

		<div>
			<dt>Símbolo inicial ({@html renderMath('S')}):</dt>
			<dd><span class="set">{@html renderMath(escapeMath(currentGrammar.startSymbol))}</span></dd>
		</div>
	</dl>

	<p>Y las reglas de producción ({@html renderMath('R')}):</p>

	<ul class="productions" aria-label="Reglas de producción">
		{#each groupedProductions as { left, alternatives } (left)}
			<li>
				<span>{@html renderProductionRule(left, alternatives)}</span>
			</li>
		{/each}
	</ul>

	{#if editable}
		<label class="editor">
			<span>Editar gramática</span>
			<textarea
				bind:this={textarea}
				value={draft}
				rows={Math.max(5, draft.split('\n').length + 1)}
				spellcheck="false"
				oninput={(e) => handleInput(e.currentTarget.value)}
			></textarea>
		</label>
		<p class="hint">Formato: <code>S -&gt; a S b | &epsilon;</code> (usa espacios entre símbolos).</p>
		{#if error}<p class="error" role="alert">{error}</p>{/if}
	{/if}
</article>

<style>
	.grammar {
		margin: 2rem 0;
		padding: 0.5rem 0 1.5rem;
		background: #ffffff;
		color: #000000;
		font-family: 'Latin Modern Roman', 'Computer Modern', Georgia, serif;
	}
	.grammar:not(.editable) {
		border-top: 0.5pt solid #000000;
	}
	.heading {
		margin-bottom: 0.5rem;
	}

	dl {
		margin: 1rem 0;
	}
	dl > div {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		min-width: 0;
		margin: 0.35rem 0;
	}
	dt {
		flex: 0 0 auto;
		font-weight: 700;
		margin: 0;
		white-space: nowrap;
	}
	dd {
		min-width: 0;
		margin: 0;
	}
	.set {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		max-width: 100%;
		min-width: 0;
		vertical-align: baseline;
	}
	.set-item {
		display: inline-block;
		white-space: nowrap;
	}

	.productions {
		list-style: none;
		padding: 0;
		width: fit-content;
		max-width: 100%;
		margin: 1rem auto 1.5rem;
	}
	.productions li {
		display: flex;
		align-items: baseline;
		min-height: 1.8rem;
		font-size: 1.05rem;
	}

	.editor {
		display: block;
		margin-top: 1.5rem;
		font-weight: 700;
	}
	textarea {
		box-sizing: border-box;
		width: 100%;
		margin-top: 0.4rem;
		padding: 0.75rem;
		border: 1px solid #000000;
		background: #ffffff;
		color: #000000;
		box-shadow: none;
		border-radius: 0;
		font-family: 'Latin Modern Mono', monospace;
		font-size: 0.95rem;
		line-height: 1.5;
		resize: vertical;
	}
	textarea:focus {
		outline: 1.5px solid #000000;
		outline-offset: 1px;
	}
	.hint, .error {
		margin-top: 0.4rem;
		font-size: 0.85rem;
	}
	.hint {
		color: #555555;
	}
	.error {
		color: #990000;
		font-weight: 700;
	}

	@media (max-width: 560px) {
		dl > div {
			align-items: flex-start;
		}
	}
</style>
