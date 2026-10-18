<script lang="ts">
	import type { ParseTreeNode } from '../algorighms/components/cyk.ts';
	import { escapeMath, renderMath } from '../utils/grammar-format.ts';

	interface Props {
		tree: ParseTreeNode;
		caption?: string;
	}

	let { tree, caption = 'árbol sintáctico' }: Props = $props();
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
	<div class="tree-scroll">
		<div class="tree" role="img" aria-label={caption}>
			<ul>
				{@render treeNode(tree)}
			</ul>
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

	.tree-scroll {
		overflow-x: auto;
		padding: 0.5rem 0 1rem;
	}

	.tree {
		width: max-content;
		min-width: 100%;
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
</style>
