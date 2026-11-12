/**
 * Photos des salles.
 *
 * Le champ `rooms.images` en base reste prioritaire (pour un futur envoi de
 * photos depuis l'administration). À défaut, on s'appuie sur les photos
 * livrées avec l'appli dans /public/image/salles, associées par nom de salle.
 */

export type RoomPhoto = { src: string; alt: string };

const DIR = '/image/salles';

/** Photos numérotées de l'Espace culturel : `${slug}-1.webp`, `${slug}-2.webp`… */
const ec = (slug: string, room: string, count: number): RoomPhoto[] =>
  Array.from({ length: count }, (_, i) => ({
    src: `${DIR}/espace-culturel/${slug}-${i + 1}.webp`,
    alt: `${room} : photo ${i + 1}`,
  }));

// Clé = nom de la salle normalisé (minuscules, sans accents ni ponctuation).
const DEFAULT_PHOTOS: Record<string, RoomPhoto[]> = {
  dojo: [
    { src: `${DIR}/complexe-sportif/dojo-1.webp`, alt: 'Dojo : vue d’ensemble du tatami' },
    { src: `${DIR}/complexe-sportif/dojo-2.webp`, alt: 'Dojo : tatami et vestiaires' },
  ],
  'grande salle gymnase': [
    { src: `${DIR}/complexe-sportif/gymnase-1.webp`, alt: 'Gymnase : vue depuis la tribune' },
    { src: `${DIR}/complexe-sportif/gymnase-2.webp`, alt: 'Gymnase : terrain et baies vitrées' },
    { src: `${DIR}/complexe-sportif/gymnase-3.webp`, alt: 'Gymnase : vue d’ensemble du terrain' },
    { src: `${DIR}/complexe-sportif/gymnase-interieur.webp`, alt: 'Gymnase : terrain de basket' },
    { src: `${DIR}/complexe-sportif/gymnase-fresque.webp`, alt: 'Gymnase : fresque des JO Paris 2024' },
  ],
  'salle des vergers': [
    { src: `${DIR}/vergers/salle-1.webp`, alt: 'Salle des Vergers : vue d’ensemble' },
    { src: `${DIR}/vergers/salle-2.webp`, alt: 'Salle des Vergers : comptoir et fenêtres' },
    { src: `${DIR}/vergers/salle-3.webp`, alt: 'Salle des Vergers : entrée et accès extérieur' },
  ],

  // Espace culturel Renée Wanner
  'salle edouard tan': ec('edouard-tan', 'Salle Edouard Tan', 5),
  'salle frederic chopin': ec('chopin', 'Salle Frédéric Chopin', 4),
  'salle igor stravinsky': ec('stravinsky', 'Salle Igor Stravinsky', 4),
  'salle jean baptiste pergolese': ec('pergolese', 'Salle Jean-Baptiste Pergolèse', 2),
  'salle marius petipa': ec('petipa', 'Salle Marius Petipa', 4),
  'salle martha graham': ec('martha-graham', 'Salle Martha Graham', 4),
  'salle maurice martenot': ec('martenot', 'Salle Maurice Martenot', 3),
  'salle rosa bonheur': ec('rosa-bonheur', 'Salle Rosa Bonheur', 1),
  'salle tino petruzzi': ec('tino-petruzzi', 'Salle Tino Petruzzi', 3),
  cuisine: ec('cuisine', 'Cuisine', 2),
  'hall verriere': ec('hall-verriere', 'Hall verrière', 3),
  'espace culturel tout': [
    ...ec('tino-petruzzi', 'Salle Tino Petruzzi', 1),
    ...ec('hall', 'Hall', 1),
    ...ec('martha-graham', 'Salle Martha Graham', 1),
    ...ec('hall-verriere', 'Hall verrière', 1),
    ...ec('petipa', 'Salle Marius Petipa', 1),
  ],
};

/** Photo de bandeau d'un bâtiment, choisie d'après son nom. */
export function getBuildingImage(buildingName: string): string {
  const name = buildingName.toUpperCase();
  if (name.includes('COMPLEXE SPORTIF')) return '/image/batiments/complexe-sportif.webp';
  if (name.includes('ESPACE CULTUREL') || name.includes('RENÉE WANNER')) {
    return '/image/batiments/espace-culturel.webp';
  }
  if (name.includes('VERGERS')) return '/image/batiments/espace-vergers.webp';
  return '/image/batiments/mairie.webp'; // Mairie, et image par défaut
}

function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getRoomPhotos(room: { name: string; images?: string[] | null }): RoomPhoto[] {
  if (room.images && room.images.length > 0) {
    return room.images.map((src, i) => ({ src, alt: `${room.name} : photo ${i + 1}` }));
  }
  return DEFAULT_PHOTOS[normalize(room.name)] ?? [];
}
