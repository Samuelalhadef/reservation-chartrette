'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users as UsersIcon, FileText, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ConventionModal from './ConventionModal';

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
}: ReservationModalProps) {
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [responsibleName, setResponsibleName] = useState(userName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConvention, setShowConvention] = useState(false);
  const [isCheckingConvention, setIsCheckingConvention] = useState(false);
  const [associationData, setAssociationData] = useState<any>(null);

  useEffect(() => {
    setResponsibleName(userName);
  }, [userName]);

  useEffect(() => {
    if (isOpen) {
      checkConventionStatus();
    }
  }, [isOpen]);

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
      // Créer les time slots
      const timeSlots = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        timeSlots.push({
          start: `${hour}:00`,
          end: `${hour + 1}:00`,
        });
      }

      // Appel API pour créer la réservation
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          date: date.toISOString(),
          timeSlots,
          reason,
          estimatedParticipants: numberOfPeople,
          requiredEquipment: [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réservation');
      }

      // Succès : appeler le callback et fermer la modale
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-2xl font-bold text-white mb-2">
            Nouvelle réservation
          </h2>
          <p className="text-blue-100">
            {roomName}
          </p>
        </div>

        {/* Informations du créneau */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Date</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Horaire</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {startHour}:00 - {endHour + 1}:00
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  {numberOfSlots} heure{numberOfSlots > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre de personnes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <UsersIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Nombre de personnes *
            </label>
            <input
              type="number"
              min="1"
              max={roomCapacity}
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-900 dark:text-white transition-colors"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Capacité maximale : {roomCapacity} personnes
            </p>
          </div>

          {/* Raison */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Raison de la réservation *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ex: Réunion d'association, cours de danse, conférence..."
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-900 dark:text-white transition-colors resize-none"
              required
            />
          </div>

          {/* Nom du responsable */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Nom du responsable *
            </label>
            <input
              type="text"
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-900 dark:text-white transition-colors"
              required
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Réservation...' : 'Réserver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
