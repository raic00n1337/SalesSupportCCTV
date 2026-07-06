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

    setSaving(key)
    try {
      const { error: updateError } = await (supabase
        .from('configurator_settings') as any)
        .update({ value })
        .eq('key', key)

      if (updateError) throw updateError

      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
      setSavedKey(key)
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000)
    } catch (err: any) {
      console.error('Error saving setting:', err)
      alert(`Fehler: ${err.message}`)
    } finally {
      setSaving(null)
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Konfigurator-Einstellungen
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Formel-Parameter der BOM-Berechnung (Stundensatz, Anfahrtspauschale, Dokumentations-%, etc.).
          Änderungen wirken sich sofort auf alle neu berechneten Angebote im Konfigurator aus.
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm divide-y divide-gray-200 dark:divide-gray-700">
          {settings.map((setting) => (
            <div key={setting.key} className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white">{setting.label}</div>
                {setting.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{setting.description}</div>
                )}
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Key: {setting.key}</div>
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
                <button
                  onClick={() => handleSave(setting.key)}
                  disabled={saving === setting.key}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {saving === setting.key ? 'Speichere...' : savedKey === setting.key ? '✓ Gespeichert' : 'Speichern'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
