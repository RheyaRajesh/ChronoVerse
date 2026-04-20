# ☁️ ChronoVerse: Ultra-Simplified Deployment

This is the fastest way to take ChronoVerse live. We have consolidated the entire backend into a single service, meaning you only need two providers.

---

## 🏗️ The Streamlined Cloud Architecture

| Component | Provider | Why? |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | Best for React. Automatic SSL and high speed. |
| **Unified Backend** | [Render](https://render.com) | One single service for Ingestion, Replay, forking, and WebSockets. |
| **Database** | [Render Postgres](https://render.com) | Managed Postgres that lives alongside your backend. |

---

## 🚀 Step 1: Deploy Database (Render)
1. In Render, click **New +** and select **PostgreSQL**.
2. Give it a name (e.g., `chrono-db`).
3. After it's created, copy the **Internal Database URL** (for the backend) and the **External Database URL** (for your local setup).
4. **Setup Tables**: Connect to the DB using a tool (like DBeaver) or Render's shell and run the `init.sql` script found in your project folder.

---

## 🚀 Step 2: Deploy Unified Backend (Render)
1. Click **New +** and select **Web Service**.
2. Connect your repository.
3. Set **Root Directory** to `services/api`.
4. Set **Runtime** to `Docker`.
5. Add Environment Variable:
   - `DATABASE_URL`: Paste the **Internal Database URL** from Step 1.
   - `JWT_SECRET`: Any random password.

---

## 🚀 Step 3: Deploy Frontend (Vercel)
1. Import your project into Vercel.
2. Set **Root Directory** to `frontend`.
3. Add Environment Variable:
   - `VITE_API_URL`: The URL Render gave you (e.g., `https://chrono-api.onrender.com`).
   - `VITE_WS_URL`: Same as above.

---

## ✅ Deployment Checklist
- [ ] Render Postgres is active.
- [ ] `init.sql` tables are created.
- [ ] Backend is running (check Render logs for "Unified Backend running").
- [ ] Frontend environment variables match the Render URL.

**Done!** Your platform is now live and fully functional with the absolute minimum overhead.
