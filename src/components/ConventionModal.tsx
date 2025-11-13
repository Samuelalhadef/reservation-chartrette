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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-5xl w-full my-8 border border-gray-200 dark:border-gray-700">
        {/* En-tête élégant */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 relative rounded-t-3xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-4 left-4">
              <Building2 className="w-32 h-32 text-white" />
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-8 h-8 text-white" />
              <h2 className="text-3xl font-bold text-white">
                Convention de mise à disposition
              </h2>
            </div>
            <p className="text-blue-100 text-lg">
              Équipements sportifs municipaux - Année 2025-2026
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
              <Shield className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">Document officiel</span>
            </div>
          </div>
        </div>

        {/* Contenu de la convention */}
        <div className="p-8 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Introduction */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 p-3 rounded-xl">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    Objet de la convention
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Cette convention définit les modalités de mise à disposition des locaux du
                    <strong> complexe sportif François COMBORIEU</strong>.
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 leading-relaxed">
                    Les créneaux mis à disposition pourront être facturés selon le type d'utilisateur
                    et la nature des activités, en référence à la grille de tarifs en vigueur.
                  </p>
                </div>
              </div>
            </div>

            {/* Parties contractantes */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Mairie */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border-2 border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">La Mairie</h4>
                </div>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <p className="font-bold text-blue-600 dark:text-blue-400">MAIRIE DE CHARTRETTES</p>
                  <p className="text-sm">37 rue Georges Clemenceau</p>
                  <p className="text-sm">77590 CHARTRETTES</p>
                  <p className="text-sm">📞 01.60.69.65.01</p>
                  <p className="text-sm mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                    Représentée par<br />
                    <strong>M. Pascal Gros</strong>, Maire
                  </p>
                </div>
                <div className="mt-4 text-center">
                  <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    Partie contractante
                  </span>
                </div>
              </div>

              {/* Association */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-6 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-indigo-600 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">L'Association</h4>
                </div>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">{associationData.name}</p>
                  {associationData.address && (
                    <p className="text-sm">{associationData.address}</p>
                  )}
                  <p className="text-sm mt-3 pt-3 border-t border-indigo-300 dark:border-indigo-600">
                    Représentée par<br />
                    <strong>{associationData.contactName}</strong>, Président
                  </p>
                  <p className="text-sm">📞 {associationData.contactPhone}</p>
                  <p className="text-sm">✉️ {associationData.contactEmail}</p>
                </div>
                <div className="mt-4 text-center">
                  <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                    L'occupant
                  </span>
                </div>
              </div>
            </div>

            {/* Articles */}
            <div className="space-y-4">
              {/* Article 1 */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">Article 1 – Durée</h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      La présente convention est conclue pour la période du
                      <strong className="text-blue-600 dark:text-blue-400"> 8 septembre 2025 au 10 juillet 2026 inclus</strong>,
                      selon les créneaux attribués en annexe de la convention.
                    </p>
                  </div>
                </div>
              </div>

              {/* Article 2 */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">
                      Article 2 – Conditions de mise à disposition
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      La mise à disposition est effectuée à titre <strong>précaire, révocable et gracieux</strong>,
                      conformément à l'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Avertissement important */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500 p-6 rounded-r-2xl">
              <div className="flex items-start gap-4">
                <div className="bg-amber-500 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-amber-900 dark:text-amber-200 text-lg mb-2">⚠️ IMPORTANT</p>
                  <ul className="space-y-2 text-amber-800 dark:text-amber-300">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>En absence de signature de la convention, <strong>l'occupation des lieux est INTERDITE</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>L'occupation est également <strong>INTERDITE en dehors des jours et créneaux alloués</strong>.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Engagement République */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6" />
                <h4 className="font-bold text-lg">ENGAGEMENT N° 7 : RESPECT DES SYMBOLES DE LA RÉPUBLIQUE</h4>
              </div>
              <p className="text-blue-100 leading-relaxed">
                L'association s'engage à respecter le drapeau tricolore 🇫🇷, l'hymne national,
                et la devise de la République : <em>Liberté, Égalité, Fraternité</em>.
              </p>
            </div>

            {/* Date et lieu */}
            <div className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl text-center border border-gray-300 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                📍 Fait à <strong>Chartrettes</strong>, le <strong>{currentDate}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Zone de signature */}
        <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Signature électronique
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pour finaliser la convention, veuillez apposer votre signature ci-dessous
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg border-2 border-blue-300 dark:border-blue-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                Signez avec votre souris ou votre trackpad dans le cadre ci-dessous
              </p>
              <div className="relative group">
                <div className={`border-3 ${hasSignature ? 'border-green-500' : 'border-dashed border-gray-400 dark:border-gray-600'} rounded-xl overflow-hidden bg-white shadow-inner transition-all`}>
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={200}
                    className="w-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-400 dark:text-gray-600 text-sm font-medium">
                      ✍️ Signez ici
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-3">
                <button
                  type="button"
                  onClick={clearSignature}
                  disabled={!hasSignature}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
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

          {/* Boutons d'action */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all font-semibold shadow-sm hover:shadow-md"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasSignature || isSubmitting}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <PenTool className="w-5 h-5" />
                  Signer et continuer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
