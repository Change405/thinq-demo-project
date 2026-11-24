<script>
	let { color, label = '' } = $props();
</script>

<svg class="can" viewBox="0 0 60 110" role="img" aria-label={label}>
	<rect x="8" y="4" width="44" height="102" rx="10" fill={color} />
	<rect x="8" y="38" width="44" height="34" fill="#fff6e9" />
	<rect x="14" y="10" width="6" height="88" rx="3" fill="#ffffff" opacity="0.25" />
	<text x="30" y="60" text-anchor="middle" font-size="11" font-weight="800" fill={color}>FIZZ</text>
</svg>

<style>
	.can { width: 100%; height: auto; display: block; }
</style>
