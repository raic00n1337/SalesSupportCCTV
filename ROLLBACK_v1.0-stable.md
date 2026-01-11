# 📍 Rollback-Punkt: v1.0-stable

**Datum:** 2026-01-11  
**Commit:** 9422228  
**Tag:** v1.0-stable  
**Deploy:** https://salessupportcctv.netlify.app

---

## ✅ **Was funktioniert in dieser Version:**

### **Kernfunktionen:**
- ✅ Konfigurator mit allen 6 Steps (rein client-side)
- ✅ BOM-Berechnung mit BHE-Zeiten
- ✅ PDF & Excel Export
- ✅ IP-Dokumentation
- ✅ Kamera-Benennung (inkl. IP-Lautsprecher)
- ✅ Montagevarianten (Wand/Decke/Mast)
- ✅ HDD-Empfehlungen mit DSGVO-Warnung
- ✅ VMS-Server Auto-Addition
- ✅ UTF-8 Encoding korrekt (alle Umlaute)

### **Authentifizierung & Projekte:**
- ✅ Supabase Auth mit Session Storage (passiv)
- ✅ Login/Logout/Registrierung
- ✅ Projekt-Übersicht mit explizitem "Projekte laden" Button
- ✅ Auto-Load nach Login (einmalig)
- ✅ Keine Ladeschleifen bei Tab-Wechsel
- ✅ Keine automatischen Supabase-Calls

### **UI/UX:**
- ✅ Landing Page mit Gast/Login-Optionen
- ✅ CI-Farben (HEX #8D5FFF, #D7D8DD6, #C2B4FC)
- ✅ Dark Mode Support
- ✅ Responsive Design

---

## 🔄 **Rollback-Anleitung:**

### **Falls etwas kaputt geht, zurück zu diesem Stand:**

```bash
# 1. Lokale Änderungen verwerfen
git reset --hard v1.0-stable

# 2. Zu GitHub pushen (force)
git push --force origin main

# 3. Neu deployen
netlify deploy --prod
```

### **Oder nur anschauen (ohne Änderungen):**

```bash
# Checkout des Tags (read-only)
git checkout v1.0-stable

# Zurück zu main
git checkout main
```

---

## 📦 **Datenbank-Schema (Supabase):**

Falls auch die Datenbank zurückgesetzt werden muss:
- SQL-Backup in: `supabase/schema.sql`
- Admin-User: `willuweit.rico@securitas.de`

---

## 🌐 **Deployment:**

- **Netlify Site:** salessupportcctv
- **Production URL:** https://salessupportcctv.netlify.app
- **Build Command:** `npm run build`
- **Publish Directory:** `out`

---

## 🐛 **Bekannte Einschränkungen:**

1. **Speichern-Button im Konfigurator:** Nur Placeholder (noch nicht implementiert)
2. **Projekt laden im Konfigurator:** Noch nicht möglich
3. **Local Storage:** Gast-Daten gehen bei Reload verloren

**Diese Features werden in der nächsten Version hinzugefügt!**

---

## 📝 **Nächste geplante Features:**

- [ ] Save-Funktion im Konfigurator
- [ ] Load aus URL (`?projectId=xyz`)
- [ ] Local Storage für Gast-Modus
- [ ] Auto-Save (debounced)
- [ ] Projekt duplizieren

---

## ⚠️ **WICHTIG:**

Dieser Tag ist ein **STABILER STAND**. Alle Tests sind bestanden:
- ✅ Login funktioniert
- ✅ Projekte laden funktioniert
- ✅ Konfigurator funktioniert
- ✅ Tab-Wechsel funktioniert
- ✅ Umlaute sind korrekt

**Bei Problemen: Immer hierhin zurück!**
