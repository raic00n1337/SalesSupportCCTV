# 🚀 Quick Reference - Video-System-Konfigurator

## Server starten
```bash
npm run dev
```
→ App läuft auf http://localhost:3000

---

## Wichtigste Dateien

| Datei | Beschreibung |
|-------|--------------|
| `pages/index.tsx` | Haupt-App mit allen 6 Steps (2100+ Zeilen) |
| `types.ts` | TypeScript Interfaces & Datenmodell |
| `ipHelper.ts` | IP-Adress-Verwaltung & Zuweisung |
| `mountAccessories.ts` | **Montagezubehör-Logik (NEU)** ⭐ |
| `PROJECT_STATUS.md` | **Vollständiger Projekt-Status** 📋 |
| `CHANGELOG.md` | Versions-Historie |

---

## Neue Features (v2.0.0)

### ⭐ Montagevarianten für Kameras
- **Wo**: Step 4 - Kamera-Konfiguration
- **Was**: Jede Kamera hat Anzahl + Montageart
- **Optionen**:
  - Wandmontage (29-89€)
  - Deckenmontage (35-99€)
  - Mastmontage (45-145€)
- **Ergebnis**: Automatisches Zubehör in Stückliste

---

## Datenstruktur (wichtig!)

### Alte Struktur (v1.x)
```typescript
cameras: {
  domeFixed: 5  // nur Zahl
}
```

### Neue Struktur (v2.0) ⭐
```typescript
cameras: {
  domeFixed: {
    quantity: 5,
    mount: 'wall'  // 'wall' | 'ceiling' | 'pole'
  }
}
```

---

## Workflow

1. **Step 1**: Projektname + Remote
2. **Step 2**: Standorte hinzufügen
3. **Step 3**: Paket, Hersteller, NVR/VMS, Speicher
4. **Step 4**: **Kameras + Montagevarianten** ⭐
5. **Step 5**: Verkabelung + optional IP-Doku
6. **Step 6**: Stückliste + Excel-Export

---

## Excel-Export

- **Wo**: Step 6, Abschnitt "IP-Dokumentation"
- **Button**: "Excel Export (.xlsx)"
- **Datei**: `IP-Dokumentation_Projektname_2026-01-02.xlsx`
- **Inhalt**: 
  - Pro Standort ein Tab
  - Alle Geräte mit IPs
  - Editierte Bezeichnungen
  - Formatiert & druckfertig

---

## Troubleshooting

### Server startet nicht
```bash
# Node-Prozesse beenden
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Neu starten
npm run dev
```

### Build-Fehler
```bash
npm run build
# Fehler in Konsole prüfen
```

### "Cannot find module"
```bash
npm install
```

---

## Nächste Session

Lies zuerst: **`PROJECT_STATUS.md`**

Dort findest du:
- Vollständigen aktuellen Stand
- Alle implementierten Features
- Datenmodell-Beschreibung
- Mögliche nächste Schritte

---

## Status

✅ **Produktiv & Lauffähig**  
✅ **Build erfolgreich**  
✅ **Keine bekannten Fehler**  
✅ **Alle Features funktionieren**

**Version**: 2.0.0 (Montagevarianten Release)  
**Stand**: 02.01.2026, 23:50 Uhr





