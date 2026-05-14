# AlterationsByLisa — Order Management App

A mobile-first order management system for an alterations business.

---

## Setup (one time)

### 1. Install dependencies

```bash
cd alterations-by-lisa
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name (e.g. `alterations-by-lisa`) and a strong password
3. Wait for the project to spin up (~1 min)

### 3. Run the database migration

1. In Supabase dashboard → **SQL Editor**
2. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Paste it in and click **Run**

This creates all tables and seeds the default pricing list.

### 4. Get your API keys

In Supabase dashboard → **Settings → API**:
- Copy **Project URL**
- Copy **anon / public** key

### 5. Create `.env.local`

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Add the same two environment variables from step 5
4. Click **Deploy** — done!

---

## How to use

| Page | What it does |
|------|-------------|
| **Dashboard** | See all orders grouped by status (New / In Progress / Ready / Picked Up) |
| **New Order** | Tap service buttons to build the order — prices auto-fill |
| **Order Detail** | Advance status, record payments, add/remove services |
| **Invoice** | Print a professional invoice for the customer |
| **Pricing** | Edit prices or add new services |

---

## Tech stack

- **Next.js 14** (App Router)
- **Tailwind CSS** + custom design tokens
- **Supabase** (Postgres database)
- **Vercel** (hosting)
