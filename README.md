# GitHub Repository Analytics Dashboard

A full-stack web application that searches public GitHub repositories, shows detailed repository analytics, and lets users save their favourite repositories to MongoDB.

- **Frontend:** Next.js (App Router) + React + Tailwind CSS
- **Backend:** Node.js + Express.js
- **Database:** MongoDB (Mongoose)
- **Third-party API:** GitHub REST API (all calls go through the Express backend)

---

## Features

### Repository search
- Search public repositories by keyword (GitHub search qualifiers such as `language:go` or `stars:>1000` also work).
- Each result shows the name, description, stars, forks, and primary language.
- Pagination with page numbers and Previous/Next buttons, capped at GitHub's 1,000-result search limit.
- Sort by **Best match**, **Most stars**, or **Recently updated**.
- The search state (`q`, `sort`, `page`) lives in the URL, so results can be bookmarked and shared, and the browser back button works.

### Repository details
- Repository information: owner, description, topics, language, license, default branch, created date, last update and push, size, homepage, and watchers.
- The latest 5 commits.
- The top 5 contributors, with relative contribution bars.
- Number of open issues. This uses GitHub's issue search, so pull requests are not counted. If that search call fails, the page falls back to `open_issues_count` and labels it as including pull requests.

### Saved repositories
- Save or unsave from the search results or the details page.
- Saved repositories are stored in MongoDB and listed on a separate **Saved** page.
- Remove saved repositories.
- Duplicates are prevented at two levels: an application check returns `409 ALREADY_SAVED`, and a **unique index on `githubId`** in MongoDB stops concurrent requests from creating duplicates.
- Before saving, the backend fetches the repository from GitHub to confirm it exists and to store canonical data, rather than trusting what the client sends.

### Backend API integration
- Every GitHub request goes through the Node.js backend. The browser never talks to GitHub directly.
- The GitHub token lives only in the backend's environment variables.
- Search results are cached in memory for **5 minutes** (configurable). Responses include `cached` and `cachedAt` fields plus an `X-Cache: HIT|MISS` header.
- Rate-limit handling:
  - The backend records `x-ratelimit-*` headers per resource (`core` and `search`).
  - When a quota is known to be exhausted, the backend answers immediately with `429` and does not call GitHub again.
  - Both primary rate limits (`x-ratelimit-remaining: 0`) and secondary rate limits (`retry-after`) become `429 RATE_LIMITED` responses with `retryAfter` and `resetAt`.
  - The frontend shows a countdown and enables the **Try again** button once the limit resets.
- All errors use one consistent JSON shape: `{ "error": { "message", "code", ... } }`.

---

## How the mandatory technical challenges are handled

| Challenge | Handling |
|---|---|
| GitHub API returns an error or is unavailable | Network failure → `503 GITHUB_UNREACHABLE`; timeout (10s) → `504 GITHUB_TIMEOUT`; GitHub 5xx → `502 GITHUB_UNAVAILABLE`; non-JSON body → `502 GITHUB_INVALID_RESPONSE`; bad token → `502 GITHUB_AUTH_FAILED`. The UI shows a clear message with a retry button. On the details page, commits, contributors, and the issue count load independently, so one failed call doesn't break the page. |
| Invalid or deleted repositories | Owner and repository names are validated against GitHub's naming rules (`400 INVALID_REPOSITORY`). A GitHub 404 becomes `404 REPO_NOT_FOUND` ("may be private, renamed, or deleted"), and 451 becomes `REPO_UNAVAILABLE`. Empty repositories (GitHub 409 on commits) show "no commits yet". |
| Empty search results | Returns `totalCount: 0` and `items: []`. The UI shows a "No repositories found" state. Empty keywords are rejected by both the form and the API (`400 VALIDATION_ERROR`). |
| Duplicate saved repositories | Pre-insert check plus a unique MongoDB index, with `E11000` mapped to `409 ALREADY_SAVED`. The UI shows the repository as **Saved** and toggles to remove. |
| API rate-limit errors without crashing | Rate limits are tracked, requests are short-circuited, and the API returns `429` with `Retry-After`. Cached searches are still served while the limit is active, and the UI counts down until retry is possible. |

Other resilience details:
- If MongoDB is down, the `/api/saved` routes return `503 DB_UNAVAILABLE` immediately (Mongoose command buffering is disabled), search and details keep working, and the backend retries the connection in the background.
- Malformed JSON bodies return `400 INVALID_JSON`, invalid saved ids return `400`, and unknown routes return `404`.

---

## Project structure

```
.
├── backend
│   ├── .env.example
│   ├── package.json
│   └── src
│       ├── app.js                    Express app (CORS, JSON, routes, error handling)
│       ├── server.js                 Entry point, DB connection, graceful shutdown
│       ├── config/env.js             Environment variable loading
│       ├── config/db.js              MongoDB connection with retry
│       ├── middleware/errorHandler.js
│       ├── models/SavedRepository.js
│       ├── routes/repoRoutes.js      Search and repository details
│       ├── routes/savedRoutes.js     Saved repositories CRUD
│       ├── services/githubClient.js  GitHub HTTP client, error mapping, rate-limit tracking
│       ├── services/githubService.js Search (cached), details, normalization
│       └── utils/                    AppError, TtlCache, validators
└── frontend
    ├── .env.example
    ├── package.json
    └── src
        ├── app/                      Pages: / (search), /repo/[owner]/[name], /saved
        ├── components/               SearchView, RepoDetailsView, SavedView, RepoCard, ...
        ├── context/                  Saved repositories and toast providers
        └── lib/                      API client and formatters
```

---

## Prerequisites

- **Node.js 18.17+** (developed with Node 22)
- **MongoDB**: a local instance, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **GitHub personal access token** (optional, but strongly recommended). Without a token, GitHub allows only 60 requests per hour and 10 searches per minute. With one, it allows 5,000 requests per hour and 30 searches per minute. A [fine-grained token](https://github.com/settings/personal-access-tokens) with **no extra permissions** ("Public repositories" read-only access) is enough.

---

## Setup and running locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port for the API server | `4000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/github-analytics` |
| `GITHUB_TOKEN` | GitHub personal access token (leave empty to use unauthenticated limits) | *(empty)* |
| `CLIENT_ORIGIN` | Allowed CORS origin(s) for the frontend, comma-separated | `http://localhost:3000` |
| `SEARCH_CACHE_TTL_SECONDS` | Search cache lifetime in seconds | `300` |

Start the API:

```bash
npm run dev     # development with auto-restart
npm start       # production
```

The API runs at `http://localhost:4000`. Check it with `http://localhost:4000/api/health`.

> Port 5000 is avoided on purpose because macOS uses it for the AirPlay Receiver.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API | `http://localhost:4000/api` |

Open `http://localhost:3000`.

For a production build: `npm run build && npm start`.

### Running MongoDB locally (optional)

With Docker:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

Or with Homebrew on macOS:

```bash
brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community
```

---

## API reference

Base URL: `http://localhost:4000/api`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server status, database connection state, and last known GitHub rate limits |
| `GET` | `/repos/search?q=react&sort=stars&page=1&perPage=10` | Search repositories. `sort` is `best-match` \| `stars` \| `updated`; `perPage` is 1–50. Cached for 5 minutes. |
| `GET` | `/repos/:owner/:name` | Repository info, latest 5 commits, top 5 contributors, and open issue count |
| `GET` | `/saved` | List saved repositories (newest first) |
| `POST` | `/saved` | Save a repository. Body: `{ "owner": "expressjs", "name": "express" }`. Returns `201`, or `409` if already saved, or `404` if the repository doesn't exist. |
| `DELETE` | `/saved/:id` | Remove a saved repository by its id. Returns `404` if it is already removed. |

Error response format:

```json
{
  "error": {
    "message": "GitHub API rate limit exceeded. Please try again in 42 seconds.",
    "code": "RATE_LIMITED",
    "retryAfter": 42,
    "resetAt": "2026-10-14T10:48:44.000Z",
    "resource": "search"
  }
}
```

---

## Design notes

- **Caching:** The search cache is a small in-memory TTL map (`TtlCache`) with expiry and a size cap. It needs no extra infrastructure, which suits a single API instance. With several instances, Redis would be the natural replacement.
- **No authentication:** The assignment doesn't require user accounts, so saved repositories form a single shared list. Adding auth would mean adding a `userId` to the model and making the unique index `{ userId, githubId }`.
- **Data normalization:** The backend maps GitHub responses to a smaller camelCase shape, so the frontend doesn't depend on GitHub's raw payloads.

---

## Deployment (optional)

- **Backend:** Render or Railway. Set the environment variables from `backend/.env.example`, with `CLIENT_ORIGIN` set to the deployed frontend URL.
- **Database:** MongoDB Atlas free tier.
- **Frontend:** Vercel. Set the root directory to `frontend` and set `NEXT_PUBLIC_API_URL` to the deployed backend URL plus `/api`.
