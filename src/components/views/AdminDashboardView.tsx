import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Radio,
  FileText,
  Activity,
  Lock,
  Search,
  Power,
  RefreshCw,
  Server,
  Sliders,
  Music,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { adminService } from '../../services/adminService';
import type {
  UserAccount,
  UserAccountRole,
  UserAccountStatus,
  ReportedContent,
} from '../../types/admin';

export const AdminDashboardView: React.FC = () => {
  const { user, login, setCurrentView } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'tracks' | 'users' | 'rooms' | 'reports' | 'audit'>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

  const [usersList, setUsersList] = useState<UserAccount[]>(() => adminService.getUsers());
  const [reportsList, setReportsList] = useState<ReportedContent[]>(() => adminService.getReports());
  const [auditLogs, setAuditLogs] = useState(() => adminService.getAuditLogs());
  const [stats, setStats] = useState(() => adminService.getPlatformStats());

  // Track Catalogue State
  const [tracksList, setTracksList] = useState<any[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [isAddTrackModalOpen, setIsAddTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any | null>(null);
  const [trackFormError, setTrackFormError] = useState<string | null>(null);

  const [trackFormData, setTrackFormData] = useState({
    title: '',
    artist_name: '',
    album_name: '',
    genre: 'Electronic / Synthwave',
    audio: '',
    image: '',
    duration: 180,
    bpm: 124,
    key: '8A',
    energy: 80,
    provider: 'jamendo',
  });

  const isAuthorized = adminService.canAccessAdmin(user);

  const handleDevAdminLogin = () => {
    login({
      id: 'admin-1',
      name: 'Shashank Poojari',
      email: 'admin@aidjstudio.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      role: 'admin',
      status: 'active',
      plan: 'Admin Authority',
    });
  };

  const handleRoleChange = (userId: string, newRole: UserAccountRole) => {
    adminService.updateUserRole(userId, newRole, user);
    setUsersList(adminService.getUsers());
    setAuditLogs(adminService.getAuditLogs());
  };

  const handleStatusChange = (userId: string, newStatus: UserAccountStatus) => {
    adminService.updateUserStatus(userId, newStatus, user);
    setUsersList(adminService.getUsers());
    setAuditLogs(adminService.getAuditLogs());
  };

  const handleResolveReport = (
    reportId: string,
    action: 'ban_user' | 'close_room' | 'dismiss' | 'warning',
    notes: string
  ) => {
    adminService.resolveReport(reportId, action, notes, user);
    setReportsList(adminService.getReports());
    setAuditLogs(adminService.getAuditLogs());
    setStats(adminService.getPlatformStats());
  };

  const handleRefresh = () => {
    setUsersList(adminService.getUsers());
    setReportsList(adminService.getReports());
    setAuditLogs(adminService.getAuditLogs());
    setStats(adminService.getPlatformStats());
    if (activeTab === 'tracks') {
      loadTracks(trackSearch);
    }
  };

  const loadTracks = async (search?: string) => {
    setTracksLoading(true);
    const tracks = await adminService.fetchCatalogueTracks(search);
    setTracksList(tracks);
    setTracksLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'tracks') {
      loadTracks(trackSearch);
    }
  }, [activeTab, trackSearch]);

  const handleRunAudit = async () => {
    setIsAuditLoading(true);
    const result = await adminService.runCatalogueQualityAudit();
    setAuditResult(result);
    setIsAuditLoading(false);
  };

  const handleToggleTrackStatus = async (trackId: string) => {
    const res = await adminService.toggleTrackDeactivation(trackId);
    if (res.success) {
      loadTracks(trackSearch);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (window.confirm('Are you sure you want to delete this track from the catalogue?')) {
      const res = await adminService.deleteCatalogueTrack(trackId);
      if (res.success) {
        loadTracks(trackSearch);
      }
    }
  };

  const openAddModal = () => {
    setEditingTrack(null);
    setTrackFormData({
      title: '',
      artist_name: '',
      album_name: '',
      genre: 'Electronic / Synthwave',
      audio: '',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
      duration: 180,
      bpm: 124,
      key: '8A',
      energy: 80,
      provider: 'jamendo',
    });
    setTrackFormError(null);
    setIsAddTrackModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingTrack(t);
    setTrackFormData({
      title: t.title || '',
      artist_name: t.artist_name || '',
      album_name: t.album_name || '',
      genre: t.genre || 'Electronic',
      audio: t.audio || '',
      image: t.image || '',
      duration: t.duration || 180,
      bpm: t.bpm || 120,
      key: t.key || '8A',
      energy: t.energy || 75,
      provider: t.provider || 'jamendo',
    });
    setTrackFormError(null);
    setIsAddTrackModalOpen(true);
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackFormError(null);
    if (!trackFormData.title || !trackFormData.artist_name || !trackFormData.audio) {
      setTrackFormError('Title, Artist Name, and Audio URL are required');
      return;
    }

    if (editingTrack) {
      const res = await adminService.updateCatalogueTrack(editingTrack.id, trackFormData);
      if (res.success) {
        setIsAddTrackModalOpen(false);
        setEditingTrack(null);
        loadTracks(trackSearch);
      } else {
        setTrackFormError(res.error || 'Failed to update track');
      }
    } else {
      const res = await adminService.createCatalogueTrack(trackFormData);
      if (res.success) {
        setIsAddTrackModalOpen(false);
        setEditingTrack(null);
        loadTracks(trackSearch);
      } else {
        setTrackFormError(res.error || 'Failed to create track');
      }
    }
  };

  // Access Control Screen if unauthorized
  if (!isAuthorized) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center select-none">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#161616] border border-amber-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Administrator Restricted Area</h2>
            <p className="text-xs text-zinc-400 mt-1">
              You must have an <strong>Admin</strong> or <strong>Moderator</strong> role to access platform oversight, moderation queues, and user management.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleDevAdminLogin}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs cursor-pointer hover:opacity-95 transition-opacity"
            >
              Sign In as Lead Administrator
            </button>
            <button
              onClick={() => setCurrentView('home')}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Back to Studio Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredReports = reportsList.filter((r) => {
    if (reportFilter === 'all') return true;
    return r.status === reportFilter;
  });

  return (
    <div className="flex-1 p-6 space-y-6 text-white select-none overflow-y-auto max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">Platform Administration</h1>
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-extrabold uppercase">
                Admin Console
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Logged in as <strong className="text-white">{user?.name}</strong> ({user?.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            title="Refresh statistics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview' ? 'bg-[#282828] text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 text-[#1DB954]" />
          <span>Platform Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('tracks')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'tracks' ? 'bg-[#282828] text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Music className="w-4 h-4 text-emerald-400" />
          <span>Track Catalogue ({tracksList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users' ? 'bg-[#282828] text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>User Management ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'rooms' ? 'bg-[#282828] text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-400" />
          <span>Live Rooms Oversight</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports' ? 'bg-[#282828] text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-rose-400" />
          <span>Reported Content ({reportsList.filter((r) => r.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit' ? 'bg-[#282828] text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>Security & Audit Logs</span>
        </button>
      </div>

      {/* 3. TAB 1: OVERVIEW & STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
              <span className="text-[11px] text-zinc-400 uppercase font-bold">Total Platform Users</span>
              <div className="text-2xl font-black text-white">{stats.totalUsers.toLocaleString()}</div>
              <span className="text-[10px] text-[#1DB954] font-semibold">+{stats.activeUsersToday} active today</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
              <span className="text-[11px] text-zinc-400 uppercase font-bold">Active Live Rooms</span>
              <div className="text-2xl font-black text-amber-400">{stats.liveRoomsCount}</div>
              <span className="text-[10px] text-zinc-400">{stats.totalRooms} rooms hosted total</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
              <span className="text-[11px] text-zinc-400 uppercase font-bold">Playlists Curated</span>
              <div className="text-2xl font-black text-cyan-400">{stats.totalPlaylists}</div>
              <span className="text-[10px] text-zinc-400">{stats.totalTracksPlayed.toLocaleString()} songs played</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
              <span className="text-[11px] text-zinc-400 uppercase font-bold">Pending Moderation</span>
              <div className="text-2xl font-black text-rose-400">{stats.pendingReports}</div>
              <span className="text-[10px] text-zinc-400">{stats.totalReports} total reports filed</span>
            </div>
          </div>

          {/* Infrastructure Health Card */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[#1DB954]" />
                <h3 className="font-bold text-sm text-white">System Infrastructure & Connectivity</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-xs font-black uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
                <span>All Systems Operational</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-400 text-[11px] block">WebSocket & Realtime Channels</span>
                <span className="font-bold text-emerald-400 mt-1 block">Connected (Supabase Realtime)</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-400 text-[11px] block">Database Row-Level Security</span>
                <span className="font-bold text-emerald-400 mt-1 block">Enforced (RLS Active)</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-400 text-[11px] block">Server Uptime</span>
                <span className="font-bold text-white mt-1 block font-mono">
                  {Math.floor(stats.uptimeSeconds / 86400)}d {Math.floor((stats.uptimeSeconds % 86400) / 3600)}h {Math.floor((stats.uptimeSeconds % 3600) / 60)}m
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: TRACK CATALOGUE & ACOUSTIC FEATURES */}
      {activeTab === 'tracks' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search tracks by title, artist, genre, or key..."
                value={trackSearch}
                onChange={(e) => {
                  setTrackSearch(e.target.value);
                  loadTracks(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunAudit}
                disabled={isAuditLoading}
                className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAuditLoading ? 'Auditing...' : 'Quality Audit'}</span>
              </button>

              <button
                onClick={openAddModal}
                className="px-3.5 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Track</span>
              </button>
            </div>
          </div>

          {/* Quality Audit Result Card */}
          {auditResult && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-purple-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  <h3 className="font-black text-sm text-white">Catalogue Data Quality Health Report</h3>
                </div>
                <button
                  onClick={() => setAuditResult(null)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block">Total Audited</span>
                  <span className="font-black text-lg text-white mt-0.5 block">{auditResult.totalTracks}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block">Clean Tracks</span>
                  <span className="font-black text-lg text-emerald-400 mt-0.5 block">{auditResult.cleanTracks} ({auditResult.cleanPercentage}%)</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block">Missing Audio</span>
                  <span className="font-black text-lg text-rose-400 mt-0.5 block">{auditResult.missingAudio}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block">Duplicate URLs</span>
                  <span className="font-black text-lg text-amber-400 mt-0.5 block">{auditResult.duplicateAudios}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block">Invalid BPM/Key</span>
                  <span className="font-black text-lg text-purple-400 mt-0.5 block">{auditResult.invalidBpmOrKey}</span>
                </div>
              </div>

              {auditResult.issues && auditResult.issues.length > 0 && (
                <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                  {auditResult.issues.map((iss: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs py-1 px-2.5 rounded-lg bg-black/30 border border-white/5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-white font-medium">{iss.trackTitle || iss.trackId}:</span>
                      <span className="text-zinc-300">{iss.issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tracks Table */}
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Track Info</th>
                  <th className="p-3">Acoustic Features</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-zinc-950/60">
                {tracksLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-400">Loading catalogue tracks...</td>
                  </tr>
                ) : tracksList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-400">No tracks found in catalogue. Click "Add Track" to insert one.</td>
                  </tr>
                ) : (
                  tracksList.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-900/40">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={t.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200'}
                            alt={t.title}
                            className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block text-sm">{t.title}</span>
                            <span className="text-[11px] text-zinc-400">{t.artist_name} {t.album_name ? `• ${t.album_name}` : ''}</span>
                            <span className="text-[10px] text-zinc-500 font-mono block">ID: {t.id} • {Math.floor(t.duration / 60)}:{(t.duration % 60).toString().padStart(2, '0')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                              {t.bpm || 120} BPM
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">
                              Key {t.key || '8A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                            <span>Energy: {t.energy || 75}%</span>
                            <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500" style={{ width: `${t.energy || 75}%` }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-zinc-300">
                          {t.provider || 'catalogue'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleTrackStatus(t.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1.5 transition-colors cursor-pointer ${
                            t.isActive !== false
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${t.isActive !== false ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                          <span>{t.isActive !== false ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Edit Track"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTrack(t.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Delete Track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 3: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Rooms / Playlists</th>
                  <th className="p-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-zinc-950/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-900/40">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
                          }}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10"
                        />
                        <div>
                          <span className="font-bold text-white block">{u.name}</span>
                          <span className="text-[11px] text-zinc-400">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserAccountRole)}
                        className="bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 text-xs cursor-pointer"
                      >
                        <option value="user">User</option>
                        <option value="dj">DJ</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={u.status}
                        onChange={(e) => handleStatusChange(u.id, e.target.value as UserAccountStatus)}
                        className={`border rounded px-2 py-1 text-xs font-bold cursor-pointer ${
                          u.status === 'active'
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                            : u.status === 'suspended'
                            ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                            : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                      </select>
                    </td>
                    <td className="p-3 text-zinc-400">
                      {u.roomsHostedCount} rooms • {u.playlistsCount} playlists
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {u.status !== 'banned' ? (
                        <button
                          onClick={() => handleStatusChange(u.id, 'banned')}
                          className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Ban User
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(u.id, 'active')}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Restore Access
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 3: LIVE ROOMS OVERSIGHT */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Active Collaborative DJ Rooms</h3>
              <p className="text-xs text-zinc-400">All live peer-to-peer and collaborative rooms currently online</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#1DB954] animate-pulse" />
                  <span className="font-bold text-sm text-white">Late Night Chill Lounge</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  #CHILL77
                </span>
              </div>
              <div className="text-xs text-zinc-400 space-y-1">
                <div>Host: <strong className="text-white">Alex Rivera</strong></div>
                <div>Genre: <strong className="text-white">Lo-Fi & Downtempo</strong></div>
                <div>Connected Listeners: <strong className="text-emerald-400">4 online</strong></div>
              </div>
              <button
                onClick={() => alert('Room terminated by administrator.')}
                className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Force Close Room</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="font-bold text-sm text-white">Electronic Euphoria Mainstage</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  #RAVE24
                </span>
              </div>
              <div className="text-xs text-zinc-400 space-y-1">
                <div>Host: <strong className="text-white">Elena Rostova</strong></div>
                <div>Genre: <strong className="text-white">Synthwave / EDM</strong></div>
                <div>Connected Listeners: <strong className="text-emerald-400">8 online</strong></div>
              </div>
              <button
                onClick={() => alert('Room terminated by administrator.')}
                className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Force Close Room</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 4: REPORTED CONTENT */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(['all', 'pending', 'resolved', 'dismissed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setReportFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                    reportFilter === filter ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredReports.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-zinc-900 border border-white/5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-white/10 text-zinc-300">
                      {r.type.replace('_', ' ')}
                    </span>
                    <h4 className="font-bold text-sm text-white mt-1">{r.targetName}</h4>
                    <p className="text-xs text-rose-300 mt-0.5">⚠️ Reason: {r.reason}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                      r.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : r.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                {r.details && (
                  <p className="text-xs text-zinc-400 bg-black/40 p-2.5 rounded-lg border border-white/5">
                    {r.details}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                  <span>Reported by: <strong className="text-zinc-300">{r.reportedBy}</strong></span>
                  <span>{r.timestamp}</span>
                </div>

                {/* Moderation Action Buttons for pending reports */}
                {r.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleResolveReport(r.id, 'ban_user', 'User suspended for violation')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                      Ban Offender
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'warning', 'Official warning issued to user')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs cursor-pointer transition-colors"
                    >
                      Issue Warning
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'dismiss', 'Report investigated and dismissed')}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 font-bold text-xs cursor-pointer transition-colors ml-auto"
                    >
                      Dismiss Report
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900 border border-white/5">
            <h3 className="font-bold text-sm text-white">Security & Administrative Audit Trail</h3>
            <p className="text-xs text-zinc-400">Immutable chronological record of administrative actions</p>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold shrink-0">
                    {log.action}
                  </div>
                  <div>
                    <span className="font-semibold text-white">{log.details}</span>
                    <span className="text-zinc-500 text-[11px] block">Target: {log.targetType} ({log.targetId})</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-zinc-400 block font-mono text-[11px]">{log.adminEmail}</span>
                  <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. MODAL: ADD / EDIT CATALOGUE TRACK */}
      {isAddTrackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base text-white">
                  {editingTrack ? 'Edit Track & Acoustic Features' : 'Add Track to Master Catalogue'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddTrackModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {trackFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{trackFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTrack} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Track Title *</label>
                  <input
                    type="text"
                    required
                    value={trackFormData.title}
                    onChange={(e) => setTrackFormData({ ...trackFormData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Neon Horizons"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Artist Name *</label>
                  <input
                    type="text"
                    required
                    value={trackFormData.artist_name}
                    onChange={(e) => setTrackFormData({ ...trackFormData, artist_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Luna Skye"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Album Name</label>
                  <input
                    type="text"
                    value={trackFormData.album_name}
                    onChange={(e) => setTrackFormData({ ...trackFormData, album_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Retrograde Vol. 1"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Genre</label>
                  <input
                    type="text"
                    value={trackFormData.genre}
                    onChange={(e) => setTrackFormData({ ...trackFormData, genre: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Synthwave / Electronic"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Audio Stream URL * (Full Recording)</label>
                <input
                  type="url"
                  required
                  value={trackFormData.audio}
                  onChange={(e) => setTrackFormData({ ...trackFormData, audio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Cover Artwork URL</label>
                <input
                  type="url"
                  value={trackFormData.image}
                  onChange={(e) => setTrackFormData({ ...trackFormData, image: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">BPM (40-240)</label>
                  <input
                    type="number"
                    min="40"
                    max="240"
                    value={trackFormData.bpm}
                    onChange={(e) => setTrackFormData({ ...trackFormData, bpm: parseInt(e.target.value, 10) || 120 })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Camelot Key</label>
                  <input
                    type="text"
                    value={trackFormData.key}
                    onChange={(e) => setTrackFormData({ ...trackFormData, key: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-bold"
                    placeholder="8A, 11B, etc."
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Energy (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={trackFormData.energy}
                    onChange={(e) => setTrackFormData({ ...trackFormData, energy: parseInt(e.target.value, 10) || 75 })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Duration (sec)</label>
                  <input
                    type="number"
                    min="1"
                    value={trackFormData.duration}
                    onChange={(e) => setTrackFormData({ ...trackFormData, duration: parseInt(e.target.value, 10) || 180 })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Provider Attribution</label>
                <select
                  value={trackFormData.provider}
                  onChange={(e) => setTrackFormData({ ...trackFormData, provider: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="jamendo">Jamendo (Full Length Creative Commons)</option>
                  <option value="audius">Audius (Decentralized Full Stream)</option>
                  <option value="archive">Internet Archive (Public Domain)</option>
                  <option value="apple">Apple Music (Preview)</option>
                  <option value="local">Local Audio Fixture</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddTrackModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold transition-colors cursor-pointer shadow-lg"
                >
                  {editingTrack ? 'Save Changes' : 'Add Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
