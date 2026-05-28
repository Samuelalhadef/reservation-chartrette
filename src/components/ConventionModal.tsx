'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, PenTool, FileText, Building2, Shield, Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ConventionSignerData {
  /** Nom de l'association (si réservation pour une asso) ou nom du signataire (particulier) */
  displayName: string;
  /** Type de signataire — change le wording du modal */
  signerType: 'association' | 'particulier' | 'mairie';
  /** Nom de la personne qui signe (pour l'asso = président, pour particulier = lui-même) */
  signerName: string;
  signerEmail?: string;
  signerPhone?: string;
  signerAddress?: string;
}

export interface ReservationContext {
  roomName: string;
  date: Date;
  startHour: number;
  endHour: number;
}

interface ConventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé avec la signature en base64 PNG ; le parent décide quoi en faire */
  onSigned: (signatureDataUrl: string) => void;
  signerData: ConventionSignerData;
  /** Contexte de la réservation ponctuelle (facultatif pour lecture seule) */
  reservationContext?: ReservationContext;
}

export default function ConventionModal({
  isOpen,
  onClose,
  onSigned,
  signerData,
  reservationContext,
}: ConventionModalProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setContext(ctx);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!context) return;
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    context.lineTo(coords.x, coords.y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (context) context.closePath();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasSignature(false);
    }
  };

  const handleSubmit = () => {
    if (!hasSignature) {
      alert('Veuillez signer la convention avant de continuer');
      return;
    }
    const signatureDataUrl = canvasRef.current?.toDataURL('image/png');
    if (!signatureDataUrl) {
      alert('Impossible de capturer la signature, réessayez');
      return;
    }
    onSigned(signatureDataUrl);
  };

  const currentDate = new Date().toLocaleDateString('fr-FR');
  const isAssoc = signerData.signerType === 'association';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full my-2 sm:my-8 border border-slate-200">
        {/* En-tête */}
        <div className="header-gradient p-4 sm:p-6 md:p-8 relative rounded-t-2xl sm:rounded-t-3xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-4 left-4">
              <Building2 className="w-32 h-32 text-white" />
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                Convention de mise à disposition
              </h2>
            </div>
            <p className="text-primary-100 text-sm sm:text-base md:text-lg">
              Réservation ponctuelle — à signer avant chaque demande
            </p>
            <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              <span className="text-white text-xs sm:text-sm font-medium">Document officiel</span>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-4 sm:p-6 md:p-8 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto">
          <div className="space-y-4 sm:space-y-6 text-xs sm:text-sm">
            {/* Détails de la réservation (si fournis) */}
            {reservationContext && (
              <div className="bg-gradient-to-r from-accent-50 to-primary-50 p-4 rounded-xl border-2 border-accent-200">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent-600" />
                  Réservation concernée
                </h4>
                <div className="grid sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-500">Salle</p>
                      <p className="font-semibold text-slate-900">{reservationContext.roomName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-primary-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-500">Date</p>
                      <p className="font-semibold text-slate-900">
                        {format(reservationContext.date, 'EEEE d MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-primary-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-500">Créneau</p>
                      <p className="font-semibold text-slate-900">
                        {reservationContext.startHour}:00 → {reservationContext.endHour + 1}:00
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Parties contractantes */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300">
                <p className="font-bold text-primary-700 mb-2">ENTRE :</p>
                <p className="font-bold text-sm">LA MAIRIE DE CHARTRETTES</p>
                <p className="text-xs">37 rue Georges Clemenceau</p>
                <p className="text-xs">77590 CHARTRETTES</p>
                <p className="text-xs">01.60.69.65.01</p>
                <p className="text-xs mt-2">Représentée par son Maire, Monsieur Pascal Gros</p>
                <p className="text-xs italic mt-2">D&apos;une part,</p>
              </div>
              <div className="bg-primary-50 p-4 rounded-xl border border-primary-300">
                <p className="font-bold text-primary-700 mb-2">ET :</p>
                {isAssoc ? (
                  <>
                    <p className="font-bold text-sm">L&apos;association : {signerData.displayName}</p>
                    {signerData.signerAddress && (
                      <p className="text-xs">Siège social : {signerData.signerAddress}</p>
                    )}
                    <p className="text-xs">Représentée par : {signerData.signerName}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-sm">{signerData.displayName}</p>
                    {signerData.signerAddress && (
                      <p className="text-xs">Adresse : {signerData.signerAddress}</p>
                    )}
                  </>
                )}
                {signerData.signerPhone && <p className="text-xs">Téléphone : {signerData.signerPhone}</p>}
                {signerData.signerEmail && <p className="text-xs">Mail : {signerData.signerEmail}</p>}
                <p className="text-xs italic mt-2">Désigné ci-après « l&apos;occupant »</p>
                <p className="text-xs italic">D&apos;autre part.</p>
              </div>
            </div>

            <p className="text-slate-600 text-sm">
              Par la présente, les parties conviennent de ce qui suit :
            </p>

            {/* Objet */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-2">Objet de la convention</h4>
              <p className="text-slate-600 text-xs leading-relaxed">
                La présente convention a pour objet la mise à disposition ponctuelle d&apos;une salle
                municipale et de son matériel, dans les conditions énoncées ci-après.
              </p>
            </div>

            {/* TITRE 1 */}
            <div className="bg-primary-700 text-white p-3 rounded-xl">
              <h3 className="font-bold">TITRE 1 – ENGAGEMENTS DE LA VILLE</h3>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-slate-900 mb-1 text-sm">Article 1 – Mise à disposition</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  La mise à disposition est consentie à titre précaire, révocable et gracieux
                  (article L.2125-1 du Code Général de la Propriété des Personnes Publiques)
                  pour le créneau précisé ci-dessus uniquement.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1 text-sm">Article 2 – Équipements</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Les équipements présents (mobilier, sanitaires, vestiaires, matériel sportif)
                  sont mis à disposition en l&apos;état et doivent être restitués propres et intacts.
                </p>
              </div>
            </div>

            {/* TITRE 2 */}
            <div className="bg-primary-700 text-white p-3 rounded-xl">
              <h3 className="font-bold">TITRE 2 – ENGAGEMENTS DE L&apos;OCCUPANT</h3>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-slate-900 mb-1 text-sm">Article 1 – Obligations</h4>
                <p className="text-slate-600 text-xs mb-1">L&apos;occupant s&apos;engage à :</p>
                <ul className="space-y-1 text-slate-600 text-xs pl-4">
                  <li>• Respecter le règlement intérieur de la salle</li>
                  <li>• Utiliser la salle uniquement pour l&apos;activité déclarée</li>
                  <li>• Assurer la surveillance des participants pendant toute la durée du créneau</li>
                  <li>• Ne pas concéder l&apos;usage de la salle à un tiers</li>
                  <li>• Vérifier la fermeture des accès et l&apos;extinction des lumières en partant</li>
                  <li>• Laisser les locaux propres et signaler tout dégât</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1 text-sm">Article 2 – Assurance</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  L&apos;occupant déclare disposer d&apos;une assurance responsabilité civile couvrant
                  l&apos;activité organisée dans la salle.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1 text-sm">Article 3 – Responsabilité</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  L&apos;occupant assume la responsabilité des dommages causés aux locaux et au
                  matériel pendant la durée de la mise à disposition.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1 text-sm">Article 4 – Engagement républicain</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Conformément au décret n°2021-1947, l&apos;occupant s&apos;engage à respecter les
                  principes de la République : laïcité, liberté de conscience, égalité,
                  non-discrimination, dignité humaine.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl">
              <p className="font-bold text-amber-900 text-xs mb-1">⚠️ IMPORTANT</p>
              <p className="text-amber-800 text-xs">
                En l&apos;absence de signature de la présente convention, la réservation ne peut être
                validée. La mise à disposition est strictement limitée au créneau réservé.
              </p>
            </div>

            <div className="bg-slate-100 p-4 rounded-xl text-center border border-slate-300">
              <p className="text-slate-600 font-medium text-sm">
                Fait à <strong>Chartrettes</strong>, le <strong>{currentDate}</strong>
              </p>
            </div>

            {/* Zone signature */}
            <div className="p-4 sm:p-6 bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl border-2 border-primary-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <div className="bg-primary-700 p-2 sm:p-3 rounded-xl">
                  <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Signature électronique</h3>
                  <p className="text-xs sm:text-sm text-primary-700 font-medium">
                    Signez ci-dessous pour valider la convention et la réservation
                  </p>
                </div>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-lg border-2 border-primary-300">
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary-700 rounded-full" />
                  <span className="hidden sm:inline">Signez avec votre souris ou trackpad</span>
                  <span className="sm:hidden">Signez avec votre doigt</span>
                </p>
                <div className="relative">
                  <div className={`border-3 ${hasSignature ? 'border-accent-500' : 'border-dashed border-slate-400'} rounded-xl overflow-hidden bg-white shadow-inner transition-all`}>
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={200}
                      className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        canvasRef.current?.dispatchEvent(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }));
                      }}
                      onTouchMove={(e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        canvasRef.current?.dispatchEvent(new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY }));
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        canvasRef.current?.dispatchEvent(new MouseEvent('mouseup', {}));
                      }}
                    />
                  </div>
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-xs sm:text-sm font-medium text-slate-400">✍️ Signez ici</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={clearSignature}
                    disabled={!hasSignature}
                    className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    Effacer la signature
                  </button>
                  {hasSignature && (
                    <span className="text-xs text-accent-600 font-medium flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
                      Signature enregistrée
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t-2 border-slate-200 rounded-b-2xl sm:rounded-b-3xl">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 border-2 border-slate-300 text-slate-600 rounded-xl hover:bg-white transition-all font-semibold shadow-sm hover:shadow-md text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasSignature}
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-primary-700 hover:bg-primary-800 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {!hasSignature ? (
                <>
                  <span className="hidden sm:inline">✍️ Signez pour continuer</span>
                  <span className="sm:hidden">✍️ Signez</span>
                </>
              ) : (
                <>
                  <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Valider la signature</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
