import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { associations } from '@/lib/db/schema';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ['active', 'inactive', 'pending'] as const;

/** Champs texte optionnels : chaîne vide → null. */
const OPTIONAL_FIELDS = [
  'address',
  'socialPurpose',
  'presidentAddress',
  'contactName',
  'contactPhone',
] as const;

type ParsedAssociation =
  | { ok: true; values: Record<string, any> }
  | { ok: false; error: string; status: number };

/**
 * Valide les champs d'une association envoyés par l'administration.
 * `creating` impose le nom et la description ; en modification, seuls les
 * champs présents dans le corps sont pris en compte.
 */
export async function parseAssociationInput(
  body: any,
  { creating, excludeId }: { creating: boolean; excludeId?: string }
): Promise<ParsedAssociation> {
  const values: Record<string, any> = {};

  if (typeof body.name === 'string' || creating) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      return { ok: false, status: 400, error: "Le nom de l'association doit contenir au moins 2 caractères" };
    }
    const [duplicate] = await db
      .select({ id: associations.id })
      .from(associations)
      .where(
        excludeId
          ? and(sql`lower(${associations.name}) = lower(${name})`, ne(associations.id, excludeId))
          : sql`lower(${associations.name}) = lower(${name})`
      )
      .limit(1);
    if (duplicate) {
      return { ok: false, status: 409, error: 'Une autre association porte déjà ce nom' };
    }
    values.name = name;
  }

  if (typeof body.description === 'string' || creating) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) {
      return { ok: false, status: 400, error: 'La description est obligatoire' };
    }
    values.description = description;
  }

  for (const field of OPTIONAL_FIELDS) {
    if (typeof body[field] === 'string') {
      values[field] = body[field].trim() || null;
    }
  }

  if (typeof body.contactEmail === 'string') {
    const email = body.contactEmail.trim();
    if (email && !EMAIL_REGEX.test(email)) {
      return { ok: false, status: 400, error: 'Adresse email de contact invalide' };
    }
    values.contactEmail = email || null;
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return { ok: false, status: 400, error: 'Statut invalide' };
    }
    values.status = body.status;
  } else if (creating) {
    // Créée par la mairie : utilisable immédiatement
    values.status = 'active';
  }

  return { ok: true, values };
}

/** Vérifie qu'une association existe. */
export async function associationExists(id: string) {
  const [row] = await db
    .select({ id: associations.id })
    .from(associations)
    .where(eq(associations.id, id))
    .limit(1);
  return !!row;
}
