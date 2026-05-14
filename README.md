# Campaign Performance Dashboard

Upload a GYB `.xlsx` report to visualize campaign performance across locations — KPI cards, location funnels, campaign bars, and auto-generated insights.

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Deploy to Vercel

1. Push this repo to GitHub (already done)
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import the `campaign-analyzer` repo from GitHub
4. Framework preset: **Vite** (auto-detected)
5. Click **Deploy** — no environment variables needed

## Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**
2. Connect GitHub and select `campaign-analyzer`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click **Deploy site**

## File Structure

```
campaign-analyzer/
├── index.html          # Entry point
├── vite.config.js      # Vite config
├── package.json
├── .gitignore
└── src/
    ├── main.jsx        # React root mount
    └── App.jsx         # Dashboard component
```
