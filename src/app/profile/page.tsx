'use client';

import React, { useState, useEffect } from 'react';
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
  Phone,
  CheckCircle2
} from 'lucide-react';
// generateConventionPDF (et jsPDF) sont importés dynamiquement à l'usage
// pour éviter d'embarquer jsPDF dans le bundle de la page.

interface Document {
  id: string;
  type: string;
  title: string;
  signedAt: string;
  associationName: string;
  signatureUrl: string;
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

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

  const generatePDF = async (_documentId: string) => {
    // La génération de PDF de convention est retirée (la convention annuelle
    // n'a pas de PDF dédié pour l'instant, et la convention ponctuelle est
    // stockée comme image de signature attachée à chaque réservation).
    alert('Téléchargement de la convention indisponible pour le moment.');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-primary-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-primary-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête de profil */}
        <div className="bg-white dark:bg-primary-800/40 rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-200 dark:border-primary-700/60">
          <div className="header-gradient p-8">
            <div className="flex items-center gap-6">
              <div className="bg-white/20 backdrop-blur-sm p-6 rounded-2xl">
                <User className="w-16 h-16 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {userData?.name}
                </h1>
                <div className="flex flex-wrap gap-4 text-white/90">
                  <div className="flex items-center gap-2">
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

          {userData?.associationId && (
            <div className="p-6 border-t border-slate-200 dark:border-primary-700/60 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20">
              <div className="flex items-center gap-3">
                <div className="bg-primary-700 p-3 rounded-xl">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Association</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {documents[0]?.associationName || 'Chargement...'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documents signés */}
        <div className="bg-white dark:bg-primary-800/40 rounded-3xl shadow-xl p-8 border border-slate-200 dark:border-primary-700/60">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-primary-700 to-accent-600 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Mes Documents
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Documents officiels signés
              </p>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-300">
                Aucun document signé pour le moment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 p-6 rounded-2xl border-2 border-primary-200 dark:border-primary-700/60 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-primary-700 p-3 rounded-xl">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                          {doc.title}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            <span>{doc.associationName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Signé le {new Date(doc.signedAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-accent-600 dark:text-accent-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-medium">Document officiel</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => generatePDF(doc.id)}
                      disabled={isGeneratingPdf === doc.id}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-700 to-accent-600 text-white rounded-xl hover:from-primary-800 hover:to-accent-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingPdf === doc.id ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Génération...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Télécharger PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
