# ⚡ Schnell-Anleitung: Netlify Deployment

## 🎯 Option 1: Mit GitHub (Empfohlen)

### Schritt 1: Auf GitHub pushen

```bash
# Falls noch kein GitHub Repo:
# 1. Erstelle neues Repo auf github.com
# 2. Dann:
git remote add origin https://github.com/DEIN-USERNAME/SalesSupportCCTV.git
git branch -M main
git push -u origin main

# Falls Repo bereits existiert:
git push origin master
```

### Schritt 2: Bei Netlify importieren

1. Gehe zu https://app.netlify.com
2. Klicke "Add new site" → "Import an existing project"
3. Wähle **GitHub**
4. Wähle dein Repository **SalesSupportCCTV**
5. Klicke **"Deploy"** (Settings sind bereits in `netlify.toml`)

✅ **Fertig!** Deine App wird deployt.

---

## 💨 Option 2: Netlify CLI (Schnell-Test)

```bash
# 1. CLI installieren
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Deployen
netlify init
# Folge den Prompts

# 4. Production Deploy
netlify deploy --prod
```

---

## 🌐 Nach dem Deployment

Du bekommst eine URL wie:
**`https://dein-site-name.netlify.app`**

---

## ❓ Probleme?

Lies die **vollständige Anleitung**: `NETLIFY_DEPLOYMENT.md`

---

Das war's! 🚀

