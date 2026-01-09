'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users as UsersIcon, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { format, addDays, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import YearlyConventionModal from './YearlyConventionModal';

interface Association {
  id: string;
  name: string;
}

interface YearlyReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  roomCapacity: number;
  userName?: string;
  onSuccess?: () => void;
  buildingId?: string;
}

interface TimeSlot {
  day: number; // 0 = dimanche, 1 = lundi, etc.
  startHour: number;
  endHour: number;
}

export default function YearlyReservationModal({
  isOpen,
  onClose,
  roomId,
  roomName,
  roomCapacity,
  userName = '',
  onSuccess,
  buildingId,
}: YearlyReservationModalProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [excludeSchoolHolidays, setExcludeSchoolHolidays] = useState(true);
  const [excludedDates, setExcludedDates] = useState<Date[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConvention, setShowConvention] = useState(false);
  const [associationData, setAssociationData] = useState<any>(null);
  const [conventionReadOnlyMode, setConventionReadOnlyMode] = useState(false);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>('');

  // Sélection hebdomadaire
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ day: number; hour: number } | null>(null);

  const weekDays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8h à 22h

  useEffect(() => {
    if (isOpen) {
      // Réinitialiser le formulaire
      setStep(1);
      setStartDate('');
      setEndDate('');
      setNumberOfPeople(1);
      setReason('');
      setTimeSlots([]);
      setExcludeSchoolHolidays(true);
      setExcludedDates([]);
      setSelectedDay(null);
      setSelectionStart(null);
      setSelectedAssociationId('');
      // Charger les données de l'association
      loadAssociationData();
      // Charger les associations pour les admins
      if (isAdmin) {
        fetchAssociations();
      }
    }
  }, [isOpen, isAdmin]);

  const loadAssociationData = async () => {
    try {
      const response = await fetch('/api/associations/check-yearly-convention');
      if (response.ok) {
        const data = await response.json();
        setAssociationData(data.association);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const fetchAssociations = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setAssociations(data.associations || []);
    } catch (error) {
      console.error('Error fetching associations:', error);
    }
  };

  const submitYearlyReservation = async () => {
    console.log('Début de submitYearlyReservation');
    try {
      console.log('Envoi de la requête API...');
      const requestBody: any = {
        roomId,
        startDate,
        endDate,
        timeSlots,
        reason,
        estimatedParticipants: numberOfPeople,
        excludeSchoolHolidays,
        excludedDates: excludedDates.map(d => d.toISOString()),
      };

      // Si admin et associationId sélectionnée, l'ajouter à la requête
      if (isAdmin && selectedAssociationId) {
        requestBody.associationId = selectedAssociationId;
      }

      const response = await fetch('/api/reservations/yearly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Réponse reçue, status:', response.status);
      const data = await response.json();
      console.log('Données reçues:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réservation');
      }

      alert(`Réservation à l'année créée avec succès ! ${data.count} réservations ont été générées.`);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('Erreur de réservation:', error);
      alert(error.message || 'Erreur lors de la réservation');
    } finally {
      console.log('Réinitialisation de isSubmitting');
      setIsSubmitting(false);
    }
  };

  const checkConventionStatus = async () => {
    try {
      const response = await fetch('/api/associations/check-yearly-convention');
      if (response.ok) {
        const data = await response.json();
        setAssociationData(data.association);

        if (!data.hasSigned) {
          // L'utilisateur doit signer la convention
          // On garde isSubmitting à true et on affiche la modale de convention
          setShowConvention(true);
          return false;
        }
        return true;
      } else {
        // En cas d'erreur API, afficher l'erreur et stopper
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la vérification de la convention');
      }
    } catch (error: any) {
      console.error('Erreur lors de la vérification de la convention:', error);
      alert(error.message || 'Erreur lors de la vérification de la convention');
      setIsSubmitting(false);
      return false;
    }
  };

  const handleConventionSigned = () => {
    setShowConvention(false);
    setConventionReadOnlyMode(false);
    // Continuer avec la soumission
    submitYearlyReservation();
  };

  const handleConventionClose = () => {
    setShowConvention(false);
    setConventionReadOnlyMode(false);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  // Afficher le modal de convention si nécessaire
  if (showConvention && associationData) {
    // En mode lecture seule, utiliser des valeurs par défaut si le formulaire n'est pas rempli
    const conventionData = conventionReadOnlyMode ? {
      roomName: roomName || 'Salle à définir',
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString(),
      timeSlots: timeSlots.length > 0 ? timeSlots : [{ day: 1, startHour: 14, endHour: 16 }],
      reason: reason || 'À définir lors de la réservation',
    } : {
      roomName,
      startDate,
      endDate,
      timeSlots,
      reason,
    };

    return (
      <YearlyConventionModal
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
        reservationDetails={conventionData}
        readOnlyMode={conventionReadOnlyMode}
      />
    );
  }

  const handleSlotClick = (day: number, hour: number) => {
    if (!selectionStart) {
      // Premier clic : début de sélection
      setSelectionStart({ day, hour });
      setSelectedDay(day);
    } else if (selectionStart.day === day) {
      // Deuxième clic sur le même jour : créer le créneau
      const startHour = Math.min(selectionStart.hour, hour);
      const endHour = Math.max(selectionStart.hour, hour);

      // Vérifier si ce créneau existe déjà
      const exists = timeSlots.some(
        slot => slot.day === day && slot.startHour === startHour && slot.endHour === endHour
      );

      if (!exists) {
        setTimeSlots([...timeSlots, { day, startHour, endHour }]);
      }

      setSelectionStart(null);
      setSelectedDay(null);
    } else {
      // Clic sur un autre jour : réinitialiser
      setSelectionStart({ day, hour });
      setSelectedDay(day);
    }
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const isSlotSelected = (day: number, hour: number): boolean => {
    return timeSlots.some(
      slot => slot.day === day && hour >= slot.startHour && hour <= slot.endHour
    );
  };

  const isSlotSelectionStart = (day: number, hour: number): boolean => {
    if (!selectionStart) return false;
    return selectionStart.day === day && selectionStart.hour === hour;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit appelé');

    // Validation
    if (!startDate || !endDate) {
      alert('Veuillez sélectionner les dates de début et de fin');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      alert('La date de fin doit être après la date de début');
      return;
    }

    if (timeSlots.length === 0) {
      alert('Veuillez sélectionner au moins un créneau horaire');
      return;
    }

    console.log('Validation passée, setIsSubmitting(true)');
    setIsSubmitting(true);

    // Vérifier la convention
    console.log('Vérification du statut de la convention...');
    const hasConvention = await checkConventionStatus();
    console.log('hasConvention:', hasConvention);

    if (!hasConvention) {
      // La modale de convention sera affichée
      // isSubmitting sera réinitialisé dans checkConventionStatus en cas d'erreur
      // ou quand l'utilisateur fermera la modale de convention
      console.log('Convention non signée, affichage de la modale');
      return;
    }

    // Soumettre directement si la convention est déjà signée
    console.log('Convention signée, soumission de la réservation');
    await submitYearlyReservation();
  };

  const nextStep = () => {
    if (step === 1 && (!startDate || !endDate)) {
      alert('Veuillez sélectionner les dates');
      return;
    }
    if (step === 2 && timeSlots.length === 0) {
      alert('Veuillez sélectionner au moins un créneau horaire');
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const toggleDateExclusion = (date: Date) => {
    const exists = excludedDates.some(d => isSameDay(d, date));
    if (exists) {
      setExcludedDates(excludedDates.filter(d => !isSameDay(d, date)));
    } else {
      setExcludedDates([...excludedDates, date]);
    }
  };

  // Générer un aperçu des dates concernées
  const getAffectedDates = () => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const allDates = eachDayOfInterval({ start, end });

    return allDates.filter(date => {
      const dayOfWeek = date.getDay();
      return timeSlots.some(slot => slot.day === dayOfWeek);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">
            Réservation à l'année
          </h2>
          <p className="text-sm sm:text-base text-purple-100">
            {roomName}
          </p>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Étape 1 : Sélection des dates */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Période de réservation</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    Sélectionnez la période pour laquelle vous souhaitez réserver cette salle
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Date de début *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-900 dark:text-white transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-900 dark:text-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <UsersIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Nombre de personnes estimé *
                </label>
                <input
                  type="number"
                  min="1"
                  max={roomCapacity}
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-900 dark:text-white transition-colors"
                  required
                />
                <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">
                  Capacité maximale : {roomCapacity} personnes
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Raison de la réservation *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Ex: Cours hebdomadaire de danse, réunion d'association..."
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:bg-gray-900 dark:text-white transition-colors resize-none"
                  required
                />
              </div>

              {/* Association selection (Admin only) */}
              {isAdmin && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <UsersIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Réserver pour une association (optionnel)
                  </label>
                  <select
                    value={selectedAssociationId}
                    onChange={(e) => setSelectedAssociationId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  >
                    <option value="">-- Réserver pour la Mairie --</option>
                    {associations.map((assoc) => (
                      <option key={assoc.id} value={assoc.id}>
                        {assoc.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-700 dark:text-gray-200 mt-2">
                    En tant qu'administrateur, vous pouvez créer une réservation pour n'importe quelle association.
                    Si aucune association n'est sélectionnée, la réservation sera pour la Mairie de Chartrettes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Étape 2 : Sélection des horaires hebdomadaires */}
          {step === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-3 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Horaires hebdomadaires</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Sélectionnez les créneaux qui se répéteront chaque semaine
                  </p>
                </div>
              </div>

              {/* Version mobile : liste par jour */}
              <div className="lg:hidden space-y-3">
                {weekDays.map((day, dayIndex) => (
                  <div key={dayIndex} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                    <div className="font-bold text-gray-900 dark:text-white mb-3 text-sm bg-purple-100 dark:bg-purple-900 p-2 rounded-lg text-center">
                      {day}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {hours.map((hour) => {
                        const selected = isSlotSelected(dayIndex, hour);
                        const selectionStart = isSlotSelectionStart(dayIndex, hour);

                        return (
                          <button
                            key={hour}
                            type="button"
                            onClick={() => handleSlotClick(dayIndex, hour)}
                            className={`min-h-[52px] p-2 rounded-lg border-2 transition-all text-xs font-medium ${
                              selected
                                ? 'border-purple-500 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100'
                                : selectionStart
                                ? 'border-orange-500 bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100'
                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 active:border-purple-400'
                            }`}
                          >
                            <div>{hour}:00</div>
                            {selected && <div className="text-lg">✓</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Version desktop : grille complète */}
              <div className="hidden lg:block bg-gray-50 dark:bg-gray-900 rounded-xl p-4 overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Grille hebdomadaire */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}>
                    {/* En-tête avec les jours */}
                    <div></div>
                    {weekDays.map((day, index) => (
                      <div
                        key={index}
                        className="text-center p-2 bg-purple-100 dark:bg-purple-900 rounded-lg font-bold text-sm text-gray-900 dark:text-white"
                      >
                        {day.substring(0, 3)}
                      </div>
                    ))}

                    {/* Grille horaire */}
                    {hours.map((hour) => (
                      <React.Fragment key={hour}>
                        <div className="text-center py-2 text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center">
                          {hour}:00
                        </div>
                        {weekDays.map((_, dayIndex) => {
                          const selected = isSlotSelected(dayIndex, hour);
                          const selectionStart = isSlotSelectionStart(dayIndex, hour);

                          return (
                            <button
                              key={dayIndex}
                              type="button"
                              onClick={() => handleSlotClick(dayIndex, hour)}
                              className={`min-h-[50px] p-2 rounded-lg border-2 transition-all ${
                                selected
                                  ? 'border-purple-500 bg-purple-200 dark:bg-purple-800'
                                  : selectionStart
                                  ? 'border-orange-500 bg-orange-100 dark:bg-orange-900'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                              }`}
                            >
                              {selected && <span className="text-xs">✓</span>}
                            </button>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Liste des créneaux sélectionnés */}
              {timeSlots.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 sm:p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm sm:text-base">
                    Créneaux sélectionnés ({timeSlots.length})
                  </h4>
                  <div className="space-y-2">
                    {timeSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg"
                      >
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {weekDays[slot.day]} : {slot.startHour}:00 - {slot.endHour + 1}:00
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          className="text-red-600 hover:text-red-700 transition-colors p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Étape 3 : Options d'exclusion */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Exclusions</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    Configurez les périodes où vous ne souhaitez pas réserver
                  </p>
                </div>
              </div>

              {/* Exclusion des vacances scolaires */}
              <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeSchoolHolidays}
                    onChange={(e) => setExcludeSchoolHolidays(e.target.checked)}
                    className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 dark:text-white">
                      Exclure les vacances scolaires
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Les réservations ne seront pas créées pendant les périodes de vacances scolaires de la zone concernée
                    </p>
                  </div>
                </label>
              </div>

              {/* Exclusion de dates spécifiques */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">
                  Exclure des dates spécifiques
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Cliquez sur les dates que vous souhaitez exclure de la réservation
                </p>

                {/* Aperçu des dates concernées */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 sm:p-4 max-h-[60vh] sm:max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {getAffectedDates().slice(0, 50).map((date, index) => {
                      const isExcluded = excludedDates.some(d => isSameDay(d, date));
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleDateExclusion(date)}
                          className={`p-3 sm:p-2 rounded-lg border-2 transition-all text-sm sm:text-xs font-medium min-h-[48px] sm:min-h-0 ${
                            isExcluded
                              ? 'border-red-500 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 line-through'
                              : 'border-purple-200 dark:border-purple-700 hover:border-purple-400 active:border-purple-500 text-gray-900 dark:text-white'
                          }`}
                        >
                          {format(date, 'EEE d MMM', { locale: fr })}
                        </button>
                      );
                    })}
                  </div>
                  {getAffectedDates().length > 50 && (
                    <p className="text-xs text-gray-700 dark:text-gray-200 mt-4 text-center">
                      Affichage des 50 premières dates. Total: {getAffectedDates().length} dates
                    </p>
                  )}
                </div>
              </div>

              {excludedDates.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">
                    Dates exclues ({excludedDates.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {excludedDates.map((date, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 rounded text-xs"
                      >
                        {format(date, 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Étape 4 : Récapitulatif */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Récapitulatif</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    Vérifiez les informations avant de valider
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">Période</h4>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    Du {format(parseISO(startDate), 'dd MMMM yyyy', { locale: fr })} au{' '}
                    {format(parseISO(endDate), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">
                    Créneaux hebdomadaires ({timeSlots.length})
                  </h4>
                  <div className="space-y-1">
                    {timeSlots.map((slot, index) => (
                      <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                        • {weekDays[slot.day]} : {slot.startHour}:00 - {slot.endHour + 1}:00
                      </p>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">Détails</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Participants :</span> {numberOfPeople} personnes
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Raison :</span> {reason}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Vacances scolaires :</span>{' '}
                      {excludeSchoolHolidays ? 'Exclues' : 'Incluses'}
                    </p>
                    {excludedDates.length > 0 && (
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">Dates exclues :</span> {excludedDates.length}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                    Nombre estimé de réservations
                  </h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ~{getAffectedDates().filter(d => !excludedDates.some(ex => isSameDay(ex, d))).length} réservations
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-yellow-900 dark:text-yellow-100 font-semibold mb-1">
                        Convention requise
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                        Vous devrez signer une convention spécifique pour les réservations à l'année avant la validation finale.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setConventionReadOnlyMode(true);
                          setShowConvention(true);
                        }}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-semibold text-sm flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Accéder à la convention
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Boutons de navigation */}
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="w-full sm:flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
              >
                Précédent
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                Suivant
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Création en cours...' : 'Valider la réservation'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
