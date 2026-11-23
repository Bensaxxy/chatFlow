# ChatFlow Mobile

The ChatFlow mobile app is built with Expo and connects to the existing
ChatFlow API.

## Environment setup

Copy `.env.example` to `.env`, then set the deployed API URL:

```env
EXPO_PUBLIC_API_URL=https://your-chatflow-api.example.com/api
```

Only variables beginning with `EXPO_PUBLIC_` are available in the mobile app.
Restart Expo after changing `.env`; a production app build must be rebuilt for
the changed URL to be included.

Native Android and iOS requests are not restricted by browser CORS. If you run
the app in Expo web, add the preview origin (for example
`http://localhost:8081`) to `MOBILE_WEB_ORIGINS` in the API deployment as a
comma-separated list, then redeploy the API.

## Run locally

```bash
npm install
npm start
```

Use `npm run lint` and `npx tsc --noEmit` to validate the app before building.
