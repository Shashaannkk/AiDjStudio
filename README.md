# AI DJ Studio 🎧

A desktop-first, high-fidelity music streaming and AI DJ application inspired by modern desktop streaming interfaces.

## 🌟 Key Highlights

### 1. Multi-Provider Music Engine
- **Apple Music / iTunes Global Catalog API**: Real official songs covering top mainstream Billboard hits and underrated indie discoveries, with 1000x1000 ultra HD album artwork and 50+ official tracks per artist.
- **Deezer Music API (JSONP)**: Real-time official artist portraits (`picture_xl` 1000x1000) and global fan listener counts fetched cleanly without CORS restrictions.
- **Audius Decentralized Audio Network**: Electronic and underground trending catalogs with direct audio streaming.

### 2. Full-Length First-to-Last Audio Playback
- Master continuous playback engine driving songs from `0:00` all the way to `3:30+` (no 30-second cutoffs).
- Dynamic seamless seek bar with modulo audio loop synchronization, live Web Audio API spectrum analysis, and synced lyrics.

### 3. Real-Time Verified Artist Hubs
- Dynamic artist landing pages for any searched artist (e.g. *Doja Cat*, *The Weeknd*, *Drake*, *BoyWithUke*, etc.).
- Includes official high-resolution hero banners, verified badges, monthly listener counts, top songs table, and expandable discography.

### 4. Real Google Authentication
- Official Google Identity Services (`accounts.google.com/gsi/client`) integration.
- Automatic JWT credential decoding with full user profile support.
- Configurable via `.env`:
  ```env
  VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
  ```
- Graceful instant developer fallback mode when running without production keys.

### 5. Desktop-Grade Polish
- Dual-sided authentication modal with zero scrollbars on both Log In and Create Account screens.
- Rotating vinyl animation with dynamic equalizer glow.
- Spotify-inspired dark aesthetic (`#121212`, `#1DB954` green accents, glassmorphic panels).

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run production build
npm run build
```
