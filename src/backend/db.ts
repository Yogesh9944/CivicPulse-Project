import fs from 'fs';
import path from 'path';

// Database file path
const DB_FILE = path.join(process.cwd(), 'db.json');

// Interface definitions
export interface User {
  _id: string;
  name: string;
  email: string;
  password?: string;
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
  images: string[]; // Base64 strings
  aiAnalysis: {
    category: string;
    severity: string;
    description: string;
    confidence: number;
    tags: string[];
    urgency_reason: string;
  };
  reportedBy: string; // User ID
  upvotes: string[]; // User IDs
  verifiedBy: string[]; // User IDs
  isVerified: boolean;
  isAnonymous: boolean;
  comments: Comment[];
  statusHistory: StatusHistory[];
  isEscalated: boolean;
  reactions?: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
}

// Global data store structure
interface DataStore {
  users: User[];
  issues: Issue[];
  notifications: Notification[];
}

// In-memory data store with file sync
class LocalDatabase {
  private data: DataStore = { users: [], issues: [], notifications: [] };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        // Ensure collections exist
        if (!this.data.users) this.data.users = [];
        if (!this.data.issues) this.data.issues = [];
        if (!this.data.notifications) this.data.notifications = [];
      } else {
        this.data = { users: [], issues: [], notifications: [] };
        this.save();
      }
    } catch (e) {
      console.error('Error loading database:', e);
      this.data = { users: [], issues: [], notifications: [] };
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  // Collection methods
  public get users() {
    return {
      find: (filter?: Partial<User>) => {
        this.load();
        if (!filter) return this.data.users;
        return this.data.users.filter(u => {
          return Object.entries(filter).every(([key, val]) => (u as any)[key] === val);
        });
      },
      findOne: (filter: Partial<User>) => {
        this.load();
        return this.data.users.find(u => {
          return Object.entries(filter).every(([key, val]) => (u as any)[key] === val);
        }) || null;
      },
      findById: (id: string) => {
        this.load();
        return this.data.users.find(u => u._id === id) || null;
      },
      create: (user: Omit<User, '_id' | 'createdAt'> & { _id?: string; createdAt?: string }) => {
        this.load();
        const newUser: User = {
          _id: user._id || Math.random().toString(36).substr(2, 9),
          name: user.name,
          email: user.email,
          password: user.password,
          xp: user.xp ?? 0,
          level: user.level ?? 'Citizen',
          badges: user.badges ?? [],
          issuesReported: user.issuesReported ?? 0,
          issuesVerified: user.issuesVerified ?? 0,
          createdAt: user.createdAt || new Date().toISOString(),
        };
        this.data.users.push(newUser);
        this.save();
        return newUser;
      },
      updateOne: (id: string, update: Partial<User>) => {
        this.load();
        const index = this.data.users.findIndex(u => u._id === id);
        if (index !== -1) {
          this.data.users[index] = { ...this.data.users[index], ...update };
          this.save();
          return this.data.users[index];
        }
        return null;
      }
    };
  }

  public get issues() {
    return {
      find: (filterFn?: (issue: Issue) => boolean) => {
        this.load();
        if (!filterFn) return this.data.issues;
        return this.data.issues.filter(filterFn);
      },
      findOne: (filterFn: (issue: Issue) => boolean) => {
        this.load();
        return this.data.issues.find(filterFn) || null;
      },
      findById: (id: string) => {
        this.load();
        return this.data.issues.find(i => i._id === id) || null;
      },
      create: (issue: Omit<Issue, '_id' | 'createdAt' | 'updatedAt'> & { _id?: string; createdAt?: string; updatedAt?: string }) => {
        this.load();
        const newIssue: Issue = {
          _id: issue._id || Math.random().toString(36).substr(2, 9),
          title: issue.title,
          description: issue.description,
          category: issue.category,
          severity: issue.severity,
          status: issue.status ?? 'Open',
          location: issue.location,
          images: issue.images ?? [],
          aiAnalysis: issue.aiAnalysis,
          reportedBy: issue.reportedBy,
          upvotes: issue.upvotes ?? [],
          verifiedBy: issue.verifiedBy ?? [],
          isVerified: issue.isVerified ?? false,
          isAnonymous: issue.isAnonymous ?? false,
          comments: issue.comments ?? [],
          statusHistory: issue.statusHistory ?? [],
          isEscalated: issue.isEscalated ?? false,
          reactions: issue.reactions ?? {},
          createdAt: issue.createdAt || new Date().toISOString(),
          updatedAt: issue.updatedAt || new Date().toISOString(),
        };
        this.data.issues.push(newIssue);
        this.save();
        return newIssue;
      },
      updateOne: (id: string, update: Partial<Issue> | ((issue: Issue) => void)) => {
        this.load();
        const index = this.data.issues.findIndex(i => i._id === id);
        if (index !== -1) {
          if (typeof update === 'function') {
            update(this.data.issues[index]);
          } else {
            this.data.issues[index] = { 
              ...this.data.issues[index], 
              ...update,
              updatedAt: new Date().toISOString()
            };
          }
          this.save();
          return this.data.issues[index];
        }
        return null;
      }
    };
  }

  public get notifications() {
    return {
      find: (filterFn?: (notif: Notification) => boolean) => {
        this.load();
        if (!filterFn) return this.data.notifications;
        return this.data.notifications.filter(filterFn);
      },
      create: (notif: Omit<Notification, '_id' | 'createdAt'> & { _id?: string; createdAt?: string }) => {
        this.load();
        const newNotif: Notification = {
          _id: notif._id || Math.random().toString(36).substr(2, 9),
          userId: notif.userId,
          text: notif.text,
          isRead: notif.isRead ?? false,
          createdAt: notif.createdAt || new Date().toISOString(),
        };
        this.data.notifications.push(newNotif);
        this.save();
        return newNotif;
      },
      updateMany: (filterFn: (notif: Notification) => boolean, update: Partial<Notification>) => {
        this.load();
        let updatedCount = 0;
        this.data.notifications.forEach(n => {
          if (filterFn(n)) {
            Object.assign(n, update);
            updatedCount++;
          }
        });
        if (updatedCount > 0) {
          this.save();
        }
        return updatedCount;
      }
    };
  }

  public clear() {
    this.data = { users: [], issues: [], notifications: [] };
    this.save();
  }

  public isEmpty() {
    this.load();
    return this.data.users.length === 0 && this.data.issues.length === 0;
  }
}

export const db = new LocalDatabase();
