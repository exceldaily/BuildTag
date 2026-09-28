# BuildTag

**SCAN THE BUILD.**

BuildTag gives a vehicle a digital build sheet connected to one permanent physical QR decal. The owner adds photos, power figures, modifications, part links and social accounts; designs a decal in the BuildTag Designer; prints it; sticks it on the car. Anyone who scans it lands on the build page.

- Public build page: `/build/<slug>`
- Permanent scan endpoint encoded in every decal: `/s/<CODE>`
- Explore: `/explore`
- Scan leaderboard: `/leaderboard` (all time, this month, this week, today)
- Owner dashboard: `/dashboard`
- Admin: `/admin`

---

## Contents

1. [Product](#product)
2. [Architecture](#architecture)
3. [Local development](#local-development)
4. [Environment variables](#environment-variables)
5. [Supabase setup](#supabase-setup)
6. [Database migrations](#database-migrations)
7. [Storage setup](#storage-setup)
8. [Authentication setup](#authentication-setup)
9. [Demo data](#demo-data)
10. [Admin setup](#admin-setup)
11. [Vercel deployment](#vercel-deployment)
12. [QR architecture](#qr-architecture)
13. [BuildTag Designer architecture](#buildtag-designer-architecture)
14. [Physical ordering](#physical-ordering)
15. [Security and privacy](#security-and-privacy)
16. [Quality checks](#quality-checks)
17. [Plans and future work](#plans-and-future-work)

---

## Product

Core loop: **create vehicle → build profile → add modifications → add socials → generate permanent QR → design BuildTag → print → place on vehicle → someone scans → view build → follow / view parts / share.**

What a visitor sees after a scan: vehicle, photos, horsepower, torque, mod count, categorized modifications with **View part** links, build cost (if public), installer/shop, vehicle socials first then owner socials, likes, and share. Every public page is server-rendered and image-first so it loads fast on cellular.

What an owner gets: a six-step onboarding wizard, a sectioned vehicle editor with autosave, drag-and-drop photos/mods/socials, a permanent QR from the moment the vehicle exists, the Designer (templates, shapes, styles, frames, colors, sizes, SVG/PNG export with a scan test), saved designs, and analytics (scans today/7d/30d/all time, scans over time, most clicked parts, top social links, devices, countries).

## Architecture

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Server Actions, `proxy.ts`) |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4, shadcn/ui primitives (base-ui), custom dark motorsport theme |
| Data | Supabase Postgres, schema `buildtag`, Row Level Security everywhere |
| Auth | Supabase Auth (email + password, PKCE callback at `/auth/callback`) |
| Files | Supabase Storage: `buildtag-photos`, `buildtag-avatars`, `buildtag-tag-assets` (public read, owner write); `buildtag-production` (private artwork) |
| Images | `sharp` re-encodes uploads to WebP (strips EXIF/GPS), generates thumbnails |
| Validation | Zod on every server action and route handler |
| QR | `qrcode` (matrix generation, ECC level H), `jsqr` (decode test in the Designer and before every order), `opentype.js` (fonts to paths for print) |
| Hosting | Vercel (`vercel.json` included) |
| PWA | `app/manifest.ts`, `public/sw.js`, icons in `public/icons` |

### Code layout

```
src/
  app/                      routes
    (marketing)/            landing, explore, about, legal
    (auth)/                 login, signup, forgot-password
    build/[slug]/           public build page (+ metadata, JSON-LD)
    s/[code]/               permanent QR resolver (redirect)
    out/[slug]/part|social  outbound click tracking redirects
    api/                    like, photo/avatar/tag-asset uploads, part suggestions, production snapshots + artwork download
    dashboard/              owner area (garage, profile, vehicle editor, wizard, designer, orders)
    admin/                  moderation (search, reports) and the fulfillment queue
    scan/[state]/           invalid / disabled / private QR states
  components/
    build/                  public page components (hero, mods, socials, like, share, report, gallery)
    dashboard/              editor forms, managers (photos, mods, socials), analytics
    designer/               BuildTag Designer UI
    admin/, auth/, layout/, marketing/, ui/
  lib/
    supabase/               server + browser clients (no service-role client in the app)
    db/                     data access (public read model, owner queries, plan)
    actions/                server actions (auth, vehicles, mods, socials, photos, designs, admin, public, orders)
    fulfillment/            FulfillmentProvider abstraction (manual queue provider included)
    payments/               PaymentProvider abstraction (Stripe Checkout when configured)
    validation/             Zod schemas
    qr/                     matrix generation, styled module/finder renderer, contrast math, QR SAFE ENGINE
    tag/                    Designer domain: types, templates, shapes, layouts, fonts, frames, backgrounds, palettes, sizes, render, export
    analytics/              visitor hashing, rate limiting, device classification
supabase/
  migrations/               0001 schema, 0002 functions, 0003 security, 0004 orders
  seed/                     demo vehicle
scripts/                    RLS test, icon + demo image generation
```

### Data model (schema `buildtag`)

`profiles`, `admins`, `subscriptions`, `shops`, `parts`, `vehicles`, `vehicle_photos`, `modifications` (optional `part_id`, `shop_id`, `affiliate_url`), `social_links` (owner_type profile | vehicle | shop), `qr_codes`, `scan_events`, `product_clicks`, `social_clicks`, `build_likes`, `reports`, `tag_designs`. Counters (`mod_count`, `like_count`, `scan_count`, `click_count`) are maintained by triggers. Indexes cover slugs, codes, owners, vehicle foreign keys, event timestamps, visibility and parts/shop slugs.

### Access model

- **Anonymous** visitors have **no table privileges**. Public data comes through the `public_builds` view (public + active only) and security-definer functions: `get_public_build`, `resolve_scan`, `toggle_like`, `record_product_click`, `record_social_click`, `submit_report`. Each function re-checks visibility and status.
- **Owners** use ordinary table access; RLS policies scope every row to `auth.uid()`.
- **Admins** are rows in `buildtag.admins`. `is_admin()` gates admin policies and every `admin_*` function. Hiding the UI is never the only gate.
- The application never uses the service-role key. It is optional and only read by `scripts/rls-test.ts`.

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in values (see below)
pnpm dev                     # http://localhost:3020
```

Other scripts:

```bash
pnpm typecheck      # next typegen + tsc --noEmit
pnpm lint           # eslint
pnpm build          # production build
pnpm rls:test       # live RLS verification (needs SUPABASE_SERVICE_ROLE_KEY)
pnpm icons          # regenerate PWA icons from public/icons/icon.svg
pnpm demo:images    # regenerate demo vehicle imagery
```

## Environment variables

See `.env.example`. Summary:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | anon/publishable key (no table privileges in `buildtag`) |
| `NEXT_PUBLIC_SITE_URL` | public | absolute origin used in QR codes, OpenGraph, sitemap. **Set to the production domain before printing decals.** |
| `BUILDTAG_VISITOR_SECRET` | server | HMAC secret for anonymous like/report keys |
| `ADMIN_EMAILS` | server | comma-separated emails that see the Admin nav link (authorization is the `admins` table) |
| `SUPABASE_SERVICE_ROLE_KEY` | scripts only | used by `pnpm rls:test`; never read by the app |
| `STRIPE_SECRET_KEY` | server | turns on Stripe Checkout for decal orders and Pro |
| `STRIPE_WEBHOOK_SECRET` | server | signing secret of the endpoint registered at `/api/stripe/webhook` |
| `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY` | server | recurring Stripe prices ($5/mo, $50/yr); both must be set for Pro checkout to show |
| `BUILDTAG_INTERNAL_TOKEN` | server | random string that must equal `buildtag.private_settings.billing_token`; lets the webhook write orders and subscriptions without a service-role key |
| `FULFILLMENT_PROVIDER` | server, optional | `manual` (default). Name of the fulfillment provider registered in `src/lib/fulfillment` |

Service-role credentials are never referenced from client components; `src/lib/server-env.ts` imports `server-only`.

## Supabase setup

1. Create a Supabase project (or reuse one: BuildTag isolates itself in the `buildtag` schema and only touches `auth.users` by reference and `storage.buckets/objects` for its two buckets).
2. Apply the migrations (next section).
3. Copy the project URL and anon/publishable key into `.env.local`.
4. Configure Auth URLs (see Authentication setup).

## Database migrations

Files in `supabase/migrations/`, applied in order:

| File | Contents |
| --- | --- |
| `0001_buildtag_schema.sql` | schema, enums, tables, indexes, triggers for `updated_at` |
| `0002_buildtag_functions.sql` | authorization helpers, slug/QR triggers, counters, plan limits, the public read model (`public_builds`, `get_public_build`), scan/like/click/report functions, analytics, admin functions |
| `0003_buildtag_security.sql` | RLS enablement + policies, storage buckets + policies, append-safe PostgREST exposure of the `buildtag` schema |
| `0004_buildtag_orders.sql` | print specifications, immutable production snapshots, orders/items/events, production + tag-asset buckets, `place_order()` and `admin_set_order_status()` |
| `0005_buildtag_ensure_profile_race.sql` | `ensure_profile()` tolerates concurrent first-visit inserts |
| `0006_buildtag_affiliate.sql` | public payload flags affiliate parts (`is_affiliate`, `has_affiliate_links`); analytics report affiliate clicks and monetized parts |
| `0007_buildtag_billing.sql` | `private_settings` (billing token), token-gated `billing_*` functions the Stripe webhook writes through, `billing_remember_customer()` |
| `0008_buildtag_leaderboard.sql` | `scan_leaderboard(period, limit)` for the public leaderboard, `build_owner_plan()` for the Pro badge |
| `0009_buildtag_locale_crews.sql` | `profiles.locale` / `profiles.region` (seeded from sign-up metadata), crews tables + `create_crew`, `crew_add_member`, `crew_remove_member`, `delete_crew`, `get_crew`, `build_crew`, `my_crew` |
| `0010_buildtag_comp_plans.sql` | complimentary Pro (`admin_set_plan`), expiry-aware `user_plan()`, `admin_list_members` |
| `0011_buildtag_free_tags.sql` | admin free-tag orders (`admin_place_comp_order`) |
| `0012_buildtag_crew_leaderboard.sql` | `crew_leaderboard()` |
| `0013_buildtag_order_operations.sql` | sequential order numbers, production statuses + guarded transitions, frozen order-item product facts, status events with actor/metadata, Stripe event idempotency, notification log, proofs bucket, server QR validation + checksum on snapshots, `customer_cancel_order` |
| `0008_buildtag_leaderboard.sql` | `scan_leaderboard(period, limit)` for `/leaderboard` (all time, month, week, day) and `build_owner_plan()` for the Pro badge |

Apply with the Supabase SQL editor, `psql`, the Supabase CLI (`supabase db push` after placing them in your project's migrations folder), or the Supabase MCP `apply_migration` tool. The exposure block in 0003 appends `buildtag` to `pgrst.db_schemas` without overwriting other schemas. If your project restricts the API through the dashboard instead, add `buildtag` under **Settings → API → Exposed schemas**.

## Storage setup

Migration 0003 creates two **public-read** buckets:

| Bucket | Path convention | Limits |
| --- | --- | --- |
| `buildtag-photos` | `<vehicle_id>/<photo_id>/full.webp` and `thumb.webp` | 10 MB, JPEG/PNG/WebP |
| `buildtag-avatars` | `<user_id>/avatar.webp` | 5 MB |
| `buildtag-tag-assets` | `<user_id>/logo-*.png|svg`, `background-*.webp` | 5 MB, public read |
| `buildtag-production` | `<user_id>/<snapshot_id>/artwork.svg|png` | 25 MB, private (owner + admin) |

Writes are RLS-scoped: only the vehicle owner can write under their vehicle's folder. Uploads go through `/api/vehicles/[id]/photos`, which runs as the signed-in user, re-encodes with `sharp` (max 2000 px full, 640 px thumb, WebP) and inserts the `vehicle_photos` row.

## Authentication setup

Supabase Auth email + password. In the Supabase dashboard under **Authentication → URL Configuration**:

- Site URL: your `NEXT_PUBLIC_SITE_URL`
- Redirect URLs: `https://<your-domain>/auth/callback`, `http://localhost:3020/auth/callback`

Email confirmation is supported: after signup the user is sent to `/login?check_email=1`, and the confirmation link lands on `/auth/callback`, which exchanges the code and continues to `/dashboard`. Password reset links use the same callback.

Profiles are created lazily by `buildtag.ensure_profile()` on the first dashboard visit (username from signup metadata, collision-safe), so no trigger on `auth.users` is required.

## Demo data

`supabase/seed/demo_ghost_supra.sql` seeds the **GHOST 2022 Toyota GR Supra** (540 WHP / 520 WTQ, 24 modifications, vehicle socials, 30 days of scans, product and social clicks, 1,284 likes) under a demo user (`demo@buildtag.example`, random unknown password). Social URLs are obvious placeholders. Images are generated by `pnpm demo:images` into `public/demo/` and referenced with the `demo/` storage-path prefix.

Run the seed after migrations; it is idempotent. The demo build lives at `/build/ghost-2022-toyota-gr-supra`, and its permanent code is `GHS7K2P9`.

`supabase/seed/demo_rosso_panigale.sql` seeds the **ROSSO 2021 Ducati Panigale V2** (148 WHP / 72 WTQ, 20 modifications) under the same demo user, so the site has a motorcycle example for bike shops. It lives at `/build/rosso-2021-ducati-panigale-v2` with permanent code `RSSV2K7P`. Photos: `pnpm images rosso`.

## Admin setup

Authorization is a row in `buildtag.admins`:

```sql
insert into buildtag.admins (user_id)
select id from auth.users where email = 'you@example.com';
```

After the first admin exists, add or remove admins from **Admin → Members** (Make admin / Remove admin, migration 0019). Nobody can remove their own admin role and there is always at least one admin.

The Admin link appears in the dashboard nav for anyone in `buildtag.admins`. `ADMIN_EMAILS` is only a fallback address for business-inquiry notification emails. Admin abilities: search users and vehicles, view/triage reports, disable/restore builds, disable/restore QR codes. Every admin function re-checks `buildtag.is_admin()` server-side.

### Business accounts (0017)

`/admin/organizations` → **Create business account** sets up a business directly, already Active (no registration or approval step). The owner can be:

- a username (`@name`) or the email of an existing account: added as owner right away;
- an email with no account yet: saved as an invite in `organization_invites`. It turns into a membership the first time that person loads the dashboard after signing up and confirming that email.

For testing, choose **Add me to it** (or open the business and click **Add me as owner**), then **Open business dashboard as me**. Each business's admin page also manages members and invites and shows its analytics.

**Business analytics** (`/dashboard/business/analytics`, `org_analytics()`) covers the builds a business is linked to (creator, builder, dealer, installer, ...) or recorded parts on, and the parts it recorded or is credited with installing: scans over time, part clicks, top parts, most scanned builds, categories, devices, countries. Aggregate counts only; parts an owner hides are excluded. Tests: `supabase/tests/0017_admin_business_analytics.test.sql` (run inside `begin; ... rollback;`).

### Account deletion (0018)

Users delete their own account under **Profile → Delete account** (password + typing `DELETE`). `account_deletion_check()` powers the preview and blockers; `delete_my_account()` does the deletion in one transaction.

- Blocked while the user is the only owner of a business, has an order in progress, or has an active Stripe subscription.
- Builds a business created and the user claimed go back to that business, unclaimed (the decal keeps working). Other vehicles are deleted with their photos, parts, QR and analytics.
- Paid orders are kept as records with `user_id` null; drafts and unpaid orders are deleted.
- The server action removes storage files (vehicle photos, avatar, Designer assets) first, because the storage policies need the rows to exist. Production artwork files stay in the private production bucket.
- Tests: `supabase/tests/0018_account_deletion.test.sql`.

## Vercel deployment

1. Import the repository in Vercel (framework preset: Next.js).
2. Add the environment variables from `.env.example` (production values; `NEXT_PUBLIC_SITE_URL` = your domain).
3. Deploy. `vercel.json` raises memory/duration for the photo upload route.
4. Add the production `/auth/callback` URL to Supabase Auth redirect URLs.

Any hosting that runs Next.js 16 with Node 20+ works; `sharp` is a native dependency and is allowed to build via `pnpm-workspace.yaml`.

## QR architecture

**Decals never encode a slug.** They encode `https://<site>/s/<CODE>` where `CODE` is an 8-character random string over a 32-symbol alphabet (no 0/O/1/I), created by a trigger the moment a vehicle is inserted and stored in `qr_codes`.

Scan flow (`src/app/s/[code]/route.ts` → `buildtag.resolve_scan`):

1. validate the code format
2. look up `qr_codes` by code
3. check QR status (disabled → `/scan/disabled`)
4. check vehicle status (disabled → `/scan/build-disabled`)
5. record a `scan_events` row (unless the user agent is a known bot) with coarse device type, country from the edge header and referrer host only
6. private vehicle → `/scan/private`; otherwise 302 to the **current** `/build/<slug>?via=tag`

Because the decal only knows the code, slugs, usernames, ownership and even site architecture can change without reprinting. Owners cannot modify `qr_codes` (no update policy); admins can disable/restore.

Reliability rules in `src/lib/qr/generate.ts`: error correction level **H**, quiet zone of 4 modules, modules rendered as one merged vector path with `shape-rendering="crispEdges"`, always on an opaque plate.

## BuildTag Designer architecture

`src/lib/tag/` is a pure rendering pipeline shared by the live preview, control thumbnails, the decoder test, the SVG/PNG downloads and the production snapshot. One `TagConfig` in, one SVG out; nothing is re-created for print.

- `types.ts`: `TagConfig` v2 (template, shape, layout, font, qr style, frame, colors, text, social, background, size, material, advanced) and `TagData` (scan URL, vehicle facts, socials) injected at render time. `templates.ts#normalizeConfig` migrates v1 designs.
- `templates.ts`: 13 templates (Stealth, OEM+, JDM, Euro, Muscle, Track, Off-Road, Carbon, Tech Spec, Power, Social, Build Sheet, Minimal QR). Each sets shape, layout, font, palette, QR style, frame, background and text, so they differ structurally, not just in color.
- `shapes.ts`: 12 cut-line shapes drawn into the physical W×H box (round shapes use the largest centered square) with a `contentRect` the layout may use.
- `layouts.ts` + `layout.ts`: 9 curated layouts (stack or row) that assign text roles to slots, pick a hero role, fit text, and reserve the protected QR block. No freeform dragging, so every design stays printable.
- `fonts.ts`: six OFL-licensed families in `/public/fonts` (licenses alongside) used both by the preview (`@font-face`) and the export (opentype.js text-to-path).
- `../qr/render.ts`: styled QR renderer. 8 module styles and 6 finder presets change only how a dark module is drawn; the matrix and the 1:1:3:1:1 finder ratios are untouched. Optional center logo (BuildTag wordmark, owner upload, shop) on a backing plate with a clamped size (12–24 % of the code side).
- `../qr/safety.ts`: QR SAFE ENGINE. Grades ECC, quiet zone, physical module size against the print spec, logo coverage, contrast, finder protection and decorative overlap into EXCELLENT / GOOD / RISKY / INVALID with reasons. It is labelled a design check; only the decoder can validate.
- `frames.ts`: 10 automotive frames (tire, wheel, turbo, tachometer, piston, hex, race plate, license plate, carbon badge, engineering) drawn strictly outside the protected block.
- `backgrounds.ts`: solid, transparent, carbon, grid, race stripe, honeycomb, brushed metal, owner photo (dimmed). The QR always keeps an opaque plate.
- `render.ts`: `renderTagSvg(config, data, { mode, guides, physical, geometry, textToPath })`. Preview mode draws safe-zone guides (cut line, bleed, cut-safe, text-safe, protected QR block) and the material treatment; export mode adds bleed geometry, physical `in` dimensions and a named cut-path layer (`CutContour` by default, configurable per print spec).
- `export.ts` (browser): rasterization, PNG at 300 DPI, `decodeAtSizes` (jsQR at 600/1000/1600 px, all must read), `makeTextToPath` (opentype.js) and `embedRemoteImages` so production SVGs never depend on fonts or remote assets.

Designer UI (`src/components/designer/`): desktop is controls / large preview / info-and-order columns; on phones the preview comes first with the controls underneath as expandable sections (Template, Shape, Layout, QR Style, Frame, Colors, Text, Vehicle Data, Social, Background, Size, Material Preview, Advanced). The preview switches between flat artwork and an approximate on-car placement (rear window, quarter window, bumper, body panel; dark or light car).

## Physical ordering

1. **Approve proof** in the designer: fonts are converted to paths, remote images embedded, the production SVG is re-decoded, a 300 DPI PNG is rasterized, and both are uploaded to the private `buildtag-production` bucket.
2. `POST /api/snapshots` inserts an immutable `tag_production_snapshots` row (configuration, dimensions, material, quantity, frozen QR destination URL, storage paths, validation status and report). A database trigger rejects updates.
3. **Checkout** (`/dashboard/orders/new?snapshot=…`) collects the shipping address; `buildtag.place_order()` prices the item from `print_specifications` (never from the client), refuses failed artwork or preview-only materials, and creates `orders`, `order_items` and an `order_events` entry in one transaction.
4. **Payment**: `src/lib/payments` picks Stripe when `STRIPE_SECRET_KEY` is set (Checkout Session via the REST API); otherwise orders wait in `awaiting_payment` and an admin marks them paid.
5. **Fulfillment**: `src/lib/fulfillment` is a provider abstraction. The default `manual` provider is the admin queue at `/admin/orders` (download artwork, submit, update status, tracking). A printer API plugs in by implementing `FulfillmentProvider` and setting `provider`/`provider_sku` on the relevant print specifications.

Order statuses: draft, awaiting_payment, paid, preparing_artwork, submitted_to_printer, in_production, shipped, delivered, cancelled, production_error. Customers see a timeline at `/dashboard/orders/[id]`.

Print specifications (`print_specifications`) hold size, bleed, safe margin, cut-path style, minimum module size, price and provider SKU. Sizes ship as Small 3×3, Standard 4×4, Wide 5×3 and Large 5×5 in; Gloss and Matte are orderable, Transparent/Reflective/Holographic are preview-only until a SKU is configured.

`pnpm qr:validate` renders every template × shape × frame plus every module × finder style (with and without a center logo) through the export pipeline and decodes them with jsQR at two sizes.

## Affiliate links (owners earn from their parts list)

Every modification can carry an owner's own affiliate link. Nothing is brokered by BuildTag: the owner joins the program (Amazon Associates, eBay Partner Network, Impact, ShareASale/Awin, AvantLink, CJ, or a brand's direct program), pastes the tracking link on the part, and keeps the commission.

- `src/lib/affiliate.ts`: program directory, URL detection (names the program from the link shape, warns when a link is a plain product page with no tracking) and the disclosure text.
- Editor (`src/components/dashboard/affiliate-panel.tsx`): monetization summary and progress at the top of the modifications page, an **Earning / Link / + Earn** badge on every part, and an "Earn from this part" block in the part dialog that auto-fills the program.
- Public page: `View part` goes through `/out/<slug>/part/<id>` (affiliate URL preferred, click recorded, `rel="nofollow sponsored"`) and the modifications section shows the affiliate disclosure whenever the build has any affiliate link.
- Analytics: affiliate clicks (all time and 30 days), monetized vs linked vs total parts, and an **Earning** marker on the most-clicked parts.

## Billing (Stripe)

- **Pro subscription**: `$5/month` or `$50/year`. The profile page shows a plan panel with both options; `startProCheckoutAction` opens Stripe Checkout in subscription mode with `client_reference_id` = user id and `subscription_data.metadata.user_id`. `openBillingPortalAction` opens the Stripe customer portal (change plan, card, cancel).
- **Decal orders**: `startCheckoutAction` opens Checkout in payment mode with `metadata.order_id`.
- **Webhook** (`/api/stripe/webhook`): verifies `Stripe-Signature` (HMAC v1, 5 minute tolerance), then calls `billing_mark_order_paid` or `billing_upsert_subscription`. Those are security-definer functions gated by `BUILDTAG_INTERNAL_TOKEN`, so the app still holds no service-role key. Events to subscribe: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
- `buildtag.user_plan()` reads the subscription row, and the database enforces plan limits (vehicles, photos, designs) through `plan_limits()`.

## Language, region and crews

- **Language + region** are chosen at sign-up (English, French, German, Spanish, Thai; regions US, CA, GB, EU, AU/NZ, TH, Asia, Latin America, other) and editable on the profile page. They live on `profiles.locale` / `profiles.region`; the language is mirrored in the `bt_locale` cookie so `<html lang>`, the marketing header and public build pages follow it for signed-out visitors too. Strings are in `src/lib/i18n/dictionary.ts` and cover navigation, the garage, profile basics and the public build page. Data-heavy screens (designer, orders, analytics, admin) are English for now.
- **Crews** (`/dashboard/crew`, public page `/crew/<slug>`): a Pro member creates one crew and adds members by username (members do not need Pro; one crew per person; 25 max). The crew page lists every member's public builds and their combined scans; each member's build page shows a crew badge. All writes go through security-definer functions that enforce the Pro check and ownership.
- **Scan leaderboard** (`/leaderboard`): most scanned public builds all time, this month, this week and today (calendar periods, server time zone), via `scan_leaderboard()`.

## BuildTags order operations

Manual fulfillment, built so a printer API can replace the manual steps later without touching checkout.

**Flow.** Designer → Approve proof (browser export, fonts to paths) → `POST /api/snapshots` re-decodes the QR on the server, stores the SVG/PNG privately, publishes a small proof image, records a SHA-256 → Final proof page (`/dashboard/orders/new`) with the required approval checkbox → `place_order()` freezes product/price on the order item → Stripe Checkout → **the webhook alone marks it paid** → status `needs_review` → admin emails + customer confirmation → `/admin/orders` queue → approve / issue / sent to maker / in production / tracking → shipped email → delivered.

**Environment**

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | card checkout + signed webhook (`/api/stripe/webhook`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.*`) |
| `BUILDTAG_INTERNAL_TOKEN` | equals `buildtag.private_settings.billing_token`; lets the webhook write through `billing_*` functions with no service-role key |
| `RESEND_API_KEY`, `FROM_EMAIL` | transactional email (Resend REST). Missing values = emails are logged as `skipped`, orders are unaffected |
| `ORDER_NOTIFICATION_EMAIL` | where new-order and artwork-issue alerts go |
| `AUTO_SUBMIT_TO_FULFILLMENT` | reserved, keep `false`: every order is reviewed by a human |

**Order numbers.** `BT-000001` style from `buildtag.order_number_seq` via `next_order_number()` (default on `orders.order_number`). UUIDs stay the primary key.

**Statuses.** `draft → awaiting_payment → payment_processing → needs_review → artwork_approved | artwork_issue → sent_to_maker → in_production → shipped → delivered`, plus `cancelled`, `refunded`, `production_error`. `admin_set_order_status()` enforces the allowed transitions, stamps `reviewed_at / approved_at / sent_to_maker_at / production_started_at / shipped_at / delivered_at / cancelled_at / refunded_at`, and writes an `order_events` row with `previous_status`, `actor`, `actor_user_id` and metadata (reason, tracking). `src/lib/orders/status.ts` mirrors the machine for the UI and tests.

**Payment.** `startCheckoutAction` opens Stripe Checkout and marks the order `payment_processing`. Only `/api/stripe/webhook` can set `paid`: it verifies the signature, records the event id in `payment_events` (duplicates are acknowledged and ignored), calls `billing_mark_order_paid()` (idempotent, moves to `needs_review`), then sends the admin + customer emails once. The `/dashboard/orders/[id]?paid=1` success URL only shows a "confirming" message.

**Snapshots.** `tag_production_snapshots` rows are immutable (trigger). They hold the design JSON, size, material, finish, QR destination, storage paths, proof path, SHA-256 and the full validation report (browser decode + server decode at 700 and 1200 px). Editing the vehicle, profile or design afterwards never changes a snapshot; the permanent `/s/CODE` link keeps resolving to the current build.

**Reviewing an order.** Email → *View order* → `/admin/orders/[id]`: customer, shipping (copy button), vehicle, product/SKU, large proof, QR status + destination test link, payment, production timestamps, timeline, notification log. Actions appear per state: Approve artwork, Mark artwork issue (reason required), Mark sent to maker, Mark in production, Add tracking & ship (emails the customer), Mark delivered, Production issue, Cancel, Refund (record only; refund in Stripe first).

**Manufacturer files.** Admin-only: `…/artwork?format=svg|png&order=BT-000127` downloads `BT-000127-production.svg/png`; `/admin/orders/[id]/production-sheet` prints the sheet; `/api/admin/orders/[id]/package` zips SVG + PNG + proof + sheet + README. Customers only ever see the proof image (`buildtag-proofs` bucket, unguessable path); the production bucket is admin-only by storage RLS.

**Notifications.** `notification_events` logs every send (`sent | failed | skipped`, provider id, error). Failures never fail the order. To retry after fixing email config, re-trigger the transition (shipped) or resend from Resend; a resend UI is a small follow-up.

**Future automation.** `src/lib/fulfillment` keeps the provider abstraction (`ManualFulfillmentProvider` today). A printer API provider implements `submitOrder`/`getStatus`, sets `provider` + `provider_sku` on `print_specifications`, and flips `AUTO_SUBMIT_TO_FULFILLMENT`; orders, snapshots and statuses do not change.

**Tests.** `pnpm test` covers the state machine, customer-safe labels, file naming, shipping lines and webhook signature verification (accept, bad signature, missing header, stale timestamp, tampered body). Database guards (immutability, RLS, duplicate webhooks) are exercised by `scripts/rls-test.ts` with a service-role key.

## Security and privacy

- RLS on every table; owners only modify their own rows; anon has no table privileges.
- Private builds are unreachable through any API path (`get_public_build`, `public_builds`, `resolve_scan` all enforce it). Unlisted builds work by link and never appear in Explore or the sitemap.
- All input is validated with Zod server-side; URLs must be `http(s)`; social URLs must be `https`; outbound redirects re-validate the scheme.
- No database ids on public pages: modifications and social links expose random `public_id`s; scan codes are random.
- Analytics store no IP or user agent. Likes/reports use an HMAC visitor key from a first-party cookie plus a coarse network prefix, plus per-network rate limits and database-level caps.
- Uploaded images are re-encoded (EXIF including GPS removed). Owner location is free text and optional.
- Security headers (`nosniff`, `X-Frame-Options: DENY`, referrer policy, permissions policy) are set in `next.config.ts`.
- `pnpm rls:test` exercises: A cannot edit B's vehicle, A cannot delete B's modification, private builds cannot be retrieved anonymously, unlisted builds work by link but are hidden from Explore, disabled builds are inaccessible, QR redirect respects vehicle state, admin permissions, like toggling, plan limits.

## Quality checks

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Manual pass: signup → create vehicle → upload photo → add horsepower → add vehicle Instagram → add modifications → QR generated → open designer → pick template → customize → download SVG/PNG → scan QR → redirect → public page → view mods → click social → click part → like → share → analytics.

## Plans and future work

- Plans: `subscriptions` table + `buildtag.user_plan()`; limits enforced in database triggers (`plan_limits()`): Free = 1 vehicle, 12 photos, 5 designs; Pro = 10 vehicles, 60 photos, 25 designs. Stripe is not wired; `STRIPE_*` variables are reserved.
- Affiliate-ready: `modifications.affiliate_url` wins over `product_url` in **View part**; `merchant` and `affiliate_network` are stored; clicks are tracked per modification.
- Parts database: `parts` table + optional `modifications.part_id`; `/api/parts/suggest` powers the part-name suggestions in the editor. Future `/parts/<slug>` pages can aggregate installs.
- Shops: `shops` table + optional `modifications.shop_id`; the public page shows **Installed by** when set.

Legal pages (`/terms`, `/privacy`, `/community-guidelines`, `/dmca`) are initial templates that need legal review before commercial launch.
