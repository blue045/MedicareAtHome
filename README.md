# Medicare At Home

Medicare At Home is a Cloudflare Pages website for home medical services, doctor profiles, ambulance support, hospital listings, blood donor information, and a small medical store. It includes a public website, user accounts, order handling, and an admin panel for managing most of the content from the browser.

The project is built to run on free-friendly services:

- Cloudflare Pages for hosting and serverless functions
- Turso/libSQL for database storage
- Vanilla HTML, CSS, and JavaScript for the frontend
- Optional Telegram notifications
- Optional Brevo email notifications and email verification

## Main features

### Public website

- Home page
- Services page and service details
- Doctors page and doctor profile/details
- Doctor appointment page
- Ambulance page with available ambulance cards and detail pages
- Hospital page with cards, detail pages, and photo galleries
- Blood donor list and donor submission form
- Contact page
- About page
- Store pages for medicine, medical equipment, and prescribed medicine requests
- Cart, checkout, login, signup, and user profile pages

### Store

The store supports products, categories, carts, checkout, order history, product reviews, and admin order management. Product pages include image gallery support and a highlighted price section.

Available payment method labels include:

- Cash on Delivery
- bKash
- Nagad
- Rocket
- Bangladeshi Bank Transfer

The project does not include an automatic paid payment gateway. Payments are handled manually so the site can stay free-plan friendly.

### Admin panel

There are two admin areas:

| Route | Purpose |
| --- | --- |
| `/su` | Master admin panel |
| `/superuser` | Sub-admin panel |

The master admin can manage sub-admin accounts and decide which sections each sub-admin can access.

Admin modules include:

- Dashboard
- Main page settings
- Content pages
- Contact settings
- Blood entries
- Ambulances
- Hospitals
- Doctors
- Reviews
- User login information
- Orders
- Products
- Services

### Content pages editor

The admin panel includes a card-based editor under **Content Pages** for the main public pages:

- Services
- Store
- Doctors
- Ambulance
- Hospital
- Blood
- Contact
- About

Each card opens an editor where the admin can update page text and presentation settings such as:

- menu label
- badge/kicker text
- page title
- short description
- extra body text
- primary and secondary buttons
- layout style
- navigation visibility

This data is stored in Turso through the existing settings system.

## Project structure

```txt
MedicareAtHome-main/
├── functions/          # Cloudflare Pages Functions and API routes
├── public/             # Static website files
├── scripts/            # Project check scripts
├── package.json
├── wrangler.toml
└── README.md
```

Important frontend files:

```txt
public/assets/css/styles.css
public/assets/js/main.js
public/assets/js/store.js
public/assets/js/admin.js
```

Important backend folders:

```txt
functions/api/
functions/_lib/
```

## Setup

Install dependencies:

```bash
npm install
```

Run the project checks:

```bash
npm run check
```

The site is designed for Cloudflare Pages. The build output directory is:

```txt
public
```

## Required environment variables

Set these in Cloudflare Pages under **Settings → Environment variables**.

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
STORE_TURSO_DATABASE_URL=libsql://...
STORE_TURSO_AUTH_TOKEN=...
ABOUT_TURSO_DATABASE_URL=libsql://...
ABOUT_TURSO_AUTH_TOKEN=...
ADMIN_PASSWORD=your_master_admin_password
ADMIN_SESSION_SECRET=make_this_long_random_32_chars_or_more
STORE_AUTH_SECRET=make_this_long_random_32_chars_or_more
```

`STORE_AUTH_SECRET` and `ADMIN_SESSION_SECRET` should be long random values. Do not leave them blank.

## Optional environment variables

Telegram notifications:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_group_or_chat_id
```

Brevo email notifications:

```env
BREVO_API_KEY=your_brevo_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Medicare At Home
```

Email verification:

```env
REQUIRE_EMAIL_VERIFICATION=1
SITE_URL=https://your-domain.pages.dev
```

Rate limits can be disabled for testing, but this should not stay enabled in production:

```env
DISABLE_RATE_LIMITS=1
```

## Security notes

This version includes free-plan friendly security improvements:

- database-backed rate limiting for login, signup, orders, reviews, ambulance requests, and blood submissions
- PBKDF2 password hashing for store users and sub-admins
- automatic upgrade of older password hashes after successful login
- HMAC-SHA256 token signing for store authentication
- stronger security headers from middleware
- safer request body limits

The project still stores uploaded images and prescription files as data URLs in the database. This keeps the setup simple and free-plan friendly, but it is not ideal for a large production store. For heavier use, move images and prescription files to Cloudflare R2, Cloudflare Images, Cloudinary, or another file storage service, then save only the file URLs in Turso.

Current upload limits are intentionally small to protect the database from becoming slow.

## Deployment

1. Push the project to GitHub.
2. Connect the repository to Cloudflare Pages.
3. Set the build output directory to `public`.
4. Add the required environment variables.
5. Deploy.

After deployment, open the site once in an incognito/private tab if old CSS or JavaScript appears. Browsers and Cloudflare can keep cached assets for a short time after a redeploy.

## Notes

This project is meant to be simple to run and easy to update. The admin panel handles most content changes, while the main codebase stays focused on public pages, store flow, and API routes.
