// PatchCard.tsx
import { HeartIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

export function PatchCard({
  name,
  tags,
  favorited,
  selected,
  onToggleFavorite,
  onSelect,
  onTagRemove
}: {
  name: string;
  tags: string[];
  favorited: boolean;
  selected: boolean;
  onToggleFavorite: () => void;
  onSelect: () => void;
  onTagRemove: (tag: string) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'relative p-4 border rounded-md cursor-pointer hover:shadow-md',
        selected ? 'ring-2 ring-blue-500' : 'border-gray-300'
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
            favorited ? 'text-red-500 fill-current' : 'text-gray-300'
          )}
        />
      </button>
      <div className="font-medium mb-2">{name}</div>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-gray-200 text-xs px-2 py-1 rounded-full flex items-center"
          >
            {tag}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTagRemove(tag);
              }}
              className="ml-1 text-gray-500 text-sm"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// PatchGrid.tsx
import { PatchCard } from './PatchCard';

export function PatchGrid({
  patches,
  onToggleFavorite,
  onSelect,
  onTagRemove
}: {
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
}) {
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
        />
      ))}
    </div>
  );
}

// CopyToDrawer.tsx
import { Dialog } from '@headlessui/react';

export function CopyToDrawer({
  isOpen,
  onClose,
  libraries,
  selectedLibrary,
  selectedBank,
  slots,
  onLibraryChange,
  onBankChange,
  onSlotToggle,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  libraries: string[];
  selectedLibrary: string;
  selectedBank: string;
  slots: { index: number; occupied: boolean; selected: boolean }[];
  onLibraryChange: (value: string) => void;
  onBankChange: (value: string) => void;
  onSlotToggle: (index: number) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-30" />
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white p-6 shadow-lg overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Copy to...</h2>
        <div className="mb-4">
          <label className="block mb-1">Destination Library</label>
          <select
            value={selectedLibrary}
            onChange={(e) => onLibraryChange(e.target.value)}
            className="w-full border p-2 rounded"
          >
            {libraries.map((lib) => (
              <option key={lib}>{lib}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block mb-1">Destination Bank</label>
          <select
            value={selectedBank}
            onChange={(e) => onBankChange(e.target.value)}
            className="w-full border p-2 rounded"
          >
            {[...Array(16)].map((_, i) => (
              <option key={i} value={`Bank ${i + 1}`}>{`Bank ${i + 1}`}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {slots.map((slot) => (
            <button
              key={slot.index}
              disabled={slot.occupied && !slot.selected}
              onClick={() => onSlotToggle(slot.index)}
              className={clsx(
                'p-2 border rounded text-sm',
                slot.occupied ? 'bg-gray-200 text-gray-400' : '',
                slot.selected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
              )}
            >
              {slot.index + 1}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </Dialog>
  );
}
