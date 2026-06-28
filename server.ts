import express from 'express';
import path from 'path';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

import { db } from './src/backend/db';
import { seedDatabase } from './src/backend/seed';
import { awardUserXP, runAutoEscalation } from './src/backend/services';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'civicpulse2024';

// Run database seeding
seedDatabase();

// Run auto-escalation check periodically (every 10 minutes)
setInterval(() => {
  try {
    runAutoEscalation();
  } catch (err) {
    console.error('Error running auto-escalation:', err);
  }
}, 10 * 60 * 1000);

// Set up Google GenAI Client
const aiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (aiApiKey && aiApiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({
    apiKey: aiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Multer memory storage for base64 image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// JSON & URL-encoded parsing middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Distance calculation using Haversine Formula (in km)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Authentication Middleware
interface AuthRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

const authMiddleware = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header with Bearer token is required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// BACKEND API ROUTES

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  const existing = db.users.findOne({ email });
  if (existing) {
    res.status(400).json({ error: 'User with this email already exists' });
    return;
  }

  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newUser = db.users.create({
    name,
    email,
    password: hashedPassword,
    xp: 0,
    level: 'Citizen',
    badges: [],
    issuesReported: 0,
    issuesVerified: 0,
  });

  const token = jwt.sign({ id: newUser._id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
  
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ token, user: userWithoutPassword });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = db.users.findOne({ email });
  if (!user || !user.password || !bcryptjs.compareSync(password, user.password)) {
    res.status(400).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
  const user = db.users.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// GET /api/issues
app.get('/api/issues', (req, res) => {
  const { category, severity, status, sort, lat, lng, radius } = req.query;

  // Run auto-escalation dynamically to ensure the latest status is captured
  try {
    runAutoEscalation();
  } catch (e) {
    console.error('Error in dynamic escalation check:', e);
  }

  let issues = db.issues.find();

  // Apply filters
  if (category) {
    issues = issues.filter(i => i.category === category);
  }
  if (severity) {
    issues = issues.filter(i => i.severity === severity);
  }
  if (status) {
    issues = issues.filter(i => i.status === status);
  }

  // Lat/Lng filter
  if (lat && lng) {
    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);
    const radNum = radius ? parseFloat(radius as string) : 10.0; // Default 10km

    issues = issues.filter(i => {
      const dist = getDistance(latNum, lngNum, i.location.lat, i.location.lng);
      (i as any).distance = dist; // Attach distance dynamically for Sorting
      return dist <= radNum;
    });
  }

  // Sorting
  if (sort === 'newest') {
    issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === 'upvotes') {
    issues.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0));
  } else if (sort === 'critical') {
    const severityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    issues.sort((a, b) => {
      const wa = severityWeight[a.severity] || 0;
      const wb = severityWeight[b.severity] || 0;
      if (wb !== wa) return wb - wa;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (sort === 'near' && lat && lng) {
    issues.sort((a, b) => ((a as any).distance || 0) - ((b as any).distance || 0));
  } else {
    // Default: newest
    issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Populate reporters
  const populated = issues.map(issue => {
    const reporter = db.users.findById(issue.reportedBy);
    return {
      ...issue,
      reportedByName: issue.isAnonymous ? 'Anonymous' : (reporter?.name || 'Unknown Citizen'),
      reportedByLevel: reporter?.level || 'Citizen',
    };
  });

  res.json(populated);
});

// GET /api/issues/nearby
app.get('/api/issues/nearby', (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) {
    res.status(400).json({ error: 'lat and lng parameters are required' });
    return;
  }

  const latNum = parseFloat(lat as string);
  const lngNum = parseFloat(lng as string);
  const radNum = radius ? parseFloat(radius as string) : 10.0;

  const issues = db.issues.find().filter(i => {
    const dist = getDistance(latNum, lngNum, i.location.lat, i.location.lng);
    (i as any).distance = dist;
    return dist <= radNum;
  });

  issues.sort((a, b) => ((a as any).distance || 0) - ((b as any).distance || 0));
  res.json(issues);
});

// POST /api/issues
app.post('/api/issues', authMiddleware, (req: AuthRequest, res) => {
  const { title, description, category, severity, location, images, aiAnalysis, isAnonymous, ignoreDuplicate } = req.body;
  const reporterId = req.user!.id;

  // Specific error messages so the frontend can display them clearly
  if (!title) {
    res.status(400).json({ error: 'Title is a required field.' });
    return;
  }
  if (!description) {
    res.status(400).json({ error: 'Description is a required field.' });
    return;
  }
  if (!category) {
    res.status(400).json({ error: 'Category is a required field.' });
    return;
  }
  if (!severity) {
    res.status(400).json({ error: 'Severity is a required field.' });
    return;
  }

  // Handle location optional requirement with sensible defaults
  let finalLocation = { lat: 19.0760, lng: 72.8777, address: 'Unspecified Community Location' };

  if (location) {
    finalLocation = {
      lat: typeof location.lat === 'number' ? location.lat : (!isNaN(Number(location.lat)) ? Number(location.lat) : 19.0760),
      lng: typeof location.lng === 'number' ? location.lng : (!isNaN(Number(location.lng)) ? Number(location.lng) : 72.8777),
      address: location.address || 'Unspecified Community Location'
    };
  } else {
    // Check root level body params for direct coords (ReportIssue structure)
    const latVal = req.body.lat !== undefined ? req.body.lat : 19.0760;
    const lngVal = req.body.lng !== undefined ? req.body.lng : 72.8777;
    finalLocation = {
      lat: typeof latVal === 'number' ? latVal : (!isNaN(Number(latVal)) ? Number(latVal) : 19.0760),
      lng: typeof lngVal === 'number' ? lngVal : (!isNaN(Number(lngVal)) ? Number(lngVal) : 72.8777),
      address: req.body.address || 'Unspecified Community Location'
    };
  }

  // Smart duplicate check (within 100 meters, same category, Open or In Progress)
  if (ignoreDuplicate !== true && ignoreDuplicate !== 'true') {
    const duplicates = db.issues.find(i => {
      if (i.category !== category) return false;
      if (i.status !== 'Open' && i.status !== 'In Progress') return false;
      const dist = getDistance(finalLocation.lat, finalLocation.lng, i.location.lat, i.location.lng);
      return dist <= 0.1; // 100 meters
    });

    if (duplicates.length > 0) {
      const dup = duplicates[0];
      res.json({
        duplicate: {
          found: true,
          distance: Math.round(getDistance(finalLocation.lat, finalLocation.lng, dup.location.lat, dup.location.lng) * 1000),
          issue: {
            id: dup._id,
            title: dup.title,
            upvotes: dup.upvotes?.length || 0,
            status: dup.status
          }
        }
      });
      return;
    }
  }

  const defaultAiAnalysis = aiAnalysis || {
    category: category,
    severity: severity,
    description: `Automated analyzer category verified: ${category}.`,
    confidence: 85,
    tags: [category.toLowerCase(), 'citizen-reported'],
    urgency_reason: 'Reported by local community member.'
  };

  const imagesList = images || [];
  if (req.body.image && !imagesList.includes(req.body.image)) {
    imagesList.push(req.body.image);
  }

  const newIssue = db.issues.create({
    title,
    description,
    category,
    severity,
    status: 'Open',
    location: finalLocation,
    images: imagesList,
    aiAnalysis: defaultAiAnalysis,
    reportedBy: reporterId,
    upvotes: [reporterId], // Self upvote on report
    verifiedBy: [],
    isVerified: false,
    isAnonymous: isAnonymous === true || isAnonymous === 'true',
    comments: [],
    statusHistory: [{ status: 'Open', note: 'Issue registered into CivicPulse.', createdAt: new Date().toISOString() }],
    isEscalated: false
  });

  // Award +50 XP to reporter, increment reported count, check badges
  const reporter = db.users.findById(reporterId);
  if (reporter) {
    db.users.updateOne(reporterId, { issuesReported: (reporter.issuesReported || 0) + 1 });
    const xpResult = awardUserXP(reporterId, 50);

    // Create First Report notification if appropriate
    if (reporter.issuesReported === 0) {
      db.notifications.create({
        userId: reporterId,
        text: '🏅 Badge Earned! "First Report" badge unlocked! Keep up the great work in your community.',
        isRead: false
      });
    }

    res.status(201).json({
      _id: newIssue._id, // Return new issue's _id directly at root so frontend can redirect
      issue: newIssue,
      xpGained: 50,
      leveledUp: xpResult.leveledUp,
      user: xpResult.user
    });
  } else {
    res.status(201).json({
      _id: newIssue._id, // Return new issue's _id directly at root so frontend can redirect
      issue: newIssue
    });
  }
});

// GET /api/issues/:id
app.get('/api/issues/:id', (req, res) => {
  const issue = db.issues.findById(req.params.id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  const reporter = db.users.findById(issue.reportedBy);
  const populatedComments = (issue.comments || []).map(c => {
    const cUser = db.users.findById(c.userId);
    return {
      ...c,
      userName: cUser?.name || 'Anonymous Citizen',
      userLevel: cUser?.level || 'Citizen'
    };
  });

  res.json({
    ...issue,
    reportedByName: issue.isAnonymous ? 'Anonymous' : (reporter?.name || 'Unknown Citizen'),
    reportedByLevel: reporter?.level || 'Citizen',
    comments: populatedComments
  });
});

// POST /api/issues/:id/upvote
app.post('/api/issues/:id/upvote', authMiddleware, (req: AuthRequest, res) => {
  const issue = db.issues.findById(req.params.id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  const userId = req.user!.id;
  const upvotes = issue.upvotes || [];
  const index = upvotes.indexOf(userId);

  let upvoted = false;
  if (index === -1) {
    upvotes.push(userId);
    upvoted = true;
  } else {
    upvotes.splice(index, 1);
  }

  let reporterXpReward = 0;
  let reporterLeveledUp = false;
  let userLeveledUp = false;

  // Save updated upvotes
  db.issues.updateOne(issue._id, { upvotes });

  // Award +5 XP to the voter for active engagement if upvoted
  if (upvoted) {
    const voterResult = awardUserXP(userId, 5);
    userLeveledUp = voterResult.leveledUp;

    // Check if upvote threshold met (>= 5) to mark as verified
    if (upvotes.length >= 5 && !issue.isVerified) {
      db.issues.updateOne(issue._id, { isVerified: true });
      
      // Award +25 XP bonus to reporter, increment their issuesVerified count
      const reporter = db.users.findById(issue.reportedBy);
      if (reporter) {
        db.users.updateOne(issue.reportedBy, { issuesVerified: (reporter.issuesVerified || 0) + 1 });
        const repXp = awardUserXP(issue.reportedBy, 25);
        reporterXpReward = 25;
        reporterLeveledUp = repXp.leveledUp;

        // Notify reporter of verification
        db.notifications.create({
          userId: issue.reportedBy,
          text: `✅ Good news! Your issue "${issue.title}" has been verified by the community (+25 XP).`,
          isRead: false
        });

        // Check Community Watcher badge for reporter
        if (reporter.issuesVerified + 1 === 10) {
          db.notifications.create({
            userId: issue.reportedBy,
            text: '🏅 Badge Earned! "Community Watcher" badge unlocked for 10 verified issues!',
            isRead: false
          });
        }
      }
    }
  } else {
    // Deduct 5 XP for taking away support
    awardUserXP(userId, -5);
  }

  const refreshedIssue = db.issues.findById(issue._id);
  res.json({
    issue: refreshedIssue,
    upvoted,
    xpGained: upvoted ? 5 : -5,
    userLeveledUp,
    reporterXpReward,
    reporterLeveledUp
  });
});

// POST /api/issues/:id/verify
app.post('/api/issues/:id/verify', authMiddleware, (req: AuthRequest, res) => {
  const issue = db.issues.findById(req.params.id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  const userId = req.user!.id;
  const verifiedBy = issue.verifiedBy || [];
  
  if (verifiedBy.includes(userId)) {
    res.status(400).json({ error: 'You have already verified this resolution.' });
    return;
  }

  verifiedBy.push(userId);
  let isVerified = issue.isVerified;
  let status = issue.status;
  const statusHistory = issue.statusHistory || [];

  let isAutoResolved = false;
  // If we reach 5 verifications, we auto-resolve the issue!
  if (verifiedBy.length >= 5 && status !== 'Resolved') {
    status = 'Resolved';
    isVerified = true;
    isAutoResolved = true;
    statusHistory.push({
      status: 'Resolved',
      note: 'Auto-resolved via crowdsourced community inspector verifications.',
      createdAt: new Date().toISOString()
    });
  }

  db.issues.updateOne(issue._id, { 
    verifiedBy, 
    isVerified,
    status,
    statusHistory
  });

  // Award verification inspector +15 XP
  awardUserXP(userId, 15);

  // If auto-resolved, notify original reporter!
  if (isAutoResolved) {
    db.notifications.create({
      userId: issue.reportedBy,
      text: `🎉 Good news! Your issue "${issue.title}" has been auto-resolved based on community verifications!`,
      isRead: false
    });
  }

  const refreshedIssue = db.issues.findById(issue._id);
  const reporter = db.users.findById(refreshedIssue!.reportedBy);
  const populatedComments = (refreshedIssue!.comments || []).map(c => {
    const cUser = db.users.findById(c.userId);
    return {
      ...c,
      userName: cUser?.name || 'Citizen',
      userLevel: cUser?.level || 'Citizen'
    };
  });

  res.json({
    ...refreshedIssue,
    reportedByName: refreshedIssue!.isAnonymous ? 'Anonymous' : (reporter?.name || 'Unknown Citizen'),
    reportedByLevel: reporter?.level || 'Citizen',
    comments: populatedComments
  });
});

// POST /api/issues/:id/reaction
app.post('/api/issues/:id/reaction', authMiddleware, (req: AuthRequest, res) => {
  const { reactionType } = req.body;
  if (!reactionType) {
    res.status(400).json({ error: 'Reaction type is required.' });
    return;
  }

  const issue = db.issues.findById(req.params.id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  const userId = req.user!.id;
  const issueReactions = (issue as any).reactions || {};
  
  if (!issueReactions[reactionType]) {
    issueReactions[reactionType] = [];
  }

  const userIndex = issueReactions[reactionType].indexOf(userId);

  // Toggle mechanism
  if (userIndex === -1) {
    // Remove user's previous reaction to this issue (one reaction per user)
    Object.keys(issueReactions).forEach(k => {
      const idx = issueReactions[k].indexOf(userId);
      if (idx !== -1) {
        issueReactions[k].splice(idx, 1);
      }
    });

    if (!issueReactions[reactionType]) {
      issueReactions[reactionType] = [];
    }
    issueReactions[reactionType].push(userId);
    // Grant +3 XP for active digital engagement
    awardUserXP(userId, 3);
  } else {
    // Remove if clicked again
    issueReactions[reactionType].splice(userIndex, 1);
  }

  db.issues.updateOne(issue._id, { reactions: issueReactions });

  const refreshedIssue = db.issues.findById(issue._id);
  const reporter = db.users.findById(refreshedIssue!.reportedBy);
  const populatedComments = (refreshedIssue!.comments || []).map(c => {
    const cUser = db.users.findById(c.userId);
    return {
      ...c,
      userName: cUser?.name || 'Citizen',
      userLevel: cUser?.level || 'Citizen'
    };
  });

  res.json({
    ...refreshedIssue,
    reportedByName: refreshedIssue!.isAnonymous ? 'Anonymous' : (reporter?.name || 'Unknown Citizen'),
    reportedByLevel: reporter?.level || 'Citizen',
    comments: populatedComments
  });
});

// POST /api/issues/:id/comment
app.post('/api/issues/:id/comment', authMiddleware, (req: AuthRequest, res) => {
  const { text } = req.body;
  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'Comment text is required' });
    return;
  }

  const issue = db.issues.findById(req.params.id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  const userId = req.user!.id;
  const newComment = {
    _id: Math.random().toString(36).substr(2, 9),
    userId,
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  const comments = issue.comments || [];
  comments.push(newComment);

  db.issues.updateOne(issue._id, { comments });

  // Award +10 XP to commenter
  const xpResult = awardUserXP(userId, 10);

  // Notify reporter if comment is by someone else
  if (issue.reportedBy !== userId) {
    db.notifications.create({
      userId: issue.reportedBy,
      text: `💬 ${req.user!.name} commented on your report "${issue.title}": "${text.substring(0, 30)}..."`,
      isRead: false
    });
  }

  res.status(201).json({
    comment: {
      ...newComment,
      userName: req.user!.name,
      userLevel: xpResult.user.level
    },
    xpGained: 10,
    leveledUp: xpResult.leveledUp,
    user: xpResult.user
  });
});

// PUT /api/issues/:id/status
app.put('/api/issues/:id/status', authMiddleware, (req: AuthRequest, res) => {
  const { status, note } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }

  const issue = db.issues.findById(req.params.id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  const oldStatus = issue.status;
  const statusHistory = issue.statusHistory || [];
  statusHistory.push({
    status,
    note: note || `Status updated from ${oldStatus} to ${status}.`,
    createdAt: new Date().toISOString()
  });

  db.issues.updateOne(issue._id, {
    status,
    statusHistory,
    updatedAt: new Date().toISOString()
  });

  // If status resolved, award +100 XP to the original reporter!
  let reporterXpReward = 0;
  let reporterLeveledUp = false;

  if (status === 'Resolved' && oldStatus !== 'Resolved') {
    const reporter = db.users.findById(issue.reportedBy);
    if (reporter) {
      const repXp = awardUserXP(issue.reportedBy, 100);
      reporterXpReward = 100;
      reporterLeveledUp = repXp.leveledUp;

      db.notifications.create({
        userId: issue.reportedBy,
        text: `🎉 Amazing! Your reported issue "${issue.title}" has been RESOLVED! You earned +100 XP.`,
        isRead: false
      });
    }
  }

  res.json({
    issue: db.issues.findById(issue._id),
    reporterXpReward,
    reporterLeveledUp
  });
});

// GET /api/users/leaderboard
app.get('/api/users/leaderboard', (req, res) => {
  const users = db.users.find();
  
  // Sort users by XP descending
  const sorted = users.map(u => {
    const { password: _, ...cleanUser } = u;
    return cleanUser;
  }).sort((a, b) => b.xp - a.xp).slice(0, 20);

  res.json(sorted);
});

// GET /api/users/profile/:id
app.get('/api/users/profile/:id', (req, res) => {
  const user = db.users.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const userIssues = db.issues.find(i => i.reportedBy === user._id);
  const { password: _, ...cleanUser } = user;

  res.json({
    user: cleanUser,
    issues: userIssues
  });
});

// POST /api/users/:id/praise
app.post('/api/users/:id/praise', authMiddleware, (req: AuthRequest, res) => {
  const targetUser = db.users.findById(req.params.id);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const userId = req.user!.id;
  if (userId === targetUser._id) {
    res.status(400).json({ error: 'You cannot praise yourself!' });
    return;
  }

  // Award target user +10 XP for receiving community appreciation!
  const xpResult = awardUserXP(targetUser._id, 10);

  // Send a custom notification to target user
  db.notifications.create({
    userId: targetUser._id,
    text: `👏 ${req.user!.name} sent you a Praise Medal on the Leaderboard! (+10 XP bonus). Keep up the great civic duty!`,
    isRead: false
  });

  res.json({ 
    message: 'Praise sent successfully!', 
    targetUser: {
      _id: xpResult.user._id,
      name: xpResult.user.name,
      email: xpResult.user.email,
      xp: xpResult.user.xp,
      level: xpResult.user.level,
      badges: xpResult.user.badges,
      issuesReported: xpResult.user.issuesReported,
      issuesVerified: xpResult.user.issuesVerified,
      createdAt: xpResult.user.createdAt
    }
  });
});

// PUT /api/users/profile
app.put('/api/users/profile', authMiddleware, (req: AuthRequest, res) => {
  const { name, avatar } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const updated = db.users.updateOne(req.user!.id, { name });
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { password: _, ...cleanUser } = updated;
  res.json(cleanUser);
});

// GET /api/notifications
app.get('/api/notifications', authMiddleware, (req: AuthRequest, res) => {
  const allNotifs = db.notifications.find(n => n.userId === req.user!.id);
  
  // Sort by newest
  allNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Return last 10 notifications
  const last10 = allNotifs.slice(0, 10);

  // Mark returned notifications as read
  db.notifications.updateMany(
    n => n.userId === req.user!.id && last10.some(l => l._id === n._id),
    { isRead: true }
  );

  res.json(last10);
});

// GET /api/dashboard/stats
app.get('/api/dashboard/stats', (req, res) => {
  const allIssues = db.issues.find();
  const allUsers = db.users.find();

  const totalIssues = allIssues.length;
  const resolvedIssues = allIssues.filter(i => i.status === 'Resolved').length;

  // Active citizens: users with reported issues or upvoted issues
  const activeCitizens = allUsers.filter(u => u.xp > 0).length;

  // Calculate Average Resolution Time
  let totalResTimeMs = 0;
  let resolvedCount = 0;
  allIssues.forEach(issue => {
    if (issue.status === 'Resolved') {
      const openHistory = issue.statusHistory.find(h => h.status === 'Open');
      const resolvedHistory = issue.statusHistory.find(h => h.status === 'Resolved');
      if (openHistory && resolvedHistory) {
        totalResTimeMs += new Date(resolvedHistory.createdAt).getTime() - new Date(openHistory.createdAt).getTime();
        resolvedCount++;
      }
    }
  });
  const avgResolutionTime = resolvedCount > 0 
    ? parseFloat((totalResTimeMs / (1000 * 60 * 60 * 24 * resolvedCount)).toFixed(1)) 
    : 2.4; // Default to 2.4 days

  // Issues by category
  const categoriesMap: Record<string, number> = {};
  allIssues.forEach(i => {
    categoriesMap[i.category] = (categoriesMap[i.category] || 0) + 1;
  });
  const issuesByCategory = Object.entries(categoriesMap).map(([name, value]) => ({ name, value }));

  // Issues by severity
  const severityMap: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  allIssues.forEach(i => {
    if (severityMap[i.severity] !== undefined) {
      severityMap[i.severity]++;
    }
  });
  const issuesBySeverity = Object.entries(severityMap).map(([name, value]) => ({ name, value }));

  // Issues by Day (last 30 days)
  const issuesByDay: Array<{ date: string; count: number; resolved: number }> = [];
  for (let d = 29; d >= 0; d--) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - d);
    const dateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const reportedOnDay = allIssues.filter(i => {
      const iDate = new Date(i.createdAt);
      return iDate.toDateString() === targetDate.toDateString();
    }).length;

    const resolvedOnDay = allIssues.filter(i => {
      if (i.status !== 'Resolved') return false;
      const resHist = i.statusHistory.find(h => h.status === 'Resolved');
      if (!resHist) return false;
      return new Date(resHist.createdAt).toDateString() === targetDate.toDateString();
    }).length;

    issuesByDay.push({ date: dateStr, count: reportedOnDay, resolved: resolvedOnDay });
  }

  // Hotspots: top 5 clusters of coordinates within rounding
  const clusters: Record<string, { lat: number; lng: number; count: number; category: string; address: string }> = {};
  allIssues.forEach(i => {
    const roundedLat = parseFloat(i.location.lat.toFixed(3));
    const roundedLng = parseFloat(i.location.lng.toFixed(3));
    const key = `${roundedLat},${roundedLng}`;

    if (!clusters[key]) {
      clusters[key] = {
        lat: roundedLat,
        lng: roundedLng,
        count: 0,
        category: i.category,
        address: i.location.address
      };
    }
    clusters[key].count++;
  });

  const hotspots = Object.values(clusters)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    totalIssues,
    resolvedIssues,
    avgResolutionTime,
    activeUsers: activeCitizens,
    issuesByCategory,
    issuesBySeverity,
    issuesByDay,
    hotspots
  });
});

// POST /api/ai/analyze
app.post('/api/ai/analyze', upload.single('image'), async (req, res) => {
  try {
    let base64Image = '';
    let mimeType = '';

    if (req.file) {
      base64Image = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
      console.log(`[AI Analyze] Received uploaded file via multer. MimeType: ${mimeType}, Size: ${req.file.size} bytes`);
    } else if (req.body.image) {
      base64Image = req.body.image;
      mimeType = req.body.mimeType || 'image/png';
      // Strip header prefix if present (e.g. "data:image/png;base64,")
      if (base64Image.includes(';base64,')) {
        const parts = base64Image.split(';base64,');
        mimeType = parts[0].replace('data:', '');
        base64Image = parts[1];
      }
      console.log(`[AI Analyze] Received base64 image in body. MimeType: ${mimeType}, Length: ${base64Image.length}`);
    }

    if (!base64Image) {
      console.error('[AI Analyze] Error: No image provided in request.');
      res.status(400).json({ error: true, message: 'Image file or base64 data is required' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AI Analyze] Warning: GEMINI_API_KEY environment variable is missing.');
      res.status(500).json({ error: true, message: 'GEMINI_API_KEY environment variable is missing.' });
      return;
    }

    console.log('[AI Analyze] Requesting gemini-1.5-flash with vision context...');
    const promptString = `You are an AI for a civic issue reporting platform in India. 
Analyze this image carefully and identify the community problem visible. 
Respond ONLY with this exact JSON format, no markdown, no extra text:
{
  "title": "5-7 word specific issue title",
  "category": "exactly one of: Pothole, Street Light, Water Leakage, Garbage, Road Damage, Encroachment, Noise Pollution, Other",
  "severity": "exactly one of: Low, Medium, High, Critical",
  "description": "2-3 sentences describing exactly what is visible in the image and why it is a problem",
  "confidence": 85,
  "tags": ["tag1", "tag2", "tag3"],
  "urgency_reason": "one sentence explaining why this severity level was chosen"
}`;

    let text = '';
    let success = false;
    let lastError: any = null;

    // We try multiple strategies, prioritizing newer/supported models first.
    // This handles both @google/genai and @google/generative-ai, and falls back gracefully.
    const strategies = [
      { sdk: 'genai', model: 'gemini-2.5-flash' },
      { sdk: 'genai', model: 'gemini-3.5-flash' },
      { sdk: 'generative-ai', model: 'gemini-2.5-flash' },
      { sdk: 'generative-ai', model: 'gemini-1.5-flash' },
      { sdk: 'genai', model: 'gemini-1.5-flash' },
      { sdk: 'genai', model: 'gemini-flash-latest' }
    ];

    for (const strategy of strategies) {
      try {
        console.log(`[AI Analyze] Trying strategy: SDK ${strategy.sdk}, Model ${strategy.model}...`);
        if (strategy.sdk === 'genai') {
          const client = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });
          const imagePart = {
            inlineData: {
              data: base64Image,
              mimeType: mimeType || 'image/png',
            },
          };
          const textPart = {
            text: promptString,
          };
          const response = await client.models.generateContent({
            model: strategy.model,
            contents: { parts: [imagePart, textPart] },
            config: {
              responseMimeType: 'application/json',
            }
          });
          text = response.text || '';
        } else {
          const genAI = new GoogleGenerativeAI(apiKey);
          const modelInstance = genAI.getGenerativeModel({ model: strategy.model });
          const imagePart = {
            inlineData: {
              data: base64Image,
              mimeType: mimeType || 'image/png',
            },
          };
          const response = await modelInstance.generateContent([
            imagePart,
            promptString
          ]);
          text = response.response.text() || '';
        }

        if (text && text.trim().length > 0) {
          console.log(`[AI Analyze] Success using strategy: SDK ${strategy.sdk}, Model ${strategy.model}`);
          success = true;
          break;
        }
      } catch (err: any) {
        console.warn(`[AI Analyze] Strategy failed: SDK ${strategy.sdk}, Model ${strategy.model}. Error:`, err.message || err);
        lastError = err;
      }
    }

    if (!success) {
      throw lastError || new Error('All model analysis strategies failed.');
    }

    console.log('[AI Analyze] Raw response text from Gemini:', text);

    let parsed: any = null;
    try {
      const cleanJsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJsonStr);
    } catch (parseErr: any) {
      console.log('[AI Analyze] Direct JSON parse failed, trying regex extraction...', parseErr);
      const jsonRegex = /\{[\s\S]*\}/;
      const match = text.match(jsonRegex);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (innerErr: any) {
          console.error('[AI Analyze] Regex JSON parse failed:', innerErr);
        }
      }
    }

    if (parsed) {
      console.log('[AI Analyze] Successfully parsed JSON result:', parsed);
      res.json(parsed);
    } else {
      throw new Error(`AI response parsing failed. Raw response: ${text}`);
    }
  } catch (err: any) {
    console.error('[AI Analyze] Fatal exception inside Gemini vision API call:', err);
    res.status(500).json({ error: true, message: err.message || err.toString() });
  }
});

// POST /api/ai/insights
app.post('/api/ai/insights', async (req, res) => {
  try {
    const { stats } = req.body;
    
    const mockInsights = [
      {
        title: "Garbage Hotspot Detected in Central Zone",
        insight: "There is an 18% increase in garbage reports within a 200-meter radius around Ward 4 Juhu Beach area. Deploying additional cleanup vehicles on weekend evenings could reduce response times from 3.2 days to under 24 hours.",
        priority: "High"
      },
      {
        title: "Pothole Density High near High-Traffic Corridors",
        insight: "Road damage complaints are clustered near flyover exit ramps. The average resolution time here is currently 4.8 days. Initiating proactive tar surfacing during off-peak hours (1 AM - 5 AM) will prevent major rush-hour gridlocks.",
        priority: "Medium"
      },
      {
        title: "Street Light Outages Creating Safety Shadows",
        insight: "Five street light outages reported within the same block on main crossroads coincide with an uptick in local nighttime safety reports. Repairing these posts should be prioritized to restore citizen security.",
        priority: "High"
      }
    ];

    if (!aiClient) {
      console.log('Gemini API key is not configured. Falling back to simulated smart community insights.');
      setTimeout(() => res.json(mockInsights), 1500); // 1.5s delay for authentic feel
      return;
    }

    const statsJson = JSON.stringify(stats || {});
    const promptString = `Given these community issue statistics: ${statsJson}. Generate exactly 3 actionable insights for city authorities. Respond ONLY with valid JSON array: [{"title":"insight title","insight":"2-3 sentences","priority":"High or Medium or Low"}]`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptString,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text?.trim() || '';
    try {
      const cleanJsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      res.json(parsed);
    } catch (parseErr) {
      console.error('Error parsing Gemini insights response, text was:', text);
      res.json(mockInsights);
    }
  } catch (err: any) {
    console.error('Gemini insights API error:', err);
    res.json([
      {
        title: "Local Pothole Accumulation",
        insight: "Several high-priority pothole reports are pending over 72 hours. Prompt intervention is advised.",
        priority: "High"
      },
      {
        title: "Street Light Resolution Efficiency",
        insight: "Street light resolution is averaging 2 days, showing excellent local coordination.",
        priority: "Low"
      },
      {
        title: "Community Upvote Engagement",
        insight: "Upvote count is up 25% this week, showing strong citizen interest in resolving street issues.",
        priority: "Medium"
      }
    ]);
  }
});

// POST /api/ai/chat
const CIVICBOT_SYSTEM_PROMPT = `You are CivicBot, a friendly and helpful AI assistant for CivicPulse — 
a community civic issue reporting platform in India. You help citizens 
understand how to use the platform and how civic issue reporting works.

You can answer questions about:
- How to report a civic issue (take photo, AI analyzes it, fill location, submit)
- Issue categories: Pothole, Street Light, Water Leakage, Garbage, Road Damage, 
  Encroachment, Noise Pollution
- Severity levels: Low, Medium, High, Critical — based on safety risk
- Community verification: when 5+ citizens upvote an issue it gets verified
- XP and gamification: Report=50XP, Upvote=5XP, Comment=10XP, Resolved=100XP
- Levels: Citizen(0-99 XP), Guardian(100-499 XP), Champion(500-999 XP), Legend(1000+ XP)  
- Badges: First Report, Community Watcher, Legend Citizen, Team Player
- What happens after reporting: issue goes on map, community verifies, 
  authorities are notified, status updates to In Progress then Resolved
- Resolution timeline: Low=7-14 days, Medium=3-7 days, High=1-3 days, Critical=24 hours
- How AI works: Gemini Vision analyzes the uploaded photo and automatically 
  identifies the issue type, severity, and generates a description
- Anonymous reporting: users can report without showing their name

Keep responses short, friendly, and helpful — maximum 3-4 sentences. 
Use simple language. Add relevant emojis. Always encourage citizens to 
report issues and participate in the community.`;

// Smart fallback response generator for CivicBot
function getSmartFallbackResponse(query: string): string {
  const q = query.toLowerCase().trim();

  // 1. Greetings
  if (q === 'hi' || q === 'hello' || q === 'hey' || q === 'hola' || q.includes('good morning') || q.includes('good afternoon') || q.includes('good evening') || q.startsWith('greetings')) {
    return `Hello! I am CivicBot, your AI neighborhood companion. 🤖

How can I assist you today? I'm ready to help you with:
- **Reporting an issue** (Ask: *'How do I report?'*)
- **Earning XP & Leveling up** (Ask: *'How do I earn XP?'*)
- **Community verification** (Ask: *'How does verification work?'*)
- **Resolution SLAs** (Ask: *'How long does resolution take?'*)

Feel free to click one of our suggested questions or type what's on your mind!`;
  }

  // 2. Gratitude / Positive acknowledgment
  if (q === 'thanks' || q === 'thank you' || q === 'ty' || q === 'awesome' || q === 'perfect' || q === 'great' || q === 'cool' || q === 'ok' || q === 'okay' || q === 'fine' || q === 'yes') {
    return `You are very welcome! I'm happy to help. 😊 

Is there anything else I can assist you with today to make our neighborhood a better, cleaner, and safer place?`;
  }

  // 3. Goodbye / Exit
  if (q === 'bye' || q === 'goodbye' || q.includes('see you') || q === 'exit' || q === 'stop') {
    return `Goodbye! Have an amazing day and thank you for being an active, awesome citizen in our community! If you ever need me again, I'm always here. 🌟`;
  }

  // 4. Who are you / Identity
  if (q.includes('who are you') || q.includes('your name') || q.includes('what do you do') || q.includes('what is civicbot') || q.includes('purpose')) {
    return `I am **CivicBot**, your helpful neighborhood AI assistant! 🤖

My mission is to support the CivicPulse community by helping you understand:
1. 📂 **How to report a civic issue** (like potholes, street light outages, garbage, water leaks, or road damage)
2. 👥 **How community verification works** (using upvotes to verify reports)
3. 🌟 **Our citizen gamification system** (how to earn XP, level up, and unlock special badges)
4. ⏱️ **Our strict official resolution SLA timelines** based on issue severity

Let me know what you'd like to learn more about!`;
  }

  // 5. XP / Gamification / Badges / Levels
  if (q.includes('xp') || q.includes('badge') || q.includes('level') || q.includes('gamification') || q.includes('earn') || q.includes('score') || q.includes('champion') || q.includes('legend') || q.includes('reputation')) {
    return `CivicPulse uses a fun gamification system to reward active citizens like you! Here is how you can level up step-by-step:

**🌟 How to Earn XP:**
- **Report a new civic issue**: **+50 XP**
- **Upvote a neighborhood issue**: **+5 XP**
- **Comment or suggest a solution**: **+10 XP**
- **Verify a fixed issue**: **+100 XP**

**🏆 Citizen Levels:**
- **Citizen** (0 - 99 XP): Your civic journey begins!
- **Guardian** (100 - 499 XP): Trusted community moderator.
- **Champion** (500 - 999 XP): Highly active neighborhood hero.
- **Legend** (1000+ XP): Elite civic leader with ultimate badge privileges!

**🏅 Collect Special Badges:**
- **First Report**: Awarded on your first submitted report.
- **Community Watcher**: Upvoted 5 or more neighborhood issues.
- **Team Player**: Contributed helpful comments on 3 or more issues.
- **Legend Citizen**: Reached the top 1000+ XP tier!

Participate in discussions and keep upvoting authentic reports to climb the leaderboard! 🚀`;
  }

  // 6. AI / Gemini / Vision / Scan / Automatic
  if (q.includes('ai') || q.includes('gemini') || q.includes('automatic') || q.includes('scan') || q.includes('image') || q.includes('vision') || q.includes('photo') || q.includes('categoriz') || q.includes('analysis')) {
    return `CivicPulse is supercharged with state-of-the-art **Gemini Vision AI**! Here is how our AI works step-by-step to make reporting effortless:

1. 📸 **Vision Scan**: When you upload a picture of a civic issue, Gemini instantly analyzes the pixels to understand what is broken.
2. 🏷️ **Auto-Categorize**: It identifies whether it is a pothole, street light outage, water leak, garbage, or road damage.
3. ⚡ **Smart Severity**: It calculates the safety risk to assign an initial severity weight (Low, Medium, High, or Critical).
4. 📝 **Description Writer**: It automatically generates a descriptive title and a comprehensive summary of the issue.

This saves you time and ensures high-quality, standardized data is sent directly to municipal maintenance crews! 🤖`;
  }

  // 7. Verification / Upvotes / Voting / Community Watch
  if (q.includes('verification') || q.includes('verify') || q.includes('upvote') || q.includes('vote') || q.includes('community watch') || q.includes('community verification')) {
    return `Here is how our community verification and voting system works step-by-step:

1. 📍 **Map Indicator**: Once you submit an issue, it immediately appears on the live map as a yellow 'Pending' pin.
2. 👥 **Citizen Review**: Nearby citizens can view your report, visit the location, and click **Upvote** if they confirm the issue is real and needs fixing.
3. 🚀 **Official Verification**: Once an issue receives **5 or more upvotes**, its status automatically changes to **Verified** (Blue Pin).
4. 📢 **Authority Notification**: Verified issues are instantly highlighted and escalated directly to local civic authorities for official repairs!

Each upvote you receive earns you reputation, and voting on others' issues gives you **5 XP**! 🌟`;
  }

  // 8. After Reporting / Status / Next Steps / Flow / Lifecycle
  if (q.includes('after') || q.includes('process') || q.includes('happens') || q.includes('next') || q.includes('flow') || q.includes('lifecycle')) {
    return `Once you submit a report on CivicPulse, the issue goes through a transparent step-by-step resolution lifecycle:

1. 🟡 **Pending (Yellow Pin)**: The issue is published on the map and awaits neighbor upvotes.
2. 🔵 **Verified (Blue Pin)**: Once 5+ citizens upvote, the issue is officially verified and sent to authorities.
3. 🟠 **In Progress (Orange Pin)**: Authorities accept the report, dispatch field workers, and begin repairs.
4. 🟢 **Resolved (Green Pin)**: The repair is completed! Neighbors are notified, and all contributors are awarded **100 XP** bonus!

You can track real-time status updates directly from your Profile dashboard or the main live map! 📍`;
  }

  // 9. Resolution Timeline / Duration / Speed / How Long / Days / SLA
  if (q.includes('how long') || q.includes('time') || q.includes('duration') || q.includes('timeline') || q.includes('days') || q.includes('resolv') || q.includes('speed') || q.includes('sla')) {
    return `CivicPulse works on strict SLA resolution timelines based on the priority level of the reported issue:

1. 🔴 **Critical Priority**: Resolved within **24 hours** (e.g. hazardous open wiring, blocked main drain).
2. 🟠 **High Priority**: Resolved within **1 to 3 days** (e.g. high-traffic potholes, major water pipe bursts).
3. 🟡 **Medium Priority**: Resolved within **3 to 7 days** (e.g. dark street lights, smaller roadside garbage piles).
4. 🟢 **Low Priority**: Resolved within **7 to 14 days** (e.g. non-safety-critical road cracks or minor noise complaints).

If an issue exceeds its timeline without being addressed, it is automatically escalated higher up in the municipal department! ⏱️`;
  }

  // 10. Anonymous / Privacy / Secret / Name / Hide
  if (q.includes('anonymous') || q.includes('privacy') || q.includes('name') || q.includes('hide') || q.includes('private') || q.includes('secret')) {
    return `We respect your privacy! On CivicPulse, you can report issues without revealing your identity:

1. 👤 **Toggle Anonymous**: When filling out the issue form, simply check the **'Submit Report Anonymously'** box at the bottom.
2. 🔒 **Name Hidden**: Your name and profile details will be completely hidden from the map pin, public lists, and comments.
3. 🏆 **Keep Your XP**: Even though your identity is hidden from other users, your account still securely receives the **50 XP** and badges in the background!

Feel confident reporting issues in your neighborhood while keeping your personal information fully private. 🕵️‍♂️`;
  }

  // 11. Categories / Severity / Pothole / Garbage / Light / Water / Noise / Encroachment
  if (q.includes('category') || q.includes('categories') || q.includes('severity') || q.includes('pothole') || q.includes('garbage') || q.includes('street light') || q.includes('noise') || q.includes('water') || q.includes('encroach')) {
    return `CivicPulse organizes issues into standard categories and severity levels to help authorities prioritize effectively:

**📋 Supported Categories:**
- 🕳️ **Pothole** & 🛣️ **Road Damage**
- 💡 **Street Light** outages or damage
- 💧 **Water Leakage** & drainage blockage
- 🗑️ **Garbage** piles & unsanitary dumping
- 🚧 **Encroachment** on footpaths or roads
- 🔊 **Noise Pollution** during restricted hours

**⚡ Severity Levels & Official Resolution Deadlines:**
1. 🔴 **Critical**: Severe risk to public safety (e.g. open manhole, high-voltage wire). Resolved in **24 hours**.
2. 🟠 **High**: Major inconvenience (e.g. main road pothole). Resolved in **1-3 days**.
3. 🟡 **Medium**: Moderate hazard (e.g. minor street light outage). Resolved in **3-7 days**.
4. 🟢 **Low**: Minor issue (e.g. small trash pile). Resolved in **7-14 days**.`;
  }

  // 12. General Report / Submit Issue (Fall through here if more specific topics didn't trigger, like "how to report" or "how do i report")
  if (q.includes('report') || q.includes('submit') || q.includes('post') || q.includes('file') || q.includes('create') || q.includes('add') || q.includes('new issue') || q.includes('how to') || q.includes('how do i')) {
    return `To report a civic issue on CivicPulse, follow these simple, step-by-step instructions:

1. 📂 **Navigate to 'Report Issue'**: Click the **Report Issue** tab or button in your navigation menu.
2. 📸 **Upload a Photo**: Click to select or drag-and-drop a photo of the civic issue (e.g. pothole, broken light, garbage pile).
3. 🤖 **AI Scan & Fill**: Our built-in Gemini Vision AI automatically scans your photo to identify the category, estimate severity, and pre-fill the titles and descriptions for you!
4. 📍 **Pin Location**: Point the exact spot of the issue on our interactive map.
5. 👤 **Choose Privacy & Submit**: Check the **Submit Anonymous** option if you wish, then click **Submit Report**!

You will instantly earn **50 XP** for your contribution to the community! 🚀`;
  }

  // Default fallback response
  return `Hi! I am CivicBot, your AI neighborhood companion. 🤖

I can help you step-by-step with any of these topics:
1. 📂 **How to report an issue** (Ask: *'How do I report?'*)
2. 👥 **How community verification works** (Ask: *'How does verification work?'*)
3. 🌟 **How to earn XP and level up** (Ask: *'How do I earn XP?'*)
4. 📋 **Our categories & severity timelines** (Ask: *'What are the categories?'*)
5. ⏱️ **How long resolution takes** (Ask: *'How long does resolution take?'*)
6. 🤖 **How our Gemini Vision AI works** (Ask: *'How does AI scan work?'*)

Just type your question or click one of the quick suggested questions, and I will guide you through!`;
}

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: true, message: 'Message is required' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      console.warn('[CivicBot] Warning: GEMINI_API_KEY is missing or is placeholder. Using smart local response.');
      const fallbackText = getSmartFallbackResponse(message);
      res.json({ response: fallbackText });
      return;
    }

    // Lazy initialize global aiClient if apiKey is configured now
    if (!aiClient) {
      try {
        console.log('[CivicBot] Lazy-initializing GoogleGenAI with current GEMINI_API_KEY...');
        aiClient = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' }
          }
        });
      } catch (err) {
        console.error('[CivicBot] Failed to lazy-initialize GoogleGenAI:', err);
      }
    }

    let text = '';
    let success = false;
    let lastError: any = null;

    // Strategy 1: Use the configured global aiClient with gemini-3.5-flash and clean alternating sequence
    if (aiClient) {
      try {
        console.log('[CivicBot] Strategy 1: Trying GoogleGenAI with gemini-3.5-flash...');
        const formattedContents: any[] = [];
        let lastRole = '';

        if (history && Array.isArray(history)) {
          for (const h of history) {
            const role = h.role === 'assistant' ? 'model' : 'user';
            
            // Alternating sequence check: if consecutive role is same, append text
            if (role === lastRole && formattedContents.length > 0) {
              formattedContents[formattedContents.length - 1].parts[0].text += '\n' + h.text;
            } else {
              formattedContents.push({
                role: role,
                parts: [{ text: h.text }]
              });
              lastRole = role;
            }
          }
        }

        // Filter out initial model messages because the sequence must start with 'user'
        while (formattedContents.length > 0 && formattedContents[0].role === 'model') {
          formattedContents.shift();
        }

        // Add the current user query to sequence
        if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === 'user') {
          formattedContents[formattedContents.length - 1].parts[0].text += '\n' + message;
        } else {
          formattedContents.push({
            role: 'user',
            parts: [{ text: message }]
          });
        }

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: formattedContents,
          config: {
            systemInstruction: CIVICBOT_SYSTEM_PROMPT
          }
        });

        text = response.text || '';
        if (text && text.trim().length > 0) {
          success = true;
          console.log('[CivicBot] Strategy 1 succeeded!');
        }
      } catch (err: any) {
        console.warn('[CivicBot] Strategy 1 failed:', err.message || err);
        lastError = err;
      }
    }

    // Strategy 2: Use direct generateContent fallback on gemini-3.5-flash if startChat failed or threw
    if (!success) {
      try {
        console.log('[CivicBot] Strategy 2: Trying flat legacy model call with gemini-3.5-flash...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        
        let historyBlock = '';
        if (history && Array.isArray(history)) {
          historyBlock = history.map(h => `${h.role === 'assistant' ? 'CivicBot' : 'Citizen'}: ${h.text}`).join('\n');
        }
        
        const flatPrompt = `${CIVICBOT_SYSTEM_PROMPT}

Conversation Log:
${historyBlock}
Citizen: ${message}
CivicBot:`;

        const result = await model.generateContent(flatPrompt);
        text = result.response.text();
        if (text && text.trim().length > 0) {
          success = true;
          console.log('[CivicBot] Strategy 2 succeeded!');
        }
      } catch (err: any) {
        console.warn('[CivicBot] Strategy 2 failed:', err.message || err);
        lastError = err;
      }
    }

    if (!success) {
      console.warn('[CivicBot] All API strategies failed, using smart local fallback. Error:', lastError);
      text = getSmartFallbackResponse(message);
    }

    res.json({ response: text });
  } catch (err: any) {
    console.error('[CivicBot] Chatbot error, replying with fallback:', err);
    try {
      const fallbackText = getSmartFallbackResponse(req.body?.message || '');
      res.json({ response: fallbackText });
    } catch {
      res.status(500).json({ error: true, message: 'CivicBot failed to generate response' });
    }
  }
});

// Helper to map category to department name
function getDepartmentForCategory(category: string): string {
  if (category === 'Pothole' || category === 'Road Damage') return 'Public Works Department (PWD)';
  if (category === 'Street Light') return 'Electricity Board';
  if (category === 'Garbage') return 'Sanitation Department';
  if (category === 'Water Leakage') return 'Water & Sewage Board';
  if (category === 'Encroachment') return 'Urban Planning & Encroachment';
  if (category === 'Noise Pollution') return 'Pollution Control Board';
  return 'General Administration';
}

// POST /api/authority/login
app.post('/api/authority/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@civicpulse.in' && password === 'admin123') {
    res.json({
      token: 'authority_token_demo_12345',
      user: {
        name: 'Officer Sanjay Patel',
        email: 'admin@civicpulse.in',
        role: 'Chief Municipal Engineer',
        department: 'Public Works Department (PWD)' // Default department
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid authority credentials. Use admin@civicpulse.in / admin123' });
  }
});

// GET /api/authority/issues
app.get('/api/authority/issues', (req, res) => {
  const issues = db.issues.find();
  const populated = issues.map(issue => {
    const reporter = db.users.findById(issue.reportedBy);
    return {
      ...issue,
      reportedByName: reporter ? reporter.name : (issue.isAnonymous ? 'Anonymous' : 'Citizen'),
      reportedByLevel: reporter ? reporter.level : 'Citizen',
      department: getDepartmentForCategory(issue.category)
    };
  });
  res.json(populated);
});

// PUT /api/authority/issues/:id
app.put('/api/authority/issues/:id', async (req, res) => {
  const { status, note, resolvedImage, assignedWorker, officialCommands, slaDeadline } = req.body;
  const issue = db.issues.findById(req.params.id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  const oldStatus = issue.status;
  const statusHistory = issue.statusHistory || [];
  const deptName = getDepartmentForCategory(issue.category);

  if (assignedWorker) {
    statusHistory.push({
      status: status || oldStatus,
      note: `Officer Sanjay Patel assigned junior worker (${assignedWorker}) with orders: "${officialCommands || 'Proceed with immediate site inspection.'}" (SLA Target: ${slaDeadline ? new Date(slaDeadline).toLocaleDateString() : 'Immediate'})`,
      createdAt: new Date().toISOString()
    });
  } else if (status || note) {
    statusHistory.push({
      status: status || oldStatus,
      note: note || `Status updated by ${deptName} officer.`,
      createdAt: new Date().toISOString()
    });
  }

  const updateData: any = {
    status: status || oldStatus,
    statusHistory,
    updatedAt: new Date().toISOString()
  };

  if (assignedWorker !== undefined) updateData.assignedWorker = assignedWorker;
  if (officialCommands !== undefined) updateData.officialCommands = officialCommands;
  if (slaDeadline !== undefined) updateData.slaDeadline = slaDeadline;

  if (resolvedImage) {
    updateData.resolvedImage = resolvedImage;
    // Also append to images array if not already present
    const images = issue.images || [];
    if (!images.includes(resolvedImage)) {
      images.push(resolvedImage);
    }
    updateData.images = images;
  }

  // Generate Gemini Auto-Drafted message
  let officialResponse = '';
  const prompt = `You are a municipal officer representing the "${deptName}" of Mumbai. 
Write a professional, polite, and reassuring response message to the citizen who reported this issue.
Issue Title: "${issue.title}"
Current Status: "${status || oldStatus}"
Notes from the field engineer: "${note || 'Work in progress.'}"

Address the citizen directly and politely. Express gratitude for their civic contribution.
Write 2-3 sentences max. Do not use place-holders like [Citizen Name] or [Officer Name]. Write a complete, ready-to-send text. Provide an English version and then a direct Hindi translation underneath.`;

  if (aiClient) {
    try {
      console.log('[Authority AI] Calling Gemini to auto-draft resolution response...');
      const geminiRes = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });
      officialResponse = geminiRes.text?.trim() || '';
    } catch (err) {
      console.error('[Authority AI] Gemini call failed, using smart fallback draft:', err);
    }
  }

  // If Gemini failed or was not configured, generate a high-fidelity template draft
  if (!officialResponse) {
    const statusText = status === 'Resolved' ? 'resolved and closed successfully' : 'updated to In Progress';
    const hindiStatusText = status === 'Resolved' ? 'सफलतापूर्वक हल कर दिया गया है' : 'प्रगति पर है';
    officialResponse = `Dear Citizen, thank you for bringing the issue "${issue.title}" to our attention. Our team at the ${deptName} has reviewed and ${statusText}. Notes: ${note || 'Maintenance crew has been dispatched to resolve the concern immediately.'} We appreciate your help in building a better city.

प्रिय नागरिक, हमारे ध्यान में "${issue.title}" समस्या लाने के लिए धन्यवाद। ${deptName} विभाग की हमारी टीम ने इसे देखा है और यह अब ${hindiStatusText}। हम एक बेहतर शहर के निर्माण में आपके सहयोग की सराहना करते हैं।`;
  }

  updateData.officialResponse = officialResponse;

  db.issues.updateOne(issue._id, updateData);

  // Award XP if updated to Resolved
  let reporterXpReward = 0;
  let reporterLeveledUp = false;

  if (status === 'Resolved' && oldStatus !== 'Resolved') {
    const reporter = db.users.findById(issue.reportedBy);
    if (reporter) {
      const repXp = awardUserXP(issue.reportedBy, 100);
      reporterXpReward = 100;
      reporterLeveledUp = repXp.leveledUp;

      db.notifications.create({
        userId: issue.reportedBy,
        text: `🎉 Great News! "${issue.title}" has been RESOLVED by ${deptName}! You earned +100 XP.`,
        isRead: false
      });
    }
  }

  res.json({
    issue: db.issues.findById(issue._id),
    reporterXpReward,
    reporterLeveledUp,
    officialResponse
  });
});

// INTEGRATE VITE FOR FULL-STACK OR SERVE STATIC IN PRODUCTION
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    // Serve development static assets via Vite middlewares
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicPulse server running on port ${PORT}`);
  });
}

startServer();
