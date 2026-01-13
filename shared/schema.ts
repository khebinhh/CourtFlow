import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").$type<"admin" | "staff" | "member" | "guest" | "coach">().notNull().default("guest"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courts = pgTable("courts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  courtType: text("court_type").$type<"tennis" | "pickleball">().notNull().default("tennis"),
  surfaceType: text("surface_type").$type<"hard" | "clay" | "grass">().notNull(),
  status: text("status").$type<"active" | "maintenance" | "inactive">().notNull().default("active"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  peakHourlyRate: decimal("peak_hourly_rate", { precision: 10, scale: 2 }).notNull(),
  openTime: text("open_time").notNull().default("06:00"),
  closeTime: text("close_time").notNull().default("23:00"),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  courtId: varchar("court_id").references(() => courts.id).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  type: text("type").$type<"regular" | "lesson" | "tournament" | "class" | "event" | "maintenance">().notNull().default("regular"),
  status: text("status").$type<"pending" | "confirmed" | "cancelled" | "completed">().notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  description: text("description"),
  recurringDays: text("recurring_days").array(),
  recurringEndDate: text("recurring_end_date"),
  participants: text("participants").array(), // Array of player names for reservations (up to 4)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").$type<"credit_card" | "apple_pay" | "google_pay" | "paypal">().notNull(),
  status: text("status").$type<"pending" | "completed" | "failed" | "refunded">().notNull().default("pending"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCourtSchema = createInsertSchema(courts).omit({
  id: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Court = typeof courts.$inferSelect;
export type InsertCourt = z.infer<typeof insertCourtSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// Extended types for API responses
export type BookingWithDetails = Booking & {
  user: User;
  court: Court;
};

export type CourtWithBookings = Court & {
  bookings: Booking[];
};
