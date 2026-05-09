import { SectionCard } from "components/ui/section-card";
import { CollapsibleSection } from "components/ui/collapsible-section";
import { DropdownMenu, DropdownMenuItem } from "components/ui/dropdown-menu";
import {
  DeleteIconButton,
  MoveIconButton,
} from "components/ResumeForm/Form/IconButton";
import { useSectionExpansion } from "components/ResumeForm/SectionExpansionContext";
import { useDragHandle } from "components/ResumeForm/SortableSectionWrapper";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import {
  changeFormHeading,
  changeFormOrder,
  changeShowForm,
  selectHeadingByForm,
  selectIsFirstForm,
  selectIsLastForm,
  ShowForm,
} from "lib/redux/settingsSlice";
import {
  PlusSmallIcon,
  EllipsisHorizontalIcon,
  EyeSlashIcon,
  ArrowSmallUpIcon,
  ArrowSmallDownIcon,
  Bars2Icon,
} from "@heroicons/react/24/outline";
import {
  addSectionInForm,
  deleteSectionInFormByIdx,
  moveSectionInForm,
} from "lib/redux/resumeSlice";
import { IconButton } from "components/Button";
import { Button } from "components/ui/button";
import { cn } from "lib/utils";

export { SectionCard as BaseForm };

function DragGrip() {
  const dragHandle = useDragHandle();
  if (!dragHandle) return null;

  return (
    <button
      type="button"
      className="flex touch-none cursor-grab items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...dragHandle.attributes}
      {...dragHandle.listeners}
    >
      <Bars2Icon className="h-4 w-4" />
    </button>
  );
}

function SectionOptionsMenu({ form }: { form: ShowForm }) {
  const dispatch = useAppDispatch();
  const isFirstForm = useAppSelector(selectIsFirstForm(form));
  const isLastForm = useAppSelector(selectIsLastForm(form));

  return (
    <DropdownMenu
      trigger={
        <IconButton tooltipText="Section options" size="small">
          <EllipsisHorizontalIcon
            className="h-5 w-5 text-gray-500"
            aria-hidden="true"
          />
          <span className="sr-only">Options</span>
        </IconButton>
      }
    >
      {!isFirstForm && (
        <DropdownMenuItem
          icon={ArrowSmallUpIcon}
          onClick={() => dispatch(changeFormOrder({ form, type: "up" }))}
        >
          Move section up
        </DropdownMenuItem>
      )}
      {!isLastForm && (
        <DropdownMenuItem
          icon={ArrowSmallDownIcon}
          onClick={() => dispatch(changeFormOrder({ form, type: "down" }))}
        >
          Move section down
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        icon={EyeSlashIcon}
        onClick={() =>
          dispatch(changeShowForm({ field: form, value: false }))
        }
      >
        Remove section
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

export const Form = ({
  form,
  addButtonText,
  children,
}: {
  form: ShowForm;
  addButtonText?: string;
  children: React.ReactNode;
}) => {
  const expansion = useSectionExpansion();
  const isExpandedInEditor = expansion ? expansion.isExpanded(form) : true;

  const heading = useAppSelector(selectHeadingByForm(form));

  const dispatch = useAppDispatch();
  const setHeading = (heading: string) => {
    dispatch(changeFormHeading({ field: form, value: heading }));
  };

  const actions = (
    <>
      {addButtonText && (
        <IconButton
          onClick={() => dispatch(addSectionInForm({ form }))}
          tooltipText={`Add ${addButtonText.toLowerCase()}`}
          size="small"
        >
          <PlusSmallIcon
            className="h-5 w-5 text-gray-500"
            aria-hidden="true"
          />
          <span className="sr-only">Add</span>
        </IconButton>
      )}
      <SectionOptionsMenu form={form} />
    </>
  );

  return (
    <SectionCard className="p-3">
      <CollapsibleSection
        title={heading}
        expanded={isExpandedInEditor}
        onToggle={() => expansion?.toggleSection(form)}
        renderTitle={() => (
          <input
            type="text"
            className="block w-full border-b border-transparent text-sm font-semibold leading-6 text-gray-900 outline-none hover:border-gray-300 focus:border-gray-300"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        leading={<DragGrip />}
        actions={actions}
        className="border-b-0"
      >
        {children}
        {addButtonText && (
          <div className="mt-3 flex justify-start">
            <Button
              size="sm"
              onClick={() => dispatch(addSectionInForm({ form }))}
            >
              <PlusSmallIcon className="h-4 w-4" aria-hidden="true" />
              {addButtonText}
            </Button>
          </div>
        )}
      </CollapsibleSection>
    </SectionCard>
  );
};

export const FormSection = ({
  form,
  idx,
  showMoveUp,
  showMoveDown,
  showDelete,
  deleteButtonTooltipText,
  children,
}: {
  form: ShowForm;
  idx: number;
  showMoveUp: boolean;
  showMoveDown: boolean;
  showDelete: boolean;
  deleteButtonTooltipText: string;
  children: React.ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const handleDeleteClick = () => {
    if (
      window.confirm(
        `Delete this ${deleteButtonTooltipText.toLowerCase().replace("delete ", "")}? This cannot be undone.`
      )
    ) {
      dispatch(deleteSectionInFormByIdx({ form, idx }));
    }
  };
  const handleMoveClick = (direction: "up" | "down") => {
    dispatch(moveSectionInForm({ form, direction, idx }));
  };

  return (
    <>
      {idx !== 0 && (
        <div className="mb-3 mt-4 border-t-2 border-dotted border-gray-200" />
      )}
      <div className="relative grid grid-cols-6 gap-3">
        {children}
        <div className="absolute right-0 top-0 flex gap-0.5">
          <div
            className={cn(
              "transition-all duration-300",
              !showMoveUp && "invisible opacity-0",
              !showMoveDown && "-mr-6"
            )}
          >
            <MoveIconButton
              type="up"
              size="small"
              onClick={() => handleMoveClick("up")}
            />
          </div>
          <div
            className={cn(
              "transition-all duration-300",
              !showMoveDown && "invisible opacity-0"
            )}
          >
            <MoveIconButton
              type="down"
              size="small"
              onClick={() => handleMoveClick("down")}
            />
          </div>
          <div
            className={cn(
              "transition-all duration-300",
              !showDelete && "invisible opacity-0"
            )}
          >
            <DeleteIconButton
              onClick={handleDeleteClick}
              tooltipText={deleteButtonTooltipText}
            />
          </div>
        </div>
      </div>
    </>
  );
};
