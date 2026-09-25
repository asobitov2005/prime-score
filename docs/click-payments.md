# Click Premium checkout

Only Premium plan invoices use Click Shop API. Offline mock bookings and single-test purchases are **not** Click-integrated yet; do not mark those as automatically paid.

New plan invoices are Click-only. Missing Click configuration fails checkout instead
of falling back to a manual card transfer. No screenshot or support confirmation
is required; Telegram support is for payment/activation problems only. Older
invoices remain in history, with a warning not to pay again if already paid.
Plans are one-time purchases, not automatically renewed subscriptions.

1. Rotate the `SECRET_KEY` shared in chat before enabling production payments.
2. Put `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_MERCHANT_USER_ID`, and the **new** `CLICK_SECRET_KEY` in the backend's private environment file. The Merchant User ID is reserved for a future outbound Merchant API integration; Shop API does not use it.
3. Ask Click to register both Prepare and Complete URLs as `https://api.primescore.uz/api/payments/click/callback` (HTTPS POST, form-urlencoded). Set `CLICK_RETURN_URL=https://primescore.uz/subscription`.
4. Complete Click merchant onboarding, fiscal/receipt setup, and a provider test transaction. Then set `PAYMENT_PAUSED=False` and unpause the intended plans in admin. Do not unpause before callbacks and reconciliation have been tested.

The frontend opens a Click-hosted payment link. The return URL is navigation only: Premium is activated exclusively by a signed Complete callback. The backend checks the signature, service ID, original invoice amount, transaction ID, state, and duplicate delivery. `merchant_prepare_id` is the numeric Click transaction ID. Repeated Complete callbacks for the same completed transaction return success without granting Premium twice.

Do not put Click keys in `NEXT_PUBLIC_*`, Vercel frontend variables, git, or screenshots. `X-Debug-*` user auth is disabled by default; do not enable it in production.
