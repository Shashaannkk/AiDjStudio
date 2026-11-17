import type { ChatMessage } from '../types/music';
import { userService } from './userService';

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

    // 3. Listen for auth changes to reconnect SSE with current token
    userService.onAuthChange(() => {
      this.reconnectSse();
    });
  }

  public reconnectSse() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.initSseStream();
  }

  private initSseStream() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      const token = userService.getAuthToken();
      const url = token ? `/api/chat/stream?token=${encodeURIComponent(token)}` : '/api/chat/stream';
      this.eventSource = new EventSource(url);
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
    if (typeof window === 'undefined' || !roomId) return [];
    try {
      const key = `${CHAT_STORAGE_PREFIX}${roomId}`;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading chat history from storage:', e);
    }
    return [];
  }

  /**
   * Fetch chat messages for a specific room from backend
   */
  public async fetchRoomMessagesAsync(roomId: string): Promise<ChatMessage[]> {
    if (!roomId) return [];
    try {
      const res = await fetch(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const msgs = await res.json();
        if (Array.isArray(msgs)) {
          const key = `${CHAT_STORAGE_PREFIX}${roomId}`;
          localStorage.setItem(key, JSON.stringify(msgs));
          return msgs;
        }
      }
    } catch (err) {
      console.warn('Error fetching room messages from backend:', err);
    }
    return this.getRoomMessages(roomId);
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
      const token = typeof window !== 'undefined'
        ? (sessionStorage.getItem('aidj_auth_token') || localStorage.getItem('aidj_auth_token'))
        : null;
      fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ roomId, message: newMsg }),
      }).catch(() => {
        // Dev server api fallback handled by BroadcastChannel
      });
    }

    // Notify local listeners in the current tab
    this.messageListeners.forEach((listener) => listener(newMsg, roomId));

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
}

export const chatService = new ChatService();
