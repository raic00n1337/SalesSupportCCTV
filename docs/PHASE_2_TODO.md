# 🚀 Phase 2 - TODO-Liste für Implementation

**Erstellt:** 12. Januar 2026  
**Status:** 📋 Bereit für Start

---

## ✅ **BEREITS VORBEREITET** (Heute fertig!)

### **Dependencies:**
- ✅ `papaparse` installiert (CSV Parsing)
- ✅ `fuse.js` installiert (Fuzzy String Matching)
- ✅ `@types/papaparse` installiert
- ✅ `xlsx` bereits vorhanden (Excel Support)

### **Core Libraries:**
- ✅ `lib/csvCompilerTypes.ts` - Type Definitions
- ✅ `lib/formatProfiles.ts` - Hersteller-Profile (AXIS, Hikvision, Dahua, Hanwha)
- ✅ `lib/columnMapper.ts` - Auto-Detection & Fuzzy Matching
- ✅ `lib/dataTransformer.ts` - Transformations & Validierung
- ✅ `lib/csvCompiler.ts` - Core Compiler Logic

### **Backend:**
- ✅ `pages/api/admin/compile-csv.ts` - API Route (Compile, Import, Download)

### **Frontend:**
- ✅ `pages/admin/import-compiler.tsx` - Admin UI (Drag & Drop, Preview, Import)

---

## 🎯 **MORGEN - SCHRITT FÜR SCHRITT**

### **Phase 2.1 - Testing & Bugfixing (3-4h)**

#### **1. Linter-Fehler beheben**
- [ ] `read_lints` für alle neuen Dateien ausführen
- [ ] TypeScript-Fehler fixen
- [ ] Import-Paths überprüfen

#### **2. Funktionstest mit echten Daten**
- [ ] Test-CSV erstellen (AXIS Format)
- [ ] Test-CSV erstellen (Hikvision Format)
- [ ] Test-CSV erstellen (Unbekanntes Format)
- [ ] Upload testen
- [ ] Auto-Detection testen
- [ ] Preview testen
- [ ] Import testen
- [ ] Download testen

#### **3. Edge Cases testen**
- [ ] Leere Datei
- [ ] Ungültige Spalten
- [ ] Fehlende Required Fields
- [ ] Duplikate (SKU bereits vorhanden)
- [ ] Sehr große Datei (>1000 Zeilen)
- [ ] Excel-Datei mit mehreren Sheets

---

### **Phase 2.2 - UI/UX Verbesserungen (2-3h)**

#### **4. Column Mapping UI**
- [ ] Drag & Drop für Column Mapping
- [ ] Manuelle Anpassung der Mappings
- [ ] Visualisierung der Transformationen
- [ ] Sample-Daten je Spalte anzeigen

#### **5. Error Handling & Feedback**
- [ ] Bessere Fehler-Anzeige (Tabelle statt Liste)
- [ ] Progress-Bar beim Import
- [ ] Success-Animationen
- [ ] Download-Button-Feedback

#### **6. Format Profile Management**
- [ ] Profile speichern (Custom Profiles)
- [ ] Profile laden
- [ ] Profile löschen
- [ ] Profile exportieren/importieren

---

### **Phase 2.3 - Features Erweitern (3-4h)**

#### **7. Excel Multi-Sheet Support**
- [ ] Sheet-Auswahl anzeigen
- [ ] Mehrere Sheets gleichzeitig importieren
- [ ] Sheet-spezifische Mappings

#### **8. Advanced Transformations**
- [ ] Custom Transformation Rules hinzufügen
- [ ] Price-Format Detection (Auto-Detect Euro vs Cent)
- [ ] Category-Mapping (Auto-Suggest)
- [ ] Manufacturer Auto-Detect

#### **9. Duplicate Handling**
- [ ] Warnung bei SKU-Duplikaten
- [ ] Optionen: Update, Skip, Create New
- [ ] Bulk-Update Mode

---

### **Phase 2.4 - Polish & Documentation (2h)**

#### **10. UI Polish**
- [ ] Dark Mode optimieren
- [ ] Responsive Design testen
- [ ] Loading States verbessern
- [ ] Animationen hinzufügen

#### **11. Dokumentation**
- [ ] User Guide erstellen (Admin-Doku)
- [ ] Format-Profile dokumentieren
- [ ] API-Doku aktualisieren
- [ ] Screenshots für Guide

#### **12. Deployment**
- [ ] Alle Änderungen committen
- [ ] Pushen zu GitHub
- [ ] Netlify Build testen
- [ ] Live-Test auf Production

---

## 🔥 **OPTIONAL - Nice-to-Have**

### **Weitere Features (wenn Zeit):**
- [ ] Scheduled Imports (Cron-Jobs)
- [ ] API-Import von Hersteller-URLs
- [ ] Price-Update-Tool (nur Preise aktualisieren)
- [ ] Import-History (Log aller Imports)
- [ ] Batch-Edit im Preview
- [ ] Export-Funktion (DB → CSV)

---

## 📊 **ZEITPLANUNG**

| Phase | Dauer | Start | Ende |
|-------|-------|-------|------|
| 2.1 Testing & Bugfix | 3-4h | 09:00 | 13:00 |
| 2.2 UI/UX | 2-3h | 13:00 | 16:00 |
| 2.3 Features | 3-4h | 16:00 | 20:00 |
| 2.4 Polish | 2h | 20:00 | 22:00 |

**Gesamt:** ~10-13h (1 intensiver Tag)

---

## 🎯 **ERFOLGS-KRITERIEN**

Phase 2 gilt als **erfolgreich abgeschlossen**, wenn:

✅ CSV/Excel-Upload funktioniert  
✅ Auto-Detection erkennt mindestens 3 Formate  
✅ Column Mapping ist korrekt  
✅ Import in DB funktioniert fehlerfrei  
✅ Download von konvertierten CSVs funktioniert  
✅ Keine kritischen Bugs  
✅ UI ist intuitiv und responsive  
✅ Dokumentation ist vollständig  

---

## 🚦 **START-CHECKLISTE**

Vor dem Start morgen prüfen:

- [x] Dependencies installiert
- [x] Core-Dateien erstellt
- [x] API Route vorhanden
- [x] Admin-Seite vorhanden
- [ ] Git committed & gepusht
- [ ] Netlify deployed
- [ ] Test-Daten vorbereitet

---

## 📝 **NOTIZEN**

### **Bekannte Limitierungen:**
- Max. 10 MB File-Size (kann erhöht werden)
- Nur erste Sheet bei Excel (Multi-Sheet in Phase 2.3)
- Encoding-Detection noch nicht implementiert (immer UTF-8)

### **Wichtige Hinweise:**
- Backup der Datenbank vor großen Imports!
- Test-Daten zuerst im Dry-Run testen
- Bei Fehlern: Error-Log speichern

---

**Bereit für Phase 2! Let's go! 🚀**
