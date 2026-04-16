# Transfer Marmaris — Frontend

Built with Next.js 14 · Tailwind CSS · Supabase · TypeScript

## Getting started

### 1. Install dependencies

Make sure you have Node.js installed (v18 or later).
Download from: https://nodejs.org

Open a terminal in this folder and run:

```
npm install
```

### 2. Set up environment variables

Copy the example file:
```
cp .env.example .env.local
```

Open `.env.local` and fill in your two Supabase values.
Find them in: Supabase Dashboard → Settings → API

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Leave the Stripe keys blank for now — the app works without them,
it just won't process real payments yet.

### 3. Run the development server

```
npm run dev
```

Open http://localhost:3000 in your browser.

### 4. Pages available

| URL                  | What it is                          |
|----------------------|-------------------------------------|
| /                    | Homepage with search form           |
| /search              | Vehicle results (from Supabase)     |
| /booking             | Passenger details + payment         |
| /confirmation        | Booking confirmed screen            |
| /auth/signin         | Sign in                             |
| /auth/signup         | Create account                      |
| /provider            | Provider dashboard (coming next)    |
| /admin               | Admin panel (coming next)           |
| /review              | Customer review page (coming next)  |

### 5. Deploy to Netlify (free)

1. Push this folder to a GitHub repository
2. Go to netlify.com → New site from Git
3. Connect your GitHub repo
4. Set the same environment variables in Netlify:
   Site settings → Environment variables
5. Deploy

Your site will be live at https://something.netlify.app
You can then connect your own domain (transfermarmaris.com).

## Project structure

```
app/
  page.tsx          ← Homepage
  search/           ← Vehicle results
  booking/          ← Checkout
  confirmation/     ← Post-booking
  auth/             ← Sign in / Sign up
  provider/         ← Provider dashboard
  admin/            ← Admin panel
  review/           ← Review page
components/
  ui/               ← Shared components (Nav etc)
lib/
  supabase.ts       ← Database client
types/
  database.ts       ← TypeScript types
```
