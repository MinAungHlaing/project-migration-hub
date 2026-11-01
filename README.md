# Project Migration Hub

/skill:migrate-external-project Source: code archive. Migrate the attached project into Lovable.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cc53801a-989d-4d76-a186-1f5af3a21da9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

### Local development preview

No Supabase, Docker, SQL, database setup, or `.env` file is needed. Install dependencies and start the app:

```sh
npm install
npm run dev
```

Open the URL Vite prints. The storefront loads a sample product catalog without a backend, so you can explore search, categories, product details, the cart, and the English/Burmese interface. The cart is saved in this browser; storefront checkout is still disabled. Open `/auth` and click **Open local admin preview**—there is no password, `.env`, or database setup. The local admin can create test orders and change demo workflow statuses; those changes persist in this browser's storage and appear in the orders list. This is a local simulation, not a central database.

The local preview is enabled automatically in development. Do not create or edit `.env` for local preview. If you already created `.env` and set `VITE_LOCAL_DEMO=false`, change it to `VITE_LOCAL_DEMO=true` (or remove that line) and restart the dev server.

### Optional: connect a live Supabase development project

Only follow these steps if you specifically want to test database-backed behavior. They are not needed to explore the local admin screens.

1. Use a **development or staging Supabase project**, not production. Copy [.env.example](./.env.example) to `.env` and set `VITE_LOCAL_DEMO=false`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` for that same project. Keep `.env` private; do not put a service-role key in any `VITE_` variable or commit it.
2. Ensure the project's database migrations are applied. Restart `npm run dev`, open `/auth`, choose **Create account**, and register your real email and password. Confirm the email if the project requires it.
3. Explicitly grant that account admin access using the service-role key from a trusted local terminal. Set `SUPABASE_SERVICE_ROLE_KEY` in the private `.env` file, then run:

   ```sh
   npm run provision:admin -- your-email@example.com
   ```

   The command looks up the existing confirmed account and inserts the protected `admin` role. Public signup does not grant privileges. The app also needs this key for trusted server-side admin database operations, so keep it only in the ignored `.env` file; it must never be exposed through a `VITE_` variable or committed. Then sign in at `/auth`.
4. Restart the dev server after changing environment variables. `VITE_LOCAL_DEMO=false` disables sample data; any screens whose real database workflow is not implemented will not become functional just by switching accounts.

Never use a production service-role key for local testing. The service-role key bypasses database row-level security and must remain server-side.

### Catalog browsing

The public catalog, category gallery, product details, and order sheet adapt to phone and desktop screens. Use the language selector in the top navigation to switch between English and Burmese; the selection is saved in this browser. Search matches product names, IDs, categories, and barcodes, with availability filters, sorting, and a clear-filters action.

### Sales rep PWA

The field-sales app is available at `/rep`. In local development, sign in with **`aung` / `password`** or **`thiri` / `password`**. The app loads a local sample catalog, saves orders offline, and locally syncs them into the admin Orders screen; no server or database is contacted. In live mode, it instead requires the live API and an individually provisioned rep account. Install the PWA from the browser while served over HTTPS (or localhost). This first slice displays retail prices; role-based price tiers and discount approvals remain planned work.
