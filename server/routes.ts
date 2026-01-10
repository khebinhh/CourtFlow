import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertCourtSchema, insertBookingSchema, insertPaymentSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/users/by-email/:email", async (req, res) => {
    try {
      const user = await storage.getUserByEmail(req.params.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Court routes
  app.get("/api/courts", async (req, res) => {
    try {
      const courts = await storage.getAllCourts();
      res.json(courts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courts" });
    }
  });

  app.post("/api/courts", async (req, res) => {
    try {
      const courtData = insertCourtSchema.parse(req.body);
      const court = await storage.createCourt(courtData);
      res.status(201).json(court);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/courts/:id", async (req, res) => {
    try {
      const updates = req.body;
      const court = await storage.updateCourt(req.params.id, updates);
      if (!court) {
        return res.status(404).json({ message: "Court not found" });
      }
      res.json(court);
    } catch (error) {
      res.status(500).json({ message: "Failed to update court" });
    }
  });

  app.delete("/api/courts/:id", async (req, res) => {
    try {
      const success = await storage.deleteCourt(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Court not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete court" });
    }
  });

  app.get("/api/courts/:id", async (req, res) => {
    try {
      const court = await storage.getCourt(req.params.id);
      if (!court) {
        return res.status(404).json({ message: "Court not found" });
      }
      res.json(court);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch court" });
    }
  });

  app.post("/api/courts", async (req, res) => {
    try {
      const courtData = insertCourtSchema.parse(req.body);
      const court = await storage.createCourt(courtData);
      res.status(201).json(court);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/courts/:id", async (req, res) => {
    try {
      const updates = req.body;
      const court = await storage.updateCourt(req.params.id, updates);
      if (!court) {
        return res.status(404).json({ message: "Court not found" });
      }
      res.json(court);
    } catch (error) {
      res.status(500).json({ message: "Failed to update court" });
    }
  });

  app.delete("/api/courts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCourt(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Court not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete court" });
    }
  });

  // Booking routes
  app.get("/api/bookings", async (req, res) => {
    try {
      const { userId, date } = req.query;
      
      let bookings;
      if (userId) {
        bookings = await storage.getBookingsByUser(userId as string);
      } else if (date) {
        bookings = await storage.getBookingsByDate(date as string);
      } else {
        bookings = await storage.getAllBookings();
      }
      
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const booking = await storage.getBookingWithDetails(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Check for conflicting bookings
      const existingBookings = await storage.getBookingsByCourtAndDate(
        bookingData.courtId,
        bookingData.date
      );
      
      const hasConflict = existingBookings.some(booking => {
        if (booking.status === "cancelled") return false;
        
        const newStart = bookingData.startTime;
        const newEnd = bookingData.endTime;
        const existingStart = booking.startTime;
        const existingEnd = booking.endTime;
        
        return (newStart < existingEnd && newEnd > existingStart);
      });
      
      if (hasConflict) {
        return res.status(409).json({ message: "Time slot already booked" });
      }
      
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/bookings/:id", async (req, res) => {
    try {
      const updates = req.body;
      const booking = await storage.updateBooking(req.params.id, updates);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBooking(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Court availability route
  app.get("/api/courts/:courtId/availability", async (req, res) => {
    try {
      const { courtId } = req.params;
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ message: "Date parameter required" });
      }
      
      const court = await storage.getCourt(courtId);
      if (!court) {
        return res.status(404).json({ message: "Court not found" });
      }
      
      const bookings = await storage.getBookingsByCourtAndDate(courtId, date as string);
      const availability = generateTimeSlots(court, bookings, date as string);
      
      res.json(availability);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Payment routes
  app.post("/api/payments", async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      
      // Mock payment processing - in production this would integrate with Stripe, etc.
      const mockSuccess = Math.random() > 0.1; // 90% success rate
      
      if (!mockSuccess) {
        return res.status(400).json({ message: "Payment failed" });
      }
      
      const payment = await storage.createPayment({
        ...paymentData,
        status: "completed",
        transactionId: `txn_${Date.now()}`,
      });
      
      // Update booking as paid
      await storage.updateBooking(paymentData.bookingId, { 
        isPaid: true,
        status: "confirmed",
      });
      
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ message: "Invalid payment data" });
    }
  });

  // Create staff account (admin only)
  app.post("/api/users/staff", async (req, res) => {
    try {
      // Note: In production, you would authenticate the admin user here
      // For now, we'll allow staff creation without authentication check
      
      const { username, email, password, firstName, lastName, phone } = req.body;

      if (!username || !email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const newUser = await storage.createUser({
        username,
        email,
        password,
        firstName,
        lastName,
        phone: phone || null,
        role: "staff",
      });

      res.status(201).json({ 
        message: "Staff account created successfully",
        user: { ...newUser, password: undefined }
      });
    } catch (error) {
      console.error("Error creating staff account:", error);
      res.status(500).json({ message: "Failed to create staff account" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/stats", async (req, res) => {
    try {
      const stats = await storage.getBookingStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate time slots
function generateTimeSlots(court: any, bookings: any[], date: string) {
  const slots = [];
  const start = parseInt(court.openTime.split(':')[0]);
  const end = parseInt(court.closeTime.split(':')[0]);
  
  for (let hour = start; hour < end; hour++) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    const nextHour = `${(hour + 1).toString().padStart(2, '0')}:00`;
    
    const isBooked = bookings.some(booking => 
      booking.status !== "cancelled" &&
      booking.startTime <= timeSlot && 
      booking.endTime > timeSlot
    );
    
    slots.push({
      time: timeSlot,
      endTime: nextHour,
      available: !isBooked && court.status === "active",
      status: isBooked ? "booked" : (court.status === "maintenance" ? "maintenance" : "available"),
    });
  }
  
  return slots;
}
