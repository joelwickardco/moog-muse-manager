import React from 'react';
import { Menu } from '@headlessui/react';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface AppMenuProps {
  onImportLibrary: () => void;
  onExportLibrary: () => void;
}

export const AppMenu: React.FC<AppMenuProps> = ({ onImportLibrary, onExportLibrary }) => {
  return (
    <div className="absolute top-4 right-4">
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
          <Bars3Icon className="w-5 h-5" aria-hidden="true" />
        </Menu.Button>

        <Menu.Items className="absolute right-0 w-56 mt-2 origin-top-right bg-gray-800 divide-y divide-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }: { active: boolean }) => (
                <button
                  onClick={onImportLibrary}
                  className={`${
                    active ? 'bg-gray-700 text-white' : 'text-gray-200'
                  } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                  Import Library
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }: { active: boolean }) => (
                <button
                  onClick={onExportLibrary}
                  className={`${
                    active ? 'bg-gray-700 text-white' : 'text-gray-200'
                  } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                  Export Library
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Menu>
    </div>
  );
}; 