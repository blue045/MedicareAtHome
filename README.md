# Medicare At Home

Medicare At Home is a Cloudflare Pages website for home medical services, doctors, ambulance requests, blood donor listings, contact management, and a medical store/order system.

The project uses:

- **Frontend:** Static HTML, CSS, and vanilla JavaScript inside `public/`
- **Backend:** Cloudflare Pages Functions inside `functions/`
- **Database:** Turso/libSQL through `@libsql/client`
- **Deployment:** Cloudflare Pages
- **Notifications:** Telegram bot notifications and optional Brevo transactional emails
- **Authentication:** Store account login/signup, optional Google login, master admin login, and sub-admin login

---

## Project Status

Latest included UI changes:

- Desktop top navigation links are hidden.
- Hamburger menu remains available for navigation.
- Large background card/frame behind public content was removed across the website.
- Typography uses **Poppins** for English and **Hind Siliguri** for Bangla fallback.
- Text spacing and heading readability were improved.
- Navigation background visual bug was fixed.
- Store payment notification and store UI updates are included.

All old `.txt` documentation files have been migrated into this `README.md` and removed from the project.

---

## Main Features

### Public Website

- Home page
- Services page
- Service detail pages
- Doctors page
- Doctor profile/detail pages
- Doctor appointment page
- Ambulance request page
- Blood donor list page
- Add blood donor information page
- Contact page
- About page with profiles, work samples, photos, and blog posts
- Store landing page
- Store category/product pages
- Checkout page
- User login and signup pages
- User profile/dashboard

### Store Module

The store module includes:

- Public `/Store` page
- Store category pages:
  - `/Store/medicine`
  - `/Store/equipment`
  - `/Store/prescribed`
- Product detail pages
- Product image gallery with swipe/scroll support
- Highlighted product price display
- Login-gated **Order Now** and **Add to Cart** buttons
- Checkout form with full name, address, and phone
- User cart
- User order history
- Order tracking
- Product reviews/comments
- Admin replies to reviews
- Verified review submission for logged-in delivered customers only
- Product dashboard/profile area
- Separate Turso database for store data

The store database auto-creates these tables on first request:

- `store_users`
- `store_products`
- `store_cart`
- `store_orders`
- `store_comments`

Delivered/review behavior:

- Public product review cards are read-only.
- Public review forms were removed from product pages.
- Store comment API accepts verified review submissions from logged-in users who have delivered orders.
- `completed` / `complete` order status is treated as delivered for review eligibility.

### Admin Panel

There are two admin areas:

| Panel | Route | Purpose |
|---|---|---|
| Master Admin | `/su` | Full owner/admin control |
| Sub-admin | `/superuser` | Limited access based on permissions |

`ADMIN_PASSWORD` is used for the master admin panel at `/su`.

Sub-admin accounts must be created from `/su` before they can log in at `/superuser`.

Sub-admin permissions can be toggled for:

- Dashboard
- Main Page
- Content Pages
- Contact Settings
- Blood
- Ambulance
- Doctors
- User Reviews
- User Login Information
- Order Details
- Add Products
- Services

### Notifications

Telegram notifications can be sent for:

- New store order
- Successful/payment-related store order activity
- New user signup
- New user login
- New user review
- New Blood section entry
- New Ambulance request form submission

Brevo transactional emails can be sent for:

- New store orders
- Admin order status changes

---

## Folder Structure

```txt
MedicareAtHome-main/
├── functions/
│   ├── _lib/
│   │   ├── about-db.js
│   │   ├── admin-users.js
│   │   ├── auth.js
│   │   ├── brevo.js
│   │   ├── db.js
│   │   ├── google-auth.js
│   │   ├── response.js
│   │   ├── seed.js
│   │   ├── store-db.js
│   │   ├── telegram.js
│   │   ├── turso.js
│   │   └── validators.js
│   ├── api/
│   │   ├── about/
│   │   ├── admin/
│   │   ├── ambulance/
│   │   ├── blood/
│   │   ├── doctors/
│   │   ├── health/
│   │   ├── settings/
│   │   └── store/
│   ├── blood/[slug].js
│   ├── doctor/[slug].js
│   └── Services/[slug].js
├── public/
│   ├── About/
│   ├── Ambulance/
│   ├── Blood/
│   ├── Contact/
│   ├── Doctors/
│   ├── Services/
│   ├── Store/
│   ├── add-blood/
│   ├── checkout/
│   ├── doctor/
│   ├── doctor-appointment/
│   ├── login/
│   ├── profile/
│   ├── signup/
│   ├── su/
│   ├── superuser/
│   ├── assets/
│   │   ├── css/styles.css
│   │   ├── img/
│   │   └── js/
│   │       ├── admin.js
│   │       ├── main.js
│   │       └── store.js
│   ├── _redirects
│   ├── index.html
│   └── manifest.json
├── scripts/check-files.js
├── package.json
├── wrangler.toml
└── README.md
```

---

## Important Routes

### Public Routes

| Route | Description |
|---|---|
| `/` | Home page |
| `/Services` | Services listing |
| `/Services/:slug` | Service detail page |
| `/Doctors` | Doctors listing |
| `/doctor/:slug` | Doctor profile/detail page |
| `/doctor-appointment` | Doctor appointment page |
| `/Ambulance` | Ambulance request page |
| `/Blood` | Blood donor listing |
| `/add-blood` | Add blood information form |
| `/Contact` | Contact page |
| `/About` | About/team/blog page |
| `/Store` | Store landing page |
| `/Store/medicine` | Medicine category |
| `/Store/equipment` | Medical equipment category |
| `/Store/prescribed` | Prescribed medicine category |
| `/Store/:slug` | Store dynamic/product page |
| `/checkout` | Store checkout |
| `/login` | Store user login |
| `/signup` | Store user signup |
| `/profile` | User profile/dashboard |

### Admin Routes

| Route | Description |
|---|---|
| `/su` | Master admin panel |
| `/superuser` | Sub-admin panel |
| `/api/health` | Health/database check endpoint |

---

## Required Cloudflare Pages Settings

Use these settings in **Cloudflare Pages**:

| Setting | Value |
|---|---|
| Framework preset | `None` |
| Build command | `echo "No build needed"` |
| Build output directory | `public` |
| Root directory | Leave blank if `public/` and `functions/` are in the repo root |
| Compatibility date | `2025-09-23` or later, but not a future date |
| Compatibility flag | `nodejs_compat` |

The included `wrangler.toml` already contains:

```toml
name = "medicare-at-home"
compatibility_date = "2025-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "public"
```

Do not place real secrets in `wrangler.toml`. Add secrets in Cloudflare Pages environment variables.

---

## Environment Variables

Add these in:

**Cloudflare Pages → Your project → Settings → Environment variables**

Add them to the **Production** environment for the live `pages.dev` site.

After adding or changing variables, redeploy the site.

### Main Website Database Variables

Required:

```env
TURSO_DATABASE_URL=libsql://your-database-your-org.turso.io
TURSO_AUTH_TOKEN=your_turso_database_auth_token
ADMIN_PASSWORD=your_master_admin_password
ADMIN_TOKEN=long_random_secret_token
SEED_ON_EMPTY=true
DEFAULT_WHATSAPP_NUMBER=8801647139287
```

Alternative main database URL variable names supported:

```env
TURSO_URL=libsql://your-database-your-org.turso.io
LIBSQL_URL=libsql://your-database-your-org.turso.io
```

Alternative token variable name supported:

```env
LIBSQL_AUTH_TOKEN=your_turso_database_auth_token
```

Optional but recommended:

```env
ADMIN_SESSION_SECRET=a_long_random_secret_for_admin_sessions
```

### Store Database Variables

The Store module uses a separate Turso database from the main website database.

```env
STORE_TURSO_DATABASE_URL=libsql://your-store-db-your-org.turso.io
STORE_TURSO_AUTH_TOKEN=your_store_db_token
STORE_AUTH_SECRET=use_a_long_random_secret_for_user_login_tokens
STORE_PASSWORD_PEPPER=optional_extra_password_hash_secret
```

Do not reuse `TURSO_DATABASE_URL` for `STORE_TURSO_DATABASE_URL` if you want store data separated.

### About Database Variables

The About section uses a third Turso database for team/blog/about content.

```env
ABOUT_TURSO_DATABASE_URL=libsql://your-about-db.turso.io
ABOUT_TURSO_AUTH_TOKEN=your_about_db_token
```

The project auto-creates these About tables:

- `about_profiles`
- `about_posts`

### Telegram Variables

Required for Telegram notifications:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_admin_group_chat_id
```

Alternative names supported by the code:

```env
TG_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_admin_group_chat_id
TG_CHAT_ID=your_admin_group_chat_id
```

The website still works if Telegram variables are missing. Telegram notifications will simply be skipped.

### Brevo Email Variables

Required for Brevo order/status email notifications:

```env
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Medicare At Home
SITE_URL=https://your-domain.pages.dev
```

Optional:

```env
BREVO_REPLY_TO_EMAIL=your_reply_email
BREVO_ORDER_EMAILS=1
```

To disable order emails without deleting your API key:

```env
BREVO_ORDER_EMAILS=0
```

Important Brevo notes:

1. The sender email must be verified in Brevo.
2. Customers only receive order emails if their account has a real email address.
3. Phone-only accounts without an email will not receive email updates.
4. Status update emails are sent only when the status actually changes.
5. If Brevo is not configured, order/status updates still work. Only email sending is skipped.

Supported admin order status labels:

- Pending
- Pending Payment
- Payment Submitted
- Payment Confirmed
- On the Way
- Delivered
- Cancelled

### Google Login Variables

Required for Google login/signup:

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
SITE_URL=https://your-domain.pages.dev
STORE_AUTH_SECRET=make_this_a_long_random_secret_if_you_have_not_added_it_already
```

Optional:

```env
GOOGLE_OAUTH_STATE_SECRET=optional_long_random_secret
```

---

## Turso Database Setup

This project uses `@libsql/client/web` for Cloudflare compatibility.

### 1. Create Main Website Database

Install and log in to Turso CLI, then run:

```bash
turso db create medicare-main
turso db show medicare-main
turso db tokens create medicare-main
```

Add the returned database URL and token to Cloudflare Pages as:

```env
TURSO_DATABASE_URL=libsql://your-main-db.turso.io
TURSO_AUTH_TOKEN=your_main_db_token
```

### 2. Create Store Database

```bash
turso db create medicare-store
turso db show medicare-store
turso db tokens create medicare-store
```

Add:

```env
STORE_TURSO_DATABASE_URL=libsql://your-store-db.turso.io
STORE_TURSO_AUTH_TOKEN=your_store_db_token
```

### 3. Create About Database

```bash
turso db create medicare-about
turso db show medicare-about
turso db tokens create medicare-about
```

Add:

```env
ABOUT_TURSO_DATABASE_URL=libsql://your-about-db.turso.io
ABOUT_TURSO_AUTH_TOKEN=your_about_db_token
```

### 4. Verify Database Connection

After deployment, open:

```txt
https://your-site.pages.dev/api/health
```

If Turso is working, it should show that the database is connected.

If the response says `hasDatabaseUrl=false` or `hasAuthToken=false`, your Cloudflare environment variables are missing or added to the wrong environment.

Important:

- Add variables to the **Production** environment for your live site.
- Redeploy after changing variables.
- Remove old MongoDB variables if this project no longer uses MongoDB.
- If an old `package-lock.json` causes dependency problems, delete it from GitHub and redeploy.

---

## Google Login Setup

This project supports Store account login/sign-up using Google.

### 1. Create Google OAuth Credentials

1. Go to Google Cloud Console.
2. Create or select a project.
3. Configure the OAuth consent screen.
4. Create an OAuth 2.0 Client ID.
5. Set application type to **Web application**.

### 2. Add Authorized JavaScript Origin

Use your live site origin:

```txt
https://your-domain.pages.dev
```

For a custom domain, also add:

```txt
https://yourdomain.com
```

### 3. Add Authorized Redirect URI

For the `pages.dev` domain:

```txt
https://your-domain.pages.dev/api/store/auth/google/callback
```

For a custom domain:

```txt
https://yourdomain.com/api/store/auth/google/callback
```

### 4. Add Cloudflare Environment Variables

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
SITE_URL=https://your-domain.pages.dev
STORE_AUTH_SECRET=make_this_a_long_random_secret_if_you_have_not_added_it_already
GOOGLE_OAUTH_STATE_SECRET=optional_long_random_secret
```

### 5. Redeploy

After adding variables, redeploy the Pages project.

How Google login works:

- Login and signup pages show a Google button.
- First Google login creates a Store user automatically.
- If the Google email already matches an existing Store account, Google login links to that account.
- Google-created accounts use the Google name/photo and do not need a password.

---

## Telegram Notification Setup

1. Create a bot using **BotFather**.
2. Copy the bot token.
3. Add the bot to your admin Telegram group.
4. Make sure the bot can read/send messages in the group.
5. Get the Telegram group chat ID.
6. Add these Cloudflare Pages environment variables:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_group_chat_id
```

Alternative environment variable names are also supported:

```env
TG_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_group_chat_id
TG_CHAT_ID=your_group_chat_id
```

If these variables are missing, the website will still work, but Telegram notifications will be skipped.

---

## Brevo Order Email Setup

This project supports Brevo transactional emails for the Store order system.

Emails are sent when:

- A customer places a store order.
- Admin changes an order status from the admin panel.

Add these required Cloudflare Pages environment variables:

```env
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Medicare At Home
SITE_URL=https://your-domain.pages.dev
```

Optional:

```env
BREVO_REPLY_TO_EMAIL=your_reply_email
BREVO_ORDER_EMAILS=1
```

Disable emails:

```env
BREVO_ORDER_EMAILS=0
```

After adding environment variables, redeploy the site.

---

## Full Cloudflare Pages Deployment Guide

### Step 1: Upload Code to GitHub

1. Extract this project zip.
2. Create a new GitHub repository.
3. Upload/push all project files.
4. Make sure the repo contains `public/`, `functions/`, `package.json`, and `wrangler.toml` at the root.

### Step 2: Create Cloudflare Pages Project

1. Open Cloudflare Dashboard.
2. Go to **Workers & Pages**.
3. Click **Create application**.
4. Choose **Pages**.
5. Connect your GitHub repository.
6. Select the Medicare At Home repo.

### Step 3: Configure Build Settings

Use:

```txt
Framework preset: None
Build command: echo "No build needed"
Build output directory: public
Root directory: leave blank
```

### Step 4: Add Compatibility Settings

In Cloudflare Pages settings:

```txt
Compatibility date: 2025-09-23
Compatibility flag: nodejs_compat
```

### Step 5: Add Environment Variables

Add the required variables for the parts you use:

Minimum required for main site/admin:

```env
TURSO_DATABASE_URL=libsql://your-main-db.turso.io
TURSO_AUTH_TOKEN=your_main_db_token
ADMIN_PASSWORD=your_master_admin_password
ADMIN_TOKEN=long_random_secret_token
SEED_ON_EMPTY=true
DEFAULT_WHATSAPP_NUMBER=8801647139287
```

Required for Store:

```env
STORE_TURSO_DATABASE_URL=libsql://your-store-db.turso.io
STORE_TURSO_AUTH_TOKEN=your_store_db_token
STORE_AUTH_SECRET=long_random_secret
```

Required for About database:

```env
ABOUT_TURSO_DATABASE_URL=libsql://your-about-db.turso.io
ABOUT_TURSO_AUTH_TOKEN=your_about_db_token
```

Optional integrations:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_group_chat_id
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Medicare At Home
SITE_URL=https://your-domain.pages.dev
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Step 6: Deploy

Click **Save and Deploy**.

### Step 7: Test the Deployment

Open:

```txt
https://your-site.pages.dev/api/health
```

Then test:

- `/`
- `/Services`
- `/Doctors`
- `/Blood`
- `/Ambulance`
- `/Store`
- `/login`
- `/signup`
- `/su`
- `/superuser`

### Step 8: Log In as Master Admin

Go to:

```txt
https://your-site.pages.dev/su
```

Use the value of:

```env
ADMIN_PASSWORD=your_master_admin_password
```

Then create sub-admins if needed.

### Step 9: Configure Store Products and Content

From `/su`, manage:

- Main page content
- Services
- Doctors
- Blood section
- Ambulance requests
- Contact settings
- Products
- Orders
- User login information
- Reviews/comments
- About profiles/posts
- Sub-admins

---

## Local Development

Install dependencies:

```bash
npm install
```

Run project file check:

```bash
npm run check
```

Run JavaScript syntax checks:

```bash
node --check public/assets/js/main.js
node --check public/assets/js/store.js
node --check public/assets/js/admin.js
```

For Cloudflare Pages Functions local testing, use Wrangler:

```bash
npx wrangler pages dev public
```

Create a local `.dev.vars` file for secrets when testing locally.

Example:

```env
TURSO_DATABASE_URL=libsql://your-main-db.turso.io
TURSO_AUTH_TOKEN=your_main_db_token
ADMIN_PASSWORD=your_master_password
ADMIN_TOKEN=local_admin_token
STORE_TURSO_DATABASE_URL=libsql://your-store-db.turso.io
STORE_TURSO_AUTH_TOKEN=your_store_db_token
STORE_AUTH_SECRET=local_store_secret
ABOUT_TURSO_DATABASE_URL=libsql://your-about-db.turso.io
ABOUT_TURSO_AUTH_TOKEN=your_about_db_token
```

Do not commit `.dev.vars` to GitHub.

---

## Admin Order Statuses

Supported order statuses:

- Pending
- Pending Payment
- Payment Submitted
- Payment Confirmed
- On the Way
- Delivered
- Cancelled

The admin UI displays `confirmed` as **Payment Confirmed**.

---

## Logo Update Notes

The website logo has been updated using the Medicare At Home logo.

Logo references were replaced in:

- Header
- Footer
- Favicon
- Manifest
- Admin/sidebar areas
- Dynamic detail pages

Logo assets are stored in:

```txt
public/assets/img/
```

---

## Redirects and Routing

The project uses `public/_redirects` for Cloudflare Pages routing.

Important redirect behavior:

- `/adminpanel` redirects to `/`
- `/doctor` redirects to `/Doctors`
- `/doctors` redirects to `/Doctors`
- `/service` and `/services` redirect to `/Services`
- `/contact` redirects to `/Contact`
- `/how-it-works` redirects to `/About`
- `/blood` redirects to `/Blood`
- `/store` redirects to `/Store`
- `/about` redirects to `/About`
- Dynamic doctor, service, blood, and store routes are mapped to their frontend pages.

---

## Troubleshooting

### Database Not Connected

Open:

```txt
/api/health
```

If the response says database variables are missing:

- Check that variables are added to **Production**.
- Check the exact variable names.
- Redeploy after saving variables.
- Make sure Turso URLs start with `libsql://`.

### Telegram Not Sending

Check:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`
- Bot is added to the group.
- Bot can send messages.
- Group chat ID is correct.

### Brevo Emails Not Sending

Check:

- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- Sender email is verified in Brevo.
- `BREVO_ORDER_EMAILS` is not set to `0`.
- `SITE_URL` is correct.

### Google Login Not Working

Check:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SITE_URL`
- Authorized JavaScript origin
- Authorized redirect URI
- `/api/store/auth/google/callback` matches exactly

### Admin Login Not Working

Check:

- Use `/su` for master admin.
- Use `/superuser` only for sub-admins created inside `/su`.
- `ADMIN_PASSWORD` exists in Cloudflare environment variables.
- Redeploy after changing `ADMIN_PASSWORD`.

---

## Removed TXT Files

The following `.txt` files were removed and their content was migrated into this README:

- `BREVO_SETUP.txt`
- `DEPLOY_FIX.txt`
- `GOOGLE_LOGIN_SETUP.txt`
- `LOGO_UPDATE.txt`
- `RBAC_ABOUT_TURSO_SETUP.txt`
- `STORE_MODULE_NOTES.txt`
- `TELEGRAM_SETUP.txt`
- `TURSO_SETUP.txt`
- `public/robots.txt`

The removed `public/robots.txt` contained:

```txt
User-agent: *
Allow: /
```

If you later want a robots file again for SEO crawlers, create `public/robots.txt` with the same content above. It was removed here because the request was to delete all `.txt` files from the project.

---

## Maintenance Notes

- Keep secrets out of GitHub.
- Do not add real API keys to `wrangler.toml`.
- Use Cloudflare Pages environment variables for production secrets.
- Redeploy after every environment variable change.
- Keep main, store, and about databases separate if you want cleaner data management.
- Run `npm run check` before deploying major edits.

## Important free-plan security update

This ZIP includes a security hardening pass that still works on free plans. Read `FREE_PLAN_SECURITY_NOTES.md` after uploading. At minimum, set these Cloudflare Pages environment variables before production use:

```env
ADMIN_SESSION_SECRET=make_this_long_random_32_chars_or_more
STORE_AUTH_SECRET=make_this_long_random_32_chars_or_more
```

Optional email verification is available with Brevo free tier by setting `REQUIRE_EMAIL_VERIFICATION=1`, `SITE_URL`, `BREVO_API_KEY`, and `BREVO_SENDER_EMAIL`.

