export interface UserAnalyticsData {
  userId: string;
  totalSessions: number;
  totalListeningMinutes: number;
  preferredBpm: number;
  topKey: string;
  tracksPlayedCount: number;
  queueActionsCount: number;
  votesCastCount: number;
  recentSessions: any[];
  activityTimeline: any[];
}

export interface PlatformAnalyticsData {
  totalSessions: number;
  totalListeningHours: number;
  totalEventsRecorded: number;
  totalTracksPlayed: number;
  totalVotesCast: number;
  activeSessions: number;
}

class AnalyticsService {
  private activeSessionId: string | null = null;
  private currentUserId: string | null = null;

  /**
   * Start a new user session
   */
  public async startSession(userId: string, roomId = 'main_studio'): Promise<string | null> {
    this.currentUserId = userId;
    try {
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomId }),
      });
      if (res.ok) {
        const data = await res.json();
        this.activeSessionId = data.session?.id || null;
        return this.activeSessionId;
      }
    } catch (e) {
      console.warn('Analytics session start skipped:', e);
    }
    return null;
  }

  /**
   * End current user session
   */
  public async endSession(): Promise<void> {
    if (!this.activeSessionId) return;
    try {
      await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.activeSessionId }),
      });
    } catch {}
    this.activeSessionId = null;
  }

  /**
   * Record a granular user action / listening event
   */
  public async recordEvent(
    eventType: 'track_play' | 'track_skip' | 'queue_add' | 'vote_cast' | 'reaction_sent',
    trackId?: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      await fetch('/api/sessions/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.activeSessionId,
          userId: this.currentUserId || 'guest',
          eventType,
          trackId,
          details,
        }),
      });
    } catch {}
  }

  /**
   * Retrieve dynamic listening metrics for a user
   */
  public async getUserAnalytics(userId: string): Promise<UserAnalyticsData | null> {
    try {
      const res = await fetch(`/api/sessions/analytics?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.analytics || null;
      }
    } catch (e) {
      console.warn('Error fetching user analytics:', e);
    }
    return null;
  }

  /**
   * Retrieve platform-wide aggregated metrics
   */
  public async getPlatformAnalytics(): Promise<PlatformAnalyticsData | null> {
    try {
      const res = await fetch('/api/sessions/analytics');
      if (res.ok) {
        const data = await res.json();
        return data.platform || null;
      }
    } catch (e) {
      console.warn('Error fetching platform analytics:', e);
    }
    return null;
  }
}

export const analyticsService = new AnalyticsService();
