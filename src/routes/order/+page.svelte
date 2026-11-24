<script>
	import { enhance } from '$app/forms';
	import { flavors, packSizes } from '$lib/flavors.js';
	import Can from '$lib/Can.svelte';

	let { form } = $props();

	let flavor = $state(form?.values?.flavor ?? flavors[0].id);
	let pack = $state(form?.values?.pack ?? 12);
	let quantity = $state(form?.values?.quantity ?? 1);

	let selected = $derived(flavors.find((f) => f.id === flavor));
	let total = $derived(selected ? selected.price * pack * (Number(quantity) || 0) : 0);
</script>

<svelte:head>
	<title>Order · Fizz &amp; Co.</title>
</svelte:head>

{#if form?.success}
	<section class="card done">
		<h1>Order placed 🎉</h1>
		<p>Thanks, {form.order.name}. Your order <strong>{form.order.orderId}</strong> is in.</p>
		<p>{form.order.quantity} × {form.order.pack}-pack of {form.order.flavor} — <strong>${form.order.total.toFixed(2)}</strong></p>
		<a class="button" href="/order" data-sveltekit-reload>Place another order</a>
	</section>
{:else}
	<h1>Build your order</h1>
	<div class="layout">
		<form method="POST" use:enhance class="card">
			<fieldset>
				<legend>Flavor</legend>
				<div class="flavors">
					{#each flavors as f}
						<label class="flavor" class:active={flavor === f.id}>
							<input type="radio" name="flavor" value={f.id} bind:group={flavor} />
							<span class="swatch" style:background={f.color}></span>
							{f.name}
						</label>
					{/each}
				</div>
				{#if form?.errors?.flavor}<p class="err">{form.errors.flavor}</p>{/if}
			</fieldset>

			<div class="row">
				<label>
					Pack size
					<select name="pack" bind:value={pack}>
						{#each packSizes as p}<option value={p.id}>{p.label}</option>{/each}
					</select>
					{#if form?.errors?.pack}<span class="err">{form.errors.pack}</span>{/if}
				</label>
				<label>
					Quantity
					<input type="number" name="quantity" min="1" max="20" bind:value={quantity} />
					{#if form?.errors?.quantity}<span class="err">{form.errors.quantity}</span>{/if}
				</label>
			</div>

			<label>
				Name
				<input name="name" autocomplete="name" value={form?.values?.name ?? ''} />
				{#if form?.errors?.name}<span class="err">{form.errors.name}</span>{/if}
			</label>
			<label>
				Email
				<input name="email" type="email" autocomplete="email" value={form?.values?.email ?? ''} />
				{#if form?.errors?.email}<span class="err">{form.errors.email}</span>{/if}
			</label>

			<button type="submit">Place order · ${total.toFixed(2)}</button>
		</form>

		<aside class="card summary">
			{#if selected}
				<div class="big-can"><Can color={selected.color} label={selected.name} /></div>
				<h2>{selected.name}</h2>
				<p class="muted">{selected.note}</p>
				<p>{quantity || 0} × {pack}-pack @ ${selected.price.toFixed(2)}/can</p>
				<p class="total">${total.toFixed(2)}</p>
			{/if}
		</aside>
	</div>
{/if}

<style>
	h1 { margin: 1.5rem 0 1rem; }
	.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 1.25rem; }
	.layout { display: grid; grid-template-columns: 1.6fr 1fr; gap: 1.25rem; align-items: start; }
	form { display: grid; gap: 1rem; }
	fieldset { border: 0; padding: 0; margin: 0; }
	legend { font-weight: 700; margin-bottom: 0.5rem; }
	.flavors { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.flavor {
		display: flex; align-items: center; gap: 0.4rem;
		border: 2px solid var(--line); border-radius: 999px; padding: 0.35rem 0.8rem;
		cursor: pointer; font-weight: 600;
	}
	.flavor.active { border-color: var(--accent); }
	.flavor input { position: absolute; opacity: 0; pointer-events: none; }
	.flavor:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
	.swatch { width: 14px; height: 14px; border-radius: 50%; }
	.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	label { display: grid; gap: 0.3rem; font-weight: 600; }
	input:not([type='radio']), select {
		font: inherit; line-height: 1.5; padding: 0.55rem 0.7rem; border: 1px solid var(--line); border-radius: 10px; background: #fff;
	}
	select {
		appearance: none;
		padding-right: 2.2rem;
		background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%237a6656' stroke-width='2'/%3E%3C/svg%3E") no-repeat right 0.8rem center;
		cursor: pointer;
	}
	button, .button {
		font: inherit; font-weight: 700; background: var(--accent); color: #fff; border: 0;
		padding: 0.8rem 1.4rem; border-radius: 999px; cursor: pointer; text-decoration: none; display: inline-block;
	}
	.err { color: #b3261e; font-size: 0.85rem; font-weight: 500; margin: 0.25rem 0 0; }
	.summary { text-align: center; position: sticky; top: 1rem; }
	.big-can { width: 80px; margin: 0 auto 0.5rem; }
	.summary h2 { margin: 0; }
	.muted { color: var(--muted); }
	.total { font-size: 2rem; font-weight: 900; color: var(--accent); margin: 0.25rem 0 0; }
	.done { max-width: 560px; margin: 2rem auto; text-align: center; }
	@media (max-width: 720px) {
		.layout { grid-template-columns: 1fr; }
		.summary { position: static; order: -1; }
	}
</style>
