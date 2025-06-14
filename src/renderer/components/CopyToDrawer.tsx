import React from 'react';
import { Dialog } from '@headlessui/react';
import clsx from 'clsx';

interface CopyToDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  libraries: string[];
  selectedLibrary: string;
  selectedBank: string;
  slots: {
    index: number;
    occupied: boolean;
    selected: boolean;
  }[];
  onLibraryChange: (value: string) => void;
  onBankChange: (value: string) => void;
  onSlotToggle: (index: number) => void;
  onConfirm: () => void;
}

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
}: CopyToDrawerProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 w-96 bg-white p-6 shadow-lg overflow-y-auto">
        <Dialog.Title className="text-lg font-semibold mb-4 text-gray-900">
          Copy to...
        </Dialog.Title>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Library
            </label>
            <select
              value={selectedLibrary}
              onChange={(e) => onLibraryChange(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900"
            >
              {libraries.map((lib) => (
                <option key={lib} value={lib}>
                  {lib}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Bank
            </label>
            <select
              value={selectedBank}
              onChange={(e) => onBankChange(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900"
            >
              {[...Array(16)].map((_, i) => (
                <option key={i} value={`Bank ${i + 1}`}>
                  Bank {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patch Slots
            </label>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.index}
                  disabled={slot.occupied && !slot.selected}
                  onClick={() => onSlotToggle(slot.index)}
                  className={clsx(
                    'p-2 border rounded text-sm',
                    slot.occupied && !slot.selected
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : slot.selected
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {slot.index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 