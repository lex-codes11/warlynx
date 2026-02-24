# Warlynx Setup Guide

This guide walks you through setting up the Warlynx multiplayer AI game from scratch.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and npm installed
- **PostgreSQL database** (local or hosted)
- **OpenAI API key** with access to GPT-4 and DALL-E 3
- **Storage provider**: Either AWS S3 or Supabase Storage

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and configure the following required variables:

### Database Configuration

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/warlynx"
```

Replace with your PostgreSQL connection string.

### NextAuth Configuration

```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### OpenAI Configuration

```bash
OPENAI_API_KEY="sk-..."
```

Get your API key from https://platform.openai.com/api-keys

### Storage Configuration

Choose **ONE** of the following:

#### Option A: AWS S3

```bash
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="warlynx-images"
```

#### Option B: Supabase Storage

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### Application URL

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Optional: OAuth Providers

To enable Google OAuth:
```bash
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

To enable Discord OAuth:
```bash
DISCORD_CLIENT_ID="your-client-id"
DISCORD_CLIENT_SECRET="your-client-secret"
```

## Step 3: Set Up Database

1. Generate Prisma Client:

```bash
npx prisma generate
```

2. Run database migrations:

```bash
npx prisma migrate dev --name init
```

This will create all necessary tables in your PostgreSQL database.

## Step 4: Verify Setup

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the Warlynx landing page.

## Step 5: View Database (Optional)

To inspect your database using Prisma Studio:

```bash
npx prisma studio
```

This opens a web interface at http://localhost:5555

## Troubleshooting

### Environment Variable Errors

If you see errors about missing environment variables:

1. Ensure all required variables are set in `.env`
2. Restart your development server after changing `.env`
3. Check that your `.env` file is in the project root

### Database Connection Errors

If you can't connect to the database:

1. Verify PostgreSQL is running
2. Check your `DATABASE_URL` connection string
3. Ensure the database exists (create it if needed)
4. Test connection: `npx prisma db pull`

### Build Errors

If the build fails:

1. Run `npm run lint` to check for code issues
2. Run `npx tsc --noEmit` to check for TypeScript errors
3. Clear Next.js cache: `rm -rf .next`

## Next Steps

Once setup is complete:

1. Review the [README.md](README.md) for project structure
2. Check the [requirements document](.kiro/specs/warlynx-multiplayer-game/requirements.md)
3. Review the [design document](.kiro/specs/warlynx-multiplayer-game/design.md)
4. Start implementing features following the [tasks](.kiro/specs/warlynx-multiplayer-game/tasks.md)

## Production Deployment

For production deployment:

1. Set up a production PostgreSQL database
2. Configure production environment variables
3. Set up storage provider (S3 or Supabase)
4. Deploy to Vercel or your hosting platform
5. Run migrations: `npx prisma migrate deploy`

See [README.md](README.md) for detailed deployment instructions.
