# Polish Form Builder System

A comprehensive full-stack form builder application with admin authentication, drag-and-drop form creation, file uploads, analytics, and robust backup system. Features AI-powered follow-up questions, draft saving, webhook integration for external notifications, and responsive design.

## 🏗️ Architecture Overview

### System Design
- **Frontend**: React 18 + TypeScript with Vite build system
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (fallback to in-memory storage)
- **Authentication**: Session-based with Passport.js
- **AI Integration**: OpenAI GPT-4o for intelligent follow-up question generation
- **File Handling**: Multer for uploads with security validation
- **Backup System**: Multi-format file backup (TXT, Markdown, CSV) with webhook integration
- **UI Framework**: shadcn/ui built on Radix UI primitives with Tailwind CSS

### Key Features
- 🎯 **Drag-and-Drop Form Builder** - Visual form creation with 12 field types including headlines
- 🤖 **AI-Powered Follow-ups** - OpenAI integration generates contextual questions after form submission
- 💾 **Draft Saving** - Auto-save drafts with unique shareable links for resuming later
- 🔐 **Admin Authentication** - Session-based auth (admin/Procesy123)
- 📊 **Analytics Dashboard** - Form statistics and response analytics
- 💾 **Backup System** - Automatic file backup with webhook notifications
- 📱 **Responsive Design** - 40% form width on large screens, full width on mobile
- 🌍 **Internationalization** - Complete English interface
- 📁 **File Uploads** - Secure file handling with type validation
- 📈 **Real-time Statistics** - Form completion rates and submission trends

## 🧩 Main Classes and Components

### Backend Core Classes

#### **1. Storage Layer (`server/storage.ts`)**
```typescript
interface IStorage {
  // Form Templates CRUD
  getFormTemplate(id: string): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  // Form Responses CRUD  
  createFormResponse(response: InsertFormResponse): Promise<FormResponse>;
  // User Management
  getUserByUsername(username: string): Promise<User | undefined>;
  // Analytics
  getDashboardStats(): Promise<DashboardStats>;
}

class MemStorage implements IStorage {
  // In-memory storage implementation with admin user initialization
}
```
**Purpose**: Abstraction layer for data persistence with fallback to in-memory storage.

#### **2. Backup System (`server/backup-utils.ts`)**
```typescript
class BackupUtils {
  static async createBackups(formTemplate: FormTemplate, formResponse: FormResponse): Promise<BackupResult>;
  static async sendWebhook(txtFilePath: string, formTitle: string): Promise<void>;
  private static async createTXTBackup(...): Promise<string>;
  private static async createMarkdownBackup(...): Promise<string>;
  private static async createCSVBackup(...): Promise<string>;
}
```
**Purpose**: Handles multi-format backup creation and webhook integration for external notifications.

#### **3. Authentication (`server/auth.ts`)**
```typescript
export function setupAuth(app: Express): void;
export function requireAuth(req, res, next);
export function isAuthenticated(req, res, next);
```
**Purpose**: Passport.js configuration with local strategy and session management.

#### **4. Route Handler (`server/routes.ts`)**
```typescript
export async function registerRoutes(app: Express): Promise<Server> {
  // File upload routes with security validation
  // Form template CRUD endpoints
  // Form response collection endpoints
  // Analytics and statistics endpoints
  // Export functionality (CSV/Excel)
}
```
**Purpose**: API endpoint registration with file upload handling and security validation.

#### **5. AI Service (`server/ai-service.ts`)**
```typescript
class AIService {
  static async generateFollowUpQuestions(formTemplate: FormTemplate, responses: Record<string, any>): Promise<FormField[]>;
  private static buildPrompt(formTemplate: FormTemplate, responses: Record<string, any>): string;
  private static parseAIResponse(content: string): { analysis: string; questions: any[] };
}
```
**Purpose**: OpenAI integration for intelligent follow-up question generation based on form responses.

### Frontend Core Components

#### **5. Form Builder (`client/src/pages/form-builder.tsx`)**
```typescript
export default function FormBuilder() {
  // @dnd-kit integration for drag-and-drop
  // Form state management (title, description, fields)
  // Save/Update mutations with TanStack Query
  // Field selection and properties editing
}
```
**Purpose**: Main form creation interface with visual drag-and-drop functionality.

#### **6. Field Palette (`client/src/components/form-field-palette.tsx`)**
```typescript
export default function FormFieldPalette({ onAddField }: FormFieldPaletteProps) {
  // Renders 12 field types: text, textarea, email, number, date, select, radio, checkbox, file, table, separator, headline
  // Creates new FormField instances with unique IDs
}
```
**Purpose**: Draggable palette of available form field types.

#### **7. Field Renderer (`client/src/components/form-field-renderer.tsx`)**
```typescript
export default function FormFieldRenderer({ field, isSelected, isPublic, form, isDraggable }: Props) {
  // useSortable hook for drag-and-drop reordering
  // Conditional rendering based on field type
  // Builder vs. public form display modes
  // File upload integration with security validation
}
```
**Purpose**: Renders form fields in both builder and public form contexts with drag-and-drop support.

#### **8. Properties Panel (`client/src/components/field-properties-panel.tsx`)**
```typescript
export default function FieldPropertiesPanel({ selectedField, onUpdateField }: Props) {
  // Dynamic property editing based on field type
  // Options management for select/radio/checkbox fields
  // File type restrictions for upload fields
  // Table column configuration
}
```
**Purpose**: Dynamic properties editor for selected form fields.

#### **9. Markdown Converter (`client/src/components/markdown-form-converter.tsx`)**
```typescript
export default function MarkdownFormConverter({ onFieldsConverted, currentFields }: Props) {
  // Import/export form definitions via Markdown
  // Real-time preview with error handling
  // Bidirectional conversion (form ↔ markdown)
}
```
**Purpose**: Allows form import/export using human-readable Markdown format with support for headlines (`# Title`) and separators (`---`).

### Data Models (`shared/schema.ts`)

#### **Form Template Schema**
```typescript
type FormTemplate = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  isActive: boolean;
  shareableLink: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### **Form Field Types**
```typescript
type FormFieldType = 'text' | 'textarea' | 'email' | 'number' | 'date' | 
                    'select' | 'radio' | 'checkbox' | 'file' | 'table' | 'separator' | 'headline';

type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  helpText?: string;
  required: boolean;
  options?: string[];              // for select/radio/checkbox
  acceptedFileTypes?: string[];    // for file uploads
  maxFileSize?: number;            // in MB
  multiple?: boolean;              // for file uploads
  columns?: string[];              // for table fields
}
```

#### **Form Response Schema**
```typescript
type FormResponse = {
  id: string;
  formTemplateId: string;
  responses: Record<string, any>;
  isComplete: boolean;
  shareableResponseLink: string;
  aiGeneratedFields?: FormField[];    // AI-generated follow-up questions
  submittedAt: Date;
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL (optional - uses in-memory storage as fallback)
- npm or yarn

### Environment Variables
Create a `.env` file in the root directory:
```env
# Required
SESSION_SECRET=your-secret-key-here

# Optional (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/formbuilder
PGHOST=localhost
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=formbuilder

# AI Integration (OpenAI)
OPENAI_API_KEY=your-openai-api-key-here

# Optional
PORT=5000
NODE_ENV=development
```

### 🐳 Starting with Docker

#### Build and Run
```bash
# Build the Docker image
docker build -t form-builder .

# Run the container
docker run -p 5000:5000 \
  -e SESSION_SECRET=your-secret-key \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/form-backups:/app/form-backups \
  form-builder
```

#### Using Docker Compose
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - SESSION_SECRET=your-secret-key
      - NODE_ENV=production
    volumes:
      - ./uploads:/app/uploads
      - ./form-backups:/app/form-backups
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/auth/user"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
docker-compose up -d
```

### 💻 Starting without Docker

#### Development Mode
```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start development server (with hot reload)
npm run dev
```

#### Production Mode
```bash
# 1. Install dependencies
npm ci --only=production

# 2. Build the application
npm run build

# 3. Start production server
npm start
```

### 🗄️ Database Setup (Optional)
```bash
# If using PostgreSQL, push the schema
npm run db:push
```

## 📁 Project Structure

```
form-builder/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page components  
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # Utilities and configuration
│   └── index.html
├── server/                    # Express.js backend
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API route definitions
│   ├── auth.ts               # Authentication setup
│   ├── storage.ts            # Data persistence layer
│   ├── backup-utils.ts       # Backup and webhook system
│   └── vite.ts               # Vite integration
├── shared/                    # Shared TypeScript types
│   ├── schema.ts             # Database schema and types
│   └── markdownParser.ts     # Markdown conversion utilities
├── uploads/                   # File upload directory
├── form-backups/             # Backup files directory
├── Dockerfile                 # Container configuration
└── package.json              # Dependencies and scripts
```

## 🔧 Development Workflow

### Available Scripts
```bash
npm run dev      # Start development server with HMR
npm run build    # Build for production
npm start        # Start production server
npm run check    # TypeScript type checking
npm run db:push  # Push database schema changes
```

### Admin Access
- **Username**: `admin`
- **Password**: `Procesy123`
- **Access URL**: `http://localhost:5000/auth`

### API Endpoints
- `GET /api/auth/user` - Check authentication status
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/form-templates` - List all forms
- `POST /api/form-templates` - Create new form
- `GET /api/public-forms/:shareableLink` - Get public form
- `POST /api/form-responses` - Submit form response
- `POST /api/form-responses/draft` - Save form as draft
- `PUT /api/form-responses/draft/:shareableLink` - Update existing draft
- `GET /api/form-responses/by-link/:shareableLink` - Get form response by link
- `GET /api/dashboard/stats` - Dashboard statistics
- `POST /api/upload` - File upload endpoint

### AI Integration
The system uses OpenAI GPT-4o to automatically generate contextual follow-up questions based on form submissions:
- **Intelligent Analysis**: AI analyzes submitted responses to understand context
- **Dynamic Questions**: Generates 6 relevant follow-up questions with proper field types
- **Real-time Processing**: Questions appear within 6-8 seconds after form submission
- **Persistent Storage**: AI-generated questions are stored in the database for later access

### Draft System
Forms can be saved as drafts and resumed later:
- **Auto-save**: Drafts are automatically saved as users fill out forms
- **Shareable Links**: Each draft gets a unique URL for resuming later
- **State Management**: Complete form state is preserved including partial responses
- **Draft Mode**: Visual indicators show when users are in draft mode

### Markdown Form Syntax
The system supports enhanced Markdown syntax for form creation:
```markdown
# Section Headline          # Creates a visual headline (no input)
## Field Label              # Creates an input field
[text] (required)          # Field type and validation
Help text for the field    # Optional description

---                        # Creates a visual separator

# Another Section
## Email Address
[email] (required) {"placeholder": "user@example.com"}
We'll use this to contact you
```

### Backup System
The application automatically creates backup files in three formats for each form submission:
- **TXT**: Human-readable format
- **Markdown**: Structured format for documentation
- **CSV**: Spreadsheet-compatible format

Backup files are stored in `form-backups/{formTemplateId}/{responseId}.{format}` and optionally sent to webhook endpoint for external processing.

### Security Features
- Session-based authentication with secure cookies
- File upload validation with MIME type checking
- CSRF protection through same-origin policy
- Input sanitization and validation with Zod schemas
- Secure file naming with slugification

## 🌐 Deployment Notes

### Environment Configuration
- Ensure `SESSION_SECRET` is set to a strong, random value
- Configure `DATABASE_URL` for PostgreSQL connection
- Set `NODE_ENV=production` for production deployments
- Enable HTTPS and set `cookie.secure=true` in production

### File Persistence
- Mount volumes for `uploads/` and `form-backups/` directories
- Ensure proper file permissions for the application user
- Consider backup strategies for uploaded files and form data

### Monitoring
- Health check endpoint available at `/api/auth/user`
- Application logs include API request timing and responses
- Webhook notifications provide external integration for form submissions

---

Built with ❤️ using React, Express.js, and TypeScript