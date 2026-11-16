import type {
  AssistantMessage,
  AssistantContext,
} from '../types/assistant';
import { catalogueRagRetriever } from './catalogueRagRetriever';

class AiAssistantService {
  private messages: AssistantMessage[] = [];

  constructor() {
    this.initGreeting();
  }

  private initGreeting() {
    this.messages = [
      {
        id: 'msg-greeting-initial',
        role: 'assistant',
        content: `👋 **Welcome to AI DJ Assistant!** I'm your studio co-pilot. I analyze your library and current playback in real-time to curate real songs, design playlists, and guide your DJ transitions.\n\nHere are some things you can ask me:\n- ⚡ *"Play something energetic"* \n- 🔍 *"Find songs similar to the current track"*\n- 💿 *"Create a 30-minute chill playlist"*\n- 🎛️ *"Recommend a track with compatible BPM"*\n- 💡 *"Explain why the next song fits"*\n- ✨ *"Suggest a better transition"*\n- ⚠️ *"Clear my upcoming queue"*`,
        timestamp: this.getCurrentTimeString(),
        createdAt: Date.now(),
      },
    ];
  }

  public getMessages(): AssistantMessage[] {
    return [...this.messages];
  }

  public clearMessages() {
    this.initGreeting();
  }

  private getCurrentTimeString(): string {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Send a message to the AI DJ Assistant
   */
  public async sendMessage(
    text: string,
    context: AssistantContext
  ): Promise<AssistantMessage> {
    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      role: 'user',
      content: text,
      timestamp: this.getCurrentTimeString(),
      createdAt: Date.now(),
    };

    this.messages.push(userMsg);

    // Try calling the server-side AI API endpoint first
    try {
      const serverRes = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.messages,
          context: {
            currentTrack: context.currentTrack,
            queueLength: context.queue?.length || 0,
            activeRoom: context.activeRoom ? { id: context.activeRoom.id, name: context.activeRoom.name } : null,
            roomRole: context.roomRole,
            roomMood: context.roomMood?.mood,
          },
        }),
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data && data.message) {
          const assistantMsg: AssistantMessage = {
            ...data.message,
            timestamp: this.getCurrentTimeString(),
            createdAt: Date.now(),
          };
          this.messages.push(assistantMsg);
          return assistantMsg;
        }
      }
    } catch {
      // Server endpoint not reachable or running standalone; fall back to local RAG engine
    }

    // Local High-Precision Catalogue RAG Intent Engine
    const assistantMsg = this.processLocalRagIntent(text, context);
    this.messages.push(assistantMsg);
    return assistantMsg;
  }

  /**
   * Deterministic Catalogue RAG Intent Processor
   */
  public processLocalRagIntent(
    text: string,
    context: AssistantContext
  ): AssistantMessage {
    const lower = text.toLowerCase().trim();
    const id = `asst-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = this.getCurrentTimeString();
    const currentTrack = context.currentTrack || catalogueRagRetriever.getAllTracks()[0];
    const upcomingQueue = context.queue || [];
    const nextTrack = upcomingQueue[0] || catalogueRagRetriever.getAllTracks()[1];

    // 1. Destructive Action Confirmation: Clear Queue
    if (
      lower.includes('clear queue') ||
      lower.includes('wipe queue') ||
      lower.includes('empty queue') ||
      lower.includes('delete queue') ||
      lower.includes('clear my queue')
    ) {
      const queueCount = upcomingQueue.length;
      if (queueCount === 0) {
        return {
          id,
          role: 'assistant',
          content: 'Your playback queue is already empty! There are no upcoming songs to clear.',
          timestamp,
          createdAt: Date.now(),
        };
      }

      return {
        id,
        role: 'assistant',
        content: `⚠️ **Confirmation Required Before Action:**\n\nYou asked to clear your current upcoming queue (${queueCount} track${queueCount === 1 ? '' : 's'}). Since this will wipe your upcoming schedule, please confirm below.`,
        timestamp,
        createdAt: Date.now(),
        confirmationPrompt: {
          actionType: 'CLEAR_QUEUE',
          title: 'Clear Upcoming Queue',
          warning: `This will remove all ${queueCount} track(s) from your queue. This action cannot be undone.`,
          confirmLabel: `Yes, Clear ${queueCount} Track${queueCount === 1 ? '' : 's'}`,
          cancelLabel: 'Keep Queue',
          isDestructive: true,
        },
      };
    }

    // 2. Playlist Generation: "Create a 30-minute chill playlist" (or X-min / mood playlist)
    if (
      lower.includes('create') &&
      (lower.includes('playlist') || lower.includes('session') || lower.includes('mix'))
    ) {
      let mood = 'chill';
      if (lower.includes('energetic') || lower.includes('hype')) mood = 'energetic';
      else if (lower.includes('party') || lower.includes('club')) mood = 'party';
      else if (lower.includes('focus') || lower.includes('study')) mood = 'focus';
      else if (lower.includes('happy') || lower.includes('euphoric')) mood = 'happy';
      else if (lower.includes('melancholic') || lower.includes('sad')) mood = 'melancholic';

      // Parse target duration in minutes if specified (default: 30 minutes)
      const minMatch = lower.match(/(\d+)\s*[- ]?(min|minute)/);
      const targetMins = minMatch ? parseInt(minMatch[1], 10) : 30;
      const targetSecs = targetMins * 60;

      const { tracks, totalDuration } = catalogueRagRetriever.assembleTargetDurationPlaylist(
        mood,
        targetSecs
      );

      const actualMins = Math.round(totalDuration / 60);
      const playlistName = `${mood.charAt(0).toUpperCase() + mood.slice(1)} ${actualMins}m DJ Set`;
      const playlistDesc = `Curated by AI DJ Assistant • ${tracks.length} real catalogue tracks • ${actualMins} min continuous flow`;

      return {
        id,
        role: 'assistant',
        content: `💿 **Assembled ${playlistName}!**\n\nI gathered **${tracks.length} real catalogue tracks** matching your **${mood}** vibe for a total duration of **${actualMins} minutes**.\n\nClick **"Create Playlist in Library"** to save it to your playlists immediately!`,
        timestamp,
        createdAt: Date.now(),
        suggestedTracks: tracks.slice(0, 4),
        actionProposal: {
          id: `act-pl-${Date.now()}`,
          type: 'CREATE_PLAYLIST',
          label: `Save "${playlistName}" (${tracks.length} tracks)`,
          tracks,
          playlistName,
          playlistDescription: playlistDesc,
          requiresConfirmation: false,
        },
      };
    }

    // 3. Similar Track Search: "Find songs similar to current track"
    if (
      lower.includes('similar') ||
      lower.includes('like this') ||
      lower.includes('more like') ||
      lower.includes('sounds like')
    ) {
      const similar = catalogueRagRetriever.findSimilarTracks(currentTrack, 4);
      return {
        id,
        role: 'assistant',
        content: `🔍 **Songs similar to "${currentTrack.title}" by ${currentTrack.artist_name}:**\n\nI analyzed the BPM (${currentTrack.bpm} BPM), musical key (${currentTrack.key || '8A'}), energy (${currentTrack.energy || 75}%), and genre (${currentTrack.genre || 'Electronic'}). Here are 4 harmonious matches from our real catalogue:`,
        timestamp,
        createdAt: Date.now(),
        suggestedTracks: similar,
      };
    }

    // 4. Compatible BPM Request: "Recommend a track with compatible BPM"
    if (
      lower.includes('compatible bpm') ||
      lower.includes('same bpm') ||
      lower.includes('match bpm') ||
      lower.includes('tempo')
    ) {
      const targetBpm = currentTrack.bpm || 124;
      const compatible = catalogueRagRetriever.findBpmCompatibleTracks(targetBpm, 4, 4);

      return {
        id,
        role: 'assistant',
        content: `🎛️ **BPM-Compatible Recommendations (${targetBpm} BPM):**\n\nThese real catalogue tracks stay within $\\pm 4\\%$ of **${targetBpm} BPM**, allowing smooth beat-matching with near-zero pitch stretching!`,
        timestamp,
        createdAt: Date.now(),
        suggestedTracks: compatible,
      };
    }

    // 5. Explain Why Next Song Fits: "Explain why the next song fits"
    if (
      lower.includes('why') &&
      (lower.includes('fit') || lower.includes('work') || lower.includes('next') || lower.includes('song'))
    ) {
      const tip = catalogueRagRetriever.getTransitionAnalysis(currentTrack, nextTrack);
      return {
        id,
        role: 'assistant',
        content: `💡 **Harmonic & Energy Breakdown: Why "${nextTrack.title}" Fits Next:**\n\n` +
          `• **Harmonic Relationship**: ${tip.keyRelationship}\n` +
          `• **Tempo Alignment**: ${tip.bpmComparison}\n` +
          `• **Transition Compatibility**: **${tip.compatibilityScore}% Match**\n` +
          `• **Mixing Flow**: ${tip.technique}`,
        timestamp,
        createdAt: Date.now(),
        transitionTip: tip,
      };
    }

    // 6. Transition Suggestion: "Suggest a better transition"
    if (
      lower.includes('transition') ||
      lower.includes('crossfade') ||
      lower.includes('blend') ||
      lower.includes('mix')
    ) {
      const tip = catalogueRagRetriever.getTransitionAnalysis(currentTrack, nextTrack);
      return {
        id,
        role: 'assistant',
        content: `✨ **Pro DJ Transition Strategy for "${currentTrack.title}" → "${nextTrack.title}":**\n\n` +
          `• **Recommended Technique**: ${tip.technique}\n` +
          `• **EQ & Filter Plan**: ${tip.eqAdvice}\n` +
          `• **Harmonic Compatibility**: ${tip.compatibilityScore}%\n` +
          `• **Key Relation**: ${tip.keyRelationship}`,
        timestamp,
        createdAt: Date.now(),
        transitionTip: tip,
      };
    }

    // 7. Energetic Music: "Play something energetic"
    if (
      lower.includes('energetic') ||
      lower.includes('hype') ||
      lower.includes('fire') ||
      lower.includes('fast')
    ) {
      const energeticTracks = catalogueRagRetriever.searchByMood('energetic', 4);
      const topTrack = energeticTracks[0];

      return {
        id,
        role: 'assistant',
        content: `⚡ **High Energy Pick: "${topTrack.title}" by ${topTrack.artist_name}** (${topTrack.bpm} BPM, ${topTrack.energy}% Energy)!\n\nHere are top energetic anthems from our catalogue to ignite your session:`,
        timestamp,
        createdAt: Date.now(),
        suggestedTracks: energeticTracks,
        actionProposal: {
          id: `act-play-${Date.now()}`,
          type: 'PLAY_TRACK',
          label: `Play "${topTrack.title}" Now`,
          track: topTrack,
          requiresConfirmation: false,
        },
      };
    }

    // 8. General Mood or Keyword Search
    const searchTracks = catalogueRagRetriever.searchByKeyword(text, 4);
    if (searchTracks.length > 0) {
      return {
        id,
        role: 'assistant',
        content: `🎵 **Found ${searchTracks.length} tracks matching "${text}" in our catalogue:**\n\nAll tracks are available for instant playback or queueing.`,
        timestamp,
        createdAt: Date.now(),
        suggestedTracks: searchTracks,
      };
    }

    // 9. Default Helpful Fallback
    const fallbackTracks = catalogueRagRetriever.getAllTracks().slice(0, 3);
    return {
      id,
      role: 'assistant',
      content: `🎧 I'm listening! You can ask me to find songs by mood, check BPM compatibility, analyze transitions, or build custom playlists.\n\nHere are some trending tracks ready to play:`,
      timestamp,
      createdAt: Date.now(),
      suggestedTracks: fallbackTracks,
    };
  }
}

export const aiAssistantService = new AiAssistantService();
