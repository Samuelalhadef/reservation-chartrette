'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Gavel,
  Repeat,
} from 'lucide-react';
import Button from '@/components/Button';

/** Une série (soumission) engagée dans un conflit récurrent. */
export interface RecurringParty {
  seriesKey: string;
  userId: string;
  userName: string;
  userEmail: string;
  associationName: string;
  reason: string;
  hours: string;
  ids: string[];
  conflictCount: number;
  seriesCount: number;
  pendingCount: number;
  approvedCount: number;
  submittedAt: string;
}

/** Les mêmes demandes qui se disputent la même salle, semaine après semaine. */
export interface RecurringConflict {
  key: string;
  roomId: string;
  roomName: string;
  weeklyPattern: string[];
  dateCount: number;
  periodLabel: string;
  firstDate: string;
  lastDate: string;
  parties: RecurringParty[];
  pendingCount: number;
  dates: { date: string; dateLabel: string; hours: string }[];
}

interface RecurringConflictsPanelProps {
  recurring: RecurringConflict[];
  processingId: string | null;
  /** Retenir une série et refuser les séries concurrentes, sur toutes les dates. */
  onArbitrateSeries: (conflict: RecurringConflict, winner: RecurringParty) => void;
}

export default function RecurringConflictsPanel({
  recurring,
  processingId,
  onArbitrateSeries,
}: RecurringConflictsPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (recurring.length === 0) {
    return (
      <div className="p-8 text-center">
        <CheckCircle className="h-10 w-10 mx-auto mb-3 text-accent-600" />
        <p className="text-slate-600 dark:text-slate-300">
          Aucun créneau disputé : aucune date à venir n&apos;est demandée par plusieurs personnes.
        </p>
      </div>
    );
  }

  const repeating = recurring.filter(c => c.dateCount > 1);
  const totalDates = recurring.reduce((sum, c) => sum + c.dateCount, 0);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 dark:text-amber-100">
          <p>
            Les créneaux disputés sont regroupés par demandes opposées : un cours hebdomadaire à
            l&apos;année ne compte ici que pour <strong>un seul arbitrage</strong>, et non une
            quarantaine.
          </p>
          {repeating.length > 0 && (
            <p className="mt-1">
              {repeating.length} conflit{repeating.length > 1 ? 's' : ''} récurrent
              {repeating.length > 1 ? 's' : ''} sur {recurring.length} — {totalDates} dates
              concernées au total.
            </p>
          )}
        </div>
      </div>

      {recurring.map(conflict => {
        const isOpen = expanded.has(conflict.key);

        return (
          <div
            key={conflict.key}
            className="border-2 border-amber-300 dark:border-amber-700 rounded-lg overflow-hidden"
          >
            <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-200 dark:border-amber-700">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold text-slate-900 dark:text-white">
                  {conflict.roomName}
                </span>
                {conflict.weeklyPattern.map(pattern => (
                  <span
                    key={pattern}
                    className="px-2 py-0.5 rounded-full bg-white dark:bg-primary-800/60 border border-amber-300 dark:border-amber-700 text-slate-700 dark:text-slate-200 text-xs font-medium capitalize"
                  >
                    {pattern}
                  </span>
                ))}
                <span
                  className={`ml-auto px-3 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1 ${
                    conflict.dateCount > 1 ? 'bg-amber-600' : 'bg-slate-500'
                  }`}
                >
                  {conflict.dateCount > 1 && <Repeat className="h-3 w-3" />}
                  {conflict.dateCount} date{conflict.dateCount > 1 ? 's' : ''} disputée
                  {conflict.dateCount > 1 ? 's' : ''}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {conflict.periodLabel} • {conflict.parties.length} demandes concurrentes
              </p>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-primary-700/60">
              {conflict.parties.map((party, index) => {
                const isPending = party.pendingCount > 0;
                // La série peut déborder du conflit : des dates non disputées
                // restent traitées normalement.
                const outsideConflict = party.seriesCount - party.conflictCount;

                return (
                  <div
                    key={party.seriesKey}
                    className="p-4 bg-white dark:bg-primary-800/40 flex flex-col lg:flex-row lg:items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {party.userName}
                        </span>
                        {party.associationName && (
                          <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-700/60 text-primary-800 dark:text-primary-100 text-xs font-medium">
                            {party.associationName}
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
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {party.hours}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          {party.conflictCount} date{party.conflictCount > 1 ? 's' : ''} en conflit
                          {outsideConflict > 0 && ` (série de ${party.seriesCount})`}
                        </span>
                        <span>
                          Déposée le {new Date(party.submittedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-words">
                        {party.reason}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{party.userEmail}</p>

                      {outsideConflict > 0 && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {outsideConflict} autre{outsideConflict > 1 ? 's' : ''} date
                          {outsideConflict > 1 ? 's' : ''} de cette série ne sont pas disputées et ne
                          sont pas concernées par l&apos;arbitrage.
                        </p>
                      )}
                    </div>

                    {isPending && (
                      <div className="lg:w-72 flex-shrink-0">
                        <Button
                          variant="success"
                          onClick={() => onArbitrateSeries(conflict, party)}
                          disabled={processingId !== null}
                          className="text-xs py-2 w-full"
                        >
                          <Gavel className="h-3 w-3 mr-1" />
                          Retenir sur les {conflict.dateCount} date
                          {conflict.dateCount > 1 ? 's' : ''}
                        </Button>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center">
                          Les autres demandes seront refusées sur ces dates.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => toggle(conflict.key)}
              className="w-full px-4 py-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-primary-800/60 hover:bg-slate-100 dark:hover:bg-primary-700/60 transition-colors border-t border-slate-200 dark:border-primary-700/60"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {isOpen ? 'Masquer' : 'Voir'} le détail des {conflict.dateCount} date
              {conflict.dateCount > 1 ? 's' : ''}
            </button>

            {isOpen && (
              <ul className="px-4 py-3 bg-slate-50 dark:bg-primary-800/60 border-t border-slate-200 dark:border-primary-700/60 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {conflict.dates.map(date => (
                  <li
                    key={date.date}
                    className="text-sm text-slate-600 dark:text-slate-300 capitalize"
                  >
                    {date.dateLabel}
                    <span className="text-slate-400 dark:text-slate-500 normal-case">
                      {' '}
                      — {date.hours}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
