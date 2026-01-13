# 🗺️ Phase 2 - Detaillierte Roadmap

**Erstellt:** 13. Januar 2026  
**Rollback-Punkt:** `v1.0-phase2-start`  
**Aktueller Status:** 🚀 Priorität 1 startet

---

## 📍 **Rollback-Informationen:**

### **Zurücksetzen zum IST-Zustand:**
```bash
# Falls etwas schiefgeht:
git checkout v1.0-phase2-start

# Oder nur bestimmte Dateien:
git checkout v1.0-phase2-start -- pages/configurator.tsx
```

### **Was ist im Tag enthalten:**
- ✅ Konfigurator (Kameras, Standorte, Kabel, Hubsteiger)
- ✅ Benutzerverwaltung (Admin + Beta)
- ✅ Hersteller CRUD
- ✅ Produkte CRUD + CSV Import
- ✅ Tier-Defaults Management
- ✅ CSV/Excel Compiler (Vorbereitet)

**Commit:** `f9c3f77`  
**Branch:** `main`

---

## 🎯 **Priorität 1: Konfigurator-Integration**

### **Ziel:**
Konfigurator soll echte Produkte aus der Datenbank nutzen statt hardcoded Arrays.

### **Aktueller Zustand:**
```typescript
// Aktuell: Hardcoded Arrays in configurator.tsx
const cameraOptions = [
  { label: 'Dome Kamera', value: 'dome', ... },
  { label: 'Bullet Kamera', value: 'bullet', ... },
  // ...
]
```

### **Ziel-Zustand:**
```typescript
// Neu: Dynamisch aus Datenbank
const products = await fetchProductsByTier(tier, category)
const cameraOptions = products.map(p => ({
  label: p.name,
  value: p.id,
  price: p.uvp_cents / 100,
  // ...
}))
```

---

## 📋 **Schritt 1.1: Datenmodell erweitern**

### **A) Neue Tabelle: `configurator_products`**
```sql
CREATE TABLE public.configurator_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('eco', 'premium', 'high-risk')),
  category TEXT NOT NULL, -- 'camera', 'nvr', 'switch', 'monitor', etc.
  priority INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  
  -- Zusätzliche Konfigurator-Felder:
  bhe_time_minutes INT, -- Für Zeitberechnung
  required_accessories JSONB, -- z.B. ['mount_bracket', 'cable_5m']
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(product_id, tier, category)
);

-- Indizes
CREATE INDEX idx_configurator_products_tier_category 
  ON public.configurator_products(tier, category);
CREATE INDEX idx_configurator_products_priority 
  ON public.configurator_products(priority DESC);

-- RLS Policies
ALTER TABLE public.configurator_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read configurator_products"
  ON public.configurator_products FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage configurator_products"
  ON public.configurator_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );
```

### **B) Migration Script erstellen**
```bash
# Datei: supabase/migrations/add_configurator_products.sql
```

---

## 📋 **Schritt 1.2: API Routes erstellen**

### **A) `/api/configurator/products`**
```typescript
// GET: Produkte für Konfigurator abrufen
// Query: ?tier=eco&category=camera

interface ConfiguratorProduct {
  id: string
  name: string
  sku: string
  manufacturer: string
  uvp_cents: number
  category: string
  tier: string
  bhe_time_minutes: number
  required_accessories: string[]
  is_default: boolean
  priority: number
}

// Response:
{
  success: true,
  products: ConfiguratorProduct[],
  count: number
}
```

### **B) `/api/configurator/defaults`**
```typescript
// GET: Default-Produkte für alle Kategorien eines Tiers
// Query: ?tier=eco

// Response:
{
  success: true,
  defaults: {
    camera_dome: ConfiguratorProduct,
    camera_bullet: ConfiguratorProduct,
    nvr: ConfiguratorProduct,
    switch: ConfiguratorProduct,
    // ...
  }
}
```

---

## 📋 **Schritt 1.3: Tier-Defaults migrieren**

### **A) Existierende Tier-Defaults in neue Struktur**
```sql
-- Migration: tier_defaults → configurator_products
INSERT INTO public.configurator_products (product_id, tier, category, is_default, priority)
SELECT 
  product_id,
  tier,
  category,
  true, -- is_default
  priority
FROM public.tier_defaults;
```

### **B) Tier-Defaults Table erweitern (optional)**
```sql
-- Falls wir tier_defaults behalten wollen:
ALTER TABLE public.tier_defaults
  ADD COLUMN IF NOT EXISTS bhe_time_minutes INT,
  ADD COLUMN IF NOT EXISTS required_accessories JSONB;
```

---

## 📋 **Schritt 1.4: Konfigurator umstellen**

### **A) Produktauswahl-Komponente erstellen**
```tsx
// components/ProductSelector.tsx
interface ProductSelectorProps {
  tier: string
  category: string
  onSelect: (product: ConfiguratorProduct) => void
  value?: string
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  tier,
  category,
  onSelect,
  value
}) => {
  const [products, setProducts] = useState<ConfiguratorProduct[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchProducts()
  }, [tier, category])
  
  const fetchProducts = async () => {
    const res = await fetch(`/api/configurator/products?tier=${tier}&category=${category}`)
    const data = await res.json()
    setProducts(data.products)
    setLoading(false)
  }
  
  return (
    <select value={value} onChange={(e) => onSelect(products.find(p => p.id === e.target.value))}>
      {products.map(p => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.manufacturer}) - {(p.uvp_cents / 100).toFixed(2)}€
        </option>
      ))}
    </select>
  )
}
```

### **B) Konfigurator anpassen**
```typescript
// pages/configurator.tsx

// ALT: Hardcoded
const cameraType = 'dome'

// NEU: Dynamisch
const [selectedCamera, setSelectedCamera] = useState<ConfiguratorProduct | null>(null)

// In Step 2:
<ProductSelector
  tier={project.tier}
  category="camera_dome"
  value={selectedCamera?.id}
  onSelect={(product) => {
    setSelectedCamera(product)
    updateProject({ ...project, camera: product })
  }}
/>
```

---

## 📋 **Schritt 1.5: BOM-Generierung anpassen**

### **A) Preise aus Datenbank nutzen**
```typescript
// ALT: Hardcoded Preise
const cameraPrice = tier === 'eco' ? 199 : tier === 'premium' ? 299 : 399

// NEU: Aus selected Product
const cameraPrice = selectedCamera.uvp_cents / 100
```

### **B) BHE-Zeit aus Datenbank**
```typescript
// ALT: Hardcoded
const installTime = 45

// NEU: Aus Product
const installTime = selectedCamera.bhe_time_minutes
```

### **C) Zubehör automatisch hinzufügen**
```typescript
// NEU: Required Accessories
selectedCamera.required_accessories.forEach(accessory => {
  bom.push({
    category: 'Zubehör',
    name: accessory,
    quantity: selectedCamera.quantity,
    // ...
  })
})
```

---

## 📋 **Schritt 1.6: Admin-UI für Konfigurator-Produkte**

### **A) Neue Seite: `/admin/configurator-products`**
```tsx
// Ähnlich wie tier-defaults.tsx
// Funktionen:
- ✅ Liste aller Konfigurator-Produkte
- ✅ Filtern nach Tier + Kategorie
- ✅ Produkt zuweisen
- ✅ Default markieren
- ✅ Priorität setzen
- ✅ BHE-Zeit definieren
- ✅ Zubehör zuweisen
```

### **B) UI Layout:**
```
┌──────────────────────────────────────────────────┐
│  Konfigurator-Produkte                    [+ Neu]│
├──────────────────────────────────────────────────┤
│  Filter:                                          │
│  [ Tier: Alle ▾ ]  [ Kategorie: Alle ▾ ]        │
├──────────────────────────────────────────────────┤
│  Tier      Kategorie    Produkt           Default│
├──────────────────────────────────────────────────┤
│  Eco       Dome         AXIS M3068-P      ⭐     │
│  Eco       Bullet       Hikvision DS-2CD  -      │
│  Premium   Dome         AXIS P3245-LVE    ⭐     │
│  ...                                              │
└──────────────────────────────────────────────────┘
```

---

## 📋 **Schritt 1.7: Testing**

### **A) Unit Tests**
```typescript
// tests/configurator-products.test.ts
describe('Configurator Products', () => {
  test('Fetch products by tier and category', async () => {
    const products = await fetchConfiguratorProducts('eco', 'camera_dome')
    expect(products.length).toBeGreaterThan(0)
    expect(products[0]).toHaveProperty('name')
  })
  
  test('Default product is marked', async () => {
    const products = await fetchConfiguratorProducts('eco', 'camera_dome')
    const defaultProduct = products.find(p => p.is_default)
    expect(defaultProduct).toBeDefined()
  })
})
```

### **B) Integration Tests**
```typescript
// Konfigurator End-to-End Test
test('Configurator uses database products', async () => {
  // 1. Neues Projekt erstellen
  // 2. Tier auswählen
  // 3. Kamera auswählen (aus DB)
  // 4. BOM generieren
  // 5. Preise prüfen (aus DB)
})
```

---

## 📋 **Schritt 1.8: Deployment**

### **Checklist:**
```
✅ Migration erstellt
✅ Migration auf Supabase ausgeführt
✅ API Routes getestet
✅ Konfigurator umgestellt
✅ BOM-Generierung angepasst
✅ Admin-UI erstellt
✅ Tests geschrieben
✅ Linter-Check
✅ Build erfolgreich
✅ Deployment auf Netlify
✅ Smoke-Test auf Production
```

---

## 🎯 **Erfolgs-Kriterien:**

### **Must-Have:**
- ✅ Konfigurator lädt Produkte aus Datenbank
- ✅ Tier-Defaults funktionieren
- ✅ Preise werden korrekt angezeigt
- ✅ BOM-Generierung nutzt DB-Daten
- ✅ Admin kann Produkte zuweisen

### **Nice-to-Have:**
- ⭐ Auto-Auswahl des Default-Produkts
- ⭐ Produkt-Vergleich (mehrere Optionen anzeigen)
- ⭐ Preis-History (Änderungen tracken)
- ⭐ Bulk-Assignment (mehrere Tiers gleichzeitig)

---

## ⏱️ **Zeitschätzung:**

| Schritt | Aufwand | Zeit |
|---------|---------|------|
| 1.1 Datenmodell | Mittel | 1-2h |
| 1.2 API Routes | Mittel | 2-3h |
| 1.3 Migration | Klein | 0.5h |
| 1.4 Konfigurator | Groß | 4-6h |
| 1.5 BOM-Anpassung | Mittel | 1-2h |
| 1.6 Admin-UI | Groß | 3-4h |
| 1.7 Testing | Mittel | 2h |
| 1.8 Deployment | Klein | 0.5h |

**Gesamt:** ~14-20 Stunden

---

## 🚀 **Nächster Schritt:**

**JETZT STARTEN:** Schritt 1.1 - Datenmodell erweitern

```bash
# Migration erstellen:
touch supabase/migrations/add_configurator_products.sql
```

---

**Los geht's!** 🎯
