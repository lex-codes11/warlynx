# Authentication Configuration

This document explains how to configure authentication for the Warlynx application using NextAuth.

## Overview

The application uses NextAuth v4 with the following providers:
- **Email Provider**: Passwordless authentication via magic links
- **Google OAuth**: Optional OAuth provider
- **Discord OAuth**: Optional OAuth provider

## Environment Variables

### Required Variables

```bash
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"  # Your application URL
NEXTAUTH_SECRET="your-secret-key"     # Generate with: openssl rand -base64 32

# Database
DATABASE_URL="postgresql://..."       # PostgreSQL connection string
```

### Email Provider Configuration

To enable email authentication, configure your SMTP server:

```bash
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@example.com"
EMAIL_SERVER_PASSWORD="your-email-password"
EMAIL_FROM="noreply@warlynx.com"
```

**Popular SMTP Providers:**
- **Gmail**: `smtp.gmail.com:587` (requires app password)
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **AWS SES**: `email-smtp.us-east-1.amazonaws.com:587`

### OAuth Provider Configuration (Optional)

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret

```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 settings
4. Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
5. Copy Client ID and Client Secret

```bash
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
```

## Database Setup

The authentication system uses Prisma with PostgreSQL. The required models are already defined in `prisma/schema.prisma`:

- `User`: User accounts
- `Account`: OAuth provider accounts
- `Session`: User sessions
- `VerificationToken`: Email verification tokens

Run migrations to create the tables:

```bash
npx prisma migrate dev
```

## Usage

### Server-Side (API Routes, Server Components)

```typescript
import { requireAuth, getCurrentUser, getSession } from "@/lib/auth";

// Require authentication (throws error if not authenticated)
export async function GET() {
  const user = await requireAuth();
  // user is guaranteed to be authenticated
}

// Optional authentication
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
}

// Get session
export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
}
```

### Client-Side (React Components)

```typescript
"use client";

import { useAuth } from "@/hooks/useAuth";
import { signIn, signOut } from "next-auth/react";

export function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <button onClick={() => signIn()}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      <p>Welcome, {user.displayName}!</p>
      <button onClick={() => signOut()}>
        Sign Out
      </button>
    </div>
  );
}
```

## Authentication Flow

### Email Authentication

1. User enters email address
2. System sends magic link to email
3. User clicks link in email
4. User is authenticated and redirected to application

### OAuth Authentication

1. User clicks "Sign in with Google/Discord"
2. User is redirected to OAuth provider
3. User authorizes application
4. User is redirected back with authentication
5. System creates/updates user profile with OAuth data

## User Profile

When a user authenticates, the system automatically:
- Creates a User record in the database
- Sets `displayName` from OAuth profile or email
- Sets `avatar` from OAuth profile (if available)
- Maintains session state

## Session Management

- Sessions use JWT strategy for better performance
- Session data includes: `id`, `email`, `displayName`, `avatar`
- Sessions persist across page navigation
- Sessions are automatically refreshed

## Protected Routes

To protect routes, use middleware or check authentication in the route:

```typescript
// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  return <div>Welcome, {user.displayName}!</div>;
}
```

## Custom Pages

The authentication system uses custom pages:
- Sign In: `/auth/signin`
- Error: `/auth/error`
- Verify Request: `/auth/verify-request`

These pages need to be created in the next implementation phase.

## Security Considerations

1. **NEXTAUTH_SECRET**: Must be a strong random string (use `openssl rand -base64 32`)
2. **HTTPS**: Always use HTTPS in production
3. **CSRF Protection**: Built-in with NextAuth
4. **Session Security**: JWT tokens are signed and encrypted
5. **OAuth Scopes**: Only request necessary permissions

## Troubleshooting

### Email not sending
- Check SMTP credentials
- Verify EMAIL_FROM is a valid sender address
- Check spam folder
- Enable "less secure apps" for Gmail (or use app password)

### OAuth redirect error
- Verify redirect URI matches exactly in provider settings
- Check NEXTAUTH_URL is correct
- Ensure OAuth credentials are correct

### Session not persisting
- Check NEXTAUTH_SECRET is set
- Verify cookies are enabled in browser
- Check NEXTAUTH_URL matches your domain

## Next Steps

After authentication is configured:
1. Create sign-in/sign-up UI components (Task 2.5)
2. Implement protected route middleware (Task 2.3)
3. Create authentication pages
4. Test authentication flow end-to-end
