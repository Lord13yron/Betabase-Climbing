# Betabase Mobile

React Native + Expo app for Betabase: find a gym, watch beta videos, log sends, upload your own beta. Built section by section per [`../docs/MOBILE_BUILD_PLAN.md`](../docs/MOBILE_BUILD_PLAN.md).

## Run it

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the env file:

   ```bash
   cp .env.example .env
   ```

   Fill in the Supabase values (same project as the website; copy from the repo root `.env.local`, renaming `NEXT_PUBLIC_*` to `EXPO_PUBLIC_*`). Leave `EXPO_PUBLIC_API_BASE_URL` as the placeholder until the website is deployed (needed from S8 on).

3. Start the dev server:

   ```bash
   npx expo start
   ```

   Scan the QR code with the [Expo Go](https://expo.dev/go) app on your phone (iPhone: use the Camera app). Phone and computer must be on the same Wi-Fi network.

## Layout

- `src/app/` - Expo Router screens. `(tabs)/` holds the four tabs: Gyms, Community, Upload, Profile.
- `src/lib/theme.ts` - design tokens translated from the web app's `app/globals.css`.
- `src/lib/grades.ts`, `height.ts`, `holds.ts` - pure libs copied from the web app's `lib/`.
- `src/components/` - shared UI components.

## Checks

```bash
npx tsc --noEmit
```
