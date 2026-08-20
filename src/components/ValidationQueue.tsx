'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Inbox,
  Repeat,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import Button from '@/components/Button';

/** Une date d'une demande (une ligne de la table réservations). */
interface PendingRequestDate {
  id: string;
  date: string;
  dateLabel: string;
  hours: string;
  inConflict: boolean;
  isPast: boolean;
}

/** Une demande = ce que l'occupant a soumis en une fois. */
export interface PendingRequest {
  key: string;
  kind: 'single' | 'series';
  ids: string[];
  count: number;
  conflictIds: string[];
  conflictCount: number;
  pastCount: number;
  isFullyPast: boolean;
  userId: string;
  userName: string;
  userEmail: string;
  associationName: string;
  roomId: string;
  roomName: string;
  reason: string;
  estimatedParticipants: number;
  submittedAt: string;
  firstDate: string;
  lastDate: string;
  periodLabel: string;
  weeklyPattern: string[];
  totalPrice: number;
  dates: PendingRequestDate[];
}

export interface PendingTotals {
  requests: number;
  reservations: number;
  clean: number;
  withConflicts: number;
  past: number;
}

type Filter = 'clean' | 'conflicts' | 'past' | 'all';

/** Demandes envoyées par paquet : compromis entre progression fine et allers-retours. */
const CHUNK_SIZE = 5;

const FILTER_LABELS: Record<Filter, string> = {
  clean: 'Prêtes à valider',
  conflicts: 'À arbitrer',
  past: 'Dates passées',
  all: 'Toutes',
};

export default function ValidationQueue({
  onProcessed,
  onTotals,
}: {
  /** Prévient la page parente pour rafraîchir les autres onglets. */
  onProcessed?: () => void;
  /** Remonte les compteurs pour l'onglet « À valider ». */
  onTotals?: (totals: PendingTotals) => void;
}) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [totals, setTotals] = useState<PendingTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('clean');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<string | null>(null);

  // Confirmation avant une décision : c'est ici qu'on saisit le motif d'un refus.
  const [pendingDecision, setPendingDecision] = useState<{
    action: 'approved' | 'rejected';
    targets: { key: string; ids: string[] }[];
    title: string;
    detail: string;
    comment: string;
  } | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/pending-requests');
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests || []);
      setTotals(data.totals || null);
      if (data.totals) onTotals?.(data.totals);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cleanRequests = useMemo(
    () => requests.filter(r => r.conflictCount === 0 && !r.isFullyPast),
    [requests]
  );

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests.filter(request => {
      if (filter === 'clean' && (request.conflictCount > 0 || request.isFullyPast)) return false;
      if (filter === 'conflicts' && request.conflictCount === 0) return false;
      if (filter === 'past' && !request.isFullyPast) return false;

      if (!term) return true;
      return [request.associationName, request.userName, request.roomName, request.reason]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [requests, filter, search]);

  const selectedRequests = useMemo(
    () => visibleRequests.filter(r => selected.has(r.key)),
    [visibleRequests, selected]
  );

  const toggleSelected = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpanded = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Applique la décision par paquets, en tenant l'admin informé de l'avancement. */
  const runDecision = async (
    targets: { key: string; ids: string[] }[],
    action: 'approved' | 'rejected',
    comment: string
  ) => {
    setPendingDecision(null);
    setReport(null);
    setProgress({ done: 0, total: targets.length });

    let processedRequests = 0;
    let processedReservations = 0;
    const failures: string[] = [];

    for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
      const chunk = targets.slice(i, i + CHUNK_SIZE);

      try {
        const res = await fetch('/api/admin/pending-requests/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, adminComment: comment || undefined, requests: chunk }),
        });

        const data = await res.json();

        if (!res.ok) {
          failures.push(data.error || 'Erreur serveur');
        } else {
          processedRequests += data.processedRequests || 0;
          processedReservations += data.processedReservations || 0;
          for (const failure of data.failed || []) {
            failures.push(failure.error || 'Erreur inconnue');
          }
        }
      } catch (error) {
        console.error('Erreur lors du traitement du lot:', error);
        failures.push('Le serveur n’a pas répondu');
      }

      setProgress({ done: Math.min(i + CHUNK_SIZE, targets.length), total: targets.length });
    }

    const verb = action === 'approved' ? 'validée(s)' : 'refusée(s)';
    setReport(
      `${processedRequests} demande(s) ${verb} — ${processedReservations} créneau(x)` +
        (failures.length > 0 ? ` · ${failures.length} échec(s) : ${failures[0]}` : '')
    );

    setSelected(new Set());
    setProgress(null);
    await load();
    onProcessed?.();
  };

  const askDecision = (
    action: 'approved' | 'rejected',
    targets: { key: string; ids: string[] }[],
    title: string,
    detail: string
  ) => {
    if (targets.length === 0) return;
    setPendingDecision({ action, targets, title, detail, comment: '' });
  };

  const slotsOf = (targets: { ids: string[] }[]) =>
    targets.reduce((sum, t) => sum + t.ids.length, 0);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-300">
        Chargement des demandes…
      </div>
    );
  }

  if (!totals || totals.requests === 0) {
    return (
      <div className="p-12 text-center">
        <CheckCircle2 className="w-12 h-12 mx-auto text-accent-600 mb-3" />
        <p className="text-lg font-semibold text-primary-800 dark:text-white">
          Aucune demande en attente
        </p>
        <p className="text-slate-600 dark:text-slate-300 mt-1">
          Tout est traité. Les nouvelles demandes apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Résumé : ce qui compte, c'est le nombre de DEMANDES, pas de lignes. */}
      <div className="rounded-xl border border-slate-200 dark:border-primary-700/60 bg-slate-50 dark:bg-primary-900/30 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary-800 dark:text-white">
                {totals.requests}
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                demande{totals.requests > 1 ? 's' : ''} à traiter
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              soit {totals.reservations} créneau{totals.reservations > 1 ? 'x' : ''} — une
              réservation à l&apos;année ne compte que pour une seule décision.
            </p>
          </div>

          {cleanRequests.length > 0 && (
            <Button
              variant="success"
              size="lg"
              disabled={!!progress}
              onClick={() =>
                askDecision(
                  'approved',
                  cleanRequests.map(r => ({ key: r.key, ids: r.ids })),
                  `Valider ${cleanRequests.length} demandes`,
                  `${slotsOf(cleanRequests.map(r => ({ ids: r.ids })))} créneaux seront approuvés. ` +
                    `Chaque occupant recevra un seul email récapitulatif. Les demandes en conflit ` +
                    `et celles entièrement passées ne sont pas concernées.`
                )
              }
            >
              <CheckCircle2 className="w-5 h-5" />
              Tout valider ({cleanRequests.length} sans conflit)
            </Button>
          )}
        </div>

        {report && (
          <div className="mt-4 rounded-lg bg-white dark:bg-primary-800/50 border border-slate-200 dark:border-primary-700/60 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
            {report}
          </div>
        )}

        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300 mb-1">
              <span>Traitement en cours…</span>
              <span>
                {progress.done} / {progress.total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-primary-700 overflow-hidden">
              <div
                className="h-full bg-accent-600 transition-all"
                style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['clean', 'conflicts', 'past', 'all'] as const).map(value => {
            const count =
              value === 'clean'
                ? totals.clean
                : value === 'conflicts'
                  ? totals.withConflicts
                  : value === 'past'
                    ? totals.past
                    : totals.requests;

            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === value
                    ? 'bg-primary-700 text-white'
                    : value === 'conflicts' && totals.withConflicts > 0
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 hover:bg-amber-200'
                      : 'bg-slate-100 dark:bg-primary-700/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-primary-700/60'
                }`}
              >
                {FILTER_LABELS[value]} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Association, salle, motif…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-primary-700/60 bg-white dark:bg-primary-800/40 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Barre d'actions sur la sélection */}
      {selectedRequests.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 px-4 py-3 shadow-md">
          <span className="text-sm font-medium text-primary-800 dark:text-white">
            {selectedRequests.length} demande{selectedRequests.length > 1 ? 's' : ''} sélectionnée
            {selectedRequests.length > 1 ? 's' : ''} ({slotsOf(selectedRequests)} créneaux)
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="success"
              size="sm"
              disabled={!!progress}
              onClick={() =>
                askDecision(
                  'approved',
                  selectedRequests.map(r => ({ key: r.key, ids: r.ids })),
                  `Valider ${selectedRequests.length} demande(s)`,
                  `${slotsOf(selectedRequests)} créneaux seront approuvés.`
                )
              }
            >
              <CheckCircle2 className="w-4 h-4" />
              Valider
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!!progress}
              onClick={() =>
                askDecision(
                  'rejected',
                  selectedRequests.map(r => ({ key: r.key, ids: r.ids })),
                  `Refuser ${selectedRequests.length} demande(s)`,
                  `${slotsOf(selectedRequests)} créneaux seront refusés et supprimés.`
                )
              }
            >
              <XCircle className="w-4 h-4" />
              Refuser
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {visibleRequests.length > 1 && (
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 px-1">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={visibleRequests.every(r => selected.has(r.key))}
            onChange={e =>
              setSelected(
                e.target.checked ? new Set(visibleRequests.map(r => r.key)) : new Set()
              )
            }
          />
          Tout sélectionner ({visibleRequests.length} affichée
          {visibleRequests.length > 1 ? 's' : ''})
        </label>
      )}

      {/* Liste des demandes */}
      {visibleRequests.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <Inbox className="w-8 h-8 mx-auto mb-2" />
          Aucune demande dans ce filtre.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRequests.map(request => {
            const isExpanded = expanded.has(request.key);
            const freeIds = request.ids.filter(id => !request.conflictIds.includes(id));

            return (
              <div
                key={request.key}
                className={`rounded-xl border bg-white dark:bg-primary-800/40 shadow-sm transition-colors ${
                  request.conflictCount > 0
                    ? 'border-amber-300 dark:border-amber-700/60'
                    : request.isFullyPast
                      ? 'border-slate-200 dark:border-primary-700/60 opacity-75'
                      : 'border-slate-200 dark:border-primary-700/60'
                }`}
              >
                <div className="p-4 flex flex-col lg:flex-row lg:items-start gap-4">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-slate-300"
                    checked={selected.has(request.key)}
                    onChange={() => toggleSelected(request.key)}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-primary-800 dark:text-white">
                        {request.associationName || request.userName}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700 dark:text-slate-200">
                        {request.roomName}
                      </span>

                      {request.kind === 'series' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-700/50 text-primary-800 dark:text-primary-100">
                          <Repeat className="w-3 h-3" />
                          {request.count} dates
                        </span>
                      )}

                      {request.conflictCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          {request.conflictCount} date{request.conflictCount > 1 ? 's' : ''}{' '}
                          disputée{request.conflictCount > 1 ? 's' : ''}
                        </span>
                      )}

                      {request.isFullyPast && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-primary-700/50 text-slate-600 dark:text-slate-300">
                          <History className="w-3 h-3" />
                          dates passées
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {request.reason}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 capitalize">
                        <Calendar className="w-4 h-4" />
                        {request.periodLabel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {request.weeklyPattern.join(' · ')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {request.estimatedParticipants} pers.
                      </span>
                    </div>

                    <button
                      onClick={() => toggleExpanded(request.key)}
                      className="mt-2 inline-flex items-center gap-1 text-sm text-primary-700 dark:text-primary-200 hover:underline"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {isExpanded ? 'Masquer' : 'Voir'} le détail des {request.count} date
                      {request.count > 1 ? 's' : ''}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col lg:w-52">
                    <Button
                      variant="success"
                      size="sm"
                      disabled={!!progress}
                      onClick={() =>
                        askDecision(
                          'approved',
                          [{ key: request.key, ids: request.ids }],
                          'Valider la demande',
                          `${request.count} créneau(x) pour ${
                            request.associationName || request.userName
                          } seront approuvés.`
                        )
                      }
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Valider {request.count > 1 ? 'toute la série' : ''}
                    </Button>

                    {request.conflictCount > 0 && freeIds.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!progress}
                        onClick={() =>
                          askDecision(
                            'approved',
                            [{ key: request.key, ids: freeIds }],
                            'Valider les dates libres',
                            `${freeIds.length} date(s) sans conflit seront approuvées. Les ` +
                              `${request.conflictCount} date(s) disputée(s) restent en attente ` +
                              `d'arbitrage.`
                          )
                        }
                      >
                        Valider les {freeIds.length} dates libres
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      size="sm"
                      disabled={!!progress}
                      onClick={() =>
                        askDecision(
                          'rejected',
                          [{ key: request.key, ids: request.ids }],
                          'Refuser la demande',
                          `${request.count} créneau(x) seront refusés et supprimés.`
                        )
                      }
                    >
                      <XCircle className="w-4 h-4" />
                      Refuser
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-primary-700/60 px-4 py-3 max-h-72 overflow-y-auto">
                    <ul className="space-y-1 text-sm">
                      {request.dates.map(date => (
                        <li
                          key={date.id}
                          className={`flex flex-wrap items-center gap-2 ${
                            date.isPast ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span className="capitalize">{date.dateLabel}</span>
                          <span className="text-slate-400">·</span>
                          <span>{date.hours}</span>
                          {date.inConflict && (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              créneau disputé
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation de la décision */}
      {pendingDecision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-primary-800 dark:text-white">
              {pendingDecision.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {pendingDecision.detail}
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {pendingDecision.action === 'rejected'
                  ? 'Motif du refus (obligatoire, envoyé à l’occupant)'
                  : 'Message facultatif joint à l’email'}
              </label>
              <textarea
                value={pendingDecision.comment}
                onChange={e =>
                  setPendingDecision({ ...pendingDecision, comment: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-primary-700/60 bg-white dark:bg-primary-900/40 text-sm text-slate-800 dark:text-slate-100"
                placeholder={
                  pendingDecision.action === 'rejected'
                    ? 'Ex. : salle déjà attribuée à une autre association sur ce créneau'
                    : 'Ex. : pensez à récupérer les clés en mairie'
                }
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingDecision(null)}>
                Annuler
              </Button>
              <Button
                variant={pendingDecision.action === 'approved' ? 'success' : 'danger'}
                disabled={
                  pendingDecision.action === 'rejected' && !pendingDecision.comment.trim()
                }
                onClick={() =>
                  runDecision(
                    pendingDecision.targets,
                    pendingDecision.action,
                    pendingDecision.comment.trim()
                  )
                }
              >
                {pendingDecision.action === 'approved' ? 'Confirmer la validation' : 'Confirmer le refus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
