import { Room, User } from './db/schema';

export type UserType = 'chartrettois' | 'association' | 'exterieur';
export type DurationType = 'hourly' | 'half_day' | 'full_day';

export interface PricingResult {
  totalPrice: number;
  depositAmount: number;
  durationType: DurationType;
  hourCount: number;
  userType: UserType;
}

/**
 * Détermine le type d'utilisateur pour la tarification
 */
export function getUserType(user: User): UserType {
  if (user.isChartrettesResident) {
    return 'chartrettois';
  }
  if (user.role === 'user' && user.associationId) {
    return 'association';
  }
  return 'exterieur';
}

/**
 * Détermine le type de durée en fonction du nombre d'heures
 */
export function getDurationType(hourCount: number): DurationType {
  if (hourCount >= 8) {
    return 'full_day';
  } else if (hourCount >= 4) {
    return 'half_day';
  }
  return 'hourly';
}

/**
 * Calcule le nombre d'heures à partir des créneaux horaires
 */
export function calculateHourCount(timeSlots: { start: string; end: string }[]): number {
  if (!timeSlots || timeSlots.length === 0) return 0;

  // Chaque créneau représente 1 heure
  return timeSlots.length;
}

/**
 * Calcule le prix total d'une réservation
 */
export function calculateReservationPrice(
  room: Room,
  user: User,
  timeSlots: { start: string; end: string }[]
): PricingResult {
  const hourCount = calculateHourCount(timeSlots);
  const durationType = getDurationType(hourCount);
  const userType = getUserType(user);

  let totalPrice = 0;
  let depositAmount = room.deposit || 0;

  // Si la salle n'est pas payante, le prix reste à 0
  if (!room.isPaid) {
    return {
      totalPrice: 0,
      depositAmount,
      durationType,
      hourCount,
      userType,
    };
  }

  // Récupérer le bon tarif selon le type de durée
  let pricing: { chartrettois: number; association: number; exterieur: number } | undefined;

  switch (durationType) {
    case 'full_day':
      pricing = room.pricingFullDay as any;
      break;
    case 'half_day':
      pricing = room.pricingHalfDay as any;
      break;
    case 'hourly':
      pricing = room.pricingHourly as any;
      break;
  }

  if (!pricing) {
    pricing = { chartrettois: 0, association: 0, exterieur: 0 };
  }

  // Calculer le prix selon le type d'utilisateur
  if (durationType === 'hourly') {
    // Pour le tarif horaire, multiplier par le nombre d'heures
    totalPrice = pricing[userType] * hourCount;
  } else {
    // Pour demi-journée et journée complète, utiliser le tarif fixe
    totalPrice = pricing[userType];
  }

  return {
    totalPrice,
    depositAmount,
    durationType,
    hourCount,
    userType,
  };
}

/**
 * Formate le prix en euros
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

/**
 * Obtient le label du type de durée
 */
export function getDurationTypeLabel(durationType: DurationType): string {
  switch (durationType) {
    case 'full_day':
      return 'Journée complète';
    case 'half_day':
      return 'Demi-journée';
    case 'hourly':
      return 'Tarif horaire';
    default:
      return '';
  }
}

/**
 * Obtient le label du type d'utilisateur
 */
export function getUserTypeLabel(userType: UserType): string {
  switch (userType) {
    case 'chartrettois':
      return 'Habitant de Chartrettes';
    case 'association':
      return 'Association';
    case 'exterieur':
      return 'Extérieur';
    default:
      return '';
  }
}
