<script>
	import { flavors } from '$lib/flavors.js';
	import Can from '$lib/Can.svelte';
</script>

<svelte:head>
	<title>Fizz &amp; Co. · Small-batch soda</title>
</svelte:head>

<section class="hero">
	<div>
		<h1>Soda that's actually worth the sugar.</h1>
		<p>Five small-batch flavors, made with real cane sugar and a lot of carbonation. Pick a pack, we'll ship it cold-ish.</p>
		<a class="button" href="/order">Order now</a>
	</div>
	<div class="hero-cans">
		{#each flavors.slice(0, 3) as f}
			<Can color={f.color} label={f.name} />
		{/each}
	</div>
</section>

<h2>The lineup</h2>
<ul class="grid">
	{#each flavors as f}
		<li>
			<div class="can-wrap"><Can color={f.color} label={f.name} /></div>
			<h3>{f.name}</h3>
			<p>{f.note}</p>
			<span class="price">${f.price.toFixed(2)} / can</span>
		</li>
	{/each}
</ul>

<style>
	.hero {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 2rem;
		align-items: center;
		padding: 2.5rem 0 3rem;
	}
	h1 { font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.1; margin: 0 0 1rem; }
	.hero p { color: var(--muted); font-size: 1.1rem; max-width: 34ch; }
	.hero-cans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
	.hero-cans :global(.can:nth-child(2)) { transform: translateY(-1.25rem); }
	.button {
		display: inline-block;
		margin-top: 0.5rem;
		background: var(--accent);
		color: #fff;
		padding: 0.75rem 1.5rem;
		border-radius: 999px;
		font-weight: 700;
		text-decoration: none;
	}
	.grid {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 1rem;
	}
	.grid li { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 1rem; }
	.can-wrap { width: 50px; margin-bottom: 0.5rem; }
	h3 { margin: 0; }
	.grid p { margin: 0.25rem 0 0.5rem; color: var(--muted); font-size: 0.95rem; }
	.price { font-weight: 700; }
	@media (max-width: 640px) {
		.hero { grid-template-columns: 1fr; }
		.hero-cans { max-width: 260px; }
	}
</style>
