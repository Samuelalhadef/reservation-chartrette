'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, Download, CheckCircle, PenTool } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface YearlyConventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSigned: () => void;
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full my-8">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6 relative">
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
              <p className="text-sm text-purple-100">
                Signature requise pour valider votre demande
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* Document de convention */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 flex-1 overflow-y-auto border-2 border-gray-200 dark:border-gray-700 mb-6">
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                CONVENTION D'UTILISATION DES SALLES MUNICIPALES
              </h3>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
                ANNÉE SCOLAIRE 2025-2026
              </h4>

              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-semibold">
                  La présente convention a pour objectif de préciser les conditions de mise à disposition des salles et matériel de l'Espace Culturel Renée Wanner et de la salle des Vergers. Elle regroupe les modalités de réservations, d'utilisations des salles et du matériel mis à disposition, ainsi que les contreparties éventuellement négociées avec la collectivité.
                </p>

                <p className="font-semibold">
                  L'association doit obligatoirement se conformer au règlement d'utilisation des salles municipales de la ville de Chartrettes, partie intégrante de cette convention.
                </p>

                <div className="mt-6 mb-6">
                  <p className="font-bold text-center text-base">Il a été convenu ce qui suit</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded space-y-2">
                  <p className="font-bold">Entre</p>
                  <p><strong>ASSOCIATION :</strong> {associationData.name}</p>
                  <p><strong>OBJET SOCIAL :</strong> {reservationDetails.reason}</p>
                  <p><strong>Adresse :</strong> {associationData.address || 'À compléter'}</p>
                  <p><strong>Représentée par :</strong> {associationData.contactName}</p>
                  <p className="text-xs italic mt-2">Fonction : Président</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded space-y-2">
                  <p className="font-bold">Et</p>
                  <p><strong>LA MAIRIE DE CHARTRETTES</strong></p>
                  <p>37 rue Georges Clemenceau</p>
                  <p>77590 CHARTRETTES</p>
                  <p>01.60.69.65.01 – 06 23 26 95 98</p>
                  <p className="mt-2">Représentée par Pascal GROS – Maire</p>
                </div>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 1 : DURÉE ET RENOUVELLEMENT</h4>
                  <p>
                    La commune décide de soutenir l'association dans la poursuite de ses objectifs sociaux et statutaires en mettant gratuitement à sa disposition les locaux désignés à l'article 4 de la présente Convention. Elle est faite à titre précaire et révocable à tout moment pour des motifs d'intérêt général. La commune peut temporairement annuler la mise à disposition sans préavis ni dédommagement.
                  </p>
                  <p>Il est expressément convenu :</p>
                  <p>
                    Que si l'association cessait d'avoir besoin des locaux ou les occupait de manière insuffisante ou ne bénéficie plus des autorisations et agréments nécessaires à son activité, cette mise à disposition deviendrait automatiquement caduque.
                  </p>
                  <p>
                    Que la mise à disposition des locaux est subordonnée au respect, par l'association, des obligations fixées par la présente convention.
                  </p>
                  <p>
                    Cette présente convention est établie ce jour et prendra fin le 30 août 2026.
                  </p>
                  <p className="font-semibold">
                    La convention est à renouveler à chaque nouvelle année scolaire. Les créneaux attribués pour une saison ne sont pas garantis pour la saison suivante.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 2 : TARIFICATION</h4>
                  <p>
                    GRATUITE pour les associations Chartrettoises pour l'utilisation de l'ensemble des salles attribuées annuellement par la présente convention.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 3 : CARACTÉRISTIQUES DU MATÉRIEL</h4>
                  <p>
                    Se référer à l'ANNEXE joint à la présente convention.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 4 : DESTINATION ET DÉSIGNATION DES LOCAUX MIS À DISPOSITION</h4>
                  <p>
                    Les locaux seront utilisés par l'association à usage exclusif de l'association pour la réalisation de son objet social et pour les activités déclarées. Il est à ce sujet expressément convenu que tout changement à cette destination, qui ne serait pas autorisé par la commune au préalable, entraînerait la résiliation immédiate de la présente convention.
                  </p>
                  <p>
                    L'association s'engage, en outre, à solliciter les autorisations et agréments nécessaires à l'organisation de ses activités et/ou des manifestations en lien avec son objet social. L'association est considérée comme l'organisateur au sens légal de l'ensemble des activités et manifestations.
                  </p>
                  <p>
                    L'association s'engage à fournir, un bilan et un compte de résultat conformes au plan comptable en vigueur, certifiés conformes par le président au plus tard 6 mois après la clôture de l'exercice, que l'association reçoive ou non des subventions en numéraire de la collectivité.
                  </p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded mt-2">
                    <p className="font-bold">À {reservationDetails.roomName} :</p>
                    <p className="font-semibold mt-2">Créneaux attribués :</p>
                    <ul className="list-disc pl-6 space-y-1 mt-1">
                      {reservationDetails.timeSlots.map((slot: any, index: number) => (
                        <li key={index}>
                          {weekDays[slot.day]} : {slot.startHour}:00 - {slot.endHour + 1}:00
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs mt-2">Période : du {format(parseISO(reservationDetails.startDate), 'dd/MM/yyyy', { locale: fr })} au {format(parseISO(reservationDetails.endDate), 'dd/MM/yyyy', { locale: fr })}</p>
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 5 : PROPRIÉTÉ DU MATÉRIEL</h4>
                  <p>
                    Il est parfaitement entendu entre les parties que la présente convention de mise à disposition n'entraîne aucun transfert de propriété du matériel visé à l'article 3.
                  </p>
                  <p>
                    Le transport des matériels prévus pour les manifestations extérieures est à la charge de l'association sauf accord particulier avec la municipalité.
                  </p>
                  <p>
                    Les matériels propres aux associations ne peuvent être entreposés que dans les locaux prévus à cet effet.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 6 : FERMETURE DES ÉQUIPEMENTS</h4>
                  <p>
                    Chaque association est responsable de la fermeture de l'équipement utilisé. Ainsi chaque professeur doit fermer la salle et les espaces annexes (vestiaires, placards, porte de secours claquées) après chaque utilisation afin d'éviter tout problème d'intrusion et de détérioration du matériel.
                  </p>
                  <p>
                    Le rideau de fer à l'espace culturel Renée Wanner, ainsi que le portillon d'accès PMR, doivent être verrouillés par la dernière association utilisatrice selon le planning. En cas de difficulté des professeurs, ces derniers doivent en priorité contacter le Président de l'association ou son représentant qui devra intervenir.
                  </p>
                  <p>
                    En cas d'absence, tout professeur responsable de la fermeture doit le signaler le plus tôt possible au Président de l'association qui se chargera d'organiser la fermeture.
                  </p>
                  <p className="font-semibold">
                    Aucun équipement ne doit rester ouvert la nuit.
                  </p>
                  <p>
                    L'association est responsable des dommages occasionnés en cas de non-respect des procédures de fermeture des équipements.
                  </p>
                  <p className="text-sm">
                    En cas d'urgence, astreinte technique : 06 23 26 95 99
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 7 : CESSION ET TRANSFERT DE RESPONSABILITÉ</h4>
                  <p>
                    Il est expressément rappelé que la présente convention est strictement réservée à servir l'objet de la seule association signataire ; que les droits et avantages ne pourront en aucun cas être cédés à un quelconque tiers sans l'accord préalable et écrit du Maire.
                  </p>
                  <p>
                    L'association s'engage à respecter et faire respecter le règlement en vigueur dans les locaux utilisés.
                  </p>
                  <p>
                    La présente convention étant consentie « intuitu personae » et en considération des objectifs statutaires de l'association. Toute cession de droits en résultant est interdite. De même, l'association s'interdit de sous-louer tout ou partie des locaux et, plus généralement, d'en conférer la jouissance totale ou partielle à un tiers, même temporairement.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 8 : ORGANISATION D'ÉVÉNEMENTS</h4>
                  <p>
                    Les associations peuvent organiser des évènements et se voir attribuer des salles supplémentaires à ces occasions.
                  </p>
                  <p>
                    Dans la mesure du possible, ces demandes doivent être effectuées et arbitrées lors de la réunion annuelle d'attribution des salles. Si ce n'est pas le cas, les demandes seront honorées en fonction des disponibilités des salles et des impératifs de la municipalité. Une convention spécifique sera dans ce cas établie.
                  </p>
                  <p>
                    La collectivité se réserve le droit de ne plus mettre à disposition les salles supplémentaires pour les évènements associatifs si l'association ne respecte pas les conditions d'utilisations des locaux.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 9 : COMMUNICATION</h4>
                  <p>
                    L'association ayant recours à la mise à disposition de salle ou de matériel devra faire figurer le logo de la Mairie sur les publications concernant le ou les événements auquel aura servi cette mise à disposition. L'association présentera à la ville, en amont de sa publication, la maquette du moyen de communication utilisé.
                  </p>
                  <p>
                    L'association peut utiliser les présentoirs présents dans le hall de l'Espace culturel, afin de déposer des flyers en lien avec les activités et manifestations proposées.
                  </p>
                  <p>
                    L'association pourra également demander aux services municipaux de mettre en avant un évènement particulier via les supports numériques de la ville (réseaux sociaux, site Internet, Application Mobile, TV du hall de l'Espace culturel, panneau numérique du parvis de la mairie). Ceci à condition d'avoir informé les services municipaux à minima 1 mois avant.
                  </p>
                  <p>
                    L'affichage sur les panneaux municipaux est à la charge des associations, après validation du support et son contenu par la Mairie.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 10 : DÉSISTEMENT ET DÉFAILLANCE</h4>
                  <p>
                    Au cas où des difficultés surviendraient entre les deux partenaires à propos de la présente convention, celles-ci s'engagent à d'abord coopérer pleinement avec diligence et bonne foi en vue de trouver une solution amiable au litige.
                  </p>
                  <p>
                    En cas de non-respect, de la part de l'association, des divers engagements mentionnés dans la présente convention et dans le règlement d'utilisation des salles municipales, celle-ci se trouverait suspendue ou annulée de plein droit.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 11 : OBLIGATIONS SANITAIRES</h4>
                  <p>
                    En cas d'épisode sanitaire impliquant des mesures de prévention spécifiques, l'association s'engage à appliquer strictement les mesures préconisées par les autorités sanitaires, municipales et fédérales. Le non-respect de ces mesures expose l'utilisateur à un arrêt de son activité dans ces locaux. Ces mesures sont susceptibles d'impacter les conditions d'utilisation définies dans la présente convention et dans le règlement d'utilisation des salles municipales (nombre de personnes par salle, accès certains locaux, etc…)
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">ARTICLE 12 : SIGNATURE DU CONTRAT D'ENGAGEMENT RÉPUBLICAIN</h4>
                  <p>
                    L'association s'engage à signer le « contrat d'engagement républicain » joint à la présente Convention (Décret n° 2021-1947 du 31 décembre 2021 pris pour l'application de l'article 10-1 de la loi N° 2000-321 du 12 avril 2000 et approuvant le contrat d'engagement républicain des associations et fondations bénéficiant de subventions publiques ou d'un agrément de l'État).
                  </p>
                </section>

                <div className="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                    <p className="font-bold text-center text-gray-900 dark:text-white mb-3">
                      L'Association {associationData.name}
                    </p>
                    <p className="font-semibold text-center text-gray-900 dark:text-white mb-3">
                      Représentée par son Président M/Mme {associationData.contactName}
                    </p>
                    <p className="font-bold text-center text-gray-900 dark:text-white uppercase">
                      ATTESTE AVOIR PRIS CONNAISSANCE DES CLAUSES DE LA PRÉSENTE CONVENTION ET DU RÈGLEMENT D'UTILISATION DES SALLES DE LA VILLE DE CHARTRETTES ET S'ENGAGE À EN RESPECTER TOUTES LES DISPOSITIONS
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
                    Fait à Chartrettes, le {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center italic mt-2">
                    Signature précédée de la mention « lu et approuvé » - « Le Président »
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section inférieure avec informations et signature */}
          <div className="mt-auto space-y-4">
            {/* Informations de l'association */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">Informations de l'association</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Association :</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{associationData.name}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Contact :</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{associationData.contactName}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Email :</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{associationData.contactEmail}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Téléphone :</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{associationData.contactPhone}</p>
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
                    className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
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
              <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 sm:p-3 rounded-xl">
                    <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      Signature électronique
                    </h3>
                    <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">
                      Pour finaliser la convention, veuillez apposer votre signature ci-dessous
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-lg border-2 border-purple-300 dark:border-purple-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-purple-600 rounded-full"></span>
                    <span className="hidden sm:inline">Signez avec votre souris ou votre trackpad dans le cadre ci-dessous</span>
                    <span className="sm:hidden">Signez avec votre doigt ci-dessous</span>
                  </p>
                  <div className="relative group">
                    <div className={`border-3 ${hasSignature ? 'border-green-500' : 'border-dashed border-gray-400 dark:border-gray-600'} rounded-xl overflow-hidden bg-white shadow-inner transition-all`}>
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
                          const mouseEvent = new MouseEvent('mousedown', {
                            clientX: touch.clientX,
                            clientY: touch.clientY
                          });
                          canvasRef.current?.dispatchEvent(mouseEvent);
                        }}
                        onTouchMove={(e) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const mouseEvent = new MouseEvent('mousemove', {
                            clientX: touch.clientX,
                            clientY: touch.clientY
                          });
                          canvasRef.current?.dispatchEvent(mouseEvent);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          const mouseEvent = new MouseEvent('mouseup', {});
                          canvasRef.current?.dispatchEvent(mouseEvent);
                        }}
                      />
                    </div>
                    {!hasSignature && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-600">
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
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Signature enregistrée
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
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
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                >
                  Fermer
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSign}
                    disabled={!hasRead || !hasSignature || isSigning}
                    className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
