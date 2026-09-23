# BuildTag

**SCAN THE BUILD.**

BuildTag gives a vehicle a digital build sheet connected to one permanent physical QR decal. The owner adds photos, power figures, modifications, part links and social accounts; designs a decal in the BuildTag Designer; prints it; sticks it on the car. Anyone who scans it lands on the build page.

- Public build page: `/build/<slug>`
- Permanent scan endpoint encoded in every decal: `/s/<CODE>`
- Explore: `/explore`
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
14. [Security and privacy](#security-and-privacy)
15. [Quality checks](#quality-checks)
16. [Plans and future work](#plans-and-future-work)

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
| Files | Supabase Storage buckets `buildtag-photos`, `buildtag-avatars` (public read, owner write) |
| Images | `sharp` re-encodes uploads to WebP (strips EXIF/GPS), generates thumbnails |
| Validation | Zod on every server action and route handler |
| QR | `qrcode` (matrix generation, ECC level H), `jsqr` (decode test in the Designer) |
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
    api/                    like, photo upload, avatar upload, part suggestions
    dashboard/              owner area (garage, profile, vehicle editor, wizard, designer)
    admin/                  moderation (search, reports)
    scan/[state]/           invalid / disabled / private QR states
  components/
    build/                  public page components (hero, mods, socials, like, share, report, gallery)
    dashboard/              editor forms, managers (photos, mods, socials), analytics
    designer/               BuildTag Designer UI
    admin/, auth/, layout/, marketing/, ui/
  lib/
    supabase/               server + browser clients (no service-role client in the app)
    db/                     data access (public read model, owner queries, plan)
    actions/                server actions (auth, vehicles, mods, socials, photos, designs, admin, public)
    validation/             Zod schemas
    qr/                     matrix generation, SVG path, contrast math
    tag/                    Designer domain: types, styles, shapes, frames, templates, layout, render, checks, export
    analytics/              visitor hashing, rate limiting, device classification
supabase/
  migrations/               0001 schema, 0002 functions, 0003 security
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
| `STRIPE_*` | server, optional | reserved for future billing; nothing is charged |

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

Apply with the Supabase SQL editor, `psql`, the Supabase CLI (`supabase db push` after placing them in your project's migrations folder), or the Supabase MCP `apply_migration` tool. The exposure block in 0003 appends `buildtag` to `pgrst.db_schemas` without overwriting other schemas. If your project restricts the API through the dashboard instead, add `buildtag` under **Settings → API → Exposed schemas**.

## Storage setup

Migration 0003 creates two **public-read** buckets:

| Bucket | Path convention | Limits |
| --- | --- | --- |
| `buildtag-photos` | `<vehicle_id>/<photo_id>/full.webp` and `thumb.webp` | 10 MB, JPEG/PNG/WebP |
| `buildtag-avatars` | `<user_id>/avatar.webp` | 5 MB |

Writes are RLS-scoped: only the vehicle owner can write under their vehicle's folder. Uploads go through `/api/vehicles/[id]/photos`, which runs as the signed-in user, re-encodes with `sharp` (max 2000 px full, 640 px thumb, WebP) and inserts the `vehicle_photos` row.

## Authentication setup

Supabase Auth email + password. In the Supabase dashboard under **Authentication → URL Configuration**:

- Site URL: your `NEXT_PUBLIC_SITE_URL`
- Redirect URLs: `https://<your-domain>/auth/callback`, `http://localhost:3020/auth/callback`

Email confirmation is supported: after signup the user is sent to `/login?check_email=1`, and the confirmation link lands on `/auth/callback`, which exchanges the code and continues to `/dashboard`. Password reset links use the same callback.

Profiles are created lazily by `buildtag.ensure_profile()` on the first dashboard visit (username from signup metadata, collision-safe), so no trigger on `auth.users` is required.

## Demo data

`supabase/seed/demo_ghost_supra.sql` seeds the **GHOST 2022 Toyota GR Supra** (612 WHP / 574 WTQ, 24 modifications, vehicle socials, 30 days of scans, product and social clicks, 1,284 likes) under a demo user (`demo@buildtag.example`, random unknown password). Social URLs are obvious placeholders. Images are generated by `pnpm demo:images` into `public/demo/` and referenced with the `demo/` storage-path prefix.

Run the seed after migrations; it is idempotent. The demo build lives at `/build/ghost-2022-toyota-gr-supra`, and its permanent code is `GHS7K2P9`.

## Admin setup

Authorization is a row in `buildtag.admins`:

```sql
insert into buildtag.admins (user_id)
select id from auth.users where email = 'you@example.com';
```

Set `ADMIN_EMAILS` to the same addresses so the Admin link appears in the dashboard nav. Admin abilities: search users and vehicles, view/triage reports, disable/restore builds, disable/restore QR codes. Every admin function re-checks `buildtag.is_admin()` server-side.

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

`src/lib/tag/` is a pure, dependency-free rendering pipeline shared by the preview, the SVG export, the PNG rasterizer and the decode test:

- `types.ts`: `TagConfig` (template, shape, style, frame, size, colors, content toggles, CTA) and `TagData` (scan URL, year/make/model, nickname, power label, social handle) injected at render time so saved designs track the build.
- `shapes.ts`: outer cut-line shapes (rectangle, rounded, square, circle, hex, shield, license plate, gauge, tire, performance badge) with a `contentRect` the layout may use.
- `styles.ts`: automotive style presets (Minimal, OEM+, JDM, Euro, Muscle, Track, Off-Road, Carbon, Tech) with palettes, font stacks and decorations. Fonts are system font stacks so downloaded artwork renders identically in print software.
- `frames.ts`: QR frames (tire, wheel, turbo, gauge, piston, hex, plate, carbon badge). Each declares `inner`, the fraction of its square that the QR block occupies; everything a frame draws stays outside that square.
- `templates.ts`: Stealth, Power, Social, Spec, OEM starting points; `normalizeConfig()` coerces stored JSON.
- `layout.ts`: places text and the QR block. The QR block is the **protected area** (code + quiet zone); text scales down before the QR is allowed to shrink below 42 % of the content width.
- `render.ts`: `renderTagSvg(config, data, { guides, physical })` → SVG string with the cut-line clip path, style decoration, frame, opaque QR plate, vector QR path and text. `physical: true` writes real `in`/`mm` width and height for print.
- `checks.ts`: contrast (WCAG luminance; < 3.5:1 blocks), printed module size (< 0.45 mm blocks, < 0.7 mm warns), QR presence.
- `export.ts` (browser): rasterizes the exact export SVG to a canvas (PNG at 300 DPI, optional transparent background) and runs `jsqr` on it; the decoded string must equal the scan URL for the status to read **READY TO PRINT**. Downloads stay disabled until both the static checks and the decode test pass.

Saved designs live in `tag_designs.configuration_json`; a vehicle can hold many designs, all sharing the same permanent QR. Pro-labelled styles/shapes/frames are visible and usable in the MVP because billing is not live (`PRO_LOCKED = false` in `designer-controls.tsx`).

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
