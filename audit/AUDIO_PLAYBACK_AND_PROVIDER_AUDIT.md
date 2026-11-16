# AI DJ Studio — Audio Playback & Provider Audit Report

**Auditor:** Audio Systems Engineer & Full-Stack QA Auditor  
**Audit Scope:** Media Playback, Provider APIs, Stream Latency, Audio Formats, Web Audio DSP, and Dual-Deck Mixing  
**Date:** 2026-11-16  

---

## 1. Playback Architecture & Dual-Engine Overview

AI DJ Studio currently maintains two separate audio playback implementations:

1. **Standard Player Engine (`src/services/audioEngine.ts`):**
   - Single HTML5 `<audio>` element (`this.audioElem = new Audio()`).
   - Web Audio API `AnalyserNode` connected to a synthetic gain node for spectrum visualizer rendering.
   - Sequential crossfade implemented by stepping down volume, reassigning `this.audioElem.src`, and stepping volume back up.
2. **DJ Mixing Studio Engine (`src/services/dualDeckMixingEngine.ts`):**
   - Dual-deck Web Audio API architecture featuring two independent HTML5 audio elements (`deckNodes['A'].audioElem` and `deckNodes['B'].audioElem`).
   - Media routed through `createMediaElementSource` into independent 3-band EQ filter chains (`BiquadFilterNode` for Low 100Hz, Mid 1000Hz, High 2500Hz), gain trims, and channel faders.
   - Master crossfader applying equal-power trigonometric curves:
     $$\text{Gain}_A = \cos\left(\frac{\pi}{4}(1 + x)\right), \quad \text{Gain}_B = \sin\left(\frac{\pi}{4}(1 + x)\right), \quad x \in [-1, 1]$$

---

## 2. Investigation of Root Playback Deficiencies

### A. Problem: Songs Stopping After Approximately 30 Seconds
- **Root Cause Confirmed (`AUD-02`):**  
  In `src/fixtures/globalMusicDatabase.ts`, tracks in `TRENDING_INDIA_TRACKS` (such as Karan Aujla's *Tauba Tauba*, Hanumankind's *Big Dawgs*, and Sushin Shyam's *Illuminati*) are mislabeled:
  - Configured `provider: 'spotify'`.
  - Configured `duration: 208` or `234` seconds.
  - Actual stream URL: `https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview...plus.aac.p.m4a`.
- **Finding:**  
  The browser player attempts to stream an official Apple Music **30-second promotional excerpt** (`AudioPreview`). Because the track metadata advertises a 3.5-minute duration, the user expects full-length playback. When the 30-second stream naturally terminates, playback unexpectedly stops, triggering `audioElem.onended` or an error state.
- **Remediation:**  
  1. Clearly flag all iTunes `AudioPreview` streams with `isPreview: true` and set `duration: 30`.
  2. For full-length listening, route playback through verified Jamendo, Audius, or Internet Archive stream providers.

---

### B. Problem: Songs Starting in the Middle Instead of 0:00
- **Root Cause:**  
  Certain external preview files served by commercial aggregators are edited preview snippets cut from the chorus or hook of the song (e.g. beginning at second 45 of the original recording). When the audio element starts playing at position `0:00` of the preview file, the music audibly begins mid-song.
- **Verification:**  
  Full-length recordings from Jamendo, Audius, and Internet Archive consistently begin at the actual acoustic beginning (`0:00.000`) of the recording.

---

### C. Problem: Provider Reliability & Failover Strategy

| Provider | Stream Type | Format | Playable Length | Reliability | Fallback Behavior |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Apple Music / iTunes** | Direct CDN | AAC / M4A | 30-second preview | **High** (Fast CDN) | If stream fails, switches to Jamendo fallback stream |
| **Jamendo** | Royalty-Free CDN | MP3 128kbps | Complete (3–6 mins) | **Very High** | High-availability fallback array in `audioEngine.ts` |
| **Audius** | Decentralized API | MP3 320kbps | Complete (3–8 mins) | **Medium** | Dependent on discovery node uptime; falls back to Jamendo |
| **Internet Archive** | Public Domain REST | MP3 VBR | Complete (2–10 mins) | **High** | Direct MP3 streams from archive.org collections |
| **Local Stems** | Bundled fixtures | WebM / MP3 | Complete | **100% (Offline)** | Immediate local playback without network dependencies |

---

## 3. Web Audio DSP & Dual-Deck Mixing Verification

| Capability | Standard Player (`audioEngine.ts`) | DJ Studio Decks (`dualDeckMixingEngine.ts`) | Verification Status |
| :--- | :---: | :---: | :---: |
| **Simultaneous 2-Track Playback** | No (Single stream) | Yes (Deck A + Deck B) | **VERIFIED in DJ Studio View** |
| **True Equal-Power Crossfade** | No (Sequential volume step) | Yes (Trigonometric curve) | **VERIFIED in DJ Studio View** |
| **3-Band Isolator EQ (Low/Mid/High)** | No | Yes (Biquad filter nodes) | **VERIFIED in DJ Studio View** |
| **EQ Frequency Kill Switches** | No | Yes (-60dB notch) | **VERIFIED in DJ Studio View** |
| **Pitch-Preserved Tempo Adjustment** | Yes (`preservesPitch = true`) | Yes (`preservesPitch = true`) | **VERIFIED** |
| **Real-Time Spectrum Analyser** | Yes (64-bin FFT) | Yes (256-bin FFT per deck) | **VERIFIED** |
