import { settings, json } from '../lib/env.mjs';
import { recordPaidSession } from '../lib/cart.mjs';

// Stripe calls this after each payment, so the owner is emailed even if the customer closes the tab.
export default async req => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const { stripe, live, webhookSecret, notify } = settings();
  if (!stripe || !webhookSecret) return json(503, { error: 'Webhook not configured.' });
  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature'), webhookSecret);
  } catch {
    return json(400, { error: 'Invalid webhook signature.' });
  }
  if (event.livemode === live && ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    try {
      await recordPaidSession(stripe, event.data.object.id, { live, notify });
    } catch (e) {
      // A failure response makes Stripe retry later.
      console.error('Webhook order check failed:', e.message);
      return json(500, { error: 'Order check failed.' });
    }
  }
  return json(200, { received: true });
};

export const config = { path: '/api/stripe-webhook' };
