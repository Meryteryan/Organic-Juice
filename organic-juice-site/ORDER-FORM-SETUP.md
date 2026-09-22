# Connection status

Your published form and teravetisyanmery@gmail.com are now configured in the site. The public form was checked and opens without a required sign-in. Email notification settings remain unverified; enable them from the form editor using the instructions below. No test order was submitted.

The existing form differs from the proposed template below: it includes a 32 oz / $40 option, does not collect email, and uses one quantity field for multiple juice choices. Consider asking for quantities per flavor and size, and adding the pickup/delivery confirmation acknowledgement.

---

# Organic Juice order request form

Create a Google Form while signed into the Gmail account that should receive requests.

Title: Organic Juice — Order Request

Description: Fresh cold-pressed juices, $15 per 12 oz bottle. Request farmers market or pop-up pickup, or delivery in the Los Angeles area for an extra fee. We will confirm availability, pickup or delivery details, and your final total before the order is finalized. Submitting this form does not reserve juice or collect payment.

## Questions

1. Full name — required short answer.
2. Email — required short answer with email validation. Use responder-entered email to avoid requiring a Google account.
3. Phone number — optional short answer.
4. Juice quantities — required multiple-choice grid, one response per row; columns 0, 1, 2, 3, 4, 5, 6. Rows: Beet It!; Sweet ReBoost; Orange Paradise; Fresh OJ (seasonal); Refresh & Hydrate (seasonal); Sugar High (seasonal). Do not enable “limit to one response per column.” Ask customers to choose at least one bottle; manually check zero-only requests.
5. Additional quantities or notes — optional paragraph.
6. Preferred date — required date. Description: A requested date is not a confirmed pickup or delivery slot.
7. Fulfillment — required multiple choice, with “Go to section based on answer”: Farmers market/pop-up pickup → pickup section; Los Angeles delivery (extra fee) → delivery section.

Pickup section: Preferred market or pop-up — required short answer. Description: Enter an event if known, or “Please arrange with me.” Continue to confirmation.

Delivery section: Neighborhood and ZIP code — required short answer. Description: Used to confirm delivery availability and quote the extra fee. We'll arrange the full address after confirming your request. Continue to confirmation.

Confirmation section: Required checkbox — “I understand this is an order request. Availability, pickup or delivery, any delivery fee, and the final total must be confirmed before my order is finalized.”

Confirmation message: Thanks for your juice request! We'll contact you to confirm availability, pickup or delivery details, and your final total. Your order is not confirmed yet, and no payment has been collected.

## Settings and connection

- Keep response summaries hidden from respondents.
- Do not limit to one response if that requires Google sign-in.
- Under Responses → More (three dots), enable “Get email notifications for new responses.”
- Optionally link responses to a Google Sheet to track requests.
- Publish the form and allow intended customers to respond.
- Send the published responder link back to Codex, along with your business email. The site is ready to embed a full docs.google.com/forms/.../viewform link; a forms.gle link enables the external form button.
- To connect manually, enter the link and email in config.js. Do not enter account passwords or private API keys.
- Submit a test request, check Gmail receipt, then test pickup and delivery on a phone before publishing the site.

Google's instructions:
https://support.google.com/docs/answer/139706
https://support.google.com/docs/answer/2839588
