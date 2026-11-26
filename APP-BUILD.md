# Kro: app build notes (v7p)

Kro is an installable, offline Progressive Web App. It can also be wrapped into native iOS and Android apps with Capacitor, without changing any game code.

## What ships (all files are relative; no CDN at runtime)
| File | Purpose |
|---|---|
| `index.html` | The whole game: HTML, CSS and JS, with art and audio embedded or synthesized. |
| `vendor/three/…` | three.js r160 (MIT, `vendor/three/LICENSE`): `build/three.module.min.js` plus the 11 example add-ons the game imports (BufferGeometryUtils, postprocessing, shaders). |
| `manifest.webmanifest` | Name, icons, fullscreen display, landscape orientation, Kro purple theme. |
| `sw.js` | Service worker: precaches everything above and serves cache-first, updating in the background. **Bump `VERSION` on every release.** |
| `icons/` | 192/512 icons, a 512 maskable icon and the 180 Apple touch icon (made from the Kro logo). |

## 1. Web / PWA (GitHub Pages or any static host)
1. Copy `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` and `vendor/` to the site root (for example the `totally-a-crow` repo).
2. Serve over HTTPS. GitHub Pages does this already. Service workers only run on https or localhost.
3. Players install it:
   - Android Chrome: menu → Install app.
   - iPhone Safari: Share → Add to Home Screen.
4. After the first visit it plays fully offline.

## 2. Native wrap with Capacitor (when ready for the stores)
Needs Node 18+, plus Android Studio for Android, or Xcode on a Mac for iOS. None of this is installed on the build box.
```bash
mkdir kro-app && cd kro-app
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/haptics
npx cap init Kro com.example.kro --web-dir www
mkdir www && cp -r ../index.html ../manifest.webmanifest ../sw.js ../icons ../vendor www/
npx cap add android && npx cap add ios
npx cap sync
npx cap open android   # or: npx cap open ios
```
- **Bundle ID:** replace `com.example.kro` with your own reverse-domain ID before publishing.
- **Orientation:**
  - Android: set `android:screenOrientation="sensorLandscape"` on the main activity.
  - iOS: in Xcode, under Deployment Info, tick only Landscape Left and Landscape Right.
- **Haptics:** the game already calls `Capacitor.Plugins.Haptics` when it exists (level-up, chapter complete, banking). Otherwise it falls back to the web Vibration API.
- **Saves:** everything lives in one `localStorage` key, `kro.save` (versioned JSON). The in-app WebView keeps it.
  - Players can back up and move a save with Settings → Display & Extras → 💾 Export save / 📂 Import save.
  - On phones, export uses the share sheet.
- **Service worker:** it is harmless inside Capacitor; the app files are local anyway.
- **Icons and splash:** generate them from `icons/icon-512.png`, e.g. with `npx @capacitor/assets generate`.
- **Store checklist:**
  - privacy policy (no data collected; saves stay on the device);
  - age rating questionnaire (cartoon mischief, cartoon police, no blood);
  - AI-art disclosure where the store asks (intro and logo art);
  - three.js MIT notice included in `vendor/three/LICENSE`.

## Releasing an update
1. Edit `index.html`.
2. Bump `VERSION` in `sw.js`.
3. Deploy. Players get the new build on their next launch; the old cache is deleted on activate.
4. When the save format changes, raise `V` in the `KroSave` block and add a `MIGRATIONS[n]` function there.
