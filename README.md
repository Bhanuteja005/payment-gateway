# Local Hosted Payment Page

This folder contains a standalone hosted payment page for token-based payment links.

## Files

- index.html
- styles.css
- app.js

## Local flow

1. Start backend on local port 5000.
2. Open hosted URL format:
   - http://127.0.0.1:5000/payments?token=<payment_token>
3. Page resolves token from:
   - GET /api/whatsapp/payment-link/token/:token
4. Click Pay Now to redirect to token payment_url (Razorpay link).

## Switch to production later

No code change is required if this page is deployed on the same domain as backend.

If frontend and backend are different domains, pass api_base in query for testing:
- /payments?token=<token>&api_base=https://server.nyraai.io

## Security note

Amount and payment URL are resolved from backend token API. The page does not allow editing amount.
