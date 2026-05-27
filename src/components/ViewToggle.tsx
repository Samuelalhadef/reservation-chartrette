'use client';

import { LayoutList, Calendar } from 'lucide-react';

type ViewMode = 'list' | 'calendar';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-primary-700/60 bg-white dark:bg-primary-800/40 p-1">
      <button
        onClick={() => onViewChange('list')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${currentView === 'list'
            ? 'bg-primary-700 text-white shadow-sm'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-primary-900/40'
          }
        `}
      >
        <LayoutList className="w-4 h-4" />
        <span>Liste</span>
      </button>

      <button
        onClick={() => onViewChange('calendar')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${currentView === 'calendar'
            ? 'bg-primary-700 text-white shadow-sm'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-primary-900/40'
          }
        `}
      >
        <Calendar className="w-4 h-4" />
        <span>Calendrier</span>
      </button>
    </div>
  );
}
