'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, PenTool, FileText, Building2, Calendar, Shield, Users } from 'lucide-react';

interface ConventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSigned: () => void;
  associationData: {
    name: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    address?: string;
  };
}

export default function ConventionModal({
  isOpen,
  onClose,
  onSigned,
  associationData,
}: ConventionModalProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const handleSubmit = async () => {
    if (!hasSignature) {
      alert('Veuillez signer la convention avant de continuer');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convertir le canvas en image base64
      const signatureDataUrl = canvasRef.current?.toDataURL('image/png');

      // Envoyer la signature au serveur
      const response = await fetch('/api/associations/sign-convention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signatureDataUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde de la signature');
      }

      onSigned();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors de la sauvegarde de la signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('fr-FR');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full my-2 sm:my-8 border border-gray-200 dark:border-gray-700">
        {/* En-tête élégant */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 md:p-8 relative rounded-t-2xl sm:rounded-t-3xl">
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
            <p className="text-blue-100 text-sm sm:text-base md:text-lg">
              Équipements sportifs municipaux - Année 2025-2026
            </p>
            <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              <span className="text-white text-xs sm:text-sm font-medium">Document officiel</span>
            </div>
          </div>
        </div>

        {/* Contenu de la convention */}
        <div
          ref={scrollContainerRef}
          className="p-4 sm:p-6 md:p-8 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto relative"
        >
          <div className="space-y-4 sm:space-y-6 text-xs sm:text-sm">
            {/* Introduction */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Cette convention a pour objectif de définir les modalités de mise à disposition des locaux du complexe sportif François COMBORIEU.
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-2 leading-relaxed">
                Selon le type d'utilisateur (associations non Chartrettoise, comités et fédérations, sociétés privées, particuliers, clubs professionnels…) et la nature des activités (sports, loisirs, autres), les créneaux mis à disposition pourront être facturés en référence à la grille de tarifs en vigueur prise par délibération.
              </p>
            </div>

            {/* Parties contractantes */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Mairie */}
              <div className="bg-gray-50 dark:from-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700">
                <p className="font-bold text-blue-600 dark:text-blue-400 mb-2">ENTRE :</p>
                <p className="font-bold text-sm">LA MAIRIE DE CHARTRETTES</p>
                <p className="text-xs">37 rue Georges Clemenceau</p>
                <p className="text-xs">77590 CHARTRETTES</p>
                <p className="text-xs">01.60.69.65.01</p>
                <p className="text-xs mt-2">Représentée par son Maire, Monsieur Pascal Gros</p>
                <p className="text-xs italic mt-2">D'une part,</p>
              </div>

              {/* Association */}
              <div className="bg-indigo-50 dark:from-indigo-900/30 p-4 rounded-xl border border-indigo-300 dark:border-indigo-700">
                <p className="font-bold text-indigo-600 dark:text-indigo-400 mb-2">ET :</p>
                <p className="font-bold text-sm">L'association : {associationData.name}</p>
                {associationData.address && (
                  <p className="text-xs">Ayant son siège social à : {associationData.address}</p>
                )}
                <p className="text-xs">Représentée par son Président : {associationData.contactName}</p>
                <p className="text-xs">Téléphone : {associationData.contactPhone}</p>
                <p className="text-xs">Mail : {associationData.contactEmail}</p>
                <p className="text-xs italic mt-2">Désigné ci-après « l'occupant »</p>
                <p className="text-xs italic">D'autre part.</p>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Par la présente convention, à travers laquelle, il a été convenu et arrêté ce qui suit :
            </p>

            {/* Objet */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">Objet de la convention</h4>
              <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                La présente convention a pour objet la mise à disposition d'installations sportives et des matériels décrits en annexe et définies dans les conditions énoncées ci-après.
              </p>
            </div>

            {/* TITRE 1 */}
            <div className="bg-blue-600 text-white p-3 rounded-xl">
              <h3 className="font-bold">TITRE 1 – LES ENGAGEMENTS DE LA VILLE DE CHARTRETTES</h3>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 1 – Durée</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  La présente convention, et ses annexes, est conclue et acceptée pour la période, du <strong>8 septembre 2025 au 10 juillet 2026 inclus</strong>, selon les créneaux attribués en annexe 1 de la convention.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 2 – Conditions de mise à disposition – redevance</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed mb-2">
                  La mise à disposition est effectuée à titre précaire, révocable et gracieux, conformément à l'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques.
                </p>
                <div className="bg-amber-50 dark:from-amber-900/20 border-l-4 border-amber-500 p-3 rounded-r-xl">
                  <p className="font-bold text-amber-900 dark:text-amber-200 text-xs mb-1">⚠️ IMPORTANT</p>
                  <ul className="space-y-1 text-amber-800 dark:text-amber-300 text-xs">
                    <li>• En absence de signature de la convention, l'occupation des lieux est INTERDITE.</li>
                    <li>• L'occupation est également INTERDITE en dehors des jours et créneaux alloués.</li>
                  </ul>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed mt-2">
                  Par le terme « équipements sportifs municipaux » il faut entendre les terrains et salles dédiées à la pratique sportive, mais également les installations liées : vestiaires, sanitaires, stockage, espaces de réception, salle de réunion, bureaux, infirmerie.
                </p>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed mt-2">
                  Toute demande de créneau ponctuel complémentaire devra faire l'objet d'une demande VIA LE LOGICIEL DE RESERVATION DES SALLES MUNICIPALES, au minimum 1 mois.
                </p>
              </div>
            </div>

            {/* TITRE 2 */}
            <div className="bg-blue-600 text-white p-3 rounded-xl">
              <h3 className="font-bold">TITRE 2 – LES ENGAGEMENTS DE L'OCCUPANT</h3>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 1 – Nature des activités autorisées</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  Les activités sont de nature sportive ou liées à l'organisation des dites activités, compatibles avec la nature des locaux et des équipements sportifs mis à disposition. Les activités doivent se dérouler en la présence et sous la surveillance effective d'un responsable désigné, agissant pour le compte de l'occupant.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 2 – Obligation de l'occupant</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs mb-1">L'occupant s'engage à :</p>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300 text-xs pl-4">
                  <li>• Signer la convention</li>
                  <li>• Se conformer au règlement d'utilisation des équipements sportifs municipaux</li>
                  <li>• Utiliser les équipements au profit de ses adhérents et conformément à son objet</li>
                  <li>• Assumer la responsabilité des équipements et du matériel mis à disposition</li>
                  <li>• Ne pas concéder l'usage des équipements à un tiers</li>
                  <li>• Vérifier la fermeture des accès et l'extinction des lumières</li>
                  <li>• Laisser les locaux en bon état de propreté</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 3 – Sécurité et accès au public</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  L'occupant déclare disposer de toutes les autorisations administratives nécessaires et s'engage à exercer ses activités dans le respect des lois en vigueur.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 4 – ASSURANCE</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  L'occupant reconnaît avoir souscrit une police d'assurance en dommages aux biens et une assurance en responsabilité civile. Un double de l'attestation d'assurance sera remis chaque année.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 5 – L'ACCES AUX SALLES</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  L'accès aux salles est régi par un dispositif de clés programmables. Une caution de 52,50€ par clé sera demandée.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 6 – CONTRAT D'ENGAGEMENT REPUBLICAIN</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  Conformément au décret N°2021-1947 du 31 décembre 2021, l'association reconnait souscrire au contrat d'engagement républicain et en accepter les modalités (annexe n°2).
                </p>
              </div>
            </div>

            {/* TITRE 3 */}
            <div className="bg-blue-600 text-white p-3 rounded-xl">
              <h3 className="font-bold">TITRE 3 – DISPOSITIONS DIVERSES</h3>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 1 – Modification</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  La présente convention pourra être modifiée en cours d'exécution par voie d'avenant avec l'accord des deux parties.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 2 – Résiliation</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  La convention est résiliable à tout moment par la ville de CHARTRETTES. La résiliation se fera par courrier recommandé avec accusé de réception.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 3 – Contrôle de la collectivité</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  Le contrôle de la bonne utilisation des installations sera assuré par un représentant de la ville de CHARTRETTES.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">Article 4 – Règlement des litiges</h4>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  Les parties s'engagent à rechercher toute voie amiable de règlement. Tout litige relève de la compétence du tribunal administratif de Melun.
                </p>
              </div>
            </div>

            {/* ANNEXE 2 - Engagement républicain (extrait) */}
            <div className="bg-blue-600 text-white p-3 rounded-xl">
              <h3 className="font-bold text-sm">ANNEXE 2 : CONTRAT D'ENGAGEMENT RÉPUBLICAIN</h3>
            </div>

            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300 text-xs italic">
                Ce contrat est conforme aux dispositions du décret n°2021-1947 du 31 décembre 2021.
              </p>

              <div className="space-y-2">
                <div>
                  <h5 className="font-bold text-gray-900 dark:text-white text-xs">ENGAGEMENT N° 1 : RESPECT DES LOIS DE LA RÉPUBLIQUE</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-xs">L'association s'engage à ne pas se prévaloir de convictions pour s'affranchir des règles communes et à ne pas remettre en cause le caractère laïque de la République.</p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 dark:text-white text-xs">ENGAGEMENT N° 2 : LIBERTÉ DE CONSCIENCE</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-xs">L'association s'engage à respecter et protéger la liberté de conscience de ses membres.</p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 dark:text-white text-xs">ENGAGEMENT N° 3 : LIBERTÉ DES MEMBRES</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-xs">L'association s'engage à respecter la liberté de ses membres de s'en retirer.</p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 dark:text-white text-xs">ENGAGEMENT N° 4 : ÉGALITÉ ET NON-DISCRIMINATION</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-xs">L'association s'engage à respecter l'égalité de tous devant la loi et à lutter contre toute forme de violence à caractère sexuel ou sexiste.</p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 dark:text-white text-xs">ENGAGEMENT N° 5 : FRATERNITÉ ET PRÉVENTION DE LA VIOLENCE</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-xs">L'association s'engage à agir dans un esprit de fraternité et à rejeter toutes formes de racisme et d'antisémitisme.</p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 dark:text-white text-xs">ENGAGEMENT N° 6 : RESPECT DE LA DIGNITÉ HUMAINE</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-xs">L'association s'engage à respecter les lois protégeant la santé et l'intégrité physique et psychique.</p>
                </div>

                <div>
                  <h5 className="font-bold text-gray-900 dark:text-white text-xs">ENGAGEMENT N° 7 : RESPECT DES SYMBOLES DE LA RÉPUBLIQUE</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-xs">L'association s'engage à respecter le drapeau tricolore, l'hymne national, et la devise de la République.</p>
                </div>
              </div>
            </div>

            {/* Date et lieu */}
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl text-center border border-gray-300 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                Fait à <strong>Chartrettes</strong>, le <strong>{currentDate}</strong>
              </p>
            </div>

            {/* Zone de signature intégrée */}
            <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 sm:p-3 rounded-xl">
                  <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    Signature électronique
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Pour finaliser la convention, veuillez apposer votre signature ci-dessous
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-lg border-2 border-blue-300 dark:border-blue-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
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
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action fixes en bas */}
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all font-semibold shadow-sm hover:shadow-md text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasSignature || isSubmitting}
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Enregistrement...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : !hasSignature ? (
                <>
                  <span className="hidden sm:inline">✍️ Signez pour continuer</span>
                  <span className="sm:hidden">✍️ Signez</span>
                </>
              ) : (
                <>
                  <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Valider la signature</span>
                  <span className="sm:hidden">Valider</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
