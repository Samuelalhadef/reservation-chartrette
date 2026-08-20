'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  Clock,
  Gavel,
  LayoutList,
  Repeat,
  Users,
  XCircle,
} from 'lucide-react';
import Button from '@/components/Button';
import RecurringConflictsPanel, {
  type RecurringConflict,
  type RecurringParty,
} from '@/components/RecurringConflictsPanel';

/** Une demande concurrente sur un créneau disputé. */
export interface ConflictClaim {
  id: string;
  hours: string;
  status: string;
  reason: string;
  estimatedParticipants: number;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  associationName: string;
  seriesKey: string;
}

/** Un créneau disputé : une salle, un jour, et les demandes qui se chevauchent. */
export interface ConflictGroup {
  key: string;
  roomId: string;
  roomName: string;
  date: string;
  dateLabel: string;
  hours: string;
  claims: ConflictClaim[];
  pendingCount: number;
}

interface ConflictsPanelProps {
  conflicts: ConflictGroup[];
  /** Les mêmes conflits, regroupés par demandes opposées. */
  recurring: RecurringConflict[];
  loading: boolean;
  processingId: string | null;
  /** Nombre de réservations de la série annuelle dont fait partie la demande (0 si ponctuelle). */
  getSeriesCount: (reservationId: string) => number;
  onApprove: (reservationId: string) => void;
  onReject: (reservationId: string) => void;
  /** Valider une demande et refuser toutes les autres du même créneau. */
  onArbitrate: (group: ConflictGroup, winnerId: string) => void;
  /** Trancher un conflit récurrent d'un bloc, sur toutes ses dates. */
  onArbitrateSeries: (conflict: RecurringConflict, winner: RecurringParty) => void;
}

export default function ConflictsPanel({
  conflicts,
  recurring,
  loading,
  processingId,
  getSeriesCount,
  onApprove,
  onReject,
  onArbitrate,
  onArbitrateSeries,
}: ConflictsPanelProps) {
  // Vue par défaut : les conflits regroupés. Une série hebdomadaire à l'année
  // remplit sinon la page de quarante fois la même question.
  const [view, setView] = useState<'recurring' | 'dates'>('recurring');
  if (loading) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-300">
        Recherche des créneaux disputés...
      </div>
    );
  }

  const emptyState = (
    <div className="p-8 text-center">
      <CheckCircle className="h-10 w-10 mx-auto mb-3 text-accent-600" />
      <p className="text-slate-600 dark:text-slate-300">
        Aucun créneau disputé : aucune date à venir n&apos;est demandée par plusieurs personnes.
      </p>
    </div>
  );

  const repeatingCount = recurring.filter(c => c.dateCount > 1).length;
  const tabClass = (active: boolean) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
      active
        ? 'bg-primary-700 text-white'
        : 'bg-slate-100 dark:bg-primary-700/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-primary-700/60'
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <button onClick={() => setView('recurring')} className={tabClass(view === 'recurring')}>
          <Repeat className="h-4 w-4" />
          Conflits regroupés ({recurring.length})
        </button>
        <button onClick={() => setView('dates')} className={tabClass(view === 'dates')}>
          <LayoutList className="h-4 w-4" />
          Date par date ({conflicts.length})
        </button>
        {view === 'dates' && repeatingCount > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {repeatingCount} conflit{repeatingCount > 1 ? 's' : ''} se répète
            {repeatingCount > 1 ? 'nt' : ''} à l&apos;identique — la vue regroupée évite de trancher
            plusieurs fois la même question.
          </span>
        )}
      </div>

      {view === 'recurring' ? (
        <RecurringConflictsPanel
          recurring={recurring}
          processingId={processingId}
          onArbitrateSeries={onArbitrateSeries}
        />
      ) : conflicts.length === 0 ? (
        emptyState
      ) : (
        <div className="space-y-4 p-4">
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900 dark:text-amber-100">
          Ces dates sont demandées par plusieurs personnes sur la même salle et aux mêmes heures.
          Validez la demande retenue : les autres devront être refusées pour libérer le créneau.
        </p>
      </div>

      {conflicts.map(group => (
        <div
          key={group.key}
          className="border-2 border-amber-300 dark:border-amber-700 rounded-lg overflow-hidden"
        >
          <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-200 dark:border-amber-700">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-bold text-slate-900 dark:text-white capitalize">
                {group.dateLabel}
              </span>
              <span className="text-slate-500 dark:text-slate-400">•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {group.roomName}
              </span>
              <span className="text-slate-500 dark:text-slate-400">•</span>
              <span className="text-slate-700 dark:text-slate-200">{group.hours}</span>
              <span className="ml-auto px-3 py-1 rounded-full bg-amber-600 text-white text-xs font-semibold">
                {group.claims.length} demandes concurrentes
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-primary-700/60">
            {group.claims.map((claim, index) => {
              const seriesCount = getSeriesCount(claim.id);
              const isPending = claim.status === 'pending';

              return (
                <div
                  key={claim.id}
                  className="p-4 bg-white dark:bg-primary-800/40 flex flex-col lg:flex-row lg:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {claim.userName}
                      </span>
                      {claim.associationName && (
                        <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-700/60 text-primary-800 dark:text-primary-100 text-xs font-medium">
                          {claim.associationName}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                            : 'bg-accent-100 text-accent-800 dark:bg-accent-900/20 dark:text-accent-400'
                        }`}
                      >
                        {isPending ? 'En attente' : 'Déjà validée'}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-primary-700/40 text-slate-600 dark:text-slate-300 text-xs font-medium">
                          Première demande
                        </span>
                      )}
                      {seriesCount > 1 && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-primary-700/40 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1">
                          <Repeat className="h-3 w-3" />
                          Série de {seriesCount} dates
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {claim.hours}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {claim.estimatedParticipants} pers.
                      </span>
                      <span>Déposée le {new Date(claim.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-words">
                      {claim.reason}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{claim.userEmail}</p>
                  </div>

                  {isPending && (
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-64 flex-shrink-0">
                      <Button
                        variant="success"
                        onClick={() => onArbitrate(group, claim.id)}
                        disabled={processingId !== null}
                        className="text-xs py-2 w-full"
                      >
                        <Gavel className="h-3 w-3 mr-1" />
                        Retenir et refuser les autres
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => onApprove(claim.id)}
                          disabled={processingId !== null}
                          className="text-xs py-2 flex-1"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Valider
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => onReject(claim.id)}
                          disabled={processingId !== null}
                          className="text-xs py-2 flex-1"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
        </div>
      )}
    </div>
  );
}
