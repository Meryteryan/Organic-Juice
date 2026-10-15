import { settings, json } from '../lib/env.mjs';
import { checkoutParams, idempotencyKey } from '../lib/cart.mjs';

// Creates a Stripe Checkout Session for the cart and returns its payment page URL.
export default async req => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const origin = new URL(req.url).origin;
  if (req.headers.get('origin') !== origin) return json(403, { error: 'Open checkout from this website.' });
  if (!req.headers.get('content-type')?.startsWith('application/json')) return json(415, { error: 'Invalid request format.' });
  const { stripe, live } = settings();
  if (!stripe) return json(503, { error: 'Online checkout isn’t available right now. Your selections are saved.' });

  let params, idem;
  try {
    const text = await req.text();
    if (text.length > 8192) throw new Error('Request too large');
    const payload = JSON.parse(text);
    params = checkoutParams(payload.items, origin);
    idem = idempotencyKey(payload.items, payload.attempt);
  } catch (e) {
    return json(400, { error: e.message });
  }
  try {
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey: idem });
    if (session.livemode !== live || !session.url?.startsWith('https://checkout.stripe.com/')) throw new Error('Unexpected checkout mode or URL');
    return json(200, { url: session.url });
  } catch (e) {
    console.error('Checkout failed:', e.type || e.name, e.message);
    return json(502, { error: 'Checkout is temporarily unavailable. Your selections are saved; please try again.' });
  }
};

export const config = { path: '/api/checkout' };
