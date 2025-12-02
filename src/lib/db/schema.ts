import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password'),
  image: text('image'),
  role: text('role', { enum: ['user', 'admin', 'particulier'] }).notNull().default('user'),
  associationId: text('association_id').references(() => associations.id),
  address: text('address'), // Adresse complète de l'utilisateur particulier
  isChartrettesResident: integer('is_chartrettes_resident', { mode: 'boolean' }).default(false), // Indique si l'utilisateur habite à Chartrettes
  emailVerified: integer('email_verified', { mode: 'timestamp' }),
  verificationCode: text('verification_code'),
  verificationCodeExpiry: integer('verification_code_expiry', { mode: 'timestamp' }),
  resetToken: text('reset_token'),
  resetTokenExpiry: integer('reset_token_expiry', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Associations table
export const associations = sqliteTable('associations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  address: text('address'), // Siège social de l'association
  socialPurpose: text('social_purpose'), // Objet social de l'association
  presidentAddress: text('president_address'), // Adresse personnelle du président
  status: text('status', { enum: ['active', 'inactive', 'pending'] }).notNull().default('pending'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  conventionSignedAt: integer('convention_signed_at', { mode: 'timestamp' }),
  conventionSignature: text('convention_signature'),
  yearlyConventionSignedAt: integer('yearly_convention_signed_at', { mode: 'timestamp' }),
  yearlyConventionSignature: text('yearly_convention_signature'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Buildings table
export const buildings = sqliteTable('buildings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description'),
  address: text('address'),
  image: text('image'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Rooms table
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  buildingId: text('building_id').notNull().references(() => buildings.id),
  name: text('name').notNull(),
  description: text('description'),
  capacity: integer('capacity').notNull(),
  surface: real('surface'),
  equipment: text('equipment', { mode: 'json' }).$type<Array<{ name: string; available: boolean }>>().notNull().default(sql`'[]'`),
  images: text('images', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  rules: text('rules'),
  defaultTimeSlots: text('default_time_slots', { mode: 'json' }).$type<{ start: string; end: string }>().notNull().default(sql`'{"start":"08:00","end":"22:00"}'`),
  blockedDates: text('blocked_dates', { mode: 'json' }).$type<Array<{ startDate: string; endDate: string; reason: string }>>().notNull().default(sql`'[]'`),
  // Tarification par type d'utilisateur et durée
  pricingFullDay: text('pricing_full_day', { mode: 'json' }).$type<{ chartrettois: number; association: number; exterieur: number }>().default(sql`'{"chartrettois":0,"association":0,"exterieur":0}'`),
  pricingHalfDay: text('pricing_half_day', { mode: 'json' }).$type<{ chartrettois: number; association: number; exterieur: number }>().default(sql`'{"chartrettois":0,"association":0,"exterieur":0}'`),
  pricingHourly: text('pricing_hourly', { mode: 'json' }).$type<{ chartrettois: number; association: number; exterieur: number }>().default(sql`'{"chartrettois":0,"association":0,"exterieur":0}'`),
  deposit: real('deposit').default(0), // Caution
  isPaid: integer('is_paid', { mode: 'boolean' }).default(false), // Si la salle est payante
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Reservations table
export const reservations = sqliteTable('reservations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  roomId: text('room_id').notNull().references(() => rooms.id),
  associationId: text('association_id').notNull().references(() => associations.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  timeSlots: text('time_slots', { mode: 'json' }).$type<Array<{ start: string; end: string }>>().notNull(),
  reason: text('reason').notNull(),
  estimatedParticipants: integer('estimated_participants').notNull(),
  requiredEquipment: text('required_equipment', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'cancelled', 'awaiting_payment'] }).notNull().default('pending'),
  adminComment: text('admin_comment'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  cancelReason: text('cancel_reason'),
  // Champs de paiement
  totalPrice: real('total_price').default(0), // Montant total à payer
  depositAmount: real('deposit_amount').default(0), // Montant de la caution
  durationType: text('duration_type', { enum: ['hourly', 'half_day', 'full_day'] }), // Type de durée pour le calcul du tarif
  paymentStatus: text('payment_status', { enum: ['pending', 'check_deposited', 'paid', 'refunded'] }).default('pending'),
  paymentMethod: text('payment_method'), // Ex: 'cheque', 'cash', etc.
  paymentReference: text('payment_reference'), // Numéro de chèque ou autre référence
  paymentValidatedBy: text('payment_validated_by').references(() => users.id),
  paymentValidatedAt: integer('payment_validated_at', { mode: 'timestamp' }),
  paymentNotes: text('payment_notes'), // Notes sur le paiement
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Type exports for use in the application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Association = typeof associations.$inferSelect;
export type NewAssociation = typeof associations.$inferInsert;

export type Building = typeof buildings.$inferSelect;
export type NewBuilding = typeof buildings.$inferInsert;

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
