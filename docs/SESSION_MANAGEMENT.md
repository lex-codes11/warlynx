# Session Management and Protected Routes

This document explains the session management and protected routes implementation for the Warlynx application.

## Overview

The application implements comprehensive session management using NextAuth with:
- **Middleware-based route protection**: Automatic authentication checks for protected routes
- **Server-side session utilities**: Functions for Server Components and API routes
- **Client-side session hooks**: React hooks for client components
- **API authentication helpers**: Utilities for protecting API endpoints

**Validates Requirements**: 1.4 (Session persistence), 1.5 (Protected route enforcement), 13.3 (Permission validation)

## Architecture

### Session Persistence (Requirement 1.4)

Sessions are persisted using NextAuth's JWT strategy:
- JWT tokens stored in HTTP-only cookies
- Automatic session refresh on page navigation
- Session data includes: `id`, `email`, `displayName`, `avatar`
- Sessions maintained across all pages and API routes

### Protected Routes (Requirement 1.5)

Routes are protected at multiple levels:
1. **Middleware**: Automatic redirect for unauthenticated users
2. **Server Components**: `requireSession()` helper
3. **Client Components**: `useRequireAuth()` and `useProtectedRoute()` hooks
4. **API Routes**: `requireApiAuth()` and `withApiAuth()` helpers

## Middleware Configuration

The middleware (`middleware.ts`) automatically protects routes:

```typescript
// Protected routes (require authentication):
- /dashboard/*      - User dashboard and game list
- /game/*           - All game-related pages
- /character/*      - Character creation and management
- /api/*            - API routes (except /api/auth/*)

// Public routes (no authentication required):
- /                 - Landing page
- /auth/*           - Authentication pages
- /api/auth/*       - NextAuth endpoints
```

When an unauthenticated user tries to access a protected route, they are automatically redirected to `/auth/signin` with a callback URL to return after sign-in.

## Server-Side Usage

### Server Components

```typescript
import { requireSession, getAuthenticatedUser, isAuthenticated } from "@/lib/session";

// Require authentication (redirects if not authenticated)
export default async function DashboardPage() {
  const user = await requireSession();
  return <div>Welcome, {user.displayName}!</div>;
}

// Optional authentication
export default async function ProfilePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return <div>Please sign in</div>;
  }
  return <div>Welcome, {user.displayName}!</div>;
}

// Check authentication status
export default async function HomePage() {
  const isAuth = await isAuthenticated();
  return isAuth ? <Dashboard /> : <LandingPage />;
}
```

### API Routes

```typescript
import { requireApiAuth, withApiAuth, getApiUser } from "@/lib/api-auth";

// Method 1: Manual authentication check
export async function GET(request: NextRequest) {
  const user = await requireApiAuth(request);
  if (user instanceof NextResponse) return user; // Error response
  
  // User is authenticated
  return NextResponse.json({ user });
}

// Method 2: Wrapper function (recommended)
export const POST = withApiAuth(async (request, user) => {
  // User is automatically authenticated
  return NextResponse.json({ success: true, userId: user.id });
});

// Method 3: Optional authentication
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
```

## Client-Side Usage

### React Components

```typescript
import { useSession, useRequireAuth, useProtectedRoute } from "@/hooks/useSession";

// Method 1: Manual authentication check
function MyComponent() {
  const { user, isAuthenticated, isLoading } = useSession();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;
  
  return <div>Welcome, {user.displayName}!</div>;
}

// Method 2: Require authentication with redirect
function ProtectedComponent() {
  const user = useRequireAuth();
  
  if (!user) return <div>Loading...</div>;
  
  return <div>Welcome, {user.displayName}!</div>;
}

// Method 3: Protected route hook
function ProtectedPage() {
  useProtectedRoute('/dashboard'); // Redirects if not authenticated
  const { user } = useSession();
  
  return <div>Welcome, {user?.displayName}!</div>;
}
```

## Permission Validation

### Resource Ownership

```typescript
import { verifyOwnership } from "@/lib/api-auth";

export const DELETE = withApiAuth(async (request, user) => {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  
  if (!verifyOwnership(user.id, game.hostId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // User owns the resource, proceed with deletion
  await prisma.game.delete({ where: { id: gameId } });
  return NextResponse.json({ success: true });
});
```

### Game Participation

```typescript
import { verifyGameParticipation } from "@/lib/api-auth";

export const POST = withApiAuth(async (request, user) => {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: true }
  });
  
  const playerIds = game.players.map(p => p.userId);
  
  if (!verifyGameParticipation(user.id, playerIds)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // User is a participant, proceed with action
  return NextResponse.json({ success: true });
});
```

## Session Data Structure

```typescript
interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatar: string | null;
}

interface Session {
  user: AuthUser;
  expires: string;
}
```

## Redirect Behavior

### Automatic Redirects

1. **Unauthenticated access to protected route**:
   - User tries to access `/dashboard`
   - Middleware redirects to `/auth/signin?callbackUrl=%2Fdashboard`
   - After sign-in, user is redirected back to `/dashboard`

2. **Manual redirects**:
   ```typescript
   import { redirectToSignIn, redirectToDashboard } from "@/lib/session";
   
   // Redirect to sign-in with callback
   redirectToSignIn('/game/123');
   
   // Redirect to dashboard
   redirectToDashboard();
   ```

## Error Handling

### API Error Responses

All authentication errors follow a consistent format:

```typescript
{
  success: false,
  error: {
    code: "UNAUTHORIZED" | "FORBIDDEN",
    message: string,
    retryable: false
  }
}
```

- **401 Unauthorized**: User is not authenticated
- **403 Forbidden**: User is authenticated but lacks permission

## Testing

Session management is tested at multiple levels:

1. **Unit Tests**: Helper functions (ownership, participation)
2. **Integration Tests**: Full authentication flow (future)
3. **E2E Tests**: Protected route behavior (future)

Run tests:
```bash
npm test -- lib/__tests__/session-helpers.test.ts
```

## Security Considerations

1. **JWT Strategy**: Tokens are signed and encrypted
2. **HTTP-Only Cookies**: Prevents XSS attacks
3. **CSRF Protection**: Built-in with NextAuth
4. **Server-Side Validation**: All permissions checked server-side
5. **Middleware Protection**: Automatic route protection

## Best Practices

1. **Always use server-side validation**: Never trust client-side checks
2. **Use `withApiAuth` wrapper**: Simplifies API route protection
3. **Check permissions explicitly**: Verify ownership/participation for sensitive operations
4. **Provide callback URLs**: Improve UX by redirecting back after sign-in
5. **Handle loading states**: Show loading indicators while checking authentication

## Common Patterns

### Protected Page with Loading State

```typescript
export default async function GamePage({ params }: { params: { id: string } }) {
  const user = await requireSession(`/game/${params.id}`);
  
  const game = await prisma.game.findUnique({
    where: { id: params.id },
    include: { players: true }
  });
  
  const isParticipant = game.players.some(p => p.userId === user.id);
  
  if (!isParticipant) {
    redirect('/dashboard');
  }
  
  return <GameRoom game={game} user={user} />;
}
```

### Protected API Endpoint with Permission Check

```typescript
export const POST = withApiAuth(async (request, user) => {
  const { gameId, action } = await request.json();
  
  // Verify user is in the game
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: true }
  });
  
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  
  const playerIds = game.players.map(p => p.userId);
  if (!verifyGameParticipation(user.id, playerIds)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Process action
  return NextResponse.json({ success: true });
});
```

## Troubleshooting

### Session not persisting
- Check `NEXTAUTH_SECRET` is set
- Verify cookies are enabled in browser
- Check `NEXTAUTH_URL` matches your domain

### Redirect loop
- Ensure `/auth/signin` is not in protected routes
- Check middleware matcher configuration
- Verify NextAuth is properly configured

### Permission denied errors
- Verify user is authenticated
- Check ownership/participation logic
- Ensure database relationships are correct

## Next Steps

After session management is configured:
1. Create authentication UI pages (Task 2.5)
2. Implement game creation with host permissions
3. Add character creation with ownership checks
4. Test protected routes end-to-end

