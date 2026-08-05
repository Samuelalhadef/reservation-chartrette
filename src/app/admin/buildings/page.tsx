'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  DoorOpen,
  Save,
  X,
  Eye,
  EyeOff,
  Users as UsersIcon,
  Info,
} from 'lucide-react';
import Button from '@/components/Button';

interface Building {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  image: string | null;
  isActive: boolean;
}

interface Room {
  id: string;
  buildingId: string;
  name: string;
  capacity: number;
  surface: number | null;
  isActive: boolean;
  isPaid: boolean;
}

const emptyBuilding = { name: '', description: '', address: '', image: '', isActive: true };
const emptyRoom = {
  name: '',
  capacity: '',
  surface: '',
  description: '',
  isPaid: false,
  deposit: '',
  isActive: true,
};

const fieldClass =
  'w-full px-4 py-2 border-2 border-slate-200 dark:border-primary-700/60 rounded-lg focus:border-accent-500 focus:ring-2 focus:ring-accent-200 dark:bg-primary-950 dark:text-white transition-colors';

export default function AdminBuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ ...emptyBuilding });
  const [savingBuilding, setSavingBuilding] = useState(false);

  const [addingRoomFor, setAddingRoomFor] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({ ...emptyRoom });
  const [savingRoom, setSavingRoom] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchAll = async () => {
    try {
      const [bRes, rRes] = await Promise.all([
        fetch('/api/buildings?activeOnly=false'),
        fetch('/api/rooms?activeOnly=false'),
      ]);
      const bData = await bRes.json();
      const rData = await rRes.json();
      setBuildings(Array.isArray(bData) ? bData : []);
      setRooms(rData.rooms || []);
    } catch (error) {
      console.error('Erreur de chargement:', error);
      notify('error', 'Impossible de charger les établissements.');
    } finally {
      setLoading(false);
    }
  };

  const createBuilding = async () => {
    if (!buildingForm.name.trim()) {
      notify('error', "Le nom de l'établissement est obligatoire.");
      return;
    }
    setSavingBuilding(true);
    try {
      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildingForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création');
      notify('success', `Établissement « ${data.building.name} » créé.`);
      setBuildingForm({ ...emptyBuilding });
      setShowBuildingForm(false);
      await fetchAll();
    } catch (error: any) {
      notify('error', error.message || 'Erreur lors de la création');
    } finally {
      setSavingBuilding(false);
    }
  };

  const toggleBuilding = async (building: Building) => {
    setTogglingId(building.id);
    try {
      const res = await fetch('/api/buildings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: building.id, isActive: !building.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      notify('success', `Établissement ${!building.isActive ? 'activé' : 'désactivé'}.`);
      await fetchAll();
    } catch (error: any) {
      notify('error', error.message || 'Erreur');
    } finally {
      setTogglingId(null);
    }
  };

  const openRoomForm = (buildingId: string) => {
    setRoomForm({ ...emptyRoom });
    setAddingRoomFor(buildingId);
  };

  const createRoom = async (buildingId: string) => {
    if (!roomForm.name.trim() || !roomForm.capacity) {
      notify('error', 'Le nom et la capacité de la salle sont obligatoires.');
      return;
    }
    setSavingRoom(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...roomForm, buildingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création');
      notify('success', `Salle « ${data.room.name} » ajoutée.`);
      setAddingRoomFor(null);
      setRoomForm({ ...emptyRoom });
      await fetchAll();
    } catch (error: any) {
      notify('error', error.message || 'Erreur lors de la création');
    } finally {
      setSavingRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const roomsByBuilding = rooms.reduce((acc, room) => {
    (acc[room.buildingId] = acc[room.buildingId] || []).push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-800 dark:text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-accent-600" />
            Établissements &amp; salles
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Créez de nouveaux bâtiments et ajoutez-y des salles réservables.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setShowBuildingForm((v) => !v);
            setBuildingForm({ ...emptyBuilding });
          }}
        >
          {showBuildingForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showBuildingForm ? 'Annuler' : 'Nouveau bâtiment'}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm font-medium border-2 ${
            message.type === 'success'
              ? 'bg-accent-50 border-accent-200 text-accent-800 dark:bg-accent-500/10 dark:text-accent-200'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Formulaire nouveau bâtiment */}
      {showBuildingForm && (
        <div className="mb-8 bg-white dark:bg-primary-800/40 rounded-xl shadow-card border-2 border-primary-200 dark:border-primary-700/60 p-6">
          <h2 className="text-xl font-bold text-primary-800 dark:text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-accent-600" />
            Nouveau bâtiment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nom de l'établissement <span className="text-red-500">*</span>
              </label>
              <input
                className={fieldClass}
                placeholder="Ex : Complexe sportif"
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Adresse
              </label>
              <input
                className={fieldClass}
                placeholder="Ex : 12 rue des Sports, Chartrettes"
                value={buildingForm.address}
                onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                className={fieldClass}
                rows={2}
                placeholder="Brève description de l'établissement…"
                value={buildingForm.description}
                onChange={(e) => setBuildingForm({ ...buildingForm, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Image (URL) — optionnel
              </label>
              <input
                className={fieldClass}
                placeholder="/image/mon-batiment.png ou https://…"
                value={buildingForm.image}
                onChange={(e) => setBuildingForm({ ...buildingForm, image: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={buildingForm.isActive}
                onChange={(e) => setBuildingForm({ ...buildingForm, isActive: e.target.checked })}
                className="w-5 h-5 text-accent-600 rounded focus:ring-2 focus:ring-accent-500"
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Visible par les usagers (actif)
              </span>
            </label>
            <Button variant="success" onClick={createBuilding} isLoading={savingBuilding}>
              <Save className="h-4 w-4 mr-2" />
              Créer le bâtiment
            </Button>
          </div>
        </div>
      )}

      {/* Liste des bâtiments */}
      <div className="space-y-6">
        {buildings.map((building) => {
          const bRooms = roomsByBuilding[building.id] || [];
          return (
            <div
              key={building.id}
              className={`bg-white dark:bg-primary-800/40 rounded-xl shadow-card overflow-hidden border-2 ${
                building.isActive
                  ? 'border-slate-200 dark:border-primary-700/60'
                  : 'border-slate-300 opacity-70 dark:border-primary-700/40'
              }`}
            >
              {/* En-tête du bâtiment */}
              <div className="bg-gradient-to-r from-primary-700 to-primary-800 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white truncate">{building.name}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        building.isActive
                          ? 'bg-accent-500 text-white'
                          : 'bg-slate-400 text-white'
                      }`}
                    >
                      {building.isActive ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>
                  {building.description && (
                    <p className="text-sm text-white/70 mt-0.5 truncate">{building.description}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleBuilding(building)}
                  isLoading={togglingId === building.id}
                  className="flex-shrink-0"
                >
                  {building.isActive ? (
                    <><EyeOff className="h-4 w-4 mr-1.5" /> Désactiver</>
                  ) : (
                    <><Eye className="h-4 w-4 mr-1.5" /> Activer</>
                  )}
                </Button>
              </div>

              <div className="p-5">
                {/* Salles */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-slate-500" />
                    Salles ({bRooms.length})
                  </h4>
                  <Button variant="outline" size="sm" onClick={() => openRoomForm(building.id)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Ajouter une salle
                  </Button>
                </div>

                {bRooms.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Aucune salle pour l'instant.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {bRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-primary-700/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-white truncate">
                            {room.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <UsersIcon className="w-3 h-3" /> {room.capacity} pers.
                            {room.surface ? ` · ${room.surface} m²` : ''}
                            {room.isPaid ? ' · payante' : ' · gratuite'}
                          </p>
                        </div>
                        {!room.isActive && (
                          <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 dark:bg-primary-700/60 dark:text-slate-300">
                            inactive
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulaire nouvelle salle */}
                {addingRoomFor === building.id && (
                  <div className="mt-5 rounded-lg border-2 border-accent-200 dark:border-accent-500/40 bg-accent-50/50 dark:bg-accent-500/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-primary-800 dark:text-white">
                        Nouvelle salle dans « {building.name} »
                      </h5>
                      <button
                        onClick={() => setAddingRoomFor(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label="Fermer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Nom de la salle <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={fieldClass}
                          placeholder="Ex : Grande salle"
                          value={roomForm.name}
                          onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Capacité <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            className={fieldClass}
                            placeholder="Ex : 50"
                            value={roomForm.capacity}
                            onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Surface (m²)
                          </label>
                          <input
                            type="number"
                            min="0"
                            className={fieldClass}
                            placeholder="Ex : 80"
                            value={roomForm.surface}
                            onChange={(e) => setRoomForm({ ...roomForm, surface: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Description / règlement (optionnel)
                        </label>
                        <textarea
                          className={fieldClass}
                          rows={2}
                          placeholder="Équipements, consignes particulières…"
                          value={roomForm.description}
                          onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roomForm.isPaid}
                          onChange={(e) => setRoomForm({ ...roomForm, isPaid: e.target.checked })}
                          className="w-5 h-5 text-accent-600 rounded focus:ring-2 focus:ring-accent-500"
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200">Salle payante</span>
                      </label>
                      {roomForm.isPaid && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600 dark:text-slate-300">Caution (€)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={`${fieldClass} w-28`}
                            placeholder="0"
                            value={roomForm.deposit}
                            onChange={(e) => setRoomForm({ ...roomForm, deposit: e.target.value })}
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roomForm.isActive}
                          onChange={(e) => setRoomForm({ ...roomForm, isActive: e.target.checked })}
                          className="w-5 h-5 text-accent-600 rounded focus:ring-2 focus:ring-accent-500"
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200">Active</span>
                      </label>
                    </div>

                    <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Les tarifs détaillés (par profil et durée) se règlent ensuite dans l'onglet
                        <b> Tarifs</b>. Ici, seuls la caution et le caractère payant sont définis.
                      </span>
                    </div>

                    <div className="mt-4">
                      <Button
                        variant="success"
                        onClick={() => createRoom(building.id)}
                        isLoading={savingRoom}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Ajouter la salle
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {buildings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">
            Aucun établissement. Cliquez sur « Nouveau bâtiment » pour commencer.
          </p>
        </div>
      )}
    </div>
  );
}
