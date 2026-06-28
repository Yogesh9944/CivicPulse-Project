import bcryptjs from 'bcryptjs';
import { db, User, Issue } from './db';

const PASSWORD_HASH = bcryptjs.hashSync('password123', 10);

const MUMBAI_LAT = 19.076;
const MUMBAI_LNG = 72.8777;

const CATEGORIES = [
  'Pothole',
  'Street Light',
  'Water Leakage',
  'Garbage',
  'Road Damage',
  'Encroachment',
  'Noise Pollution',
  'Other'
] as const;

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;

const SAMPLE_COMMENTS = [
  "This is causing major traffic delays during peak hours. Glad someone reported it!",
  "I almost tripped here yesterday evening. Hope this gets resolved soon.",
  "Reported this to the local ward office last week but no action was taken. Let's push this!",
  "Great initiative! Local communities must unite to highlight these problems.",
  "I live nearby and can confirm this is a safety hazard for kids and senior citizens.",
  "The water is getting wasted constantly. Very disappointing.",
  "This street light is off for a week now, making the alley extremely dark and unsafe.",
  "Excellent update, thank you for verifying the progress.",
  "We need more upvotes on this so it gets escalated to the ward officer.",
  "The garbage truck didn't show up for three days here. It smells terrible!"
];

const ISSUE_TITLES: Record<typeof CATEGORIES[number], string[]> = {
  Pothole: [
    "Deep pothole near Signal",
    "Dangerous crater on bridge",
    "Pothole cluster near school crossing",
    "Massive pothole damaging car suspensions"
  ],
  'Street Light': [
    "Flickering street light near park entrance",
    "Entire street in complete darkness",
    "Broken lamp post on main road",
    "Street lights remain off after 7 PM"
  ],
  'Water Leakage': [
    "Burst drinking water pipeline",
    "Continuous water seepage from footpath",
    "Municipal water valve leaking heavily",
    "Drainage water overflowing into road"
  ],
  Garbage: [
    "Unattended garbage dump near food stall",
    "Overflowing public trash bins",
    "Construction debris dumped illegally",
    "Plastic waste clogging storm water drain"
  ],
  'Road Damage': [
    "Crumbling road edges after rainfall",
    "Uneven road leveling causing skidding",
    "Tar layer peeled off completely",
    "Sunken road section near flyover"
  ],
  Encroachment: [
    "Illegal stalls blocking pedestrian sidewalk",
    "Shop hoardings extended onto the road",
    "Construction material blocking alleyway",
    "Vehicles parked permanently on pavement"
  ],
  'Noise Pollution': [
    "Late-night loudspeakers from banquet hall",
    "Continuous commercial drilling in residential area",
    "High-decibel honking at crossroads",
    "Illegal midnight construction noise"
  ],
  Other: [
    "Broken manhole cover on walking track",
    "Leaning utility pole posing falling hazard",
    "Damaged public park bench",
    "Overgrown tree branches touching power lines"
  ]
};

const ISSUE_DESCRIPTIONS: Record<typeof CATEGORIES[number], string[]> = {
  Pothole: [
    "There is a deep pothole right in the middle of the left lane. Two-wheelers are swerving dangerously to avoid it.",
    "A massive pothole has formed on the flyover. It is hard to see at night and is causing vehicles to brake suddenly.",
    "Multiple potholes have merged to create a giant patch of broken road right in front of the primary school entrance.",
    "This pothole is expanding daily. It has sharp edges and has already damaged several car tires today."
  ],
  'Street Light': [
    "The street light has been flickering non-stop for the past 3 days. It is extremely annoying and distracting for drivers.",
    "There are about 5 consecutive street lights that are completely out, leaving the entire residential stretch in pitch black.",
    "A vehicle hit the lamp post, breaking the light cover and exposing some wires. It needs immediate repair.",
    "The automated sensor seems broken because the street lights don't turn on until very late in the night."
  ],
  'Water Leakage': [
    "A main drinking water pipe has burst under the footpath. Hundreds of liters of clean water are wasting into the drain.",
    "Water has been continuously bubbling up through the cracks in the road. It might damage the road foundation.",
    "The valve chamber is leaking, spraying water on the passersby. This has been happening for over 48 hours.",
    "Drains are blocked, causing greywater to overflow and pool onto the street, emitting a terrible foul odor."
  ],
  Garbage: [
    "People have started dumping domestic waste on the corner of the crossroad. Stray dogs are scattering it everywhere.",
    "The green garbage bins are completely full, and trash is spilling onto the footpath. It hasn't been cleared for 4 days.",
    "Someone dumped a truckload of bricks and concrete dust directly on the sidewalk, forcing pedestrians to walk on the busy street.",
    "The plastic wrappers, bottles, and bags have completely choked the drainage inlet, which will cause flooding during heavy rains."
  ],
  'Road Damage': [
    "The entire tar road is peeling off in sections, leaving loose gravel which makes the surface extremely slippery.",
    "The road leveling is poor, resulting in a dangerous step-up bump that launches unsuspecting motorbikes.",
    "After the sewer repair work, the trench was filled poorly. It has now sunken down by about 6 inches.",
    "Heavy vehicles have created deep ruts in the asphalt near the intersection, destabilizing vehicles during turns."
  ],
  Encroachment: [
    "Local street vendors have set up permanent wooden structures on the pedestrian footpath, forcing citizens to walk in traffic.",
    "A commercial shop has extended its display counters and banners, covering more than half of the pedestrian zone.",
    "A contractor has stored sand and gravel on the street for weeks. It's blocking parking slots and narrowing the street.",
    "Abandon cars and two-wheelers are being parked permanently on both sides of the sidewalk, rendering it useless."
  ],
  'Noise Pollution': [
    "Loud music and speakers are being operated past midnight in violation of silence zone guidelines. Extremely disruptive.",
    "A manufacturing workshop is running heavy heavy machinery and drilling noise inside a residential building all day.",
    "Vehicles are constantly honking in front of the hospital, even though it is clearly marked as a No-Honking Zone.",
    "Construction work inside the compound continues well past 11:00 PM, involving heavy banging and cement mixers."
  ],
  Other: [
    "The concrete cover of the storm sewer is broken, leaving an open hole that is extremely dangerous for anyone walking by.",
    "The electrical utility pole is leaning at a dangerous angle of 15 degrees. It seems the foundation has weakened.",
    "The public park benches have been vandalized with metal rods stolen, making them unusable for visiting seniors.",
    "Heavy tree branches have grown into the overhead power cables, causing frequent sparks and power fluctuations."
  ]
};

export function seedDatabase() {
  if (!db.isEmpty()) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding database with sample users and issues...');

  // 1. Seed Users
  const user1 = db.users.create({
    _id: 'user_ramesh',
    name: 'Ramesh Kumar',
    email: 'ramesh@example.com',
    password: PASSWORD_HASH,
    xp: 50,
    level: 'Citizen',
    badges: [{ name: 'First Report', icon: '📸', earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }],
    issuesReported: 1,
    issuesVerified: 0,
  });

  const user2 = db.users.create({
    _id: 'user_priya',
    name: 'Priya Patel',
    email: 'priya@example.com',
    password: PASSWORD_HASH,
    xp: 200,
    level: 'Guardian',
    badges: [
      { name: 'First Report', icon: '📸', earnedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      { name: 'Community Watcher', icon: '👁️', earnedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    issuesReported: 5,
    issuesVerified: 12,
  });

  const user3 = db.users.create({
    _id: 'user_vikram',
    name: 'Vikram Singh',
    email: 'vikram@example.com',
    password: PASSWORD_HASH,
    xp: 600,
    level: 'Champion',
    badges: [
      { name: 'First Report', icon: '📸', earnedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
      { name: 'Community Watcher', icon: '👁️', earnedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    issuesReported: 12,
    issuesVerified: 25,
  });

  const user4 = db.users.create({
    _id: 'user_ananya',
    name: 'Ananya Iyer',
    email: 'ananya@example.com',
    password: PASSWORD_HASH,
    xp: 1100,
    level: 'Legend',
    badges: [
      { name: 'First Report', icon: '📸', earnedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() },
      { name: 'Community Watcher', icon: '👁️', earnedAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString() },
      { name: 'Legend Citizen', icon: '👑', earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    issuesReported: 22,
    issuesVerified: 54,
  });

  const user5 = db.users.create({
    _id: 'user_kabir',
    name: 'Kabir Mehta',
    email: 'kabir@example.com',
    password: PASSWORD_HASH,
    xp: 30,
    level: 'Citizen',
    badges: [],
    issuesReported: 0,
    issuesVerified: 0,
  });

  const users = [user1, user2, user3, user4, user5];

  // 2. Seed 20 Issues
  for (let i = 0; i < 20; i++) {
    // Pick random category, severity, status
    const category = CATEGORIES[i % CATEGORIES.length];
    const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
    
    // Status distribution
    let status: typeof STATUSES[number] = 'Open';
    if (i % 3 === 1) status = 'In Progress';
    else if (i % 3 === 2) status = 'Resolved';
    if (i === 19) status = 'Closed';

    // Random reporter
    const reporter = users[Math.floor(Math.random() * users.length)];

    // Random Mumbai coordinates spread ±0.04
    const lat = MUMBAI_LAT + (Math.random() - 0.5) * 0.08;
    const lng = MUMBAI_LNG + (Math.random() - 0.5) * 0.08;

    // Title & Description selection
    const titles = ISSUE_TITLES[category];
    const descriptions = ISSUE_DESCRIPTIONS[category];
    const title = titles[i % titles.length] + ` (${Math.floor(Math.random() * 100) + 10}m near Main Road)`;
    const description = descriptions[i % descriptions.length];

    // Comments (2 to 5 comments)
    const commentCount = 2 + Math.floor(Math.random() * 4);
    const comments = [];
    const usedUsers = new Set<string>();
    
    for (let c = 0; c < commentCount; c++) {
      let commentUser = users[Math.floor(Math.random() * users.length)];
      if (usedUsers.has(commentUser._id)) {
        // Fallback to sequential to avoid duplication
        commentUser = users[(users.indexOf(commentUser) + 1) % users.length];
      }
      usedUsers.add(commentUser._id);

      comments.push({
        _id: Math.random().toString(36).substr(2, 9),
        userId: commentUser._id,
        text: SAMPLE_COMMENTS[Math.floor(Math.random() * SAMPLE_COMMENTS.length)],
        createdAt: new Date(Date.now() - (10 - c) * 12 * 60 * 60 * 1000).toISOString()
      });
    }

    // Upvotes (1 to 8 upvotes, selected from sample user IDs)
    const upvoteCount = 1 + Math.floor(Math.random() * 8);
    const upvotes: string[] = [];
    const possibleVoters = ['user_ramesh', 'user_priya', 'user_vikram', 'user_ananya', 'user_kabir', 'extra_voter1', 'extra_voter2', 'extra_voter3', 'extra_voter4'];
    for (let v = 0; v < upvoteCount; v++) {
      const voter = possibleVoters[v % possibleVoters.length];
      if (!upvotes.includes(voter)) {
        upvotes.push(voter);
      }
    }

    const verifiedBy = upvotes.slice(0, Math.floor(upvotes.length / 2));
    const isVerified = upvotes.length >= 5;

    // AI Analysis
    const confidence = 75 + Math.floor(Math.random() * 20);
    const tags = [category.toLowerCase(), severity.toLowerCase(), 'mumbai-civic', 'safety'];
    const urgency_reason = severity === 'Critical' ? 'Immediate hazard to commuters and public safety.' : 'Requires municipal attention to prevent deterioration.';

    // Created At range (between 1 and 15 days ago)
    const daysAgo = 1 + Math.floor(Math.random() * 14);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Status History
    const statusHistory: any[] = [
      { status: 'Open', note: 'Issue reported by citizen via app.', createdAt }
    ];
    if (status === 'In Progress' || status === 'Resolved' || status === 'Closed') {
      statusHistory.push({
        status: 'In Progress',
        note: 'Ward officer assigned. Repair crew dispatched.',
        createdAt: new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
    if (status === 'Resolved' || status === 'Closed') {
      statusHistory.push({
        status: 'Resolved',
        note: 'Issue fixed. Community verified and marked as resolved.',
        createdAt: new Date(new Date(createdAt).getTime() + 48 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Address approximation
    const landmarks = ['Colaba Causeway', 'Bandra West', 'Andheri East', 'Lower Parel', 'Worli Sea Face', 'Dharavi', 'Juhu Beach', 'Ghatkopar', 'Chembur', 'Borivali'];
    const address = `${title.split(' near ')[0]}, near ${landmarks[i % landmarks.length]}, Mumbai, Maharashtra, 400001`;

    db.issues.create({
      title,
      description,
      category,
      severity,
      status,
      location: { lat, lng, address },
      images: [], // seeded issues can have empty array, UI will display category emoji if empty
      aiAnalysis: {
        category,
        severity,
        description: `AI detected ${category} of ${severity} severity. Location details verified.`,
        confidence,
        tags,
        urgency_reason
      },
      reportedBy: reporter._id,
      upvotes,
      verifiedBy,
      isVerified,
      isAnonymous: Math.random() > 0.8,
      comments,
      statusHistory,
      isEscalated: severity === 'Critical' && status === 'Open' && daysAgo > 3,
      createdAt,
      updatedAt: createdAt
    });
  }

  console.log('Seeding complete! 5 users and 20 issues populated.');
}
