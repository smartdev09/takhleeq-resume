"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  useAppDispatch,
  useAppSelector,
} from "lib/redux/hooks";
import {
  ShowForm,
  selectFormsOrder,
  selectFormToShow,
  selectFormToHeading,
  changeShowForm,
  setFormOrder,
} from "lib/redux/settingsSlice";
import { ProfileForm } from "components/ResumeForm/ProfileForm";
import { WorkExperiencesForm } from "components/ResumeForm/WorkExperiencesForm";
import { EducationsForm } from "components/ResumeForm/EducationsForm";
import { ProjectsForm } from "components/ResumeForm/ProjectsForm";
import { SkillsForm } from "components/ResumeForm/SkillsForm";
import { CertificationsForm } from "components/ResumeForm/CertificationsForm";
import { AwardsForm } from "components/ResumeForm/AwardsForm";
import { PublicationsForm } from "components/ResumeForm/PublicationsForm";
import { VolunteeringForm } from "components/ResumeForm/VolunteeringForm";
import { InterestsForm } from "components/ResumeForm/InterestsForm";
import { CustomForm } from "components/ResumeForm/CustomForm";
import { SortableSectionWrapper } from "components/ResumeForm/SortableSectionWrapper";
import { SectionExpansionProvider } from "components/ResumeForm/SectionExpansionContext";
import { PlusSmallIcon } from "@heroicons/react/24/outline";
import { cn } from "lib/utils";

const formTypeToComponent: { [type in ShowForm]: React.ComponentType } = {
  workExperiences: WorkExperiencesForm,
  educations: EducationsForm,
  projects: ProjectsForm,
  skills: SkillsForm,
  certifications: CertificationsForm,
  awards: AwardsForm,
  publications: PublicationsForm,
  volunteering: VolunteeringForm,
  interests: InterestsForm,
  custom: CustomForm,
};

function AddSectionButton() {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const formsOrder = useAppSelector(selectFormsOrder);
  const formToShow = useAppSelector(selectFormToShow);
  const formToHeading = useAppSelector(selectFormToHeading);
  const containerRef = useRef<HTMLDivElement>(null);

  const hiddenForms = formsOrder.filter((f) => !formToShow[f]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (hiddenForms.length === 0) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Add a new section to your resume"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
        onClick={() => setOpen(!open)}
      >
        <PlusSmallIcon className="h-5 w-5" aria-hidden="true" />
        Add Section
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          {hiddenForms.map((form) => (
            <button
              key={form}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                dispatch(changeShowForm({ field: form, value: true }));
                setOpen(false);
              }}
            >
              <PlusSmallIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
              {formToHeading[form]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const ResumeForm = () => {
  const dispatch = useAppDispatch();
  const formsOrder = useAppSelector(selectFormsOrder);
  const formToShow = useAppSelector(selectFormToShow);

  const visibleForms = formsOrder.filter((f) => formToShow[f]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = formsOrder.indexOf(active.id as ShowForm);
    const newIndex = formsOrder.indexOf(over.id as ShowForm);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(formsOrder, oldIndex, newIndex);
    dispatch(setFormOrder({ formIds: newOrder }));
  };

  return (
    <div>
      <div className="flex flex-col gap-3 p-4">
        <SectionExpansionProvider>
          <ProfileForm />
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleForms} strategy={verticalListSortingStrategy}>
              {visibleForms.map((form) => {
                const Component = formTypeToComponent[form];
                return (
                  <SortableSectionWrapper key={form} form={form}>
                    <Component />
                  </SortableSectionWrapper>
                );
              })}
            </SortableContext>
          </DndContext>
          <AddSectionButton />
        </SectionExpansionProvider>
      </div>
    </div>
  );
};
