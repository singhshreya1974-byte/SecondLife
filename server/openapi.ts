export const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'GREEN · Second Life Campus Marketplace API',
    version: '1.0.0',
    description:
      'SQLite-backed campus marketplace API with data-fitted depreciation pricing, swaps, rentals, college events, trust badges, and environmental impact metrics.',
  },
  paths: {
    '/api/price-suggestion': {
      get: {
        summary: 'Get data-fitted fair price suggestion and ordered receipt',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'item', in: 'query', schema: { type: 'string' } },
          { name: 'age', in: 'query', schema: { type: 'number' } },
          { name: 'condition', in: 'query', schema: { type: 'string' } },
          { name: 'original_price', in: 'query', schema: { type: 'number' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['sale', 'swap', 'borrow', 'rent'] } },
          { name: 'leaving_days', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Fair, quick, and patient prices with receipt' } },
      },
    },
    '/api/listings': {
      get: {
        summary: 'Search and filter active listings (never exposes private min_acceptable_price)',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'min_price', in: 'query', schema: { type: 'number' } },
          { name: 'max_price', in: 'query', schema: { type: 'number' } },
          { name: 'condition', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['all', 'sale', 'swap', 'borrow', 'rent'] } },
          { name: 'branch', in: 'query', schema: { type: 'string' } },
          { name: 'semester', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Filtered list of public listings' } },
      },
      post: {
        summary: 'Create a unified sale/swap/borrow/rent listing and notify matching junior needs',
        responses: {
          '201': { description: 'Created listing (private min_acceptable_price omitted from response)' },
          '400': { description: 'Validation error (e.g., negative price or min > asking)' },
          '409': { description: 'Duplicate active listing' },
        },
      },
    },
    '/api/listings/{id}': {
      get: {
        summary: 'Get single listing with Little Loops mascot and fairness tag (never exposes min_acceptable_price)',
        responses: { '200': { description: 'Listing detail' }, '404': { description: 'Not found' } },
      },
    },
    '/api/swaps': {
      get: { summary: 'List all swap proposals', responses: { '200': { description: 'Swaps' } } },
      post: { summary: 'Propose a swap with value balance difference', responses: { '201': { description: 'Swap created' } } },
    },
    '/api/swaps/{id}': {
      patch: { summary: 'Accept or decline a swap proposal', responses: { '200': { description: 'Swap updated' } } },
    },
    '/api/rentals': {
      get: { summary: 'List all rentals', responses: { '200': { description: 'Rentals' } } },
      post: { summary: 'Book a rental (requires start_date & end_date)', responses: { '201': { description: 'Rental booked' } } },
    },
    '/api/rentals/{id}': {
      patch: { summary: 'Mark rental returned (on_time or late)', responses: { '200': { description: 'Rental returned' } } },
    },
    '/api/needs': {
      get: { summary: 'Get wanted board with senior match counts', responses: { '200': { description: 'Needs' } } },
      post: { summary: 'Post a wanted item request', responses: { '201': { description: 'Need posted' } } },
    },
    '/api/events': {
      get: { summary: 'List college events with countdowns', responses: { '200': { description: 'Events' } } },
      post: { summary: 'Organiser posts a college event', responses: { '201': { description: 'Event created' } } },
    },
    '/api/events/{id}/listings': {
      get: { summary: 'List items tagged to a specific college event', responses: { '200': { description: 'Event listings' } } },
    },
    '/api/users/{id}': {
      get: { summary: 'Get pseudonymous user profile with campus_verified & trust badge', responses: { '200': { description: 'User profile' } } },
    },
    '/api/users/{id}/profile': {
      patch: { summary: 'Customize user stickers, emoji, theme, bio', responses: { '200': { description: 'Profile updated' } } },
    },
    '/api/users/{id}/verify': {
      post: { summary: 'Verify campus student identity with roll/campus code', responses: { '200': { description: 'User verified' } } },
    },
    '/api/trades/{id}/review': {
      post: { summary: 'Submit buyer/seller review after trade', responses: { '201': { description: 'Review recorded' } } },
    },
    '/api/impact': {
      get: { summary: 'Total rupees saved, kg waste avoided & 3 pitch insights', responses: { '200': { description: 'Impact metrics' } } },
    },
  },
};

export function renderDocsHtml(): string {
  const paths = Object.entries(OPENAPI_SPEC.paths)
    .map(([route, methods]) => {
      const mHtml = Object.entries(methods)
        .map(
          ([verb, info]) =>
            `<div style="margin:6px 0;padding:8px 12px;background:#fff;border:1px solid #e4e4dc;border-radius:8px;">
              <strong style="text-transform:uppercase;color:#184d38;font-family:monospace;">${verb}</strong>
              <code style="margin-left:8px;font-weight:600;">${route}</code>
              <span style="margin-left:10px;color:#5b605b;">— ${(info as { summary: string }).summary}</span>
            </div>`
        )
        .join('');
      return mHtml;
    })
    .join('');

  return `<!doctype html>
  <html lang="en">
  <head><meta charset="utf-8"><title>Second Life OpenAPI Docs</title></head>
  <body style="font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;background:#f7f7f4;color:#161816;">
    <h1 style="color:#184d38;">GREEN · Second Life OpenAPI 3.0</h1>
    <p>Raw JSON schema available at <a href="/api/openapi.json">/api/openapi.json</a></p>
    ${paths}
  </body>
  </html>`;
}
