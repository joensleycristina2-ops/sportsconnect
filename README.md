# SportsConnect

Open `index.html` in a browser to run it with no server (data stays in the browser).

```
index.html
css/                 base, components, landing, app
js/config.js         switch between "local" and "remote"
js/data.js, store.js, router.js    demo data, cache and helpers, view switching
js/api/              local.js (browser), remote.js (Azure), index.js (picks one)
js/views/            one file per screen; they only talk to SC.api
api/                 Azure Functions (Node) behind /api
database/schema.sql  Azure SQL tables
```

## Run it on Azure

1. Create an **Azure SQL Database** (West Europe) and run `database/schema.sql`. A database made from an older schema also needs `database/migrate-001-users-email.sql`.
2. Create an **Azure Static Web App**. App location `/`, API location `api`. Deploy with the GitHub Action or the SWA CLI. Keep the API as the Static Web App's managed functions: it trusts the `x-ms-client-principal` header, which only Static Web Apps sets safely. A separately reachable Function App would let anyone forge it.
3. In the Static Web App, add the application setting `SQL_CONNECTION_STRING`. Prefer a managed identity over a password in the string.
4. Set up sign-in in the Static Web App (for example Microsoft Entra External ID) and adjust `loginUrl` in `js/config.js` to your provider.
5. Set `mode: "remote"` in `js/config.js`.

## Notes

- In remote mode the Sign in and Register buttons go to the identity provider. Passwords are never handled by this code.
- The server enforces the participant limit and the "exact place only for confirmed participants" rule. The browser only displays what the API returns.
- Partner connections and partner sessions (the original Partners tab) still use browser storage. They are not part of the database yet.
- Times are stored in UTC and shown in the viewer's time zone (remote mode).
- Blocking works both ways: neither person sees or can join the other's activities. Unblock from the Profile page.
- Features not built yet: chat (F6), recurring groups (F7), feedback (F9), calendar integration (F10).
