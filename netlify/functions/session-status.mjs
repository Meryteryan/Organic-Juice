import { settings, json } from '../lib/env.mjs';
import { recordPaidSession } from '../lib/cart.mjs';

// Confirms payment for the thank-you page. When Stripe webhooks are set up they send the
// owner email instead, so it still goes out if the customer closes the tab after paying.
export default async req => {
  const { stripe, live, webhookSecret, notify } = settings();
  if (!stripe) return json(503, { error: 'Payment verification is unavailable. Check your Stripe receipt email.' });
  const id = new URL(req.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json(400, { error: 'Invalid checkout reference.' });
  try {
    const paid = await recordPaidSession(stripe, id, { live, notify: webhookSecret ? null : notify });
    return json(200, { paid });
  } catch (e) {
    console.error('Session check failed:', e.type || e.name, e.message);
    return json(e.code === 'resource_missing' ? 404 : 502, { error: 'We couldn’t look up that order. Check your Stripe receipt email.' });
  }
};

export const config = { path: '/api/session-status' };
