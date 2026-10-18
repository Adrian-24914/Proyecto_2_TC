<script lang="ts">
	import type { CykResult } from '../algorighms/components/cyk.ts';
	import { escapeMath, renderMath } from '../utils/grammar-format.ts';
	import ParseTree from './ParseTree.svelte';

	interface Props {
		result: CykResult;
		sentence: string;
		onSentenceChange: (sentence: string) => void;
		label?: string;
	}

	let {
		result,
		sentence,
		onSentenceChange,
		label = 'Construcción de la tabla CYK'
	}: Props = $props();
	let currentIndex = $state(0);
	let stepCount = $derived(Math.max(result.table.length, 1));
	let activeIndex = $derived(Math.min(currentIndex, stepCount - 1));
	let activeLength = $derived(result.table.length === 0 ? 0 : activeIndex + 1);
	let rows = $derived(
		result.table.map((cells, index) => ({ length: index + 1, cells })).reverse()
	);

	function previous(): void {
		if (stepCount < 2) return;
		currentIndex = (activeIndex - 1 + stepCount) % stepCount;
	}

	function next(): void {
		if (stepCount < 2) return;
		currentIndex = (activeIndex + 1) % stepCount;
	}

	function renderCell(cell: Set<string>): string {
		if (cell.size === 0) return renderMath('\\varnothing');
		return renderMath(`\\{${[...cell].map(escapeMath).join(',\\;')}\\}`);
	}

	function fragment(start: number, length: number): string {
		return result.tokens.slice(start, start + length).join(' ');
	}

	$effect(() => {
		sentence;
		currentIndex = 0;
	});
</script>

<section class="carousel" aria-roledescription="carrusel" aria-label={label}>
	<section class="code-listing" aria-label="Edición de la cadena de entrada">
		<div class="listing-header">
			<span class="listing-title">Cadena de entrada</span>
		</div>

		<textarea
			value={sentence}
			rows="2"
			spellcheck="false"
			placeholder="she eats a cake"
			aria-label="Cadena que se validará con el algoritmo CYK"
			oninput={(event) => onSentenceChange(event.currentTarget.value)}
		></textarea>
	</section>

	<div class="controls">
		<button
			type="button"
			class="arrow"
			onclick={previous}
			disabled={stepCount < 2}
			aria-label="Mostrar el paso anterior"
		>←</button>

		<nav class="indicators" aria-label="Seleccionar un paso del algoritmo CYK">
			{#each Array(stepCount) as _, index}
				<button
					type="button"
					class:active={index === activeIndex}
					aria-current={index === activeIndex ? 'step' : undefined}
					aria-label={`Mostrar paso ${index + 1}: longitud ${result.table.length === 0 ? 0 : index + 1}`}
					onclick={() => (currentIndex = index)}
				>{index + 1}</button>
			{/each}
		</nav>

		<button
			type="button"
			class="arrow"
			onclick={next}
			disabled={stepCount < 2}
			aria-label="Mostrar el paso siguiente"
		>→</button>

		<p class="step-status" aria-live="polite">Paso {activeIndex + 1} de {stepCount}</p>
	</div>

	<div class="viewport">
		{#if result.tokens.length === 0}
			<p class="empty-table">
				La entrada es {@html renderMath('\\varepsilon')}; no se requieren celdas.
			</p>
		{:else}
			<p class="explanation">
				{#if activeLength === 1}
					Se inicializa una celda por terminal de la cadena.
				{:else}
					Se combinan las particiones de cada fragmento de longitud {activeLength}.
				{/if}
			</p>

			<div class="cyk-table" role="table" aria-label="Tabla triangular del algoritmo CYK">
				{#each rows as row (row.length)}
					<div
						class="cyk-row"
						class:current={row.length === activeLength}
						class:pending={row.length > activeLength}
						role="row"
					>
						{#each row.cells as cell, start}
							<div
								class="cyk-cell"
								role="cell"
								title={`Fragmento: ${fragment(start, row.length)}`}
								aria-label={`Longitud ${row.length}, posición ${start + 1}: ${row.length <= activeLength ? [...cell].join(', ') || 'conjunto vacío' : 'pendiente'}`}
							>
								{#if row.length <= activeLength}
									{@html renderCell(cell)}
								{:else}
									<span aria-hidden="true">·</span>
								{/if}
							</div>
						{/each}
					</div>
				{/each}

				<div class="token-row" role="row">
					{#each result.tokens as token, index (`${token}-${index}`)}
						<div role="columnheader">{@html renderMath(escapeMath(token))}</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if activeIndex === stepCount - 1}
			<p class:accepted={result.isAccepted} class:rejected={!result.isAccepted} class="result">
				La cadena <strong>{result.isAccepted ? 'pertenece' : 'no pertenece'}</strong> al lenguaje.
			</p>

			{#if result.isAccepted && result.parseTree}
				<ParseTree tree={result.parseTree} />
			{/if}
		{/if}
	</div>

</section>

<style>
	.carousel {
		margin: 1.5rem 0 3rem;
	}

	.code-listing {
		margin: 0 0 1.5rem;
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


	textarea {
		display: block;
		box-sizing: border-box;
		width: 100%;
		border: none;
		border-left: 2px solid #000000;
		border-radius: 0;
		background: transparent;
		color: #000000;
		margin: 0.4rem 0 0;
		padding: 0.3rem 0.75rem;
		box-shadow: none;
		font-family: 'Latin Modern Mono', monospace;
		font-size: 0.95rem;
		line-height: 1.6;
		resize: vertical;
		outline: none;
	}

	textarea:focus {
		background: #ffffff;
		border-left-color: #000000;
	}

	.controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.25rem;
	}

	.step-status {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	button {
		border: 1px solid #000000;
		border-radius: 0;
		background: #ffffff;
		color: #000000;
		font: inherit;
		cursor: pointer;
	}

	button:hover,
	button:focus-visible,
	button.active {
		background: #000000;
		color: #ffffff;
	}

	button:focus-visible {
		outline: 2px solid #ffffff;
		outline-offset: -3px;
	}

	button:disabled {
		cursor: default;
		opacity: 0.4;
	}

	.arrow {
		flex: 0 0 auto;
		width: 2.1rem;
		height: 2.1rem;
		padding: 0;
		font-size: 1.2rem;
		line-height: 1;
	}

	.viewport {
		min-width: 0;
		padding: 1rem 0;
	}

	.explanation,
	.empty-table,
	.result {
		text-align: center;
	}

	.cyk-table {
		--cell-size: clamp(3rem, 10vw, 5rem);
		overflow-x: auto;
		padding: 0.5rem 0 0.75rem;
	}

	.cyk-row,
	.token-row {
		display: flex;
		justify-content: center;
		gap: 0.3rem;
		min-width: max-content;
	}

	.cyk-cell,
	.token-row > div {
		box-sizing: border-box;
		width: var(--cell-size);
		min-height: 2.7rem;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
	}

	.cyk-cell {
		border: 0.5pt solid #777777;
		background: #ffffff;
		transition: background-color 120ms ease;
	}

	.cyk-row.current .cyk-cell {
		border-color: #000000;
		border-width: 1.5pt;
		background: #f0f0ed;
	}

	.cyk-row.pending .cyk-cell {
		border-style: dashed;
		color: #999999;
	}

	.token-row {
		margin-top: 0.35rem;
		border-top: 0.5pt solid #000000;
		font-size: 0.9rem;
	}

	.result {
		margin-bottom: 0;
	}

	.accepted {
		color: #195c2b;
	}

	.rejected {
		color: #8a1c1c;
	}

	.indicators {
		display: flex;
		justify-content: center;
		flex: 0 0 auto;
		gap: 0.5rem;
	}

	.indicators button {
		width: 1.8rem;
		height: 1.8rem;
		padding: 0;
		font-size: 0.82rem;
	}

	@media (max-width: 560px) {
		.listing-header {
			flex-direction: column;
			gap: 0.2rem;
		}
	}
</style>
