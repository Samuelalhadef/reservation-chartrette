'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Loader2, Mail, MapPin, Pencil, Phone, Save, User } from 'lucide-react';

interface AssociationInfo {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

type EditForm = {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
};

const toForm = (a: AssociationInfo): EditForm => ({
  name: a.name || '',
  contactName: a.contactName || '',
  contactEmail: a.contactEmail || '',
  contactPhone: a.contactPhone || '',
  address: a.address || '',
});

/**
 * Informations des associations rattachées au compte. Tout membre d'une
 * association peut les corriger (nom, président, contact).
 */
export default function AssociationInfoCard({ onUpdated }: { onUpdated?: () => void }) {
  const [associations, setAssociations] = useState<AssociationInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((d) => setAssociations(d?.associations || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || associations.length === 0) return null;

  return (
    <>
      {associations.map((association) => (
        <AssociationEditor
          key={association.id}
          association={association}
          onSaved={(updated) => {
            setAssociations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            onUpdated?.();
          }}
        />
      ))}
    </>
  );
}

function AssociationEditor({
  association,
  onSaved,
}: {
  association: AssociationInfo;
  onSaved: (updated: AssociationInfo) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditForm>(toForm(association));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/associations/${association.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la mise à jour');
        return;
      }
      onSaved(data.association);
      setForm(toForm(data.association));
      setIsEditing(false);
      setMessage("Les informations de l'association ont été mises à jour.");
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof EditForm,
    label: string,
    type: string = 'text',
    placeholder?: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-primary-700 to-accent-600 p-2.5 rounded-xl">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Mon association</h2>
            <p className="text-xs text-slate-600">
              Modifiable par tous les membres de l&apos;association
            </p>
          </div>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setMessage('');
              setError('');
              setIsEditing(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-primary-400 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 p-3 bg-accent-50 border border-accent-200 rounded-lg text-accent-800 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!isEditing ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Row icon={Building2} label="Nom de l'association" value={association.name} />
          <Row icon={User} label="Président(e)" value={association.contactName} />
          <Row icon={Mail} label="Email de contact" value={association.contactEmail} />
          <Row icon={Phone} label="Téléphone" value={association.contactPhone} />
          <Row icon={MapPin} label="Siège social" value={association.address} />
        </div>
      ) : (
        <div className="space-y-4">
          {field('name', "Nom de l'association")}
          {field('contactName', 'Nom du président / de la présidente')}
          {field('contactEmail', 'Email de contact', 'email', 'contact@association.fr')}
          {field('contactPhone', 'Téléphone (optionnel)', 'tel')}
          {field('address', 'Adresse du siège social', 'text', 'Ex: 12 Rue de la Mairie, 77590 Chartrettes')}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError('');
                setForm(toForm(association));
              }}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || form.name.trim().length < 2}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
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
