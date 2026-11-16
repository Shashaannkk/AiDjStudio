/**
 * AI DJ Studio — Human DJ Soundclash Client Service
 * Communicates with backend endpoints (/api/soundclash/*)
 */

import type { Track } from '../types/music';

export interface SoundclashContender {
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  track: Track | null;
  votes: number;
}

export interface HumanSoundclashBattle {
  id: string;
  roomId: string;
  title: string;
  dj1: SoundclashContender;
  dj2: SoundclashContender | null;
  status: 'waiting_for_challenger' | 'pending_submission' | 'active' | 'ended';
  durationSec: number;
  startedAt: number | null;
  endsAt: number | null;
  votes: Record<string, 'dj1' | 'dj2'>;
  winner: {
    choice: 'dj1' | 'dj2';
    dj: { id: string; name: string; avatar: string };
    track: Track;
    votes: number;
  } | null;
  totalVotes: number;
}

export interface SoundclashHistoryEntry {
  id: string;
  battleId: string;
  roomId: string;
  title: string;
  dj1: { name: string; votes: number; trackTitle?: string };
  dj2: { name: string; votes: number; trackTitle?: string } | null;
  winner: any;
  totalVotes: number;
  completedAt: number;
}

class SoundclashService {
  private baseUrl = '';
  private customFetch?: typeof fetch;

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public setFetchHandler(fn: typeof fetch) {
    this.customFetch = fn;
  }

  private async fetch(url: string, init?: RequestInit): Promise<Response> {
    if (this.customFetch) {
      return this.customFetch(url, init);
    }
    return fetch(url, init);
  }

  /**
   * Create a new Human Soundclash Battle
   */
  public async createBattle(params: {
    roomId: string;
    title?: string;
    dj1: { id: string; name: string; avatar: string };
    dj2?: { id: string; name: string; avatar: string };
    durationSec?: number;
  }): Promise<HumanSoundclashBattle> {
    const res = await this.fetch(`${this.baseUrl}/api/soundclash/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create Soundclash battle' }));
      throw new Error(err.error || 'Failed to create battle');
    }
    const data = await res.json();
    return data.battle;
  }

  /**
   * Register challenger (DJ 2) in an active battle
   */
  public async registerChallenger(roomId: string, challenger: { id: string; name: string; avatar: string }): Promise<HumanSoundclashBattle> {
    const res = await this.fetch(`${this.baseUrl}/api/soundclash/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, challenger }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to join challenge' }));
      throw new Error(err.error || 'Failed to join challenge');
    }
    const data = await res.json();
    return data.battle;
  }

  /**
   * Submit chosen catalogue track for a contender
   */
  public async submitTrack(roomId: string, userId: string, track: Track): Promise<HumanSoundclashBattle> {
    const res = await this.fetch(`${this.baseUrl}/api/soundclash/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, userId, track }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to submit track' }));
      throw new Error(err.error || 'Failed to submit track');
    }
    const data = await res.json();
    return data.battle;
  }

  /**
   * Cast vote for DJ 1 or DJ 2
   */
  public async castVote(roomId: string, userId: string, choice: 'dj1' | 'dj2'): Promise<HumanSoundclashBattle> {
    const res = await this.fetch(`${this.baseUrl}/api/soundclash/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, userId, choice }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to cast vote' }));
      throw new Error(err.error || 'Failed to cast vote');
    }
    const data = await res.json();
    return data.battle;
  }

  /**
   * Get active battle in room
   */
  public async getActiveBattle(roomId: string): Promise<HumanSoundclashBattle | null> {
    const res = await this.fetch(`${this.baseUrl}/api/soundclash/active?roomId=${encodeURIComponent(roomId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.battle || null;
  }

  /**
   * Get historical battles
   */
  public async getHistory(roomId?: string): Promise<SoundclashHistoryEntry[]> {
    const url = roomId
      ? `${this.baseUrl}/api/soundclash/history?roomId=${encodeURIComponent(roomId)}`
      : `${this.baseUrl}/api/soundclash/history`;
    const res = await this.fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  }
}

export const soundclashService = new SoundclashService();
