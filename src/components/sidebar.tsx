import { useState } from 'react';
import {
    HomeIcon,
    CheckCircleIcon,
    BriefcaseIcon,
    UserIcon,
    BookOpenIcon,
    PlusIcon,
    XMarkIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { TodoList } from '../types/todo';

interface SidebarProps {
    lists: TodoList[];
    selectedList: string;
    onSelectList: (listId: string) => void;
    onCreateList: (name: string) => void;
    onDeleteList: (listId: string) => void;
    todoCountByList: Record<string, number>;
}

export function Sidebar({ lists, selectedList, onSelectList, onCreateList, onDeleteList, todoCountByList }: SidebarProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newListName, setNewListName] = useState('');

    const getIconForList = (icon: string) => {
        const props = { className: "w-5 h-5" };
        switch (icon) {
            case 'home': return <HomeIcon {...props} />;
            case 'check': return <CheckCircleIcon {...props} />;
            case 'user': return <UserIcon {...props} />;
            case 'briefcase': return <BriefcaseIcon {...props} />;
            case 'book': return <BookOpenIcon {...props} />;
            default: return <HomeIcon {...props} />;
        }
    };

    const handleCreateList = () => {
        if (newListName.trim()) {
            onCreateList(newListName);
            setNewListName('');
            setIsCreating(false);
        }
    };

    return (
        <div className="w-64 bg-white h-screen p-4 border-r">
            <div className="space-y-2">
                {lists.map((list) => (
                    <div key={list.id} className="flex items-center justify-between">
                        <button
                            onClick={() => onSelectList(list.id)}
                            className={clsx(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg",
                                selectedList === list.id ? "bg-purple-100 text-purple-900" : "hover:bg-gray-100"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {getIconForList(list.icon)}
                                <span>{list.name}</span>
                            </div>
                            <span className="text-sm text-gray-500">
                                {todoCountByList[list.id] || 0}
                            </span>
                        </button>
                        <button
                            onClick={() => onDeleteList(list.id)}
                            className="ml-2 p-1 text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-50"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>

            {isCreating ? (
                <div className="mt-4 space-y-2">
                    <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="List name"
                        className="w-full px-3 py-2 border rounded-lg"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateList}
                            className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-3 py-2 border rounded-lg hover:bg-gray-100"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsCreating(true)}
                    className="mt-4 w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create new list
                </button>
            )}
        </div>
    );
}