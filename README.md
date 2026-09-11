# Malina 2026 Master Planner

Mobile-first React + Vite + Tailwind PWA.

## Run
```bash
npm install
npm run dev
```

Production:
```bash
npm run build
npm run preview
```

Planner data is stored locally and can sync across devices through Netlify Identity + Netlify Functions. Use Settings → Cloud Sync to choose “This device → Cloud” or “Cloud → this device”. Keep the JSON Backup as an extra safety copy.

## Included
- Dashboard / Today
- Tasks CRUD
- Habits with monthly completion %
- Finance tracker with income, expenses, savings, balance and pie chart
- Water: 8 cups / 2L daily
- Meals: breakfast / lunch / dinner + grocery add
- Grocery list CRUD
- Calendar with important dates CRUD
- Goals CRUD + completed state
- Weekly/monthly views
- Export / Import / Reset
- Offline PWA service worker
