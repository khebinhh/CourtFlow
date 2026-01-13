# iTennis/iPickle Management System

## Overview

A comprehensive tennis and pickleball court management system built as a full-stack application for booking and managing court reservations at iTennis/iPickle facilities. The system provides court scheduling, user management, booking management, and payment processing capabilities. It features a React frontend with shadcn/ui components and an Express.js backend with in-memory storage (PostgreSQL-ready), branded with iTennis/iPickle's professional theme colors (blue, teal, orange).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom tennis-themed color scheme and shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives wrapped with shadcn/ui components for accessibility and consistency

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for REST API endpoints
- **Language**: TypeScript for type safety across the entire stack
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon serverless hosting
- **Session Management**: In-memory storage for development with extensible interface for production scaling

### Data Storage Solutions
- **Storage System**: In-memory storage with IStorage interface for easy migration to persistent databases
- **Schema Management**: Drizzle-compatible schema definitions for future database migrations
- **Data Validation**: Zod schemas for runtime type validation and API request/response validation
- **Storage Interface**: Abstracted storage layer with IStorage interface allowing for multiple implementations (MemStorage for development, extensible to PostgreSQL/Neon)

### Authentication and Authorization
- **Authentication Method**: Simple email/password authentication with session-based login
- **Session Storage**: localStorage for client-side session persistence
- **Role-Based Access**: Five user roles (admin, staff, coach, member, guest) with hierarchical permissions
- **Authorization Pattern**: Permission-based system with role-to-permission mapping for granular access control

### External Dependencies
- **Database Hosting**: Neon serverless PostgreSQL for managed database infrastructure
- **UI Framework**: Radix UI for accessible, unstyled component primitives
- **Development Tools**: Replit-specific plugins for development environment integration
- **Payment Processing**: Placeholder implementation ready for payment gateway integration
- **Form Handling**: React Hook Form with Hookform resolvers for form validation and management

### Key Design Patterns
- **Separation of Concerns**: Clear separation between client, server, and shared code with dedicated directories
- **Type Safety**: End-to-end TypeScript with shared schema definitions between client and server
- **Component Architecture**: Atomic design principles with reusable UI components and feature-specific components
- **API Design**: RESTful API structure with consistent error handling and response formatting
- **Database Design**: Normalized schema with proper foreign key relationships and constraints
- **Mobile-First Design**: Responsive design with dedicated mobile navigation and touch-optimized interfaces

## Recent Updates (January 2025)

### Enhanced Booking System (January 16, 2025)
- **Multiple Booking Types**: Implemented comprehensive booking type system (Regular, Class, Event, Maintenance) with distinct color coding
- **Class Bookings**: Added class name field, checkbox-style recurring day selector, and end date selection
- **Event Bookings**: Event name, description, and duration fields (removed payment requirement for facility-hosted events)
- **Maintenance Bookings**: Maintenance type, description, and duration tracking for facility management
- **Time Display**: Converted all times to 12-hour AM/PM format throughout the application
- **Orange Timeline Fix**: Corrected timeline positioning to accurately show current time on Court Calendar
- **Booking Display**: Different booking types now show appropriate information (class names, event descriptions, etc.)
- **Edit Modal**: Enhanced edit reservation modal with booking type-specific fields matching creation forms

### UI/UX Improvements
- Custom TimePicker component with 15-minute increments integrated throughout the system
- Fixed customer search dropdown to immediately hide after selection
- Improved calendar grid to display booking-specific information based on type
- Added proper AM/PM time format display across Court Calendar and My Bookings pages

### Booking Modal Redesign (January 2026)
- **Consistent Visual Styling**: All booking form sections use unified gray backgrounds with consistent borders
- **Improved Field Ordering**: Regular tab shows Customer selection first, then Duration, Notes, Payment Method
- **Phone Auto-Formatting**: Phone input automatically formats as +1 (XXX) XXX-XXXX as user types
- **Better Modal Sizing**: Modal is centered and sized to accommodate New Customer form without excessive scrolling
- **Consistent Across Tabs**: Event, Class, and Maintenance tabs all use the same gray styling pattern
- **Collapsible Admin Sections**: Facility Courts section in Admin Settings is collapsible with Tennis/Pickleball filter

### Data Management
- Extended booking schema to support description, recurringDays, and recurringEndDate fields
- Storage layer properly handles all new booking type fields
- Consistent data display across Court Calendar, My Bookings, and Edit Reservation modals