import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n/config';
import LanguageSwitcher from './components/LanguageSwitcher';
import { Toaster } from 'react-hot-toast';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.dir(i18n.language);
  }, [i18n.language, i18n.dir]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">{t('welcome')}</h1>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t('connect_wallet')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">{t('dashboard')}</h2>
          <p className="mb-4">
            {t('welcome')} - This is a demo of the internationalization setup.
          </p>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-3">Available Translations:</h3>
            <ul className="space-y-2">
              <li>• {t('english')} (en)</li>
              <li>• {t('spanish')} (es)</li>
              <li>• {t('arabic')} (ar)</li>
            </ul>
          </div>
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
