# Supabase Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lvrzoqtrlxbukppuyzpc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2cnpvcXRybHhidWtwcHV5enBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODUzNzIsImV4cCI6MjA4MzU2MTM3Mn0.-5I-WB9tMo7Bq7Umi-tlVSkqYqvmkBkM10cPDGyf_SQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2cnpvcXRybHhidWtwcHV5enBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk4NTM3MiwiZXhwIjoyMDgzNTYxMzcyfQ.tb2D1-Td-2nLQc1mrARKfo6M4M7gAtKGPtHm-OxQJMw
```

## Important Notes

- **NEXT_PUBLIC_SUPABASE_URL**: Public Supabase project URL (safe for client-side)
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Anonymous/public key (safe for client-side)  
- **SUPABASE_SERVICE_ROLE_KEY**: Service role secret (NEVER expose to client, only use in API routes)

## Setup

```bash
# Copy this content to .env.local
cp docs/SUPABASE_ENV.md .env.local
# Then edit .env.local to use only the env variables without markdown formatting
```
