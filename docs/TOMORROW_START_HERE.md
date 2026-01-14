# 🚀 Start hier morgen!

**Datum:** 2026-01-15  
**Aufgabe:** System Designer auf CCTV Design Tool Level bringen

---

## ✅ Gestern erreicht (2026-01-14)

- [x] Grundriss-Upload funktioniert
- [x] Kamera-Icons statt rote Punkte (🎥📹🔄🌡️)
- [x] Delete-Funktion für Grundrisse
- [x] Auto-Import aus Konfigurator (Code vorhanden)
- [x] Detection Cones (basic)
- [x] Drag & Drop für Kameras
- [x] Beschriftungen

**Letzter Commit:** `6beb3e8` - "Fix importCamerasFromConfigurator order"  
**Status:** Build läuft, noch nicht getestet

---

## 🎯 Prioritäten für heute

### 1️⃣ **KRITISCH: Konfigurator-Sync testen & fixen**

**Was tun:**
1. Netlify Build abwarten
2. Im Konfigurator Projekt mit Kameras erstellen
3. "System Designer" öffnen
4. Prüfen ob Kameras automatisch importiert werden

**Falls nicht funktioniert:**
- Browser Console öffnen (F12)
- Fehler kopieren
- Mir zeigen → Ich fixe es

**Erwartetes Ergebnis:**
- Kameras erscheinen automatisch im Grid (5 Spalten)
- Labels: "[Site Name] - [Kamera Name]"

---

### 2️⃣ **WICHTIG: FOV-Berechnung implementieren**

**Reihenfolge:**
1. **SQL Migration ausführen** (`supabase/migrations/add_camera_specs.sql`)
2. **Admin UI erweitern** für Kamera-Specs (Brennweite, Sensor, etc.)
3. **Calculation Library** erstellen (`lib/cameraCalculations.ts`)
4. **DORI-Zonen** visualisieren (4 Kreise statt 1 Kegel)

**Dateien:**
- `docs/SYSTEM_DESIGNER_ROADMAP.md` - Kompletter Plan
- `supabase/migrations/add_camera_specs.sql` - SQL zum Ausführen
- `lib/cameraCalculations.ts` - Code-Vorlage

---

### 3️⃣ **NICE: Refresh-Button für Sync**

**Quick Win:** Button zum manuellen Neu-Laden der Kameras aus Konfigurator.

```typescript
// In [projectId].tsx
<button onClick={handleRefreshFromConfigurator}>
  🔄 Kameras neu laden
</button>
```

---

## 📋 Vollständiger Plan

**Siehe:** `docs/SYSTEM_DESIGNER_ROADMAP.md`

**Zusammenfassung:**
- **Phase 1:** Kamera-Specs & FOV (1-2 Tage)
- **Phase 2:** DORI-Zonen & Visualisierung (1 Tag)
- **Phase 3:** Sync & Kalibrierung (1 Tag)
- **Phase 4:** Polish (0.5 Tag)

**Total:** 3.5-4.5 Tage bis Feature-Parität mit [CCTV Design Tool](https://cctvdesigntool.com/)

---

## 🛠️ Bereit zum Starten?

### Option A: Auto-Import erst mal testen
```
1. Warte auf Netlify Build (Commit 6beb3e8)
2. Teste im Browser
3. Zeige mir Ergebnisse/Fehler
4. Ich fixe was nötig ist
```

### Option B: Direkt mit FOV starten
```
1. SQL Migration ausführen
2. Admin UI erweitern
3. Calculations implementieren
4. DORI-Zonen visualisieren
```

**Empfehlung:** Option A zuerst - Auto-Import muss funktionieren, bevor wir FOV machen!

---

## 📞 Bei Problemen

**Zeige mir:**
- Browser Console Errors (F12)
- Netlify Build Logs (falls Build fehlschlägt)
- Screenshots von unerwartetem Verhalten

**Ich helfe mit:**
- Debugging
- Code-Fixes
- SQL-Migrations
- TypeScript-Errors

---

**Viel Erfolg morgen!** 🎯  
Wir bauen das zu einem professionellen Tool aus! 💪
