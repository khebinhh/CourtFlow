import { type User, type InsertUser, type Court, type InsertCourt, type Booking, type InsertBooking, type Payment, type InsertPayment, type BookingWithDetails } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Court methods
  getCourt(id: string): Promise<Court | undefined>;
  getAllCourts(): Promise<Court[]>;
  createCourt(court: InsertCourt): Promise<Court>;
  updateCourt(id: string, updates: Partial<Court>): Promise<Court | undefined>;
  deleteCourt(id: string): Promise<boolean>;

  // Booking methods
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingWithDetails(id: string): Promise<BookingWithDetails | undefined>;
  getAllBookings(): Promise<BookingWithDetails[]>;
  getBookingsByUser(userId: string): Promise<BookingWithDetails[]>;
  getBookingsByDate(date: string): Promise<BookingWithDetails[]>;
  getBookingsByCourtAndDate(courtId: string, date: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;

  // Payment methods
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByBooking(bookingId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined>;

  // Analytics methods
  getBookingStats(): Promise<{
    todayBookings: number;
    todayRevenue: number;
    activeCourts: number;
    totalCourts: number;
    onlineMembers: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private courts: Map<string, Court>;
  private bookings: Map<string, Booking>;
  private payments: Map<string, Payment>;

  constructor() {
    this.users = new Map();
    this.courts = new Map();
    this.bookings = new Map();
    this.payments = new Map();
    this.initializeData();
  }

  private initializeData() {
    // Create admin user
    const adminId = randomUUID();
    const admin: User = {
      id: adminId,
      username: "admin",
      email: "admin@itennispickle.com",
      password: "admin123", // In production, this would be hashed
      firstName: "John",
      lastName: "Smith",
      role: "admin",
      phone: "+1234567890",
      createdAt: new Date(),
    };
    this.users.set(adminId, admin);

    // Create sample courts
    const court1Id = randomUUID();
    const court1: Court = {
      id: court1Id,
      name: "Tennis Court 1",
      courtType: "tennis",
      surfaceType: "hard",
      status: "active",
      hourlyRate: "25.00",
      peakHourlyRate: "35.00",
      openTime: "07:30",
      closeTime: "23:00",
      description: "Professional tennis hard court with excellent lighting for iTennis players",
      imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?ixlib=rb-4.0.3",
      createdAt: new Date(),
    };
    this.courts.set(court1Id, court1);

    const court2Id = randomUUID();
    const court2: Court = {
      id: court2Id,
      name: "Pickleball Court 1",
      courtType: "pickleball",
      surfaceType: "hard",
      status: "active",
      hourlyRate: "20.00",
      peakHourlyRate: "28.00",
      openTime: "07:30",
      closeTime: "23:00",
      description: "Dedicated pickleball court with regulation dimensions for iPickle players",
      imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3",
      createdAt: new Date(),
    };
    this.courts.set(court2Id, court2);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      id, 
      createdAt: new Date(),
      role: (insertUser.role as any) || 'guest',
      phone: insertUser.phone || null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Court methods
  async getCourt(id: string): Promise<Court | undefined> {
    return this.courts.get(id);
  }

  async getAllCourts(): Promise<Court[]> {
    return Array.from(this.courts.values());
  }

  async createCourt(insertCourt: InsertCourt): Promise<Court> {
    const id = randomUUID();
    const court: Court = { 
      id, 
      name: insertCourt.name,
      courtType: (insertCourt.courtType || 'tennis') as "tennis" | "pickleball",
      surfaceType: insertCourt.surfaceType as "hard" | "clay" | "grass",
      status: (insertCourt.status || 'active') as "active" | "maintenance" | "inactive",
      hourlyRate: insertCourt.hourlyRate,
      peakHourlyRate: insertCourt.peakHourlyRate,
      openTime: insertCourt.openTime || '06:00',
      closeTime: insertCourt.closeTime || '22:00',
      description: insertCourt.description || null,
      imageUrl: insertCourt.imageUrl || null,
      createdAt: new Date(),
    };
    this.courts.set(id, court);
    return court;
  }

  async updateCourt(id: string, updates: Partial<Court>): Promise<Court | undefined> {
    const court = this.courts.get(id);
    if (!court) return undefined;
    
    const updatedCourt = { 
      ...court, 
      ...updates,
      courtType: (updates.courtType || court.courtType || 'tennis') as "tennis" | "pickleball",
    };
    this.courts.set(id, updatedCourt);
    return updatedCourt;
  }

  async deleteCourt(id: string): Promise<boolean> {
    return this.courts.delete(id);
  }

  // Booking methods
  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingWithDetails(id: string): Promise<BookingWithDetails | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;

    const user = this.users.get(booking.userId);
    const court = this.courts.get(booking.courtId);
    
    if (!user || !court) return undefined;

    return { ...booking, user, court };
  }

  async getAllBookings(): Promise<BookingWithDetails[]> {
    const bookings: BookingWithDetails[] = [];
    
    for (const booking of Array.from(this.bookings.values())) {
      const user = this.users.get(booking.userId);
      const court = this.courts.get(booking.courtId);
      
      if (user && court) {
        bookings.push({ ...booking, user, court });
      }
    }
    
    return bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getBookingsByUser(userId: string): Promise<BookingWithDetails[]> {
    const userBookings: BookingWithDetails[] = [];
    
    for (const booking of Array.from(this.bookings.values())) {
      if (booking.userId === userId) {
        const user = this.users.get(booking.userId);
        const court = this.courts.get(booking.courtId);
        
        if (user && court) {
          userBookings.push({ ...booking, user, court });
        }
      }
    }
    
    return userBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getBookingsByDate(date: string): Promise<BookingWithDetails[]> {
    const dateBookings: BookingWithDetails[] = [];
    
    for (const booking of Array.from(this.bookings.values())) {
      if (booking.date === date) {
        const user = this.users.get(booking.userId);
        const court = this.courts.get(booking.courtId);
        
        if (user && court) {
          dateBookings.push({ ...booking, user, court });
        }
      }
    }
    
    return dateBookings.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async getBookingsByCourtAndDate(courtId: string, date: string): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.courtId === courtId && booking.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = { 
      ...insertBooking,
      id,
      createdAt: new Date(),
      type: (insertBooking.type as any) || 'regular',
      status: (insertBooking.status as any) || 'confirmed',
      description: insertBooking.description || null,
      recurringDays: insertBooking.recurringDays || null,
      recurringEndDate: insertBooking.recurringEndDate || null,
      isPaid: insertBooking.isPaid || false,
      paymentMethod: insertBooking.paymentMethod || null,
      notes: insertBooking.notes || null,
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...updates };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async deleteBooking(id: string): Promise<boolean> {
    return this.bookings.delete(id);
  }

  // Payment methods
  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByBooking(bookingId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.bookingId === bookingId);
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = { 
      id, 
      bookingId: insertPayment.bookingId,
      amount: insertPayment.amount,
      method: insertPayment.method as "credit_card" | "apple_pay" | "google_pay" | "paypal",
      status: (insertPayment.status || 'completed') as "pending" | "completed" | "failed" | "refunded",
      transactionId: insertPayment.transactionId || null,
      createdAt: new Date(),
    };
    this.payments.set(id, payment);
    return payment;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, ...updates };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  // Analytics methods
  async getBookingStats(): Promise<{
    todayBookings: number;
    todayRevenue: number;
    activeCourts: number;
    totalCourts: number;
    onlineMembers: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = Array.from(this.bookings.values())
      .filter(booking => booking.date === today).length;
    
    const todayRevenue = Array.from(this.bookings.values())
      .filter(booking => booking.date === today && booking.isPaid)
      .reduce((sum, booking) => sum + parseFloat(booking.totalAmount), 0);
    
    const activeCourts = Array.from(this.courts.values())
      .filter(court => court.status === "active").length;
    
    const totalCourts = this.courts.size;
    
    const onlineMembers = Array.from(this.users.values())
      .filter(user => user.role !== "guest").length;

    return {
      todayBookings,
      todayRevenue,
      activeCourts,
      totalCourts,
      onlineMembers,
    };
  }
}

export const storage = new MemStorage();
