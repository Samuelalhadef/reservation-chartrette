import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { buildings, rooms, reservations } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { Users, BookOpen, DoorClosed, CheckCircle, ArrowLeft } from 'lucide-react';
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

  // Récupérer les réservations approuvées pour aujourd'hui ou dans le futur
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const approvedReservations = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.status, 'approved'),
        gte(reservations.date, today)
      )
    );

  // Créer un Set des IDs de salles avec réservations validées
  const roomsWithApprovedReservations = new Set(
    approvedReservations.map(r => r.roomId)
  );

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
        {/* Bouton retour */}
        <Link
          href="/buildings"
          className="absolute top-6 left-6 z-40 bg-white/90 hover:bg-white backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Retour aux bâtiments</span>
        </Link>
      </div>

      {/* Grille des salles */}
      <div className="container mx-auto px-4 -mt-16 relative z-30 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {buildingRooms.map((room) => {
            const Icon = getRoomIcon(room.name);
            const hasApprovedReservation = roomsWithApprovedReservations.has(room.id);

            return (
              <Link
                key={room.id}
                href={`/buildings/${building.id}/rooms/${room.id}/calendar`}
                className="group"
              >
                <div className={`bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-8 text-center h-full flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden ${
                  hasApprovedReservation ? 'border-2 border-green-400' : ''
                }`}>
                  {/* Badge "Réservation validée" */}
                  {hasApprovedReservation && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 flex items-center justify-center gap-2 shadow-lg">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Réservation validée</span>
                    </div>
                  )}

                  <div className={`mb-4 p-4 rounded-full transition-colors ${
                    hasApprovedReservation
                      ? 'bg-green-100 group-hover:bg-green-200'
                      : 'bg-gray-100 group-hover:bg-blue-50'
                  }`}>
                    <Icon className={`w-12 h-12 transition-colors ${
                      hasApprovedReservation
                        ? 'text-green-600 group-hover:text-green-700'
                        : 'text-gray-600 group-hover:text-blue-600'
                    }`} />
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
