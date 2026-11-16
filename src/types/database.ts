/**
 * Supabase Database TypeScript Schema Definitions
 * Provides full type safety for @supabase/supabase-js queries across all 7 core tables.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          role: 'listener' | 'co-dj' | 'host' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: 'listener' | 'co-dj' | 'host' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: 'listener' | 'co-dj' | 'host' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      playlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          cover_url: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          cover_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          cover_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      playlist_tracks: {
        Row: {
          id: string;
          playlist_id: string;
          track_id: string;
          title: string;
          artist_name: string;
          album_name: string | null;
          image_url: string;
          audio_url: string;
          duration_sec: number;
          bpm: number | null;
          musical_key: string | null;
          energy: number | null;
          position: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          playlist_id: string;
          track_id: string;
          title: string;
          artist_name: string;
          album_name?: string | null;
          image_url: string;
          audio_url: string;
          duration_sec?: number;
          bpm?: number | null;
          musical_key?: string | null;
          energy?: number | null;
          position?: number;
          added_at?: string;
        };
        Update: {
          id?: string;
          playlist_id?: string;
          track_id?: string;
          title?: string;
          artist_name?: string;
          album_name?: string | null;
          image_url?: string;
          audio_url?: string;
          duration_sec?: number;
          bpm?: number | null;
          musical_key?: string | null;
          energy?: number | null;
          position?: number;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey";
            columns: ["playlist_id"];
            isOneToOne: false;
            referencedRelation: "playlists";
            referencedColumns: ["id"];
          }
        ];
      };
      liked_songs: {
        Row: {
          id: string;
          user_id: string;
          track_id: string;
          title: string;
          artist_name: string;
          album_name: string | null;
          image_url: string;
          audio_url: string;
          duration_sec: number;
          bpm: number | null;
          musical_key: string | null;
          energy: number | null;
          liked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          track_id: string;
          title: string;
          artist_name: string;
          album_name?: string | null;
          image_url: string;
          audio_url: string;
          duration_sec?: number;
          bpm?: number | null;
          musical_key?: string | null;
          energy?: number | null;
          liked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          track_id?: string;
          title?: string;
          artist_name?: string;
          album_name?: string | null;
          image_url?: string;
          audio_url?: string;
          duration_sec?: number;
          bpm?: number | null;
          musical_key?: string | null;
          energy?: number | null;
          liked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "liked_songs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      listening_history: {
        Row: {
          id: string;
          user_id: string;
          track_id: string;
          title: string;
          artist_name: string;
          album_name: string | null;
          image_url: string;
          audio_url: string;
          duration_sec: number;
          bpm: number | null;
          musical_key: string | null;
          played_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          track_id: string;
          title: string;
          artist_name: string;
          album_name?: string | null;
          image_url: string;
          audio_url: string;
          duration_sec?: number;
          bpm?: number | null;
          musical_key?: string | null;
          played_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          track_id?: string;
          title?: string;
          artist_name?: string;
          album_name?: string | null;
          image_url?: string;
          audio_url?: string;
          duration_sec?: number;
          bpm?: number | null;
          musical_key?: string | null;
          played_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listening_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rooms: {
        Row: {
          id: string;
          code: string;
          host_id: string;
          name: string;
          genre: string;
          cover_url: string | null;
          is_live: boolean;
          current_track_id: string | null;
          current_position_sec: number;
          is_playing?: boolean;
          playback_updated_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          host_id: string;
          name: string;
          genre?: string;
          cover_url?: string | null;
          is_live?: boolean;
          current_track_id?: string | null;
          current_position_sec?: number;
          is_playing?: boolean;
          playback_updated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          host_id?: string;
          name?: string;
          genre?: string;
          cover_url?: string | null;
          is_live?: boolean;
          current_track_id?: string | null;
          current_position_sec?: number;
          is_playing?: boolean;
          playback_updated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: 'listener' | 'co-dj' | 'host';
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          role?: 'listener' | 'co-dj' | 'host';
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          role?: 'listener' | 'co-dj' | 'host';
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_queue: {
        Row: {
          id: string;
          room_id: string;
          track_id: string;
          title: string;
          artist_name: string;
          album_name: string | null;
          image_url: string;
          audio_url: string;
          duration_sec: number;
          bpm: number | null;
          musical_key: string | null;
          energy: number | null;
          position: number;
          added_by: string | null;
          added_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          track_id: string;
          title: string;
          artist_name: string;
          album_name?: string | null;
          image_url: string;
          audio_url: string;
          duration_sec?: number;
          bpm?: number | null;
          musical_key?: string | null;
          energy?: number | null;
          position?: number;
          added_by?: string | null;
          added_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          track_id?: string;
          title?: string;
          artist_name?: string;
          album_name?: string | null;
          image_url?: string;
          audio_url?: string;
          duration_sec?: number;
          bpm?: number | null;
          musical_key?: string | null;
          energy?: number | null;
          position?: number;
          added_by?: string | null;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_queue_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      room_messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string | null;
          user_name: string;
          user_email: string | null;
          user_avatar: string;
          message: string;
          is_ai: boolean;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id?: string | null;
          user_name: string;
          user_email?: string | null;
          user_avatar: string;
          message: string;
          is_ai?: boolean;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string | null;
          user_name?: string;
          user_email?: string | null;
          user_avatar?: string;
          message?: string;
          is_ai?: boolean;
          is_system?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      role: 'listener' | 'co-dj' | 'host' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
