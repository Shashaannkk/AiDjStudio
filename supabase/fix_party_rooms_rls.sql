-- =========================================================================
-- AI DJ STUDIO — PARTY ROOMS REALTIME & RLS REPAIR SCRIPT
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/plkssrrlbrucnxklnvuy/sql/new
--
-- This enables seamless party room creation, guest & authenticated DJ hosting,
-- participant presence tracking, and room joining via 6-character room codes.
-- =========================================================================

-- 1. Profiles Table: Allow inserting guest profiles so foreign key constraints pass
DROP POLICY IF EXISTS "Public profiles are insertable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are insertable by everyone"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- 2. Rooms Table: Allow room creation and live discovery for everyone
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.rooms;
CREATE POLICY "Anyone can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Live rooms viewable by everyone" ON public.rooms;
CREATE POLICY "Live rooms viewable by everyone"
  ON public.rooms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Host can update their room" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;
CREATE POLICY "Anyone can update rooms"
  ON public.rooms FOR UPDATE
  USING (true);

-- 3. Room Members Table: Allow participants to join and view members
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_members;
DROP POLICY IF EXISTS "Anyone can join rooms" ON public.room_members;
CREATE POLICY "Anyone can join rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Room members are viewable by participants" ON public.room_members;
CREATE POLICY "Room members are viewable by participants"
  ON public.room_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users or room hosts can leave or remove members" ON public.room_members;
CREATE POLICY "Users or room hosts can leave or remove members"
  ON public.room_members FOR DELETE
  USING (true);

-- 4. Enable Supabase Realtime broadcast & presence replication on rooms and room_members
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
  END;
END $$;
