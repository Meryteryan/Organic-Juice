import Stripe from 'stripe';
import { createOrderNotifier } from './notify.mjs';

// Settings come from Netlify's environment variables (or a local .env file); none live in the code.
export function settings() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_RESTRICTED_KEY || '';
  const live = /^(sk|rk)_live_/.test(key);
  const valid = live || /^(sk|rk)_test_/.test(key);
  return {
    live,
    stripe: valid ? new Stripe(key, { maxNetworkRetries: 2 }) : null,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    notify: createOrderNotifier({
      apiKey: process.env.RESEND_API_KEY,
      to: process.env.ORDER_EMAIL_TO,
      from: process.env.ORDER_EMAIL_FROM || 'Organic Juice Orders <onboarding@resend.dev>'
    })
  };
}

export function json(status, value) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
