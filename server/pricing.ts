import type {
  Category,
  ConditionName,
  ConditionSticker,
  ListingType,
  PastSaleRecord,
  PriceSuggestion,
  ReceiptStep,
} from '../src/shared/types.ts';
import { getDb } from './db.ts';

const VALID_CATEGORIES: Category[] = [
  'Books',
  'Calculators',
  'Cycles',
  'Lab Gear',
  'Electronics',
  'Hostel Items',
];

export function conditionToSticker(cond: ConditionName): ConditionSticker {
  if (cond === 'Like New') return 'Like New';
  if (cond === 'Good') return 'Well Loved';
  return 'Battle-Scarred';
}

export function normalizeCondition(raw?: string): ConditionName {
  const s = (raw || '').trim().toLowerCase();
  if (s.includes('like new') || s.includes('mint') || s.includes('excellent')) return 'Like New';
  if (s.includes('worn') || s.includes('battle') || s.includes('poor') || s.includes('rough')) return 'Worn';
  if (s.includes('fair')) return 'Fair';
  return 'Good'; // maps "good" and "Well Loved"
}

export function inferCategory(rawCat?: string, itemName?: string): {
  category: Category;
  matchedExplicit: boolean;
} {
  const raw = (rawCat || '').trim();
  const exact = VALID_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (exact) return { category: exact, matchedExplicit: true };

  const text = `${raw} ${itemName || ''}`.toLowerCase();
  if (text.includes('calc') || text.includes('casio') || text.includes('fx-')) {
    return { category: 'Calculators', matchedExplicit: raw === '' };
  }
  if (text.includes('cycle') || text.includes('bike') || text.includes('hero') || text.includes('btwin') || text.includes('hercules')) {
    return { category: 'Cycles', matchedExplicit: raw === '' };
  }
  if (text.includes('drafter') || text.includes('lab') || text.includes('coat') || text.includes('apron') || text.includes('caliper') || text.includes('compass')) {
    return { category: 'Lab Gear', matchedExplicit: raw === '' };
  }
  if (text.includes('power bank') || text.includes('earphone') || text.includes('mouse') || text.includes('usb') || text.includes('extension') || text.includes('camera') || text.includes('instax')) {
    return { category: 'Electronics', matchedExplicit: raw === '' };
  }
  if (text.includes('kettle') || text.includes('lamp') || text.includes('bucket') || text.includes('stand') || text.includes('blazer') || text.includes('kurta') || text.includes('hostel')) {
    return { category: 'Hostel Items', matchedExplicit: raw === '' };
  }
  if (text.includes('book') || text.includes('clrs') || text.includes('mechanics') || text.includes('grewal') || text.includes('edition')) {
    return { category: 'Books', matchedExplicit: raw === '' };
  }

  return { category: 'Books', matchedExplicit: false };
}

function roundToTen(val: number): number {
  return Math.max(30, Math.round(val / 10) * 10);
}

function linearFitAgeRetention(points: { age: number; ratio: number }[], targetAge: number): number {
  if (points.length === 0) return 0.5;
  if (points.length === 1) return points[0].ratio;

  // Least-squares fit of log(ratio) ~ a + b * age (exponential depreciation curve from real rows!)
  const valid = points.filter((p) => p.ratio > 0.05);
  const n = valid.length;
  const sumX = valid.reduce((s, p) => s + p.age, 0);
  const sumY = valid.reduce((s, p) => s + Math.log(p.ratio), 0);
  const sumXX = valid.reduce((s, p) => s + p.age * p.age, 0);
  const sumXY = valid.reduce((s, p) => s + p.age * Math.log(p.ratio), 0);

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-6) {
    return valid.reduce((s, p) => s + p.ratio, 0) / n;
  }
  const slope = Math.min(-0.04, Math.max(-0.45, (n * sumXY - sumX * sumY) / denom));
  const intercept = (sumY - slope * sumX) / n;
  const predicted = Math.exp(intercept + slope * targetAge);
  return Math.min(0.9, Math.max(0.12, predicted));
}

export function suggestPriceFromDb(params: {
  category?: string;
  item?: string;
  age?: number | string;
  condition?: string;
  original_price?: number | string;
  type?: string;
  month?: number;
  leaving_days?: number | null;
}): PriceSuggestion {
  const db = getDb();
  const warnings: string[] = [];

  const { category, matchedExplicit } = inferCategory(params.category, params.item);
  if (!matchedExplicit && params.category) {
    warnings.push(`Unknown category "${params.category}" — fitted using closest campus category (${category}).`);
  }

  const condition = normalizeCondition(params.condition);
  const sticker = conditionToSticker(condition);

  let ageYears = Number(params.age);
  if (!Number.isFinite(ageYears)) {
    ageYears = 1;
    if (params.age !== undefined && params.age !== '') {
      warnings.push('Invalid age provided; defaulted to 1 year.');
    }
  }
  if (ageYears < 0) {
    warnings.push(`Future age (${ageYears} yrs) clamped to 0 years.`);
    ageYears = 0;
  }
  if (ageYears > 8) {
    warnings.push(`Very old item (${ageYears} yrs) — applied minimum 12% collector/utility floor.`);
  }

  const allCategorySales = db
    .prepare('SELECT * FROM past_sales WHERE category = ?')
    .all(category) as unknown as PastSaleRecord[];

  const pool =
    allCategorySales.length > 0
      ? allCategorySales
      : (db.prepare('SELECT * FROM past_sales').all() as unknown as PastSaleRecord[]);

  // Handle missing or 0 original_price
  let originalPrice = Number(params.original_price);
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
    const sortedMrps = pool.map((r) => r.original_price).sort((a, b) => a - b);
    originalPrice = sortedMrps[Math.floor(sortedMrps.length / 2)] || 1000;
    warnings.push(
      `Original price missing or ₹0 — estimated ₹${originalPrice.toLocaleString('en-IN')} from median ${category} MRP.`
    );
  }

  // Fit age depreciation curve from "Good" (baseline) items in this category
  const goodRows = pool.filter((r) => r.condition === 'Good');
  const fitSource = goodRows.length >= 4 ? goodRows : pool;
  const ageRetention = linearFitAgeRetention(
    fitSource.map((r) => ({ age: r.age_years, ratio: r.sold_price / r.original_price })),
    Math.min(8, ageYears)
  );

  // Fit condition multiplier empirically relative to "Good"
  const condRows = pool.filter((r) => r.condition === condition);
  const avgRatio = (rows: PastSaleRecord[]) =>
    rows.length > 0
      ? rows.reduce((s, r) => s + r.sold_price / r.original_price, 0) / rows.length
      : 0.5;
  const goodAvg = avgRatio(goodRows.length > 0 ? goodRows : pool);
  const condAvg = avgRatio(condRows.length > 0 ? condRows : pool);
  const conditionFactor = Math.min(1.3, Math.max(0.45, condAvg / Math.max(0.1, goodAvg)));

  // Fit empirical seasonality multiplier from dataset
  const monthNum = params.month && params.month >= 1 && params.month <= 12 ? params.month : 11; // Nov default
  const monthRows = pool.filter((r) => r.month_sold === monthNum);
  const peakRows = pool.filter((r) => [7, 8, 12, 1].includes(r.month_sold));
  const dipRows = pool.filter((r) => r.month_sold === 5);

  const overallPoolAvg = avgRatio(pool);
  const monthAvg = monthRows.length >= 2 ? avgRatio(monthRows) : overallPoolAvg;
  const seasonFactor =
    [7, 8, 12, 1].includes(monthNum)
      ? Math.max(1.05, avgRatio(peakRows) / Math.max(0.1, overallPoolAvg))
      : monthNum === 5
        ? Math.min(0.91, avgRatio(dipRows) / Math.max(0.1, overallPoolAvg))
        : Math.min(1.03, Math.max(0.97, monthAvg / Math.max(0.1, overallPoolAvg)));

  // Step-by-step ordered receipt
  const afterAge = roundToTen(originalPrice * ageRetention);
  const ageDelta = afterAge - originalPrice;

  const afterCond = roundToTen(afterAge * conditionFactor);
  const condDelta = afterCond - afterAge;

  const afterSeason = roundToTen(afterCond * seasonFactor);
  const seasonDelta = afterSeason - afterCond;

  let finalFair = afterSeason;
  const receiptSteps: ReceiptStep[] = [
    {
      label: `Original`,
      delta: originalPrice,
      running_total: originalPrice,
      note: 'Retail MRP benchmark',
    },
    {
      label: `age (${ageYears} yrs)`,
      delta: ageDelta,
      running_total: afterAge,
      note: `${category} exponential fit (${Math.round(ageRetention * 100)}% retained)`,
    },
    {
      label: `condition (${condition})`,
      delta: condDelta,
      running_total: afterCond,
      note: `Empirical ${condition} vs Good multiplier (${conditionFactor.toFixed(2)}x)`,
    },
    {
      label: `season`,
      delta: seasonDelta,
      running_total: afterSeason,
      note:
        seasonDelta >= 0
          ? 'Campus semester demand adjustment'
          : 'Off-peak move-out period adjustment',
    },
  ];

  // Leaving-campus countdown urgency drop
  if (typeof params.leaving_days === 'number' && params.leaving_days >= 0 && params.leaving_days <= 14) {
    const urgencyRate =
      params.leaving_days <= 3 ? 0.85 : params.leaving_days <= 7 ? 0.90 : 0.95;
    const afterUrgency = roundToTen(finalFair * urgencyRate);
    const urgencyDelta = afterUrgency - finalFair;
    finalFair = afterUrgency;
    receiptSteps.push({
      label: `leaving in ${params.leaving_days}d`,
      delta: urgencyDelta,
      running_total: afterUrgency,
      note: 'Urgent move-out quick-clear discount',
    });
  }

  finalFair = Math.min(Math.round(originalPrice * 0.94), Math.max(30, finalFair));
  const quickSalePrice = roundToTen(finalFair * 0.88);
  const patientPrice = Math.min(Math.round(originalPrice * 0.95), roundToTen(finalFair * 1.12));

  const rentPerWeek = Math.max(40, roundToTen(finalFair * 0.11));
  const suggestedDeposit = Math.max(100, roundToTen(finalFair * 0.35));
  const swapValue = finalFair;

  // Comparable items & confidence from SQLite past_sales
  const queryWords = (params.item || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const similarItems = pool.filter(
    (r) => Math.abs(r.age_years - ageYears) <= 1.2 || r.condition === condition
  );

  const scoredComparables = pool
    .map((r) => {
      const lower = r.item_name.toLowerCase();
      const hits = queryWords.filter((w) => lower.includes(w)).length;
      const condBonus = r.condition === condition ? 4 : 0;
      const agePenalty = Math.abs(r.age_years - ageYears) * 2.2;
      const mrpPenalty = (Math.abs(r.original_price - originalPrice) / originalPrice) * 2;
      return { record: r, score: hits * 5 + condBonus - agePenalty - mrpPenalty };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.record);

  const similarCount = similarItems.length;
  const confidence: 'High' | 'Medium' | 'Low' =
    similarCount >= 12 ? 'High' : similarCount >= 5 ? 'Medium' : 'Low';

  const fmt = (n: number) => `Rs.${Math.abs(n).toLocaleString('en-IN')}`;
  const fmtSigned = (n: number) => (n >= 0 ? `+${fmt(n)}` : `-${fmt(n)}`);

  const receiptParts = [
    `Original Rs.${originalPrice.toLocaleString('en-IN')}`,
    ...receiptSteps.slice(1).map((s) => `${s.label} ${fmtSigned(s.delta)}`),
    `Fair price Rs.${finalFair.toLocaleString('en-IN')}`,
  ];
  const receiptLine = receiptParts.join(' -> ');

  const listingType: ListingType =
    params.type === 'rent'
      ? 'rent'
      : params.type === 'swap'
        ? 'swap'
        : params.type === 'borrow'
          ? 'borrow'
          : 'sale';

  const summary =
    listingType === 'borrow'
      ? `Free campus borrowing (₹0 fee). Suggested optional refundable deposit is Rs.${suggestedDeposit} against a fair resale value of Rs.${finalFair.toLocaleString('en-IN')} (${similarCount} similar sold items).`
      : listingType === 'rent'
        ? `Suggested rent is Rs.${rentPerWeek}/week (with Rs.${suggestedDeposit} refundable deposit), derived from a fair resale value of Rs.${finalFair.toLocaleString('en-IN')} based on ${similarCount} similar sold items.`
        : listingType === 'swap'
          ? `Estimated swap trade value is Rs.${swapValue.toLocaleString('en-IN')}, based on ${similarCount} similar sold items in ${category}.`
          : `Fair price is Rs.${finalFair.toLocaleString('en-IN')} (${Math.round((finalFair / originalPrice) * 100)}% of MRP), based on ${similarCount} similar sold items.`;

  const bestTimeToList =
    'Best time to sell: July–August (sem start) and Dec–Jan yield ~8–10% higher prices; avoid May move-out dips if you can list early.';

  return {
    fair_price: finalFair,
    quick_sale_price: quickSalePrice,
    patient_price: patientPrice,
    rent_price_per_week: rentPerWeek,
    suggested_deposit: suggestedDeposit,
    swap_value: swapValue,
    confidence,
    similar_count: similarCount,
    normalized_category: category,
    normalized_condition: condition,
    condition_sticker: sticker,
    inferred_original_price: originalPrice,
    warnings,
    comparables: scoredComparables,
    why_this_price: {
      receipt_steps: receiptSteps,
      receipt_line: receiptLine,
      summary,
      best_time_to_list: bestTimeToList,
    },
  };
}
