import Link from 'next/link'
import { useAuth } from '../lib/AuthContext'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // If already logged in, redirect to projects
  useEffect(() => {
    if (!loading && user) {
      router.push('/projects')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Logo / Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Sales Support CCTV
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Professioneller Konfigurator für Video-Sicherheitssysteme
          </p>
        </div>

        {/* Main Content - Two Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Guest Mode */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-primary-500 transition-all">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full mb-4">
                <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Als Gast starten
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Sofort loslegen ohne Registrierung
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Vollständiger Zugriff auf alle 6 Konfigurationsschritte</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">BOM, PDF & Excel Export sofort verfügbar</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Keine Speicherung - Daten gehen beim Schließen verloren</span>
              </li>
            </ul>

            <Link
              href="/configurator"
              className="block w-full py-4 px-6 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors text-center text-lg"
            >
              Konfigurator starten →
            </Link>
          </div>

          {/* Login Mode */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border-2 border-primary-500 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                EMPFOHLEN
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Mit Account arbeiten
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Projekte speichern und verwalten
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Projekte dauerhaft speichern & jederzeit bearbeiten</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Projekt-Übersicht mit Details & Historie</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Alle Features wie im Gast-Modus</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Kostenlose Registrierung</span>
              </li>
            </ul>

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors text-center text-lg"
              >
                Anmelden
              </Link>
              <Link
                href="/register"
                className="block w-full py-3 px-6 bg-white dark:bg-slate-700 border-2 border-primary-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-600 font-semibold rounded-lg transition-colors text-center"
              >
                Kostenlos registrieren
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-16 text-gray-500 dark:text-gray-400">
          <p className="text-sm">
            Entwickelt für professionelle Video-Sicherheitssysteme • BHE-konforme Zeitberechnung • IP-Management
          </p>
        </div>
      </div>
    </div>
  )
}
