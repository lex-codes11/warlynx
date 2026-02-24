# Warlynx Deployment Checklist

Follow these steps to deploy Warlynx to Vercel.

## 1. Database Setup (PostgreSQL)

You need a PostgreSQL database. Choose one option:

### Option A: Vercel Postgres (Easiest)
1. Go to your Vercel project dashboard
2. Click "Storage" tab
3. Click "Create Database" → "Postgres"
4. Follow the setup wizard
5. Vercel will automatically add `DATABASE_URL` to your environment variables

### Option B: Supabase (Recommended - includes storage)
1. Go to https://supabase.com
2. Create a new project
3. Wait for database to provision (~2 minutes)
4. Go to Project Settings → Database
5. Copy the "Connection string" (URI format)
6. You'll use this as `DATABASE_URL`

### Option C: Other providers
- **Neon**: https://neon.tech (free tier, serverless)
- **Railway**: https://railway.app (free tier)
- **Heroku Postgres**: https://www.heroku.com/postgres
- **AWS RDS**: For production scale

## 2. Supabase Setup (Required for real-time & storage)

Even if you use a different database, you need Supabase for:
- Real-time multiplayer features
- Image storage

### Steps:
1. Go to https://supabase.com
2. Create a project (or use the same one from database setup)
3. Get your credentials from Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (keep secret!)

4. **Create Storage Bucket:**
   - Go to Storage in Supabase dashboard
   - Click "New bucket"
   - Name it: `character-images`
   - Make it **public** (or set appropriate policies)

5. **Enable Realtime:**
   - Go to Database → Replication
   - Enable replication for your tables (if needed)

## 3. OpenAI API Setup (Required)

You need OpenAI API access for:
- GPT-4 (narrative generation, power sheets)
- DALL-E 3 (character images)

### Steps:
1. Go to https://platform.openai.com
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. **Important**: Ensure you have:
   - GPT-4 access (may need to add payment method)
   - DALL-E 3 access
   - Sufficient credits/billing set up

6. Copy the API key (starts with `sk-...`)

## 4. Configure Vercel Environment Variables

In your Vercel project dashboard:

1. Go to Settings → Environment Variables
2. Add the following variables:

### Required Variables:

```
DATABASE_URL=postgresql://user:password@host:5432/database
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Generate NEXTAUTH_SECRET:
Run this locally:
```bash
openssl rand -base64 32
```

### Optional Variables (for OAuth):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

## 5. Run Database Migrations

After deploying to Vercel, you need to run migrations:

### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Run migration
vercel env pull .env.local
npx prisma migrate deploy
```

### Option B: Using Prisma Data Platform
1. Go to https://cloud.prisma.io
2. Connect your database
3. Run migrations from the dashboard

### Option C: Manually via connection string
```bash
# Set DATABASE_URL locally to your production database
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## 6. OAuth Setup (Optional but Recommended)

### Google OAuth:
1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Add authorized redirect URI:
   - `https://your-app.vercel.app/api/auth/callback/google`
6. Copy Client ID and Client Secret

### Discord OAuth:
1. Go to https://discord.com/developers/applications
2. Create New Application
3. Go to OAuth2 section
4. Add redirect URI:
   - `https://your-app.vercel.app/api/auth/callback/discord`
5. Copy Client ID and Client Secret

## 7. Verify Deployment

After deployment completes:

1. **Check build logs** in Vercel dashboard
2. **Test the homepage**: Visit your Vercel URL
3. **Test authentication**: Try signing up
4. **Check database**: Verify tables were created
5. **Test game creation**: Create a test game
6. **Test character creation**: Verify AI and images work

## 8. Post-Deployment Configuration

### Set up monitoring:
- Enable Vercel Analytics
- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor OpenAI API usage

### Configure domains:
- Add custom domain in Vercel dashboard
- Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to use custom domain

### Set up backups:
- Enable automated backups for your database
- Export Supabase storage bucket regularly

## Troubleshooting

### Build fails with "DATABASE_URL not found"
- Ensure DATABASE_URL is set in Vercel environment variables
- Check that it's available for all environments (Production, Preview, Development)

### "Prisma Client not generated"
- Vercel should auto-generate during build
- Check build logs for Prisma generation step
- Ensure `prisma generate` is in your build script

### Authentication not working
- Verify NEXTAUTH_URL matches your deployment URL
- Check NEXTAUTH_SECRET is set
- Ensure OAuth redirect URIs are correct

### Images not uploading
- Verify Supabase storage bucket exists and is public
- Check SUPABASE_SERVICE_ROLE_KEY is correct
- Verify storage policies allow uploads

### OpenAI API errors
- Check API key is valid
- Verify you have GPT-4 and DALL-E 3 access
- Check billing and usage limits
- Monitor rate limits

## Cost Estimates

### Free Tier (Development):
- Vercel: Free (Hobby plan)
- Supabase: Free (500MB database, 1GB storage)
- OpenAI: Pay-per-use (~$0.01-0.10 per character creation)

### Production (Low traffic):
- Vercel: $20/month (Pro plan)
- Supabase: $25/month (Pro plan) or separate database
- OpenAI: ~$50-200/month depending on usage

## Quick Start Commands

```bash
# 1. Generate secret
openssl rand -base64 32

# 2. Deploy to Vercel
vercel

# 3. Set environment variables (do this in Vercel dashboard)

# 4. Run migrations
vercel env pull .env.local
npx prisma migrate deploy

# 5. Test deployment
curl https://your-app.vercel.app
```

## Support

If you encounter issues:
1. Check Vercel build logs
2. Review environment variables
3. Test database connection
4. Verify API keys are valid
5. Check the KNOWN_ISSUES.md file

---

**Ready to deploy?** Make sure you have:
- ✅ PostgreSQL database
- ✅ Supabase account with storage bucket
- ✅ OpenAI API key with GPT-4 access
- ✅ All environment variables configured
- ✅ Database migrations run

Then push your code and Vercel will automatically deploy!
