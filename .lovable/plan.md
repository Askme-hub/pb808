# Pressureboy808 Prediction Hub — Build Plan

Your spec is huge (auth, VIP, Paystack, ads, blog, referrals, analytics, admin, notifications, SEO). Shipping all of it in one turn would produce shallow, buggy code. I'll deliver it in focused phases, each one production-quality and testable before moving on.

Before I start, I need a few quick decisions, then I'll execute Phase 1 immediately.

## Questions I need answered

1. **Paystack keys** — do you have a Paystack account ready? I'll need your **Public Key** (safe in code) and **Secret Key** (stored as a secret) when we get to Phase 3. Currency will be **GHS**.
2. **Admin account** — what email should be seeded as the first admin? (You'll sign up with it, then I grant the role.)
3. **Brand direction** — keep the logo's **royal blue + silver/black** palette with a sharp, sporty, sportsbook aesthetic? (Default: yes.)
4. **Email sending** — for verification, reset, expiry alerts: OK to use **Resend** (I'll request a `RESEND_API_KEY` when needed) or skip email for v1 and rely on in-app notifications?

## Phased Delivery

### Phase 1 — Foundation (this turn after you reply)
- Enable Lovable Cloud (Postgres + Auth + Storage + Server functions)
- Design system in brand colors (royal blue #1d2dd6, silver, black) + typography
- Public shell: header, footer, hero, routes scaffold
- Database schema: `profiles`, `user_roles`, `predictions`, `subscriptions`, `payments`, `ad_slots`, `blog_posts`, `referrals`, `notifications`, `settings`, `activity_logs` — with RLS + grants
- Auth: email/password + Google, email verification, password reset
- Homepage with latest free tips, stats strip, VIP upgrade banner, testimonials, FAQ, footer

### Phase 2 — Predictions + VIP gating
- Free tips list/detail with comments, share, confidence, status badges
- VIP area with blurred previews for non-subscribers
- Categories: Free, VIP, Correct Score, Over/Under, BTTS, HT/FT, Accumulator
- Results tracking + win-rate computation (daily/weekly/monthly)
- Public stats page with charts (recharts)

### Phase 3 — Paystack + Subscriptions
- Paystack checkout (51 GHS / 1-day default plan + Monthly/Quarterly/Lifetime tiers)
- Initialize via server function, verify via `/api/public/paystack/webhook` (HMAC verified)
- Auto-expire job (read-time check + scheduled invalidation)
- User dashboard: subscription status, expiry, payment history, saved/favorited tips, notifications

### Phase 4 — Admin Panel
- `/admin` (role-gated): overview KPIs (users, VIPs active/expired, revenue today/month/total, prediction stats)
- Prediction CRUD with scheduling & result marking
- VIP subscriber management (activate/extend/cancel/export CSV)
- Revenue + accuracy + growth charts

### Phase 5 — Ads, Blog, Referrals, Notifications, SEO
- Ad management (popup/banner/native slots, AdSense/Monetag/Adsterra/PropellerAds code injection, schedule, enable/disable)
- Blog with categories, tags, SEO slugs, search
- Referral links + reward config (admin-tunable VIP extension days)
- In-app notification center + (optional) Resend emails
- Per-route SEO meta, OG, JSON-LD, sitemap.xml, robots.txt

## Technical notes
- Stack: TanStack Start + React 19 + Tailwind v4 + Lovable Cloud (Supabase under the hood)
- Roles in a separate `user_roles` table with `has_role()` security-definer (prevents privilege escalation)
- All money in pesewas (integer) to avoid float bugs
- Paystack webhook at `/api/public/paystack/webhook` with `x-paystack-signature` HMAC-SHA512 verification
- Server functions for all writes; RLS enforces read scope
- Note: backend rate-limiting primitives aren't available yet, so I'll skip explicit rate-limit code (Cloudflare in front already mitigates basic abuse)

Reply with answers to the 4 questions (or just say "go with defaults: skip email for v1, blue/silver brand, I'll provide Paystack keys at Phase 3, admin email = ___") and I'll start Phase 1 immediately.