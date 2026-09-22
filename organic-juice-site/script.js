const config = window.JUICE_CONFIG || {};
if (config.contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contactEmail)) {
  const contact = document.querySelector('#contact-link');
  contact.href = `mailto:${config.contactEmail}?subject=Organic%20Juice%20Collaboration`;
  contact.hidden = false;
  document.querySelector('#contact-pending').hidden = true;
}
if (config.googleFormUrl) {
  try {
    const url = new URL(config.googleFormUrl);
    const fullForm = url.hostname === 'docs.google.com' && /^\/forms\/d\/(e\/)?[^/]+\/viewform\/?$/.test(url.pathname);
    const shortForm = url.hostname === 'forms.gle' && url.pathname.length > 1;
    if (url.protocol === 'https:' && (fullForm || shortForm)) {
      const link = document.querySelector('#order-form-link');
      link.href = url.href;
      link.hidden = false;
      document.querySelector('#order-pending').hidden = true;
      if (fullForm) {
        url.searchParams.set('embedded', 'true');
        const frame = document.createElement('iframe');
        frame.src = url.href;
        frame.title = 'Organic Juice order request form';
        frame.loading = 'lazy';
        const container = document.querySelector('#form-container');
        container.append(frame);
        container.hidden = false;
      }
    }
  } catch (_) { /* Keep the honest unavailable state for invalid configuration. */ }
}
