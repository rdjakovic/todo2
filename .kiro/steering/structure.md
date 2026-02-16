# Project Structure

## Root Directory
- `src/` - React frontend source code
- `src-tauri/` - Rust backend code and Tauri configuration
- `public/` - Static assets and PWA files
- `docs/` - Project documentation
- `security-reports/` - Security analysis and audit reports
- `.kiro/` - Kiro AI assistant configuration and specs

## Frontend Structure (`src/`)

### Core Application
- `main.tsx` - Application entry point
- `App.tsx` - Main application component with routing logic
- `App.css` - Global styles

### Components (`src/components/`)
- Organized by feature/functionality
- Each component should have corresponding test files
- Use PascalCase for component files (e.g., `LoginForm.tsx`)

### State Management (`src/store/`)
- Zustand stores for different domains
- `authStore.ts` - Authentication state
- `todoStore.ts` - Todo and list management state

### Utilities (`src/utils/`)
- Helper functions and utilities
- Security-related utilities (monitoring, logging, error handling)
- Test files should be in `__tests__/` subdirectories

### Types (`src/types/`)
- TypeScript type definitions
- Shared interfaces and types

### Hooks (`src/hooks/`)
- Custom React hooks
- Reusable logic extraction

### Constants (`src/const/`)
- Application constants and configuration
- Security messages and error codes

### Security (`src/security/`)
- Security-related scripts and utilities
- Analysis and testing tools

## Backend Structure (`src-tauri/`)
- `src/` - Rust source code
- `Cargo.toml` - Rust dependencies and metadata
- `tauri.conf.json` - Tauri application configuration
- `capabilities/` - Tauri permission definitions
- `icons/` - Application icons for different platforms

## Configuration Files
- `package.json` - Node.js dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `vitest.config.ts` - Testing configuration
- `eslint.config.js` - Linting rules

## Naming Conventions
- **Components**: PascalCase (e.g., `TodoItem.tsx`)
- **Hooks**: camelCase starting with "use" (e.g., `useTheme.ts`)
- **Utilities**: camelCase (e.g., `securityMonitor.ts`)
- **Types**: PascalCase for interfaces/types
- **Constants**: UPPER_SNAKE_CASE for constants
- **Test files**: `*.test.tsx` or `*.test.ts`

## Testing Structure
- Test files should be co-located with source files in `__tests__/` directories
- Integration tests should be clearly marked with `.integration.test.ts`
- Security-specific tests should follow naming patterns like `.secureError.test.tsx`

## Security Organization
- Security scripts in `src/security/scripts/`
- Security reports generated in `security-reports/`
- Security utilities in `src/utils/` with clear naming
- Security constants in `src/const/securityMessages.ts`