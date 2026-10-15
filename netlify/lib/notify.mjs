// Emails the business owner about each new paid order, through Resend's HTTP API.
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export function orderEmail(order) {
  const c = order.contact || {};
  const dashboard = `https://dashboard.stripe.com/${order.livemode ? '' : 'test/'}payments`;
  return {
    subject: `${order.livemode ? '' : '[TEST] '}New order: ${money(order.total)}${c.name ? ' from ' + c.name : ''}`,
    text: [
      `New order: ${money(order.total)}`,
      '',
      ...order.items.map(i => `${i.quantity} × ${i.name}`),
      '',
      `Name: ${c.name || '(not given)'}`,
      `Email: ${c.email || '(not given)'}`,
      `Phone: ${c.phone || '(not given)'}`,
      '',
      'Reach out to plan their pickup (or delivery, if they asked).',
      `Order details in Stripe: ${dashboard}`,
      `Reference: ${order.id}`
    ].join('\n')
  };
}

// Returns null when email is not configured, so orders still work without it.
export function createOrderNotifier({ apiKey, to, from }) {
  if (!apiKey || !to) return null;
  return async order => {
    const { subject, text } = orderEmail(order);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      // The idempotency key stops a retried Stripe event from emailing the same order twice.
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-email-${order.id}` },
      body: JSON.stringify({ from, to: [to], subject, text, reply_to: order.contact?.email || undefined })
    });
    if (!res.ok) throw new Error(`Order email failed with status ${res.status}`);
  };
}
