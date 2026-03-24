# Engineering V2MOM Dashboard

**Repository:** [github.com/Iterable/InternalEngOpsTooling](https://github.com/Iterable/InternalEngOpsTooling)

A centralized dashboard for measuring engineering progress across Vision, Values, Methods, Obstacles, and Measures. Connects to different data sources via API. Built with Next.js, designed for internal hosting on your own infrastructure.

## What You Get

- **V2MOM structure** – Five pillar sections (Vision, Values, Methods, Obstacles, Measures)
- **Dashboard** with metrics, charts, and activity feed
- **Data Sources settings** – Add and manage integrations (Jira, Jellyfish, GitHub, Incident.io, Slack, Custom API)
- **API proxy** to safely connect to external APIs without exposing your keys
- **Dark theme** that's easy on the eyes

---

## Setup (Step by Step)

### 1. Install Node.js (if you don't have it)

1. Go to [nodejs.org](https://nodejs.org)
2. Download the "LTS" version
3. Run the installer and follow the prompts

### 2. Install Dependencies

```bash
cd V2MOM
npm install
```

### 3. Add Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Add your API keys (JIRA, Jellyfish, etc.) — see the file for required variables

### 4. Run the Dashboard Locally

```bash
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For development with hot reload:

```bash
npm run dev
```

---

## Deploying Internally

1. Build: `npm run build`
2. Run: `npm run start` (or use PM2 for process management)
3. Set environment variables on your server
4. Use nginx or a reverse proxy for HTTPS if needed

The app runs on port 3000 by default. Deploy to your internal infrastructure (e.g. VM, container, or internal PaaS).

---

## Connecting Real Data Sources

Right now the dashboard shows **demo data** for some sections. To connect real APIs (Jira, Jellyfish, etc.):

1. Add your API keys to `.env.local` (and your server's environment variables when deploying)
2. API routes in `src/app/api/` already fetch from JIRA (GSRR, agentic launches) and Jellyfish (KTLO)
3. Add new routes for additional integrations as needed

The `/api/proxy` route is a generic proxy—you can POST to it with a URL and headers to fetch from any HTTPS API. Use it from your own API routes to keep keys server-side.

---

## Project Structure

```
V2MOM/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main dashboard
│   │   ├── settings/         # Data sources config
│   │   └── api/              # API routes (JIRA, Jellyfish, etc.)
│   ├── components/           # Reusable UI pieces
│   └── lib/
│       └── v2mom-data.ts     # Dashboard content
├── .env.local.example       # Template for your secrets
└── README.md
```

---

## Need Help?

- [Next.js docs](https://nextjs.org/docs)
