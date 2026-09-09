'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, Download, CheckCircle, PenTool } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  buildYearlyConventionSections,
  conventionImportantNotice,
  conventionObject,
  conventionPreamble,
  conventionTitle,
  type ConventionTextSettings,
} from '@/lib/conventionText';
import ConventionLetterhead from './ConventionLetterhead';

/**
 * Repli utilisé tant que /api/convention-settings n'a pas répondu (ou en cas
 * d'erreur) : ce sont les valeurs par défaut de la mairie de Chartrettes.
 */
const DEFAULT_MAIRIE: ConventionTextSettings = {
  mayorName: 'Fabrice Bargeault',
  mayorTitle: 'Le Maire',
  mairieName: 'LA MAIRIE DE CHARTRETTES',
  mairieAddressLine1: '37 rue Georges Clemenceau',
  mairieAddressLine2: '77590 CHARTRETTES',
  mairiePhone: '01.60.69.65.01',
  conventionYear: '2025-2026',
};

interface YearlyConventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSigned: () => void;
  associationId?: string;
  associationData: {
    name: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
  };
  reservationDetails: {
    roomName: string;
    startDate: string;
    endDate: string;
    timeSlots: any[];
    reason: string;
  };
  readOnlyMode?: boolean; // Mode lecture seule
}

export default function YearlyConventionModal({
  isOpen,
  onClose,
  onSigned,
  associationId,
  associationData,
  reservationDetails,
  readOnlyMode = false,
}: YearlyConventionModalProps) {
  const [hasRead, setHasRead] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  // Maire, adresse et saison sont paramétrables côté admin : on les relit à
  // chaque ouverture pour que le texte signé porte les bonnes mentions.
  const [cfg, setCfg] = useState<ConventionTextSettings>(DEFAULT_MAIRIE);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/api/convention-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.settings) setCfg({ ...DEFAULT_MAIRIE, ...data.settings });
      })
      .catch(() => {
        /* on garde les valeurs par défaut */
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!context) return;
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    // Capture le pointeur pour suivre le doigt même s'il sort du cadre
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    context.lineTo(coords.x, coords.y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (context) {
      context.closePath();
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasSignature(false);
    }
  };

  const handleSign = async () => {
    if (!hasRead) {
      alert('Veuillez lire la convention avant de signer');
      return;
    }

    if (!hasSignature) {
      alert('Veuillez signer la convention avant de continuer');
      return;
    }

    setIsSigning(true);

    try {
      // Convertir le canvas en image base64
      const signatureDataUrl = canvasRef.current?.toDataURL('image/png');

      const response = await fetch('/api/associations/sign-yearly-convention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signatureDataUrl,
          reservationDetails,
          associationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la signature');
      }

      alert('Convention signée avec succès !');
      onSigned();
    } catch (error: any) {
      console.error('Erreur de signature:', error);
      alert(error.message || 'Erreur lors de la signature de la convention');
    } finally {
      setIsSigning(false);
    }
  };

  const weekDays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const periodLabel = `du ${format(parseISO(reservationDetails.startDate), 'd MMMM yyyy', { locale: fr })} au ${format(parseISO(reservationDetails.endDate), 'd MMMM yyyy', { locale: fr })}`;
  const slotLabels = (reservationDetails.timeSlots || []).map(
    (slot: any) =>
      `${reservationDetails.roomName} (${weekDays[slot.day]} ${slot.startHour}:00 - ${slot.endHour + 1}:00)`
  );
  const sections = buildYearlyConventionSections(cfg, { periodLabel, slotLabels });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-primary-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="header-gradient p-4 sm:p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                Convention de réservation à l'année
              </h2>
              <p className="text-sm text-primary-100">
                Signature requise pour valider votre demande
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Document de convention — format officiel de la convention papier */}
          <div className="bg-slate-50 dark:bg-primary-900/40 rounded-xl p-6 border-2 border-slate-200 dark:border-primary-700/60 mb-6">
            <div className="prose dark:prose-invert max-w-none">
              <ConventionLetterhead
                settings={cfg}
                eyebrow={`Convention annuelle — saison ${cfg.conventionYear}`}
                title={conventionTitle(cfg, 'annuelle')}
              />

              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                {conventionPreamble(cfg).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}

                {/* Parties contractantes */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-primary-50 dark:bg-accent-500/10 p-4 rounded space-y-1">
                    <p className="font-bold">ENTRE :</p>
                    <p className="font-bold">{cfg.mairieName}</p>
                    <p>{cfg.mairieAddressLine1}</p>
                    <p>{cfg.mairieAddressLine2}</p>
                    <p>{cfg.mairiePhone}</p>
                    <p className="mt-2">
                      Représentée par {cfg.mayorTitle.toLowerCase()}, {cfg.mayorName}
                    </p>
                    <p className="text-xs italic mt-2">D'une part,</p>
                  </div>
                  <div className="bg-primary-50 dark:bg-accent-500/10 p-4 rounded space-y-1">
                    <p className="font-bold">ET :</p>
                    <p className="font-bold">L'association : {associationData.name}</p>
                    <p>Ayant son siège social à : {associationData.address || 'À compléter'}</p>
                    <p>Représentée par son Président : {associationData.contactName}</p>
                    {associationData.contactPhone && <p>Téléphone : {associationData.contactPhone}</p>}
                    {associationData.contactEmail && <p>Mail : {associationData.contactEmail}</p>}
                    {reservationDetails.reason && <p>Objet social : {reservationDetails.reason}</p>}
                    <p className="text-xs italic mt-2">Désignée ci-après « l'occupant »</p>
                    <p className="text-xs italic">D'autre part.</p>
                  </div>
                </div>

                <p>Par la présente convention, il a été convenu et arrêté ce qui suit :</p>

                {/* Objet */}
                <section className="space-y-2">
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">Objet de la convention</h4>
                  <p>{conventionObject('annuelle')}</p>
                </section>

                {/* Créneaux attribués — annexe de la convention */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Annexe — Créneaux attribués : {reservationDetails.roomName}
                  </p>
                  <ul className="list-disc pl-6 space-y-1 mt-2">
                    {reservationDetails.timeSlots.map((slot: any, index: number) => (
                      <li key={index}>
                        {weekDays[slot.day]} : {slot.startHour}:00 - {slot.endHour + 1}:00
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2">
                    Période : du {format(parseISO(reservationDetails.startDate), 'dd/MM/yyyy', { locale: fr })} au{' '}
                    {format(parseISO(reservationDetails.endDate), 'dd/MM/yyyy', { locale: fr })} (hors vacances
                    scolaires et jours fériés)
                  </p>
                </div>

                {/* TITRE 1 / 2 / 3 — texte canonique partagé avec le PDF */}
                {sections.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white border-b-2 border-primary-700 dark:border-accent-500 pb-1">
                      {section.title}
                    </h4>
                    {section.articles.map((article) => (
                      <section key={article.title} className="space-y-2">
                        <h5 className="font-bold text-slate-900 dark:text-white">{article.title}</h5>
                        {article.paragraphs?.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                        {article.bulletsIntro && <p>{article.bulletsIntro}</p>}
                        {article.bullets && (
                          <ul className="list-disc pl-6 space-y-1">
                            {article.bullets.map((bullet, index) => (
                              <li key={index}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </section>
                    ))}
                  </div>
                ))}

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded-r">
                  <p className="font-bold text-yellow-900 dark:text-yellow-100 text-xs mb-1">IMPORTANT</p>
                  <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                    {conventionImportantNotice('annuelle')}
                  </p>
                </div>

                {/* Signatures */}
                <div className="mt-8 pt-4 border-t border-slate-300 dark:border-primary-700/60">
                  <div className="bg-primary-50 dark:bg-accent-500/10 p-4 rounded">
                    <p className="font-bold text-center text-slate-900 dark:text-white mb-3">
                      L'association {associationData.name}
                    </p>
                    <p className="font-semibold text-center text-slate-900 dark:text-white mb-3">
                      Représentée par son Président M/Mme {associationData.contactName}
                    </p>
                    <p className="font-bold text-center text-slate-900 dark:text-white uppercase">
                      Atteste avoir pris connaissance des clauses de la présente convention et du règlement
                      d'utilisation des salles de la ville de Chartrettes et s'engage à en respecter toutes les
                      dispositions
                    </p>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-300 text-center mt-4">
                    Fait à Chartrettes, le {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-300 text-center italic mt-2">
                    Signature précédée de la mention « lu et approuvé » — « Le Président »
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section inférieure avec informations et signature */}
          <div className="space-y-4">
            {/* Informations de l'association */}
            <div className="bg-primary-50 dark:bg-primary-900/30 rounded-xl p-4">
              <h4 className="font-bold text-slate-900 dark:text-white mb-3">Informations de l'association</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-300">Association :</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{associationData.name}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-300">Contact :</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{associationData.contactName}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-300">Email :</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{associationData.contactEmail}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-300">Téléphone :</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{associationData.contactPhone}</p>
                </div>
              </div>
            </div>

            {/* Confirmation de lecture - Seulement en mode signature */}
            {!readOnlyMode && (
              <>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasRead}
                    onChange={(e) => setHasRead(e.target.checked)}
                    className="mt-1 w-5 h-5 text-primary-700 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                      J'ai lu et j'accepte les termes de cette convention
                    </p>
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                      En cochant cette case, vous reconnaissez avoir pris connaissance de l'ensemble des articles
                      de la convention et vous engagez à les respecter.
                    </p>
                  </div>
                </label>
              </div>

              {/* Zone de signature avec canvas */}
              <div className="p-4 sm:p-6 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/20 rounded-xl border-2 border-primary-300 dark:border-primary-700/60">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                  <div className="bg-primary-700 p-2 sm:p-3 rounded-xl">
                    <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Signature électronique
                    </h3>
                    <p className="text-xs sm:text-sm text-primary-700 dark:text-accent-300 font-medium">
                      Pour finaliser la convention, veuillez apposer votre signature ci-dessous
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-primary-800 p-3 sm:p-4 rounded-xl shadow-lg border-2 border-primary-300 dark:border-primary-700/60">
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-primary-700 rounded-full"></span>
                    <span className="hidden sm:inline">Signez avec votre souris ou votre trackpad dans le cadre ci-dessous</span>
                    <span className="sm:hidden">Signez avec votre doigt ci-dessous</span>
                  </p>
                  <div className="relative group">
                    <div className={`border-3 ${hasSignature ? 'border-accent-500' : 'border-dashed border-slate-400 dark:border-primary-600'} rounded-xl overflow-hidden bg-white shadow-inner transition-all`}>
                      <canvas
                        ref={canvasRef}
                        width={800}
                        height={400}
                        className="w-full cursor-crosshair touch-none"
                        style={{ touchAction: 'none' }}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerCancel={stopDrawing}
                      />
                    </div>
                    {!hasSignature && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-xs sm:text-sm font-medium text-slate-400 dark:text-primary-500">
                          ✍️ Signez ici
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={clearSignature}
                      disabled={!hasSignature}
                      className="text-xs sm:text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      Effacer la signature
                    </button>
                    {hasSignature && (
                      <span className="text-xs text-accent-600 dark:text-accent-400 font-medium flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-accent-500 rounded-full animate-pulse"></span>
                        Signature enregistrée
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-3 text-center">
                    Votre signature électronique a la même valeur juridique qu'une signature manuscrite.
                  </p>
                </div>
              </div>
            </>
            )}

            {/* Boutons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {readOnlyMode ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl"
                >
                  Fermer
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:flex-1 px-6 py-3 border-2 border-slate-300 dark:border-primary-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-primary-800 transition-colors font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSign}
                    disabled={!hasRead || !hasSignature || isSigning}
                    className="w-full sm:flex-1 px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSigning ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Signature en cours...
                      </>
                    ) : !hasSignature ? (
                      <>
                        <PenTool className="w-5 h-5" />
                        Signez pour continuer
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Valider la signature
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
