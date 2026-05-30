# Medicare At Home

Medicare At Home is a free-plan friendly medical service website built for Cloudflare Pages. It has public pages for home medical services, doctors, ambulances, hospitals, blood donors, contact information, and a small medicine/equipment store. It also includes user accounts, checkout, order tracking, reviews, and a browser-based admin panel.

The project is meant to be simple to deploy and cheap to run. The frontend is plain HTML, CSS, and JavaScript. The backend uses Cloudflare Pages Functions. Data is stored in Turso/libSQL databases.

## What is inside

### Public website

- Home page
- Services page and service detail pages
- Doctors page and doctor detail pages
- Doctor appointment/search page
- Ambulance page with available ambulance cards and detail pages
- Hospital page with cards, detail pages, and photo galleries
- Blood donor list and donor submission form
- Store home page
- Medicine store
- Medical equipment store
- Prescribed medicine request page
- Cart and checkout
- Login, signup, and profile pages
- Order tracking and order history
- Review page
- Contact page
- About page

### Admin panel

There are two admin areas:

| Route | Use |
| --- | --- |
| `/su` | Master admin panel |
| `/superuser` | Sub-admin panel |

The master admin can create sub-admins and choose which modules they can access.

Admin modules include:

- Dashboard
- Main page settings
- Content pages
- Contact settings
- Blood entries
- Ambulances
- Hospitals
- Doctors
- User reviews
- User login information
- Order details
- Products
- Services
- Sub-admin management

### Store and payments

The store supports products, product galleries, cart, checkout, order history, delivery charges, review control, and admin order management.

Payment method labels included in the site:

- Cash on Delivery
- bKash
- Nagad
- Rocket
- Bangladeshi Bank Transfer

This project does not include an automatic paid payment gateway. These payment options are manual payment methods so the website can stay free-plan friendly.

### Content Pages editor

In the admin panel, the **Content Pages** section has cards for:

- Services
- Store
- Doctors
- Ambulance
- Hospital
- Blood
- Contact
- About

Clicking a card opens a dedicated editor URL such as `/su/content/ambulance` or `/superuser/content/ambulance`. From there, admins can edit the visible page content from one place:

- Hamburger/menu label
- Small badge/kicker text
- Page title
- Short description
- Full page intro/body text
- Top banner image URL
- Notice/highlight title and text
- Main section title and description
- Custom page blocks with title, description, image URL, button label, and button URL
- Bottom note
- Primary button label and URL
- Secondary button label and URL
- Layout style
- Hide/show in navigation
- Option to hide the default cards/list/form and use only the edited content

This data is saved in Turso through the settings system. The database migration is automatic.

## Tech stack

- Cloudflare Pages for hosting
- Cloudflare Pages Functions for API routes
- Turso/libSQL for database storage
- Vanilla HTML, CSS, and JavaScript
- Optional Telegram notifications
- Optional Brevo email notifications and email verification
- Optional Google login

## Project structure

```txt
MedicareAtHome-main/
├── functions/              # Cloudflare Pages Functions and API code
│   ├── api/                # Public and admin API routes
│   └── _lib/               # Shared backend helpers
├── public/                 # Static website pages and assets
│   ├── assets/css/         # Main CSS
│   ├── assets/js/          # Main frontend JavaScript
│   ├── su/                 # Master admin page
│   ├── superuser/          # Sub-admin page
│   ├── Store/              # Store pages
│   ├── Doctors/            # Doctors page
│   ├── Hospital/           # Hospital page
│   ├── Ambulance/          # Ambulance page
│   └── _redirects          # Cloudflare Pages route rules
├── scripts/                # Project check scripts
├── package.json
├── package-lock.json
├── wrangler.toml
└── README.md
```

Important files:

```txt
public/assets/css/styles.css
public/assets/js/main.js
public/assets/js/store.js
public/assets/js/admin.js
functions/_lib/db.js
functions/_lib/store-db.js
functions/_lib/about-db.js
functions/_lib/turso.js
functions/_lib/security.js
functions/_middleware.js
```

## Before deployment

You need accounts for these free-friendly services:

1. GitHub account
2. Cloudflare account
3. Turso account

Optional accounts:

1. Telegram bot, if you want admin notifications
2. Brevo account, if you want email notifications or email verification
3. Google Cloud project, if you want Google login

## Install locally

Install dependencies:

```bash
npm install
```

Run the project check:

```bash
npm run check
```

The project does not have a heavy build step. Cloudflare Pages serves the `public` folder and runs the API routes from `functions`.

For local Cloudflare testing, you can use Wrangler:

```bash
npx wrangler pages dev public
```

For local API testing, create a `.dev.vars` file in the project root and put the same environment variables you would use in Cloudflare Pages. Do not commit `.dev.vars` to GitHub.

## Cloudflare Pages deployment

1. Push the project to GitHub.
2. Open Cloudflare Dashboard.
3. Go to **Workers & Pages**.
4. Click **Create application**.
5. Choose **Pages**.
6. Connect your GitHub repository.
7. Select the repository.
8. Use these build settings:

```txt
Framework preset: None
Build command: npm run check
Build output directory: public
Root directory: /
```

The `wrangler.toml` file already has:

```toml
pages_build_output_dir = "public"
```

After the first deploy, add your environment variables in Cloudflare Pages and redeploy.

Environment variables are added here:

```txt
Cloudflare Pages → Your project → Settings → Environment variables
```

Add variables for both **Production** and **Preview** if you test preview deployments.

## Required environment variables

These are the important variables for the site to work properly.

```env
TURSO_DATABASE_URL=libsql://your-main-db.turso.io
TURSO_AUTH_TOKEN=your_main_db_token

STORE_TURSO_DATABASE_URL=libsql://your-store-db.turso.io
STORE_TURSO_AUTH_TOKEN=your_store_db_token

ABOUT_TURSO_DATABASE_URL=libsql://your-about-db.turso.io
ABOUT_TURSO_AUTH_TOKEN=your_about_db_token

ADMIN_PASSWORD=your_master_admin_password
ADMIN_SESSION_SECRET=long_random_secret
STORE_AUTH_SECRET=long_random_secret
```

Use different values for `ADMIN_SESSION_SECRET` and `STORE_AUTH_SECRET`. They should be long random strings.

You can generate a secret with:

```bash
openssl rand -base64 48
```

If you are using only a phone, use a strong password generator and make the secret at least 32 characters long.

## How to get Turso variables

The project uses three Turso databases:

| Database | Used for |
| --- | --- |
| Main database | Main site data, admin content, doctors, services, blood, ambulance, hospital, settings |
| Store database | Store users, products, orders, cart, reviews |
| About database | About page data |

You can use one Turso database for everything only after changing the code, but this project is prepared for three separate databases. Keeping them separate is cleaner.

### Option 1: Turso dashboard

1. Create a Turso account.
2. Create a database for the main site.
3. Copy the database URL. Put it in Cloudflare as `TURSO_DATABASE_URL`.
4. Create an auth token for that database. Put it in Cloudflare as `TURSO_AUTH_TOKEN`.
5. Create another database for the store.
6. Copy its URL and token into `STORE_TURSO_DATABASE_URL` and `STORE_TURSO_AUTH_TOKEN`.
7. Create another database for about page data.
8. Copy its URL and token into `ABOUT_TURSO_DATABASE_URL` and `ABOUT_TURSO_AUTH_TOKEN`.

### Option 2: Turso CLI

Login:

```bash
turso auth login
```

Create databases:

```bash
turso db create medicare-main
turso db create medicare-store
turso db create medicare-about
```

Get database URLs:

```bash
turso db show medicare-main
turso db show medicare-store
turso db show medicare-about
```

Create auth tokens:

```bash
turso db tokens create medicare-main
turso db tokens create medicare-store
turso db tokens create medicare-about
```

Put the URLs and tokens in Cloudflare Pages environment variables.

The site creates and updates the needed tables automatically when the APIs run.

## Optional environment variables

### Telegram notifications

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_admin_group_or_chat_id
```

Aliases also supported:

```env
TG_BOT_TOKEN=your_telegram_bot_token
TG_CHAT_ID=your_admin_group_or_chat_id
TELEGRAM_ADMIN_CHAT_ID=your_admin_group_or_chat_id
```

How to get them:

1. Open Telegram.
2. Search for **@BotFather**.
3. Send `/newbot` and create a bot.
4. Copy the bot token. Use it as `TELEGRAM_BOT_TOKEN`.
5. Add the bot to your admin group.
6. Send a message in the group.
7. Open this in your browser, replacing the token:

```txt
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```

8. Find the group `chat.id`. It is often a negative number. Use it as `TELEGRAM_CHAT_ID`.

### Brevo email notifications

```env
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Medicare At Home
BREVO_REPLY_TO_EMAIL=optional_reply_email
```

Aliases also supported:

```env
SENDINBLUE_API_KEY=your_brevo_api_key
FROM_EMAIL=your_verified_sender_email
REPLY_TO_EMAIL=optional_reply_email
```

How to get them:

1. Create a Brevo account.
2. Verify your sender email or sender domain.
3. Go to Brevo API keys.
4. Create an API key.
5. Add the API key to Cloudflare as `BREVO_API_KEY`.
6. Add your verified sender email as `BREVO_SENDER_EMAIL`.

To disable Brevo order emails:

```env
BREVO_ORDER_EMAILS=0
```

### Email verification

```env
REQUIRE_EMAIL_VERIFICATION=1
SITE_URL=https://your-site.pages.dev
```

Alias also supported:

```env
STORE_REQUIRE_EMAIL_VERIFICATION=1
PUBLIC_SITE_URL=https://your-site.pages.dev
APP_URL=https://your-site.pages.dev
BASE_URL=https://your-site.pages.dev
```

Email verification needs Brevo variables too. When enabled, new email/password users must verify their email before normal login. Phone-only signup can still work without email verification.

### Google login

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
SITE_URL=https://your-site.pages.dev
```

Aliases also supported:

```env
STORE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
STORE_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
PUBLIC_SITE_URL=https://your-site.pages.dev
```

How to get them:

1. Open Google Cloud Console.
2. Create or select a project.
3. Configure the OAuth consent screen.
4. Create OAuth credentials.
5. Choose **Web application**.
6. Add this authorized redirect URI:

```txt
https://your-site.pages.dev/api/store/auth/google/callback
```

7. Copy the client ID into `GOOGLE_CLIENT_ID`.
8. Copy the client secret into `GOOGLE_CLIENT_SECRET`.
9. Make sure `SITE_URL` matches your deployed website domain.

If you use a custom domain, also add that redirect URI:

```txt
https://your-custom-domain.com/api/store/auth/google/callback
```

### Extra security and behavior variables

These are optional. Most users do not need to change them.

| Variable | Default | Use |
| --- | --- | --- |
| `SEED_ON_EMPTY` | `true` | Seeds default content/settings when empty. Set `false` if you do not want automatic sample/default data. |
| `DISABLE_RATE_LIMITS` | not set | Set `1` only for temporary testing. Do not keep it enabled. |
| `MAX_JSON_BODY_BYTES` | about 2.2 MB | Maximum JSON request body size. Keep small on free plans. |
| `RATE_LIMIT_SALT` | falls back to another secret | Optional extra salt for rate-limit keys. |
| `STORE_PASSWORD_PEPPER` | falls back to store secret | Optional extra password pepper. Do not change it after users sign up unless you know what you are doing. |
| `PASSWORD_HASH_ITERATIONS` | `120000` | PBKDF2 password hashing iterations. |
| `STORE_PASSWORD_HASH_ITERATIONS` | `120000` | Store password hashing iterations. |
| `ALLOW_LEGACY_STORE_TOKENS` | not set | Set `1` only if you temporarily need old store tokens to keep working. |
| `GOOGLE_OAUTH_STATE_SECRET` | falls back to store/admin secret | Optional secret for Google OAuth state signing. |

Older variable names like `TURSO_URL`, `LIBSQL_URL`, `TURSO_AUTH_TOKEN`, and `LIBSQL_AUTH_TOKEN` are also supported by parts of the backend, but the recommended names are the ones shown in the required section.

## First admin login

After deployment, open:

```txt
https://your-site.pages.dev/su
```

Login using:

```txt
Password: value of ADMIN_PASSWORD
```

From `/su`, you can create sub-admin accounts and assign permissions.

Sub-admins log in at:

```txt
https://your-site.pages.dev/superuser
```

## Admin workflow

A good setup order after deployment:

1. Open `/su`.
2. Check the Dashboard.
3. Open Content Pages → Main Page and update the homepage content.
4. Open Content Pages and update page text for Services, Store, Doctors, Ambulance, Hospital, Blood, Contact, and About.
5. Add services.
6. Add doctors.
7. Add ambulances.
8. Add hospitals and hospital galleries.
9. Add products.
10. Update contact and payment information.
11. Create sub-admins if needed.
12. Test the public website in a private/incognito tab.

## Free-plan security notes

This version keeps the project compatible with Cloudflare Pages and Turso free tiers. No paid storage, paid captcha, or paid payment gateway is required.

Included security improvements:

- Database-backed rate limiting for admin login, user login, signup, orders, reviews, ambulance requests, and blood submissions
- PBKDF2-SHA256 password hashing for store users and sub-admins
- Automatic upgrade of older password hashes after successful login
- HMAC-SHA256 token signing for store authentication
- HMAC-SHA256 signing for Google OAuth state
- Stronger security headers in middleware
- Safer request body limits
- Smaller upload limits to protect the database

Do not leave these blank:

```env
ADMIN_SESSION_SECRET=
STORE_AUTH_SECRET=
```

Do not put real secrets in `README.md`, `wrangler.toml`, or frontend JavaScript.

## Upload and database limits

This project stores uploaded images and prescription files as data URLs in Turso. That keeps the setup simple and avoids paid storage, but it is not ideal for a large production store.

Current limits are intentionally small so the free database does not become slow:

- Images are capped server-side around hundreds of KB.
- Prescription files are capped around 1 MB.
- Frontend image compression is used before upload.

For a bigger production version later, move files to one of these:

- Cloudflare R2
- Cloudflare Images
- Cloudinary
- ImageKit

Then store only the image/file URL in Turso.

## Cache notes

Cloudflare and mobile browsers can keep old CSS and JavaScript after redeploy. If a new feature does not appear immediately:

1. Open the website in an incognito/private tab.
2. Clear browser cache.
3. Redeploy from Cloudflare Pages.
4. Make sure the newest ZIP/code was pushed to GitHub.

The project uses version strings on assets to reduce this problem.

## Troubleshooting

### Cloudflare deploy is stuck at `npm clean-install`

Check that `package-lock.json` uses public npm URLs, not private/internal registry URLs. The `.npmrc` file should contain:

```txt
registry=https://registry.npmjs.org/
fund=false
audit=false
progress=false
```

### API says Turso URL is missing

Add these variables in Cloudflare Pages:

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
STORE_TURSO_DATABASE_URL=
STORE_TURSO_AUTH_TOKEN=
ABOUT_TURSO_DATABASE_URL=
ABOUT_TURSO_AUTH_TOKEN=
```

Then redeploy.

### Store login/signup does not work

Check:

```env
STORE_AUTH_SECRET=
STORE_TURSO_DATABASE_URL=
STORE_TURSO_AUTH_TOKEN=
```

If email verification is enabled, also check Brevo variables and `SITE_URL`.

### Google login says redirect mismatch

In Google Cloud Console, add exactly:

```txt
https://your-site.pages.dev/api/store/auth/google/callback
```

If you use a custom domain, add that version too.

### Telegram notification is not coming

Check:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Also make sure the bot is added to the group and has permission to send messages.

### Old design still appears after update

Clear cache or open the site in incognito. If it still shows the old design, Cloudflare may be deploying an old GitHub commit.

### Admin password is not working

Check that `ADMIN_PASSWORD` is set in Cloudflare Pages production variables. After changing environment variables, redeploy.

## Useful routes

```txt
/                       Home
/Services               Services
/Doctors                Doctors
/doctor-appointment     Find doctor appointment
/Ambulance              Ambulances
/Hospital               Hospitals
/Blood                  Blood donors
/add-blood              Submit blood donor info
/Store                  Store home
/Store/medicine         Medicine store
/Store/equipment        Medical equipment
/Store/prescribed       Prescribed medicine request
/login                  Login
/signup                 Signup
/profile                User profile
/checkout               Checkout
/Contact                Contact
/About                  About
/su                     Master admin
/superuser              Sub-admin
/api/health             Health check
```

## Updating the site

1. Edit the code locally or upload the new ZIP contents to GitHub.
2. Commit and push to the same repository.
3. Cloudflare Pages will deploy automatically if GitHub integration is enabled.
4. If automatic deploy is off, open Cloudflare Pages and click **Retry deployment** or **Create deployment**.
5. Test public pages and admin pages after deployment.

## Notes for future upgrades

The current version is built to stay cheap and simple. If the website gets many real users, the next upgrades should be:

1. Move images and prescription files to object storage.
2. Add Cloudflare Turnstile to public forms.
3. Replace manual payments with a real payment gateway when budget allows.
4. Split the large CSS and JavaScript files into smaller module files.
5. Add automated tests for the most important API routes.

