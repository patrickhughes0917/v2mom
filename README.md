# Engineering V2MOM Dashboard

A centralized dashboard for measuring engineering progress across Vision, Values, Methods, Obstacles, and Measures. Connects to different data sources via API. Built with Next.js, Supabase, and designed to deploy on Vercel.

## What You Get

- **V2MOM structure** – Five pillar sections (Vision, Values, Methods, Obstacles, Measures)
- **Dashboard** with metrics, charts, and activity feed
- **Data Sources settings** – Add and manage integrations (Jira, GitHub, Incident.io, Slack, Vercel, Custom API)
- **Sign in / Sign up** with Supabase (email & password)
- **API proxy** to safely connect to external APIs without exposing your keys
- **Dark theme** that's easy on the eyes

---

## Setup (Step by Step)

### 1. Install Node.js (if you don't have it)

1. Go to [nodejs.org](https://nodejs.org)
2. Download the "LTS" version
3. Run the installer and follow the prompts

### 2. Install Dependencies

Open Terminal (Mac) or Command Prompt (Windows) and run:

```bash
cd V2MOM
npm install
```

### 3. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**
3. Name it (e.g. "v2mom-dashboard"), set a database password, choose a region
4. Wait for the project to be created
5. Go to **Settings** → **API** in the left sidebar
6. Copy the **Project URL** and **anon public** key

### 4. Add Your Supabase Keys

1. Copy the file `.env.local.example` and rename it to `.env.local`
2. Open `.env.local` and paste your Supabase URL and key:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run the Dashboard Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Hosting on Vercel

### What You Need

- **Vercel account** – Free at [vercel.com](https://vercel.com) (sign in with GitHub)
- **GitHub repo** – Your code pushed to [github.com/patrickhughes0917/v2mom](https://github.com/patrickhughes0917/v2mom)
- **Supabase project** – For auth (see Setup above)

Vercel automatically detects Next.js and configures the build. No extra config needed.

### Deploy Steps

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **Add New** → **Project**
4. Import your `v2mom` repository
5. Before deploying, add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon/public key
   - (Optional) Add API keys for data sources: `JIRA_API_TOKEN`, `GITHUB_TOKEN`, etc.
6. Click **Deploy**

Your dashboard will be live at a URL like `v2mom.vercel.app` (or a custom domain if you add one).

### After Deployment

- Every push to `main` triggers a new deployment
- Environment variables are set in Vercel Dashboard → Project → Settings → Environment Variables
- View logs in Vercel Dashboard → Project → Deployments → [click a deployment]

---

## Connecting Real Data Sources

Right now the dashboard shows **demo data**. To connect real APIs (Jira, Slack, etc.):

1. Add your API keys to `.env.local` (and Vercel Environment Variables when deploying)
2. Create new API routes in `src/app/api/` that fetch from those services
3. Update the dashboard to call your new routes instead of `/api/demo`

The `/api/proxy` route is a generic proxy—you can POST to it with a URL and headers to fetch from any HTTPS API. Use it from your own API routes to keep keys server-side.

---

## Project Structure

```
V2MOM/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main dashboard
│   │   ├── login/page.tsx    # Sign in / Sign up
│   │   └── api/
│   │       ├── demo/         # Demo data (replace with real APIs)
│   │       └── proxy/        # Generic API proxy
│   ├── components/           # Reusable UI pieces
│   └── lib/
│       └── supabase/        # Supabase client setup
├── .env.local.example       # Template for your secrets
└── README.md               # This file
```

---

## Need Help?

- [Next.js docs](https://nextjs.org/docs)
- [Supabase docs](https://supabase.com/docs)
- [Vercel docs](https://vercel.com/docs)
