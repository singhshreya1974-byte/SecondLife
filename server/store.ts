import fs from 'fs';
import type {
  AppNotification,
  BidEntry,
  Category,
  CollegeEvent,
  CounterOffer,
  DashboardData,
  ImpactStats,
  ListingItem,
  ListingType,
  LostFoundPost,
  NeedRequest,
  PastSaleRecord,
  RentalRecord,
  SellerListingStatus,
  SellerOfferItem,
  SwapProposal,
  UserProfile,
} from '../src/shared/types.ts';
import { getDb, hydrateUser, INSIGHTS_PATH, type RawUserRow } from './db.ts';
import { generateItemMascot } from './mascot.ts';
import { conditionToSticker, inferCategory, normalizeCondition, suggestPriceFromDb } from './pricing.ts';

const WASTE_KG_PER_CATEGORY: Record<Category, number> = {
  Books: 1.4,
  Calculators: 0.45,
  Cycles: 14.5,
  'Lab Gear': 1.2,
  Electronics: 0.65,
  'Hostel Items': 2.2,
};

function computeDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function computeFairnessTag(asking: number, fair: number): 'Steal' | 'Fair' | 'Overpriced' {
  const ratio = asking / Math.max(1, fair);
  if (ratio <= 0.88) return 'Steal';
  if (ratio <= 1.12) return 'Fair';
  return 'Overpriced';
}

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export function getAllUsers(): UserProfile[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM users ORDER BY completed_trades DESC, id ASC').all() as unknown as RawUserRow[];
  return rows.map(hydrateUser);
}

export function getUserById(id: string): UserProfile | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as RawUserRow | undefined;
  return row ? hydrateUser(row) : null;
}

export function updateUserProfile(
  id: string,
  payload: {
    avatar_emoji?: string;
    profile_stickers?: string[];
    theme_color?: string;
    bio?: string;
    status_line?: string;
  }
): UserProfile | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as RawUserRow | undefined;
  if (!existing) return null;

  const avatar = payload.avatar_emoji || existing.avatar_emoji;
  const stickers = payload.profile_stickers
    ? JSON.stringify(payload.profile_stickers.slice(0, 5))
    : existing.profile_stickers;
  const theme = payload.theme_color || existing.theme_color;
  const bio = typeof payload.bio === 'string' ? payload.bio.trim() : existing.bio;
  const statusLine =
    typeof payload.status_line === 'string' ? payload.status_line.trim() : existing.status_line;

  db.prepare(
    `UPDATE users SET avatar_emoji = ?, profile_stickers = ?, theme_color = ?, bio = ?, status_line = ? WHERE id = ?`
  ).run(avatar, stickers, theme, bio, statusLine, id);

  return getUserById(id);
}

export function verifyCampusUser(
  id: string,
  campusCode: string
): { user?: UserProfile; error?: string; statusCode?: number } {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as RawUserRow | undefined;
  if (!existing) return { error: 'User not found', statusCode: 404 };

  const cleaned = (campusCode || '').trim();
  if (!/^[A-Za-z0-9-]{6,20}$/.test(cleaned)) {
    return {
      error: 'Enter a valid 6–20 character campus roll code (e.g., 2023ME042) to verify.',
      statusCode: 400,
    };
  }

  db.prepare('UPDATE users SET campus_verified = 1 WHERE id = ?').run(id);
  return { user: getUserById(id)! };
}

function hydrateListing(row: Record<string, unknown>): ListingItem {
  const db = getDb();
  const seller =
    getUserById(String(row.seller_id)) ||
    hydrateUser({
      id: String(row.seller_id),
      nickname: 'CampusUser',
      branch: 'All',
      year: 4,
      hostel: 'Campus',
      avatar_emoji: '🌱',
      profile_stickers: '[]',
      theme_color: '#184D38',
      bio: '',
      status_line: '',
      completed_trades: 0,
      cancelled_trades: 0,
      avg_response_mins: 20,
      condition_accuracy: 5.0,
      rent_on_time: 0,
      rent_late: 0,
    });

  const bidRows = db
    .prepare(
      `SELECT b.*, u.nickname AS bidder_nickname, u.avatar_emoji AS bidder_avatar,
              u.completed_trades, u.cancelled_trades, u.avg_response_mins,
              u.condition_accuracy, u.rent_on_time, u.rent_late
       FROM bids b LEFT JOIN users u ON b.bidder_id = u.id
       WHERE b.listing_id = ? ORDER BY b.amount DESC`
    )
    .all(String(row.id)) as Record<string, unknown>[];

  const bids: BidEntry[] = bidRows.map((b) => {
    const bidder = getUserById(String(b.bidder_id));
    return {
      id: String(b.id),
      listing_id: String(b.listing_id),
      bidder_id: String(b.bidder_id),
      bidder_nickname: bidder?.nickname || String(b.bidder_nickname || 'Junior'),
      bidder_avatar: bidder?.avatar_emoji || '🌱',
      bidder_trust: bidder?.trust_badge.level || 'New here',
      amount: Number(b.amount),
      created_at: String(b.created_at),
    };
  });

  const coRows = db
    .prepare('SELECT * FROM counter_offers WHERE listing_id = ? ORDER BY rowid DESC')
    .all(String(row.id)) as Record<string, unknown>[];

  const counterOffers: CounterOffer[] = coRows.map((c) => {
    const buyer = getUserById(String(c.buyer_id));
    return {
      id: String(c.id),
      listing_id: String(c.listing_id),
      buyer_id: String(c.buyer_id),
      buyer_nickname: buyer?.nickname || 'JuniorBuyer',
      buyer_trust: buyer?.trust_badge.level || 'New here',
      offer_amount: Number(c.offer_amount),
      message: String(c.message),
      status: String(c.status) as CounterOffer['status'],
      created_at: String(c.created_at),
    };
  });

  const eventRow = row.event_id
    ? (db.prepare('SELECT name FROM events WHERE id = ?').get(String(row.event_id)) as
        | { name: string }
        | undefined)
    : undefined;

  const asking = Number(row.asking_price);
  const suggested = Number(row.suggested_price);
  const category = String(row.category) as Category;
  const condition = String(row.condition) as ListingItem['condition'];
  const ageYears = Number(row.age_years);
  const parsedTypes = safeJsonParse<ListingType[]>(String(row.listing_types), ['sale']);
  const primaryType = (String(row.transaction_type || parsedTypes[0] || 'sale') as ListingType);

  const generatedMascot = generateItemMascot({
    title: String(row.title),
    category,
    age_years: ageYears,
    condition,
    transaction_type: primaryType,
  });

  const mascot = {
    name: generatedMascot.name,
    emoji: String(row.mascot_icon || '') || generatedMascot.emoji,
    line: String(row.mascot_text || '') || generatedMascot.line,
  };

  // CRITICAL: Explicitly construct public ListingItem WITHOUT private min_acceptable_price
  return {
    id: String(row.id),
    title: String(row.title),
    category,
    subcategory: String(row.subcategory),
    condition,
    condition_sticker: String(row.condition_sticker) as ListingItem['condition_sticker'],
    age_years: ageYears,
    original_price: Number(row.original_price),
    asking_price: asking,
    negotiable: row.negotiable !== undefined ? Boolean(row.negotiable) : true,
    suggested_price: suggested,
    quick_sale_price: Number(row.quick_sale_price),
    patient_price: Number(row.patient_price),
    fairness_tag: computeFairnessTag(asking > 0 ? asking : suggested, suggested),
    rent_per_week: Number(row.rent_per_week),
    suggested_deposit: Number(row.suggested_deposit),
    transaction_type: primaryType,
    listing_types: parsedTypes.includes(primaryType) ? parsedTypes : [primaryType, ...parsedTypes],
    swap_for: String(row.swap_for || ''),
    swap_categories: safeJsonParse<Category[]>(String(row.swap_categories || '[]'), []),
    swap_multi_ok: Boolean(row.swap_multi_ok),
    borrow_min_days:
      row.borrow_min_days !== null && row.borrow_min_days !== undefined
        ? Number(row.borrow_min_days)
        : null,
    borrow_max_days:
      row.borrow_max_days !== null && row.borrow_max_days !== undefined
        ? Number(row.borrow_max_days)
        : null,
    collection_location: String(row.collection_location || 'Central Library Steps'),
    borrow_conditions: String(row.borrow_conditions || ''),
    available_from: row.available_from ? String(row.available_from) : null,
    available_until: row.available_until ? String(row.available_until) : null,
    image_url: row.image_url ? String(row.image_url) : null,
    video_url: row.video_url ? String(row.video_url) : null,
    mascot,
    description: String(row.description || ''),
    monologue: String(row.monologue || ''),
    addons: safeJsonParse<string[]>(String(row.addons), []),
    handwritten_notes: Boolean(row.handwritten_notes),
    color: String(row.color || 'Standard'),
    edition: String(row.edition || 'Standard'),
    branch: String(row.branch || 'All'),
    semester: String(row.semester || 'All'),
    custom_note: String(row.custom_note || ''),
    seller_id: String(row.seller_id),
    seller,
    event_id: row.event_id ? String(row.event_id) : null,
    event_name: eventRow?.name ?? null,
    leaving_campus_date: row.leaving_campus_date ? String(row.leaving_campus_date) : null,
    days_until_leaving: computeDaysUntil(
      row.leaving_campus_date ? String(row.leaving_campus_date) : null
    ),
    allow_bidding: Boolean(row.allow_bidding),
    bids,
    counter_offers: counterOffers,
    status: String(row.status) as ListingItem['status'],
    created_at: String(row.created_at),
  };
}

export function queryListings(filters: {
  category?: string;
  subcategory?: string;
  min_price?: number;
  max_price?: number;
  condition?: string;
  type?: string;
  branch?: string;
  semester?: string;
  event_id?: string;
  q?: string;
  sort?: string;
}): ListingItem[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all() as Record<
    string,
    unknown
  >[];
  let items = rows.map(hydrateListing);

  if (filters.category && filters.category !== 'All') {
    items = items.filter((i) => i.category === filters.category);
  }
  if (filters.subcategory && filters.subcategory !== 'All') {
    items = items.filter((i) => i.subcategory === filters.subcategory);
  }
  if (filters.condition && filters.condition !== 'All') {
    const norm = filters.condition.toLowerCase();
    items = items.filter(
      (i) =>
        i.condition.toLowerCase() === norm ||
        i.condition_sticker.toLowerCase() === norm
    );
  }
  if (filters.type && filters.type !== 'all') {
    const t = filters.type as ListingType;
    items = items.filter((i) => i.transaction_type === t || i.listing_types.includes(t));
  }
  if (filters.branch && filters.branch !== 'All') {
    items = items.filter((i) => i.branch === 'All' || i.branch === filters.branch);
  }
  if (filters.semester && filters.semester !== 'All') {
    items = items.filter((i) => i.semester === 'All' || i.semester === filters.semester);
  }
  if (filters.event_id && filters.event_id !== 'All') {
    items = items.filter((i) => i.event_id === filters.event_id);
  }
  if (typeof filters.min_price === 'number' && filters.min_price > 0) {
    items = items.filter((i) => i.asking_price >= filters.min_price!);
  }
  if (typeof filters.max_price === 'number' && filters.max_price > 0) {
    items = items.filter((i) => i.asking_price <= filters.max_price!);
  }
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    items = items.filter((i) =>
      `${i.title} ${i.category} ${i.subcategory} ${i.monologue} ${i.description} ${i.branch} ${i.semester} ${i.custom_note}`
        .toLowerCase()
        .includes(q)
    );
  }

  if (filters.sort === 'price_asc') {
    items.sort((a, b) => a.asking_price - b.asking_price);
  } else if (filters.sort === 'price_desc') {
    items.sort((a, b) => b.asking_price - a.asking_price);
  } else if (filters.sort === 'best_deal') {
    items.sort(
      (a, b) => a.asking_price / Math.max(1, a.suggested_price) - b.asking_price / Math.max(1, b.suggested_price)
    );
  }

  return items;
}

export function getListingById(id: string): ListingItem | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? hydrateListing(row) : null;
}

export function createListing(payload: {
  title: string;
  category?: string;
  subcategory?: string;
  condition?: string;
  age?: number;
  original_price?: number;
  asking_price?: number;
  min_acceptable_price?: number | null;
  negotiable?: boolean;
  transaction_type?: ListingType;
  listing_types?: ListingType[];
  swap_for?: string;
  swap_categories?: Category[];
  swap_multi_ok?: boolean;
  borrow_min_days?: number | null;
  borrow_max_days?: number | null;
  collection_location?: string;
  borrow_conditions?: string;
  available_from?: string | null;
  available_until?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  rent_per_week?: number;
  suggested_deposit?: number;
  description?: string;
  monologue?: string;
  addons?: string[];
  handwritten_notes?: boolean;
  color?: string;
  edition?: string;
  branch?: string;
  semester?: string;
  custom_note?: string;
  seller_id?: string;
  event_id?: string | null;
  leaving_campus_date?: string | null;
  allow_bidding?: boolean;
}): {
  listing?: ListingItem;
  triggered_notifications?: AppNotification[];
  error?: string;
  statusCode?: number;
} {
  const db = getDb();
  const title = (payload.title || '').trim();
  if (!title) {
    return { error: 'Listing title is required', statusCode: 400 };
  }

  // Reject negative numeric inputs
  if (
    (payload.original_price !== undefined && Number(payload.original_price) < 0) ||
    (payload.asking_price !== undefined && Number(payload.asking_price) < 0) ||
    (payload.min_acceptable_price !== undefined &&
      payload.min_acceptable_price !== null &&
      Number(payload.min_acceptable_price) < 0) ||
    (payload.rent_per_week !== undefined && Number(payload.rent_per_week) < 0) ||
    (payload.suggested_deposit !== undefined && Number(payload.suggested_deposit) < 0) ||
    (payload.age !== undefined && Number(payload.age) < 0)
  ) {
    return { error: 'Prices, deposits, and age cannot be negative.', statusCode: 400 };
  }

  const sellerId = payload.seller_id || 'USR-01';
  const duplicate = db
    .prepare(
      `SELECT id FROM listings WHERE seller_id = ? AND LOWER(title) = LOWER(?) AND status = 'available'`
    )
    .get(sellerId, title);

  if (duplicate) {
    return {
      error: `Duplicate listing: "${title}" is already listed by this seller.`,
      statusCode: 409,
    };
  }

  const allowedTypes: ListingType[] = ['sale', 'swap', 'borrow', 'rent'];
  const rawListingTypes = Array.isArray(payload.listing_types)
    ? payload.listing_types.filter((t): t is ListingType => allowedTypes.includes(t))
    : [];
  const primaryType: ListingType =
    payload.transaction_type && allowedTypes.includes(payload.transaction_type)
      ? payload.transaction_type
      : rawListingTypes[0] || 'sale';
  const listingTypes: ListingType[] =
    rawListingTypes.length > 0
      ? rawListingTypes.includes(primaryType)
        ? rawListingTypes
        : [primaryType, ...rawListingTypes]
      : [primaryType];

  const { category } = inferCategory(payload.category, title);
  const condition = normalizeCondition(payload.condition);
  const sticker = conditionToSticker(condition);
  const ageYears = Math.max(0, Number(payload.age) || 1);
  const daysUntilLeaving = computeDaysUntil(payload.leaving_campus_date);

  const suggestion = suggestPriceFromDb({
    category,
    item: title,
    age: ageYears,
    condition,
    original_price: payload.original_price,
    type: primaryType,
    leaving_days: daysUntilLeaving,
  });

  const origPrice = suggestion.inferred_original_price;

  let askingPrice = 0;
  if (primaryType === 'borrow') {
    askingPrice = 0;
  } else if (primaryType === 'swap') {
    const rawAsk = Number(payload.asking_price);
    askingPrice = Number.isFinite(rawAsk) && rawAsk >= 0 ? rawAsk : 0;
  } else {
    const rawAsk = Number(payload.asking_price);
    askingPrice =
      Number.isFinite(rawAsk) && rawAsk > 0 ? Math.round(rawAsk) : suggestion.fair_price;
  }

  let minAcceptablePrice: number | null = null;
  if (
    primaryType === 'sale' &&
    payload.min_acceptable_price !== undefined &&
    payload.min_acceptable_price !== null &&
    String(payload.min_acceptable_price) !== ''
  ) {
    const parsedMin = Math.round(Number(payload.min_acceptable_price));
    if (!Number.isFinite(parsedMin) || parsedMin < 0) {
      return { error: 'Minimum acceptable price must be valid and non-negative.', statusCode: 400 };
    }
    if (parsedMin > askingPrice) {
      return {
        error: 'Private minimum acceptable price cannot exceed your asking price.',
        statusCode: 400,
      };
    }
    minAcceptablePrice = parsedMin;
  }

  const borrowMinDays =
    payload.borrow_min_days !== undefined && payload.borrow_min_days !== null
      ? Math.max(1, Math.round(Number(payload.borrow_min_days)))
      : primaryType === 'borrow' || primaryType === 'rent'
        ? 1
        : null;
  const borrowMaxDays =
    payload.borrow_max_days !== undefined && payload.borrow_max_days !== null
      ? Math.max(1, Math.round(Number(payload.borrow_max_days)))
      : primaryType === 'borrow' || primaryType === 'rent'
        ? 7
        : null;

  if (borrowMinDays !== null && borrowMaxDays !== null && borrowMaxDays < borrowMinDays) {
    return { error: 'Maximum duration cannot be less than minimum duration.', statusCode: 400 };
  }

  const rentPerWeek =
    primaryType === 'borrow'
      ? 0
      : payload.rent_per_week !== undefined && Number(payload.rent_per_week) > 0
        ? Math.round(Number(payload.rent_per_week))
        : suggestion.rent_price_per_week;

  const suggestedDeposit =
    payload.suggested_deposit !== undefined && Number(payload.suggested_deposit) >= 0
      ? Math.round(Number(payload.suggested_deposit))
      : primaryType === 'borrow'
        ? 0
        : suggestion.suggested_deposit;

  const collectionLocation =
    (payload.collection_location || '').trim() || 'Central Library Steps';
  const borrowConditions = (payload.borrow_conditions || '').trim();
  const negotiable =
    primaryType === 'borrow' ? 0 : payload.negotiable === false ? 0 : 1;

  const branch = payload.branch || 'All';
  const semester = payload.semester || 'All';
  const mascot = generateItemMascot({
    title,
    category,
    age_years: ageYears,
    condition,
    transaction_type: primaryType,
  });
  const defaultVoice =
    primaryType === 'borrow'
      ? `Free campus borrow! I'm a ${title} (${ageYears}y old) waiting at ${collectionLocation}.`
      : `Hi, I'm a ${title}. I survived ${ageYears} ${ageYears === 1 ? 'year' : 'years'} of ${branch === 'All' ? 'campus life' : branch} and I still work!`;
  const monologue = (payload.monologue || '').trim() || defaultVoice;

  const id = `LST-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`;
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO listings (
      id, title, category, subcategory, condition, condition_sticker, age_years,
      original_price, asking_price, min_acceptable_price, negotiable,
      suggested_price, quick_sale_price, patient_price, rent_per_week, suggested_deposit,
      transaction_type, listing_types, swap_for, swap_categories, swap_multi_ok,
      borrow_min_days, borrow_max_days, collection_location, borrow_conditions,
      available_from, available_until, image_url, video_url, mascot_text, mascot_icon,
      description, monologue, addons, handwritten_notes, color, edition, branch, semester, custom_note,
      seller_id, event_id, leaving_campus_date, allow_bidding, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?)`
  ).run(
    id,
    title,
    category,
    payload.subcategory || 'General',
    condition,
    sticker,
    ageYears,
    origPrice,
    Math.round(askingPrice),
    minAcceptablePrice,
    negotiable,
    suggestion.fair_price,
    suggestion.quick_sale_price,
    suggestion.patient_price,
    rentPerWeek,
    suggestedDeposit,
    primaryType,
    JSON.stringify(listingTypes),
    payload.swap_for || '',
    JSON.stringify(Array.isArray(payload.swap_categories) ? payload.swap_categories : []),
    payload.swap_multi_ok ? 1 : 0,
    borrowMinDays,
    borrowMaxDays,
    collectionLocation,
    borrowConditions,
    payload.available_from || null,
    payload.available_until || null,
    payload.image_url?.trim() || null,
    payload.video_url?.trim() || null,
    mascot.line,
    mascot.emoji,
    payload.description || `${category} in ${condition} condition.`,
    monologue,
    JSON.stringify(payload.addons || []),
    payload.handwritten_notes ? 1 : 0,
    payload.color || 'Standard',
    payload.edition || 'Standard',
    branch,
    semester,
    payload.custom_note || '',
    sellerId,
    payload.event_id || null,
    payload.leaving_campus_date || null,
    primaryType === 'sale' && payload.allow_bidding !== false ? 1 : 0,
    createdAt
  );

  // Check matching open Needs and create live notifications!
  const openNeeds = db.prepare('SELECT * FROM needs').all() as Record<string, unknown>[];
  const triggered: AppNotification[] = [];

  for (const n of openNeeds) {
    const needCat = String(n.category);
    const needBudget = Number(n.max_budget);
    const needBranch = String(n.branch);
    const needWords = String(n.title)
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    const catMatch = needCat === category;
    const budgetOk =
      primaryType === 'borrow' ||
      primaryType === 'swap' ||
      askingPrice <= needBudget * 1.15;
    const branchOk = needBranch === 'All' || branch === 'All' || needBranch === branch;
    const keywordOk =
      needWords.some((w) => title.toLowerCase().includes(w)) || needWords.length === 0;

    if (catMatch && budgetOk && branchOk && (keywordOk || branch !== 'All')) {
      const ntfId = `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const priceLabel =
        primaryType === 'borrow'
          ? 'Free Borrow'
          : primaryType === 'swap'
            ? 'Open Swap'
            : `₹${Math.round(askingPrice).toLocaleString('en-IN')}`;
      const msg = `"${title}" was just listed (${priceLabel} · ${sticker}), matching "${String(n.title)}"!`;
      db.prepare(
        `INSERT INTO notifications (id, type, title, message, listing_id, need_id, is_read, created_at)
         VALUES (?, 'need_match', ?, ?, ?, ?, 0, 'Just now')`
      ).run(ntfId, `Need Match: ${String(n.title)}`, msg, id, String(n.id));

      triggered.push({
        id: ntfId,
        type: 'need_match',
        title: `Need Match: ${String(n.title)}`,
        message: msg,
        listing_id: id,
        need_id: String(n.id),
        is_read: false,
        created_at: 'Just now',
      });
    }
  }

  return {
    listing: getListingById(id)!,
    triggered_notifications: triggered,
  };
}

export function addBid(
  listingId: string,
  payload: { bidder_id?: string; amount: number }
): { listing?: ListingItem; error?: string; statusCode?: number } {
  const db = getDb();
  const listing = getListingById(listingId);
  if (!listing) return { error: 'Listing not found', statusCode: 404 };
  if (!listing.allow_bidding) return { error: 'Bidding disabled on this item', statusCode: 400 };

  const currentTop =
    listing.bids.length > 0
      ? Math.max(...listing.bids.map((b) => b.amount))
      : listing.asking_price - 1;
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= currentTop) {
    return {
      error: `Bid must exceed ₹${currentTop.toLocaleString('en-IN')}`,
      statusCode: 400,
    };
  }

  const bidderId = payload.bidder_id || 'USR-28';
  const bidId = `BID-${Date.now().toString().slice(-5)}`;
  db.prepare(
    'INSERT INTO bids (id, listing_id, bidder_id, amount, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(bidId, listingId, bidderId, Math.round(amount), 'Just now');

  const bidder = getUserById(bidderId);
  if (listing.bids.length > 0) {
    const prevTop = listing.bids[0];
    if (prevTop.bidder_id !== bidderId) {
      db.prepare(
        `INSERT INTO notifications (id, type, title, message, listing_id, need_id, is_read, created_at)
         VALUES (?, 'outbid', ?, ?, ?, NULL, 0, 'Just now')`
      ).run(
        `NTF-${Date.now()}`,
        `New competing bid on ${listing.title}`,
        `${bidder?.nickname || 'Buyer'} bid ₹${Math.round(amount)} (outbidding ${prevTop.bidder_nickname}).`,
        listingId
      );
    }
  }

  return { listing: getListingById(listingId)! };
}

export function addCounterOffer(
  listingId: string,
  payload: { buyer_id?: string; offer_amount: number; message?: string }
): { counter_offer?: CounterOffer; listing?: ListingItem; error?: string; statusCode?: number } {
  const db = getDb();
  const listing = getListingById(listingId);
  if (!listing) return { error: 'Listing not found', statusCode: 404 };

  const offerAmount = Number(payload.offer_amount);
  if (!Number.isFinite(offerAmount) || offerAmount <= 0) {
    return { error: 'Counter-offer amount must be positive', statusCode: 400 };
  }

  const buyerId = payload.buyer_id || 'USR-28';
  const buyer = getUserById(buyerId);
  const coId = `CO-${Date.now().toString().slice(-5)}`;
  const msg = (payload.message || '').trim() || `Offering ₹${offerAmount} for quick campus pickup.`;

  db.prepare(
    `INSERT INTO counter_offers (id, listing_id, buyer_id, offer_amount, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 'Just now')`
  ).run(coId, listingId, buyerId, Math.round(offerAmount), msg);

  db.prepare(
    `INSERT INTO notifications (id, type, title, message, listing_id, need_id, is_read, created_at)
     VALUES (?, 'counter_offer', ?, ?, ?, NULL, 0, 'Just now')`
  ).run(
    `NTF-${Date.now()}`,
    `Counter-offer on ${listing.title}`,
    `${buyer?.nickname || 'Junior'} suggested ₹${Math.round(offerAmount)}: "${msg}"`,
    listingId
  );

  return {
    counter_offer: {
      id: coId,
      listing_id: listingId,
      buyer_id: buyerId,
      buyer_nickname: buyer?.nickname || 'Junior',
      buyer_trust: buyer?.trust_badge.level || 'New here',
      offer_amount: Math.round(offerAmount),
      message: msg,
      status: 'pending',
      created_at: 'Just now',
    },
    listing: getListingById(listingId)!,
  };
}

export function getAllSwaps(): SwapProposal[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.*, l.title AS listing_title FROM swaps s
       LEFT JOIN listings l ON s.listing_id = l.id
       ORDER BY s.rowid DESC`
    )
    .all() as Record<string, unknown>[];

  return rows.map((r) => {
    const proposer = getUserById(String(r.proposer_id));
    const diff = Number(r.value_balance_diff);
    const targetVal = Number(r.target_value);
    return {
      id: String(r.id),
      listing_id: String(r.listing_id),
      listing_title: String(r.listing_title || 'Campus Item'),
      proposer_id: String(r.proposer_id),
      proposer_nickname: proposer?.nickname || 'Student',
      proposer_trust: proposer?.trust_badge.level || 'New here',
      offered_item: String(r.offered_item),
      offered_value: Number(r.offered_value),
      target_value: targetVal,
      value_balance_diff: diff,
      balance_text: String(r.balance_text),
      unbalanced_warning:
        Math.abs(diff) > targetVal * 0.4
          ? `Large value gap (${Math.abs(diff)} INR) — consider adding cash or bundling an accessory.`
          : undefined,
      status: String(r.status) as SwapProposal['status'],
      created_at: String(r.created_at),
    };
  });
}

export function createSwapProposal(payload: {
  listing_id: string;
  proposer_id?: string;
  offered_item: string;
  offered_value?: number;
}): { swap?: SwapProposal; error?: string; statusCode?: number } {
  const db = getDb();
  const listing = getListingById(payload.listing_id);
  if (!listing) return { error: 'Target listing not found', statusCode: 404 };

  const offeredItem = (payload.offered_item || '').trim();
  if (!offeredItem) return { error: 'Offered swap item name is required', statusCode: 400 };

  let offeredValue = Number(payload.offered_value);
  if (!Number.isFinite(offeredValue) || offeredValue <= 0) {
    offeredValue = suggestPriceFromDb({ item: offeredItem, age: 1, condition: 'Good' }).swap_value;
  }

  const targetValue = listing.suggested_price || listing.asking_price;
  const diff = Math.round(offeredValue - targetValue);
  const balanceText =
    diff === 0
      ? 'Even swap (₹0 difference)'
      : diff < 0
        ? `You owe ₹${Math.abs(diff)}`
        : `They owe you ₹${diff}`;

  const proposerId = payload.proposer_id || 'USR-14';
  const proposer = getUserById(proposerId);
  const id = `SWP-${Date.now().toString().slice(-5)}`;

  db.prepare(
    `INSERT INTO swaps (id, listing_id, proposer_id, offered_item, offered_value, target_value, value_balance_diff, balance_text, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'Just now')`
  ).run(id, listing.id, proposerId, offeredItem, Math.round(offeredValue), targetValue, diff, balanceText);

  return {
    swap: {
      id,
      listing_id: listing.id,
      listing_title: listing.title,
      proposer_id: proposerId,
      proposer_nickname: proposer?.nickname || 'Student',
      proposer_trust: proposer?.trust_badge.level || 'New here',
      offered_item: offeredItem,
      offered_value: Math.round(offeredValue),
      target_value: targetValue,
      value_balance_diff: diff,
      balance_text: balanceText,
      unbalanced_warning:
        Math.abs(diff) > targetValue * 0.4
          ? `Unbalanced swap: ₹${Math.abs(diff)} gap (>40% of item value).`
          : undefined,
      status: 'pending',
      created_at: 'Just now',
    },
  };
}

export function updateSwapStatus(
  id: string,
  status: 'accepted' | 'declined'
): { swap?: SwapProposal; error?: string } {
  const db = getDb();
  const row = db.prepare('SELECT * FROM swaps WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return { error: 'Swap proposal not found' };

  db.prepare('UPDATE swaps SET status = ? WHERE id = ?').run(status, id);
  if (status === 'accepted') {
    db.prepare(`UPDATE listings SET status = 'swapped' WHERE id = ?`).run(String(row.listing_id));
  }
  const updated = getAllSwaps().find((s) => s.id === id);
  return { swap: updated };
}

export function getAllRentals(): RentalRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT r.*, l.title AS listing_title FROM rentals r
       LEFT JOIN listings l ON r.listing_id = l.id
       ORDER BY r.rowid DESC`
    )
    .all() as Record<string, unknown>[];

  return rows.map((r) => {
    const renter = getUserById(String(r.renter_id));
    return {
      id: String(r.id),
      listing_id: String(r.listing_id),
      listing_title: String(r.listing_title || 'Campus Item'),
      renter_id: String(r.renter_id),
      renter_nickname: renter?.nickname || 'Student',
      renter_trust: renter?.trust_badge.level || 'New here',
      start_date: String(r.start_date),
      end_date: String(r.end_date),
      weekly_rate: Number(r.weekly_rate),
      deposit: Number(r.deposit),
      total_rent: Number(r.total_rent),
      status: String(r.status) as RentalRecord['status'],
      return_timeliness: r.return_timeliness
        ? (String(r.return_timeliness) as 'on_time' | 'late')
        : null,
      created_at: String(r.created_at),
    };
  });
}

export function createRental(payload: {
  listing_id: string;
  renter_id?: string;
  start_date?: string;
  end_date?: string;
}): { rental?: RentalRecord; error?: string; statusCode?: number } {
  const db = getDb();
  const listing = getListingById(payload.listing_id);
  if (!listing) return { error: 'Listing not found', statusCode: 404 };
  if (!payload.end_date || !payload.end_date.trim()) {
    return { error: 'Return date (end_date) is required for rentals.', statusCode: 400 };
  }

  const startDate = payload.start_date?.trim() || new Date().toISOString().slice(0, 10);
  const endDate = payload.end_date.trim();
  const sTime = new Date(startDate).getTime();
  const eTime = new Date(endDate).getTime();
  if (Number.isNaN(sTime) || Number.isNaN(eTime) || eTime <= sTime) {
    return { error: 'Return date must be after start date.', statusCode: 400 };
  }

  const days = Math.ceil((eTime - sTime) / (1000 * 60 * 60 * 24));
  const weeks = Math.max(1, Math.ceil(days / 7));
  const totalRent = weeks * listing.rent_per_week;
  const renterId = payload.renter_id || 'USR-20';
  const id = `RNT-${Date.now().toString().slice(-5)}`;

  db.prepare(
    `INSERT INTO rentals (id, listing_id, renter_id, start_date, end_date, weekly_rate, deposit, total_rent, status, return_timeliness, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, 'Just now')`
  ).run(id, listing.id, renterId, startDate, endDate, listing.rent_per_week, listing.suggested_deposit, totalRent);

  db.prepare(`UPDATE listings SET status = 'rented' WHERE id = ?`).run(listing.id);

  const created = getAllRentals().find((r) => r.id === id)!;
  return { rental: created };
}

export function markRentalReturned(
  id: string,
  timeliness: 'on_time' | 'late'
): { rental?: RentalRecord; error?: string } {
  const db = getDb();
  const row = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return { error: 'Rental not found' };

  db.prepare(`UPDATE rentals SET status = 'returned', return_timeliness = ? WHERE id = ?`).run(
    timeliness,
    id
  );
  db.prepare(`UPDATE listings SET status = 'available' WHERE id = ?`).run(String(row.listing_id));

  if (timeliness === 'on_time') {
    db.prepare('UPDATE users SET rent_on_time = rent_on_time + 1, completed_trades = completed_trades + 1 WHERE id = ?').run(
      String(row.renter_id)
    );
  } else {
    db.prepare('UPDATE users SET rent_late = rent_late + 1 WHERE id = ?').run(String(row.renter_id));
  }

  return { rental: getAllRentals().find((r) => r.id === id) };
}

export function getAllNeeds(): NeedRequest[] {
  const db = getDb();
  const needRows = db.prepare('SELECT * FROM needs ORDER BY rowid DESC').all() as Record<
    string,
    unknown
  >[];
  const allListings = queryListings({});

  return needRows.map((n) => {
    const requester = getUserById(String(n.requester_id));
    const cat = String(n.category) as Category;
    const maxB = Number(n.max_budget);
    const branch = String(n.branch);
    const words = String(n.title)
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    const matches = allListings.filter(
      (l) =>
        l.category === cat &&
        l.asking_price <= maxB * 1.2 &&
        (branch === 'All' || l.branch === 'All' || l.branch === branch) &&
        (words.some((w) => l.title.toLowerCase().includes(w)) || l.category === cat)
    );

    return {
      id: String(n.id),
      title: String(n.title),
      category: cat,
      branch,
      semester: String(n.semester),
      max_budget: maxB,
      requester_id: String(n.requester_id),
      requester_nickname: requester?.nickname || 'Junior',
      requester_avatar: requester?.avatar_emoji || '🌱',
      requester_trust: requester?.trust_badge.level || 'New here',
      notes: String(n.notes || ''),
      created_at: String(n.created_at),
      senior_match_count: matches.length,
      matched_listing_ids: matches.map((m) => m.id),
    };
  });
}

export function createNeed(payload: {
  title: string;
  category?: string;
  branch?: string;
  semester?: string;
  max_budget?: number;
  requester_id?: string;
  notes?: string;
}): NeedRequest {
  const db = getDb();
  const title = (payload.title || '').trim();
  const { category } = inferCategory(payload.category, title);
  const id = `NEED-${Date.now().toString().slice(-5)}`;
  const requesterId = payload.requester_id || 'USR-28';
  const maxBudget = Math.max(50, Number(payload.max_budget) || 800);

  db.prepare(
    `INSERT INTO needs (id, title, category, branch, semester, max_budget, requester_id, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    category,
    payload.branch || 'All',
    payload.semester || 'All',
    Math.round(maxBudget),
    requesterId,
    (payload.notes || '').trim() || 'Ping me when a senior posts this!',
    new Date().toISOString()
  );

  return getAllNeeds().find((n) => n.id === id)!;
}

export function getAllEvents(): CollegeEvent[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM events ORDER BY event_date ASC').all() as Record<
    string,
    unknown
  >[];
  return rows.map((e) => {
    const countRow = db
      .prepare('SELECT COUNT(*) AS cnt FROM listings WHERE event_id = ?')
      .get(String(e.id)) as { cnt: number };
    return {
      id: String(e.id),
      name: String(e.name),
      event_type: String(e.event_type),
      event_date: String(e.event_date),
      days_remaining: computeDaysUntil(String(e.event_date)) ?? 0,
      venue: String(e.venue),
      organizer: String(e.organizer),
      bundle_suggestion: String(e.bundle_suggestion),
      description: String(e.description),
      listing_count: Number(countRow.cnt || 0),
    };
  });
}

export function createEvent(payload: {
  name: string;
  event_type: string;
  event_date: string;
  venue: string;
  organizer?: string;
  bundle_suggestion?: string;
  description?: string;
}): CollegeEvent {
  const db = getDb();
  const id = `EVT-${Date.now().toString().slice(-4)}`;
  db.prepare(
    `INSERT INTO events (id, name, event_type, event_date, venue, organizer, bundle_suggestion, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    payload.name.trim(),
    payload.event_type || 'Campus Event',
    payload.event_date,
    payload.venue || 'Main Campus',
    payload.organizer || 'Student Organiser',
    payload.bundle_suggestion || 'Rent or borrow event essentials from seniors',
    payload.description || 'Community event gear exchange.'
  );
  return getAllEvents().find((e) => e.id === id)!;
}

export function submitTradeReview(
  tradeId: string,
  payload: {
    reviewer_id: string;
    reviewee_id: string;
    role: 'buyer' | 'seller';
    rating: number;
    condition_accurate: boolean;
    comment?: string;
  }
) {
  const db = getDb();
  const id = `REV-${Date.now().toString().slice(-5)}`;
  const rating = Math.min(5, Math.max(1, Number(payload.rating) || 5));

  db.prepare(
    `INSERT INTO reviews (id, trade_id, reviewer_id, reviewee_id, role, rating, condition_accurate, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Just now')`
  ).run(
    id,
    tradeId,
    payload.reviewer_id,
    payload.reviewee_id,
    payload.role,
    rating,
    payload.condition_accurate ? 1 : 0,
    (payload.comment || '').trim() || 'Smooth campus handover!'
  );

  // Update reviewee's trust metrics
  const user = db
    .prepare('SELECT completed_trades, condition_accuracy FROM users WHERE id = ?')
    .get(payload.reviewee_id) as { completed_trades: number; condition_accuracy: number } | undefined;

  if (user) {
    const newCount = user.completed_trades + 1;
    const accSample = payload.condition_accurate ? 5.0 : 3.0;
    const updatedAcc = Number(
      ((user.condition_accuracy * user.completed_trades + accSample) / newCount).toFixed(2)
    );
    db.prepare('UPDATE users SET completed_trades = ?, condition_accuracy = ? WHERE id = ?').run(
      newCount,
      updatedAcc,
      payload.reviewee_id
    );
  }

  return { ok: true, review_id: id, updated_user: getUserById(payload.reviewee_id) };
}

export function updateCounterOfferStatus(
  id: string,
  status: 'accepted' | 'declined'
): { counter_offer?: CounterOffer; error?: string } {
  const db = getDb();
  const row = db.prepare('SELECT * FROM counter_offers WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return { error: 'Offer not found' };

  db.prepare('UPDATE counter_offers SET status = ? WHERE id = ?').run(status, id);
  const listing = getListingById(String(row.listing_id));
  const buyer = getUserById(String(row.buyer_id));

  db.prepare(
    `INSERT INTO notifications (id, type, title, message, listing_id, need_id, is_read, created_at)
     VALUES (?, 'offer_decision', ?, ?, ?, NULL, 0, 'Just now')`
  ).run(
    `NTF-${Date.now()}`,
    `Offer ${status}: ${listing?.title || 'Campus Item'}`,
    `${listing?.seller.nickname || 'Seller'} ${status} ${buyer?.nickname || 'Buyer'}'s ₹${Number(row.offer_amount)} offer.`,
    String(row.listing_id)
  );

  return {
    counter_offer: {
      id: String(row.id),
      listing_id: String(row.listing_id),
      buyer_id: String(row.buyer_id),
      buyer_nickname: buyer?.nickname || 'JuniorBuyer',
      buyer_trust: buyer?.trust_badge.level || 'New here',
      offer_amount: Number(row.offer_amount),
      message: String(row.message),
      status,
      created_at: String(row.created_at),
    },
  };
}

export function getDashboardData(userId: string): DashboardData | null {
  const db = getDb();
  const user = getUserById(userId);
  if (!user) return null;

  const allListings = queryListings({});
  const allSwaps = getAllSwaps();
  const allRentals = getAllRentals();
  const allNeeds = getAllNeeds();

  // User / Buyer View: branch-personalized recommendations & buyer activity
  const recommendedListings = allListings
    .filter((l) => l.seller_id !== user.id && l.status === 'available')
    .sort((a, b) => {
      const aBranchMatch = a.branch === user.branch || a.branch === 'All' ? 1 : 0;
      const bBranchMatch = b.branch === user.branch || b.branch === 'All' ? 1 : 0;
      if (aBranchMatch !== bBranchMatch) return bBranchMatch - aBranchMatch;
      const aSteal = a.fairness_tag === 'Steal' || a.transaction_type === 'borrow' ? 1 : 0;
      const bSteal = b.fairness_tag === 'Steal' || b.transaction_type === 'borrow' ? 1 : 0;
      return bSteal - aSteal;
    })
    .slice(0, 4);

  const outgoingOffers: (CounterOffer & { listing_title: string })[] = [];
  const outgoingBids: (DashboardData['user_view']['outgoing_bids'][number])[] = [];

  for (const l of allListings) {
    for (const co of l.counter_offers) {
      if (co.buyer_id === user.id) {
        outgoingOffers.push({ ...co, listing_title: l.title });
      }
    }
    for (const b of l.bids) {
      if (b.bidder_id === user.id) {
        outgoingBids.push({ ...b, listing_title: l.title });
      }
    }
  }

  const mySwaps = allSwaps.filter((s) => s.proposer_id === user.id);
  const myRentals = allRentals.filter((r) => r.renter_id === user.id);
  const myNeeds = allNeeds.filter((n) => n.requester_id === user.id);

  // Seller View: seller-owned listings + incoming inbox (private floor evaluated server-side only)
  const sellerRawRows = db
    .prepare('SELECT id, min_acceptable_price, asking_price FROM listings WHERE seller_id = ?')
    .all(user.id) as { id: string; min_acceptable_price: number | null; asking_price: number }[];
  const floorByListing = new Map<string, number | null>(
    sellerRawRows.map((r) => [
      r.id,
      r.min_acceptable_price !== null && r.min_acceptable_price !== undefined
        ? Number(r.min_acceptable_price)
        : null,
    ])
  );

  const sellerOwnedListings = allListings.filter((l) => l.seller_id === user.id);
  const sellerListingIds = new Set(sellerOwnedListings.map((l) => l.id));

  const myListingsStatus: SellerListingStatus[] = sellerOwnedListings.map((l) => ({
    listing: l,
    has_private_floor: floorByListing.get(l.id) !== null && floorByListing.get(l.id) !== undefined,
    pending_offers_count: l.counter_offers.filter((c) => c.status === 'pending').length,
    bids_count: l.bids.length,
  }));

  const incomingOffers: SellerOfferItem[] = [];
  for (const l of sellerOwnedListings) {
    const privateFloor = floorByListing.get(l.id);
    for (const co of l.counter_offers) {
      const floorCheck: SellerOfferItem['floor_check'] =
        privateFloor === null || privateFloor === undefined
          ? 'no_floor'
          : co.offer_amount >= privateFloor
            ? 'meets_floor'
            : 'below_floor';
      incomingOffers.push({
        ...co,
        listing_title: l.title,
        asking_price: l.asking_price,
        floor_check: floorCheck,
      });
    }
  }

  const incomingSwaps = allSwaps.filter((s) => sellerListingIds.has(s.listing_id));
  const incomingRentals = allRentals.filter((r) => sellerListingIds.has(r.listing_id));

  const potentialEarnings = sellerOwnedListings.reduce((sum, l) => {
    if (l.transaction_type === 'borrow') return sum;
    if (l.transaction_type === 'rent') return sum + l.rent_per_week;
    return sum + (l.asking_price > 0 ? l.asking_price : l.suggested_price);
  }, 0);

  const pendingActionsCount =
    incomingOffers.filter((o) => o.status === 'pending').length +
    incomingSwaps.filter((s) => s.status === 'pending').length +
    incomingRentals.filter((r) => r.status === 'active').length;

  return {
    user,
    user_view: {
      recommended_listings: recommendedListings,
      outgoing_offers: outgoingOffers,
      outgoing_bids: outgoingBids,
      my_swaps: mySwaps,
      my_rentals: myRentals,
      my_needs: myNeeds,
    },
    seller_view: {
      my_listings: myListingsStatus,
      incoming_offers: incomingOffers,
      incoming_swaps: incomingSwaps,
      incoming_rentals: incomingRentals,
      potential_earnings: Math.round(potentialEarnings),
      pending_actions_count: pendingActionsCount,
    },
  };
}

export function getImpactStats(): ImpactStats {
  const db = getDb();
  const pastSales = db.prepare('SELECT * FROM past_sales').all() as unknown as PastSaleRecord[];
  const activeListings = db.prepare('SELECT * FROM listings').all() as Record<string, unknown>[];

  const categories: Category[] = [
    'Books',
    'Calculators',
    'Cycles',
    'Lab Gear',
    'Electronics',
    'Hostel Items',
  ];

  const perCategory = categories.map((cat) => {
    const psRows = pastSales.filter((r) => r.category === cat);
    const activeRows = activeListings.filter((r) => String(r.category) === cat);
    const psSaved = psRows.reduce((s, r) => s + Math.max(0, r.original_price - r.sold_price), 0);
    const activeSaved = activeRows.reduce(
      (s, r) => s + Math.max(0, Number(r.original_price) - Number(r.asking_price)),
      0
    );
    const totalCount = psRows.length + activeRows.length;
    const kgSaved = Number((totalCount * WASTE_KG_PER_CATEGORY[cat]).toFixed(1));
    return {
      category: cat,
      rupees_saved: psSaved + activeSaved,
      kg_waste_avoided: kgSaved,
      count: totalCount,
    };
  });

  let findings: ImpactStats['findings'] = [];
  if (fs.existsSync(INSIGHTS_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(INSIGHTS_PATH, 'utf-8'));
      findings = parsed.findings || [];
    } catch {
      findings = [];
    }
  }

  return {
    total_rupees_saved: perCategory.reduce((s, c) => s + c.rupees_saved, 0),
    total_kg_waste_avoided: Number(
      perCategory.reduce((s, c) => s + c.kg_waste_avoided, 0).toFixed(1)
    ),
    active_listings_count: activeListings.length,
    past_sales_count: pastSales.length,
    per_category: perCategory,
    findings,
  };
}

export function getNotifications(): AppNotification[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM notifications ORDER BY rowid DESC').all() as Record<
    string,
    unknown
  >[];
  return rows.map((r) => ({
    id: String(r.id),
    type: String(r.type),
    title: String(r.title),
    message: String(r.message),
    listing_id: r.listing_id ? String(r.listing_id) : null,
    need_id: r.need_id ? String(r.need_id) : null,
    is_read: Boolean(r.is_read),
    created_at: String(r.created_at),
  }));
}

export function markNotificationsRead(): AppNotification[] {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1').run();
  return getNotifications();
}

export function getLostFound(): LostFoundPost[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM lost_found ORDER BY rowid DESC').all() as Record<
    string,
    unknown
  >[];
  return rows.map((r) => ({
    id: String(r.id),
    post_type: String(r.post_type) as 'lost' | 'found',
    title: String(r.title),
    location: String(r.location),
    description: String(r.description),
    poster_name: String(r.poster_name),
    contact_note: String(r.contact_note),
    status: String(r.status) as 'open' | 'reunited',
    created_at: String(r.created_at),
  }));
}

export function createLostFound(payload: {
  post_type: 'lost' | 'found';
  title: string;
  location: string;
  description?: string;
  poster_name?: string;
  contact_note?: string;
}): LostFoundPost {
  const db = getDb();
  const id = `LF-${Date.now().toString().slice(-5)}`;
  db.prepare(
    `INSERT INTO lost_found (id, post_type, title, location, description, poster_name, contact_note, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', 'Just now')`
  ).run(
    id,
    payload.post_type === 'lost' ? 'lost' : 'found',
    payload.title.trim(),
    payload.location.trim(),
    (payload.description || '').trim() || 'Reach out to verify.',
    (payload.poster_name || '').trim() || 'Campus Student',
    (payload.contact_note || '').trim() || 'SAC Desk'
  );
  return getLostFound().find((p) => p.id === id)!;
}

export function toggleLostFoundStatus(id: string): LostFoundPost | null {
  const db = getDb();
  const row = db.prepare('SELECT status FROM lost_found WHERE id = ?').get(id) as
    | { status: string }
    | undefined;
  if (!row) return null;
  const next = row.status === 'open' ? 'reunited' : 'open';
  db.prepare('UPDATE lost_found SET status = ? WHERE id = ?').run(next, id);
  return getLostFound().find((p) => p.id === id) || null;
}

export function getPastSales(category?: string): PastSaleRecord[] {
  const db = getDb();
  if (category && category !== 'All') {
    return db
      .prepare('SELECT * FROM past_sales WHERE category = ? ORDER BY id ASC')
      .all(category) as unknown as PastSaleRecord[];
  }
  return db.prepare('SELECT * FROM past_sales ORDER BY id ASC').all() as unknown as PastSaleRecord[];
}
