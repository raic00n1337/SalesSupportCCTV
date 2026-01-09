# Git Repository - Anleitung

## ✅ Git wurde erfolgreich installiert und eingerichtet!

### 📦 Aktueller Stand

- **Repository**: Initialisiert
- **Branch**: master
- **Commit**: v2.0.0 (bb7598a)
- **Tag**: v2.0.0
- **Status**: Clean (keine ungespeicherten Änderungen)
- **Dateien**: 21 Dateien committed (10.425 Zeilen Code)

---

## 🚀 Git-Befehle (für deine tägliche Arbeit)

### Status prüfen
```powershell
git status
```

### Änderungen anzeigen
```powershell
# Alle Änderungen seit letztem Commit
git diff

# Nur geänderte Dateien
git diff --name-only
```

### Änderungen speichern

```powershell
# Alle Änderungen zum Staging hinzufügen
git add .

# Oder nur spezifische Dateien
git add pages/index.tsx types.ts

# Commit erstellen
git commit -m "Beschreibung der Änderungen"
```

### Historie anzeigen

```powershell
# Kompakte Ansicht
git log --oneline

# Detaillierte Ansicht
git log

# Grafische Darstellung
git log --graph --oneline --all
```

### Branch erstellen (für neue Features)

```powershell
# Neuen Branch erstellen und wechseln
git checkout -b feature/mein-neues-feature

# Zurück zum master
git checkout master

# Branch mergen
git merge feature/mein-neues-feature
```

### Änderungen rückgängig machen

```powershell
# Einzelne Datei zurücksetzen
git checkout -- pages/index.tsx

# Alle Änderungen zurücksetzen (VORSICHT!)
git reset --hard HEAD
```

### Tags verwalten

```powershell
# Alle Tags anzeigen
git tag

# Neuen Tag erstellen
git tag -a v2.1.0 -m "Version 2.1.0"

# Tag löschen
git tag -d v2.0.0
```

---

## 📋 Typischer Workflow

### Tägliches Arbeiten

1. **Status prüfen**
```powershell
git status
```

2. **Änderungen speichern**
```powershell
git add .
git commit -m "Feature XY implementiert"
```

3. **Historie anschauen**
```powershell
git log --oneline -10  # Letzte 10 Commits
```

### Feature entwickeln

1. **Neuen Branch erstellen**
```powershell
git checkout -b feature/ip-export-verbessern
```

2. **Arbeiten und committen**
```powershell
# ... Code schreiben ...
git add .
git commit -m "IP-Export verbessert"
```

3. **Zurück zu master und mergen**
```powershell
git checkout master
git merge feature/ip-export-verbessern
```

4. **Branch löschen (optional)**
```powershell
git branch -d feature/ip-export-verbessern
```

---

## 🎯 Empfohlene Commit-Messages

```powershell
# Features
git commit -m "feat: Neue Funktion X hinzugefügt"

# Bugfixes
git commit -m "fix: Fehler bei Y behoben"

# Dokumentation
git commit -m "docs: README aktualisiert"

# Refactoring
git commit -m "refactor: Code in Modul Z umstrukturiert"

# Style/Format
git commit -m "style: Code formatiert"

# Tests
git commit -m "test: Tests für Feature X hinzugefügt"
```

---

## 🔄 Remote Repository (GitHub/GitLab) einrichten

Falls du später ein Remote-Repository nutzen möchtest:

```powershell
# Remote hinzufügen
git remote add origin https://github.com/dein-username/SalesSupportCCTV.git

# Pushen
git push -u origin master

# Tags pushen
git push --tags

# Pullen (Änderungen holen)
git pull origin master
```

---

## 📊 Nützliche Befehle

### Dateistatistik
```powershell
# Anzahl der Commits
git rev-list --count HEAD

# Größte Dateien im Repo
git ls-tree -r -t -l --full-name HEAD | Sort-Object -Property {$_.Split()[3]} -Descending | Select-Object -First 10
```

### Suchen im Code
```powershell
# Im gesamten Repository suchen
git grep "searchterm"

# In Historie suchen
git log --all --grep="Montagevarianten"
```

### Blame (wer hat was geändert)
```powershell
git blame pages/index.tsx
```

---

## 🚨 Wichtige Hinweise

### ⚠️ NIEMALS committen:
- `node_modules/` (wird durch .gitignore ausgeschlossen)
- `.env` Dateien mit Secrets
- Große Binary-Dateien (>50MB)
- Persönliche Konfigurationen

### ✅ IMMER committen:
- Source Code (`.ts`, `.tsx`, `.js`)
- Konfigurationsdateien (`package.json`, `tsconfig.json`)
- Dokumentation (`.md` Dateien)
- Tests

### 💡 Tipps:
- Committe oft und mit aussagekräftigen Messages
- Erstelle Branches für neue Features
- Nutze Tags für Releases (v1.0.0, v2.0.0, etc.)
- Prüfe regelmäßig `git status`

---

## 📞 Git-Hilfe

```powershell
# Allgemeine Hilfe
git help

# Hilfe zu spezifischem Befehl
git help commit
git help branch
```

---

## 🎉 Aktueller Stand gesichert!

✅ Git installiert  
✅ Repository initialisiert  
✅ Erster Commit erstellt (v2.0.0)  
✅ Tag gesetzt (v2.0.0)  
✅ Alle 21 Dateien gesichert (10.425 Zeilen)

**Du bist bereit für morgen!** 🚀





