# 💖 Couples' Shared Space

A private, premium, and secure web application designed exclusively for exactly two partners to capture memories, coordinate dates, log tastes/preferences, and organize wishlists in a beautiful, shared digital sanctuary.

---

## 🎨 Modules & Features

### 1. 📊 Interactive Dashboard
*   **Anniversary Counter**: Dynamically counts the years, months, and days you have been together.
*   **Recent Activity**: Quick access to recent memories and upcoming events.
*   **Couple Customization**: Ability to customize the anniversary start date and set a shared cover photo.

### 2. 📸 Shared Memory Diary
*   **Timeline View**: A chronological flow of memories with dates, titles, and stories.
*   **Multi-Image Uploads**: Upload multiple photos per memory, saved directly to local storage.
*   **Media Gallery**: View high-quality images of your memories in a responsive lightbox format.

### 3. 📅 Date & Event Planner
*   **Trip/Date Coordination**: Plan trips, dates, and anniversaries with custom descriptions and dates.
*   **Interactive Checklists**: Assign checklists to individual events to stay organized.
*   **Partner Assignment**: Allocate specific checklist tasks to a partner (e.g. BF or GF) with quick status checks.

### 4. 🎁 Gift & Wishlist Registry
*   **Wishlist Registry**: Catalog gift ideas with item descriptions, prices, links, priority rating, and multiple pictures.
*   **Gift Purchase Tracking**: Secrets feature that lets one partner mark an item as purchased (for surprises) or transparently coordinate gift buying.

### 5. ☕ Taste & Details (Preferences)
*   **Profile Personalization**: Update custom display names and upload custom profile pictures.
*   **Taste Library**: Organize sizes, favorite foods, coffee configurations, and other special notes under organized tabs (General Info, Food & Drinks, Clothing & Sizes, Joy & Comfort).

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), Vanilla CSS3 (custom theme engine), Lucide React Icons.
*   **Backend**: Node.js (Express), ES Modules architecture.
*   **Database & ORM**: PostgreSQL, Prisma.
*   **File Storage**: Local filesystem storage (no external cloud dependencies required).
*   **Security & Networking**: Rate limiting configurations, CORS protection, Helmet header configurations, and JWT cookie authentication.

---

## 📂 Project Structure

```
├── backend/
│   ├── prisma/             # Prisma database schema configuration
│   ├── src/
│   │   ├── middleware/     # JWT authentication and rate limiting middlewares
│   │   ├── routes/         # Express API routes (auth, preferences, wishlist, memories, etc.)
│   │   └── server.js       # Main server entrypoint
│   └── uploads/            # Local directory where uploaded pictures are saved
└── frontend/
    ├── public/             # Static public assets
    ├── src/
    │   ├── components/     # Reusable layout UI components (Navbar, Loader, etc.)
    │   ├── pages/          # Main application page components (Dashboard, Memories, etc.)
    │   ├── config.js       # Dynamic API URL routing logic
    │   └── main.jsx        # App mounting and global error logger
```

---

## ⚙️ Development & Local Setup

### 1. Database Setup
Make sure PostgreSQL is installed and running locally, then create a new blank database:
```sql
CREATE DATABASE kuteovapemen;
```

### 2. Configure Backend
Navigate to the `backend` directory, install packages, and create your environment file:
```bash
cd backend
npm install
cp .env.example .env
```

Set the values in `backend/.env`:
*   `PORT`: Port for the API server (default is `5001`).
*   `DATABASE_URL`: PostgreSQL connection string.
*   `JWT_SECRET`: Secure string for signing JWT tokens.
*   `GOOGLE_CLIENT_ID`: Your Google OAuth 2.0 Web Client ID.
*   `ALLOWED_EMAILS`: Comma-separated list of the exactly two emails allowed to access this app.
*   `HUDSON_EMAIL`: Whitelisted email assigned to the Boyfriend role.

Sync the database schema and start the API server:
```bash
# Apply Prisma schema to PostgreSQL
npx prisma db push

# Start server in development mode
npm run dev
```

### 3. Configure Frontend
Navigate to the `frontend` directory, install dependencies, and start the development server:
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. The frontend will dynamically communicate with the backend API running on `http://localhost:5001`.

---

## 📦 Production Architecture (Self-Hosted)

For maximum privacy, this application is deployed using a self-hosted architecture without external SaaS dependencies:

1.  **Node.js Process Manager (PM2)**: Runs the Express backend continuously in the background and restarts it automatically in case of crashes or system reboots.
2.  **Reverse Proxy (Nginx)**: 
    *   Serves the static, production-compiled React bundle (`frontend/dist/`) on HTTP/HTTPS.
    *   Intercepts `/api` requests and forwards them to the Node service.
    *   Serves client requests for files in the `/uploads/` directory directly from the server disk.
3.  **Encrypted Tunnel (SSL/HTTPS)**: Secured using an automated TLS/SSL certificate (such as Let's Encrypt) to encrypt all shared data and media transfers.
