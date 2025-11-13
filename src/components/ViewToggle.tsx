'use client';

import { LayoutList, Calendar } from 'lucide-react';

type ViewMode = 'list' | 'calendar';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
      <button
        onClick={() => onViewChange('list')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${currentView === 'list'
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
      >
        <Calendar className="w-4 h-4" />
        <span>Calendrier</span>
      </button>
    </div>
  );
}
