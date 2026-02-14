# Deploy Free on Netlify + Google Sheets

## 1) Push latest code

```powershell
git add .
git commit -m "Migrate backend to Netlify Functions + Google Sheets"
git push
```

## 2) Create Netlify site from GitHub repo

1. Go to Netlify Dashboard.
2. Add new site -> Import an existing project.
3. Pick GitHub -> select `aloktrip876/gift-app`.
4. Netlify reads `netlify.toml` automatically.
5. Deploy.

## 3) Add environment variables in Netlify

Site settings -> Environment variables:

- `ADMIN_KEY` = your secret admin key
- `GOOGLE_SHEET_ID` = your Google Sheet ID
- `GOOGLE_SHEET_TAB` = `States`
- `GOOGLE_STATE_TAB` = `StateStore`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = service-account email
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = private key with `\n` newlines

## 4) Share sheet with service account

In Google Sheets, share with your service account as **Editor**.

## 5) Verify live

- App URL: `https://<your-netlify-site>.netlify.app`
- Admin JSON:
  - `https://<your-netlify-site>.netlify.app/api/admin/states?key=<ADMIN_KEY>`
- Admin CSV:
  - `https://<your-netlify-site>.netlify.app/api/admin/states.csv?key=<ADMIN_KEY>`
- Manual sync:
  - `POST https://<your-netlify-site>.netlify.app/api/admin/sync-sheet?key=<ADMIN_KEY>`

## Notes

- `/api/state` and `/api/reset` are fully serverless and store user data in Google Sheets.
- This setup is free-tier friendly.
