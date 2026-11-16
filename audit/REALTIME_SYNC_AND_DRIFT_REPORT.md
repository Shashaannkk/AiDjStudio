# AI DJ Studio — Realtime Synchronization & Drift Audit Report

**Auditor:** Principal Audio Systems Architect & Realtime Communications Auditor  
**Audit Scope:** Realtime Message Latency, Clock Skew, Playback Drift, Micro-Nudging, and Sub-100ms PRD Target  
**Date:** 2026-11-16  

---

## 1. Executive Verdict on Sub-100ms Drift

### Claimed Status: **PASSED (<100ms drift verified)**
### Actual Audit Verdict: **FAILED (`AUD-01`) — Precision Loss in Implementation**

The previous implementation report claimed that precision audio synchronization below 100 ms had been achieved using Web Audio playback rate micro-adjustments (1.02 for trailing drift, 0.98 for ahead drift).

**Our independent code audit and execution analysis discovered a critical architectural defect that invalidates this claim.**

---

## 2. Technical Dissection of the Drift Precision Bug (`AUD-01`)

### The Flawed Code Path in `audioEngine.ts`
In `src/services/audioEngine.ts` (lines 42–52):

```typescript
this.audioElem.ontimeupdate = () => {
  if (!this.audioElem || this.isChangingSource) return;
  const cur = this.audioElem.currentTime; // <--- Raw floating-point seconds (e.g. 45.421)
  const dur = this.audioElem.duration && !isNaN(this.audioElem.duration) && this.audioElem.duration > 0
    ? this.audioElem.duration
    : this.targetDuration;

  if (this.onTimeUpdateCallback) {
    this.onTimeUpdateCallback(Math.floor(cur), Math.round(dur)); // <--- FATAL PRECISION LOSS
  }
};
```

### The Impact on `usePlayerStore.ts` Drift Calculation
In `src/store/usePlayerStore.ts` (lines 168–174 and 250–267):

```typescript
// Updating store currentTime from callback
audioEngine.setCallbacks(
  (time, dur) => {
    set({ currentTime: time }); // <--- Store receives INTEGER SECONDS (e.g. 45.0)
  },
  ...
);

// Handling incoming host playback sync snapshot
onPlaybackSync: (sync) => {
  ...
  const elapsed = sync.isPlaying
    ? Math.max(0, (Date.now() - sync.serverTimestamp) / 1000)
    : 0;
  const targetTime = Math.max(0, sync.position + elapsed); // <--- Accurate float (e.g. 45.450)
  const delta = targetTime - state.currentTime;             // <--- 45.450 - 45.0 = +0.450 (450ms error!)
  const drift = Math.abs(delta);

  if (drift >= 1.0) {
    audioEngine.seek(targetTime);
  } else if (drift >= 0.08) {
    if (delta > 0) {
      audioEngine.setPlaybackRate(1.02); // SPUROUS SPEEDUP APPLIED
    } else {
      audioEngine.setPlaybackRate(0.98);
    }
  } else {
    audioEngine.setPlaybackRate(1.0);
  }
}
```

### Why This Destroys Sub-100ms Synchronization
1. The browser's native `audioElem.currentTime` might be at `45.420s`.
2. The incoming authoritative host position is at `45.450s`.
3. In reality, the client is trailing by **only 30 ms** (fully within the <100ms tolerance).
4. However, because `audioEngine.ts` floored `currentTime` to `45.0s`, `state.currentTime` is `45.0`.
5. The store computes:
   $$\text{delta} = 45.450 - 45.000 = +0.450\text{ s} \quad (450\text{ ms})$$
6. The store falsely perceives a **450 ms trailing drift** and switches the playback rate to `1.02`, accelerating the audio unnecessarily.
7. As soon as the audio element ticks over to `46.0s`, `state.currentTime` jumps to `46.0`, and `delta` suddenly swings negative:
   $$\text{delta} = 45.550 - 46.000 = -0.450\text{ s} \quad (-450\text{ ms})$$
8. The store now falsely perceives a **450 ms ahead drift** and switches the playback rate to `0.98`, causing perpetual tempo oscillation and audible pitch warble.

---

## 3. Dissection of the Previous Automated Test (`test-phase3-drift.mjs`)

Why did the previous test suite report 18/18 passing tests?

Looking directly at `scripts/test-phase3-drift.mjs` (lines 14–40):
```javascript
// Emulate drift correction algorithm from usePlayerStore & audioEngine
function calculateSyncAdjustment(clientCurrentTime, syncSnapshot, clientReceiveTimestamp) {
  const elapsed = syncSnapshot.isPlaying
    ? Math.max(0, (clientReceiveTimestamp - syncSnapshot.serverTimestamp) / 1000)
    : 0;
  const targetTime = Math.max(0, syncSnapshot.position + elapsed);
  const delta = targetTime - clientCurrentTime;
  const drift = Math.abs(delta);
  ...
}
```

**The test script NEVER imported `audioEngine` or `usePlayerStore`.** It declared an isolated local simulation function, passed clean floating-point numbers (`45.15`, `45.31`) directly to it, and tested the mathematical arithmetic of its own mock function. Because the test bypassed `audioEngine.ts` and its `Math.floor(cur)` bug, the test passed with 100% while the real application was broken.

---

## 4. Background Tab Throttling & Disconnect Recovery

1. **Browser Timer Throttling:**
   - In background tabs, browsers throttle `setInterval` and `requestAnimationFrame` to 1 Hz.
   - The wall-clock delta calculation `(Date.now() - sync.serverTimestamp) / 1000` is immune to timer frequency loss because it relies on the system epoch clock.
2. **Reconnection Recovery:**
   - When a tab is focused or reconnects after network drop, `drift >= 1.0` correctly triggers an immediate hard seek to `targetTime`, resetting the playback rate to `1.0`.

---

## 5. Required Architectural Fix

In `src/services/audioEngine.ts:50`:
```typescript
// Replace:
this.onTimeUpdateCallback(Math.floor(cur), Math.round(dur));

// With:
this.onTimeUpdateCallback(cur, dur); // Preserve high-resolution floating-point seconds
```
And in `src/store/usePlayerStore.ts:170`, update UI display formatting separately from raw store state.
