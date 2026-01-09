'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users as UsersIcon, FileText, User, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import ConventionModal from './ConventionModal';
import { formatPrice, getDurationTypeLabel, getUserTypeLabel } from '@/lib/pricing';
import type { PricingResult } from '@/lib/pricing';

interface Association {
  id: string;
  name: string;
}

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  startHour: number;
  endHour: number;
  roomId: string;
  roomName: string;
  roomCapacity: number;
  userName?: string;
  onSuccess?: () => void;
  buildingId?: string;
}

export default function ReservationModal({
  isOpen,
  onClose,
  date,
  startHour,
  endHour,
  roomId,
  roomName,
  roomCapacity,
  userName = '',
  onSuccess,
  buildingId,
}: ReservationModalProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [responsibleName, setResponsibleName] = useState(userName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConvention, setShowConvention] = useState(false);
  const [isCheckingConvention, setIsCheckingConvention] = useState(false);
  const [associationData, setAssociationData] = useState<any>(null);
  const [showMultiRoomSelection, setShowMultiRoomSelection] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([roomId]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>('');

  useEffect(() => {
    setResponsibleName(userName);
  }, [userName]);

  useEffect(() => {
    if (isOpen) {
      checkConventionStatus();
      setSelectedRoomIds([roomId]); // Réinitialiser la sélection
      setShowMultiRoomSelection(false);
      loadPricing(); // Charger le prix au chargement
      if (isAdmin) {
        fetchAssociations(); // Charger les associations pour les admins
      }
    }
  }, [isOpen, roomId, isAdmin]);

  const fetchAssociations = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setAssociations(data.associations || []);
    } catch (error) {
      console.error('Error fetching associations:', error);
    }
  };

  // Recharger le prix quand les créneaux ou salles changent
  useEffect(() => {
    if (isOpen && selectedRoomIds.length > 0) {
      loadPricing();
    }
  }, [selectedRoomIds, startHour, endHour]);

  const loadPricing = async () => {
    setIsLoadingPrice(true);
    try {
      // Calculer les time slots
      const timeSlots: { start: string; end: string }[] = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        timeSlots.push({
          start: `${hour}:00`,
          end: `${hour + 1}:00`,
        });
      }

      // Calculer le prix total pour toutes les salles sélectionnées
      const pricingPromises = selectedRoomIds.map(async (roomIdToPrice) => {
        const response = await fetch('/api/reservations/calculate-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: roomIdToPrice,
            timeSlots,
          }),
        });

        if (response.ok) {
          return await response.json();
        }
        return null;
      });

      const allPricing = await Promise.all(pricingPromises);

      // Additionner les prix de toutes les salles
      const totalPricing = allPricing.reduce((acc, p) => {
        if (!p || !p.pricing) return acc;
        return {
          totalPrice: acc.totalPrice + (p.pricing.totalPrice || 0),
          depositAmount: acc.depositAmount + (p.pricing.depositAmount || 0),
          durationType: p.pricing.durationType,
          hourCount: p.pricing.hourCount,
          userType: p.pricing.userType,
        };
      }, { totalPrice: 0, depositAmount: 0, durationType: 'hourly', hourCount: 0, userType: 'chartrettois' });

      setPricing(totalPricing);
    } catch (error) {
      console.error('Erreur lors du calcul du prix:', error);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // Charger les salles du bâtiment
  const loadBuildingRooms = async () => {
    if (!buildingId) return;

    setIsLoadingRooms(true);
    try {
      const response = await fetch(`/api/rooms?activeOnly=true`);
      if (response.ok) {
        const data = await response.json();
        // Filtrer les salles du même bâtiment
        const buildingRooms = data.rooms.filter((room: any) => room.buildingId === buildingId);
        setAvailableRooms(buildingRooms);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des salles:', error);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const toggleMultiRoomSelection = () => {
    if (!showMultiRoomSelection) {
      loadBuildingRooms();
    }
    setShowMultiRoomSelection(!showMultiRoomSelection);
  };

  const toggleRoomSelection = (selectedRoomId: string) => {
    setSelectedRoomIds(prev => {
      if (prev.includes(selectedRoomId)) {
        // Ne pas permettre de désélectionner toutes les salles
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== selectedRoomId);
      } else {
        return [...prev, selectedRoomId];
      }
    });
  };

  const checkConventionStatus = async () => {
    setIsCheckingConvention(true);
    try {
      const response = await fetch('/api/associations/check-convention');
      if (response.ok) {
        const data = await response.json();
        setAssociationData(data.association);

        // Si la convention n'a pas été signée, afficher le modal de convention
        if (!data.hasSigned) {
          setShowConvention(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la convention:', error);
    } finally {
      setIsCheckingConvention(false);
    }
  };

  const handleConventionSigned = () => {
    setShowConvention(false);
    // Rafraîchir le statut après signature
    checkConventionStatus();
  };

  const handleConventionClose = () => {
    setShowConvention(false);
    onClose(); // Fermer aussi le modal de réservation
  };

  if (!isOpen) return null;

  // Afficher le modal de convention si nécessaire
  if (showConvention && associationData) {
    return (
      <ConventionModal
        isOpen={showConvention}
        onClose={handleConventionClose}
        onSigned={handleConventionSigned}
        associationData={{
          name: associationData.name,
          contactName: associationData.contactName || '',
          contactEmail: associationData.contactEmail || '',
          contactPhone: associationData.contactPhone || '',
          address: associationData.description || '',
        }}
      />
    );
  }

  // Afficher un loader pendant la vérification
  if (isCheckingConvention) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-700 dark:text-gray-300">Vérification en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Valider la date de réservation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reservationDate = new Date(date);
      reservationDate.setHours(0, 0, 0, 0);

      if (reservationDate < today) {
        alert('Vous ne pouvez pas réserver une salle pour une date passée');
        setIsSubmitting(false);
        return;
      }

      // Règle d'avance uniquement pour les non-admins
      if (!isAdmin) {
        const minDate = new Date(today);
        minDate.setDate(minDate.getDate() + 7);

        if (reservationDate < minDate) {
          alert('Réservation 7 jours à l\'avance minimum');
          setIsSubmitting(false);
          return;
        }
      }

      // Créer les time slots
      const timeSlots: { start: string; end: string }[] = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        timeSlots.push({
          start: `${hour}:00`,
          end: `${hour + 1}:00`,
        });
      }

      // Créer les réservations pour toutes les salles sélectionnées
      const reservationPromises = selectedRoomIds.map(async (roomIdToReserve) => {
        const requestBody: any = {
          roomId: roomIdToReserve,
          date: date.toISOString(),
          timeSlots,
          reason,
          estimatedParticipants: numberOfPeople,
          requiredEquipment: [],
        };

        // Si admin et associationId sélectionnée, l'ajouter à la requête
        if (isAdmin && selectedAssociationId) {
          requestBody.associationId = selectedAssociationId;
        }

        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Erreur lors de la réservation de la salle ${roomIdToReserve}`);
        }

        return data;
      });

      // Attendre que toutes les réservations soient créées
      await Promise.all(reservationPromises);

      // Succès : appeler le callback et fermer la modale
      if (selectedRoomIds.length > 1) {
        alert(`${selectedRoomIds.length} salles réservées avec succès !`);
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('Erreur de réservation:', error);
      alert(error.message || 'Erreur lors de la réservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const numberOfSlots = endHour - startHour + 1;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">
            Nouvelle réservation
          </h2>
          <p className="text-sm sm:text-base text-blue-100">
            {roomName}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
        {/* Informations du créneau */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-800 dark:text-gray-200">Date</p>
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                  {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-800 dark:text-gray-200">Horaire</p>
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                  {startHour}:00 - {endHour + 1}:00
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  {numberOfSlots} heure{numberOfSlots > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Affichage du prix */}
          {pricing && pricing.totalPrice > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <Euro className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Tarification</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-800 dark:text-gray-200">Type:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {getDurationTypeLabel(pricing.durationType)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-800 dark:text-gray-200">Catégorie:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {getUserTypeLabel(pricing.userType)}
                      </span>
                    </div>
                    {selectedRoomIds.length > 1 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-800 dark:text-gray-200">Salles:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {selectedRoomIds.length} salle{selectedRoomIds.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 mt-2 border-t-2 border-green-200 dark:border-green-700">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 dark:text-white">Prix total:</span>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          {formatPrice(pricing.totalPrice)}
                        </span>
                      </div>
                      {pricing.depositAmount > 0 && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-800 dark:text-gray-200">Caution:</span>
                          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                            {formatPrice(pricing.depositAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Formulaire */}
        <form id="reservation-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Bouton pour réserver plusieurs salles */}
          {buildingId && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-700">
              <button
                type="button"
                onClick={toggleMultiRoomSelection}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg">+</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      Réserver plusieurs salles
                    </p>
                    <p className="text-xs text-gray-800 dark:text-gray-200">
                      {selectedRoomIds.length > 1
                        ? `${selectedRoomIds.length} salles sélectionnées`
                        : 'Même horaire, plusieurs salles'}
                    </p>
                  </div>
                </div>
                <span className={`text-purple-600 dark:text-purple-400 transition-transform ${showMultiRoomSelection ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Liste des salles */}
              {showMultiRoomSelection && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {isLoadingRooms ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="text-xs text-gray-800 dark:text-gray-200 mt-2">Chargement...</p>
                    </div>
                  ) : availableRooms.length === 0 ? (
                    <p className="text-xs text-gray-700 dark:text-gray-200 text-center py-4">
                      Aucune autre salle disponible
                    </p>
                  ) : (
                    availableRooms.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => toggleRoomSelection(room.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          selectedRoomIds.includes(room.id)
                            ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedRoomIds.includes(room.id)
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedRoomIds.includes(room.id) && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white">
                              {room.name}
                            </p>
                            <p className="text-xs text-gray-800 dark:text-gray-200">
                              Capacité: {room.capacity} personnes
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Nombre de personnes */}
          <div>
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <UsersIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Nombre de personnes *
            </label>
            <input
              type="number"
              min="1"
              max={roomCapacity}
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 1)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-900 dark:text-white transition-colors"
              required
            />
            <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">
              Capacité maximale : {roomCapacity} personnes
            </p>
          </div>

          {/* Raison */}
          <div>
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Raison de la réservation *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ex: Réunion d'association, cours de danse, conférence..."
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-900 dark:text-white transition-colors resize-none"
              required
            />
          </div>

          {/* Association selection (Admin only) */}
          {isAdmin ? (
            <div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <UsersIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Réserver pour une association (optionnel)
              </label>
              <select
                value={selectedAssociationId}
                onChange={(e) => setSelectedAssociationId(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
              >
                <option value="">-- Réserver pour la Mairie --</option>
                {associations.map((assoc) => (
                  <option key={assoc.id} value={assoc.id}>
                    {assoc.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">
                En tant qu'administrateur, vous pouvez créer une réservation pour n'importe quelle association.
              </p>
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Nom du responsable *
              </label>
              <input
                type="text"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-900 dark:text-white transition-colors"
                required
              />
            </div>
          )}

          {/* Affichage du prix */}
          {pricing && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 sm:p-5 rounded-xl border-2 border-green-200 dark:border-green-700">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <Euro className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base mb-3">
                    Tarification
                  </h3>

                  <div className="space-y-2">
                    {/* Type de tarif */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800 dark:text-gray-200">
                        Type de réservation
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {getDurationTypeLabel(pricing.durationType)}
                      </span>
                    </div>

                    {/* Catégorie d'utilisateur */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800 dark:text-gray-200">
                        Catégorie
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {getUserTypeLabel(pricing.userType)}
                      </span>
                    </div>

                    {/* Durée */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800 dark:text-gray-200">
                        Durée
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {pricing.hourCount} heure{pricing.hourCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Séparateur */}
                    <div className="border-t border-green-200 dark:border-green-700 my-2"></div>

                    {/* Prix de location */}
                    <div className="flex justify-between text-base">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        Prix de location
                      </span>
                      <span className="font-bold text-green-700 dark:text-green-400 text-lg">
                        {formatPrice(pricing.totalPrice)}
                      </span>
                    </div>

                    {/* Caution */}
                    {pricing.depositAmount > 0 && (
                      <div className="flex justify-between text-base">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          Caution
                        </span>
                        <span className="font-bold text-orange-700 dark:text-orange-400 text-lg">
                          {formatPrice(pricing.depositAmount)}
                        </span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="border-t-2 border-green-300 dark:border-green-600 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-900 dark:text-white font-bold text-base sm:text-lg">
                          Total à prévoir
                        </span>
                        <span className="font-bold text-green-700 dark:text-green-400 text-xl sm:text-2xl">
                          {formatPrice(pricing.totalPrice + pricing.depositAmount)}
                        </span>
                      </div>
                      {pricing.depositAmount > 0 && (
                        <p className="text-xs text-gray-800 dark:text-gray-200 mt-2">
                          La caution sera restituée après validation de l'état des lieux
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Salles multiples */}
                  {selectedRoomIds.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                        Prix total pour {selectedRoomIds.length} salles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loader du prix */}
          {isLoadingPrice && !pricing && (
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  Calcul du prix...
                </span>
              </div>
            </div>
          )}
        </form>
        </div>

          {/* Boutons */}
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="reservation-form"
              disabled={isSubmitting}
              className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Réservation...' : 'Réserver'}
            </button>
          </div>
      </div>
    </div>
  );
}
