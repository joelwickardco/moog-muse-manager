import React, { useState } from 'react';

interface AccordionItemProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

interface AccordionProps {
  children: React.ReactNode;
  defaultOpenIndex?: number;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-gray-700">
      <button
        className="w-full px-4 py-3 text-left bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-200">{title}</span>
          <svg
            className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 bg-gray-900">{children}</div>
      </div>
    </div>
  );
};

export const Accordion: React.FC<AccordionProps> = ({ children, defaultOpenIndex = 0 }) => {
  const [openIndex, setOpenIndex] = useState<number>(defaultOpenIndex);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <div className="w-full">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement<AccordionItemProps>(child)) {
          return React.cloneElement(child, {
            isOpen: index === openIndex,
            onToggle: () => handleToggle(index),
          });
        }
        return child;
      })}
    </div>
  );
};

export const AccordionItemWrapper: React.FC<Omit<AccordionItemProps, 'isOpen' | 'onToggle'>> = (props) => {
  return <AccordionItem {...props} isOpen={false} onToggle={() => {}} />;
}; 