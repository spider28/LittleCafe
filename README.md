# LittleCafe

Responsive cafe website built with Next.js, TypeScript, Supabase, Resend, and Vercel-ready configuration.

## Features

- Public pages: Home, Pricing, Gallery, Menu, Calender, Partnership, Waiver, Contact, and Admin.
- Supabase Auth administrator login with an `admin_profiles` allowlist.
- Supabase Storage gallery uploads from Admin.
- Weekly reservation calendar with Admin-managed reservation blocks.
- Contact form that stores messages and emails Admin through Resend.
- Waiver form with required agreements, typed signature, and Admin search.
- Site-wide V1 chatbot powered by the OpenAI Responses API.
- LangGraph remains the planned V2 path for stateful, step-by-step booking workflows.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
ADMIN_EMAIL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The app can render without these values for local UI review, but Supabase-backed forms, auth, uploads, email, and chatbot replies require their matching environment variables.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Create an Auth user for the administrator.
4. Insert the administrator into `admin_profiles`:

```sql
insert into public.admin_profiles (user_id, email)
values ('AUTH_USER_UUID', 'admin@example.com');
```

5. Set the same email in `ADMIN_EMAIL` if you also want the environment fallback and contact email recipient.

The schema creates the `gallery` storage bucket, public gallery reads, public insert policies for waivers/contact messages, and admin-only management policies for protected records.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Deployment

Deploy to Vercel and add the environment variables above in Project Settings. Use the production site URL for `NEXT_PUBLIC_SITE_URL`. Resend may require a verified sending domain before production email can be sent from your own cafe domain.

## V2/V3 Chatbot Roadmap

Future chatbot booking should use OpenAI tool/function calling through the Responses API, with LangGraph coordinating conversation state and booking steps. The chatbot should expose narrowly scoped tools for checking reservation availability, collecting guest details, and creating Supabase `reservations` records after confirmation.
