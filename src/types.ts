export interface User {
  _id: string;
  name: string;
  email: string;
  xp: number;
  level: 'Citizen' | 'Guardian' | 'Champion' | 'Legend';
  badges: Array<{ name: string; icon: string; earnedAt: string }>;
  issuesReported: number;
  issuesVerified: number;
  createdAt: string;
}

export interface Comment {
  _id: string;
  userId: string;
  userName?: string;
  userLevel?: 'Citizen' | 'Guardian' | 'Champion' | 'Legend';
  text: string;
  createdAt: string;
}

export interface StatusHistory {
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  note: string;
  createdAt: string;
}

export interface Issue {
  _id: string;
  title: string;
  description: string;
  category: 'Pothole' | 'Street Light' | 'Water Leakage' | 'Garbage' | 'Road Damage' | 'Encroachment' | 'Noise Pollution' | 'Other';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images: string[];
  aiAnalysis: {
    category: string;
    severity: string;
    description: string;
    confidence: number;
    tags: string[];
    urgency_reason: string;
  };
  reportedBy: string;
  reportedByName?: string;
  reportedByLevel?: 'Citizen' | 'Guardian' | 'Champion' | 'Legend';
  upvotes: string[];
  verifiedBy: string[];
  isVerified: boolean;
  isAnonymous: boolean;
  comments: Comment[];
  statusHistory: StatusHistory[];
  isEscalated: boolean;
  reactions?: Record<string, string[]>;
  department?: string;
  resolvedImage?: string;
  officialResponse?: string;
  assignedWorker?: string;
  officialCommands?: string;
  slaDeadline?: string;
  createdAt: string;
  updatedAt: string;
  distance?: number;
}

export interface Notification {
  _id: string;
  userId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export interface CategoryStat {
  name: string;
  value: number;
}

export interface SeverityStat {
  name: string;
  value: number;
}

export interface DayStat {
  date: string;
  count: number;
  resolved: number;
}

export interface Hotspot {
  lat: number;
  lng: number;
  count: number;
  category: string;
  address: string;
}

export interface DashboardStats {
  totalIssues: number;
  resolvedIssues: number;
  avgResolutionTime: number;
  activeUsers: number;
  issuesByCategory: CategoryStat[];
  issuesBySeverity: SeverityStat[];
  issuesByDay: DayStat[];
  hotspots: Hotspot[];
}

export interface Insight {
  title: string;
  insight: string;
  priority: 'High' | 'Medium' | 'Low';
}
