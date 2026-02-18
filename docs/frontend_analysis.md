# Frontend Analysis & Refactoring Suggestions

This document outlines an analysis of the current React frontend codebase, focusing on code quality, maintainability, performance, and best practices.

## 1. Executive Summary

The codebase is generally well-structured, utilizing modern tech stack (React 18+, TypeScript, Vite, Zustand, Tailwind). It follows many good practices, such as using `clsx` for class management and `framer-motion` for animations.

However, some core components (e.g., [TodoListView](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#31-480)) are becoming monolithic, mixing presentation, business logic, and state management. There are also opportunities to improve performance through memoization and better custom hook usage.

## 2. Detailed Findings

### 2.1 Component Structure & Size

**Issue:** [TodoListView.tsx](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx) is nearly 500 lines long. It handles:
- Rendering of headers, lists, and dialogs.
- Filtering logic ([applyFilters](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#131-160)).
- Statistics calculation ([getStatistics](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#114-128)).
- State for multiple dialogs.
- Effect-based state synchronization.

**Suggestion:** Decompose this component.
- **Extract Logic:** Move filtering and statistics logic into custom hooks or Zustand selectors.
- **Extract UI:** Create smaller sub-components like `<TodoStats />`, `<TodoFilterBar />`, `<TodoHeader />`.

### 2.2 State Management & Hooks

**Issue:** [TodoListView](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#31-480) uses `useEffect` to synchronize `showCompleted` state when switching lists (lines 91-112).
> *Skill Ref:* `modern-best-practice-react-components`: "**AVOID** `useEffect()`... **PREFER** deriving values during render".

**Suggestion:**
- Move this logic into the `useTodoStore` or the event handler that changes the list.
- Create a `useTodoFilters` hook to manage filter state and logic, keeping the view component clean.

**Issue:** Repeated `window.innerWidth` checks in components (e.g., [App.tsx](file:///c:/playground/AI/TAURI/todo2/src/App.tsx), [TodoItem.tsx](file:///c:/playground/AI/TAURI/todo2/src/components/TodoItem.tsx)).
**Suggestion:** Create a `useMediaQuery` or `useWindowSize` hook. This standardizes the logic and prevents event listener duplications.

### 2.3 Performance

**Issue:** [getStatistics](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#114-128) and [applyFilters](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#131-160) run on **every render** of [TodoListView](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#31-480).
**Suggestion:**
- Use `useMemo` for these expensive calculations.
- Alternatively, move [getStatistics](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#114-128) to a derived store selector (Zustand supports this well).

**Issue:** Inline arrow functions in JSX (e.g., `onClick={() => onToggle(todo.id)}`).
> *Skill Ref:* `modern-best-practice-react-components`: "**AVOID** in-line event handlers in JSX".
**Suggestion:** While acceptable for simple wrappers, extracting complex logic (like the mobile check in [TodoItem](file:///c:/playground/AI/TAURI/todo2/src/components/TodoItem.tsx#12-19)) to named handlers improves readability and stability.

### 2.4 Accessibility (a11y)

**Issue:** Use of generic `div` elements for semantic sections.
> *Skill Ref:* `modern-accessible-html-jsx`: "**PREFER** semantic elements (`header`, `nav`, `main`, `section`, `article`, `footer`)".
**Suggestion:**
- Use `<header>` for the top bar in [TodoListView](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#31-480).
- Use `<section>` for "Completed" vs "Incomplete" lists.
- Ensure all icon buttons have explicit `aria-label` (currently using `title`, which is good but `aria-label` provides better screen reader support).

### 2.5 TypeScript

**Status:** Code uses interfaces and types well.
**Suggestion:** Ensure strict null checks are handled gracefully. The user of `!` (non-null assertion) should be avoided if present (none obvious found in key files, which is good).

## 3. Refactoring Roadmap

### Phase 1: custom Hooks (Low Effort, High Impact)
- [ ] Create `useMediaQuery` hook.
- [ ] Create `useTodoCalculations` (or `useTodoStats`) hook to encapsulate [applyFilters](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#131-160) and [getStatistics](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#114-128) with `useMemo`.

### Phase 2: Component Decomposition (Medium Effort)
- [ ] Break down [TodoListView](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#31-480) into:
    - `TodoListHeader`
    - `TodoListStats`
    - `TodoListFilters`
- [ ] Refactor [TodoItem](file:///c:/playground/AI/TAURI/todo2/src/components/TodoItem.tsx#12-19) to separate "drag handle" logic from "content rendering".

### Phase 3: Logic Refinement (High Effort)
- [ ] Refactor `useEffect` dependent logic in [TodoListView](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx#31-480) to be event-driven or store-driven.
- [ ] optimizing re-renders with `React.memo` for list items if profiling shows lag (usually not needed until list is large).

## 4. Example: Custom Hook Refactor

**Current ([TodoListView.tsx](file:///c:/playground/AI/TAURI/todo2/src/components/TodoListView.tsx)):**
```tsx
const statistics = getStatistics(); // Calculated every render
const filtered = applyFilters(todos, activeFilters); // Calculated every render
```

**Proposed (`hooks/useTodoCalculations.ts`):**
```tsx
export const useTodoCalculations = (todos: Todo[], filters: FilterOptions) => {
  const statistics = useMemo(() => {
    // ... calc logic
  }, [todos]);

  const filteredTodos = useMemo(() => {
    // ... filter logic
  }, [todos, filters]);

  return { statistics, filteredTodos };
};
```
