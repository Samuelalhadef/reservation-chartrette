'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Calendar, Clock, Users, FileText } from 'lucide-react';
import { generateTimeSlots } from '@/lib/utils';

interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  equipment: { name: string; available: boolean }[];
}

interface TimeSlot {
  start: string;
  end: string;
}

export default function NewReservationPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [reservedSlots, setReservedSlots] = useState<TimeSlot[]>([]);

  const [formData, setFormData] = useState({
    roomId: '',
    date: '',
    reason: '',
    estimatedParticipants: '',
    requiredEquipment: [] as string[],
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (formData.roomId && formData.date) {
      fetchReservedSlots();
    }
  }, [formData.roomId, formData.date]);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms?activeOnly=true');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchReservedSlots = async () => {
    try {
      const res = await fetch(`/api/reservations?roomId=${formData.roomId}&date=${formData.date}&status=approved`);
      const data = await res.json();

      const slots: TimeSlot[] = [];
      data.reservations?.forEach((reservation: any) => {
        if (reservation.timeSlots) {
          slots.push(...reservation.timeSlots);
        }
      });

      setReservedSlots(slots);
    } catch (error) {
      console.error('Error fetching reserved slots:', error);
    }
  };

  const selectedRoom = rooms.find((r) => r.id === formData.roomId);
  const availableTimeSlots = generateTimeSlots('08:00', '22:00');

  const isSlotReserved = (slot: string): boolean => {
    const slotHour = parseInt(slot.split(':')[0]);
    return reservedSlots.some((reserved) => {
      const startHour = parseInt(reserved.start.split(':')[0]);
      const endHour = parseInt(reserved.end.split(':')[0]);
      return slotHour >= startHour && slotHour < endHour;
    });
  };

  const toggleTimeSlot = (slot: string) => {
    if (isSlotReserved(slot)) return;

    if (selectedTimeSlots.includes(slot)) {
      setSelectedTimeSlots(selectedTimeSlots.filter((s) => s !== slot));
    } else {
      setSelectedTimeSlots([...selectedTimeSlots, slot].sort());
    }
  };

  const convertToTimeSlots = (slots: string[]): TimeSlot[] => {
    const result: TimeSlot[] = [];
    let start = slots[0];
    let prev = slots[0];

    for (let i = 1; i < slots.length; i++) {
      const prevHour = parseInt(prev.split(':')[0]);
      const currentHour = parseInt(slots[i].split(':')[0]);

      if (currentHour !== prevHour + 1) {
        result.push({
          start: start,
          end: `${(prevHour + 1).toString().padStart(2, '0')}:00`,
        });
        start = slots[i];
      }

      prev = slots[i];
    }

    if (slots.length > 0) {
      const lastHour = parseInt(prev.split(':')[0]);
      result.push({
        start: start,
        end: `${(lastHour + 1).toString().padStart(2, '0')}:00`,
      });
    }

    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedTimeSlots.length === 0) {
      setError('Veuillez sélectionner au moins un créneau horaire');
      return;
    }

    if (!formData.roomId || !formData.date || !formData.reason || !formData.estimatedParticipants) {
      setError('Tous les champs sont requis');
      return;
    }

    setLoading(true);

    try {
      const timeSlots = convertToTimeSlots(selectedTimeSlots);

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          timeSlots,
          estimatedParticipants: parseInt(formData.estimatedParticipants),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        return;
      }

      router.push('/dashboard/reservations?success=true');
    } catch (error) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Nouvelle réservation
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Réservez une salle pour votre association
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center mb-2">
              <Users className="h-5 w-5 mr-2" />
              Sélectionnez une salle
            </div>
          </label>
          <select
            required
            value={formData.roomId}
            onChange={(e) => {
              setFormData({ ...formData, roomId: e.target.value });
              setSelectedTimeSlots([]);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">-- Choisir une salle --</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} (Capacité: {room.capacity} personnes)
              </option>
            ))}
          </select>

          {selectedRoom && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {selectedRoom.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {selectedRoom.description}
              </p>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Capacité:</strong> {selectedRoom.capacity} personnes</p>
                {selectedRoom.equipment.length > 0 && (
                  <p className="mt-1">
                    <strong>Équipements:</strong> {selectedRoom.equipment.map((e) => e.name).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <Input
            label="Date de réservation"
            type="date"
            required
            min={today}
            value={formData.date}
            onChange={(e) => {
              setFormData({ ...formData, date: e.target.value });
              setSelectedTimeSlots([]);
            }}
          />
        </div>

        {/* Time Slots Selection */}
        {formData.roomId && formData.date && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Sélectionnez les créneaux horaires
              </div>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {availableTimeSlots.map((slot) => {
                const reserved = isSlotReserved(slot);
                const selected = selectedTimeSlots.includes(slot);
                const nextHour = (parseInt(slot.split(':')[0]) + 1).toString().padStart(2, '0') + ':00';

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleTimeSlot(slot)}
                    disabled={reserved}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${reserved
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed line-through'
                        : selected
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                    `}
                    title={reserved ? 'Déjà réservé' : `${slot} - ${nextHour}`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>

            {selectedTimeSlots.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-400">
                  {selectedTimeSlots.length} créneau(x) sélectionné(s)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reservation Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Motif de la réservation
              </div>
            </label>
            <textarea
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Décrivez brièvement l'événement ou l'activité..."
            />
          </div>

          <Input
            label="Nombre de participants estimé"
            type="number"
            required
            min="1"
            value={formData.estimatedParticipants}
            onChange={(e) => setFormData({ ...formData, estimatedParticipants: e.target.value })}
            placeholder="Ex: 20"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={loading || selectedTimeSlots.length === 0}
            className="flex-1"
          >
            Soumettre la demande
          </Button>
        </div>
      </form>
    </div>
  );
}
