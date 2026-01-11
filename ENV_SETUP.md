# Environment Variables Setup

## Supabase Service Role Key hinzufügen

Für die Admin-User-Erstellung wird der **Service Role Key** benötigt.

### 1. Service Role Key aus Supabase holen:

1. Gehe zu: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
2. Kopiere den **`service_role` (secret)** Key
3. ⚠️ **WICHTIG:** Dieser Key hat volle Admin-Rechte - NIE im Frontend verwenden!

### 2. In `.env.local` eintragen:

Öffne die Datei `.env.local` im Projekt-Root und füge hinzu:

```bash
# Existing keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# NEW: Service Role Key (for API routes only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Server neu starten:

```bash
# Development
npm run dev

# Build neu erstellen
npm run build
```

### 4. In Netlify hinzufügen:

1. Gehe zu: https://app.netlify.com/sites/salessupportcctv/configuration/env
2. Klicke "Add a variable"
3. Key: `SUPABASE_SERVICE_ROLE_KEY`
4. Value: Dein Service Role Key
5. Speichern

---

## Aktueller Status:

- ✅ API Route erstellt: `/api/admin/create-user`
- ✅ Admin Supabase Client erstellt: `lib/supabaseAdmin.ts`
- ✅ Frontend nutzt API Route
- ⏳ **TODO:** Service Role Key in `.env.local` und Netlify hinzufügen

---

## Sicherheit:

✅ Service Role Key wird **NUR** in API Routes verwendet (server-side)  
✅ API Route prüft, ob User Admin ist  
✅ Frontend kann den Key NICHT sehen (läuft nur server-side)  
✅ Key wird NICHT im Build oder Client-Code eingebettet
