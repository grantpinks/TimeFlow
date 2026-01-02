'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { EmailCategoryConfig } from '@/lib/api';

type Props = {
  categories: EmailCategoryConfig[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
};

export function CategoryPills({ categories, selectedCategoryId, onSelectCategory }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  const enabledCategories = useMemo(
    () => (Array.isArray(categories) ? categories.filter((category) => category.enabled) : []),
    [categories]
  );

  return (
    <div className="flex flex-col gap-2 -ml-1" data-testid="label-key-wrapper">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="inline-flex h-10 items-center gap-2 px-1 text-xs uppercase tracking-[0.2em] text-[#0BAF9A] transition-all duration-200 hover:text-[#0a9c89] translate-y-[2px]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Hide labels' : 'Show labels'}
      >
        <span className="font-semibold">Label key</span>
        <span className="text-[10px] text-[#666]">
          ({enabledCategories.length})
        </span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </motion.span>
      </button>

      <motion.div
        data-testid="category-pills"
        initial={false}
        animate={isExpanded ? 'open' : 'collapsed'}
        variants={{
          open: { height: 'auto', opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
          collapsed: { height: 0, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
        }}
        className="overflow-hidden"
        aria-hidden={!isExpanded}
      >
        <motion.div
          animate={{ y: isExpanded ? 0 : -6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center gap-2 flex-wrap pb-1"
        >
          {enabledCategories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                onSelectCategory(selectedCategoryId === category.id ? null : category.id)
              }
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all border-2 ${
                selectedCategoryId === category.id
                  ? 'border-[#1a1a1a]'
                  : 'border-transparent hover:border-[#e0e0e0]'
              }`}
              style={{
                backgroundColor:
                  selectedCategoryId === category.id
                    ? category.color
                    : `${category.color}20`,
                color: selectedCategoryId === category.id ? '#1a1a1a' : category.color,
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {category.emoji && <span className="mr-1.5">{category.emoji}</span>}
              {category.name}
            </button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
