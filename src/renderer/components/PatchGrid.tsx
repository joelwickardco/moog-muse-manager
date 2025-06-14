import React, { useState } from 'react';
import { HeartIcon, PlusIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

interface PatchCardProps {
  name: string;
  tags: string[];
  favorited: boolean;
  selected: boolean;
  onToggleFavorite: () => void;
  onSelect: () => void;
  onTagRemove: (tag: string) => void;
  onTagAdd: (tag: string) => void;
}

function PatchCard({
  name,
  tags,
  favorited,
  selected,
  onToggleFavorite,
  onSelect,
  onTagRemove,
  onTagAdd
}: PatchCardProps) {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (newTag.trim()) {
      onTagAdd(newTag.trim());
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'relative p-4 border rounded-md cursor-pointer hover:shadow-md bg-white border-gray-200',
        selected ? 'ring-2 ring-blue-500' : ''
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="absolute top-1 right-1"
      >
        <HeartIcon
          className={clsx(
            'w-5 h-5',
            favorited ? 'text-red-500 fill-current' : 'text-gray-400'
          )}
        />
      </button>
      <div className="font-medium mb-2 text-gray-900">{name}</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center"
          >
            {tag}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTagRemove(tag);
              }}
              className="ml-1 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </span>
        ))}
        {!isAddingTag && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAddingTag(true);
            }}
            className="inline-flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 rounded-full border border-gray-200"
          >
            <PlusIcon className="w-3 h-3 mr-1" />
            Add Tag
          </button>
        )}
      </div>
      {isAddingTag && (
        <form
          onSubmit={handleAddTag}
          onClick={(e) => e.stopPropagation()}
          className="mt-2"
        >
          <div className="flex gap-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="New tag..."
              className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-2 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingTag(false);
                setNewTag('');
              }}
              className="px-2 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

interface PatchGridProps {
  patches: {
    id: string;
    name: string;
    tags: string[];
    favorited: boolean;
    selected: boolean;
  }[];
  onToggleFavorite: (id: string) => void;
  onSelect: (id: string) => void;
  onTagRemove: (id: string, tag: string) => void;
  onTagAdd: (id: string, tag: string) => void;
}

export function PatchGrid({
  patches,
  onToggleFavorite,
  onSelect,
  onTagRemove,
  onTagAdd
}: PatchGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {patches.map((patch) => (
        <PatchCard
          key={patch.id}
          name={patch.name}
          tags={patch.tags}
          favorited={patch.favorited}
          selected={patch.selected}
          onToggleFavorite={() => onToggleFavorite(patch.id)}
          onSelect={() => onSelect(patch.id)}
          onTagRemove={(tag) => onTagRemove(patch.id, tag)}
          onTagAdd={(tag) => onTagAdd(patch.id, tag)}
        />
      ))}
    </div>
  );
} 