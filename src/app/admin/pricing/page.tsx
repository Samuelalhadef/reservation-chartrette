'use client';

import { useEffect, useState } from 'react';
import { Building, Euro, Save, AlertCircle } from 'lucide-react';
import Button from '@/components/Button';

interface Room {
  id: string;
  name: string;
  buildingId: string;
  building: { name: string };
  isPaid: boolean;
  pricingFullDay: { chartrettois: number; association: number; exterieur: number } | null;
  pricingHalfDay: { chartrettois: number; association: number; exterieur: number } | null;
  pricingHourly: { chartrettois: number; association: number; exterieur: number } | null;
  deposit: number;
}

export default function AdminPricingPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedRooms, setEditedRooms] = useState<{ [key: string]: Partial<Room> }>({});

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePricingChange = (
    roomId: string,
    durationType: 'pricingFullDay' | 'pricingHalfDay' | 'pricingHourly',
    userType: 'chartrettois' | 'association' | 'exterieur',
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;

    setEditedRooms((prev) => {
      const currentRoom = prev[roomId] || {};
      const currentPricing = currentRoom[durationType] || rooms.find(r => r.id === roomId)?.[durationType] || {
        chartrettois: 0,
        association: 0,
        exterieur: 0,
      };

      return {
        ...prev,
        [roomId]: {
          ...currentRoom,
          [durationType]: {
            ...currentPricing,
            [userType]: numValue,
          },
        },
      };
    });
  };

  const handleDepositChange = (roomId: string, value: string) => {
    const numValue = parseFloat(value) || 0;

    setEditedRooms((prev) => ({
      ...prev,
      [roomId]: {
        ...(prev[roomId] || {}),
        deposit: numValue,
      },
    }));
  };

  const handleIsPaidChange = (roomId: string, isPaid: boolean) => {
    setEditedRooms((prev) => ({
      ...prev,
      [roomId]: {
        ...(prev[roomId] || {}),
        isPaid,
      },
    }));
  };

  const handleSave = async (roomId: string) => {
    setSaving(roomId);

    try {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      const updates = editedRooms[roomId] || {};

      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPaid: updates.isPaid !== undefined ? updates.isPaid : room.isPaid,
          pricingFullDay: updates.pricingFullDay || room.pricingFullDay,
          pricingHalfDay: updates.pricingHalfDay || room.pricingHalfDay,
          pricingHourly: updates.pricingHourly || room.pricingHourly,
          deposit: updates.deposit !== undefined ? updates.deposit : room.deposit,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      alert('Tarifs mis à jour avec succès');

      // Supprimer les modifications sauvegardées
      setEditedRooms((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });

      await fetchRooms();
    } catch (error: any) {
      console.error('Error saving pricing:', error);
      alert(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  const getRoomValue = (
    roomId: string,
    field: 'pricingFullDay' | 'pricingHalfDay' | 'pricingHourly',
    userType: 'chartrettois' | 'association' | 'exterieur'
  ) => {
    const edited = editedRooms[roomId]?.[field];
    if (edited) return edited[userType];

    const room = rooms.find(r => r.id === roomId);
    return room?.[field]?.[userType] || 0;
  };

  const getDepositValue = (roomId: string) => {
    const edited = editedRooms[roomId]?.deposit;
    if (edited !== undefined) return edited;

    const room = rooms.find(r => r.id === roomId);
    return room?.deposit || 0;
  };

  const getIsPaidValue = (roomId: string) => {
    const edited = editedRooms[roomId]?.isPaid;
    if (edited !== undefined) return edited;

    const room = rooms.find(r => r.id === roomId);
    return room?.isPaid ?? false;
  };

  const hasUnsavedChanges = (roomId: string) => {
    return editedRooms[roomId] !== undefined;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Grouper les salles par bâtiment
  const roomsByBuilding = rooms.reduce((acc, room) => {
    const buildingName = room.building?.name || 'Sans bâtiment';
    if (!acc[buildingName]) {
      acc[buildingName] = [];
    }
    acc[buildingName].push(room);
    return acc;
  }, {} as { [key: string]: Room[] });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Euro className="w-8 h-8 text-green-600" />
          Configuration des tarifs
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gérez les tarifs de location et les cautions pour chaque salle
        </p>
      </div>

      {/* Légende des catégories */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          Catégories d'utilisateurs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">Chartrettois</p>
            <p className="text-blue-700 dark:text-blue-300">Résidents de Chartrettes</p>
          </div>
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">Association</p>
            <p className="text-blue-700 dark:text-blue-300">Associations conventionnées</p>
          </div>
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">Extérieur</p>
            <p className="text-blue-700 dark:text-blue-300">Autres utilisateurs</p>
          </div>
        </div>
      </div>

      {/* Salles par bâtiment */}
      {Object.entries(roomsByBuilding).map(([buildingName, buildingRooms]) => (
        <div key={buildingName} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Building className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {buildingName}
            </h2>
          </div>

          <div className="space-y-6">
            {buildingRooms.map((room) => (
              <div
                key={room.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700"
              >
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{room.name}</h3>
                    {hasUnsavedChanges(room.id) && (
                      <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
                        Modifications non sauvegardées
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Salle payante ou gratuite */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getIsPaidValue(room.id)}
                        onChange={(e) => handleIsPaidChange(room.id, e.target.checked)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Salle payante
                      </span>
                    </label>
                    {!getIsPaidValue(room.id) && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        (La location sera gratuite)
                      </span>
                    )}
                  </div>

                  {getIsPaidValue(room.id) && (
                    <>
                      {/* Tarifs journée complète */}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                          Journée complète (8h et +)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(['chartrettois', 'association', 'exterieur'] as const).map((userType) => (
                            <div key={userType}>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                                {userType}
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                  €
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={getRoomValue(room.id, 'pricingFullDay', userType)}
                                  onChange={(e) =>
                                    handlePricingChange(room.id, 'pricingFullDay', userType, e.target.value)
                                  }
                                  className="w-full pl-8 pr-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:bg-gray-900 dark:text-white transition-colors"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tarifs demi-journée */}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                          Demi-journée (4-7h)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(['chartrettois', 'association', 'exterieur'] as const).map((userType) => (
                            <div key={userType}>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                                {userType}
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                  €
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={getRoomValue(room.id, 'pricingHalfDay', userType)}
                                  onChange={(e) =>
                                    handlePricingChange(room.id, 'pricingHalfDay', userType, e.target.value)
                                  }
                                  className="w-full pl-8 pr-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:bg-gray-900 dark:text-white transition-colors"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tarifs horaires */}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                          Tarif horaire (&lt;4h)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(['chartrettois', 'association', 'exterieur'] as const).map((userType) => (
                            <div key={userType}>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                                {userType} / heure
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                  €
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={getRoomValue(room.id, 'pricingHourly', userType)}
                                  onChange={(e) =>
                                    handlePricingChange(room.id, 'pricingHourly', userType, e.target.value)
                                  }
                                  className="w-full pl-8 pr-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:bg-gray-900 dark:text-white transition-colors"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Caution */}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                          Caution (dépôt de garantie)
                        </h4>
                        <div className="max-w-xs">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                              €
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={getDepositValue(room.id)}
                              onChange={(e) => handleDepositChange(room.id, e.target.value)}
                              className="w-full pl-8 pr-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:bg-gray-900 dark:text-white transition-colors"
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Montant remboursable après vérification de l'état des lieux
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Bouton de sauvegarde */}
                  {hasUnsavedChanges(room.id) && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="success"
                        onClick={() => handleSave(room.id)}
                        isLoading={saving === room.id}
                        disabled={saving === room.id}
                        className="w-full sm:w-auto"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer les modifications
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {rooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Aucune salle disponible
          </p>
        </div>
      )}
    </div>
  );
}
