'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, ChevronRight, Clock, Building2, Users, BarChart3, FileSpreadsheet } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface RoomStat {
  roomId: string;
  roomName: string;
  hours: number;
  reservations: number;
}

interface AssociationStat {
  associationId: string;
  associationName: string;
  hours: number;
  reservations: number;
}

interface RoomDetail {
  year: number;
  roomId: string;
  associations: AssociationStat[];
  totalHours: number;
}

export default function RoomStatsPage() {
  const [rooms, setRooms] = useState<RoomStat[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    fetchRoomStats();
  }, [year]);

  const fetchRoomStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/room-stats?year=${year}`);
      const data = await res.json();

      if (res.ok) {
        setRooms(data.rooms || []);
        setTotalHours(data.totalHours || 0);
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching room stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomDetail = async (roomId: string, roomName: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/admin/room-stats?roomId=${roomId}&year=${year}`);
      const data = await res.json();

      if (res.ok) {
        setSelectedRoom({ ...data, roomName });
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching room detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const res = await fetch('/api/admin/room-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      });

      if (!res.ok) {
        console.error('Error exporting to Excel');
        return;
      }

      // Récupérer le blob
      const blob = await res.blob();

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statistiques_salles_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const exportToCSV = () => {
    if (selectedRoom) {
      // Export du détail d'une salle
      const roomName = rooms.find(r => r.roomId === selectedRoom.roomId)?.roomName || 'Salle';
      const csvContent = [
        ['Association', 'Heures', 'Réservations'].join(','),
        ...selectedRoom.associations.map(a =>
          [a.associationName, a.hours, a.reservations].join(',')
        ),
        [],
        ['Total', selectedRoom.totalHours, selectedRoom.associations.reduce((sum, a) => sum + a.reservations, 0)].join(',')
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `stats_${roomName.replace(/\s+/g, '_')}_${year}.csv`;
      link.click();
    } else {
      // Export de toutes les salles
      const csvContent = [
        ['Salle', 'Heures', 'Réservations'].join(','),
        ...rooms.map(r =>
          [r.roomName, r.hours, r.reservations].join(',')
        ),
        [],
        ['Total', totalHours, rooms.reduce((sum, r) => sum + r.reservations, 0)].join(',')
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `stats_salles_${year}.csv`;
      link.click();
    }
  };

  // Préparer les données pour le graphique en barres (toutes les salles)
  const generateColors = (count: number) => {
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(14, 165, 233, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(168, 85, 247, 0.8)',
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  const barChartData = {
    labels: rooms.slice(0, 10).map(r => r.roomName),
    datasets: [
      {
        label: 'Heures réservées',
        data: rooms.slice(0, 10).map(r => r.hours),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Top 10 des salles par heures réservées',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value + 'h';
          },
        },
      },
    },
  };

  // Préparer les données pour le graphique en camembert (détail d'une salle)
  const pieChartData = selectedRoom ? {
    labels: selectedRoom.associations.map(a => a.associationName),
    datasets: [
      {
        label: 'Heures',
        data: selectedRoom.associations.map(a => a.hours),
        backgroundColor: generateColors(selectedRoom.associations.length),
        borderColor: 'rgba(255, 255, 255, 1)',
        borderWidth: 2,
      },
    ],
  } : null;

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          padding: 10,
        },
      },
      title: {
        display: true,
        text: 'Répartition des heures par association',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value}h (${percentage}%)`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour au dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {selectedRoom ? `Détail : ${rooms.find(r => r.roomId === selectedRoom.roomId)?.roomName}` : 'Statistiques des Salles'}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {selectedRoom ? 'Répartition par association' : 'Nombre d\'heures réservées par salle'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Sélecteur d'année */}
            <select
              value={year}
              onChange={(e) => {
                setYear(parseInt(e.target.value));
                setSelectedRoom(null);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            {/* Boutons Export */}
            {selectedRoom ? (
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </button>
            ) : (
              <button
                onClick={exportToExcel}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exporter Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total des heures</p>
            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {selectedRoom ? selectedRoom.totalHours : totalHours}h
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedRoom ? 'Associations' : 'Salles'}
            </p>
            {selectedRoom ? (
              <Users className="h-8 w-8 text-green-600 dark:text-green-400 opacity-50" />
            ) : (
              <Building2 className="h-8 w-8 text-green-600 dark:text-green-400 opacity-50" />
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {selectedRoom ? selectedRoom.associations.length : rooms.length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Année</p>
            <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400 opacity-50" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {year}
          </p>
        </div>
      </div>

      {/* Graphiques */}
      {selectedRoom ? (
        // Graphique en camembert pour le détail
        pieChartData && selectedRoom.associations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Visualisation des données
              </h2>
            </div>
            <div className="h-96">
              <Pie data={pieChartData} options={pieChartOptions} />
            </div>
          </div>
        )
      ) : (
        // Graphique en barres pour toutes les salles
        rooms.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Visualisation des données
              </h2>
            </div>
            <div className="h-96">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>
        )
      )}

      {/* Tableau principal ou détail */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {selectedRoom ? 'Répartition par association' : 'Toutes les salles'}
            </h2>
            {selectedRoom && (
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                ← Retour à la liste
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {selectedRoom ? 'Association' : 'Salle'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Heures
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Réservations
                </th>
                {!selectedRoom && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {selectedRoom ? (
                detailLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : selectedRoom.associations.length > 0 ? (
                  selectedRoom.associations.map((assoc) => (
                    <tr key={assoc.associationId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {assoc.associationName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {assoc.hours}h
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {assoc.reservations}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Aucune réservation pour cette salle
                    </td>
                  </tr>
                )
              ) : rooms.length > 0 ? (
                rooms.map((room) => (
                  <tr key={room.roomId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {room.roomName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {room.hours}h
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {room.reservations}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => fetchRoomDetail(room.roomId, room.roomName)}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Voir détails
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Aucune donnée disponible pour {year}
                  </td>
                </tr>
              )}
            </tbody>
            {/* Footer avec totaux */}
            {(selectedRoom ? selectedRoom.associations.length > 0 : rooms.length > 0) && (
              <tfoot className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {selectedRoom
                        ? selectedRoom.totalHours
                        : totalHours}h
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                    {selectedRoom
                      ? selectedRoom.associations.reduce((sum, a) => sum + a.reservations, 0)
                      : rooms.reduce((sum, r) => sum + r.reservations, 0)}
                  </td>
                  {!selectedRoom && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
