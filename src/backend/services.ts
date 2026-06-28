import { db, User, Issue } from './db';

// Level thresholds: 0-99 = Citizen, 100-499 = Guardian, 500-999 = Champion, 1000+ = Legend
export function calculateLevel(xp: number): 'Citizen' | 'Guardian' | 'Champion' | 'Legend' {
  if (xp >= 1000) return 'Legend';
  if (xp >= 500) return 'Champion';
  if (xp >= 100) return 'Guardian';
  return 'Citizen';
}

// Badge check function
export function checkBadges(user: User, commentCount: number): Array<{ name: string; icon: string; earnedAt: string }> {
  const currentBadges = [...user.badges];
  const earnedNames = new Set(currentBadges.map(b => b.name));

  // 1. "First Report" (issuesReported == 1)
  if (user.issuesReported >= 1 && !earnedNames.has('First Report')) {
    currentBadges.push({ name: 'First Report', icon: '📸', earnedAt: new Date().toISOString() });
  }

  // 2. "Community Watcher" (issuesVerified >= 10)
  if (user.issuesVerified >= 10 && !earnedNames.has('Community Watcher')) {
    currentBadges.push({ name: 'Community Watcher', icon: '👁️', earnedAt: new Date().toISOString() });
  }

  // 3. "Legend Citizen" (xp >= 1000)
  if (user.xp >= 1000 && !earnedNames.has('Legend Citizen')) {
    currentBadges.push({ name: 'Legend Citizen', icon: '👑', earnedAt: new Date().toISOString() });
  }

  // 4. "Team Player" (comments >= 20)
  if (commentCount >= 20 && !earnedNames.has('Team Player')) {
    currentBadges.push({ name: 'Team Player', icon: '🤝', earnedAt: new Date().toISOString() });
  }

  return currentBadges;
}

// Helper to award XP and update badges/levels for a user
export function awardUserXP(userId: string, xpAmount: number): { user: User; xpGained: number; leveledUp: boolean } {
  const user = db.users.findById(userId);
  if (!user) throw new Error('User not found');

  const oldLevel = user.level;
  const newXp = Math.max(0, user.xp + xpAmount);
  const newLevel = calculateLevel(newXp);

  // Count actual comments posted by this user from all issues
  const allIssues = db.issues.find();
  let userCommentCount = 0;
  allIssues.forEach(issue => {
    userCommentCount += (issue.comments || []).filter(c => c.userId === userId).length;
  });

  const updatedUser: Partial<User> = {
    xp: newXp,
    level: newLevel,
  };

  // Temporarily set them for the badge check
  const tempUser = { ...user, ...updatedUser };
  const newBadges = checkBadges(tempUser, userCommentCount);
  updatedUser.badges = newBadges;

  const savedUser = db.users.updateOne(userId, updatedUser);
  if (!savedUser) throw new Error('Failed to update user');

  return {
    user: savedUser,
    xpGained: xpAmount,
    leveledUp: oldLevel !== newLevel
  };
}

// Auto-escalation checks: Issues with High/Critical severity, status Open, age > 72 hours, upvotes >= 10
export function runAutoEscalation() {
  const now = new Date();
  const allIssues = db.issues.find();

  allIssues.forEach(issue => {
    if (
      (issue.severity === 'High' || issue.severity === 'Critical') &&
      issue.status === 'Open' &&
      !issue.isEscalated
    ) {
      const createdTime = new Date(issue.createdAt);
      const hoursDiff = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
      const upvoteCount = issue.upvotes ? issue.upvotes.length : 0;

      if (hoursDiff >= 72 && upvoteCount >= 10) {
        db.issues.updateOne(issue._id, { isEscalated: true });
        // Create a notification for the reporter that their issue has been escalated
        db.notifications.create({
          userId: issue.reportedBy,
          text: `🔥 Your issue "${issue.title}" has been escalated to local authorities due to community urgency.`,
          isRead: false
        });
      }
    }
  });
}
