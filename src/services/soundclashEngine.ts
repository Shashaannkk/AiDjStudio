import type { Track } from '../types/music';
import type { SoundclashCandidate, SoundclashSession, RoomMood } from '../types/roomIntelligence';
import { recommendationEngine } from './recommendationEngine';
import { moodDetectionEngine } from './moodDetectionEngine';

export class SoundclashEngine {
  /**
   * Create a new Soundclash Session with 2 to 4 real playable catalogue candidate tracks
   */
  public createSoundclash(
    roomId: string,
    currentTrack: Track | null,
    activeQueue: Track[] = [],
    roomMood: RoomMood = 'party',
    durationSec = 30,
    candidateCount = 3
  ): SoundclashSession {
    const recMood = moodDetectionEngine.mapRoomMoodToRecommendationMood(roomMood);
    const count = Math.max(2, Math.min(4, candidateCount));

    // Ask recommendation engine for the top candidates matching room context
    const recommended = recommendationEngine.recommend({
      currentTrack,
      queue: activeQueue,
      mood: recMood,
      limit: count + 2, // Ask for slightly more to ensure diverse artists
    });

    const candidates: SoundclashCandidate[] = [];
    const seenArtists = new Set<string>();

    for (const rec of recommended) {
      if (!seenArtists.has(rec.track.artist_name) || candidates.length < count) {
        seenArtists.add(rec.track.artist_name);
        candidates.push({
          track: rec.track,
          compatibilityScore: rec.score.overall,
          votes: 0,
        });
      }
      if (candidates.length >= count) break;
    }

    const now = Date.now();
    const sessionId = `clash_${roomId}_${now}_${Math.random().toString(36).substring(2, 6)}`;

    const titles = [
      'Soundclash: Drop The Next Anthem! 🔥',
      'Track Battle: Which Vibe Hits Harder? 🎛️',
      'Crowd Choice: Next Floor-Filler 💃',
      'AI Soundclash: Community Vote ⚡',
    ];
    const pickedTitle = titles[Math.floor(Math.random() * titles.length)];

    return {
      id: sessionId,
      roomId,
      title: pickedTitle,
      candidates,
      votes: {},
      durationSec,
      startedAt: now,
      endsAt: now + durationSec * 1000,
      status: 'active',
      totalVotes: 0,
    };
  }

  /**
   * Record a vote for a candidate track from a specific user.
   * Strictly prevents duplicate voting: each userId has exactly 1 active vote entry.
   */
  public recordVote(
    session: SoundclashSession,
    userId: string,
    trackId: string
  ): SoundclashSession {
    if (session.status !== 'active') return session;

    // Check that trackId is a valid candidate
    const isValidCandidate = session.candidates.some((c) => c.track.id === trackId);
    if (!isValidCandidate) return session;

    const newVotes = { ...session.votes, [userId]: trackId };

    // Tally votes per candidate track
    const counts: Record<string, number> = {};
    Object.values(newVotes).forEach((tid) => {
      counts[tid] = (counts[tid] || 0) + 1;
    });

    const updatedCandidates = session.candidates.map((cand) => ({
      ...cand,
      votes: counts[cand.track.id] || 0,
    }));

    return {
      ...session,
      votes: newVotes,
      candidates: updatedCandidates,
      totalVotes: Object.keys(newVotes).length,
    };
  }

  /**
   * Determine the winning track when the timer expires or voting is concluded
   */
  public evaluateWinner(session: SoundclashSession): {
    updatedSession: SoundclashSession;
    winnerTrack: Track;
  } {
    if (session.candidates.length === 0) {
      throw new Error('Soundclash session has no candidates');
    }

    // Sort by votes descending, break ties with compatibilityScore
    const sorted = [...session.candidates].sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      return b.compatibilityScore - a.compatibilityScore;
    });

    const winner = sorted[0];

    const updatedSession: SoundclashSession = {
      ...session,
      status: 'ended',
      winnerTrackId: winner.track.id,
      winnerTrack: winner.track,
    };

    return {
      updatedSession,
      winnerTrack: winner.track,
    };
  }
}

export const soundclashEngine = new SoundclashEngine();

