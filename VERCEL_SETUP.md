# Quick Vercel Setup Guide

## What You Need (5 things)

### 1. PostgreSQL Database
**Easiest option**: Use Vercel Postgres
- In Vercel dashboard → Storage → Create Database → Postgres
- Automatically adds `DATABASE_URL` to your environment

**Alternative**: Supabase (free)
- https://supabase.com → New Project
- Copy connection string from Settings → Database

### 2. Supabase Account (for real-time & images)
- https://supabase.com → New Project
- Create storage bucket named `character-images` (make it public)
- Get 3 keys from Settings → API:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 3. OpenAI API Key
- https://platform.openai.com → API Keys
- Create new key (starts with `sk-...`)
- **Must have**: GPT-4 and DALL-E 3 access
- Add payment method if needed

### 4. NextAuth Secret
Generate locally:
```bash
openssl rand -base64 32
```

### 5. Environment Variables in Vercel
Go to Vercel Dashboard → Settings → Environment Variables

Add these (copy from your `.env` file):

```env
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<your-generated-secret>

# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## After First Deploy

Run database migrations:

```bash
# Install Vercel CLI
npm i -g vercel

# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy
```

## That's It!

Your app should now be live at `https://your-app.vercel.app`

## Common Issues

**Build fails**: Check all environment variables are set in Vercel

**Database errors**: Run `npx prisma migrate deploy` after first deploy

**Images not working**: Verify Supabase storage bucket is created and public

**OpenAI errors**: Check API key and ensure you have GPT-4 access

---

**Need detailed instructions?** See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
