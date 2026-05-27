import Link from 'next/link';
import { db } from '@/lib/db';
import { buildings, rooms, reservations, users, associations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft, DoorOpen, Users, Ruler, Package } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 dark:bg-primary-950">
      <div className="container mx-auto px-4 py-6">
        <Link
          href={`/buildings/${building.id}/rooms`}
          className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 dark:text-accent-300 dark:hover:text-accent-200 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux salles de {building.name}
        </Link>

        {/* En-tête avec info salle */}
        <div className="bg-white dark:bg-primary-800/40 rounded-2xl shadow-card border border-slate-200 dark:border-primary-700/60 p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 sm:gap-4 justify-center sm:justify-start">
              <div className="p-3 sm:p-4 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl shadow-lg">
                <DoorOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {room.name}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                  {building.name}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center sm:justify-start">
              <div className="flex items-center gap-2 px-4 py-3 bg-primary-50 dark:bg-accent-500/10 rounded-lg justify-center">
                <Users className="w-5 h-5 text-primary-700 dark:text-accent-300" />
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-300">Capacité</p>
                  <p className="font-bold text-slate-900 dark:text-white">{room.capacity || 'Non précisé'} {room.capacity ? 'pers.' : ''}</p>
                </div>
              </div>
              {room.surface && (
                <div className="flex items-center gap-2 px-4 py-3 bg-primary-50 dark:bg-accent-500/10 rounded-lg justify-center">
                  <Ruler className="w-5 h-5 text-primary-700 dark:text-accent-300" />
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-300">Surface</p>
                    <p className="font-bold text-slate-900 dark:text-white">{room.surface} m²</p>
                  </div>
                </div>
              )}
            </div>

            {/* Section Matériel disponible */}
            {room.equipment && Array.isArray(room.equipment) && room.equipment.length > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl border border-primary-100 dark:border-primary-700/60">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-800/50 rounded-lg">
                    <Package className="w-5 h-5 text-primary-700 dark:text-accent-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Matériel disponible dans la salle
                    </h3>
                    <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      {room.equipment.map((item: { name: string; available: boolean }, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary-500 dark:text-accent-400 mt-1">•</span>
                          <span className={item.name.trim() === '' ? 'h-2' : ''}>
                            {item.name.trim() || '\u00A0'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
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
