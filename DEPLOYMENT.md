# Vercel Deployment Guide

## Required Environment Variables

Before deploying to Vercel, you must configure these **4 required environment variables**:

### 1. CASE_API_KEY
- **Required**: Yes
- **Value**: Your Case.dev API key (starts with `sk_case_`)
- **Description**: Used for translation and language detection via Case.dev API

### 2. DEMO_SESSION_HOURS
- **Required**: Yes
- **Value**: `24` (recommended)
- **Description**: Number of hours before session resets

### 3. DEMO_SESSION_PRICE_LIMIT
- **Required**: Yes
- **Value**: `5` (recommended)
- **Description**: Dollar amount limit per session

### 4. DEMO_MAX_DOCUMENTS_PER_SESSION
- **Required**: Yes
- **Value**: `20` (recommended)
- **Description**: Maximum number of documents that can be processed per session

## Deployment Steps

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Navigate to project directory
cd multi-language-processor-demo

# Deploy
vercel

# Set environment variables
vercel env add CASE_API_KEY
vercel env add DEMO_SESSION_HOURS
vercel env add DEMO_SESSION_PRICE_LIMIT
vercel env add DEMO_MAX_DOCUMENTS_PER_SESSION

# Redeploy to apply environment variables
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. **Import Project**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository or upload the project

2. **Configure Environment Variables**
   - In the deployment configuration, add the 4 required environment variables:
     - `CASE_API_KEY` = your Case.dev API key
     - `DEMO_SESSION_HOURS` = `24`
     - `DEMO_SESSION_PRICE_LIMIT` = `5`
     - `DEMO_MAX_DOCUMENTS_PER_SESSION` = `20`

3. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

## Post-Deployment

After deployment, your app will be available at:
- Production: `https://your-project.vercel.app`

### Testing the Deployment

1. Visit your deployed URL
2. Upload a PDF, RTF, or text file
3. Verify:
   - Document upload works
   - Language detection works
   - Translation works (if document is not in English)
   - Session limits are enforced
   - Document limits are enforced

## Supported File Types

- ✅ PDF (with selectable text)
- ✅ RTF (Rich Text Format)
- ✅ TXT (Plain text)

## Features

- Multi-language document processing (100+ languages)
- Client-side text extraction (PDF.js, RTF parser)
- Translation via Case.dev API
- Price-based session limits ($5 per 24-hour session by default)
- Document count limits (20 documents per session by default)
- LocalStorage-based usage tracking (no database required)

## Build Configuration

The app uses:
- **Framework**: Next.js 16.1.1
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

No additional Vercel configuration is required - Next.js is automatically detected.

## Troubleshooting

### Build Warnings

You may see this warning during build - it's safe to ignore:
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

You may also see this warning - it's safe to ignore for demo mode:
```
[Error [BetterAuthError]: You are using the default secret...
```

The auth routes exist but aren't required for the main demo functionality.

### Translation Not Working

- Verify `CASE_API_KEY` is set correctly in Vercel environment variables
- Check that the API key has translation permissions
- Verify the API key hasn't expired

### Session Limits Not Working

- Verify all 3 demo limit environment variables are set:
  - `DEMO_SESSION_HOURS`
  - `DEMO_SESSION_PRICE_LIMIT`
  - `DEMO_MAX_DOCUMENTS_PER_SESSION`
- Clear browser localStorage and try again

## Local Development

For local development:

```bash
# Copy environment template
cp .env.example .env.local

# Add your Case.dev API key
# Edit .env.local and set CASE_API_KEY

# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000
