# Cloud Sync setup — Supabase

The planner uses **Supabase Auth + Postgres** for account-based cloud sync. Vercel hosts the Vite/React frontend.

## First-time setup
1. In Supabase, open **SQL Editor → New query**.
2. Paste the contents of `supabase-schema.sql` and click **Run**.
3. In Supabase, open **Authentication → Providers → Email** and keep Email enabled.
4. The frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Account flow
- Sign up with email and password.
- Log in with the same account on any device.
- RLS isolates each user’s planner data.
- Planner changes auto-sync after a short delay.
- Existing local data remains on the device until the user chooses to upload it.

## Security
Only the Supabase **publishable** key belongs in the frontend. Never put a `sb_secret_...` or service-role key in frontend code or environment variables exposed to the browser.
