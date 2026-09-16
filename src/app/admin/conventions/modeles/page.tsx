'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Info,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react';
import Button from '@/components/Button';
import {
  CONVENTION_KINDS,
  CONVENTION_KIND_LABELS,
  CONVENTION_PLACEHOLDERS,
  isYearlyKind,
  type ConventionArticle,
  type ConventionKind,
  type ConventionTemplate,
  type ConventionTemplates,
} from '@/lib/conventionText';

interface Meta {
  isDefault: boolean;
  updatedAt: string | null;
}

type Notice = { type: 'success' | 'error'; text: string } | null;

const emptyArticle = (): ConventionArticle => ({
  title: 'Article – Nouvel article',
  paragraphs: [''],
  bulletsIntro: '',
  bullets: [],
});

/** Déplace l'élément `index` d'un cran (-1 = vers le haut). */
function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function ConventionTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState<ConventionTemplates | null>(null);
  const [drafts, setDrafts] = useState<ConventionTemplates | null>(null);
  const [defaults, setDefaults] = useState<ConventionTemplates | null>(null);
  const [meta, setMeta] = useState<Record<ConventionKind, Meta> | null>(null);
  const [active, setActive] = useState<ConventionKind>('association-ponctuelle');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  // Articles dépliés, repérés par « section.article » (réinitialisé au changement d'onglet).
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/convention-templates', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement');
        setSaved(data.templates);
        setDrafts(structuredClone(data.templates));
        setDefaults(data.defaults);
        setMeta(data.meta);
      } catch (error: any) {
        setLoadError(error.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirtyKinds = useMemo(
    () =>
      new Set(
        drafts && saved ? CONVENTION_KINDS.filter((k) => !same(drafts[k], saved[k])) : []
      ),
    [drafts, saved]
  );

  // Avertit avant de quitter la page avec des modifications non enregistrées.
  useEffect(() => {
    if (dirtyKinds.size === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyKinds]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-600">
        Chargement des conventions…
      </div>
    );
  }

  if (loadError || !drafts || !saved || !defaults || !meta) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-6 text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {loadError || 'Erreur de chargement'}
        </div>
      </div>
    );
  }

  const draft = drafts[active];
  const isDirty = dirtyKinds.has(active);
  const scope = isYearlyKind(active) ? 'annuelle' : 'ponctuelle';

  const update = (mutate: (t: ConventionTemplate) => void) => {
    setNotice(null);
    setDrafts((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev[active]);
      mutate(copy);
      return { ...prev, [active]: copy };
    });
  };

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const switchTab = (kind: ConventionKind) => {
    setActive(kind);
    setOpen(new Set());
    setNotice(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/convention-templates/${active}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'enregistrement");
      setSaved((prev) => (prev ? { ...prev, [active]: data.template } : prev));
      setDrafts((prev) => (prev ? { ...prev, [active]: structuredClone(data.template) } : prev));
      setMeta((prev) => (prev ? { ...prev, [active]: data.meta } : prev));
      setNotice({
        type: 'success',
        text: 'Convention enregistrée. Elle s\'applique dès maintenant aux nouvelles signatures et aux PDF générés.',
      });
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => {
    if (!window.confirm('Abandonner les modifications non enregistrées de cette convention ?')) return;
    setDrafts((prev) => (prev ? { ...prev, [active]: structuredClone(saved[active]) } : prev));
    setNotice(null);
  };

  const handleRestoreDefault = async () => {
    if (
      !window.confirm(
        "Rétablir le texte d'origine de cette convention ? Le texte modifié sera définitivement remplacé."
      )
    )
      return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/convention-templates/${active}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la restauration');
      setSaved((prev) => (prev ? { ...prev, [active]: data.template } : prev));
      setDrafts((prev) => (prev ? { ...prev, [active]: structuredClone(data.template) } : prev));
      setMeta((prev) => (prev ? { ...prev, [active]: data.meta } : prev));
      setOpen(new Set());
      setNotice({ type: 'success', text: "Texte d'origine rétabli." });
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  /** Génère un PDF d'exemple avec le texte en cours d'édition (même non enregistré). */
  const handlePreview = async () => {
    // Ouvert tout de suite : un onglet ouvert après un await est bloqué par le navigateur.
    const tab = window.open('', '_blank');
    try {
      const settings = await fetch('/api/convention-settings')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.settings)
        .catch(() => undefined);
      const signedAt = new Date();
      let pdf;
      if (scope === 'ponctuelle') {
        const { generateReservationConventionPDF } = await import('@/lib/generateReservationConventionPDF');
        const isAssoc = active === 'association-ponctuelle';
        pdf = generateReservationConventionPDF({
          signer: {
            name: isAssoc ? 'Jeanne Exemple' : 'Jean Exemple',
            email: 'exemple@exemple.fr',
            address: '1 rue de l\'Exemple, 77590 Chartrettes',
            type: isAssoc ? 'association' : 'particulier',
          },
          association: isAssoc
            ? { name: 'Association Exemple', address: '1 rue de l\'Exemple, 77590 Chartrettes', presidentName: 'Jeanne Exemple' }
            : undefined,
          reservation: {
            roomName: 'Salle Exemple',
            date: signedAt,
            timeSlots: [{ start: '18:00', end: '21:00' }],
            reason: 'Exemple de réservation',
            estimatedParticipants: 20,
          },
          signature: '',
          signedAt,
          settings,
          templates: { [active]: draft },
        });
      } else {
        const { generateYearlyConventionPDF } = await import('@/lib/generateYearlyConventionPDF');
        pdf = generateYearlyConventionPDF({
          association: {
            name: 'Association Exemple',
            address: '1 rue de l\'Exemple, 77590 Chartrettes',
            presidentName: 'Jeanne Exemple',
            email: 'exemple@exemple.fr',
          },
          signature: '',
          signedAt,
          settings,
          schedule: {
            periodStart: '2026-09-08',
            periodEnd: '2027-06-29',
            periodLabel: 'du 8 septembre 2026 au 29 juin 2027',
            slots: [
              {
                roomName: 'Salle Exemple',
                day: 2,
                dayLabel: 'Mardi',
                hoursLabel: '18:00 - 21:00',
                firstDate: '2026-09-08',
                lastDate: '2027-06-29',
                occurrences: 36,
              },
            ],
          },
          // Le générateur annuel lit le modèle « association » : on y place le brouillon.
          templates: { 'association-annuelle': draft },
        });
      }
      const url = pdf.output('bloburl') as unknown as string;
      if (tab) tab.location.href = url;
      else window.open(url, '_blank');
    } catch (error) {
      tab?.close();
      console.error('Aperçu PDF impossible :', error);
      setNotice({ type: 'error', text: "Impossible de générer l'aperçu PDF." });
    }
  };

  const placeholders = CONVENTION_PLACEHOLDERS.filter((p) => p.scope === 'toutes' || p.scope === scope);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
      <Link
        href="/admin/conventions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux conventions
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-700 to-accent-600 flex items-center justify-center shadow-sm">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Textes des conventions</h1>
          <p className="text-sm text-slate-600">
            Ajoutez, modifiez ou supprimez des articles. Le texte enregistré est utilisé pour la
            signature en ligne et dans les PDF.
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CONVENTION_KINDS.map((kind) => (
          <button
            key={kind}
            onClick={() => switchTab(kind)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              active === kind
                ? 'bg-primary-700 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {CONVENTION_KIND_LABELS[kind]}
            {dirtyKinds.has(kind) && (
              <span className="h-2 w-2 rounded-full bg-amber-400" title="Modifications non enregistrées" />
            )}
          </button>
        ))}
      </div>

      {/* État de la convention */}
      <div className="card p-4 mb-4 text-sm space-y-2">
        <p className="text-slate-700">
          {meta[active].isDefault ? (
            <>Texte d&apos;origine (jamais modifié).</>
          ) : (
            <>
              Texte modifié
              {meta[active].updatedAt &&
                ` le ${format(new Date(meta[active].updatedAt!), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`}
              .
            </>
          )}
        </p>
        {active === 'particulier-annuelle' && (
          <p className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            Les particuliers ne peuvent pas encore réserver à l&apos;année : ce texte est prêt mais
            n&apos;est utilisé nulle part pour l&apos;instant.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Une modification ne change pas les conventions déjà envoyées par e-mail. En revanche, un PDF
          re-téléchargé depuis le site est régénéré avec le texte en vigueur.
        </p>
      </div>

      {/* Variables */}
      <details className="card p-4 mb-6 text-sm">
        <summary className="font-semibold text-slate-800 cursor-pointer">
          Variables utilisables dans le texte
        </summary>
        <p className="text-slate-600 mt-2 mb-3">
          Écrivez la variable entre accolades : elle est remplacée automatiquement. Si une variable
          n&apos;est pas connue pour un document, le paragraphe ou la puce qui la contient n&apos;est
          pas affiché.
        </p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {placeholders.map((p) => (
            <li key={p.key} className="flex flex-col rounded-lg border border-slate-200 p-2">
              <code className="text-primary-700 font-semibold">{`{${p.key}}`}</code>
              <span className="text-slate-700">{p.description}</span>
              <span className="text-xs text-slate-500">Ex. : {p.example}</span>
            </li>
          ))}
        </ul>
      </details>

      {notice && (
        <div
          className={`mb-4 p-3 rounded-lg border text-sm flex items-start gap-2 ${
            notice.type === 'success'
              ? 'bg-accent-50 border-accent-200 text-accent-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          {notice.text}
        </div>
      )}

      {/* En-tête du document */}
      <div className="card p-5 mb-6 space-y-4">
        <Field label="Titre de la convention">
          <AutoTextarea value={draft.title} onChange={(v) => update((t) => void (t.title = v))} />
        </Field>
        <Field label="Préambule (facultatif)" hint="Paragraphes affichés sous le titre, avant les parties.">
          <TextList
            items={draft.preamble}
            addLabel="Ajouter un paragraphe"
            onChange={(items) => update((t) => void (t.preamble = items))}
          />
        </Field>
        <Field label="Objet de la convention">
          <AutoTextarea value={draft.object} onChange={(v) => update((t) => void (t.object = v))} />
        </Field>
      </div>

      {/* Titres et articles */}
      {draft.sections.map((section, si) => (
        <div key={si} className="card mb-6 overflow-hidden">
          <div className="bg-primary-50 border-b border-primary-100 p-4 flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={section.title}
              onChange={(e) => update((t) => void (t.sections[si].title = e.target.value))}
              className="input font-bold flex-1"
              placeholder="Titre de la section (ex. TITRE 1 – …)"
            />
            <RowActions
              onUp={si > 0 ? () => update((t) => void (t.sections = move(t.sections, si, -1))) : undefined}
              onDown={
                si < draft.sections.length - 1
                  ? () => update((t) => void (t.sections = move(t.sections, si, 1)))
                  : undefined
              }
              onDelete={() => {
                if (
                  window.confirm(
                    `Supprimer « ${section.title} » et ses ${section.articles.length} article(s) ?`
                  )
                ) {
                  update((t) => void t.sections.splice(si, 1));
                  setOpen(new Set());
                }
              }}
            />
          </div>

          <div className="divide-y divide-slate-200">
            {section.articles.map((article, ai) => {
              const key = `${si}.${ai}`;
              const isOpen = open.has(key);
              return (
                <div key={ai}>
                  <div className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="flex-1 flex items-center gap-2 text-left py-1 min-w-0"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 truncate">
                        {article.title || 'Article sans titre'}
                      </span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {article.paragraphs.length} § · {article.bullets.length} puce(s)
                      </span>
                    </button>
                    <RowActions
                      onUp={
                        ai > 0
                          ? () => {
                              update((t) => void (t.sections[si].articles = move(t.sections[si].articles, ai, -1)));
                              setOpen(new Set());
                            }
                          : undefined
                      }
                      onDown={
                        ai < section.articles.length - 1
                          ? () => {
                              update((t) => void (t.sections[si].articles = move(t.sections[si].articles, ai, 1)));
                              setOpen(new Set());
                            }
                          : undefined
                      }
                      onDelete={() => {
                        if (window.confirm(`Supprimer « ${article.title} » ?`)) {
                          update((t) => void t.sections[si].articles.splice(ai, 1));
                          setOpen(new Set());
                        }
                      }}
                    />
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-5 pt-2 space-y-4 bg-slate-50/60">
                      <Field label="Titre de l'article">
                        <input
                          value={article.title}
                          onChange={(e) =>
                            update((t) => void (t.sections[si].articles[ai].title = e.target.value))
                          }
                          className="input"
                        />
                      </Field>
                      <Field label="Paragraphes">
                        <TextList
                          items={article.paragraphs}
                          addLabel="Ajouter un paragraphe"
                          onChange={(items) =>
                            update((t) => void (t.sections[si].articles[ai].paragraphs = items))
                          }
                        />
                      </Field>
                      <Field
                        label="Liste à puces (facultative)"
                        hint="Affichée après les paragraphes, précédée de sa phrase d'introduction."
                      >
                        <input
                          value={article.bulletsIntro}
                          onChange={(e) =>
                            update((t) => void (t.sections[si].articles[ai].bulletsIntro = e.target.value))
                          }
                          className="input mb-2"
                          placeholder="Phrase d'introduction (ex. L'occupant s'engage à :)"
                        />
                        <TextList
                          items={article.bullets}
                          addLabel="Ajouter une puce"
                          rows={2}
                          onChange={(items) =>
                            update((t) => void (t.sections[si].articles[ai].bullets = items))
                          }
                        />
                      </Field>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                update((t) => void t.sections[si].articles.push(emptyArticle()));
                setOpen((prev) => new Set(prev).add(`${si}.${section.articles.length}`));
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              <Plus className="h-4 w-4" />
              Ajouter un article
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          update((t) =>
            void t.sections.push({ title: `TITRE ${t.sections.length + 1} – NOUVEAU TITRE`, articles: [emptyArticle()] })
          )
        }
        className="w-full mb-6 border-2 border-dashed border-slate-300 hover:border-primary-400 rounded-xl p-3 text-sm font-semibold text-slate-600 hover:text-primary-700 inline-flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter une section (TITRE)
      </button>

      <div className="card p-5 mb-6">
        <Field label="Encadré « Important » (fin de convention)" hint="Laissez vide pour ne pas l'afficher.">
          <AutoTextarea
            value={draft.importantNotice}
            onChange={(v) => update((t) => void (t.importantNotice = v))}
          />
        </Field>
      </div>

      {/* Barre d'actions */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-2">
          <span className={`text-sm mr-auto ${isDirty ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
            {isDirty ? 'Modifications non enregistrées' : 'Aucune modification'}
          </span>
          <Button variant="outline" onClick={handlePreview} className="text-sm">
            <Eye className="h-4 w-4 mr-1.5" />
            Aperçu PDF
          </Button>
          {!meta[active].isDefault && (
            <Button variant="ghost" onClick={handleRestoreDefault} disabled={saving} className="text-sm">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Texte d&apos;origine
            </Button>
          )}
          {isDirty && (
            <Button variant="secondary" onClick={handleUndo} disabled={saving} className="text-sm">
              <Undo2 className="h-4 w-4 mr-1.5" />
              Annuler
            </Button>
          )}
          <Button onClick={handleSave} isLoading={saving} disabled={saving || !isDirty} className="text-sm">
            <Save className="h-4 w-4 mr-1.5" />
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function AutoTextarea({
  value,
  onChange,
  rows,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  // Hauteur proportionnelle à la longueur du texte, pour lire un paragraphe en entier.
  const autoRows = rows ?? Math.min(12, Math.max(2, Math.ceil(value.length / 95)));
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={autoRows}
      className="input text-sm leading-relaxed"
    />
  );
}

function RowActions({
  onUp,
  onDown,
  onDelete,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onDelete: () => void;
}) {
  const btn = 'p-1.5 rounded-md text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      <button type="button" onClick={onUp} disabled={!onUp} className={btn} title="Monter" aria-label="Monter">
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDown} disabled={!onDown} className={btn} title="Descendre" aria-label="Descendre">
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700"
        title="Supprimer"
        aria-label="Supprimer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function TextList({
  items,
  onChange,
  addLabel,
  rows,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1">
            <AutoTextarea
              value={item}
              rows={rows && item.length < 190 ? rows : undefined}
              onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))}
            />
          </div>
          <RowActions
            onUp={i > 0 ? () => onChange(move(items, i, -1)) : undefined}
            onDown={i < items.length - 1 ? () => onChange(move(items, i, 1)) : undefined}
            onDelete={() => onChange(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  );
}
