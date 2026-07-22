# Audit Log Dashboard

A dashboard for security engineers to upload, view, filter, search, sort, and
investigate system audit logs.

## Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Database:** MongoDB (Mongoose)

## Setup Instructions

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=5000
```

Run it:

```bash
npm start
```

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```
VITE_API_URL=http://localhost:5000/api
```

For the deployed build, set `VITE_API_URL` to the deployed backend's URL
(e.g. `https://your-backend.onrender.com/api`) as an environment variable on
whatever platform hosts the frontend (Vercel, Netlify, etc.).

Run it:

```bash
npm run dev
```

## Sample Data

A ready-to-use dataset of 10,000 log records is included at
`server/sample-data/logs-10000.json`. Upload it via the bulk upload endpoint
to test the assignment's 10,000-record requirement directly.

To regenerate or customize the sample data, see `server/scripts/generateLogs.js`.

## Technical Decisions

### Core architecture

- REST API style, with all filtering, sorting, searching, and pagination
  performed server-side rather than client-side, per the assignment spec.
- Bulk log uploads are inserted as a single MongoDB `insertMany` call rather
  than one write per record, since the assignment requires accepting 10,000
  records in a single request — batching keeps this performant and atomic.

### Backend

- Routes are mounted under `/api/logs`, with a separate `server.js` bootstrap
  file from the Express app itself, to keep app configuration and server
  startup concerns separate.
- Paginated responses are shaped as `{ data, pagination, appliedFilters }` so
  the frontend always knows both the result set and the filters that produced
  it, without re-deriving state.
- Sorting is restricted to an allow-list of fields (`timestamp`, `severity`,
  `actor`) rather than accepting any field name, to avoid exposing internal
  schema details or allowing sort-based enumeration of the collection.
- Query parameters are sanitized before being passed into MongoDB filters,
  since Express's default query parser can turn bracket syntax
  (e.g. `?role[$ne]=null`) into an object containing MongoDB operators. Every
  filter field is coerced to a plain string before use, closing off NoSQL
  injection via query parameters.
- Regex-based filters (used for partial-match search) escape special regex
  characters in user input before constructing the `RegExp`, to prevent both
  invalid-regex crashes and regex denial-of-service from adversarial input.
- Bulk uploads are capped at 10,000 records per request and validated against
  the schema (required fields, enum values for `severity`/`status`) before
  insert, so malformed payloads fail fast with a clear error rather than
  partially inserting bad data.
- Indexes were added on the fields most commonly used for filtering and
  sorting (`timestamp`, `severity`, `status`, `role`, `region`,
  `resourceType`), since server-side filtering across a 10,000+ document
  collection needs to stay fast.

### Frontend

- Filters are kept in a **draft** state, separate from the **applied**
  filters that actually trigger a fetch. This means typing into multiple
  filter fields doesn't fire a request per keystroke — the user reviews
  their selections and clicks "Apply filters" once. Changing sort (column
  headers) or page number applies immediately, since those are single,
  unambiguous actions rather than a multi-field form.
- Pagination resets to page 1 whenever filters or sort change, so the user
  never lands on an out-of-range page after narrowing results.
- The table stays mounted at all times rather than being replaced by a
  loading state on every filter/sort/page change; a refetch instead dims the
  existing table slightly. This avoids the layout "jumping" that a full
  unmount/remount causes on every interaction.
- In-flight requests are cancelled (via `AbortController`) whenever a newer
  request starts, so a slow, older response can't arrive after a faster,
  newer one and overwrite it with stale data.
- The API base URL is read from an environment variable
  (`VITE_API_URL`) rather than hardcoded, so the same build works against a
  local backend in development and the deployed backend in production.

### Known limitations (not implemented, by scope decision)

- **No authentication.** Any request can read or bulk-upload logs. The
  assignment spec doesn't call for auth, so this was left out to stay in
  scope, but it's a hard requirement before this could be used on real
  audit data.
- **CORS is fully open** (`cors()` with no origin restriction). Acceptable
  for a graded demo; a production deployment would restrict this to the
  frontend's actual origin.
- **No rate limiting** on the bulk upload endpoint. A malicious or
  misbehaving client could repeatedly submit 10,000-row payloads. Left out
  as out-of-scope for this assignment, but noted as a next step.

## Testing Done

- Bulk upload tested with both valid and intentionally malformed JSON
  payloads.
- Search, filters, sorting, and pagination tested individually and in
  combination (e.g. a search term plus a severity filter plus a non-default
  sort).
- Empty result states and loading states verified.
- Verified server-side pagination stays consistent across filter changes
  (no stale page numbers, no off-by-one on total pages).
- Checked responsive behavior on mobile and desktop widths.
- Confirmed no console errors before submission.