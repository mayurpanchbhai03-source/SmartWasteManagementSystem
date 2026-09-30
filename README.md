# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Clearway India

  Clearway is a city cleanup reporting dashboard for New Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, and Kolkata. It supports report photos, map locations, municipal-team assignment, and Supabase Realtime updates.

  ## Run locally

  ```powershell
  npm install
  npm run dev
  ```

  Without Supabase credentials, the app runs in demo mode with sample reports. New demo reports exist only in browser memory and disappear on refresh.

  ## Connect Supabase

  1. Create a Supabase project.
  2. Open the project's SQL Editor and run the files in `supabase/migrations/` in filename order. Run any newly added migration there too.
  3. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key from Supabase API settings.
  4. Restart Vite. The app will load stored reports and subscribe to city-filtered changes.

  The migration `202609300002_report_resolution_times.sql` records when a report changes to `Resolved`. The average response-time card only shows a value after a completed report has a recorded resolution time; older reports are not assigned invented durations.

  Only the Supabase publishable key belongs in `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put a Supabase secret or service-role key in a `VITE_` variable or browser code.

  ### Data access and privacy

  The migration enables RLS. Visitors can read and submit reports, but cannot update or delete them through the public API. Reports and uploaded photos are public to support the shared operations map. Do not include names, phone numbers, faces, or other personal information in report descriptions or photos. Review these access rules before using the app with sensitive or operational data.

  The configured teams are demo destinations. A database insert does not contact a municipal authority. Connect an approved municipal, email, or SMS service through a server-side function before describing reports as dispatched.

  ## Deploy to Vercel

  1. Push this project to a Git provider and import the repository in Vercel.
  2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to Vercel's Production environment (and Preview if needed).
  3. Deploy with the Vite defaults: build command `npm run build`, output directory `dist`.

  [`vercel.json`](vercel.json) includes the SPA rewrite. After changing environment variables, trigger a new deployment because Vite embeds them at build time.

  ## Checks

  ```powershell
  npm run build
  npm run lint
  ```
      // Enable lint rules for React DOM
