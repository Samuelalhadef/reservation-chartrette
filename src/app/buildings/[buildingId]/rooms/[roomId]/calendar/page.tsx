import Link from 'next/link';
import { db } from '@/lib/db';
import { buildings, rooms, reservations, users, associations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft, DoorOpen, Users, Ruler } from 'lucide-react';
import { notFound } from 'next/navigation';
import RoomCalendar from '@/components/RoomCalendar';

export default async function RoomCalendarPage({
  params,
}: {
  params: Promise<{ buildingId: string; roomId: string }>;
}) {
  const { buildingId, roomId } = await params;

  const [building] = await db
    .select()
    .from(buildings)
    .where(eq(buildings.id, buildingId));

  if (!building) {
    notFound();
  }

  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId));

  if (!room || room.buildingId !== buildingId) {
    notFound();
  }

  const roomReservations = await db
    .select({
      id: reservations.id,
      userId: reservations.userId,
      roomId: reservations.roomId,
      associationId: reservations.associationId,
      date: reservations.date,
      timeSlots: reservations.timeSlots,
      reason: reservations.reason,
      estimatedParticipants: reservations.estimatedParticipants,
      requiredEquipment: reservations.requiredEquipment,
      status: reservations.status,
      adminComment: reservations.adminComment,
      reviewedBy: reservations.reviewedBy,
      reviewedAt: reservations.reviewedAt,
      cancelledAt: reservations.cancelledAt,
      cancelReason: reservations.cancelReason,
      createdAt: reservations.createdAt,
      updatedAt: reservations.updatedAt,
      user: {
        name: users.name,
        email: users.email,
      },
      association: {
        name: associations.name,
      },
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .leftJoin(associations, eq(reservations.associationId, associations.id))
    .where(eq(reservations.roomId, roomId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-6">
        <Link
          href={`/buildings/${building.id}/rooms`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux salles de {building.name}
        </Link>

        {/* En-tête avec info salle */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 sm:gap-4 justify-center sm:justify-start">
              <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <DoorOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {room.name}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  {building.name}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center sm:justify-start">
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Capacité</p>
                  <p className="font-bold text-gray-900 dark:text-white">{room.capacity} pers.</p>
                </div>
              </div>
              {room.surface && (
                <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg justify-center">
                  <Ruler className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Surface</p>
                    <p className="font-bold text-gray-900 dark:text-white">{room.surface} m²</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendrier full width */}
        <div className="w-full">
          <RoomCalendar
            roomId={room.id}
            roomName={room.name}
            roomCapacity={room.capacity}
            reservations={roomReservations}
            buildingId={buildingId}
          />
        </div>
      </div>
    </div>
  );
}
