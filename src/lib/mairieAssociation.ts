/**
 * L'association "Mairie de Chartrettes" représente la collectivité elle-même.
 * Une réservation à ce nom n'est pas une mise à disposition : la mairie ne signe
 * pas de convention avec elle-même. Toute autre association (ou un particulier)
 * suit le chemin habituel : lecture + signature de la convention.
 */
export const MAIRIE_ASSOCIATION_NAME = 'Mairie de Chartrettes';

export function isMairieAssociationName(name?: string | null): boolean {
  return (name || '').trim().toLowerCase() === MAIRIE_ASSOCIATION_NAME.toLowerCase();
}
