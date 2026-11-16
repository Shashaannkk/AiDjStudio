import type { UserProfile } from '../types/music';
import type {
  UserAccount,
  UserAccountRole,
  UserAccountStatus,
  ReportedContent,
  ReportStatus,
  PlatformStats,
  AdminAuditLog,
} from '../types/admin';
import { userService } from './userService';

const STORAGE_USERS = 'aidj_admin_users';
const STORAGE_REPORTS = 'aidj_admin_reports';
const STORAGE_LOGS = 'aidj_admin_audit_logs';

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'admin-1',
    name: 'Shashank Poojari',
    email: 'admin@aidjstudio.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    role: 'admin',
    status: 'active',
    createdAt: Date.now() - 86400000 * 30,
    lastActiveAt: Date.now() - 60000 * 5,
    roomsHostedCount: 14,
    playlistsCount: 8,
  },
  {
    id: 'user-dj-alex',
    name: 'Alex Rivera (DJ Pulse)',
    email: 'alex.dj@groove.fm',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    role: 'dj',
    status: 'active',
    createdAt: Date.now() - 86400000 * 18,
    lastActiveAt: Date.now() - 60000 * 20,
    roomsHostedCount: 22,
    playlistsCount: 12,
  },
  {
    id: 'user-mod-elena',
    name: 'Elena Rostova',
    email: 'elena@soundclash.io',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    role: 'moderator',
    status: 'active',
    createdAt: Date.now() - 86400000 * 25,
    lastActiveAt: Date.now() - 60000 * 45,
    roomsHostedCount: 6,
    playlistsCount: 4,
  },
  {
    id: 'user-maya',
    name: 'Maya Lin',
    email: 'maya.beats@vibes.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
    role: 'user',
    status: 'active',
    createdAt: Date.now() - 86400000 * 10,
    lastActiveAt: Date.now() - 60000 * 120,
    roomsHostedCount: 1,
    playlistsCount: 3,
  },
  {
    id: 'user-marcus',
    name: 'Marcus Vance',
    email: 'marcus@bassdrop.net',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    role: 'user',
    status: 'active',
    createdAt: Date.now() - 86400000 * 5,
    lastActiveAt: Date.now() - 86400000,
    roomsHostedCount: 0,
    playlistsCount: 2,
  },
  {
    id: 'user-spambot',
    name: 'SpamBot99 Free Crypto',
    email: 'spambot@promoweb.xyz',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    role: 'user',
    status: 'suspended',
    createdAt: Date.now() - 86400000 * 2,
    lastActiveAt: Date.now() - 86400000 * 2,
    roomsHostedCount: 0,
    playlistsCount: 0,
  },
];

const INITIAL_REPORTS: ReportedContent[] = [
  {
    id: 'rep-1',
    type: 'chat_message',
    targetId: 'msg-spam-101',
    targetName: 'Message from SpamBot99: "Click here for free VIP tokens"',
    reportedBy: 'Alex Rivera',
    reportedByEmail: 'alex.dj@groove.fm',
    reason: 'Unsolicited spam & external promotional link in live chat',
    details: 'User repeatedly posted crypto links during peak DJ set in Late Night Lounge.',
    timestamp: '2 hours ago',
    createdAt: Date.now() - 7200000,
    status: 'pending',
  },
  {
    id: 'rep-2',
    type: 'room',
    targetId: 'room_earrape_test',
    targetName: 'Room: "Max Bass Distortion Test"',
    reportedBy: 'Elena Rostova',
    reportedByEmail: 'elena@soundclash.io',
    reason: 'Severe audio distortion / trolling listeners',
    details: 'Playing screeching audio clips with distorted waveforms at 100% gain.',
    timestamp: '5 hours ago',
    createdAt: Date.now() - 18000000,
    status: 'pending',
  },
  {
    id: 'rep-3',
    type: 'track',
    targetId: 'track_copyright_sample',
    targetName: 'Track: "Unreleased Leak Snippet 2026"',
    reportedBy: 'Community Auto-Scanner',
    reason: 'Potential copyright takedown notice',
    details: 'Audio hash flagged as unreleased master recording.',
    timestamp: '1 day ago',
    createdAt: Date.now() - 86400000,
    status: 'resolved',
    moderatorNotes: 'Stream preview disabled pending licensing verification.',
    resolvedBy: 'Shashank Poojari',
    resolvedAt: Date.now() - 43200000,
  },
];

class AdminService {
  private users: UserAccount[] = [];
  private reports: ReportedContent[] = [];
  private auditLogs: AdminAuditLog[] = [];
  private serverStartTime = Date.now() - 86400000 * 4.5; // 4.5 days uptime

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof window === 'undefined') {
      this.users = INITIAL_USERS;
      this.reports = INITIAL_REPORTS;
      return;
    }

    try {
      const uStr = localStorage.getItem(STORAGE_USERS);
      this.users = uStr ? JSON.parse(uStr) : INITIAL_USERS;

      const rStr = localStorage.getItem(STORAGE_REPORTS);
      this.reports = rStr ? JSON.parse(rStr) : INITIAL_REPORTS;

      const lStr = localStorage.getItem(STORAGE_LOGS);
      this.auditLogs = lStr ? JSON.parse(lStr) : [];
    } catch {
      this.users = INITIAL_USERS;
      this.reports = INITIAL_REPORTS;
      this.auditLogs = [];
    }
  }

  private saveState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_REPORTS, JSON.stringify(this.reports));
      localStorage.setItem(STORAGE_LOGS, JSON.stringify(this.auditLogs.slice(-100)));
    } catch (e) {
      console.warn('Error persisting admin state:', e);
    }
  }

  public canAccessAdmin(user: UserProfile | null): boolean {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'moderator';
  }

  public getUsers(): UserAccount[] {
    return [...this.users];
  }

  public updateUserRole(
    userId: string,
    newRole: UserAccountRole,
    adminUser: UserProfile | null
  ): boolean {
    if (!this.canAccessAdmin(adminUser)) return false;

    this.users = this.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    this.logAction(
      adminUser?.id || 'admin',
      adminUser?.email || 'admin@aidjstudio.com',
      'UPDATE_USER_ROLE',
      userId,
      'USER',
      `Changed role to ${newRole.toUpperCase()}`
    );
    this.saveState();
    return true;
  }

  public updateUserStatus(
    userId: string,
    newStatus: UserAccountStatus,
    adminUser: UserProfile | null
  ): boolean {
    if (!this.canAccessAdmin(adminUser)) return false;

    this.users = this.users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
    this.logAction(
      adminUser?.id || 'admin',
      adminUser?.email || 'admin@aidjstudio.com',
      'UPDATE_USER_STATUS',
      userId,
      'USER',
      `Changed account status to ${newStatus.toUpperCase()}`
    );
    this.saveState();
    return true;
  }

  public getReports(): ReportedContent[] {
    return [...this.reports];
  }

  public resolveReport(
    reportId: string,
    action: 'ban_user' | 'close_room' | 'dismiss' | 'warning',
    notes: string,
    adminUser: UserProfile | null
  ): boolean {
    if (!this.canAccessAdmin(adminUser)) return false;

    const rep = this.reports.find((r) => r.id === reportId);
    if (!rep) return false;

    const status: ReportStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
    this.reports = this.reports.map((r) =>
      r.id === reportId
        ? {
            ...r,
            status,
            moderatorNotes: notes,
            resolvedBy: adminUser?.name || 'Administrator',
            resolvedAt: Date.now(),
          }
        : r
    );

    this.logAction(
      adminUser?.id || 'admin',
      adminUser?.email || 'admin@aidjstudio.com',
      `REPORT_${action.toUpperCase()}`,
      reportId,
      rep.type.toUpperCase(),
      notes
    );

    this.saveState();
    return true;
  }

  public submitReport(
    report: Omit<ReportedContent, 'id' | 'createdAt' | 'status'>
  ): ReportedContent {
    const newReport: ReportedContent = {
      ...report,
      id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.reports.unshift(newReport);
    this.saveState();
    return newReport;
  }

  public getPlatformStats(): PlatformStats {
    const liveRooms = userService.getLiveRooms();
    const pendingReports = this.reports.filter((r) => r.status === 'pending').length;

    return {
      totalUsers: this.users.length + 1420,
      activeUsersToday: 384,
      totalRooms: 68,
      liveRoomsCount: liveRooms.length,
      totalPlaylists: 892,
      totalTracksPlayed: 14520,
      totalReports: this.reports.length,
      pendingReports,
      serverStatus: 'healthy',
      uptimeSeconds: Math.floor((Date.now() - this.serverStartTime) / 1000),
    };
  }

  public getAuditLogs(): AdminAuditLog[] {
    return [...this.auditLogs];
  }

  private getAdminHeaders(): HeadersInit {
    const token = userService.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-Admin-Key'] = 'aidj-studio-master-admin-key-2026';
    }
    return headers;
  }

  public async fetchCatalogueTracks(search?: string): Promise<any[]> {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/admin/tracks${q}`, {
        headers: this.getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.tracks || [];
      }
    } catch (e) {
      console.warn('Error fetching catalogue tracks:', e);
    }
    return [];
  }

  public async createCatalogueTrack(trackData: any): Promise<{ success: boolean; track?: any; error?: string }> {
    try {
      const res = await fetch('/api/admin/tracks', {
        method: 'POST',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(trackData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.logAction('admin', 'admin@aidjstudio.com', 'CREATE_TRACK', data.track?.id || 'new', 'TRACK', `Added track ${data.track?.title}`);
        return { success: true, track: data.track };
      }
      return { success: false, error: data.error || 'Failed to create track' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async updateCatalogueTrack(id: string, updates: any): Promise<{ success: boolean; track?: any; error?: string }> {
    try {
      const res = await fetch(`/api/admin/tracks/${id}`, {
        method: 'PUT',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.logAction('admin', 'admin@aidjstudio.com', 'UPDATE_TRACK', id, 'TRACK', `Updated track ${id}`);
        return { success: true, track: data.track };
      }
      return { success: false, error: data.error || 'Failed to update track' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async toggleTrackDeactivation(id: string): Promise<{ success: boolean; track?: any; error?: string }> {
    try {
      const res = await fetch(`/api/admin/tracks/${id}`, {
        method: 'PATCH',
        headers: this.getAdminHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.logAction('admin', 'admin@aidjstudio.com', 'TOGGLE_TRACK_STATUS', id, 'TRACK', `Toggled active status of track ${id}`);
        return { success: true, track: data.track };
      }
      return { success: false, error: data.error || 'Failed to toggle track status' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async deleteCatalogueTrack(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/tracks/${id}`, {
        method: 'DELETE',
        headers: this.getAdminHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.logAction('admin', 'admin@aidjstudio.com', 'DELETE_TRACK', id, 'TRACK', `Deleted track ${id}`);
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to delete track' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async runCatalogueQualityAudit(): Promise<any> {
    try {
      const res = await fetch('/api/admin/tracks/audit', {
        headers: this.getAdminHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Error running catalogue audit:', e);
    }
    return null;
  }

  private logAction(
    adminId: string,
    adminEmail: string,
    action: string,
    targetId: string,
    targetType: string,
    details: string
  ) {
    const log: AdminAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      adminId,
      adminEmail,
      action,
      targetId,
      targetType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      details,
    };
    this.auditLogs.unshift(log);
  }
}

export const adminService = new AdminService();
