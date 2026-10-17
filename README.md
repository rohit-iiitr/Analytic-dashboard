# GitHub Repository Analytics Dashboard

A modern, full-stack web application that allows you to search public GitHub repositories, view detailed activity analytics (commits, top contributors, and open issues), and save your favorite repositories to MongoDB.

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **API:** GitHub REST API (proxied securely through backend with caching & rate-limit management)

---

## Prerequisites

- **Node.js** (v18.17 or higher)
- **MongoDB** (Local instance or free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- **GitHub Personal Access Token** *(Optional)*: Increases GitHub API rate limits from 60 req/hr to 5,000 req/hr.

---

## Getting Started Locally

### 1. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and update configuration if needed:
- `PORT=4000`
- `MONGODB_URI=mongodb://127.0.0.1:27017/github-analytics` *(or your MongoDB Atlas connection string)*
- `GITHUB_TOKEN=your_personal_access_token` *(optional)*
- `CLIENT_ORIGIN=*`

Start the backend server:

```bash
npm run dev
```

The API will run at `http://localhost:4000`. You can verify it via `http://localhost:4000/api/health`.

---

### 2. Setup Frontend

In a separate terminal window:

```bash
cd frontend
npm install
cp .env.example .env.local
```

Make sure `frontend/.env.local` points to your backend:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Start the frontend development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
