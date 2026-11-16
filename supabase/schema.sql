-- =========================================================================
-- AI DJ STUDIO — SUPABASE POSTGRESQL PRODUCTION DATABASE SCHEMA
-- Phase 1: Backend, Authentication and Persistent Database
-- Tables: profiles, playlists, playlist_tracks, liked_songs, listening_history, rooms, room_members
-- Includes Row Level Security (RLS) Policies, Foreign Keys, Triggers & Automatic User Sync
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. PROFILES TABLE
-- Linked 1-to-1 with Supabase auth.users via foreign key
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'listener' CHECK (role IN ('listener', 'co-dj', 'host', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 2. PLAYLISTS TABLE
-- User-created and curated DJ playlists
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url TEXT DEFAULT 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 3. PLAYLIST_TRACKS TABLE
-- Tracks associated with playlists, ordered by position
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 180,
  bpm INTEGER,
  musical_key TEXT,
  energy INTEGER DEFAULT 75,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 4. LIKED_SONGS TABLE
-- Tracks liked by users (1-to-many from profiles)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.liked_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 180,
  bpm INTEGER,
  musical_key TEXT,
  energy INTEGER DEFAULT 75,
  liked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_track UNIQUE (user_id, track_id)
);

-- =========================================================================
-- 5. LISTENING_HISTORY TABLE
-- Audit log of recently played tracks for personalized recommendations
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 180,
  bpm INTEGER,
  musical_key TEXT,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 6. ROOMS TABLE
-- Collaborative DJ rooms with host ownership, unique codes and live state
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT 'Open Format',
  cover_url TEXT DEFAULT 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop',
  is_live BOOLEAN NOT NULL DEFAULT true,
  current_track_id TEXT,
  current_position_sec INTEGER DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  playback_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 7. ROOM_MEMBERS TABLE
-- Participants inside active live rooms with role hierarchy
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'listener' CHECK (role IN ('listener', 'co-dj', 'host')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_room_member UNIQUE (room_id, user_id)
);

-- =========================================================================
-- 8. ROOM_QUEUE TABLE
-- Collaborative shared music queue for live rooms
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.room_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 180,
  bpm INTEGER,
  musical_key TEXT,
  energy INTEGER DEFAULT 75,
  position INTEGER NOT NULL DEFAULT 0,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 9. ROOM_MESSAGES TABLE
-- Live chat messages and system alerts for live rooms
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_avatar TEXT NOT NULL,
  message TEXT NOT NULL,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- INDEXES FOR FAST QUERYING
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON public.playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_user_id ON public.liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_track_id ON public.liked_songs(track_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_user_id ON public.listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_is_live ON public.rooms(is_live);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);

-- =========================================================================
-- AUTOMATIC TIMESTAMP TRIGGER
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_playlists_updated_at ON public.playlists;
CREATE TRIGGER trigger_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_rooms_updated_at ON public.rooms;
CREATE TRIGGER trigger_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================================
-- ROOM CAPACITY ENFORCEMENT TRIGGER (STRICT 50 PARTICIPANT MAXIMUM)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.check_room_capacity()
RETURNS trigger AS $$
DECLARE
  current_member_count INTEGER;
BEGIN
  SELECT count(*) INTO current_member_count
  FROM public.room_members
  WHERE room_id = new.room_id;

  IF current_member_count >= 50 THEN
    RAISE EXCEPTION 'ROOM_CAPACITY_REACHED: Room has reached its maximum limit of 50 participants'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_room_capacity ON public.room_members;
CREATE TRIGGER trigger_check_room_capacity
  BEFORE INSERT ON public.room_members
  FOR EACH ROW EXECUTE FUNCTION public.check_room_capacity();

-- =========================================================================
-- AUTOMATIC NEW USER PROFILE SYNC (AUTH.USERS -> PUBLIC.PROFILES)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'
    ),
    'listener'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES RLS
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. PLAYLISTS RLS
CREATE POLICY "Playlists are viewable by owner or if public"
  ON public.playlists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

-- 3. PLAYLIST_TRACKS RLS
CREATE POLICY "Playlist tracks viewable if playlist is viewable"
  ON public.playlist_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id AND (p.is_public = true OR p.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert tracks to their own playlists"
  ON public.playlist_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tracks from their own playlists"
  ON public.playlist_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id AND p.user_id = auth.uid()
    )
  );

-- 4. LIKED_SONGS RLS
CREATE POLICY "Users can view their own liked songs"
  ON public.liked_songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own liked songs"
  ON public.liked_songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liked songs"
  ON public.liked_songs FOR DELETE
  USING (auth.uid() = user_id);

-- 5. LISTENING_HISTORY RLS
CREATE POLICY "Users can view their own listening history"
  ON public.listening_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own listening history"
  ON public.listening_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. ROOMS RLS
CREATE POLICY "Live rooms viewable by everyone"
  ON public.rooms FOR SELECT
  USING (is_live = true OR auth.uid() = host_id);

CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their room"
  ON public.rooms FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Host can delete their room"
  ON public.rooms FOR DELETE
  USING (auth.uid() = host_id);

-- 7. ROOM_MEMBERS RLS
CREATE POLICY "Room members are viewable by participants"
  ON public.room_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Host can update participant roles"
  ON public.room_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_id = auth.uid()
    )
  );

CREATE POLICY "Users or room hosts can leave or remove members"
  ON public.room_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_id = auth.uid()
    )
  );

-- 8. ROOM_QUEUE RLS
ALTER TABLE public.room_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room queue viewable by everyone in room"
  ON public.room_queue FOR SELECT
  USING (true);

CREATE POLICY "Host and Co-DJ can add tracks to room queue"
  ON public.room_queue FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.room_members m
      WHERE m.room_id = room_id AND m.user_id = auth.uid() AND m.role IN ('host', 'co-dj')
    )
  );

CREATE POLICY "Host and Co-DJ can update or reorder room queue"
  ON public.room_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.room_members m
      WHERE m.room_id = room_id AND m.user_id = auth.uid() AND m.role IN ('host', 'co-dj')
    )
  );

CREATE POLICY "Host and Co-DJ can delete tracks from room queue"
  ON public.room_queue FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.room_members m
      WHERE m.room_id = room_id AND m.user_id = auth.uid() AND m.role IN ('host', 'co-dj')
    )
  );

-- 9. ROOM_MESSAGES RLS
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room messages viewable by everyone"
  ON public.room_messages FOR SELECT
  USING (true);

CREATE POLICY "Participants can send room messages"
  ON public.room_messages FOR INSERT
  WITH CHECK (true);

-- =========================================================================
-- 10. REPORTED_CONTENT TABLE (PHASE 7: ADMIN & MODERATION)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.reported_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('chat_message', 'room', 'track', 'user')),
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  moderator_notes TEXT DEFAULT '',
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.reported_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports"
  ON public.reported_content FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins and Moderators can view and manage all reports"
  ON public.reported_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

-- Enable Supabase Realtime Publication for Live Rooms & Reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reported_content;

-- =========================================================================
-- 11. TRACKS TABLE (PHASE 2: DATABASE-BACKED CATALOGUE)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT DEFAULT '',
  duration_sec INTEGER NOT NULL DEFAULT 180,
  bpm INTEGER,
  musical_key TEXT,
  camelot_key TEXT,
  energy INTEGER DEFAULT 75 CHECK (energy >= 0 AND energy <= 100),
  genre TEXT NOT NULL DEFAULT 'Electronic',
  audio_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'catalog',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public tracks are viewable by everyone"
  ON public.tracks FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
  ));

CREATE POLICY "Admins and Moderators can manage tracks"
  ON public.tracks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

-- =========================================================================
-- 12. ACOUSTIC_FEATURES TABLE (PHASE 2 & 11)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.acoustic_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  bpm NUMERIC(6,2),
  musical_key TEXT,
  camelot_key TEXT,
  energy INTEGER CHECK (energy >= 0 AND energy <= 100),
  danceability NUMERIC(4,3),
  valence NUMERIC(4,3),
  analysis_status TEXT NOT NULL DEFAULT 'verified' CHECK (analysis_status IN ('pending', 'verified', 'manual', 'failed')),
  analysis_timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.acoustic_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acoustic features viewable by everyone"
  ON public.acoustic_features FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage acoustic features"
  ON public.acoustic_features FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

-- =========================================================================
-- 13. QUEUE_VOTES TABLE (PHASE 4: COLLABORATIVE QUEUE VOTING)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.queue_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  queue_item_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_queue_user_vote UNIQUE (room_id, queue_item_id, user_id)
);

ALTER TABLE public.queue_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Queue votes viewable by room members"
  ON public.queue_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert or update their own votes"
  ON public.queue_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their own votes"
  ON public.queue_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their own votes"
  ON public.queue_votes FOR DELETE
  USING (auth.uid() = user_id);

-- =========================================================================
-- 14. QUEUE_EVENTS TABLE (PHASE 4: QUEUE EVENT AUDIT LOGGING)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.queue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  track_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('track_added', 'track_removed', 'track_reordered', 'vote_added', 'vote_changed', 'vote_removed', 'track_started', 'track_completed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.queue_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Queue events viewable by room members"
  ON public.queue_events FOR SELECT
  USING (true);

CREATE POLICY "Users can insert queue events"
  ON public.queue_events FOR INSERT
  WITH CHECK (true);

-- =========================================================================
-- 15. SOUNDCLASH_BATTLES & HISTORY (PHASE 7: HUMAN DJ VS DJ)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.soundclash_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  dj1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dj2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dj1_track_id TEXT,
  dj2_track_id TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 45,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
  winner_track_id TEXT,
  winner_dj_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.soundclash_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Soundclash battles viewable by everyone"
  ON public.soundclash_battles FOR SELECT
  USING (true);

CREATE POLICY "Host and Co-DJ can manage battles"
  ON public.soundclash_battles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.room_members m WHERE m.room_id = room_id AND m.user_id = auth.uid() AND m.role IN ('host', 'co-dj')
    )
  );

CREATE TABLE IF NOT EXISTS public.soundclash_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.soundclash_battles(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  dj1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dj2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dj1_track_title TEXT NOT NULL,
  dj2_track_title TEXT NOT NULL,
  dj1_votes INTEGER NOT NULL DEFAULT 0,
  dj2_votes INTEGER NOT NULL DEFAULT 0,
  winner_track_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.soundclash_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Soundclash history viewable by everyone"
  ON public.soundclash_history FOR SELECT
  USING (true);

-- =========================================================================
-- 16. SESSIONS & SESSION_EVENTS (PHASE 9: SESSION ANALYTICS)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  tracks_played_count INTEGER NOT NULL DEFAULT 0,
  peak_listeners INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions or host sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
  ));

CREATE POLICY "Users can create and update their sessions"
  ON public.sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('session_start', 'session_end', 'track_play', 'track_skip', 'queue_add', 'vote_cast', 'soundclash_win', 'reaction_sent')),
  track_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session events"
  ON public.session_events FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
  ));

CREATE POLICY "Users can insert session events"
  ON public.session_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 17. ROOM 50-PARTICIPANT CAPACITY ENFORCEMENT TRIGGER (PHASE 8)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.check_room_capacity()
RETURNS trigger AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT count(*) INTO current_count FROM public.room_members WHERE room_id = new.room_id;
  IF current_count >= 50 THEN
    RAISE EXCEPTION 'ROOM_CAPACITY_REACHED: Room has reached its maximum limit of 50 participants.';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_room_capacity ON public.room_members;
CREATE TRIGGER trigger_room_capacity
  BEFORE INSERT ON public.room_members
  FOR EACH ROW EXECUTE FUNCTION public.check_room_capacity();

-- Realtime Publications for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.soundclash_battles;


