# Warlynx - Multiplayer AI Game

A multiplayer AI-powered narrative game where players create fusion characters with AI-generated images and participate in turn-based gameplay orchestrated by an AI Dungeon Master.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth
- **AI**: OpenAI GPT-4 and DALL-E 3

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:
- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `OPENAI_API_KEY`: Your OpenAI API key
- Configure at least one storage provider (AWS S3 or Supabase)

3. Set up the database:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Database Management

### Run migrations

```bash
npx prisma migrate dev
```

### View database in Prisma Studio

```bash
npx prisma studio
```

### Reset database (WARNING: deletes all data)

```bash
npx prisma migrate reset
```

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/                   # Utility functions and shared logic
│   └── env.ts            # Environment variable validation
├── prisma/
│   └── schema.prisma     # Database schema
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Environment Variables

See `.env.example` for a complete list of required and optional environment variables.

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL
- `NEXTAUTH_SECRET`: Secret key for NextAuth
- `OPENAI_API_KEY`: OpenAI API key
- `NEXT_PUBLIC_APP_URL`: Public application URL
- Storage provider (AWS S3 or Supabase)

### Optional Variables

- OAuth provider credentials (Google, Discord)
- Redis URL for caching
- Rate limiting configuration

## Development

### Code Style

This project uses ESLint for code quality. Run the linter:

```bash
npm run lint
```

### Type Checking

TypeScript is configured with strict mode. Check types:

```bash
npx tsc --noEmit
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Self-Hosted

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

## License

Private project - All rights reserved
