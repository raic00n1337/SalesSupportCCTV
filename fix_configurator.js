const fs = require('fs');
const { execSync } = require('child_process');

// Get the file from git (commit before all encoding issues)
const gitContent = execSync('git show 740a398~1:pages/index.tsx', { encoding: 'utf8' });

// Parse it line by line to ensure proper encoding
const lines = gitContent.split('\n');

// Replace the function name and add imports
const modifiedLines = [];
let lineNum = 0;
for (const line of lines) {
  if (lineNum === 0 && line.startsWith('import { useState }')) {
    modifiedLines.push("// UTF-8 Encoding Fix - Build v3");
    modifiedLines.push("import { useState } from 'react'");
    modifiedLines.push("import Link from 'next/link'");
    modifiedLines.push("import { useAuth } from '../lib/AuthContext'");
    // Skip original import
    continue;
  }
  
  if (line.includes('export default function Home()')) {
    modifiedLines.push('export default function Configurator() {');
    modifiedLines.push('  const { user } = useAuth()');
    modifiedLines.push('  const [currentStep, setCurrentStep] = useState(1)');
    modifiedLines.push("  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')");
    continue;
  }
  
  if (line.includes('const [currentStep, setCurrentStep] = useState(1)')) {
    // Already added above
    continue;
  }
  
  // Add header before "return ("
  if (line.trim() === 'return (' && !modifiedLines.some(l => l.includes('Header with optional Save'))) {
    modifiedLines.push('  return (');
    modifiedLines.push('    <div className="max-w-6xl mx-auto px-4 py-8">');
    modifiedLines.push('      {/* Header with optional Save */}');
    modifiedLines.push('      <div className="mb-6 flex justify-between items-center">');
    modifiedLines.push('        <Link');
    modifiedLines.push('          href="/"');
    modifiedLines.push('          className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"');
    modifiedLines.push('        >');
    modifiedLines.push('          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">');
    modifiedLines.push('            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />');
    modifiedLines.push('          </svg>');
    modifiedLines.push('          Zur Startseite');
    modifiedLines.push('        </Link>');
    modifiedLines.push('');
    modifiedLines.push('        {user && (');
    modifiedLines.push('          <div className="flex items-center gap-4">');
    modifiedLines.push('            <Link');
    modifiedLines.push('              href="/projects"');
    modifiedLines.push('              className="text-gray-600 dark:text-gray-400 hover:text-primary-600 font-medium"');
    modifiedLines.push('            >');
    modifiedLines.push('              Meine Projekte');
    modifiedLines.push('            </Link>');
    modifiedLines.push('            {saveStatus === \'saved\' && (');
    modifiedLines.push('              <span className="text-green-600 dark:text-green-400 text-sm font-medium">');
    modifiedLines.push('                ✓ Gespeichert');
    modifiedLines.push('              </span>');
    modifiedLines.push('            )}');
    modifiedLines.push('            <button');
    modifiedLines.push('              onClick={() => alert(\'Speichern-Funktion folgt in Kürze\')}');
    modifiedLines.push('              disabled={saveStatus === \'saving\'}');
    modifiedLines.push('              className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"');
    modifiedLines.push('            >');
    modifiedLines.push('              {saveStatus === \'saving\' ? \'Speichert...\' : \'💾 Speichern\'}');
    modifiedLines.push('            </button>');
    modifiedLines.push('          </div>');
    modifiedLines.push('        )}');
    modifiedLines.push('      </div>');
    modifiedLines.push('');
    // Skip the next line which is "    <div className="max-w-6xl mx-auto px-4 py-8">"
    continue;
  }
  
  // Skip duplicate div opening
  if (line.includes('<div className="max-w-6xl mx-auto px-4 py-8">') && modifiedLines.some(l => l.includes('max-w-6xl'))) {
    continue;
  }
  
  modifiedLines.push(line);
  lineNum++;
}

// Write with UTF-8 encoding (no BOM)
fs.writeFileSync('pages/configurator.tsx', modifiedLines.join('\n'), { encoding: 'utf8' });

console.log('✅ Configurator fixed with proper UTF-8 encoding!');
console.log('Total lines:', modifiedLines.length);
