<script lang="ts">
	import type { Grammar as GrammarData } from '../algorighms/components/grammar-reader.ts';
	import Grammar from './Grammar.svelte';

	interface GrammarStep {
		heading: string;
		grammar: GrammarData;
	}

	interface Props {
		steps: GrammarStep[];
		label?: string;
	}

	let { steps, label = 'Pasos de normalización de la gramática' }: Props = $props();
	let currentIndex = $state(0);
	let currentStep = $derived(steps[currentIndex]);

	function previous(): void {
		if (steps.length < 2) return;
		currentIndex = (currentIndex - 1 + steps.length) % steps.length;
	}

	function next(): void {
		if (steps.length < 2) return;
		currentIndex = (currentIndex + 1) % steps.length;
	}

</script>

<section
	class="carousel"
	aria-roledescription="carrusel"
	aria-label={label}
>
	{#if currentStep}
		<div class="controls">
			<button
				type="button"
				class="arrow"
				onclick={previous}
				disabled={steps.length < 2}
				aria-label="Mostrar el paso anterior"
			>←</button>

			<nav class="indicators" aria-label="Seleccionar un paso de normalización">
				{#each steps as step, index (step.heading)}
					<button
						type="button"
						class:active={index === currentIndex}
						aria-current={index === currentIndex ? 'step' : undefined}
						aria-label={`Mostrar ${step.heading}`}
						onclick={() => currentIndex = index}
					>{index + 1}</button>
				{/each}
			</nav>

			<button
				type="button"
				class="arrow"
				onclick={next}
				disabled={steps.length < 2}
				aria-label="Mostrar el paso siguiente"
			>→</button>

			<p class="step-status" aria-live="polite">Paso {currentIndex + 1} de {steps.length}</p>
		</div>

		<div class="viewport">
			{#key currentIndex}
				<Grammar grammar={currentStep.grammar} heading={currentStep.heading} />
			{/key}
		</div>

	{:else}
		<p class="empty">No hay pasos de normalización disponibles.</p>
	{/if}
</section>

<style>
	.carousel {
		margin: 1.5rem 0 3rem;
		outline: none;
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

	.empty {
		font-style: italic;
		text-align: center;
	}
</style>
