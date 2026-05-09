"use client";

import { createContext, useContext } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { ShowForm } from "lib/redux/settingsSlice";
import { cn } from "lib/utils";

type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

const DragHandleContext = createContext<DragHandleProps | null>(null);

export function useDragHandle() {
  return useContext(DragHandleContext);
}

export function SortableSectionWrapper({
  form,
  children,
}: {
  form: ShowForm;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: form });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <DragHandleContext.Provider value={{ attributes, listeners }}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(isDragging && "z-10 opacity-90")}
      >
        {children}
      </div>
    </DragHandleContext.Provider>
  );
}
