export type UserAccountRole = 'user' | 'dj' | 'moderator' | 'admin';
export type UserAccountStatus = 'active' | 'suspended' | 'banned';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserAccountRole;
  status: UserAccountStatus;
  createdAt: number;
  lastActiveAt: number;
  roomsHostedCount: number;
  playlistsCount: number;
}

export type ReportedItemType = 'chat_message' | 'room' | 'track' | 'user';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface ReportedContent {
  id: string;
  type: ReportedItemType;
  targetId: string;
  targetName: string;
  reportedBy: string;
  reportedByEmail?: string;
  reason: string;
  details?: string;
  timestamp: string;
  createdAt: number;
  status: ReportStatus;
  moderatorNotes?: string;
  resolvedBy?: string;
  resolvedAt?: number;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsersToday: number;
  totalRooms: number;
  liveRoomsCount: number;
  totalPlaylists: number;
  totalTracksPlayed: number;
  totalReports: number;
  pendingReports: number;
  serverStatus: 'healthy' | 'degraded' | 'maintenance';
  uptimeSeconds: number;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  targetType: string;
  timestamp: string;
  createdAt: number;
  details: string;
}
