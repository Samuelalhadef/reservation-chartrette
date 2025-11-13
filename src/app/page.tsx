export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
          Réservation Chartrettes
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Système de gestion et réservation de salles pour les associations
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <a
            href="/auth/signin"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Se connecter
          </a>
          <a
            href="/auth/signup"
            className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
          >
            S'inscrire
          </a>
        </div>
      </div>
    </div>
  );
}
