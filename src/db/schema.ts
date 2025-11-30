import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const subcontractors = sqliteTable('subcontractors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  serviceAreas: text('service_areas', { mode: 'json' }).$type<string[]>().notNull(),
  maxDailyJobs: integer('max_daily_jobs').notNull(),
  rating: real('rating').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  locationLat: real('location_lat').notNull(),
  locationLng: real('location_lng').notNull(),
  serviceType: text('service_type').notNull(),
  inventoryItems: text('inventory_items', { mode: 'json' }).$type<Array<{name: string, quantity: number, inStock: boolean}>>().notNull(),
  inventoryStatus: text('inventory_status').notNull().default('pending'),
  priority: text('priority').notNull().default('medium'),
  estimatedDuration: integer('estimated_duration').notNull(),
  specialInstructions: text('special_instructions'),
  status: text('status').notNull().default('unassigned'),
  createdAt: text('created_at').notNull(),
  dueDate: text('due_date').notNull(),
});

export const timeSlots = sqliteTable('time_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  subcontractorId: integer('subcontractor_id').references(() => subcontractors.id),
  slotDate: text('slot_date').notNull(),
  slotStartTime: text('slot_start_time').notNull(),
  slotEndTime: text('slot_end_time').notNull(),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  claimedAt: text('claimed_at'),
  status: text('status').notNull().default('available'),
});

export const jobCompletions = sqliteTable('job_completions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  subcontractorId: integer('subcontractor_id').notNull().references(() => subcontractors.id),
  timeSlotId: integer('time_slot_id').notNull().references(() => timeSlots.id),
  completionPhotos: text('completion_photos', { mode: 'json' }).$type<string[]>().notNull(),
  signatureData: text('signature_data').notNull(),
  gpsLat: real('gps_lat').notNull(),
  gpsLng: real('gps_lng').notNull(),
  gpsTimestamp: text('gps_timestamp').notNull(),
  completionNotes: text('completion_notes'),
  completedAt: text('completed_at').notNull(),
  customerSatisfaction: integer('customer_satisfaction'),
});

export const analyticsEvents = sqliteTable('analytics_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventType: text('event_type').notNull(),
  orderId: integer('order_id'),
  subcontractorId: integer('subcontractor_id'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>().notNull(),
  createdAt: text('created_at').notNull(),
});


// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});