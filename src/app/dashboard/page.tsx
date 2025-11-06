import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { buildings } from '@/lib/db/schema';

export default async function DashboardPage() {
  const allBuildings = await db.select().from(buildings);

  // Fonction pour obtenir l'image du bâtiment
  const getBuildingImage = (buildingName: string) => {
    if (buildingName.includes('MAIRIE')) {
      return '/image/mairie.png';
    }
    if (buildingName.includes('COMPLEXE SPORTIF')) {
      return '/image/complexe_sportif.png';
    }
    if (buildingName.includes('ESPACE CULTUREL') || buildingName.includes('RENÉE WANNER')) {
      return '/image/espace_culturel.png';
    }
    if (buildingName.includes('VERGERS')) {
      return '/image/espace_verger.png';
    }
    return '/image/mairie.png'; // Image par défaut
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Choisissez un établissement
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Sélectionnez un bâtiment pour voir les salles disponibles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {allBuildings.map((building) => (
          <Link
            key={building.id}
            href={`/buildings/${building.id}/rooms`}
            className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="relative h-[300px] w-full">
              {/* Image de fond */}
              <Image
                src={getBuildingImage(building.name)}
                alt={building.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
              />

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

              {/* Contenu */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">
                  {building.name}
                </h2>
                {building.description && (
                  <p className="text-white/90 text-sm drop-shadow-md">
                    {building.description}
                  </p>
                )}
              </div>

              {/* Badge "Cliquez pour voir" */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Voir les salles →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {allBuildings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Aucun établissement disponible pour le moment.
          </p>
        </div>
      )}
    </div>
  );
}
