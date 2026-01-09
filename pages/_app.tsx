import '../globals.css'
import type { AppProps } from 'next/app'
import { useState, useEffect } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import { AuthProvider } from '../lib/AuthContext'

export default function App({ Component, pageProps }: AppProps) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (darkMode) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }

  return (
    <>
      <Head>
        <title>Video-System-Konfigurator | Securitas Technology</title>
        <meta name="description" content="Professioneller Konfigurator für Video-Überwachungssysteme" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </Head>
      <AuthProvider>
        <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
          <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img 
                  src={darkMode ? "/logo-dark.svg" : "/logo.svg"}
                  alt="Securitas Technology Logo" 
                  className="h-16 w-auto"
                />
                <div className="hidden sm:block border-l border-gray-300 dark:border-slate-600 h-16"></div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Video-System-Konfigurator
                </h1>
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </header>
          <main>
            <Component {...pageProps} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          </main>
        </div>
      </AuthProvider>
    </>
  )
}

