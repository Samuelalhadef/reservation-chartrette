'use client';

import { useEffect, useState } from 'react';
import { Users, Mail, Shield, CheckCircle, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: Date | null;
  associationId: string | null;
  address: string | null;
  isChartrettesResident: boolean;
  createdAt: Date;
  association: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();

      if (data.error) {
        console.error('API Error:', data.error);
        alert(data.error);
      } else {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ?\n\nCette action est irréversible.`)) {
      return;
    }

    setDeletingUserId(userId);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      alert('Utilisateur supprimé avec succès');
      fetchUsers(); // Recharger la liste
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
            <Shield className="w-3 h-3" />
            Administrateur
          </span>
        );
      case 'particulier':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
            Particulier
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
            Utilisateur
          </span>
        );
    }
  };

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.association?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.address || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    const matchesLocation =
      locationFilter === 'all' ||
      (locationFilter === 'chartrettes' && user.isChartrettesResident) ||
      (locationFilter === 'other' && !user.isChartrettesResident);

    return matchesSearch && matchesRole && matchesLocation;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-800 dark:text-gray-200">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Users className="w-8 h-8" />
          Gestion des utilisateurs
        </h1>
        <p className="mt-2 text-gray-800 dark:text-gray-200">
          Gérer les comptes utilisateurs du système
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-800 dark:text-gray-200">Total utilisateurs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-800 dark:text-gray-200">Administrateurs</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-800 dark:text-gray-200">Avec association</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {users.filter(u => u.associationId).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-800 dark:text-gray-200">Chartrettes</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {users.filter(u => u.isChartrettesResident).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-800 dark:text-gray-200">Email vérifié</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {users.filter(u => u.emailVerified).length}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rechercher
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom, email, adresse ou association..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrer par rôle
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateurs</option>
              <option value="user">Utilisateurs</option>
              <option value="particulier">Particuliers</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrer par localisation
            </label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Toutes les localisations</option>
              <option value="chartrettes">Résidents de Chartrettes</option>
              <option value="other">Autres</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Association / Adresse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Localisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email vérifié
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Créé le
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4">
                      {user.association ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.association.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.association.status === 'active' ? 'Active' :
                             user.association.status === 'pending' ? 'En attente' : 'Inactive'}
                          </div>
                        </div>
                      ) : user.address ? (
                        <div className="text-sm text-gray-800 dark:text-gray-200 max-w-xs">
                          {user.address}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role === 'particulier' && user.isChartrettesResident ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                          Chartrettes
                        </span>
                      ) : user.role === 'particulier' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          Autre
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.emailVerified ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={deletingUserId === user.id || user.role === 'admin'}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-semibold"
                        title={user.role === 'admin' ? 'Les administrateurs ne peuvent pas être supprimés' : 'Supprimer cet utilisateur'}
                      >
                        {deletingUserId === user.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Suppression...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note d'avertissement */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
              Avertissement
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
              <li>• La suppression d'un utilisateur est <strong>irréversible</strong></li>
              <li>• Les utilisateurs avec des réservations actives ne peuvent pas être supprimés</li>
              <li>• Les comptes administrateurs sont protégés contre la suppression</li>
              <li>• Vous ne pouvez pas supprimer votre propre compte</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
