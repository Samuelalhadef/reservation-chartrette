'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users as UsersIcon, FileText, User, Euro, PenTool, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import ConventionModal, { ConventionSignerData, MairieSettings } from './ConventionModal';
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
  const [signerData, setSignerData] = useState<ConventionSignerData | null>(null);
  const [mairieSettings, setMairieSettings] = useState<Partial<MairieSettings>>({});
  const [showConvention, setShowConvention] = useState(false);
  // Signature capturée localement, envoyée dans le POST de la réservation
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showMultiRoomSelection, setShowMultiRoomSelection] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([roomId]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>('');
  // Associations rattachées au compte du membre (non-admin) + association choisie
  const [userAssociations, setUserAssociations] = useState<Association[]>([]);
  const [userAssociationId, setUserAssociationId] = useState<string>('');
  const [profileUser, setProfileUser] = useState<any>(null);

  useEffect(() => {
    setResponsibleName(userName);
  }, [userName]);

  useEffect(() => {
    if (isOpen) {
      // Reset state à chaque ouverture
      setSignatureDataUrl(null);
      setShowConvention(false);
      setSelectedRoomIds([roomId]);
      setShowMultiRoomSelection(false);
      loadPricing();
      loadSignerData();
      loadMairieSettings();
      if (isAdmin) fetchAssociations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roomId, isAdmin]);

  const loadMairieSettings = async () => {
    try {
      const res = await fetch('/api/convention-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setMairieSettings(data.settings);
      }
    } catch {
      /* fallback to defaults */
    }
  };

  // Construit les données du signataire à partir d'une association (ou du user seul)
  const buildSignerData = (user: any, assoc: any): ConventionSignerData => {
    if (assoc) {
      return {
        signerType: 'association',
        displayName: assoc.name,
        signerName: assoc.contactName || user.name,
        signerEmail: assoc.contactEmail || user.email,
        signerPhone: assoc.contactPhone || '',
        signerAddress: assoc.address || assoc.description || '',
      };
    }
    return {
      signerType: user.role === 'admin' ? 'mairie' : 'particulier',
      displayName: user.name,
      signerName: user.name,
      signerEmail: user.email,
      signerAddress: user.address || '',
    };
  };

  // Charge les infos du signataire (asso ou user) pour pré-remplir le modal de convention
  const loadSignerData = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (!res.ok) return;
      const data = await res.json();
      const user = data.user || data;
      const assocList: Association[] = data.associations || (data.association ? [data.association] : []);

      setProfileUser(user);
      setUserAssociations(assocList);
      // Association choisie par défaut : la principale (ou la première rattachée)
      const defaultAssoc = data.association || assocList[0] || null;
      setUserAssociationId(defaultAssoc?.id || '');
      setSignerData(buildSignerData(user, defaultAssoc));
    } catch (err) {
      // Fallback minimal — la signature reste possible avec juste le nom session
      if (session?.user) {
        setSignerData({
          signerType: 'particulier',
          displayName: session.user.name || 'Utilisateur',
          signerName: session.user.name || 'Utilisateur',
          signerEmail: session.user.email || '',
        });
      }
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

  useEffect(() => {
    if (isOpen && selectedRoomIds.length > 0) loadPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomIds, startHour, endHour]);

  // Quand le membre change d'association, la convention doit refléter la nouvelle
  // association : on régénère le signataire et on invalide la signature précédente.
  useEffect(() => {
    if (!profileUser || userAssociations.length === 0) return;
    const assoc = userAssociations.find((a) => a.id === userAssociationId) || null;
    setSignerData(buildSignerData(profileUser, assoc));
    setSignatureDataUrl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAssociationId]);

  const loadPricing = async () => {
    setIsLoadingPrice(true);
    try {
      const timeSlots: { start: string; end: string }[] = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        timeSlots.push({ start: `${hour}:00`, end: `${hour + 1}:00` });
      }

      const pricingPromises = selectedRoomIds.map(async (roomIdToPrice) => {
        const response = await fetch('/api/reservations/calculate-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: roomIdToPrice, timeSlots }),
        });
        if (response.ok) return await response.json();
        return null;
      });

      const allPricing = await Promise.all(pricingPromises);

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

  const loadBuildingRooms = async () => {
    if (!buildingId) return;
    setIsLoadingRooms(true);
    try {
      const response = await fetch(`/api/rooms?activeOnly=true`);
      if (response.ok) {
        const data = await response.json();
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
    if (!showMultiRoomSelection) loadBuildingRooms();
    setShowMultiRoomSelection(!showMultiRoomSelection);
  };

  const toggleRoomSelection = (selectedRoomId: string) => {
    setSelectedRoomIds(prev => {
      if (prev.includes(selectedRoomId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== selectedRoomId);
      } else {
        return [...prev, selectedRoomId];
      }
    });
  };

  if (!isOpen) return null;

  // Affichage du modal de convention par-dessus
  if (showConvention && signerData) {
    return (
      <ConventionModal
        isOpen={showConvention}
        onClose={() => setShowConvention(false)}
        onSigned={(sig) => {
          setSignatureDataUrl(sig);
          setShowConvention(false);
        }}
        signerData={signerData}
        reservationContext={{ roomName, date, startHour, endHour }}
        mairie={mairieSettings}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Les admins ne signent pas (ils créent au nom de la collectivité ou d'une asso)
    if (!isAdmin && !signatureDataUrl) {
      alert('Vous devez signer la convention avant de valider la réservation.');
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reservationDate = new Date(date);
      reservationDate.setHours(0, 0, 0, 0);

      if (reservationDate < today) {
        alert('Vous ne pouvez pas réserver une salle pour une date passée');
        setIsSubmitting(false);
        return;
      }

      if (!isAdmin) {
        const minDate = new Date(today);
        minDate.setDate(minDate.getDate() + 10);
        if (reservationDate < minDate) {
          alert('Réservation 10 jours à l\'avance minimum');
          setIsSubmitting(false);
          return;
        }
      }

      const timeSlots: { start: string; end: string }[] = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        timeSlots.push({ start: `${hour}:00`, end: `${hour + 1}:00` });
      }

      const reservationPromises = selectedRoomIds.map(async (roomIdToReserve) => {
        const requestBody: any = {
          roomId: roomIdToReserve,
          date: date.toISOString(),
          timeSlots,
          reason,
          estimatedParticipants: numberOfPeople,
          requiredEquipment: [],
        };

        // Signature de convention (obligatoire pour non-admin)
        if (signatureDataUrl) {
          requestBody.signature = signatureDataUrl;
        }

        if (isAdmin && selectedAssociationId) {
          requestBody.associationId = selectedAssociationId;
        }

        // Membre rattaché à plusieurs associations : association choisie pour cette réservation
        if (!isAdmin && userAssociationId) {
          requestBody.associationId = userAssociationId;
        }

        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Erreur lors de la réservation de la salle ${roomIdToReserve}`);
        }

        return data;
      });

      await Promise.all(reservationPromises);

      if (selectedRoomIds.length > 1) {
        alert(`${selectedRoomIds.length} salles réservées avec succès !`);
      }

      if (onSuccess) onSuccess();
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
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="header-gradient p-4 sm:p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Nouvelle réservation</h2>
          <p className="text-sm sm:text-base text-primary-100">{roomName}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Créneau */}
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-primary-50 rounded-xl">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary-700 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-900">Date</p>
                  <p className="font-bold text-sm sm:text-base text-slate-900">
                    {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-primary-50 rounded-xl">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary-700 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-900">Horaire</p>
                  <p className="font-bold text-sm sm:text-base text-slate-900">{startHour}:00 - {endHour + 1}:00</p>
                  <p className="text-xs text-primary-700 mt-1">{numberOfSlots} heure{numberOfSlots > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>

          <form id="reservation-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Multi-salles */}
            {buildingId && (
              <div className="bg-gradient-to-r from-primary-50 to-accent-50 p-4 rounded-xl border-2 border-primary-200">
                <button type="button" onClick={toggleMultiRoomSelection} className="w-full flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg">+</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Réserver plusieurs salles</p>
                      <p className="text-xs text-slate-600">
                        {selectedRoomIds.length > 1 ? `${selectedRoomIds.length} salles sélectionnées` : 'Même horaire, plusieurs salles'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-primary-700 transition-transform ${showMultiRoomSelection ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {showMultiRoomSelection && (
                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                    {isLoadingRooms ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-700 mx-auto" />
                      </div>
                    ) : availableRooms.length === 0 ? (
                      <p className="text-xs text-slate-600 text-center py-4">Aucune autre salle disponible</p>
                    ) : (
                      availableRooms.map((room) => (
                        <button key={room.id} type="button" onClick={() => toggleRoomSelection(room.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                            selectedRoomIds.includes(room.id)
                              ? 'border-primary-600 bg-primary-100'
                              : 'border-slate-200 hover:border-primary-400'
                          }`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedRoomIds.includes(room.id) ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
                            }`}>
                              {selectedRoomIds.includes(room.id) && <span className="text-white text-xs">✓</span>}
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-sm text-slate-900">{room.name}</p>
                              <p className="text-xs text-slate-600">Capacité : {room.capacity} personnes</p>
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
              <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 mb-2">
                <UsersIcon className="w-4 h-4 text-primary-700" />
                Nombre de personnes *
              </label>
              <input
                type="number" min="1" max={roomCapacity} value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 1)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-colors"
                required
              />
              <p className="text-xs text-slate-600 mt-1">Capacité maximale : {roomCapacity} personnes</p>
            </div>

            {/* Raison */}
            <div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 mb-2">
                <FileText className="w-4 h-4 text-primary-700" />
                Raison de la réservation *
              </label>
              <textarea
                value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
                placeholder="Ex: Réunion d'association, cours de danse, conférence..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-colors resize-none"
                required
              />
            </div>

            {/* Sélecteur d'association pour un membre rattaché à plusieurs associations */}
            {!isAdmin && userAssociations.length > 1 && (
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 mb-2">
                  <UsersIcon className="w-4 h-4 text-primary-700" />
                  Réserver au nom de *
                </label>
                <select
                  value={userAssociationId}
                  onChange={(e) => setUserAssociationId(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 bg-white text-slate-900 transition-colors"
                >
                  {userAssociations.map((assoc) => (
                    <option key={assoc.id} value={assoc.id}>{assoc.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-600 mt-1">
                  La convention sera établie au nom de l'association sélectionnée.
                </p>
              </div>
            )}

            {/* Association (admin) ou Responsable */}
            {isAdmin ? (
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 mb-2">
                  <UsersIcon className="w-4 h-4 text-primary-700" />
                  Réserver pour une association (optionnel)
                </label>
                <select
                  value={selectedAssociationId} onChange={(e) => setSelectedAssociationId(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 bg-white text-slate-900 transition-colors"
                >
                  <option value="">-- Réserver pour la Mairie --</option>
                  {associations.map((assoc) => (
                    <option key={assoc.id} value={assoc.id}>{assoc.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-600 mt-1">En tant qu'administrateur, vous n'avez pas à signer de convention.</p>
              </div>
            ) : (
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 mb-2">
                  <User className="w-4 h-4 text-primary-700" />
                  Nom du responsable *
                </label>
                <input
                  type="text" value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-colors"
                  required
                />
              </div>
            )}

            {/* Bloc convention (uniquement pour non-admin) */}
            {!isAdmin && (
              <div className={`p-4 rounded-xl border-2 ${
                signatureDataUrl
                  ? 'bg-accent-50 border-accent-300'
                  : 'bg-amber-50 border-amber-300'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    signatureDataUrl ? 'bg-accent-600' : 'bg-amber-500'
                  }`}>
                    {signatureDataUrl ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <PenTool className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {signatureDataUrl ? 'Convention signée ✓' : 'Convention à signer'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {signatureDataUrl
                        ? 'Votre signature est prête. Vous pouvez valider la réservation.'
                        : 'Chaque réservation ponctuelle nécessite la signature de la convention de mise à disposition.'}
                    </p>
                    {signatureDataUrl && (
                      <div className="mt-3 p-2 bg-white border border-accent-200 rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={signatureDataUrl} alt="Signature" className="max-h-20 mx-auto" />
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowConvention(true)}
                        disabled={!signerData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all disabled:opacity-50"
                      >
                        <FileText className="w-4 h-4" />
                        {signatureDataUrl ? 'Re-signer la convention' : 'Lire et signer la convention'}
                      </button>
                      {signatureDataUrl && (
                        <button
                          type="button"
                          onClick={() => setSignatureDataUrl(null)}
                          className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium text-xs sm:text-sm transition-all"
                        >
                          <X className="w-4 h-4" />
                          Effacer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tarification */}
            {pricing && (
              <div className="bg-gradient-to-r from-accent-50 to-accent-100/50 p-4 sm:p-5 rounded-xl border-2 border-accent-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-600 flex items-center justify-center flex-shrink-0">
                    <Euro className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-3">Tarification</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Type de réservation</span>
                        <span className="font-semibold text-slate-900">{getDurationTypeLabel(pricing.durationType)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Catégorie</span>
                        <span className="font-semibold text-slate-900">{getUserTypeLabel(pricing.userType)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Durée</span>
                        <span className="font-semibold text-slate-900">{pricing.hourCount} heure{pricing.hourCount > 1 ? 's' : ''}</span>
                      </div>
                      <div className="border-t border-accent-200 my-2" />
                      <div className="flex justify-between text-base">
                        <span className="text-slate-600 font-medium">Prix de location</span>
                        <span className="font-bold text-accent-600 text-lg">{formatPrice(pricing.totalPrice)}</span>
                      </div>
                      {pricing.depositAmount > 0 && (
                        <div className="flex justify-between text-base">
                          <span className="text-slate-600 font-medium">Caution</span>
                          <span className="font-bold text-orange-700 text-lg">{formatPrice(pricing.depositAmount)}</span>
                        </div>
                      )}
                      <div className="border-t-2 border-accent-300 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-slate-900 font-bold text-base sm:text-lg">Total à prévoir</span>
                          <span className="font-bold text-accent-600 text-xl sm:text-2xl">{formatPrice(pricing.totalPrice + pricing.depositAmount)}</span>
                        </div>
                      </div>
                    </div>
                    {selectedRoomIds.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-accent-200">
                        <p className="text-xs text-accent-600 font-medium">Prix total pour {selectedRoomIds.length} salles</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isLoadingPrice && !pricing && (
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-700" />
                  <span className="text-sm text-slate-600">Calcul du prix...</span>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-slate-300 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors font-semibold"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="reservation-form"
            disabled={isSubmitting || (!isAdmin && !signatureDataUrl)}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-primary-700 hover:bg-primary-800 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? 'Réservation...'
              : (!isAdmin && !signatureDataUrl)
              ? 'Signez la convention'
              : 'Réserver'}
          </button>
        </div>
      </div>
    </div>
  );
}
