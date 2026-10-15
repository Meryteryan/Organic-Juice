import { createHash } from 'node:crypto';
import { catalog } from './catalog.mjs';
export { catalog };
export const APP = 'organic-juice-cart';
const PICKUP_MESSAGE = 'We’ll be in touch after your order to plan your pickup at one of our weekly pop-ups. Prefer delivery? Just ask, and we’ll do our best to bring it to you.';

export function normalizeCart(items) {
  if (!Array.isArray(items) || !items.length || items.length > catalog.length) throw new Error('Choose at least one juice.');
  const seen = new Set();
  const result = items.map(item => {
    if (!item || !catalog.some(p => p.slug === item.slug) || seen.has(item.slug)) throw new Error('Invalid juice selection.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error('Choose 1 to 99 jars per flavor.');
    seen.add(item.slug);
    return { slug: item.slug, quantity: item.quantity };
  });
  return result.sort((a, b) => a.slug.localeCompare(b.slug));
}

// Prices are sent inline from the catalog, so the same code works with test and live Stripe keys.
export function checkoutParams(items, baseUrl) {
  const cart = normalizeCart(items);
  const product = slug => catalog.find(p => p.slug === slug);
  const amount = cart.reduce((n, i) => n + product(i.slug).unit_amount * i.quantity, 0);
  return {
    mode: 'payment',
    line_items: cart.map(i => ({
      quantity: i.quantity,
      price_data: { currency: 'usd', unit_amount: product(i.slug).unit_amount, product_data: { name: product(i.slug).name, metadata: { slug: i.slug } } }
    })),
    name_collection: { individual: { enabled: true, optional: false } },
    phone_number_collection: { enabled: true },
    custom_text: { submit: { message: PICKUP_MESSAGE } },
    metadata: { app: APP, fulfillment: 'pickup', expected_total: String(amount) },
    payment_intent_data: { metadata: { app: APP, fulfillment: 'pickup' } },
    success_url: baseUrl + '/confirmation.html?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: baseUrl + '/?checkout=cancelled#order'
  };
}

export function idempotencyKey(items, attempt) {
  if (typeof attempt !== 'string' || !/^[a-f0-9-]{36}$/.test(attempt)) throw new Error('Refresh the page and try again.');
  return APP + '-' + createHash('sha256').update(JSON.stringify(normalizeCart(items)) + attempt).digest('hex');
}

// Verifies a paid Checkout Session against the catalog and, if `notify` is given, emails the owner.
// Returns false for sessions that are unpaid, from another app, or from the wrong Stripe mode.
export async function recordPaidSession(stripe, id, { live, notify } = {}) {
  const session = await stripe.checkout.sessions.retrieve(id);
  if (session.livemode !== !!live || session.metadata?.app !== APP || session.payment_status !== 'paid') return false;
  const lines = await stripe.checkout.sessions.listLineItems(id, { limit: 100, expand: ['data.price.product'] });
  if (lines.has_more || !lines.data.length) throw new Error('Unexpected order lines');
  let amount = 0;
  const items = lines.data.map(line => {
    const p = catalog.find(c => c.slug === line.price?.product?.metadata?.slug);
    if (!p || line.price.currency !== 'usd' || line.price.unit_amount !== p.unit_amount || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error('Order validation failed');
    amount += line.quantity * p.unit_amount;
    return { slug: p.slug, name: p.name, quantity: line.quantity };
  });
  if (session.currency !== 'usd' || session.amount_total !== amount || String(amount) !== session.metadata.expected_total) throw new Error('Order amount mismatch');
  if (notify) {
    // A failed email must never block the customer's confirmation.
    try { await notify({ id: session.id, livemode: session.livemode, total: amount, contact: session.customer_details, items }); }
    catch (e) { console.error('Order email failed:', e.message); }
  }
  return true;
}
