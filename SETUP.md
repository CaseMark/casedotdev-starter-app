# Bankruptcy Tool Setup Guide

## case.dev Integration Complete! 🎉

Your bankruptcy automation tool is now set up with case.dev OAuth integration. Users can connect their case.dev API keys to enable AI-powered bankruptcy automation.

---

## Quick Start

### 1. Generate Environment Secrets

```bash
# Generate Better Auth secret
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)"

# Generate case.dev encryption key
echo "CASE_DEV_ENCRYPTION_KEY=$(openssl rand -hex 32)"
```

### 2. Create `.env.local` File

Create a `.env.local` file with the following:

```env
# Database (Neon PostgreSQL or local)
DATABASE_URL=postgresql://username:password@host/database

# Authentication
BETTER_AUTH_SECRET=<generated-from-step-1>
BETTER_AUTH_URL=http://localhost:3000

# case.dev Encryption
CASE_DEV_ENCRYPTION_KEY=<generated-from-step-1>
```

### 3. Set Up Database

**Option A: Use Neon (Recommended)**
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Paste into `DATABASE_URL` in `.env.local`

**Option B: Local PostgreSQL**
```bash
# Start local PostgreSQL
DATABASE_URL=postgresql://localhost:5432/bankruptcy_tool
```

### 4. Run Database Migrations

```bash
# Generate migrations
bun run drizzle-kit generate

# Apply migrations
bun run drizzle-kit push

# Verify tables created
bun run drizzle-kit studio
```

### 5. Start Development Server

```bash
bun run dev
```

Navigate to [http://localhost:3000](http://localhost:3000)

---

## How It Works

### User Flow

1. **Sign Up** → User creates account at `/signup`
2. **Log In** → User signs in at `/login`
3. **Connect case.dev** → User navigates to `/settings/case-dev`
4. **Paste API Key** → User pastes their API key from [console.case.dev](https://console.case.dev)
5. **Verification** → System verifies key works by calling case.dev API
6. **Encrypted Storage** → Key encrypted with AES-256-GCM and stored in database
7. **Ready to Use** → User can now access bankruptcy features

### Protected Routes

These routes require case.dev connection:
- `/cases` - Bankruptcy case management
- `/intake` - Client intake forms
- `/forms` - Document generation

Users without case.dev connected are redirected to `/settings/case-dev?required=true`

---

## Architecture

### Database Tables

**Better Auth Tables** (auto-created by Better Auth):
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth/credential accounts
- `verification` - Email verification tokens
- `organization` - Multi-tenant organizations
- `member` - Organization members
- `invitation` - Pending invitations
- `two_factor` - 2FA secrets

**case.dev Integration** (custom):
- `case_dev_credentials` - Encrypted API keys per user

### File Structure

```
lib/
├── db/
│   ├── index.ts          # Database connection
│   └── schema.ts         # Drizzle schema
├── case-dev/
│   ├── client.ts         # case.dev API client
│   ├── encryption.ts     # API key encryption
│   ├── storage.ts        # Database operations
│   ├── hooks.ts          # React hooks
│   └── server.ts         # Server helpers
└── auth/
    └── index.ts          # Better Auth config (now with DB adapter)

app/
├── api/case-dev/
│   ├── connect/route.ts      # POST - Connect API key
│   ├── disconnect/route.ts   # POST - Disconnect
│   └── status/route.ts       # GET - Check status
└── (dashboard)/settings/case-dev/
    └── page.tsx          # Settings UI

components/
└── case-dev/
    └── connect-button.tsx # Connection UI component

middleware.ts             # Auth + case.dev route protection
```

---

## API Endpoints

### Authentication (Better Auth)
- `POST /api/auth/sign-up` - Create account
- `POST /api/auth/sign-in` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get session

### case.dev Integration
- `GET /api/case-dev/status` - Check if user has case.dev connected
- `POST /api/case-dev/connect` - Connect API key (validates & stores encrypted)
- `POST /api/case-dev/disconnect` - Remove API key

---

## Usage Examples

### In Server Actions

```typescript
'use server';

import { getCaseDevClient } from '@/lib/case-dev/server';

export async function uploadDocument(formData: FormData) {
  // Get authenticated case.dev client for current user
  const client = await getCaseDevClient();

  // Upload to case.dev Vaults with OCR
  const result = await client.uploadToVault({
    vaultName: 'case-123',
    file: formData.get('document') as File,
    enableOCR: true,
    enableSemanticSearch: true,
  });

  return result;
}
```

### In Server Components

```typescript
import { hasCaseDevConnected } from '@/lib/case-dev/server';

export default async function DashboardPage() {
  const connected = await hasCaseDevConnected();

  if (!connected) {
    return <div>Please connect case.dev in settings</div>;
  }

  return <div>Your bankruptcy dashboard</div>;
}
```

### In Client Components

```typescript
'use client';

import { useCaseDevStatus } from '@/lib/case-dev/hooks';

export function StatusBadge() {
  const { connected, last4, loading } = useCaseDevStatus();

  if (loading) return <div>Loading...</div>;

  return connected ? (
    <div>Connected: ****{last4}</div>
  ) : (
    <div>Not connected</div>
  );
}
```

---

## Security Features

### API Key Encryption
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Storage**: 256-bit key in environment variable (never committed)
- **IV**: Random 16-byte initialization vector per encryption
- **Auth Tag**: Authentication tag prevents tampering
- **Display**: Only last 4 characters shown in UI

### Access Control
- **User Isolation**: Each user's key completely isolated
- **Session Required**: All API routes require Better Auth session
- **Route Protection**: Middleware enforces case.dev connection for bankruptcy routes
- **HTTPS Only**: Production requires HTTPS for API calls

### Audit Trail
- **verifiedAt**: Timestamp when key was last verified
- **lastUsedAt**: Tracks when key was last used
- **createdAt/updatedAt**: Standard audit fields

---

## Troubleshooting

### "CASE_DEV_ENCRYPTION_KEY environment variable is required"
Generate the key:
```bash
openssl rand -hex 32
```
Add to `.env.local`:
```
CASE_DEV_ENCRYPTION_KEY=<generated-key>
```

### "DATABASE_URL environment variable is required"
Make sure you have a PostgreSQL database set up and the connection string in `.env.local`

### "Invalid API key format"
case.dev API keys should:
- Start with `sk_case_`
- Be at least 20 characters long
- Get yours from [console.case.dev](https://console.case.dev)

### API key verification fails
- Check your internet connection
- Verify the API key is correct
- Make sure case.dev API is accessible

### Database connection fails
```bash
# Test connection
psql $DATABASE_URL

# Or check with Drizzle Studio
bun run drizzle-kit studio
```

---

## Next Steps

### 1. Build Bankruptcy Features

Now that users can connect case.dev, build the actual bankruptcy automation:

**Document Intake** (`/intake`)
```typescript
import { getCaseDevClient } from '@/lib/case-dev/server';

export async function processIntakeDocuments(caseId: string) {
  const client = await getCaseDevClient();

  // Upload documents with OCR
  // Extract financial data
  // Populate database
}
```

**Form Generation** (`/forms`)
```typescript
// Generate bankruptcy forms using case.dev SuperDoc
// Use extracted financial data
// Create PDF packages
```

**Chapter 13 Tracking** (`/cases`)
```typescript
// Track payment schedules
// Monitor plan modifications
// Alert on missed payments
```

### 2. Add case.dev Features

Implement the features from the implementation guide:
- Document upload with OCR
- Financial data extraction
- Means test calculator
- Form generation (20+ bankruptcy forms)
- Chapter 13 plan calculator
- Payment tracking

### 3. Deploy to Production

When ready to deploy:

1. Update `BETTER_AUTH_URL` to production URL
2. Use production database (Neon, Supabase, etc.)
3. Set all environment variables in Vercel/hosting platform
4. Run migrations on production database
5. Test case.dev connection flow in production

---

## Resources

- **case.dev Documentation**: [docs.case.dev](https://docs.case.dev)
- **Better Auth Docs**: [better-auth.com](https://better-auth.com)
- **Implementation Guide**: See `bankruptcy-automation-implementation-guide.md`

---

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review the implementation guide
3. Check case.dev API status
4. Verify environment variables are set correctly
