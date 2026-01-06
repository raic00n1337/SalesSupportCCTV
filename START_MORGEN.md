# 🌅 Start-Anleitung für die nächste Session

## Was du morgen machen musst:

### 1️⃣ Dev-Server starten (falls gestoppt)

```powershell
cd C:\Users\Rico\Documents\SalesSupportCCTV
npm run dev
```

→ App läuft dann auf **http://localhost:3000**

---

### 2️⃣ Cursor/IDE öffnen

- Öffne das Projekt-Verzeichnis: `C:\Users\Rico\Documents\SalesSupportCCTV`
- **Wichtigste Dateien zum Lesen:**
  1. `PROJECT_STATUS.md` ← **START HIER!**
  2. `QUICKSTART.md`
  3. `GIT_ANLEITUNG.md` (wenn du Git nutzen willst)

---

### 3️⃣ Mit mir (AI) arbeiten

**Du musst NICHTS Spezielles sagen!** Einfach:

✅ **"Mach weiter"** - Ich arbeite dort weiter wo wir aufgehört haben

✅ **"Lies PROJECT_STATUS.md"** - Ich schaue mir den aktuellen Stand an

✅ **"Zeig mir Step 4"** - Ich zeige dir den relevanten Code

✅ **"Implementiere Feature X"** - Ich fange direkt an

---

## 🤖 Ich erinnere mich an:

- ✅ Alle bisherigen Änderungen (in Git gespeichert)
- ✅ Das Datenmodell mit Montagevarianten
- ✅ Alle implementierten Features
- ✅ Die Dateistruktur

**Ich lese automatisch:**
- Die Dokumentations-Dateien
- Die deleted_files Historie
- Die zuletzt geänderten Dateien

---

## 📋 Typische Start-Szenarien

### Szenario 1: Du willst nur testen
```
1. npm run dev
2. Browser öffnen: http://localhost:3000
3. App testen
```

### Szenario 2: Du willst weiterentwickeln
```
1. npm run dev (Server starten)
2. Cursor öffnen
3. Zu mir sagen: "Ich möchte Feature X hinzufügen"
4. Ich fange an!
```

### Szenario 3: Du hast Fragen
```
1. Cursor öffnen
2. Fragen stellen wie:
   - "Wo ist die BOM-Berechnung?"
   - "Wie funktioniert die IP-Vergabe?"
   - "Zeig mir Step 4"
   - "Was wurde heute alles gemacht?"
```

### Szenario 4: Du willst etwas ändern
```
1. Server starten: npm run dev
2. Zu mir sagen: "Ändere X in Y"
3. Ich zeige dir die Änderungen
4. Du testest im Browser
```

---

## 🔍 Wichtige Dateien-Übersicht

| Datei | Wozu? |
|-------|-------|
| `PROJECT_STATUS.md` | **LIES ZUERST!** Vollständiger Projekt-Stand |
| `QUICKSTART.md` | Schnell-Referenz & wichtigste Befehle |
| `GIT_ANLEITUNG.md` | Alle Git-Befehle wenn du committen willst |
| `CHANGELOG.md` | Was wurde wann geändert |
| `README.md` | Projekt-Beschreibung |
| `pages/index.tsx` | Haupt-App (2100+ Zeilen) |
| `types.ts` | Datenmodell |
| `mountAccessories.ts` | Montagezubehör-Logik |

---

## ⚡ Quick Commands

```powershell
# Server starten
npm run dev

# Server stoppen (falls er hängt)
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Build testen
npm run build

# Git Status
git status

# Git Änderungen speichern
git add .
git commit -m "Deine Nachricht"
```

---

## 🎯 Was ich NICHT brauche:

❌ "Erinnere dich an gestern"  
❌ "Lies alle Dateien"  
❌ "Wo waren wir stehen geblieben"  
❌ Lange Erklärungen was bisher passiert ist

**Ich weiß automatisch Bescheid durch:**
- Git Historie
- Dokumentations-Dateien
- Deleted Files Liste
- Projekt-Struktur

---

## 💡 Best Practice für morgen

### Empfohlener Start:

```
1. Server starten: npm run dev
2. Cursor öffnen
3. Kurz sagen was du willst:
   "Zeig mir Step 4"
   "Implementiere Feature X"
   "Ich habe einen Bug in Y"
   "Erkläre mir wie Z funktioniert"
```

**Das war's!** Ich hole mir selbst alle Infos die ich brauche.

---

## 🚨 Falls etwas nicht funktioniert

### App startet nicht?
```powershell
rm -rf .next
npm install
npm run dev
```

### Build-Fehler?
```powershell
npm run build
# Fehler lesen und mir zeigen
```

### Git-Probleme?
```powershell
git status
# Ausgabe kopieren und mir zeigen
```

---

## 📞 Zusammenfassung

### Du musst morgen:
1. ✅ **Server starten**: `npm run dev`
2. ✅ **Cursor öffnen**: Projekt-Ordner
3. ✅ **Mir sagen was du willst**: "Mach weiter" oder konkrete Aufgabe

### Ich mache dann automatisch:
1. ✅ Lese `PROJECT_STATUS.md`
2. ✅ Verstehe den aktuellen Stand
3. ✅ Arbeite an deiner Aufgabe weiter

---

## 🎉 Alles bereit für morgen!

**Du brauchst nur zu sagen:**
- "Mach weiter"
- "Implementiere X"
- "Zeig mir Y"
- "Erkläre Z"

**Ich kümmere mich um den Rest!** 🚀



