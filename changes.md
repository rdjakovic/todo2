## Change Log

### 2025-01-27 - TypeScript Error Fix
**Date:** January 27, 2025  
**Time:** Current timestamp  
**Summary:** Fixed TypeScript error in App.tsx by removing invalid `onEdit` prop from TodoItem component in DragOverlay. The TodoItem component uses `onOpenEditDialog` for edit functionality, so the `onEdit` prop was not needed and was causing compilation errors.