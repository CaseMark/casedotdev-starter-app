# Vercel Deployment Checklist ✅

## Pre-Deployment Verification

- [x] Build succeeds locally (`npm run build`)
- [x] All dependencies installed (`npm install`)
- [x] RTF file support implemented and working
- [x] Chinese/Mandarin language support working
- [x] Price-based session limits implemented
- [x] Environment variables documented
- [x] .gitignore configured (excludes .env.local)
- [x] .env.example updated with required variables

## Required Environment Variables (Set in Vercel)

When deploying, configure these 4 environment variables in Vercel:

1. **CASE_API_KEY**
   - Value: `sk_case_vx563cqqa5l1lg3hkat3u35k_w5fvu2ije00cqxofyx9snurl`
   - Scope: Production, Preview, Development

2. **DEMO_SESSION_HOURS**
   - Value: `24`
   - Scope: Production, Preview, Development

3. **DEMO_SESSION_PRICE_LIMIT**
   - Value: `5`
   - Scope: Production, Preview, Development

4. **DEMO_MAX_DOCUMENTS_PER_SESSION**
   - Value: `20`
   - Scope: Production, Preview, Development

## Deployment Steps

### Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure Build Settings:
   - Framework Preset: **Next.js** (auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)
4. Add the 4 environment variables above
5. Click **Deploy**

### Via Vercel CLI

```bash
vercel
# Follow prompts and add environment variables when asked
```

## Post-Deployment Testing

After deployment, test these features:

- [ ] Homepage loads successfully
- [ ] Can upload PDF file
- [ ] Can upload RTF file
- [ ] Can upload TXT file
- [ ] Language detection works
- [ ] Translation works (test with non-English document)
- [ ] Chinese/Mandarin documents translate correctly
- [ ] Session limit displays correctly
- [ ] Document counter increments
- [ ] Price tracking updates after translation
- [ ] Session resets after 24 hours
- [ ] Limit warnings appear when reaching limits

## Known Warnings (Safe to Ignore)

These warnings appear during build but don't affect functionality:

```
⚠ The "middleware" file convention is deprecated
[BetterAuthError]: You are using the default secret
```

Auth routes exist for future expansion but aren't required for demo mode.

## File Support

- ✅ PDF (with selectable text, not scanned images)
- ✅ RTF (Rich Text Format)
- ✅ TXT (Plain text)

## Language Support

- ✅ 100+ languages supported including:
  - Chinese (Simplified & Traditional)
  - Japanese
  - Korean
  - Arabic
  - Russian
  - Spanish
  - French
  - German
  - And 90+ more languages

## Features Confirmed Working

- ✅ Client-side PDF text extraction (PDF.js)
- ✅ Client-side RTF text extraction (rtf-parser)
- ✅ Language detection via Case.dev API
- ✅ Translation via Case.dev API
- ✅ Price-based session limits ($5/24hr default)
- ✅ Document count limits (20/session default)
- ✅ LocalStorage usage tracking (no database required)
- ✅ Split-pane bilingual viewer
- ✅ Built with case.dev branding

## Support

For issues or questions:
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Case.dev Docs: https://docs.case.dev
