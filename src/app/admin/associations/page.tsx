'use client';

import { useEffect, useState } from 'react';
import { Landmark, Mail, Pencil, Phone, Plus, Search, User, Users, X } from 'lucide-react';
import Button from '@/components/Button';

type AssociationStatus = 'active' | 'inactive' | 'pending';

interface Association {
  id: string;
  name: string;
  description: string;
  address: string | null;
  socialPurpose: string | null;
  presidentAddress: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: AssociationStatus;
  memberCount: number;
}

type AssociationForm = {
  name: string;
  description: string;
  socialPurpose: string;
  address: string;
  contactName: string;
  presidentAddress: string;
  contactEmail: string;
  contactPhone: string;
  status: AssociationStatus;
};

const EMPTY_FORM: AssociationForm = {
  name: '',
  description: '',
  socialPurpose: '',
  address: '',
  contactName: '',
  presidentAddress: '',
  contactEmail: '',
  contactPhone: '',
  status: 'active',
};

const STATUS_LABELS: Record<AssociationStatus, string> = {
  active: 'Active',
  pending: 'En attente',
  inactive: 'Inactive',
};

const STATUS_BADGES: Record<AssociationStatus, string> = {
  active: 'bg-accent-100 text-accent-800 dark:bg-accent-900/20 dark:text-accent-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-primary-700/40 dark:text-slate-300',
};

const inputClass =
  'w-full px-3 py-2 border border-slate-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-primary-900/30 text-slate-900 dark:text-slate-100';

const toForm = (a: Association): AssociationForm => ({
  name: a.name,
  description: a.description,
  socialPurpose: a.socialPurpose || '',
  address: a.address || '',
  contactName: a.contactName || '',
  presidentAddress: a.presidentAddress || '',
  contactEmail: a.contactEmail || '',
  contactPhone: a.contactPhone || '',
  status: a.status,
});

export default function AdminAssociationsPage() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AssociationStatus>('all');
  // null = fenêtre fermée ; id null = création
  const [editing, setEditing] = useState<{ id: string | null; form: AssociationForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssociations();
  }, []);

  const fetchAssociations = async () => {
    try {
      const res = await fetch('/api/admin/associations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du chargement');
      setAssociations(data.associations);
    } catch (err: any) {
      console.error('Error fetching associations:', err);
      alert(err.message || 'Erreur lors du chargement des associations');
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (association: Association | null) => {
    setError('');
    setEditing({
      id: association?.id ?? null,
      form: association ? toForm(association) : { ...EMPTY_FORM },
    });
  };

  const updateForm = (patch: Partial<AssociationForm>) =>
    setEditing((prev) => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev));

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        editing.id ? `/api/admin/associations/${editing.id}` : '/api/admin/associations',
        {
          method: editing.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editing.form),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      await fetchAssociations();
      setEditing(null);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filtered = associations.filter((a) => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSearch =
      !term ||
      [a.name, a.contactName, a.contactEmail, a.description]
        .some((v) => (v || '').toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: associations.length,
    active: associations.filter((a) => a.status === 'active').length,
    pending: associations.filter((a) => a.status === 'pending').length,
    inactive: associations.filter((a) => a.status === 'inactive').length,
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-600 dark:text-slate-300">
        Chargement des associations...
      </div>
    );
  }

  const field = (
    key: keyof AssociationForm,
    label: string,
    options: { type?: string; placeholder?: string; required?: boolean; multiline?: boolean } = {}
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
        {options.required && <span className="text-red-600"> *</span>}
      </label>
      {options.multiline ? (
        <textarea
          value={editing?.form[key] ?? ''}
          onChange={(e) => updateForm({ [key]: e.target.value })}
          rows={3}
          placeholder={options.placeholder}
          className={inputClass}
        />
      ) : (
        <input
          type={options.type || 'text'}
          value={editing?.form[key] ?? ''}
          onChange={(e) => updateForm({ [key]: e.target.value })}
          placeholder={options.placeholder}
          className={inputClass}
        />
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-800 dark:text-white flex items-center gap-3">
            <Landmark className="w-8 h-8" />
            Gestion des associations
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Modifier les associations existantes ou en créer de nouvelles
          </p>
        </div>
        <Button variant="primary" onClick={() => openEditor(null)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle association
        </Button>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-primary-800/40 rounded-lg shadow-card border border-slate-200 dark:border-primary-700/60 p-4 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nom, président, email..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'pending', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-700 text-white'
                  : 'bg-slate-100 dark:bg-primary-700/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-primary-700/60'
              }`}
            >
              {s === 'all' ? 'Toutes' : STATUS_LABELS[s]} ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-primary-800/40 rounded-lg border border-slate-200 dark:border-primary-700/60 p-8 text-center text-slate-600 dark:text-slate-300">
          Aucune association trouvée
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-primary-800/40 rounded-xl shadow-card border border-slate-200 dark:border-primary-700/60 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white break-words">
                  {a.name}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_BADGES[a.status]}`}
                >
                  {STATUS_LABELS[a.status]}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                {a.description}
              </p>
              <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300 flex-1">
                <p className="flex items-center gap-2">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{a.contactName || '—'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{a.contactEmail || '—'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{a.contactPhone || '—'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  {a.memberCount} compte{a.memberCount > 1 ? 's' : ''} rattaché
                  {a.memberCount > 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => openEditor(a)}
                className="mt-4 w-full text-sm"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-primary-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-primary-700/60">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-primary-800 dark:text-white">
                  {editing.id ? "Modifier l'association" : 'Nouvelle association'}
                </h3>
                <button
                  onClick={() => setEditing(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">{field('name', "Nom de l'association", { required: true })}</div>
                <div className="sm:col-span-2">
                  {field('description', 'Description', { required: true, multiline: true })}
                </div>
                <div className="sm:col-span-2">
                  {field('socialPurpose', 'Objet social', { multiline: true })}
                </div>
                <div className="sm:col-span-2">
                  {field('address', 'Adresse du siège social', {
                    placeholder: 'Ex: 12 Rue de la Mairie, 77590 Chartrettes',
                  })}
                </div>
                {field('contactName', 'Président(e)')}
                {field('presidentAddress', 'Adresse du président')}
                {field('contactEmail', 'Email de contact', { type: 'email' })}
                {field('contactPhone', 'Téléphone', { type: 'tel' })}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Statut
                  </label>
                  <select
                    value={editing.form.status}
                    onChange={(e) => updateForm({ status: e.target.value as AssociationStatus })}
                    className={inputClass}
                  >
                    <option value="active">Active — sélectionnable à l&apos;inscription</option>
                    <option value="pending">En attente de validation</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setEditing(null)} className="flex-1">
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={saving}
                  disabled={
                    saving ||
                    editing.form.name.trim().length < 2 ||
                    !editing.form.description.trim()
                  }
                  className="flex-1"
                >
                  {editing.id ? 'Enregistrer' : "Créer l'association"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
