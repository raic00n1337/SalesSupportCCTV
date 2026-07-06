// Admin: Konfigurator-Einstellungen verwalten
// Zweck: Formel-Parameter der BOM-Berechnung (Stundensatz, Anfahrtspauschale, Doku-%, etc.)
// pflegen, ohne Code anfassen zu müssen.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import AdminLayout from '../../components/AdminLayout'

interface SettingRow {
  key: string
  label: string
  value: number
  unit: string | null
  description: string | null
  category: 'pricing' | 'bhe_time'
  bhe_default_value: number | null
}

const CATEGORY_LABELS: Record<string, string> = {
  pricing: 'Preis-Parameter',
  bhe_time: 'BHE-Zeitenmodell (Montagezeiten)'
}

export default function ConfiguratorSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [settings, setSettings] = useState<SettingRow[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    loadSettings()
  }, [user])

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('configurator_settings')
        .select('*')
        .order('key', { ascending: true })

      if (fetchError) throw fetchError

      setSettings(data as SettingRow[])
      const values: Record<string, string> = {}
      ;(data as SettingRow[]).forEach((row) => { values[row.key] = String(row.value) })
      setEditedValues(values)
    } catch (err: any) {
      console.error('Error loading configurator_settings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key: string) => {
    const raw = editedValues[key]
    const value = parseFloat(raw)
    if (Number.isNaN(value)) {
      alert('Bitte einen gültigen Zahlenwert eingeben.')
      return
    }

    await saveValue(key, value)
  }

  const saveValue = async (key: string, value: number) => {
    setSaving(key)
    try {
      const { error: updateError } = await (supabase
        .from('configurator_settings') as any)
        .update({ value })
        .eq('key', key)

      if (updateError) throw updateError

      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
      setEditedValues((prev) => ({ ...prev, [key]: String(value) }))
      setSavedKey(key)
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000)
    } catch (err: any) {
      console.error('Error saving setting:', err)
      alert(`Fehler: ${err.message}`)
    } finally {
      setSaving(null)
    }
  }

  const handleResetToBheDefault = (setting: SettingRow) => {
    if (setting.bhe_default_value == null) return
    saveValue(setting.key, setting.bhe_default_value)
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Konfigurator-Einstellungen
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Formel-Parameter der BOM-Berechnung (Stundensatz, Anfahrtspauschale, Dokumentations-%, etc.)
          sowie das komplette BHE-Zeitenmodell für die Montagezeit-Berechnung. Änderungen wirken sich
          sofort auf alle neu berechneten Angebote im Konfigurator aus.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Laden...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            Fehler: {error} (Tabelle <code>configurator_settings</code> vorhanden? Migration ausgeführt?)
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(['pricing', 'bhe_time'] as const).map((category) => {
            const rows = settings.filter((s) => (s.category || 'pricing') === category)
            if (rows.length === 0) return null
            return (
              <div key={category}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {CATEGORY_LABELS[category]}
                </h2>
                {category === 'bhe_time' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Zeitkonstanten aus der offiziellen BHE-Zeitwerttabelle. Weicht ein Wert von der
                    BHE-Vorgabe ab, wird das markiert - über "Zurücksetzen" kannst du jederzeit zur
                    Vorgabe zurückkehren (z.B. wenn sich die BHE-Vorgaben ändern und der Referenzwert
                    per DB-Update aktualisiert wurde).
                  </p>
                )}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((setting) => {
                    const isDeviating =
                      setting.bhe_default_value != null &&
                      parseFloat(editedValues[setting.key] ?? '') !== setting.bhe_default_value
                    return (
                      <div key={setting.key} className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {setting.label}
                            {isDeviating && (
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                weicht von BHE-Vorgabe ab
                              </span>
                            )}
                          </div>
                          {setting.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{setting.description}</div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Key: {setting.key}
                            {setting.bhe_default_value != null && (
                              <> · BHE-Vorgabe: {setting.bhe_default_value} {setting.unit}</>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            value={editedValues[setting.key] ?? ''}
                            onChange={(e) => setEditedValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                            className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                          />
                          {setting.unit && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 w-20">{setting.unit}</span>
                          )}
                          {setting.bhe_default_value != null && (
                            <button
                              onClick={() => handleResetToBheDefault(setting)}
                              disabled={saving === setting.key || !isDeviating}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40 whitespace-nowrap text-sm"
                              title="Auf BHE-Vorgabe zurücksetzen"
                            >
                              ↺ Zurücksetzen
                            </button>
                          )}
                          <button
                            onClick={() => handleSave(setting.key)}
                            disabled={saving === setting.key}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
                          >
                            {saving === setting.key ? 'Speichere...' : savedKey === setting.key ? '✓ Gespeichert' : 'Speichern'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}
