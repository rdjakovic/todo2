import React from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

import TodoForm from "./TodoForm";
import TodoListItems from "./TodoListItems";
import ListEditDialog from "./ListEditDialog";
import DeleteListDialog from "./DeleteListDialog";
import FilterDialog from "./FilterDialog";
import { getListById } from "../utils/helper";
import { useTodoStore } from "../store/todoStore";
import { useState, useEffect } from "react";
import { FilterOptions, SortOption, SortDirection } from "../types/todo";
import { useTodoCalculations } from "../hooks/useTodoCalculations";
import TodoStatistics from "./TodoStatistics";
import TodoListHeader from "./TodoListHeader";


const ERROR_DISMISS_TIMEOUT = 3000;

const TodoListView: React.FC = () => {
  const {
    lists,
    todos,
    selectedListId,
    error,
    searchQuery,
    sortBy,
    sortDirection,
    setSearchQuery,
    toggleTodo,
    deleteTodo,
    editList,
    deleteList,
    openEditDialog,
    getEffectiveSortForList,
  } = useTodoStore();


  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    showCompleted: false,
    priorities: {
      low: false,
      medium: false,
      high: false,
    },
    hasDueDate: false,
    hasNote: false,
  });

  const { setError } = useTodoStore();

  // Get the effective sort for this list (per-list override or global default)
  const effectiveSort = getEffectiveSortForList(selectedListId);

  const currentList = getListById(lists, selectedListId);
  const isCompletedList = currentList?.name.toLowerCase() === "completed";
  const isAllList = currentList?.name.toLowerCase() === "all";

  const canEditOrDelete = currentList &&
    !isAllList &&
    !isCompletedList;

  // Calculate effective filters (override showCompleted for "Completed" list)
  const effectiveFilters = isCompletedList
    ? { ...activeFilters, showCompleted: true }
    : activeFilters;

  const {
      statistics,
      incompleteTodos,
      completedTodos
    } = useTodoCalculations({
      todos,
      lists,
      selectedListId,
      searchQuery,
      activeFilters: effectiveFilters,
      effectiveSort,
    });

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, ERROR_DISMISS_TIMEOUT);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);


  // Handle showCompleted filter based on list type
  useEffect(() => {
    if (isCompletedList) {
      if (!showCompletedSection) {
        setShowCompletedSection(true);
      }
    }
  }, [isCompletedList, showCompletedSection]);


  const handleEditList = async (id: string, name: string, icon: string) => {
    await editList(id, name, icon);
    setIsEditDialogOpen(false);
  };

  const handleDeleteList = async () => {
    if (currentList) {
      await deleteList(currentList.id);
      setIsDeleteDialogOpen(false);
    }
  };


  const handleApplyFilters = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };

  // Check if any filters are active
  const hasActiveFilters = activeFilters.showCompleted ||
    Object.values(activeFilters.priorities).some(Boolean) ||
    activeFilters.hasDueDate ||
    activeFilters.hasNote;

  const handleSetSort = async (sort: SortOption, direction: SortDirection) => {
    if (currentList) {
      await editList(currentList.id, currentList.name, currentList.icon, sort, direction);
    }
  };

  const handleUseGlobal = async () => {
    if (currentList) {
      await editList(currentList.id, currentList.name, currentList.icon, null);
    }
  };

  return (
    <>
      <div className="flex-1 p-2 sm:p-8">
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <TodoListHeader
            currentList={currentList}
            canEditOrDelete={canEditOrDelete || false}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEditList={() => setIsEditDialogOpen(true)}
            onDeleteList={() => setIsDeleteDialogOpen(true)}
            onFilterClick={() => setIsFilterDialogOpen(true)}
            hasActiveFilters={hasActiveFilters}
            globalSort={sortBy}
            globalDirection={sortDirection}
            onSetSort={handleSetSort}
            onUseGlobal={handleUseGlobal}
          />

          {/* Statistics section - only show for "All" list */}
          {isAllList && <TodoStatistics statistics={statistics} />}

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Only show TodoForm for regular lists, not for "All" or "Completed" */}
          {!isAllList && !isCompletedList && <TodoForm />}

          {/* Incomplete Todos */}
          {incompleteTodos.length > 0 && (
            <AnimatePresence mode="popLayout">
              <TodoListItems
                filteredTodos={incompleteTodos}
                onToggle={toggleTodo}
                onDelete={(id) => deleteTodo(id)}
                onOpenEditDialog={openEditDialog}
              />
            </AnimatePresence>
          )}

          {/* Completed Section */}
          {completedTodos.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowCompletedSection(!showCompletedSection)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mb-4"
              >
                {showCompletedSection ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  Completed ({completedTodos.length})
                </span>
              </button>

              {showCompletedSection && (
                <AnimatePresence mode="popLayout">
                  <TodoListItems
                    filteredTodos={completedTodos}
                    onToggle={toggleTodo}
                    onDelete={(id) => deleteTodo(id)}
                    onOpenEditDialog={openEditDialog}
                  />
                </AnimatePresence>
              )}
            </div>
          )}

          {/* Show message when no todos exist */}
          {incompleteTodos.length === 0 && completedTodos.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No todos yet. Add one above!
            </div>
          )}
        </div>
      </div>

      <ListEditDialog
        isOpen={isEditDialogOpen}
        list={currentList ?? null}
        onSave={handleEditList}
        onCancel={() => setIsEditDialogOpen(false)}
      />

      <DeleteListDialog
        isOpen={isDeleteDialogOpen}
        listName={currentList?.name || null}
        onConfirm={handleDeleteList}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      <FilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
        isCompletedList={isCompletedList}
      />
    </>
  );
};

export default TodoListView;
