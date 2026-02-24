# Warlynx Project Structure

This document describes the project structure and organization of the Warlynx multiplayer AI game.

## Directory Structure

```
warlynx-multiplayer-game/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (to be implemented)
│   ├── globals.css               # Global styles with Tailwind
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Home page
│
├── components/                   # React components (to be implemented)
│   └── .gitkeep
│
├── lib/                          # Utility functions and shared logic
│   ├── __tests__/               # Unit tests
│   │   └── env.test.ts          # Environment validation tests
│   ├── env.ts                   # Environment variable validation
│   ├── prisma.ts                # Prisma client singleton
│   └── types.ts                 # TypeScript type definitions
│
├── prisma/                       # Database schema and migrations
│   └── schema.prisma            # Prisma schema with all models
│
├── .env.example                  # Environment variables template
├── .eslintrc.json               # ESLint configuration
├── .gitignore                   # Git ignore rules
├── jest.config.js               # Jest testing configuration
├── jest.setup.js                # Jest setup file
├── next.config.mjs              # Next.js configuration
├── package.json                 # Dependencies and scripts
├── postcss.config.mjs           # PostCSS configuration
├── README.md                    # Project documentation
├── SETUP.md                     # Setup instructions
├── tailwind.config.ts           # Tailwind CSS configuration
└── tsconfig.json                # TypeScript configuration
```

## Key Files

### Configuration Files

- **package.json**: Defines dependencies and npm scripts
- **tsconfig.json**: TypeScript compiler configuration with strict mode
- **next.config.mjs**: Next.js framework configuration
- **tailwind.config.ts**: Tailwind CSS styling configuration
- **jest.config.js**: Jest testing framework configuration

### Application Files

- **app/layout.tsx**: Root layout with metadata and global styles
- **app/page.tsx**: Landing page component
- **app/globals.css**: Global CSS with Tailwind directives

### Library Files

- **lib/env.ts**: Environment variable validation using Zod
- **lib/prisma.ts**: Prisma client singleton for database access
- **lib/types.ts**: Shared TypeScript type definitions

### Database

- **prisma/schema.prisma**: Complete database schema with all models:
  - User, Account, Session (authentication)
  - Game, GamePlayer (game management)
  - Character (character data)
  - Turn, GameEvent (gameplay)
  - StatsSnapshot (progression tracking)
  - ImageGenerationLog (AI image tracking)

## Database Models

### Authentication Models (NextAuth)
- **User**: User accounts with email, displayName, avatar
- **Account**: OAuth provider accounts
- **Session**: User sessions
- **VerificationToken**: Email verification tokens

### Game Models
- **Game**: Game sessions with settings, status, turn order
- **GamePlayer**: Player participation in games
- **Character**: Player characters with Power Sheets and images
- **Turn**: Individual turn records
- **GameEvent**: Game events and narrative log
- **StatsSnapshot**: Character stat history
- **ImageGenerationLog**: AI image generation tracking

## Type Definitions

The `lib/types.ts` file defines TypeScript interfaces for:
- **PowerSheet**: Character stats and abilities
- **Ability**: Character abilities with power levels
- **Status**: Temporary status effects
- **Perk**: Unlockable character perks
- **TurnRequest/TurnResponse**: Turn processing data
- **Choice**: Player choices (A-D)
- **StatUpdate**: Character stat changes
- **GameEvent**: Game events

## Environment Variables

Required environment variables (see `.env.example`):
- Database: `DATABASE_URL`
- NextAuth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- OpenAI: `OPENAI_API_KEY`
- Storage: AWS S3 or Supabase Storage credentials
- Application: `NEXT_PUBLIC_APP_URL`

Optional:
- OAuth providers (Google, Discord)
- Redis for caching
- Rate limiting configuration

## NPM Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run lint`: Run ESLint
- `npm test`: Run Jest tests
- `npm test:watch`: Run tests in watch mode

## Database Commands

- `npx prisma generate`: Generate Prisma Client
- `npx prisma migrate dev`: Run migrations in development
- `npx prisma migrate deploy`: Run migrations in production
- `npx prisma studio`: Open Prisma Studio GUI
- `npx prisma db push`: Push schema changes without migrations

## Testing

- **Framework**: Jest with React Testing Library
- **Property Testing**: fast-check for property-based tests
- **Test Location**: `__tests__/` directories or `.test.ts` files
- **Coverage**: Unit tests and property-based tests

## Next Steps

With the infrastructure in place, the next tasks are:
1. Implement authentication system (NextAuth)
2. Create game management APIs
3. Build character creation system
4. Implement AI Dungeon Master
5. Add real-time communication
6. Build UI components

See `tasks.md` for the complete implementation plan.
