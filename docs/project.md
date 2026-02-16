# Todo2 - Cross-Platform Task Management Application

## Project Overview

Todo2 is a modern, feature-rich task management application built with React, TypeScript, and Tauri. It provides a seamless experience across desktop platforms (Windows, macOS, Linux) and web browsers, with offline-first capabilities and real-time synchronization.

## Purpose & Vision

The application aims to provide users with a simple yet powerful tool for organizing tasks and boosting productivity. It combines the convenience of web technologies with the performance and native feel of desktop applications, while ensuring data is always accessible even without an internet connection.

## Key Features

### Core Functionality
- **Multi-List Organization**: Create and manage multiple todo lists with custom names and icons
- **Task Management**: Add, edit, delete, and mark tasks as complete
- **Priority System**: Assign priority levels (low, medium, high) to tasks
- **Due Dates**: Set and track due dates for important tasks
- **Notes**: Add detailed notes to tasks for additional context
- **Search**: Find tasks quickly with real-time search functionality

### User Experience
- **Drag & Drop**: Reorder tasks and move them between lists
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Resizable Sidebar**: Customize the interface to your preference
- **Keyboard Shortcuts**: Efficient navigation and task management

### Advanced Features
- **Offline-First Architecture**: Full functionality without internet connection
- **Real-time Sync**: Automatic synchronization when online
- **PWA Support**: Install as a web app on mobile devices
- **Background Sync**: Sync pending changes when connection is restored
- **Cross-Platform**: Native desktop apps for Windows, macOS, and Linux

## Technology Stack

### Frontend Framework
- **React 18.2.0**: Modern UI library with hooks and functional components
- **TypeScript 5.0.2**: Type-safe JavaScript for better development experience
- **Vite 6.0.7**: Fast build tool and development server

### Desktop Framework
- **Tauri 2.2.3**: Rust-based framework for building native desktop applications
- **Rust**: Systems programming language for the backend

### UI & Styling
- **Tailwind CSS 3.4.17**: Utility-first CSS framework
- **Headless UI 2.2.0**: Unstyled, accessible UI components
- **Heroicons 2.0.18**: Beautiful hand-crafted SVG icons
- **Framer Motion 11.18.1**: Production-ready motion library for animations

### State Management
- **Zustand 4.5.2**: Lightweight state management solution
- **Custom Stores**: Separate stores for authentication and todo management

### Backend & Database
- **Supabase**: Backend-as-a-Service providing:
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication system
  - Row Level Security (RLS)

### Offline & PWA
- **IndexedDB**: Browser-based storage for offline functionality
- **Service Worker**: Background sync and caching
- **Web App Manifest**: PWA configuration for mobile installation

### Development Tools
- **Vitest 3.0.7**: Fast unit testing framework
- **Testing Library**: React testing utilities
- **ESLint & TypeScript**: Code quality and type checking
- **PostCSS**: CSS processing and optimization

## Architecture Overview

### Application Structure
```
src/
├── components/          # Reusable UI components
├── store/              # Zustand state management
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries and configurations
├── types/              # TypeScript type definitions
├── utils/              # Helper functions
└── const/              # Application constants
```

### State Management Architecture
The application uses a centralized state management approach with Zustand:

- **AuthStore**: Manages user authentication, session handling, and user data
- **TodoStore**: Handles todos, lists, UI state, and offline synchronization

### Data Flow
1. **User Actions**: UI components dispatch actions to stores
2. **Local Updates**: State is updated immediately for responsive UI
3. **Persistence**: Data is saved to IndexedDB for offline access
4. **Synchronization**: Changes are synced to Supabase when online
5. **Conflict Resolution**: Automatic handling of offline/online data conflicts

### Offline-First Design
- **IndexedDB Storage**: All data is stored locally for instant access
- **Sync Queue**: Pending operations are queued when offline
- **Background Sync**: Service worker handles synchronization
- **Optimistic Updates**: UI updates immediately, syncs in background

## Database Schema

### Lists Table
```sql
- id: UUID (Primary Key)
- name: VARCHAR (List name)
- icon: VARCHAR (Icon identifier)
- show_completed: BOOLEAN (Show completed tasks)
- user_id: UUID (Foreign Key to auth.users)
- created_at: TIMESTAMP
```

### Todos Table
```sql
- id: UUID (Primary Key)
- list_id: UUID (Foreign Key to lists)
- title: TEXT (Task title)
- notes: TEXT (Optional task notes)
- completed: BOOLEAN (Completion status)
- priority: ENUM (low, medium, high)
- date_created: TIMESTAMP
- due_date: TIMESTAMP (Optional)
- date_of_completion: TIMESTAMP (Optional)
```

## Security Features

### Authentication
- **Supabase Auth**: Secure user authentication and session management
- **Row Level Security**: Database-level access control
- **JWT Tokens**: Secure API communication

### Data Protection
- **User Isolation**: Each user can only access their own data
- **Secure Endpoints**: All API calls are authenticated
- **Local Encryption**: Sensitive data is handled securely

## Performance Optimizations

### Frontend
- **Code Splitting**: Lazy loading of components
- **Memoization**: React.memo and useMemo for expensive operations
- **Virtual Scrolling**: Efficient rendering of large lists
- **Compression**: Gzip and Brotli compression for assets

### Backend
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Caching**: Strategic caching of frequently accessed data

### Build Optimizations
- **Tree Shaking**: Removal of unused code
- **Asset Optimization**: Compressed images and fonts
- **Bundle Analysis**: Monitoring and optimization of bundle size

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Start development server (web)
npm run dev

# Start Tauri development (desktop)
npm run tauri dev

# Run tests
npm run test

# Build for production
npm run tauri build
```

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: Store and API integration testing
- **E2E Tests**: Full application workflow testing
- **Manual Testing**: Cross-platform compatibility testing

## Deployment & Distribution

### Web Application
- **Static Hosting**: Deployable to any static hosting service
- **PWA Installation**: Users can install as a web app
- **Automatic Updates**: Service worker handles app updates

### Desktop Applications
- **Multi-Platform Builds**: Windows (.exe), macOS (.dmg), Linux (.AppImage)
- **Code Signing**: Signed binaries for security and trust
- **Auto-Updates**: Built-in update mechanism (configurable)

## Future Enhancements

### Planned Features
- **Collaboration**: Share lists and collaborate with others
- **Recurring Tasks**: Support for repeating tasks
- **Categories/Tags**: Advanced organization with tags
- **Time Tracking**: Built-in time tracking for tasks
- **Analytics**: Productivity insights and statistics
- **Integrations**: Calendar and third-party app integrations

### Technical Improvements
- **Real-time Collaboration**: WebSocket-based real-time updates
- **Advanced Offline**: Conflict resolution for collaborative editing
- **Performance**: Further optimizations for large datasets
- **Accessibility**: Enhanced screen reader and keyboard navigation support

## Contributing

The project follows modern development practices with TypeScript for type safety, comprehensive testing, and clear architectural patterns. The codebase is designed to be maintainable and extensible, making it easy for developers to contribute new features and improvements.

## License & Acknowledgments

This project demonstrates the power of modern web technologies combined with native desktop capabilities, providing users with a robust, cross-platform task management solution that works seamlessly online and offline.