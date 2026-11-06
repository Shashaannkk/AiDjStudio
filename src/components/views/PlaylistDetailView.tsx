import React, { useState, useEffect } from 'react';
import { Play, Heart, Clock, Shuffle, ChevronLeft, Music, Sparkles } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { FIXTURE_TRACKS } from '../../fixtures/musicFixtures';
import { musicService } from '../../services/musicService';
import type { Track } from '../../types/music';

export const PlaylistDetailView: React.FC = () => {
  const {
    selectedPlaylist,
    currentView,
    setCurrentView,
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    likedTrackIds,
    likedTracks,
    toggleLike,
    isShuffle,
    toggleShuffle,
  } = usePlayerStore();

  const isLikedView = currentView === 'liked' || selectedPlaylist?.id === 'pl_liked';
  const isCustomUserPlaylist = selectedPlaylist?.category === 'user' && selectedPlaylist?.id !== 'pl_liked';
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>(FIXTURE_TRACKS);

  useEffect(() => {
    let active = true;
    if (selectedPlaylist && !isLikedView && !isCustomUserPlaylist) {
      musicService.getTracksForGenre(selectedPlaylist.name).then((res) => {
        if (active && res && res.length > 0) {
          setPlaylistTracks(res);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [selectedPlaylist, isLikedView, isCustomUserPlaylist]);

  const tracks = isLikedView
    ? likedTracks
    : isCustomUserPlaylist && selectedPlaylist?.tracks
    ? selectedPlaylist.tracks
    : playlistTracks;

  const title = isLikedView ? 'Liked Songs' : selectedPlaylist?.name || 'Playlist';
  const description = isLikedView
    ? 'All the tracks you love, ready for instant playback and AI DJ mixing.'
    : selectedPlaylist?.description || 'Curated music collection';

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0]);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Back button */}
      <button
        onClick={() => setCurrentView('home')}
        className="flex items-center gap-1 text-xs font-semibold text-[#B3B3B3] hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Discovery</span>
      </button>

      {/* Playlist Hero Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 p-6 rounded-2xl bg-gradient-to-b from-[#242424] to-[#121212] border border-white/5 shadow-2xl">
        {/* Cover Artwork */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-[#282828] relative group">
          {isLikedView ? (
            <div className="w-full h-full bg-gradient-to-br from-[#8C52FF] via-[#6366F1] to-[#3B82F6] flex items-center justify-center shadow-inner">
              <Heart className="w-20 h-20 text-white fill-white drop-shadow-lg" />
            </div>
          ) : selectedPlaylist?.image ? (
            <img
              src={selectedPlaylist.image}
              alt={title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop';
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-4xl">
              <Music className="w-16 h-16 opacity-30" />
            </div>
          )}
        </div>

        {/* Playlist Metadata */}
        <div className="flex flex-col justify-end min-w-0 flex-1">
          <span className="text-xs uppercase font-extrabold tracking-wider text-white/80">
            {isLikedView ? 'Collection' : 'Playlist'}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white mt-1 mb-2 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-[#B3B3B3] line-clamp-2 leading-relaxed max-w-xl">
            {description}
          </p>

          <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-[#B3B3B3]">
            <span className="text-white font-bold">AI DJ Studio</span>
            <span>•</span>
            <span>{tracks.length} songs</span>
            <span>•</span>
            <span>About {Math.round(tracks.reduce((acc, t) => acc + t.duration, 0) / 60)} min</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-5 px-2">
        {/* Big Green Play Button */}
        <button
          onClick={handlePlayAll}
          aria-label="Play playlist"
          className="w-14 h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-[#1DB954]/30 transform hover:scale-105 active:scale-95 transition-all"
        >
          <Play className="w-7 h-7 fill-black stroke-black ml-1" />
        </button>

        {/* Shuffle */}
        <button
          onClick={toggleShuffle}
          aria-label="Shuffle playlist"
          className={`p-2 rounded-full transition-colors ${
            isShuffle ? 'text-[#1DB954] bg-[#1DB954]/10' : 'text-[#B3B3B3] hover:text-white'
          }`}
          title="Shuffle"
        >
          <Shuffle className="w-6 h-6" />
        </button>
      </div>

      {/* Track List Table */}
      <div className="rounded-xl bg-[#181818]/60 border border-white/5 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-12 px-4 py-2.5 text-xs font-semibold text-[#B3B3B3] border-b border-white/5">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-3 hidden sm:block">Album / Genre</div>
          <div className="col-span-2 hidden md:block">BPM / Key</div>
          <div className="col-span-1 text-right flex justify-end">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Tracks */}
        {tracks.length === 0 ? (
          <div className="py-16 text-center text-[#B3B3B3] text-sm">
            No tracks in this playlist yet. Browse songs and hit the heart icon to add them.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isTrackPlaying = isCurrent && isPlaying;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => (isCurrent ? togglePlay() : playTrack(track))}
                  className="group grid grid-cols-12 items-center px-4 py-3 text-xs hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {/* # or Play button */}
                  <div className="col-span-1 text-[#B3B3B3]">
                    {isTrackPlaying ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954] animate-ping inline-block" />
                    ) : (
                      <>
                        <span className="group-hover:hidden">{idx + 1}</span>
                        <Play className="w-3.5 h-3.5 fill-white hidden group-hover:block text-white" />
                      </>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0 pr-2">
                    <img
                      src={track.image}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop';
                      }}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p
                        className={`font-semibold text-sm truncate ${
                          isCurrent ? 'text-[#1DB954]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-[#B3B3B3] truncate">{track.artist_name}</p>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="col-span-3 hidden sm:block text-[#B3B3B3] truncate pr-2">
                    {track.album_name || track.genre}
                  </div>

                  {/* BPM & Key */}
                  <div className="col-span-2 hidden md:block text-[#B3B3B3]">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[11px] flex items-center gap-1 w-fit">
                      <Sparkles className="w-3 h-3 text-[#1DB954]" />
                      {track.bpm} BPM • {track.key}
                    </span>
                  </div>

                  {/* Duration & Like */}
                  <div className="col-span-1 flex items-center justify-end gap-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track);
                      }}
                      aria-label={isLiked ? 'Unlike' : 'Like'}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                        isLiked ? 'opacity-100 text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
                    </button>
                    <span className="text-[#B3B3B3]">{formatDuration(track.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
