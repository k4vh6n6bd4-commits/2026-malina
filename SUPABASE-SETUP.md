# Malina Planner — Supabase setup

## 1. Database
Open Supabase → SQL Editor → New query, paste `supabase-schema.sql`, then Run.

## 2. Authentication
Open Supabase → Authentication → Providers → Email.
Keep Email enabled. If email confirmation is enabled, users confirm their email before first login.

## 3. Frontend
This project is Vite + React and uses:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

A production env file is included for the current Supabase project. The publishable key is safe for browser use; never put a secret/service-role key in frontend code.

## 4. Account flow
- Sign up with email + password
- Log in
- Each authenticated user gets an isolated `planner_data` row through RLS
- Planner changes auto-sync to Supabase
- Existing local planner data stays in localStorage and can be uploaded from Settings
