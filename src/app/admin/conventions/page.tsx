'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Calendar,
  Building2,
  User as UserIcon,
  Search,
  Filter,
  X,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ConventionType = 'ponctuelle' | 'annuelle';

interface ConventionItem {
  type: ConventionType;
  id: string;
  signedAt: string | Date | null;
  signature: string | null;
  signerName: string;
  signerEmail: string;
  signerAddress?: string;
  associationId: string | null;
  associationName: string;
  associationAddress?: string;
  associationPresident?: string;
  // Ponctuelle only
  reservationId?: string;
  roomName?: string;
  reservationDate?: string | Date;
  timeSlots?: Array<{ start: string; end: string }>;
  reason?: string;
  estimatedParticipants?: number;
  reservationStatus?: string;
}

type TypeFilter = 'all' | ConventionType;

export default function AdminConventionsPage() {
  const [items, setItems] = useState<ConventionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [associationFilter, setAssociationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<'date' | 'signer' | 'association'>('date');

  const [previewSignature, setPreviewSignature] = useState<string | null>(null);

  useEffect(() => {
    fetchConventions();
  }, []);

  const fetchConventions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/conventions');
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Liste unique des associations pour le filtre
  const associationOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { id: string; name: string }[] = [];
    items.forEach(i => {
      const id = i.associationId || `__${i.associationName}`;
      if (!seen.has(id)) {
        seen.add(id);
        opts.push({ id, name: i.associationName });
      }
    });
    return opts.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Items filtrés + triés
  const filtered = useMemo(() => {
    let arr = items;

    if (typeFilter !== 'all') {
      arr = arr.filter(i => i.type === typeFilter);
    }

    if (associationFilter !== 'all') {
      arr = arr.filter(i => {
        const id = i.associationId || `__${i.associationName}`;
        return id === associationFilter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        i =>
          i.signerName.toLowerCase().includes(q) ||
          i.signerEmail.toLowerCase().includes(q) ||
          i.associationName.toLowerCase().includes(q) ||
          (i.roomName?.toLowerCase().includes(q) ?? false)
      );
    }

    const sorted = [...arr];
    if (sortBy === 'date') {
      sorted.sort((a, b) => {
        const ad = a.signedAt ? new Date(a.signedAt).getTime() : 0;
        const bd = b.signedAt ? new Date(b.signedAt).getTime() : 0;
        return bd - ad;
      });
    } else if (sortBy === 'signer') {
      sorted.sort((a, b) => a.signerName.localeCompare(b.signerName));
    } else if (sortBy === 'association') {
      sorted.sort((a, b) => a.associationName.localeCompare(b.associationName));
    }
    return sorted;
  }, [items, typeFilter, associationFilter, search, sortBy]);

  const resetFilters = () => {
    setSearch('');
    setAssociationFilter('all');
    setTypeFilter('all');
    setSortBy('date');
  };

  const downloadSignature = (item: ConventionItem) => {
    if (!item.signature) return;
    const a = document.createElement('a');
    a.href = item.signature;
    a.download = `signature-${item.type}-${item.signerName.replace(/\s+/g, '_')}-${item.id}.png`;
    a.click();
  };

  const downloadPDF = async (item: ConventionItem) => {
    if (item.type !== 'ponctuelle' || !item.signature) return;
    try {
      const { generateReservationConventionPDF } = await import(
        '@/lib/generateReservationConventionPDF'
      );
      const isAssoc = item.associationName && item.associationName !== 'Particulier';
      const pdf = generateReservationConventionPDF({
        signer: {
          name: item.signerName,
          email: item.signerEmail,
          address: item.signerAddress,
          type: isAssoc ? 'association' : 'particulier',
        },
        association: isAssoc
          ? {
              name: item.associationName,
              address: item.associationAddress,
              presidentName: item.associationPresident,
            }
          : undefined,
        reservation: {
          roomName: item.roomName || 'Salle',
          date: item.reservationDate || new Date(),
          timeSlots: item.timeSlots || [],
          reason: item.reason,
          estimatedParticipants: item.estimatedParticipants,
        },
        signature: item.signature,
        signedAt: item.signedAt || new Date(),
      });
      const safeName = item.signerName.replace(/\s+/g, '_');
      const dateStr = item.reservationDate
        ? new Date(item.reservationDate).toISOString().slice(0, 10)
        : 'sansdate';
      pdf.save(`convention_${safeName}_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Erreur lors de la génération du PDF');
    }
  };

  const stats = useMemo(
    () => ({
      total: items.length,
      ponctuelles: items.filter(i => i.type === 'ponctuelle').length,
      annuelles: items.filter(i => i.type === 'annuelle').length,
    }),
    [items]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-700 to-accent-600 flex items-center justify-center shadow-sm">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Conventions signées</h1>
            <p className="text-sm text-slate-600">
              Toutes les conventions de mise à disposition signées électroniquement
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Ponctuelles</p>
          <p className="text-2xl font-bold text-primary-700">{stats.ponctuelles}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Annuelles</p>
          <p className="text-2xl font-bold text-accent-600">{stats.annuelles}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card p-4 mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Recherche */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-600 mb-1">Recherche</label>
            <Search className="absolute left-3 top-[34px] h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom, email, salle..."
              className="input pl-9 text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as TypeFilter)}
              className="input text-sm"
            >
              <option value="all">Toutes</option>
              <option value="ponctuelle">Ponctuelles</option>
              <option value="annuelle">Annuelles</option>
            </select>
          </div>

          {/* Association */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Association</label>
            <select
              value={associationFilter}
              onChange={e => setAssociationFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="all">Toutes ({associationOptions.length})</option>
              {associationOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          {/* Tri */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Trier par</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="input text-sm"
            >
              <option value="date">Date (récent → ancien)</option>
              <option value="signer">Signataire (A → Z)</option>
              <option value="association">Association (A → Z)</option>
            </select>
          </div>
        </div>

        {(search || typeFilter !== 'all' || associationFilter !== 'all' || sortBy !== 'date') && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {items.length}
            </p>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800"
            >
              <Filter className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700 mx-auto mb-3" />
          <p className="text-sm text-slate-600">Chargement des conventions…</p>
        </div>
      ) : error ? (
        <div className="card p-6 border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">Erreur : {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 mb-1">Aucune convention</p>
          <p className="text-xs text-slate-500">
            {items.length === 0
              ? 'Aucune convention n\'a encore été signée.'
              : 'Aucun résultat avec ces filtres.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Vue desktop tableau */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Signataire</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Association</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Salle / Date réservation</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Signée le</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {item.type === 'ponctuelle' ? (
                        <span className="badge badge-info">Ponctuelle</span>
                      ) : (
                        <span className="badge badge-success">Annuelle</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.signerName}</div>
                      {item.signerEmail && (
                        <div className="text-xs text-slate-500">{item.signerEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-900">{item.associationName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.type === 'ponctuelle' ? (
                        <>
                          <div className="font-medium text-slate-900">{item.roomName}</div>
                          {item.reservationDate && (
                            <div className="text-xs text-slate-500">
                              {format(new Date(item.reservationDate), 'd MMM yyyy', { locale: fr })}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.signedAt ? (
                        <div>
                          <div>{format(new Date(item.signedAt), 'd MMM yyyy', { locale: fr })}</div>
                          <div className="text-xs text-slate-400">
                            {format(new Date(item.signedAt), 'HH:mm', { locale: fr })}
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.signature ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewSignature(item.signature)}
                            className="border border-slate-200 rounded-md p-1 hover:border-primary-400 transition-colors"
                            title="Voir la signature en grand"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.signature} alt="signature" className="h-8 w-auto max-w-[80px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadSignature(item)}
                            className="text-slate-400 hover:text-primary-700 transition-colors"
                            title="Télécharger la signature (PNG)"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {item.type === 'ponctuelle' && (
                            <button
                              type="button"
                              onClick={() => downloadPDF(item)}
                              className="text-slate-400 hover:text-primary-700 transition-colors"
                              title="Télécharger la convention PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vue mobile cards */}
          <div className="md:hidden divide-y divide-slate-200">
            {filtered.map(item => (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-900">{item.signerName}</div>
                    <div className="text-xs text-slate-500">{item.signerEmail}</div>
                  </div>
                  {item.type === 'ponctuelle' ? (
                    <span className="badge badge-info">Ponctuelle</span>
                  ) : (
                    <span className="badge badge-success">Annuelle</span>
                  )}
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {item.associationName}
                  </div>
                  {item.type === 'ponctuelle' && item.roomName && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {item.roomName}
                      {item.reservationDate && ` — ${format(new Date(item.reservationDate), 'd MMM yyyy', { locale: fr })}`}
                    </div>
                  )}
                  {item.signedAt && (
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                      Signée le {format(new Date(item.signedAt), 'd MMM yyyy à HH:mm', { locale: fr })}
                    </div>
                  )}
                </div>
                {item.signature && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewSignature(item.signature)}
                        className="flex-1 border border-slate-200 rounded-md p-2 hover:border-primary-400 transition-colors text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.signature} alt="signature" className="h-12 mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSignature(item)}
                        className="p-2 text-slate-400 hover:text-primary-700"
                        title="Signature (PNG)"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                    {item.type === 'ponctuelle' && (
                      <button
                        type="button"
                        onClick={() => downloadPDF(item)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-xs font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Convention PDF
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox signature */}
      {previewSignature && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewSignature(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
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
