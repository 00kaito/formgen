# Form Builder Application

## Overview

This is a full-stack form builder application that allows users to create, customize, and share dynamic forms. The system provides a drag-and-drop interface for building forms with various field types, and enables form sharing through unique links. Built with React/TypeScript frontend, Express.js backend, and PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and CSS variables for theming
- **State Management**: TanStack React Query for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for type-safe form schemas
- **Component Structure**: Modular component architecture with reusable UI components

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints for form templates and responses
- **Error Handling**: Centralized error handling middleware
- **Development**: Hot module replacement with Vite integration for development server

### Data Storage
- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Schema Design**: Two main entities - form templates and form responses with proper relationships
- **Connection**: Neon Database serverless PostgreSQL connection
- **Fallback Storage**: In-memory storage implementation for development/testing

### Form System Design
- **Dynamic Form Fields**: Support for multiple field types (text, textarea, email, number, date, select, radio, checkbox)
- **Form Builder Interface**: Drag-and-drop palette for adding form fields with real-time preview
- **Field Configuration**: Properties panel for customizing field attributes (required, options, help text, etc.)
- **Form Sharing**: Unique shareable links for public form access
- **Response Collection**: Structured response storage with completion tracking

### Development Environment
- **Build System**: Vite with React plugin and TypeScript support
- **Development Features**: Runtime error overlay, hot module replacement, and development banner
- **Path Aliases**: Configured path mapping for clean imports (@/ for client, @shared for shared code)
- **Code Quality**: TypeScript strict mode with comprehensive type checking

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle Kit**: Database migration and schema management tool

### UI and Styling
- **Radix UI**: Comprehensive primitive component library for accessible UI elements
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **Lucide React**: SVG icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix primitives

### Development Tools
- **Vite**: Fast build tool with HMR and optimized bundling
- **TypeScript**: Static type checking and enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for production builds

### Form and Validation Libraries
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation library
- **Hookform Resolvers**: Integration between React Hook Form and Zod

### State Management
- **TanStack React Query**: Server state management with caching, background updates, and optimistic updates

### Utility Libraries
- **date-fns**: Modern JavaScript date utility library
- **clsx**: Utility for constructing className strings conditionally
- **class-variance-authority**: Tool for creating variant-based component APIs
- **nanoid**: URL-friendly unique string ID generator