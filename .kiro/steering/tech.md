# Technology Stack

## Core Framework
- **Tauri 2.x**: Desktop application framework with Rust backend
- **React 18**: Frontend UI library with hooks and modern patterns
- **TypeScript**: Strict typing with modern ES2020+ features
- **Vite**: Build tool and dev server with HMR

## UI & Styling
- **Tailwind CSS**: Utility-first CSS framework with dark mode support
- **Framer Motion**: Animation library for smooth transitions
- **Heroicons**: SVG icon library
- **clsx**: Conditional className utility

## State Management & Data
- **Zustand**: Lightweight state management
- **Supabase**: Authentication and backend services
- **date-fns**: Date manipulation utilities
- **React Hot Toast**: Toast notifications

## Drag & Drop
- **@dnd-kit**: Modern drag and drop library with accessibility support

## Testing
- **Vitest**: Fast unit testing framework
- **@testing-library/react**: React component testing utilities
- **jsdom**: DOM environment for testing

## Security & Quality
- **ESLint**: Code linting with security plugin
- **TypeScript strict mode**: Enhanced type checking
- **npm audit**: Dependency vulnerability scanning
- **cargo audit**: Rust dependency security auditing

## Common Commands

### Development
```bash
npm run dev          # Start frontend dev server
npm run tauri dev    # Start Tauri desktop app in dev mode
```

### Building
```bash
npm run build        # Build frontend for production
npm run tauri build  # Build desktop app for release
```

### Testing
```bash
npx vitest run 
npm test            # Run unit tests
npm run test:ui     # Run tests with UI
```

### Security
```bash
npm run security:check     # Run linting and audit
npm run security:audit     # Check npm dependencies
npm run security:full-scan # Complete security scan
```

### Tauri-specific
```bash
npm run tauri       # Access Tauri CLI commands
cargo check         # Check Rust code without building
cargo audit         # Audit Rust dependencies
```