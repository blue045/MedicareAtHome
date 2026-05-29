# Free-plan security fixes added

This version keeps the project compatible with Cloudflare Pages free plan and Turso free tiers. No paid storage, paid captcha, or paid payment gateway is required.

## Required environment variables

Set these in Cloudflare Pages → Settings → Environment variables:

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
STORE_TURSO_DATABASE_URL=libsql://...
STORE_TURSO_AUTH_TOKEN=...
ABOUT_TURSO_DATABASE_URL=libsql://...
ABOUT_TURSO_AUTH_TOKEN=...
ADMIN_PASSWORD=your_master_password
ADMIN_SESSION_SECRET=make_this_long_random_32_chars_or_more
STORE_AUTH_SECRET=make_this_long_random_32_chars_or_more
```

`STORE_AUTH_SECRET` is now required for store login/signup tokens. Do not leave it blank.

## Optional free anti-spam settings

The project now has database-backed rate limiting for:

- admin login
- user login
- user signup
- order submission
- review submission
- blood form submission
- ambulance requests

No extra paid service is needed. If you need to disable rate limits temporarily:

```env
DISABLE_RATE_LIMITS=1
```

Do not keep that enabled in production.

## Optional email verification

Email verification is now supported with Brevo free tier. To enable it:

```env
REQUIRE_EMAIL_VERIFICATION=1
SITE_URL=https://.pages.dev
BREVO_API_KEY=your_brevo_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Medicare At Home
```

When enabled, new email/password users must click the verification link before logging in. Phone-only signup still works without email verification.

## Password/security changes

- Store user passwords now use PBKDF2-SHA256 instead of plain SHA-256.
- Sub-admin passwords now use PBKDF2-SHA256.
- Old password hashes are upgraded automatically after a successful login.
- Store login tokens and Google OAuth state now use HMAC-SHA256.
- Unsafe shared default auth secrets were removed from live token creation.

## Free-plan upload limits

The project still stores images/prescription files in Turso because that avoids paid storage setup. To protect the free DB from becoming slow:

- image data URLs are capped around 800 KB server-side
- prescription files are capped around 1.2 MB server-side
- frontend compression was reduced to smaller image sizes
- prescription PDFs are limited to 900 KB

For a bigger production store later, move product photos and prescriptions to Cloudflare R2 or Cloudinary and store only URLs in Turso.

## Stock safety

Product order creation now uses a stock-checked database write to reduce overselling risk when multiple users order at the same time.

## Security headers

The middleware now adds stronger headers including:

- Content-Security-Policy
- X-Frame-Options
- Strict-Transport-Security on HTTPS
- Referrer-Policy
- Permissions-Policy

Inline scripts still exist in the HTML, so the CSP keeps `unsafe-inline` for compatibility. Removing inline scripts later will let you make the CSP stricter.
