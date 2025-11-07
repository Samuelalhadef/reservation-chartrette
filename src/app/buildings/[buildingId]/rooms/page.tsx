import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { buildings, rooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Users, BookOpen, DoorClosed } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function BuildingRoomsPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = await params;

  const [building] = await db
    .select()
    .from(buildings)
    .where(eq(buildings.id, buildingId));

  if (!building) {
    notFound();
  }

  const buildingRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.buildingId, buildingId));

  // Icônes pour les différents types de salles
  const roomIcons: Record<string, any> = {
    'Salle 1': BookOpen,
    'Salle de réunion': Users,
    'Bureau': DoorClosed,
  };

  const getRoomIcon = (roomName: string) => {
    const Icon = roomIcons[roomName] || BookOpen;
    return Icon;
  };

  // Image par défaut basée sur le nom du bâtiment
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
    <div className="min-h-screen">
      {/* Hero Section avec l'image du bâtiment */}
      <div className="relative h-[400px] w-full overflow-hidden">
        <Image
          src={getBuildingImage(building.name)}
          alt={building.name}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Grille des salles */}
      <div className="container mx-auto px-4 -mt-16 relative z-30 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {buildingRooms.map((room) => {
            const Icon = getRoomIcon(room.name);
            return (
              <Link
                key={room.id}
                href={`/buildings/${building.id}/rooms/${room.id}/calendar`}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-8 text-center h-full flex flex-col items-center justify-center min-h-[200px]">
                  <div className="mb-4 p-4 bg-gray-100 rounded-full group-hover:bg-blue-50 transition-colors">
                    <Icon className="w-12 h-12 text-gray-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 uppercase tracking-wide">
                    {room.name}
                  </h3>
                  {room.description && (
                    <p className="text-sm text-gray-500 mt-2">
                      {room.description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {buildingRooms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">
              Aucune salle disponible dans cet établissement pour le moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
