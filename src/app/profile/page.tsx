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
import jsPDF from 'jspdf';

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

  const generatePDF = async (documentId: string) => {
    setIsGeneratingPdf(documentId);

    try {
      // Récupérer les données de la convention
      const response = await fetch('/api/user/convention-pdf');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const data = await response.json();
      const association = data.association;

      // Créer un nouveau PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      let yPosition = margin;

      // Header avec fond bleu
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 40, 'F');

      // Titre principal
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      yPosition = 15;
      pdf.text('Convention de mise à disposition', margin, yPosition);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      yPosition += 8;
      pdf.text('Équipements sportifs municipaux - Année 2025-2026', margin, yPosition);

      // Reset couleur texte
      pdf.setTextColor(0, 0, 0);
      yPosition = 50;

      // Objet de la convention
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Objet de la convention', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const objectText = 'Cette convention définit les modalités de mise à disposition des locaux du complexe sportif François COMBORIEU.';
      const objectLines = pdf.splitTextToSize(objectText, pageWidth - 2 * margin);
      pdf.text(objectLines, margin, yPosition);
      yPosition += lineHeight * objectLines.length + 5;

      // Parties contractantes
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Entre :', margin, yPosition);
      yPosition += lineHeight + 2;

      // La Mairie
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 35, 'F');

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(37, 99, 235);
      pdf.text('LA MAIRIE DE CHARTRETTES', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text('37 rue Georges Clemenceau', margin, yPosition);
      yPosition += lineHeight - 1;
      pdf.text('77590 CHARTRETTES', margin, yPosition);
      yPosition += lineHeight - 1;
      pdf.text('Tél: 01.60.69.65.01', margin, yPosition);
      yPosition += lineHeight - 1;
      pdf.text('Représentée par son Maire, Monsieur Pascal Gros', margin, yPosition);
      yPosition += lineHeight + 3;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text("D'une part,", margin, yPosition);
      yPosition += lineHeight + 5;

      // L'Association
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Et :', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFillColor(240, 245, 255);
      pdf.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 35, 'F');

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(99, 102, 241);
      pdf.text(`L'association ${association.name}`, margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      if (association.description) {
        pdf.text(`Siège social: ${association.description}`, margin, yPosition);
        yPosition += lineHeight - 1;
      }
      pdf.text(`Représentée par: ${association.contactName}, Président`, margin, yPosition);
      yPosition += lineHeight - 1;
      pdf.text(`Tél: ${association.contactPhone}`, margin, yPosition);
      yPosition += lineHeight - 1;
      pdf.text(`Mail: ${association.contactEmail}`, margin, yPosition);
      yPosition += lineHeight + 3;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Désigné ci-après « l\'occupant »', margin, yPosition);
      yPosition += lineHeight - 1;
      pdf.text("D'autre part.", margin, yPosition);
      yPosition += lineHeight + 8;

      // Articles
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Article 1 - Durée', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const article1Text = 'La présente convention est conclue pour la période du 8 septembre 2025 au 10 juillet 2026 inclus, selon les créneaux attribués en annexe de la convention.';
      const article1Lines = pdf.splitTextToSize(article1Text, pageWidth - 2 * margin);
      pdf.text(article1Lines, margin, yPosition);
      yPosition += lineHeight * article1Lines.length + 5;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Article 2 - Conditions de mise à disposition', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const article2Text = 'La mise à disposition est effectuée à titre précaire, révocable et gracieux, conformément à l\'article L. 2125-1 du Code Général de la Propriété des Personnes Publiques.';
      const article2Lines = pdf.splitTextToSize(article2Text, pageWidth - 2 * margin);
      pdf.text(article2Lines, margin, yPosition);
      yPosition += lineHeight * article2Lines.length + 8;

      // Important
      pdf.setFillColor(255, 251, 235);
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.5);
      pdf.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 20, 'FD');

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(180, 83, 9);
      pdf.text('⚠ IMPORTANT', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('• En absence de signature de la convention, l\'occupation des lieux est INTERDITE.', margin + 2, yPosition);
      yPosition += lineHeight - 1;
      pdf.text('• L\'occupation est également INTERDITE en dehors des jours et créneaux alloués.', margin + 2, yPosition);
      yPosition += lineHeight + 8;

      pdf.setTextColor(0, 0, 0);

      // Engagement
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ENGAGEMENT N° 7 : RESPECT DES SYMBOLES DE LA RÉPUBLIQUE', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const engagementText = 'L\'association s\'engage à respecter le drapeau tricolore, l\'hymne national, et la devise de la République : Liberté, Égalité, Fraternité.';
      const engagementLines = pdf.splitTextToSize(engagementText, pageWidth - 2 * margin);
      pdf.text(engagementLines, margin, yPosition);
      yPosition += lineHeight * engagementLines.length + 8;

      // Date et lieu
      const signedDate = new Date(association.conventionSignedAt).toLocaleDateString('fr-FR');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Fait à Chartrettes, le ${signedDate}`, margin, yPosition);
      yPosition += lineHeight + 10;

      // Signature avec encadré
      if (association.conventionSignature) {
        // Titre
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(37, 99, 235);
        pdf.text('Signature du représentant de l\'association:', margin, yPosition);
        yPosition += 8;

        try {
          // Cadre pour la signature
          const signatureWidth = 120;
          const signatureHeight = 50;

          // Fond gris clair
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(203, 213, 225);
          pdf.setLineWidth(1);
          pdf.rect(margin, yPosition, signatureWidth, signatureHeight, 'FD');

          // Ajouter l'image de la signature
          // S'assurer que c'est un data URL valide
          let signatureData = association.conventionSignature;

          // Si ce n'est pas déjà un data URL, on le laisse tel quel (jsPDF gère les deux)
          if (!signatureData.startsWith('data:')) {
            console.warn('La signature n\'est pas au format data URL, tentative d\'ajout direct');
          }

          pdf.addImage(
            signatureData,
            'PNG',
            margin + 10,
            yPosition + 5,
            signatureWidth - 20,
            signatureHeight - 10,
            undefined,
            'FAST'
          );

          yPosition += signatureHeight + 3;

          // Date de signature sous l'encadré
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(100, 116, 139);
          pdf.text(`Signé électroniquement le ${signedDate}`, margin, yPosition);
          yPosition += lineHeight + 5;

        } catch (error: any) {
          console.error('Erreur lors de l\'ajout de la signature:', error);

          // Affichage d'une zone de signature vide avec message
          const signatureWidth = 120;
          const signatureHeight = 50;

          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(203, 213, 225);
          pdf.setLineWidth(1);
          pdf.rect(margin, yPosition, signatureWidth, signatureHeight, 'FD');

          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(100, 116, 139);
          pdf.text('[Signature électronique enregistrée]', margin + 10, yPosition + signatureHeight / 2);
          pdf.text(`Signé le ${signedDate}`, margin + 10, yPosition + signatureHeight / 2 + 5);

          yPosition += signatureHeight + 5;
        }

        pdf.setTextColor(0, 0, 0);
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        'Document généré automatiquement par le système de réservation de Chartrettes',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Sauvegarder le PDF
      const fileName = `Convention_${association.name.replace(/\s+/g, '_')}_${signedDate.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert(error.message || 'Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête de profil */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8">
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
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-3 rounded-xl">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Association</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {documents[0]?.associationName || 'Chargement...'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documents signés */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mes Documents
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Documents officiels signés
              </p>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Aucun document signé pour le moment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-blue-600 p-3 rounded-xl">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {doc.title}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-medium">Document officiel</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => generatePDF(doc.id)}
                      disabled={isGeneratingPdf === doc.id}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
