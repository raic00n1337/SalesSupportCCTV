import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useAuth } from '../lib/AuthContext'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: resetError } = await resetPassword(email)
      
      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-6 border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-2">
              E-Mail gesendet!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              Wir haben Ihnen eine E-Mail mit Anweisungen zum Zurücksetzen Ihres Passworts gesendet.
              Bitte überprüfen Sie Ihr Postfach.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500"
            >
              ← Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Passwort zurücksetzen
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
          
          <div className="rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                E-Mail-Adresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
                placeholder="ihre@email.de"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Wird gesendet...' : 'Zurücksetzungs-Link senden'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/login" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500">
              ← Zurück zur Anmeldung
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
