'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  FileUp,
  RotateCcw,
  Save,
  ScrollText,
  Shield,
  Undo2,
  X,
} from 'lucide-react';
import Button from '@/components/Button';
import type { ReglementDoc, ReglementId } from '@/lib/reglement';

// TipTap ne sert que sur cette page : chargé à part.
const ReglementEditor = dynamic(() => import('@/components/ReglementEditor'), {
  ssr: false,
  loading: () => <div className="card min-h-[60vh] animate-pulse" />,
});

const TABS: { id: ReglementId; label: string; icon: typeof Shield }[] = [
  { id: 'complexe', label: 'Complexe sportif', icon: Shield },
  { id: 'salles', label: 'Salles municipales (EMC / Vergers)', icon: Building2 },
];

interface Draft {
  html: string;
  /** Changer `version` remonte l'éditeur avec `html` (import, restauration…). */
  version: number;
  dirty: boolean;
  /** PDF importé, proposé au téléchargement à l'enregistrement si `attachPdf`. */
  pdfFile: File | null;
  attachPdf: boolean;
  removePdf: boolean;
}

type Notice = { type: 'success' | 'error' | 'info'; text: string } | null;

function freshDraft(doc: ReglementDoc, version = 0): Draft {
  return {
    html: doc.html,
    version,
    dirty: false,
    pdfFile: null,
    attachPdf: true,
    removePdf: false,
  };
}

export default function AdminReglementPage() {
  const [reglements, setReglements] = useState<Record<ReglementId, ReglementDoc> | null>(null);
  const [defaults, setDefaults] = useState<Record<ReglementId, string> | null>(null);
  const [drafts, setDrafts] = useState<Record<ReglementId, Draft> | null>(null);
  const [tab, setTab] = useState<ReglementId>('complexe');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/reglement')
      .then(async res => {
        if (!res.ok) throw new Error((await res.json()).error || 'Chargement impossible');
        return res.json();
      })
      .then(data => {
        setReglements(data.reglements);
        setDefaults(data.defaults);
        setDrafts({
          complexe: freshDraft(data.reglements.complexe),
          salles: freshDraft(data.reglements.salles),
        });
      })
      .catch(error => setLoadError(error.message));
  }, []);

  const anyDirty = drafts ? Object.values(drafts).some(d => d.dirty) : false;

  // Prévenir avant de quitter la page avec des modifications non enregistrées.
  useEffect(() => {
    if (!anyDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [anyDirty]);

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-6 text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" /> {loadError}
        </div>
      </div>
    );
  }

  if (!reglements || !drafts || !defaults) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card min-h-[60vh] animate-pulse" />
      </div>
    );
  }

  const doc = reglements[tab];
  const draft = drafts[tab];

  const updateDraft = (patch: Partial<Draft>) =>
    setDrafts(prev => (prev ? { ...prev, [tab]: { ...prev[tab], ...patch } } : prev));

  /** Remplace le contenu de l'éditeur (import, restauration, annulation). */
  const replaceContent = (html: string, patch: Partial<Draft> = {}) =>
    updateDraft({ html, version: draft.version + 1, dirty: true, ...patch });

  const handleImport = async (file: File) => {
    if (draft.dirty && !window.confirm('Le texte en cours de modification va être remplacé par celui du PDF. Continuer ?')) {
      return;
    }
    setImporting(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append('pdf', file);
      const res = await fetch('/api/admin/reglement/import', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import impossible');
      replaceContent(data.html, { pdfFile: file, attachPdf: true, removePdf: false });
      setNotice({
        type: 'info',
        text: 'Le texte du PDF a été importé. Relisez la mise en forme (titres, listes, tableaux) puis enregistrez : rien n\'est publié avant.',
      });
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append('html', draft.html);
      if (draft.pdfFile && draft.attachPdf) form.append('pdf', draft.pdfFile);
      else if (draft.removePdf) form.append('removePdf', 'true');

      const res = await fetch(`/api/admin/reglement/${tab}`, { method: 'PUT', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enregistrement impossible');

      const saved: ReglementDoc = data.reglement;
      setReglements(prev => (prev ? { ...prev, [tab]: saved } : prev));
      // On garde l'éditeur tel quel (pas de remontage) : seul l'état change.
      updateDraft({ dirty: false, pdfFile: null, attachPdf: true, removePdf: false });
      setNotice({ type: 'success', text: 'Règlement enregistré : la page publique est à jour.' });
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!window.confirm('Abandonner les modifications non enregistrées ?')) return;
    updateDraft({ ...freshDraft(doc, draft.version + 1) });
    setNotice(null);
  };

  const handleRestoreDefault = () => {
    if (!window.confirm('Remplacer le texte par la version d\'origine du règlement ? (Rien n\'est publié avant d\'enregistrer.)')) return;
    replaceContent(defaults[tab]);
  };

  const hasPendingChanges = draft.dirty || draft.removePdf;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-800 dark:text-white flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-accent-600" />
            Règlement
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Modifiez le texte directement, ou importez le PDF du nouveau règlement pour remplacer le texte automatiquement.
          </p>
        </div>
        <Link href="/reglement" target="_blank" className="btn btn-ghost px-3 py-2 text-sm">
          <ExternalLink className="h-4 w-4" />
          Voir la page publique
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setNotice(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
              tab === id
                ? 'bg-primary-700 text-white border-primary-700 shadow-md dark:bg-accent-600 dark:border-accent-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700 dark:bg-primary-900/40 dark:text-slate-300 dark:border-primary-700/60'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
            {drafts[id].dirty && <span className="h-2 w-2 rounded-full bg-amber-400" title="Modifications non enregistrées" />}
          </button>
        ))}
      </div>

      {/* Barre d'actions */}
      <div className="card mb-4 p-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) handleImport(file);
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={importing}>
          {!importing && <FileUp className="h-4 w-4" />}
          {importing ? 'Lecture du PDF…' : 'Importer un PDF'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleRestoreDefault} disabled={importing || saving}>
          <RotateCcw className="h-4 w-4" />
          Texte d'origine
        </Button>
        {hasPendingChanges && (
          <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={importing || saving}>
            <Undo2 className="h-4 w-4" />
            Annuler les modifications
          </Button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {hasPendingChanges ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Modifications non enregistrées</span>
            ) : doc.updatedAt ? (
              `Enregistré le ${format(new Date(doc.updatedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`
            ) : (
              'Texte d\'origine'
            )}
          </span>
          <Button size="sm" onClick={handleSave} isLoading={saving} disabled={!hasPendingChanges || importing}>
            {!saving && <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* PDF proposé au téléchargement */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-2 font-semibold">
          <FileText className="h-4 w-4 text-accent-600" />
          PDF téléchargeable :
        </span>
        {draft.pdfFile ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.attachPdf}
              onChange={e => updateDraft({ attachPdf: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary-700"
            />
            Proposer « {draft.pdfFile.name} » au téléchargement
          </label>
        ) : doc.pdfName && !draft.removePdf ? (
          <>
            <a href={`/api/reglement/${tab}/pdf`} target="_blank" rel="noopener noreferrer" className="underline">
              {doc.pdfName}
            </a>
            <button
              type="button"
              onClick={() => updateDraft({ removePdf: true })}
              className="inline-flex items-center gap-1 text-red-600 hover:underline"
            >
              <X className="h-3.5 w-3.5" /> Retirer
            </button>
          </>
        ) : doc.pdfName && draft.removePdf ? (
          <span>
            « {doc.pdfName} » sera retiré à l'enregistrement.{' '}
            <button type="button" onClick={() => updateDraft({ removePdf: false })} className="underline">
              Garder
            </button>
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">aucun (importez un PDF pour le proposer)</span>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className={`mb-4 flex items-start gap-2 rounded-xl border p-4 text-sm ${
            notice.type === 'success'
              ? 'border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-800 dark:bg-accent-900/30 dark:text-accent-200'
              : notice.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <ReglementEditor
        key={`${tab}-${draft.version}`}
        initialHtml={draft.html}
        onChange={html => updateDraft({ html, dirty: true })}
      />

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Astuce : les « grands titres » découpent le règlement en parties sur la page publique ; utilisez « titre d'article » pour chaque article.
      </p>
    </div>
  );
}
