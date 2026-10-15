import test from 'node:test';
import assert from 'node:assert/strict';
import { APP, catalog, normalizeCart, checkoutParams, idempotencyKey, recordPaidSession } from '../netlify/lib/cart.mjs';
import { orderEmail } from '../netlify/lib/notify.mjs';
import { settings } from '../netlify/lib/env.mjs';
import checkout from '../netlify/functions/checkout.mjs';

const items = [{ slug: catalog[0].slug, quantity: 2 }, { slug: catalog[1].slug, quantity: 1 }];

test('cart rejects unknown, duplicate, fractional and out-of-range quantities', () => {
  for (const value of [[], [{ slug: 'fake', quantity: 1 }], [items[0], items[0]], ...[0, -1, 1.5, 100, '2'].map(quantity => [{ slug: catalog[0].slug, quantity }])]) assert.throws(() => normalizeCart(value));
});

test('server chooses prices and total, ignoring client amounts', () => {
  const p = checkoutParams(items.map(i => ({ ...i, price: 'fake', unit_amount: 1 })), 'https://example.com');
  assert.equal(p.metadata.expected_total, '4800');
  assert.deepEqual(p.line_items.map(l => [l.price_data.product_data.metadata.slug, l.price_data.unit_amount, l.quantity]), [[catalog[0].slug, 1600, 2], [catalog[1].slug, 1600, 1]]);
  assert.equal(p.phone_number_collection.enabled, true);
  assert.equal(p.success_url, 'https://example.com/confirmation.html?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(p.cancel_url, 'https://example.com/?checkout=cancelled#order');
});

test('retry key is stable regardless of item order but changes with quantity', () => {
  const id = '12345678-1234-1234-1234-123456789abc';
  assert.equal(idempotencyKey(items, id), idempotencyKey([...items].reverse(), id));
  assert.notEqual(idempotencyKey(items, id), idempotencyKey([items[0]], id));
});

function fixture(overrides = {}, line = {}) {
  const session = { id: 'cs_test_example', livemode: false, payment_status: 'paid', currency: 'usd', amount_total: 3200, metadata: { app: APP, expected_total: '3200' }, customer_details: { name: 'Jane Smith', email: 'test@example.com', phone: '+13105550123' }, ...overrides };
  const data = [{ price: { currency: 'usd', unit_amount: 1600, product: { metadata: { slug: catalog[0].slug } } }, quantity: 2, ...line }];
  return { checkout: { sessions: { retrieve: async () => session, listLineItems: async () => ({ has_more: false, data }) } } };
}

test('owner is emailed about a paid order, with flavors and contact', async () => {
  const sent = [];
  assert.equal(await recordPaidSession(fixture(), 'cs_test_example', { live: false, notify: async o => sent.push(o) }), true);
  assert.equal(sent.length, 1);
  const { subject, text } = orderEmail(sent[0]);
  assert.equal(subject, '[TEST] New order: $32.00 from Jane Smith');
  assert.ok(text.includes(`2 × ${catalog[0].name}`));
  assert.match(text, /test@example\.com/);
  assert.match(text, /\+13105550123/);
});

test('unpaid, unrelated and wrong-mode sessions are not orders', async () => {
  for (const override of [{ payment_status: 'unpaid' }, { livemode: true }, { metadata: { app: 'other' } }]) {
    const sent = [];
    assert.equal(await recordPaidSession(fixture(override), 'x', { live: false, notify: async o => sent.push(o) }), false);
    assert.equal(sent.length, 0);
  }
  // A live key only accepts live sessions.
  assert.equal(await recordPaidSession(fixture(), 'x', { live: true }), false);
});

test('tampered totals, prices or flavors never become orders', async () => {
  await assert.rejects(recordPaidSession(fixture({ amount_total: 1 }), 'x', { live: false }));
  await assert.rejects(recordPaidSession(fixture({}, { price: { currency: 'usd', unit_amount: 1, product: { metadata: { slug: catalog[0].slug } } } }), 'x', { live: false }));
  await assert.rejects(recordPaidSession(fixture({}, { price: { currency: 'usd', unit_amount: 1600, product: { metadata: { slug: 'fake' } } } }), 'x', { live: false }));
});

test('a failed email still confirms the order', async () => {
  const original = console.error; console.error = () => {};
  try { assert.equal(await recordPaidSession(fixture(), 'x', { live: false, notify: async () => { throw new Error('down'); } }), true); }
  finally { console.error = original; }
});

test('test or live mode follows the Stripe key', () => {
  const saved = { ...process.env };
  try {
    for (const [key, live, ready] of [['sk_test_abc', false, true], ['sk_live_abc', true, true], ['', false, false], ['pk_live_abc', false, false]]) {
      delete process.env.STRIPE_RESTRICTED_KEY; process.env.STRIPE_SECRET_KEY = key;
      const s = settings();
      assert.equal(s.live, live); assert.equal(!!s.stripe, ready);
    }
  } finally { process.env = saved; }
});

test('checkout refuses requests from other websites', async () => {
  const res = await checkout(new Request('https://organicjuice-yum.com/api/checkout', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' }));
  assert.equal(res.status, 403);
});
