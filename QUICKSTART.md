# Warlynx Quick Start Guide

Get Warlynx up and running in 5 minutes!

## Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key
- Supabase account (free tier works)

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/warlynx"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Setup Supabase Storage

In your Supabase dashboard:
1. Go to Storage
2. Create a bucket named `character-images`
3. Make it public or set appropriate policies

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 🎉

## First Steps

1. **Sign Up**: Create an account at `/auth/signup`
2. **Create Game**: Click "Create New Game" on dashboard
3. **Invite Friends**: Share the invite code
4. **Create Character**: Build your character with AI
5. **Start Playing**: Host starts the game when ready

## Common Issues

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Verify DATABASE_URL in .env
```

### OpenAI API Error
- Verify API key has GPT-4 and DALL-E 3 access
- Check billing and usage limits

### Supabase Connection Failed
- Verify project URL and keys
- Check Realtime is enabled in dashboard

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- lib/__tests__/game-manager.test.ts
```

## Production Deployment

### Vercel (Easiest)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Add environment variables in Vercel dashboard.

### Docker

```bash
docker build -t warlynx .
docker run -p 3000:3000 --env-file .env warlynx
```

## Need Help?

- 📖 Full docs: [README.md](README.md)
- 🔧 Setup guide: [SETUP.md](SETUP.md)
- 🐛 Known issues: [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)
- 📋 Implementation: [docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)

## Project Structure

```
warlynx/
├── app/              # Pages and API routes
├── components/       # React components
├── lib/              # Core logic and utilities
├── hooks/            # Custom React hooks
├── prisma/           # Database schema
└── docs/             # Documentation
```

## Key Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run lint         # Lint code
npx prisma studio    # View database
```

## What's Next?

- Explore the codebase structure
- Read the [requirements](.kiro/specs/warlynx-multiplayer-game/requirements.md)
- Check the [design document](.kiro/specs/warlynx-multiplayer-game/design.md)
- Review [implementation tasks](.kiro/specs/warlynx-multiplayer-game/tasks.md)

Happy coding! 🚀
