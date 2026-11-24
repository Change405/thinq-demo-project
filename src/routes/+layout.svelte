<script>
	let { children } = $props();
</script>

<header>
	<a class="brand" href="/">Fizz &amp; Co.</a>
	<nav>
		<a href="/">Home</a>
		<a class="cta" href="/order">Order</a>
	</nav>
</header>

<main>
	{@render children()}
</main>

<footer>Fizz &amp; Co. · Small-batch soda · Demo site</footer>

<style>
	:global(:root) {
		--bg: #fff6e9;
		--ink: #2b1d14;
		--muted: #7a6656;
		--accent: #e4572e;
		--card: #ffffff;
		--line: #ecdcc6;
	}
	:global(*) { box-sizing: border-box; }
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--ink);
		font-family: ui-rounded, 'SF Pro Rounded', system-ui, sans-serif;
		line-height: 1.5;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		max-width: 1000px;
		margin: 0 auto;
	}
	.brand { font-weight: 900; font-size: 1.4rem; color: var(--accent); text-decoration: none; }
	nav { display: flex; gap: 1rem; align-items: center; }
	nav a { color: var(--ink); text-decoration: none; font-weight: 600; }
	nav a.cta { background: var(--accent); color: #fff; padding: 0.4rem 0.9rem; border-radius: 999px; }
	main { max-width: 1000px; margin: 0 auto; padding: 0 1.25rem 3rem; }
	footer { text-align: center; color: var(--muted); font-size: 0.85rem; padding: 2rem 1rem; border-top: 1px solid var(--line); }
</style>
