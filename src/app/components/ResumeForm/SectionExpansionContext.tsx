"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ShowForm } from "lib/redux/settingsSlice";

export type SectionId = ShowForm | "profile";

type SectionExpansionContextValue = {
  expandedSections: Set<SectionId>;
  toggleSection: (id: SectionId) => void;
  isExpanded: (id: SectionId) => boolean;
};

const SectionExpansionContext = createContext<SectionExpansionContextValue | null>(null);

export function SectionExpansionProvider({ children }: { children: ReactNode }) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set());

  const toggleSection = useCallback((id: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isExpanded = useCallback(
    (id: SectionId) => expandedSections.has(id),
    [expandedSections]
  );

  return (
    <SectionExpansionContext.Provider
      value={{ expandedSections, toggleSection, isExpanded }}
    >
      {children}
    </SectionExpansionContext.Provider>
  );
}

export function useSectionExpansion() {
  const ctx = useContext(SectionExpansionContext);
  if (!ctx) return null;
  return ctx;
}
