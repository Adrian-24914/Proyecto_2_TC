<script lang="ts">
	import { parseGrammar, type Grammar } from '../algorighms/components/grammar-reader.ts';
	import { groupProductions, grammarToSource, escapeMath, renderMath, renderProductionRight, markWrappedAlternatives, renderSetItem} from '../utils/grammar-format.ts';

	interface Props {
		grammar: Grammar;
		heading?: string;
		editable?: boolean;
		source?: string;
		onGrammarChange?: (grammar: Grammar, source: string) => void;
	}

	let {
		grammar,
		heading = '',
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

	{#if editable} <p>Sea la gramática {@html renderMath('G = (V, \\Sigma, R, S)')}, donde:</p> {/if}

	<dl>
		<div>
			<dt>
				{#if editable}
					Variables ({@html renderMath('V')}):
				{:else}
					{@html renderMath('V')}:
				{/if}
			</dt>
			<dd>{@render symbolSet(currentGrammar.nonTerminals)}</dd>
		</div>

		<div>
			<dt>
				{#if editable}
					Terminales ({@html renderMath('\\Sigma')}):
				{:else}
					{@html renderMath('\\Sigma')}:
				{/if}
			</dt>
			<dd>{@render symbolSet(currentGrammar.terminals)}</dd>
		</div>

		<div>
			<dt>
				{#if editable}
					Símbolo inicial ({@html renderMath('S')}):
				{:else}
					{@html renderMath('S')}:
				{/if}
			</dt>
			<dd><span class="set">{@html renderMath(escapeMath(currentGrammar.startSymbol))}</span></dd>
		</div>
	</dl>

	<p>Y las reglas de producción ({@html renderMath('R')}):</p>

	<table class="productions" aria-label="Reglas de producción">
		<tbody>
			{#each groupedProductions as { left, alternatives } (left)}
				<tr>
					<td class="production-variable">{@html renderMath(escapeMath(left))}</td>
					<td class="production-arrow">{@html renderMath('\\rightarrow')}</td>
					<td class="production-right">
						<span class="production-alternatives" use:markWrappedAlternatives={alternatives}>
							{#each alternatives as alternative, index}
								<span class="production-alternative">
									{#if index > 0}
										<span class="continuation-prefix" aria-hidden="true">
											{@html renderMath(escapeMath(left))}
											{@html renderMath('\\rightarrow')}
										</span>
										<span class="production-separator">{@html renderMath('\\mid')}</span>
									{/if}
									{@html renderProductionRight([alternative])}
								</span>
							{/each}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if editable}
		<section class="code-listing" aria-label="Edición de gramática fuente">
			<div class="listing-header">
				<span class="listing-title">Editor de gramática</span>
				<span class="listing-format">formato: <code>S -&gt; a S b | &epsilon;</code></span>
			</div>
			
			<textarea
				bind:this={textarea}
				value={draft}
				rows={Math.max(4, draft.split('\n').length)}
				spellcheck="false"
				aria-label="Código de la gramática"
				oninput={(e) => handleInput(e.currentTarget.value)}
			></textarea>

			{#if error}
				<p class="listing-error" role="alert">
					<strong>Error sintáctico:</strong> {error}
				</p>
			{/if}
		</section>
	{/if}
</article>

<style>
	.grammar {
		margin: 0.9rem 0;
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

	.productions,
	.productions tbody,
	.productions tr,
	.productions td {
		border: none !important;
		outline: none !important;
		box-shadow: none !important;
	}

	.productions {
		border-collapse: collapse;
		width: fit-content;
		max-width: min(100%, 25rem);
		margin: 1rem auto 1.5rem;
	}
	.productions td {
		padding: 0 0.3rem;
		vertical-align: baseline;
		text-align: left;
		min-height: 1.8rem;
		font-size: 1.05rem;
	}
	.productions .production-variable {
		padding-left: 0;
		text-align: right;
		white-space: nowrap;
	}
	.productions .production-arrow {
		white-space: nowrap;
	}
	.productions .production-right {
		padding-right: 0;
	}
	.production-alternatives {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: 1.1rem;
		max-width: 100%;
	}
	.production-alternative {
		position: relative;
		display: inline-flex;
		align-items: baseline;
		white-space: nowrap;
	}
	.production-separator {
		position: absolute;
		right: calc(100% + 0.35rem);
	}
	.continuation-prefix {
		display: none;
	}
	.production-alternative:global(.line-start) .production-separator {
		visibility: hidden;
	}
	.production-alternative:global(.line-start) .continuation-prefix {
		position: absolute;
		top: 0;
		right: calc(100% + 0.6rem);
		display: inline-flex;
		align-items: baseline;
		gap: 0.6rem;
	}

	.code-listing {
		margin-top: 1.75rem;
		border-top: 0.5pt solid #000000;
		border-bottom: 0.5pt solid #000000;
		padding: 0.4rem 0 0.6rem;
		background: #fafaf9;
	}

	.listing-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0 0.5rem 0.3rem;
		font-size: 0.8rem;
		border-bottom: 0.5pt solid #dedede;
	}

	.listing-title {
		font-variant: small-caps;
		letter-spacing: 0.05em;
		font-weight: 700;
		color: #333333;
	}

	.listing-format {
		color: #666666;
	}

	.listing-format code {
		font-family: 'Latin Modern Mono', monospace;
		font-size: 0.82rem;
		color: #000000;
	}

	textarea {
		display: block;
		box-sizing: border-box;
		width: 100%;
		border: none;
		border-left: 2px solid #000000;
		background: transparent;
		color: #000000;
		margin: 0.4rem 0 0;
		padding: 0.3rem 0.75rem;
		box-shadow: none;
		border-radius: 0;
		font-family: 'Latin Modern Mono', monospace;
		font-size: 0.95rem;
		line-height: 1.6;
		resize: vertical;
		outline: none;
	}

	textarea:focus {
		background: #ffffff;
		border-left: 2px solid #000000;
	}

	.listing-error {
		margin: 0.4rem 0.5rem 0;
		padding-top: 0.35rem;
		border-top: 0.5pt dashed #990000;
		font-size: 0.85rem;
		color: #990000;
		line-height: 1.4;
	}

	@media (max-width: 560px) {
		dl > div {
			align-items: flex-start;
		}
		.listing-header {
			flex-direction: column;
			gap: 0.2rem;
		}
	}
</style>
