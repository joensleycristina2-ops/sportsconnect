# SportsConnect

Open `index.html` in a browser to run it with no server (data stays in the browser).

```
index.html
css/                 base, components, landing, app
js/config.js         switch between "local", "supabase" and "remote" (Azure)
js/data.js, store.js, router.js    demo data, cache and helpers, view switching
js/api/              local.js (browser), supabase.js, remote.js (Azure), index.js (picks one)
js/views/            one file per screen; they only talk to SC.api
supabase/schema.sql  Supabase tables and the database functions the site calls
api/                 Azure Functions (Node) behind /api
database/            Azure SQL tables
```

## Run it on Supabase (free)

Supabase handles the accounts (email and password) and the database. The website itself is static, so GitHub Pages can host it.

1. Create a free project at [supabase.com](https://supabase.com). Pick a region near your users, for example West EU.
2. In the project, open **SQL Editor -> New query**, paste all of `supabase/schema.sql` and click **Run**.
3. Open **Project Settings -> API**. Copy the **Project URL** and the **anon public** key into `js/config.js`, and set `mode: "supabase"`:
   ```js
   mode: "supabase",
   supabaseUrl: "https://abcd1234.supabase.co",
   supabaseAnonKey: "eyJ...",
   ```
   The anon key is meant to be public. The tables cannot be read or changed directly; the browser can only call the functions in `schema.sql`, and those check who is signed in. Never put the **service_role** key in the website.
4. Put the site online with GitHub Pages: in the GitHub repository, **Settings -> Pages**, source **Deploy from a branch**, branch `main`, folder `/ (root)`. The site appears at `https://<your-username>.github.io/sportsconnect/`.
5. In Supabase, open **Authentication -> URL Configuration** and set **Site URL** to that GitHub Pages address, so the links in confirmation emails open your site.
6. Email confirmation: by default Supabase sends a confirmation email when someone registers, and its built-in mail service only sends a few emails per hour. For testing, turn off **Authentication -> Providers -> Email -> Confirm email**. For real users, keep it on and add your own SMTP server under **Authentication -> Emails**.

Reports go to the `reports` table. Review them in **Table Editor -> reports** and set `status` when handled.

## Run it on Azure

1. Create an **Azure SQL Database** (West Europe) and run `database/schema.sql`. A database made from an older schema also needs `database/migrate-001-users-email.sql`.
2. Create an **Azure Static Web App**. App location `/`, API location `api`. Deploy with the GitHub Action or the SWA CLI. Keep the API as the Static Web App's managed functions: it trusts the `x-ms-client-principal` header, which only Static Web Apps sets safely. A separately reachable Function App would let anyone forge it.
3. In the Static Web App, add the application setting `SQL_CONNECTION_STRING`. Prefer a managed identity over a password in the string.
4. Set up sign-in in the Static Web App (for example Microsoft Entra External ID) and adjust `loginUrl` in `js/config.js` to your provider.
5. Set `mode: "remote"` in `js/config.js`.

If Azure refuses the region ("RequestDisallowedByAzure"), your subscription only allows certain regions: see **Policy -> Assignments -> Allowed resource deployment regions** in the portal.

## Notes

- In Supabase and Azure mode the database enforces the participant limit, the waiting list and the "exact place only for confirmed participants" rule. The browser only displays what it gets back.
- In Supabase mode the Register and Sign in forms use Supabase Auth; passwords never reach this code's database. In Azure mode the buttons go to the identity provider.
- Invitations are matched by email: an invited person sees the invitation on their Dashboard after signing in with that address. No invitation email is sent.
- Partner connections and partner sessions (the original Partners tab) still use browser storage. They are not part of the database yet.
- Times are stored in UTC and shown in the viewer's time zone.
- Blocking works both ways: neither person sees or can join the other's activities. Unblock from the Profile page.
- Features not built yet: chat (F6), recurring groups (F7), feedback (F9), calendar integration (F10).
