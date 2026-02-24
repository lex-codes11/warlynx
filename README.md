# Warlynx - Multiplayer AI Game

A multiplayer AI-powered narrative game where players create unique characters with AI-generated power sheets and images, then participate in turn-based gameplay orchestrated by an AI Dungeon Master.

## Features

- 🎭 **AI Character Creation**: Generate unique characters with custom power sheets and DALL-E 3 artwork
- 🎲 **Dynamic Storytelling**: AI Dungeon Master creates adaptive narratives based on player choices
- 👥 **Real-time Multiplayer**: Play with friends using Supabase real-time synchronization
- 🔐 **Secure Authentication**: Email and OAuth (Google, Discord) authentication via NextAuth
- 📊 **Character Progression**: Track stats, level-ups, and status effects throughout the game
- 🎮 **Turn-based Gameplay**: Strategic turn system with action validation and consequences

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI**: OpenAI GPT-4 and DALL-E 3
- **Real-time**: Supabase Realtime
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or hosted)
- OpenAI API key with GPT-4 and DALL-E 3 access
- Supabase account (for real-time features and image storage)

### Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd warlynx
npm install
```

2. **Set up environment variables:**

```bash
cp .env.example .env
```

Edit `.env` and configure the following required variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/warlynx"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"

# OpenAI
OPENAI_API_KEY="sk-..."

# Supabase (for real-time and storage)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

3. **Set up the database:**

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed the database
npx prisma db seed
```

4. **Set up Supabase Storage:**

In your Supabase dashboard:
- Create a storage bucket named `character-images`
- Set the bucket to public or configure appropriate policies
- Enable Realtime for your database tables

5. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
warlynx/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth endpoints
│   │   ├── characters/           # Character management
│   │   ├── games/                # Game management
│   │   └── game/                 # Turn processing
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # User dashboard
│   ├── game/                     # Game pages (lobby, room)
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── auth/                     # Auth forms
│   ├── character/                # Character builder
│   ├── providers/                # Context providers
│   └── realtime/                 # Real-time components
├── hooks/                        # Custom React hooks
│   ├── useGameState.ts          # Game state management
│   ├── useRealtimeGame.ts       # Real-time subscriptions
│   └── useTurnState.ts          # Turn management
├── lib/                          # Core utilities
│   ├── ai/                       # AI integrations
│   │   ├── dungeon-master.ts    # AI DM logic
│   │   ├── image-generator.ts   # DALL-E integration
│   │   └── power-sheet-generator.ts
│   ├── realtime/                 # Supabase real-time
│   ├── auth.ts                   # Auth utilities
│   ├── game-manager.ts          # Game logic
│   ├── turn-manager.ts          # Turn system
│   ├── permissions.ts           # Authorization
│   ├── rate-limit.ts            # Rate limiting
│   └── sanitize.ts              # Input sanitization
├── prisma/
│   └── schema.prisma            # Database schema
├── docs/                         # Documentation
│   ├── AUTHENTICATION.md
│   ├── KNOWN_ISSUES.md
│   └── SESSION_MANAGEMENT.md
└── tests/                        # Test files (co-located)
```

## Database Schema

The application uses the following main models:

- **User**: Player accounts with authentication
- **Game**: Game sessions with settings and state
- **GamePlayer**: Player participation in games
- **Character**: Player characters with stats and power sheets
- **Turn**: Individual turn records with choices and outcomes
- **GameEvent**: Narrative events and game log
- **StatsSnapshot**: Historical character stat tracking
- **ImageGenerationLog**: Image generation tracking and rate limiting

See `prisma/schema.prisma` for the complete schema.

## API Routes

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Games
- `POST /api/games/create` - Create a new game
- `POST /api/games/[gameId]/join` - Join a game
- `POST /api/games/[gameId]/leave` - Leave a game
- `POST /api/games/[gameId]/start` - Start a game (host only)
- `GET /api/games/find-by-code` - Find game by invite code

### Characters
- `POST /api/characters/create` - Create a character
- `POST /api/characters/[characterId]/regenerate-image` - Regenerate character image
- `GET /api/characters/[characterId]/stats` - Get character stats

### Gameplay
- `POST /api/game/[gameId]/turn` - Submit a turn action
- `GET /api/games/[gameId]/current-turn` - Get current turn state

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

**Test Status**: 585 passing, 36 skipped (see `docs/KNOWN_ISSUES.md`)

## Development

### Code Quality

```bash
# Run ESLint
npm run lint

# Type checking
npx tsc --noEmit

# Format code (if Prettier is configured)
npm run format
```

### Database Management

```bash
# Create a new migration
npx prisma migrate dev --name <migration-name>

# View database in Prisma Studio
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate
```

### Environment Validation

The application validates required environment variables on startup. If any are missing, you'll see clear error messages indicating which variables need to be configured.

## Deployment

### Quick Deploy to Vercel

**Prerequisites:**
1. PostgreSQL database (Vercel Postgres or Supabase)
2. Supabase account (for real-time & storage)
3. OpenAI API key (with GPT-4 & DALL-E 3 access)

**See detailed guides:**
- 📋 [VERCEL_SETUP.md](./VERCEL_SETUP.md) - Quick 5-step setup
- ✅ [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Complete deployment guide

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Add PostgreSQL database (Vercel Postgres or external)
5. Deploy

**Important**: Ensure all environment variables are set in Vercel, including:
- Database connection string
- NextAuth secret and URL
- OpenAI API key
- Supabase credentials

### Docker (Alternative)

```bash
# Build the Docker image
docker build -t warlynx .

# Run the container
docker run -p 3000:3000 --env-file .env warlynx
```

### Self-Hosted

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

3. Ensure PostgreSQL and Redis (if used) are accessible
4. Configure a reverse proxy (nginx, Caddy) for HTTPS

## Configuration

### Rate Limiting

Configure rate limits in `.env`:

```env
RATE_LIMIT_IMAGE_GENERATION="3"  # per hour per user
RATE_LIMIT_AI_REQUESTS="100"     # per hour per user
```

### OAuth Providers

To enable OAuth authentication:

1. Create OAuth apps in Google/Discord developer consoles
2. Add credentials to `.env`:

```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
```

3. Configure callback URLs:
   - Google: `http://localhost:3000/api/auth/callback/google`
   - Discord: `http://localhost:3000/api/auth/callback/discord`

### Storage Configuration

Choose between AWS S3 or Supabase Storage:

**Supabase (Recommended)**:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

**AWS S3**:
```env
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="warlynx-images"
```

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check firewall rules if using remote database

### OpenAI API Errors

- Verify API key has GPT-4 and DALL-E 3 access
- Check API usage limits and billing
- Review rate limiting configuration

### Real-time Not Working

- Verify Supabase credentials
- Check Realtime is enabled in Supabase dashboard
- Ensure proper RLS policies are configured

### Image Generation Failing

- Verify storage bucket exists and is accessible
- Check storage permissions/policies
- Ensure sufficient OpenAI API credits

## Known Issues

See `docs/KNOWN_ISSUES.md` for a list of known issues and their workarounds.

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Private project - All rights reserved

## Support

For issues, questions, or feature requests, please contact the development team or create an issue in the repository.

---

**Built with ❤️ using Next.js, OpenAI, and Supabase**
