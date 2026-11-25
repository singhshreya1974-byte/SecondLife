import { execFileSync } from 'child_process';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TrustBadge, TrustBreakdownItem, TrustLevel, UserProfile } from '../src/shared/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
export const DB_PATH = path.join(ROOT_DIR, 'second_life.db');
export const INSIGHTS_PATH = path.join(ROOT_DIR, 'data_insights.json');

let _db: DatabaseSync | null = null;

function ensureSchemaUpgraded(db: DatabaseSync): void {
  const userCols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
  const userColSet = new Set(userCols.map((c) => c.name));
  if (!userColSet.has('campus_verified')) {
    db.exec('ALTER TABLE users ADD COLUMN campus_verified INTEGER NOT NULL DEFAULT 0');
  }

  const listingCols = db.prepare('PRAGMA table_info(listings)').all() as { name: string }[];
  const listingColSet = new Set(listingCols.map((c) => c.name));
  const migrations: [string, string][] = [
    ['min_acceptable_price', 'ALTER TABLE listings ADD COLUMN min_acceptable_price INTEGER'],
    ['negotiable', 'ALTER TABLE listings ADD COLUMN negotiable INTEGER NOT NULL DEFAULT 1'],
    ['transaction_type', "ALTER TABLE listings ADD COLUMN transaction_type TEXT NOT NULL DEFAULT 'sale'"],
    ['swap_categories', "ALTER TABLE listings ADD COLUMN swap_categories TEXT NOT NULL DEFAULT '[]'"],
    ['swap_multi_ok', 'ALTER TABLE listings ADD COLUMN swap_multi_ok INTEGER NOT NULL DEFAULT 0'],
    ['borrow_min_days', 'ALTER TABLE listings ADD COLUMN borrow_min_days INTEGER'],
    ['borrow_max_days', 'ALTER TABLE listings ADD COLUMN borrow_max_days INTEGER'],
    ['collection_location', "ALTER TABLE listings ADD COLUMN collection_location TEXT NOT NULL DEFAULT 'Central Library Steps'"],
    ['borrow_conditions', "ALTER TABLE listings ADD COLUMN borrow_conditions TEXT NOT NULL DEFAULT ''"],
    ['available_from', 'ALTER TABLE listings ADD COLUMN available_from TEXT'],
    ['available_until', 'ALTER TABLE listings ADD COLUMN available_until TEXT'],
    ['mascot_text', "ALTER TABLE listings ADD COLUMN mascot_text TEXT NOT NULL DEFAULT ''"],
    ['mascot_icon', "ALTER TABLE listings ADD COLUMN mascot_icon TEXT NOT NULL DEFAULT '🤖'"],
    ['image_url', 'ALTER TABLE listings ADD COLUMN image_url TEXT'],
    ['video_url', 'ALTER TABLE listings ADD COLUMN video_url TEXT'],
  ];

  for (const [col, sql] of migrations) {
    if (!listingColSet.has(col)) {
      db.exec(sql);
    }
  }
}

export function getDb(): DatabaseSync {
  if (!_db) {
    if (!fs.existsSync(DB_PATH)) {
      execFileSync('python3', [path.join(ROOT_DIR, 'seed.py')], { stdio: 'inherit' });
    }
    _db = new DatabaseSync(DB_PATH);
    ensureSchemaUpgraded(_db);
  }
  return _db;
}

export interface RawUserRow {
  id: string;
  nickname: string;
  branch: string;
  year: number;
  hostel: string;
  avatar_emoji: string;
  profile_stickers: string;
  theme_color: string;
  bio: string;
  status_line: string;
  completed_trades: number;
  cancelled_trades: number;
  avg_response_mins: number;
  condition_accuracy: number;
  rent_on_time: number;
  rent_late: number;
  campus_verified?: number;
}

export function computeTrustBadge(u: RawUserRow): TrustBadge {
  const totalRentals = u.rent_on_time + u.rent_late;
  if (u.completed_trades === 0 && totalRentals === 0) {
    return {
      level: 'New here',
      score: 0,
      summary: 'No completed campus trades yet — meet in public campus spots for first handover.',
      breakdown: [
        { label: 'Completed trades', value: '0', impact: 'New account' },
        { label: 'Avg response', value: `${u.avg_response_mins}m`, impact: 'Baseline' },
        { label: 'Cancellations', value: '0', impact: 'Clean slate' },
      ],
    };
  }

  let score = 45;
  score += Math.min(28, u.completed_trades * 2);
  score += u.avg_response_mins <= 15 ? 10 : u.avg_response_mins <= 30 ? 6 : 2;
  score += Math.round((u.condition_accuracy - 3.5) * 8);
  score += u.rent_on_time * 3;
  score -= u.cancelled_trades * 8;
  score -= u.rent_late * 7;
  score = Math.max(10, Math.min(100, score));

  let level: TrustLevel = 'Newbie';
  if (score >= 88 && u.completed_trades >= 10) {
    level = 'Campus Legend';
  } else if (score >= 74 && u.completed_trades >= 5) {
    level = 'Trusted';
  } else if (score >= 58 && u.completed_trades >= 2) {
    level = 'Reliable';
  }

  const onTimePct =
    totalRentals > 0 ? `${Math.round((u.rent_on_time / totalRentals) * 100)}% (${u.rent_on_time}/${totalRentals})` : 'No rentals yet';

  const breakdown: TrustBreakdownItem[] = [
    {
      label: 'Completed trades',
      value: `${u.completed_trades}`,
      impact: `+${Math.min(28, u.completed_trades * 2)} pts`,
    },
    {
      label: 'Response speed',
      value: `${u.avg_response_mins} mins avg`,
      impact: u.avg_response_mins <= 15 ? '+10 pts (Fast)' : u.avg_response_mins <= 30 ? '+6 pts' : '+2 pts',
    },
    {
      label: 'Condition accuracy',
      value: `${u.condition_accuracy.toFixed(1)} / 5.0`,
      impact: `+${Math.round((u.condition_accuracy - 3.5) * 8)} pts`,
    },
    {
      label: 'On-time rent returns',
      value: onTimePct,
      impact: u.rent_late > 0 ? `-${u.rent_late * 7} pts (${u.rent_late} late)` : `+${u.rent_on_time * 3} pts`,
    },
    {
      label: 'Cancellations',
      value: `${u.cancelled_trades}`,
      impact: u.cancelled_trades > 0 ? `-${u.cancelled_trades * 8} pts` : '0 penalty',
    },
  ];

  const rentNote =
    u.rent_on_time >= 2 && u.rent_late === 0 ? ' · Reliable renter' : '';

  return {
    level,
    score,
    summary: `${level} (${score}/100) · ${u.completed_trades} trades · ${u.condition_accuracy.toFixed(1)}★ accuracy${rentNote}`,
    breakdown,
  };
}

export function hydrateUser(u: RawUserRow): UserProfile {
  let stickers: string[] = [];
  try {
    stickers = JSON.parse(u.profile_stickers);
  } catch {
    stickers = [];
  }
  return {
    id: u.id,
    nickname: u.nickname,
    branch: u.branch,
    year: u.year,
    hostel: u.hostel,
    avatar_emoji: u.avatar_emoji,
    profile_stickers: stickers,
    theme_color: u.theme_color,
    bio: u.bio,
    status_line: u.status_line,
    completed_trades: u.completed_trades,
    cancelled_trades: u.cancelled_trades,
    avg_response_mins: u.avg_response_mins,
    condition_accuracy: u.condition_accuracy,
    rent_on_time: u.rent_on_time,
    rent_late: u.rent_late,
    campus_verified: Boolean(u.campus_verified),
    trust_badge: computeTrustBadge(u),
  };
}
