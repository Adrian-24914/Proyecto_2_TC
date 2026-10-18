<script lang="ts">
	import type { ParseTreeNode } from '../algorithms/cyk.ts';
	import { escapeMath, renderMath } from '../utils/grammar-format.ts';

	interface Props {
		tree: ParseTreeNode;
		caption?: string;
	}

	let { tree, caption = 'árbol sintáctico' }: Props = $props();

	let scale = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);
	let isDragging = $state(false);
	let dragStartX = 0;
	let dragStartY = 0;
	let initialTx = 0;
	let initialTy = 0;

	const MIN_SCALE = 0.3;
	const MAX_SCALE = 3.0;

	function handlePointerDown(e: PointerEvent): void {
		if (e.button !== 0) return;
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		initialTx = translateX;
		initialTy = translateY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent): void {
		if (!isDragging) return;
		translateX = initialTx + (e.clientX - dragStartX);
		translateY = initialTy + (e.clientY - dragStartY);
	}

	function handlePointerUp(e: PointerEvent): void {
		if (!isDragging) return;
		isDragging = false;
		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
		}
	}

	function handleWheel(e: WheelEvent): void {
		e.preventDefault();
		const zoomFactor = 1.1;
		const direction = e.deltaY < 0 ? 1 : -1;
		const newScale = Math.min(
			MAX_SCALE,
			Math.max(MIN_SCALE, direction > 0 ? scale * zoomFactor : scale / zoomFactor)
		);

		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		const ratio = newScale / scale;
		translateX = mouseX - ratio * (mouseX - translateX);
		translateY = mouseY - ratio * (mouseY - translateY);
		scale = newScale;
	}

	function resetTransform(): void {
		scale = 1;
		translateX = 0;
		translateY = 0;
	}

	function zoomIn(): void {
		scale = Math.min(MAX_SCALE, scale * 1.2);
	}

	function zoomOut(): void {
		scale = Math.max(MIN_SCALE, scale / 1.2);
	}

	$effect(() => {
		tree;
		resetTransform();
	});
</script>

{#snippet treeNode(node: ParseTreeNode)}
	<li>
		<span class:terminal={node.children.length === 0 && node.terminal === undefined} class="tree-node">
			{@html renderMath(escapeMath(node.symbol))}
		</span>

		{#if node.children.length > 0}
			<ul>
				{#each node.children as child, index (`${child.symbol}-${index}`)}
					{@render treeNode(child)}
				{/each}
			</ul>
		{:else if node.terminal !== undefined}
			<ul>
				<li>
					<span class="tree-node terminal">{@html renderMath(escapeMath(node.terminal))}</span>
				</li>
			</ul>
		{/if}
	</li>
{/snippet}

<figure class="parse-tree">
	<figcaption>{caption}</figcaption>

	<div class="interactive-stage">
		<div class="zoom-toolbar" aria-label="Controles de navegación del árbol">
			<button type="button" onclick={zoomIn} aria-label="Aumentar zoom">+</button>
			<button type="button" onclick={zoomOut} aria-label="Reducir zoom">−</button>
			<button type="button" onclick={resetTransform} aria-label="Restablecer vista">↺</button>
		</div>

		<div
			class="canvas-viewport"
			class:dragging={isDragging}
			role="region"
			aria-label={`Lienzo interactivo del ${caption} (arrastra para mover, rueda para zoom)`}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			onwheel={handleWheel}
		>
			<div
				class="canvas-transform"
				style:transform={`translate(${translateX}px, ${translateY}px) scale(${scale})`}
			>
				<div class="tree" role="img" aria-label={caption}>
					<ul>
						{@render treeNode(tree)}
					</ul>
				</div>
			</div>
		</div>
	</div>
</figure>

<style>
	.parse-tree {
		margin: 2rem auto 0;
		padding-top: 1rem;
		border-top: 0.5pt solid #000000;
	}

	figcaption {
		margin-bottom: 0.75rem;
		text-align: center;
		font-weight: 700;
		font-variant: small-caps;
		letter-spacing: 0.04em;
	}

	.interactive-stage {
		position: relative;
		border: 1px solid #e0e0dc;
		background: #fafaf9;
		margin: 0.5rem 0 1rem;
		overflow: hidden;
	}

	.zoom-toolbar {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		gap: 0.25rem;
		z-index: 10;
		background: rgba(255, 255, 255, 0.85);
		backdrop-filter: blur(2px);
		padding: 0.2rem;
		border: 1px solid #ccc;
	}

	.zoom-toolbar button {
		width: 1.6rem;
		height: 1.6rem;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		border: 1px solid #000000;
		background: #ffffff;
		color: #000000;
		cursor: pointer;
		padding: 0;
	}

	.zoom-toolbar button:hover,
	.zoom-toolbar button:focus-visible {
		background: #000000;
		color: #ffffff;
	}

	.canvas-viewport {
		width: 100%;
		height: 400px;
		cursor: grab;
		overflow: hidden;
		user-select: none;
		touch-action: none;
		display: flex;
		align-items: center;
		justify-content: center;
		outline: none;
	}

	.canvas-viewport:focus-visible {
		outline: 2px solid #000000;
		outline-offset: -2px;
	}

	.canvas-viewport.dragging {
		cursor: grabbing;
	}

	.canvas-transform {
		transform-origin: 0 0;
		will-change: transform;
		transition: none;
	}

	.tree {
		width: max-content;
		min-width: 100%;
		padding: 1.5rem;
	}

	.tree ul {
		position: relative;
		display: flex;
		justify-content: center;
		margin: 0;
		padding: 1.4rem 0 0;
	}

	.tree > ul {
		padding-top: 0;
	}

	.tree li {
		position: relative;
		list-style: none;
		margin: 0;
		padding: 1.4rem 0.35rem 0;
		text-align: center;
	}

	.tree > ul > li {
		padding-top: 0;
	}

	.tree li::before,
	.tree li::after {
		content: '';
		position: absolute;
		top: 0;
		width: 50%;
		height: 1.4rem;
		border-top: 0.5pt solid #000000;
	}

	.tree li::before {
		right: 50%;
	}

	.tree li::after {
		left: 50%;
		border-left: 0.5pt solid #000000;
	}

	.tree li:first-child::before,
	.tree li:last-child::after,
	.tree li:only-child::before,
	.tree li:only-child::after {
		border: none;
	}

	.tree li:last-child::before {
		border-right: 0.5pt solid #000000;
	}

	.tree li:only-child {
		padding-top: 1.4rem;
	}

	.tree > ul > li:only-child {
		padding-top: 0;
	}

	.tree ul ul::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		height: 1.4rem;
		border-left: 0.5pt solid #000000;
	}

	.tree-node {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		min-width: 2.3rem;
		min-height: 2rem;
		padding: 0.2rem 0.45rem;
		border: 0.5pt solid #000000;
		background: #ffffff;
	}

	.tree-node.terminal {
		border-style: dashed;
		font-style: italic;
	}

	@media (max-width: 560px) {
		.canvas-viewport {
			height: 320px;
		}
	}
</style>
