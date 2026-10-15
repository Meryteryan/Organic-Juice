import { settings, json } from '../lib/env.mjs';

// Tells the page whether checkout is available and whether it is in test mode.
export default async () => {
  const { stripe, live } = settings();
  return json(200, { checkoutReady: !!stripe, testMode: !live });
};

export const config = { path: '/api/config' };
