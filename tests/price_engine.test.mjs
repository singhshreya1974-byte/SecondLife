import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, hydrateUser } from '../server/db.ts';
import { generateItemMascot } from '../server/mascot.ts';
import { suggestPriceFromDb } from '../server/pricing.ts';
import {
  createListing,
  createRental,
  createSwapProposal,
  getDashboardData,
  getImpactStats,
  getListingById,
  queryListings,
  verifyCampusUser,
} from '../server/store.ts';

test('database is seeded with 200 past sales, 40 fake users, and selective campus verification', () => {
  const db = getDb();
  const salesCount = db.prepare('SELECT COUNT(*) AS cnt FROM past_sales').get();
  const usersCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get();
  const listingsCount = db.prepare('SELECT COUNT(*) AS cnt FROM listings').get();
  const verifiedCount = db.prepare('SELECT COUNT(*) AS cnt FROM users WHERE campus_verified = 1').get();

  assert.equal(salesCount.cnt, 200);
  assert.equal(usersCount.cnt, 40);
  assert.ok(listingsCount.cnt >= 12);
  assert.ok(verifiedCount.cnt > 0 && verifiedCount.cnt < usersCount.cnt, 'Only a selective subset should be verified');
});

test('gate example: scientific calculator, 2 years old, good condition, bought at 1200', () => {
  const res = suggestPriceFromDb({
    category: 'Calculators',
    item: 'scientific calculator',
    age: 2,
    condition: 'good',
    original_price: 1200,
    type: 'sale',
  });

  assert.equal(res.normalized_category, 'Calculators');
  assert.equal(res.normalized_condition, 'Good');
  assert.ok(res.fair_price >= 550 && res.fair_price <= 900, `Unexpected fair price: ${res.fair_price}`);
  assert.ok(res.quick_sale_price < res.fair_price);
  assert.ok(res.patient_price > res.fair_price);
  assert.ok(res.similar_count > 0);
  assert.ok(res.why_this_price.receipt_line.includes('Original Rs.1,200'));
  assert.ok(res.why_this_price.summary.includes('similar sold items'));
});

test('edge cases: missing MRP, price 0, unknown category, future age, very old item', () => {
  const zeroMrp = suggestPriceFromDb({
    category: 'Books',
    item: 'Mechanics Textbook',
    age: 1,
    condition: 'Good',
    original_price: 0,
  });
  assert.ok(zeroMrp.fair_price > 0);
  assert.ok(zeroMrp.warnings.some((w) => w.includes('missing or ₹0')));

  const unknownCat = suggestPriceFromDb({
    category: 'Spaceships',
    item: 'Mystery Widget',
    age: -2,
    condition: 'Fair',
    original_price: 1000,
  });
  assert.ok(unknownCat.warnings.some((w) => w.includes('Unknown category')));
  assert.ok(unknownCat.warnings.some((w) => w.includes('clamped to 0')));

  const ancient = suggestPriceFromDb({
    category: 'Cycles',
    item: 'Hero Cycle',
    age: 15,
    condition: 'Worn',
    original_price: 6000,
  });
  assert.ok(ancient.fair_price >= 30);
  assert.ok(ancient.warnings.some((w) => w.includes('Very old item')));
});

test('edge cases: unbalanced swap, rental missing return date, duplicate listing, New here badge', () => {
  const db = getDb();
  const newUserRow = db
    .prepare('SELECT * FROM users WHERE completed_trades = 0 LIMIT 1')
    .get();
  const hydrated = hydrateUser(newUserRow);
  assert.equal(hydrated.trust_badge.level, 'New here');

  const badRental = createRental({
    listing_id: 'LST-101',
    renter_id: 'USR-20',
    start_date: '2026-11-26',
    end_date: '',
  });
  assert.equal(badRental.statusCode, 400);
  assert.ok(badRental.error?.includes('Return date'));

  const unbalancedSwap = createSwapProposal({
    listing_id: 'LST-102',
    proposer_id: 'USR-14',
    offered_item: 'Old Geometry Box',
    offered_value: 200,
  });
  assert.ok(unbalancedSwap.swap?.unbalanced_warning);

  const dup = createListing({
    title: 'Casio fx-991EX ClassWiz',
    seller_id: 'USR-01',
  });
  assert.equal(dup.statusCode, 409);
});

test('Phase 1: unified 4-type listings (SELL/SWAP/BORROW/RENT), private minimum price protection, mascots, verification & analytics', () => {
  const db = getDb();
  const suffix = Date.now().toString().slice(-4);
  const createdIds = [];

  try {
    // 1. SELL with private min_acceptable_price — verify stored in DB but NEVER exposed publicly
    const sellRes = createListing({
      title: `Phase1 Test Calc ${suffix}`,
      category: 'Calculators',
      condition: 'Good',
      age: 2,
      original_price: 1200,
      asking_price: 780,
      min_acceptable_price: 620,
      negotiable: true,
      transaction_type: 'sale',
      seller_id: 'USR-02',
    });
    assert.ok(sellRes.listing, sellRes.error);
    createdIds.push(sellRes.listing.id);
    assert.equal(sellRes.listing.transaction_type, 'sale');
    assert.equal('min_acceptable_price' in sellRes.listing, false);
    assert.equal(JSON.stringify(sellRes.listing).includes('min_acceptable_price'), false);

    const dbMinRow = db
      .prepare('SELECT min_acceptable_price FROM listings WHERE id = ?')
      .get(sellRes.listing.id);
    assert.equal(dbMinRow.min_acceptable_price, 620);

    const fetchedSell = getListingById(sellRes.listing.id);
    assert.ok(fetchedSell);
    assert.equal('min_acceptable_price' in fetchedSell, false);
    assert.equal(JSON.stringify(fetchedSell).includes('min_acceptable_price'), false);

    const seededSell = getListingById('LST-101');
    assert.ok(seededSell);
    assert.equal('min_acceptable_price' in seededSell, false);

    // 2. Validation guards: min_acceptable_price > asking_price, negative values, invalid borrow duration
    const invalidMin = createListing({
      title: `Invalid Min ${suffix}`,
      category: 'Books',
      asking_price: 300,
      min_acceptable_price: 450,
      transaction_type: 'sale',
      seller_id: 'USR-02',
    });
    assert.equal(invalidMin.statusCode, 400);

    const negativePrice = createListing({
      title: `Negative Price ${suffix}`,
      category: 'Books',
      asking_price: -50,
      transaction_type: 'sale',
      seller_id: 'USR-02',
    });
    assert.equal(negativePrice.statusCode, 400);

    const badBorrowRange = createListing({
      title: `Bad Borrow Range ${suffix}`,
      category: 'Lab Gear',
      transaction_type: 'borrow',
      borrow_min_days: 10,
      borrow_max_days: 3,
      seller_id: 'USR-02',
    });
    assert.equal(badBorrowRange.statusCode, 400);

    // 3. SWAP, BORROW (free temporary lending), and RENT creation + type filtering
    const swapRes = createListing({
      title: `Phase1 Swap Book ${suffix}`,
      category: 'Books',
      condition: 'Good',
      age: 1,
      original_price: 600,
      transaction_type: 'swap',
      swap_for: 'Lab coat or drafting board',
      swap_categories: ['Lab Gear', 'Books'],
      swap_multi_ok: true,
      seller_id: 'USR-03',
    });
    assert.ok(swapRes.listing, swapRes.error);
    createdIds.push(swapRes.listing.id);
    assert.equal(swapRes.listing.transaction_type, 'swap');
    assert.equal(swapRes.listing.swap_multi_ok, true);

    const borrowRes = createListing({
      title: `Phase1 Free Lab Coat ${suffix}`,
      category: 'Lab Gear',
      condition: 'Like New',
      age: 1,
      original_price: 700,
      transaction_type: 'borrow',
      borrow_min_days: 1,
      borrow_max_days: 5,
      collection_location: 'Chem Lab Counter',
      borrow_conditions: 'Wash before return',
      seller_id: 'USR-04',
    });
    assert.ok(borrowRes.listing, borrowRes.error);
    createdIds.push(borrowRes.listing.id);
    assert.equal(borrowRes.listing.transaction_type, 'borrow');
    assert.equal(borrowRes.listing.asking_price, 0);
    assert.equal(borrowRes.listing.rent_per_week, 0);
    assert.equal(borrowRes.listing.collection_location, 'Chem Lab Counter');

    const rentRes = createListing({
      title: `Phase1 Rent Speaker ${suffix}`,
      category: 'Electronics',
      condition: 'Like New',
      age: 1,
      original_price: 2500,
      rent_per_week: 220,
      suggested_deposit: 500,
      borrow_min_days: 2,
      borrow_max_days: 14,
      collection_location: 'SAC Lobby',
      transaction_type: 'rent',
      seller_id: 'USR-05',
    });
    assert.ok(rentRes.listing, rentRes.error);
    createdIds.push(rentRes.listing.id);
    assert.equal(rentRes.listing.transaction_type, 'rent');
    assert.equal(rentRes.listing.rent_per_week, 220);

    const borrowListings = queryListings({ type: 'borrow' });
    assert.ok(borrowListings.some((l) => l.id === borrowRes.listing.id));
    assert.ok(borrowListings.every((l) => !('min_acceptable_price' in l)));

    // 4. Little Loops deterministic mascot check across categories/types
    const cycleMascot = generateItemMascot({
      category: 'Cycles',
      age_years: 2,
      condition: 'Good',
      transaction_type: 'sale',
    });
    assert.equal(cycleMascot.name, 'Spokey');
    assert.ok(cycleMascot.line.includes('bicycle'));

    const rentMascot = generateItemMascot({
      category: 'Electronics',
      age_years: 1,
      condition: 'Like New',
      transaction_type: 'rent',
    });
    assert.ok(rentMascot.line.includes('visiting your desk'));

    // 5. Selective campus verification check & existing analytics check
    const unverifiedRow = db.prepare('SELECT id FROM users WHERE campus_verified = 0 LIMIT 1').get();
    assert.ok(unverifiedRow);
    const badCode = verifyCampusUser(unverifiedRow.id, 'bad');
    assert.equal(badCode.statusCode, 400);
    const okVerify = verifyCampusUser(unverifiedRow.id, '2024CS109');
    assert.equal(okVerify.user?.campus_verified, true);
    // Restore original state for idempotency
    db.prepare('UPDATE users SET campus_verified = 0 WHERE id = ?').run(unverifiedRow.id);

    const impact = getImpactStats();
    assert.equal(impact.past_sales_count, 200);
    assert.ok(impact.findings.length >= 3);
    assert.ok(impact.total_rupees_saved > 0);
  } finally {
    for (const id of createdIds) {
      db.prepare('DELETE FROM listings WHERE id = ?').run(id);
    }
  }
});

test('Personalised User & Seller Dashboard returns both views without leaking min_acceptable_price and supports media URLs', () => {
  const db = getDb();
  const suffix = Date.now().toString().slice(-4);
  const created = createListing({
    title: `Dashboard Media Calc ${suffix}`,
    category: 'Calculators',
    condition: 'Like New',
    age: 1,
    original_price: 1200,
    asking_price: 850,
    min_acceptable_price: 700,
    image_url: 'https://example.com/calc.jpg',
    video_url: '/media/clips/calculators.mp4',
    transaction_type: 'sale',
    seller_id: 'USR-01',
  });
  assert.ok(created.listing);

  try {
    assert.equal(created.listing.image_url, 'https://example.com/calc.jpg');
    assert.equal(created.listing.video_url, '/media/clips/calculators.mp4');

    const sellerDash = getDashboardData('USR-01');
    assert.ok(sellerDash);
    assert.ok(sellerDash.user_view.recommended_listings.length > 0);
    assert.ok(sellerDash.seller_view.my_listings.some((m) => m.listing.id === created.listing.id));
    assert.equal(JSON.stringify(sellerDash).includes('min_acceptable_price'), false);
  } finally {
    db.prepare('DELETE FROM listings WHERE id = ?').run(created.listing.id);
  }
});
