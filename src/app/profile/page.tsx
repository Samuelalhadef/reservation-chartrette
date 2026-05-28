'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Shield,
  FileText,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Document {
  id: string;
  type: 'ponctuelle' | 'yearly-convention';
  title: string;
  signedAt: string;
  associationName: string;
  signatureUrl: string;
  // Ponctuelle only
  roomName?: string;
  reservationDate?: string;
  timeSlots?: Array<{ start: string; end: string }>;
  reason?: string;
  reservationStatus?: string;
  reservationId?: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  associationId: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchDocuments();
    }
  }, [status, router]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/user/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
        setUserData(data.user);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSignature = (doc: Document) => {
    if (!doc.signatureUrl) return;
    const a = document.createElement('a');
    a.href = doc.signatureUrl;
    a.download = `signature-${doc.type}-${doc.id.replace(':', '-')}.png`;
    a.click();
  };

  const { ponctuelles, annuelles, associationName } = useMemo(() => {
    const p = documents.filter((d) => d.type === 'ponctuelle');
    const a = documents.filter((d) => d.type === 'yearly-convention');
    return {
      ponctuelles: p,
      annuelles: a,
      associationName: documents.find((d) => d.associationName && d.associationName !== 'Particulier')?.associationName,
    };
  }, [documents]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête profil */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 border border-slate-200">
          <div className="header-gradient p-6 sm:p-8">
            <div className="flex items-center gap-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 sm:p-6 rounded-2xl">
                <User className="w-10 h-10 sm:w-16 sm:h-16 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {userData?.name}
                </h1>
                <div className="flex flex-wrap gap-3 sm:gap-4 text-white/90">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" />
                    <span>{userData?.email}</span>
                  </div>
                  {userData?.role === 'admin' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-semibold">Administrateur</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(userData?.associationId || associationName) && (
            <div className="p-5 border-t border-slate-200 bg-gradient-to-r from-primary-50 to-accent-50">
              <div className="flex items-center gap-3">
                <div className="bg-primary-700 p-2.5 rounded-xl">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Association</p>
                  <p className="text-base font-semibold text-slate-900">
                    {associationName || '—'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-slate-500">Conventions ponctuelles</p>
            <p className="text-2xl font-bold text-primary-700">{ponctuelles.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Convention annuelle</p>
            <p className="text-2xl font-bold text-accent-600">{annuelles.length}</p>
          </div>
        </div>

        {/* Conventions ponctuelles */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-gradient-to-r from-primary-700 to-accent-600 p-2.5 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Conventions ponctuelles</h2>
              <p className="text-xs text-slate-600">
                Signée à chaque réservation ponctuelle
              </p>
            </div>
          </div>

          {ponctuelles.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">Aucune convention ponctuelle</p>
              <p className="text-xs text-slate-500 mt-1">
                Elles apparaîtront ici à chaque réservation signée
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ponctuelles.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 mb-1">{doc.roomName || 'Salle'}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        {doc.reservationDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(doc.reservationDate), 'EEEE d MMM yyyy', { locale: fr })}
                          </span>
                        )}
                        {doc.timeSlots && doc.timeSlots.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {doc.timeSlots[0].start} → {doc.timeSlots[doc.timeSlots.length - 1].end}
                          </span>
                        )}
                        {doc.reservationStatus && (
                          <span className={`badge ${
                            doc.reservationStatus === 'approved' ? 'badge-success' :
                            doc.reservationStatus === 'rejected' ? 'badge-danger' :
                            doc.reservationStatus === 'cancelled' ? 'badge-neutral' :
                            'badge-warning'
                          }`}>
                            {doc.reservationStatus === 'approved' ? 'Approuvée' :
                             doc.reservationStatus === 'rejected' ? 'Refusée' :
                             doc.reservationStatus === 'cancelled' ? 'Annulée' :
                             doc.reservationStatus === 'awaiting_payment' ? 'Paiement attendu' :
                             'En attente'}
                          </span>
                        )}
                      </div>
                      {doc.signedAt && (
                        <div className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-accent-600" />
                          Signée le {format(new Date(doc.signedAt), 'd MMM yyyy à HH:mm', { locale: fr })}
                        </div>
                      )}
                    </div>

                    {/* Signature preview */}
                    {doc.signatureUrl && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewSignature(doc.signatureUrl)}
                          className="border border-slate-200 rounded-md p-1.5 hover:border-primary-400 transition-colors bg-white"
                          title="Voir la signature"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={doc.signatureUrl} alt="signature" className="h-12 w-auto max-w-[120px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSignature(doc)}
                          className="p-2 text-slate-400 hover:text-primary-700 transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Convention annuelle */}
        {annuelles.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-r from-accent-600 to-accent-700 p-2.5 rounded-xl">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Convention annuelle</h2>
                <p className="text-xs text-slate-600">
                  Couvre toutes les réservations annuelles de votre association
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {annuelles.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-accent-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 mb-1">{doc.title}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {doc.associationName}
                        </span>
                        {doc.signedAt && (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-accent-600" />
                            Signée le {format(new Date(doc.signedAt), 'd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>

                    {doc.signatureUrl && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewSignature(doc.signatureUrl)}
                          className="border border-slate-200 rounded-md p-1.5 hover:border-accent-400 transition-colors bg-white"
                          title="Voir la signature"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={doc.signatureUrl} alt="signature" className="h-12 w-auto max-w-[120px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSignature(doc)}
                          className="p-2 text-slate-400 hover:text-accent-700 transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox signature */}
      {previewSignature && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewSignature(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Signature</h3>
              <button
                onClick={() => setPreviewSignature(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>
            <div className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSignature} alt="signature" className="w-full h-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
