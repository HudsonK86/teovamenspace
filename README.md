# 💖 Couples' Memory & Planning Platform

A private, beautiful, and premium space shared by exactly two partners to capture memories, coordinate plans, and organize wishlists.

---

## 🚀 Features

*   **🔒 Exclusivity & Private Auth**: Restricted to exactly two registered partners using whitelisted email checks (Google Auth & Developer Mock Login).
*   **📸 Shared Memories Diary**: Create beautiful diary entries with descriptions, dates, and multiple photo uploads.
*   **📅 Event & Checklist Planner**: Track anniversaries, dates, and trips with nested checklists and partner tasks assignment.
*   **🎁 Shared Gift Wishlist**: A gift registry to track desired items, prices, shopping links, priority levels, and purchase state.
*   **⚙️ Couple Settings**: Customize anniversary dates, couple pictures, and categories.

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), CSS3, Lucide Icons
*   **Backend**: Node.js, Express.js
*   **Database & ORM**: PostgreSQL, Prisma
*   **Storage**: Local storage fallback with support for AWS S3 integration

---

## ⚙️ Local Development Setup

### 1. Database Setup
Make sure PostgreSQL is running on your system, and create a database named `kuteovapemen`.

### 2. Backend Configurations
Navigate to the `backend` folder:
```bash
cd backend
npm install
```

Create a `.env` file based on `.env.example`:
```ini
PORT=5001
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/kuteovapemen?schema=public"
JWT_SECRET="your-secure-dev-key"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
ALLOWED_EMAILS="partner1@gmail.com,partner2@gmail.com"
```

Apply database migrations and generate the Prisma client:
```bash
npx prisma db push
```

Start the backend:
```bash
npm run dev
```

### 3. Frontend Configurations
Navigate to the `frontend` folder:
```bash
cd ../frontend
npm install
npm run dev
```

The frontend will run on [http://localhost:5173](http://localhost:5173) and route requests dynamically to the backend API on port 5001.

---

## 📦 Production Deployment

For step-by-step instructions on deploying the frontend static builds (via Nginx reverse proxy), backend API (via PM2), AWS RDS PostgreSQL databases, and AWS S3 buckets, please refer to the detailed [AWS Deployment Guide](AWS_DEPLOYMENT_GUIDE.md).
