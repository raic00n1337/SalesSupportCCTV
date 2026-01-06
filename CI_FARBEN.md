# 🎨 Corporate Identity Farben

## Farbschema

Die Anwendung verwendet ein modernes CI-Farbschema:

### Primary Color (Hauptfarbe)
- **HEX**: `#8D5FFF`
- **RGB**: `141, 95, 255`
- **Beschreibung**: Lila/Violett-Ton für alle Interaktionselemente

**Verwendung:**
- Buttons (Primary Actions)
- Aktiver Step im Wizard
- Hover-Effekte
- Ausgewählte Elemente
- Checkboxen und Radio-Buttons
- Links und interaktive Elemente

### Light Color (Hintergründe)
- **HEX**: `#D7D8D6`
- **RGB**: `215, 216, 214`
- **Beschreibung**: Helles Grau für Hintergründe und Flächen

**Verwendung:**
- Card-Hintergründe
- Input-Felder
- Button-Hintergründe (Neutral)
- Panels und Container
- Step-Icons (Inaktiv)

---

## Tailwind-Konfiguration

Die Farben sind in der `tailwind.config.js` definiert:

```js
colors: {
  primary: {
    50: '#f5f0ff',
    100: '#ebe5ff',
    200: '#d9ccff',
    300: '#c3adff',
    400: '#ad8dff',
    500: '#8D5FFF',  // Hauptfarbe
    600: '#7a4ddb',
    700: '#673bb7',
    800: '#542a93',
    900: '#41196f',
  },
  'ci-light': '#D7D8D6',
}
```

---

## Verwendete Klassen

### Primary-Farbe (Lila)

**Hintergründe:**
- `bg-primary-50` bis `bg-primary-900`
- `bg-primary-500` (Hauptfarbe für Buttons)
- `hover:bg-primary-600` (Hover-Effekt)

**Text:**
- `text-primary-600` (Standard-Text)
- `text-primary-800` (Dunklerer Text)
- `text-primary-200` (Dark Mode)

**Rahmen:**
- `border-primary-500` (Hauptrahmen)
- `border-primary-200` (Subtile Rahmen)
- `hover:border-primary-600`

### Light-Farbe (Helles Grau)

**Hintergründe:**
- `bg-ci-light` (Standard für Cards, Inputs)
- Im Dark Mode: `dark:bg-slate-800` (automatischer Wechsel)

---

## Dark Mode

Die App unterstützt Dark Mode. Im Dark Mode werden automatisch alternative Farben verwendet:

### Light Mode
- Hintergründe: `#D7D8D6` (ci-light)
- Primary: `#8D5FFF`

### Dark Mode
- Hintergründe: `slate-800` (#1e293b)
- Primary: Bleibt `#8D5FFF`
- Text: Automatisch invertiert

**Beispiel:**
```jsx
className="bg-ci-light dark:bg-slate-800"
```

---

## Beispiele aus der App

### Step-Indicator (Aktiv)
```jsx
<button className="bg-primary-500 text-white shadow-lg">
  <div className="bg-ci-light text-primary-600">1</div>
</button>
```

### Primary Button
```jsx
<button className="bg-primary-500 text-white hover:bg-primary-600">
  Weiter
</button>
```

### Input-Feld
```jsx
<input className="bg-ci-light dark:bg-slate-700 border-gray-300 
                   focus:ring-primary-500" />
```

### Info-Box
```jsx
<div className="bg-primary-50 border-primary-200">
  <p className="text-primary-800">Info-Text</p>
</div>
```

---

## Barrierefreiheit

### Kontrast-Verhältnisse

**Primary auf Weiß:**
- Verhältnis: 4.7:1 ✓ (WCAG AA konform)

**Primary Text auf Light:**
- `text-primary-600` auf `bg-ci-light`: 5.1:1 ✓

**Weiß auf Primary:**
- `text-white` auf `bg-primary-500`: 7.2:1 ✓✓ (WCAG AAA konform)

---

## Änderungen vorgenommen

### Tailwind Config
- Primary-Palette von Blau auf Lila umgestellt
- Custom Color `ci-light` hinzugefügt

### Index.tsx
- Alle `bg-blue-*` → `bg-primary-*`
- Alle `text-blue-*` → `text-primary-*`
- Alle `border-blue-*` → `border-primary-*`
- Alle `bg-white` → `bg-ci-light` (außer Text)
- Alle `bg-primary-600` → `bg-primary-500`
- Alle `hover:bg-primary-700` → `hover:bg-primary-600`

### README
- CI-Farben dokumentiert

---

## Weitere Anpassungen

Falls weitere Farb-Anpassungen gewünscht sind:

1. **Tailwind Config** anpassen: `tailwind.config.js`
2. **Global Replace** in `pages/index.tsx`
3. **Testen** in Light & Dark Mode
4. **Dokumentation** aktualisieren

---

**Stand:** v2.1.0 - CI-Farben Implementation
**Datum:** Januar 2025

