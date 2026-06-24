'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
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
  Pencil,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Document {
  id: string;
  type: 'ponctuelle' | 'yearly-convention';
  title: string;
  signedAt: string;
  associationName: string;
  associationAddress?: string;
  associationPresident?: string;
  signatureUrl: string;
  // Ponctuelle only
  roomName?: string;
  reservationDate?: string;
  timeSlots?: Array<{ start: string; end: string }>;
  reason?: string;
  estimatedParticipants?: number;
  reservationStatus?: string;
  reservationId?: string;
  // Annuelle
  validatedAt?: string | null;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  address?: string;
  isChartrettesResident?: boolean;
  associationId: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [mairieSettings, setMairieSettings] = useState<Record<string, string>>({});

  // Gestion des données personnelles (RGPD)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', isChartrettesResident: false });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchDocuments();
      fetch('/api/convention-settings')
        .then((r) => r.json())
        .then((d) => d.settings && setMairieSettings(d.settings))
        .catch(() => {});
      // Récupère les champs éditables complets (dont la résidence)
      fetch('/api/user/profile')
        .then((r) => r.json())
        .then((d) => {
          if (d?.user) {
            setEditForm({
              name: d.user.name || '',
              address: d.user.address || '',
              isChartrettesResident: !!d.user.isChartrettesResident,
            });
            setUserData((prev) =>
              prev ? { ...prev, isChartrettesResident: !!d.user.isChartrettesResident } : prev
            );
          }
        })
        .catch(() => {});
    }
  }, [status, router]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          address: editForm.address,
          isChartrettesResident: editForm.isChartrettesResident,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Erreur lors de la mise à jour');
        return;
      }
      setUserData((prev) => (prev ? { ...prev, ...data.user } : prev));
      setIsEditing(false);
      setProfileMessage('Vos informations ont été mises à jour.');
    } catch {
      setProfileError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/user/export');
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mes-donnees-chartrettes.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors de l'export de vos données.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erreur lors de la suppression du compte.');
        setDeleting(false);
        setShowDeleteModal(false);
        return;
      }
      // Déconnexion et retour à l'accueil
      await signOut({ callbackUrl: '/' });
    } catch {
      alert('Une erreur est survenue. Veuillez réessayer.');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

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

  // Charge la signature du maire (image publique) et la convertit en data URL
  // pour l'injecter dans le PDF. Mise en cache via une variable de module.
  const fetchSignatureDataUrl = async (): Promise<string | null> => {
    try {
      const res = await fetch('/image/signature-maire.png');
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const downloadSignature = (doc: Document) => {
    if (!doc.signatureUrl) return;
    const a = document.createElement('a');
    a.href = doc.signatureUrl;
    a.download = `signature-${doc.type}-${doc.id.replace(':', '-')}.png`;
    a.click();
  };

  const downloadPDF = async (doc: Document) => {
    if (doc.type !== 'ponctuelle' || !doc.signatureUrl || !userData) return;
    try {
      const { generateReservationConventionPDF } = await import(
        '@/lib/generateReservationConventionPDF'
      );
      // La signature du maire n'apparaît que si la réservation est approuvée.
      let mairieSignature: string | null = null;
      if (doc.reservationStatus === 'approved') {
        mairieSignature = await fetchSignatureDataUrl();
      }
      const isAssoc = !!userData.associationId && doc.associationName && doc.associationName !== 'Particulier';
      const pdf = generateReservationConventionPDF({
        mairieSignature,
        mairieValidatedAt: doc.signedAt,
        signer: {
          name: userData.name,
          email: userData.email,
          address: userData.address,
          type: isAssoc ? 'association' : (userData.role === 'admin' ? 'mairie' : 'particulier'),
        },
        association: isAssoc
          ? {
              name: doc.associationName,
              address: doc.associationAddress,
              presidentName: doc.associationPresident,
            }
          : undefined,
        reservation: {
          roomName: doc.roomName || 'Salle',
          date: doc.reservationDate || new Date(),
          timeSlots: doc.timeSlots || [],
          reason: doc.reason,
          estimatedParticipants: doc.estimatedParticipants,
        },
        signature: doc.signatureUrl,
        signedAt: doc.signedAt,
        settings: mairieSettings,
      });
      const safeName = (doc.roomName || 'salle').replace(/\s+/g, '_');
      const dateStr = doc.reservationDate
        ? new Date(doc.reservationDate).toISOString().slice(0, 10)
        : 'sansdate';
      pdf.save(`convention_${safeName}_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Erreur lors de la génération du PDF');
    }
  };

  const downloadYearlyPDF = async (doc: Document) => {
    if (doc.type !== 'yearly-convention' || !doc.signatureUrl) return;
    try {
      const { generateYearlyConventionPDF } = await import('@/lib/generateYearlyConventionPDF');
      // La signature du maire n'apparaît que si la convention est validée.
      const mairieSignature = doc.validatedAt ? await fetchSignatureDataUrl() : null;
      const pdf = generateYearlyConventionPDF({
        association: {
          name: doc.associationName,
          address: doc.associationAddress,
          presidentName: doc.associationPresident,
          email: userData?.email,
        },
        signature: doc.signatureUrl,
        signedAt: doc.signedAt,
        mairieSignature,
        mairieValidatedAt: doc.validatedAt || undefined,
        settings: mairieSettings,
      });
      const safeName = doc.associationName.replace(/\s+/g, '_');
      pdf.save(`convention_annuelle_${safeName}.pdf`);
    } catch (err) {
      console.error('PDF annuel generation failed:', err);
      alert('Erreur lors de la génération du PDF');
    }
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

        {/* Mes informations personnelles (rectification RGPD) */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-primary-700 to-accent-600 p-2.5 rounded-xl">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Mes informations personnelles</h2>
                <p className="text-xs text-slate-600">Consultez et modifiez vos données</p>
              </div>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  setProfileMessage('');
                  setProfileError('');
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-primary-400 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
            )}
          </div>

          {profileMessage && (
            <div className="mb-4 p-3 bg-accent-50 border border-accent-200 rounded-lg text-accent-800 text-sm">
              {profileMessage}
            </div>
          )}
          {profileError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {profileError}
            </div>
          )}

          {!isEditing ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow icon={User} label="Nom complet" value={userData?.name} />
              <InfoRow icon={Mail} label="Email" value={userData?.email} />
              <InfoRow icon={MapPin} label="Adresse" value={userData?.address || '—'} />
              <InfoRow
                icon={Building2}
                label="Résident de Chartrettes"
                value={userData?.isChartrettesResident ? 'Oui' : 'Non'}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Email <span className="text-xs text-slate-400">(non modifiable)</span>
                </label>
                <input
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Adresse</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: e.target.value,
                      isChartrettesResident: e.target.value.toLowerCase().includes('chartrettes'),
                    })
                  }
                  rows={3}
                  placeholder="Ex: 12 Rue de la Mairie, 77590 Chartrettes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <label className="flex items-start gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isChartrettesResident}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isChartrettesResident: e.target.checked })
                  }
                  className="mt-0.5 w-5 h-5 text-primary-700 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-primary-900">J'habite à Chartrettes</span>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setProfileError('');
                    setEditForm({
                      name: userData?.name || '',
                      address: userData?.address || '',
                      isChartrettesResident: !!userData?.isChartrettesResident,
                    });
                  }}
                  disabled={savingProfile}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {savingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
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

                    {/* Signature preview + actions */}
                    {doc.signatureUrl && (
                      <div className="flex flex-col items-end gap-2">
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
                            title="Télécharger la signature seule (PNG)"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadPDF(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Convention PDF
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
                      <div className="flex flex-col items-end gap-2">
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
                            title="Télécharger la signature seule (PNG)"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadYearlyPDF(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Convention PDF
                        </button>
                        {doc.validatedAt && (
                          <span className="inline-flex items-center gap-1 text-xs text-accent-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Validée par la mairie
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mes données personnelles — RGPD */}
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-gradient-to-r from-primary-700 to-accent-600 p-2.5 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Mes données personnelles</h2>
              <p className="text-xs text-slate-600">
                Téléchargez ou supprimez vos données (RGPD)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-slate-200 rounded-xl">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Exporter mes données</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Téléchargez l'ensemble de vos données au format JSON.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-primary-200 text-primary-700 hover:bg-primary-50 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Exporter (JSON)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-red-200 bg-red-50/50 rounded-xl">
              <div>
                <p className="font-semibold text-red-800 text-sm">Supprimer mon compte</p>
                <p className="text-xs text-red-700/80 mt-0.5">
                  Action définitive. Vos données personnelles seront supprimées ou
                  anonymisées si des réservations y sont rattachées.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Supprimer votre compte ?</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cette action est définitive. Si des réservations sont rattachées à votre
              compte, vos données personnelles seront anonymisées (les documents devant
              être conservés par la mairie le restent). Dans le cas contraire, votre
              compte sera entièrement supprimé. Vous serez ensuite déconnecté.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

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

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl">
      <div className="bg-slate-100 p-2 rounded-lg">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}
