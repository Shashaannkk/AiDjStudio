import type { ChatMessage } from '../types/music';
import { FIXTURE_CHAT_MESSAGES } from '../fixtures/musicFixtures';

const CHAT_STORAGE_PREFIX = 'aidj_chat_history_';

class ChatService {
  private chatChannel: BroadcastChannel | null = null;
  private messageListeners: Set<(msg: ChatMessage, roomId: string) => void> = new Set();
  private processedMessageIds: Set<string> = new Set();
  private eventSource: EventSource | null = null;

  constructor() {
    // 1. Local cross-tab broadcast channel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.chatChannel = new BroadcastChannel('aidj_realtime_room_chat');
        this.chatChannel.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'NEW_CHAT_MESSAGE') {
            const { message, roomId } = event.data;
            this.handleIncomingMessage(message, roomId);
          }
        });
      } catch (e) {
        console.warn('BroadcastChannel not supported or restricted for chat:', e);
      }
    }

    // 2. Connect to Server-Sent Events (SSE) stream for cross-browser, incognito & cross-device real-time sync
    this.initSseStream();
  }

  private initSseStream() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/chat/stream');
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'NEW_CHAT_MESSAGE' && data.message) {
            this.handleIncomingMessage(data.message, data.roomId);
          }
        } catch {
          // Ignore parse errors on heartbeats
        }
      };

      this.eventSource.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch (e) {
      console.warn('SSE not supported or failed to connect:', e);
    }
  }

  private handleIncomingMessage(msg: ChatMessage, roomId: string) {
    if (!msg || !msg.id) return;
    if (this.processedMessageIds.has(msg.id)) return;
    this.processedMessageIds.add(msg.id);

    // Save to local storage for persistence
    try {
      const key = `${CHAT_STORAGE_PREFIX}${roomId}`;
      const current = this.getRoomMessages(roomId);
      if (!current.some((m) => m.id === msg.id)) {
        const updated = [...current, msg].slice(-100);
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Error syncing message to storage:', e);
    }

    // Notify all active React UI listeners
    this.messageListeners.forEach((listener) => listener(msg, roomId));
  }

  /**
   * Get persistent chat messages for a specific room
   */
  public getRoomMessages(roomId: string): ChatMessage[] {
    if (typeof window === 'undefined' || !roomId) return FIXTURE_CHAT_MESSAGES;
    try {
      const key = `${CHAT_STORAGE_PREFIX}${roomId}`;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading chat history from storage:', e);
    }
    return FIXTURE_CHAT_MESSAGES;
  }

  /**
   * Send a real-time message to a room and broadcast across all tabs, windows, and browsers
   */
  public sendMessage(
    roomId: string,
    text: string,
    senderName: string,
    senderAvatar: string,
    isAi = false,
    senderEmail?: string
  ): ChatMessage {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userName: senderName || 'Anonymous DJ',
      userEmail: senderEmail,
      userAvatar:
        senderAvatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      message: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAi,
    };

    this.processedMessageIds.add(newMsg.id);

    // Save to persistent storage
    try {
      const key = `${CHAT_STORAGE_PREFIX}${roomId}`;
      const current = this.getRoomMessages(roomId);
      const updated = [...current, newMsg].slice(-100);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving chat message to storage:', e);
    }

    // Broadcast across tabs in the same browser
    this.chatChannel?.postMessage({
      type: 'NEW_CHAT_MESSAGE',
      roomId,
      message: newMsg,
    });

    // Broadcast across different browsers/incognito via dev server endpoint
    if (typeof fetch !== 'undefined') {
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, message: newMsg }),
      }).catch(() => {
        // Dev server api fallback handled by BroadcastChannel
      });
    }

    // Notify local listeners in the current tab
    this.messageListeners.forEach((listener) => listener(newMsg, roomId));

    // Optional simulated smart co-host reaction if user mentions drop or vibe
    if (!isAi && (text.includes('🔥') || text.toLowerCase().includes('drop') || text.toLowerCase().includes('love'))) {
      setTimeout(() => {
        this.sendAiReaction(roomId);
      }, 1200);
    }

    return newMsg;
  }

  /**
   * Subscribe to incoming real-time messages
   */
  public subscribeToMessages(callback: (msg: ChatMessage, roomId: string) => void): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  /**
   * Automated AI DJ & community reaction in live room
   */
  private sendAiReaction(roomId: string) {
    const reactions = [
      'The harmonic transition is locked in! 🎧✨',
      'Bassline frequency peaking at 128 BPM! 🔥',
      'Vibe score 98% in this room right now! 🚀',
      'AI beat-matching active — seamless energy flow.',
    ];
    const picked = reactions[Math.floor(Math.random() * reactions.length)];
    this.sendMessage(
      roomId,
      picked,
      'AI DJ Co-Host',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=200&auto=format&fit=crop',
      true,
      'ai.dj@studio.system'
    );
  }
}

export const chatService = new ChatService();
