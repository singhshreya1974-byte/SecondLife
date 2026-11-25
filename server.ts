import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './server/db.ts';
import { generateItemMascot } from './server/mascot.ts';
import { OPENAPI_SPEC, renderDocsHtml } from './server/openapi.ts';
import { inferCategory, normalizeCondition, suggestPriceFromDb } from './server/pricing.ts';
import {
  addBid,
  addCounterOffer,
  createEvent,
  createListing,
  createLostFound,
  createNeed,
  createRental,
  createSwapProposal,
  getAllEvents,
  getAllNeeds,
  getAllRentals,
  getAllSwaps,
  getAllUsers,
  getDashboardData,
  getImpactStats,
  getListingById,
  getLostFound,
  getNotifications,
  getPastSales,
  getUserById,
  markNotificationsRead,
  markRentalReturned,
  queryListings,
  submitTradeReview,
  toggleLostFoundStatus,
  updateCounterOfferStatus,
  updateSwapStatus,
  updateUserProfile,
  verifyCampusUser,
} from './server/store.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Ensure SQLite DB is initialized & seeded on first run
  getDb();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '8mb' }));

  // OpenAPI Docs
  app.get('/api/openapi.json', (_req, res) => {
    res.json(OPENAPI_SPEC);
  });
  app.get('/docs', (_req, res) => {
    res.type('html').send(renderDocsHtml());
  });

  // Health
  app.get('/api/health', (_req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) AS cnt FROM past_sales').get() as { cnt: number };
    res.json({ ok: true, past_sales_count: row.cnt });
  });

  // STEP 2: Pricing Engine
  app.get('/api/price-suggestion', (req, res) => {
    const result = suggestPriceFromDb({
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      item: typeof req.query.item === 'string' ? req.query.item : undefined,
      age: req.query.age !== undefined ? String(req.query.age) : undefined,
      condition: typeof req.query.condition === 'string' ? req.query.condition : undefined,
      original_price:
        req.query.original_price !== undefined ? String(req.query.original_price) : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : 'sale',
      leaving_days:
        req.query.leaving_days !== undefined && req.query.leaving_days !== ''
          ? Number(req.query.leaving_days)
          : null,
    });
    res.json(result);
  });

  // Listings
  app.get('/api/listings', (req, res) => {
    const items = queryListings({
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      subcategory: typeof req.query.subcategory === 'string' ? req.query.subcategory : undefined,
      min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
      condition: typeof req.query.condition === 'string' ? req.query.condition : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      branch: typeof req.query.branch === 'string' ? req.query.branch : undefined,
      semester: typeof req.query.semester === 'string' ? req.query.semester : undefined,
      event_id: typeof req.query.event_id === 'string' ? req.query.event_id : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
    });
    res.json({ listings: items, total: items.length });
  });

  app.get('/api/listings/:id', (req, res) => {
    const item = getListingById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    res.json({ listing: item });
  });

  app.post('/api/listings', (req, res) => {
    const result = createListing(req.body ?? {});
    if (result.error) {
      res.status(result.statusCode || 400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  app.post('/api/listings/:id/bids', (req, res) => {
    const result = addBid(req.params.id, req.body ?? {});
    if (result.error) {
      res.status(result.statusCode || 400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  app.post('/api/listings/:id/counter-offer', (req, res) => {
    const result = addCounterOffer(req.params.id, req.body ?? {});
    if (result.error) {
      res.status(result.statusCode || 400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  app.patch('/api/counter-offers/:id', (req, res) => {
    const status = req.body?.status;
    if (status !== 'accepted' && status !== 'declined') {
      res.status(400).json({ error: 'Status must be accepted or declined' });
      return;
    }
    const result = updateCounterOfferStatus(req.params.id, status);
    if (result.error) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  app.get('/api/dashboard/:userId', (req, res) => {
    const data = getDashboardData(req.params.userId);
    if (!data) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(data);
  });

  // Swaps
  app.get('/api/swaps', (_req, res) => {
    res.json({ swaps: getAllSwaps() });
  });

  app.post('/api/swaps', (req, res) => {
    const result = createSwapProposal(req.body ?? {});
    if (result.error) {
      res.status(result.statusCode || 400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  app.patch('/api/swaps/:id', (req, res) => {
    const status = req.body?.status;
    if (status !== 'accepted' && status !== 'declined') {
      res.status(400).json({ error: 'Status must be accepted or declined' });
      return;
    }
    const result = updateSwapStatus(req.params.id, status);
    if (result.error) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // Rentals
  app.get('/api/rentals', (_req, res) => {
    res.json({ rentals: getAllRentals() });
  });

  app.post('/api/rentals', (req, res) => {
    const result = createRental(req.body ?? {});
    if (result.error) {
      res.status(result.statusCode || 400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  app.patch('/api/rentals/:id', (req, res) => {
    const timeliness = req.body?.return_timeliness;
    if (timeliness !== 'on_time' && timeliness !== 'late') {
      res.status(400).json({ error: 'return_timeliness must be on_time or late' });
      return;
    }
    const result = markRentalReturned(req.params.id, timeliness);
    if (result.error) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // Needs / Wanted
  app.get('/api/needs', (_req, res) => {
    res.json({ needs: getAllNeeds() });
  });

  app.post('/api/needs', (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Need title is required' });
      return;
    }
    const need = createNeed(req.body);
    res.status(201).json({ need });
  });

  // College Events
  app.get('/api/events', (_req, res) => {
    res.json({ events: getAllEvents() });
  });

  app.post('/api/events', (req, res) => {
    if (!req.body?.name || !req.body?.event_date) {
      res.status(400).json({ error: 'Event name and event_date are required' });
      return;
    }
    const event = createEvent(req.body);
    res.status(201).json({ event });
  });

  app.get('/api/events/:id/listings', (req, res) => {
    const items = queryListings({ event_id: req.params.id });
    res.json({ listings: items, total: items.length });
  });

  // Users & Profiles
  app.get('/api/users', (_req, res) => {
    res.json({ users: getAllUsers() });
  });

  app.get('/api/users/:id', (req, res) => {
    const user = getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  });

  app.patch('/api/users/:id/profile', (req, res) => {
    const updated = updateUserProfile(req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: updated });
  });

  app.post('/api/users/:id/verify', (req, res) => {
    const result = verifyCampusUser(req.params.id, String(req.body?.campus_code || ''));
    if (result.error) {
      res.status(result.statusCode || 400).json({ error: result.error });
      return;
    }
    res.json({ user: result.user });
  });

  app.get('/api/mascot-preview', (req, res) => {
    const rawCat = typeof req.query.category === 'string' ? req.query.category : undefined;
    const item = typeof req.query.item === 'string' ? req.query.item : undefined;
    const { category } = inferCategory(rawCat, item);
    const condition = normalizeCondition(
      typeof req.query.condition === 'string' ? req.query.condition : undefined
    );
    const age = Number(req.query.age) || 1;
    const rawType = typeof req.query.type === 'string' ? req.query.type : 'sale';
    const txType =
      rawType === 'swap' || rawType === 'borrow' || rawType === 'rent' ? rawType : 'sale';
    res.json({
      mascot: generateItemMascot({
        title: item,
        category,
        age_years: age,
        condition,
        transaction_type: txType,
      }),
    });
  });

  // Trade Reviews
  app.post('/api/trades/:id/review', (req, res) => {
    const body = req.body ?? {};
    if (!body.reviewer_id || !body.reviewee_id) {
      res.status(400).json({ error: 'reviewer_id and reviewee_id are required' });
      return;
    }
    const result = submitTradeReview(req.params.id, body);
    res.status(201).json(result);
  });

  // Impact & Past Sales Data
  app.get('/api/impact', (_req, res) => {
    res.json(getImpactStats());
  });

  app.get('/api/past-sales', (req, res) => {
    const cat = typeof req.query.category === 'string' ? req.query.category : undefined;
    const records = getPastSales(cat);
    res.json({ records, total: records.length });
  });

  // Notifications
  app.get('/api/notifications', (_req, res) => {
    const list = getNotifications();
    res.json({
      notifications: list,
      unread_count: list.filter((n) => !n.is_read).length,
    });
  });

  app.post('/api/notifications/read', (_req, res) => {
    const list = markNotificationsRead();
    res.json({ notifications: list, unread_count: 0 });
  });

  // Lost & Found
  app.get('/api/lost-found', (_req, res) => {
    res.json({ posts: getLostFound() });
  });

  app.post('/api/lost-found', (req, res) => {
    if (!req.body?.title || !req.body?.location) {
      res.status(400).json({ error: 'Title and location are required' });
      return;
    }
    const post = createLostFound(req.body);
    res.status(201).json({ post });
  });

  app.patch('/api/lost-found/:id', (req, res) => {
    const post = toggleLostFoundStatus(req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json({ post });
  });

  // Vite dev middleware or static dist serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Production build not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GREEN · Second Life running on http://localhost:${PORT} (Docs at /docs)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
