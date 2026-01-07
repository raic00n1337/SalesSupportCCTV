# 🚀 Netlify Deployment Guide

Schritt-für-Schritt-Anleitung zum Deployen des Video-System-Konfigurators auf Netlify.

---

## 📋 Voraussetzungen

- ✅ Netlify Account (bereits vorhanden)
- ✅ Git Repository initialisiert
- ✅ Alle Änderungen committed

---

## 🎯 Deployment-Methoden

Es gibt **2 Hauptmethoden** zum Deployen auf Netlify:

### ✨ Methode 1: Git-basiertes Deployment (EMPFOHLEN)

Diese Methode ermöglicht automatische Deployments bei jedem Git Push.

#### Schritt 1: GitHub Repository erstellen

Wenn du noch kein GitHub Repo hast:

```bash
# 1. Erstelle ein neues Repository auf GitHub (ohne README, .gitignore, Lizenz)
# 2. Verbinde dein lokales Repo mit GitHub:

git remote add origin https://github.com/DEIN-USERNAME/SalesSupportCCTV.git
git branch -M main
git push -u origin main
```

Wenn du bereits ein Repo hast:

```bash
# Pushe alle Commits
git push origin master
```

#### Schritt 2: Mit Netlify verbinden

1. **Login bei Netlify**: https://app.netlify.com
2. **"Add new site"** → **"Import an existing project"**
3. **"Connect to Git provider"** → **GitHub** auswählen
4. **Repository auswählen**: `SalesSupportCCTV`
5. **Build Settings konfigurieren**:
   - **Branch to deploy**: `master` (oder `main`)
   - **Build command**: `npm run build` (wird aus `netlify.toml` gelesen)
   - **Publish directory**: `.next` (wird aus `netlify.toml` gelesen)
   - **Node Version**: 20 (wird aus `netlify.toml` gelesen)
6. **"Deploy site"** klicken

✅ **Fertig!** Netlify deployt automatisch bei jedem Push.

---

### 💨 Methode 2: Netlify CLI (Manuell)

Für schnelles Testing oder wenn du kein Git-Hosting nutzen möchtest.

#### Schritt 1: Netlify CLI installieren

```bash
npm install -g netlify-cli
```

#### Schritt 2: Login

```bash
netlify login
```

→ Browser öffnet sich, Login durchführen

#### Schritt 3: Initialisieren

```bash
# Im Projekt-Verzeichnis
netlify init
```

**Auswahl treffen:**
- **Create & configure a new site**
- **Team auswählen**
- **Site name eingeben** (z.B. `video-konfigurator`)
- **Build command**: `npm run build`
- **Publish directory**: `.next`

#### Schritt 4: Deploy

```bash
# Production Deployment
netlify deploy --prod

# Preview Deployment (zum Testen)
netlify deploy
```

---

## 🔧 Wichtige Konfigurationen

### 1. Environment Variables (optional)

Falls du später API-Keys oder Secrets brauchst:

**In Netlify Dashboard:**
1. Site Settings → Environment Variables
2. Add a variable
3. Neu deployen

**Oder via CLI:**
```bash
netlify env:set VARIABLE_NAME "value"
```

### 2. Custom Domain (optional)

**In Netlify Dashboard:**
1. Domain Settings → Add custom domain
2. Domain eingeben (z.B. `konfigurator.deine-firma.de`)
3. DNS-Einträge aktualisieren (Netlify zeigt dir die Werte)
4. SSL-Zertifikat wird automatisch erstellt

### 3. Build-Optimierungen

Die `netlify.toml` ist bereits konfiguriert mit:
- ✅ Next.js 14 Support
- ✅ Automatisches Caching
- ✅ Security Headers
- ✅ Node 20 Runtime
- ✅ @netlify/plugin-nextjs

---

## 📊 Nach dem Deployment

### URLs

Nach erfolgreichem Deployment bekommst du:

- **Production URL**: `https://dein-site-name.netlify.app`
- **Preview URLs**: Bei jedem Branch/PR (wenn Git-Methode)

### Dashboard-Features

Im Netlify Dashboard kannst du:
- 📈 Analytics sehen
- 🔄 Deploy-Historie anzeigen
- ⚡ Rollbacks durchführen
- 🌍 Domain verwalten
- 🔒 SSL-Zertifikate verwalten
- 📧 Notifications einrichten

---

## 🐛 Troubleshooting

### Build schlägt fehl

```bash
# Lokal testen
npm run build

# Build-Logs in Netlify anschauen
# Deploy-Log zeigt detaillierte Fehler
```

**Häufige Probleme:**
- **Node Version**: Überprüfe `netlify.toml` (sollte Node 20 sein)
- **Dependencies**: Stelle sicher alle Packages sind in `package.json`
- **TypeScript Errors**: Löse alle Lint-Fehler vor dem Deploy

### Site lädt nicht richtig

1. **Hard Refresh**: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)
2. **Cache löschen**: Netlify Dashboard → Deploys → Trigger deploy → Clear cache
3. **Build-Settings prüfen**: Publish directory muss `.next` sein

### 404 Fehler bei Navigation

→ Die `netlify.toml` enthält bereits die korrekten Redirects für Next.js Routing

### Styles fehlen

→ Tailwind CSS wird im Build-Prozess kompiliert, sollte automatisch funktionieren

---

## ⚡ Performance-Optimierungen

### 1. Asset-Optimierung

Netlify optimiert automatisch:
- ✅ Image-Kompression
- ✅ CSS/JS Minification
- ✅ Gzip/Brotli Compression

### 2. CDN

- Netlify hostet deine App auf einem globalen CDN
- Automatische Edge-Node-Verteilung
- Niedrige Latenz weltweit

### 3. Caching

Die `netlify.toml` ist bereits konfiguriert für:
- 1 Jahr Cache für `_next/static/*`
- Security Headers
- Immutable Assets

---

## 🔄 Continuous Deployment

Mit Git-basiertem Deployment hast du automatisch:

1. **Automatische Deployments**
   - Jeder Push auf `master` → Production Deploy
   - Jeder Push auf anderen Branch → Preview Deploy

2. **Deploy Previews**
   - Preview-URL für jeden Branch
   - Perfekt zum Testen vor Production

3. **Rollbacks**
   - Ein-Klick Rollback zu jedem vorherigen Deploy
   - Keine Downtime

---

## 📝 Deployment-Checklist

Vor dem Production-Deploy:

- [ ] Alle Tests laufen durch: `npm run test`
- [ ] Build funktioniert lokal: `npm run build`
- [ ] Alle Änderungen committed
- [ ] `.gitignore` aktuell (keine `node_modules`, `.env`, etc.)
- [ ] `netlify.toml` committed
- [ ] Environment Variables (falls nötig) in Netlify eingerichtet
- [ ] Domain (falls custom domain) vorbereitet

Nach dem Deploy:

- [ ] Site-URL testen
- [ ] Alle Features durchklicken
- [ ] Dark Mode testen
- [ ] Mobile Ansicht testen
- [ ] Performance mit Lighthouse checken

---

## 🎉 Erfolgreicher Deploy

Nach erfolgreichem Deployment:

```bash
# Git Log anzeigen
git log --oneline

# Netlify Status
netlify status

# Live-URL öffnen
netlify open:site
```

**Deine App ist jetzt live! 🚀**

- **URL**: `https://dein-site-name.netlify.app`
- **SSL**: Automatisch aktiviert (HTTPS)
- **CDN**: Weltweit verfügbar
- **Updates**: Automatisch bei jedem Git Push

---

## 🔗 Nützliche Links

- **Netlify Dashboard**: https://app.netlify.com
- **Next.js auf Netlify Docs**: https://docs.netlify.com/frameworks/next-js/
- **Netlify CLI Docs**: https://cli.netlify.com/
- **Status Page**: https://www.netlifystatus.com/

---

## 💡 Weitere Schritte (optional)

### Analytics einrichten

```bash
# Netlify Analytics aktivieren (kostenpflichtig)
# Im Dashboard: Analytics → Enable
```

### Forms hinzufügen

Falls du später Kontaktformulare brauchst:
- Netlify Forms sind kostenlos verfügbar
- Einfach `netlify` Attribut zu `<form>` hinzufügen

### Functions (Serverless)

Falls du später Backend-Logik brauchst:
- Netlify Functions (AWS Lambda)
- Ordner: `netlify/functions/`

---

**Stand**: v2.1.2  
**Letzte Aktualisierung**: Januar 2025

Viel Erfolg mit dem Deployment! 🎉


