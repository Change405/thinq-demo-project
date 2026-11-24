import { fail } from '@sveltejs/kit';
import { flavors, packSizes } from '$lib/flavors.js';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '').trim();
		const flavorId = String(data.get('flavor') ?? '');
		const pack = Number(data.get('pack'));
		const quantity = Number(data.get('quantity'));

		const values = { name, email, flavor: flavorId, pack, quantity };
		const flavor = flavors.find((f) => f.id === flavorId);

		const errors = {};
		if (!name) errors.name = 'Tell us who this is for.';
		if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email.';
		if (!flavor) errors.flavor = 'Pick a flavor.';
		if (!packSizes.some((p) => p.id === pack)) errors.pack = 'Pick a pack size.';
		if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) errors.quantity = 'Quantity must be 1–20.';

		if (Object.keys(errors).length) return fail(400, { errors, values });

		const total = flavor.price * pack * quantity;
		const orderId = 'FZ-' + Math.random().toString(36).slice(2, 8).toUpperCase();

		// Demo only: no persistence or payment. Log so it shows in `docker logs`.
		console.log(`[order] ${orderId} ${quantity}x ${pack}-pack ${flavor.name} for ${email} = $${total.toFixed(2)}`);

		return { success: true, order: { orderId, name, flavor: flavor.name, pack, quantity, total } };
	}
};
