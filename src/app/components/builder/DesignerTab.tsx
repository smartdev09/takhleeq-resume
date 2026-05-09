"use client";

import { useWindowManager } from "os/context/use-window-manager";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import {
  changeSettings,
  changeInterestsDisplayMode,
  changeShowForm,
  changeSidebarFormIds,
  toggleAtsSafeMode,
  selectSettings,
  setSettings,
  initialSettings,
  DEFAULT_THEME_COLOR,
  type GeneralSetting,
  type SkillsLayout,
  type BulletStyle,
  type Settings,
} from "lib/redux/settingsSlice";
import { setFormOrder } from "lib/redux/settingsSlice";
import { THEME_COLORS as THEME_COLORS_LIST } from "components/ResumeForm/ThemeForm/constants";
import {
  FontFamilySelectionsCSR,
  FontSizeSelections,
  DocumentSizeSelections,
} from "components/ResumeForm/ThemeForm/Selection";
import type { FontFamily } from "components/fonts/constants";
import { Input } from "components/ui/input";
import { Select } from "components/ui/select";
import { CollapsibleSection } from "components/ui/collapsible-section";
import { cn } from "lib/utils";
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { RESUME_TEMPLATES, type ResumeTemplate } from "lib/mock/templates-data";
import { TemplateThumbnail } from "components/dashboard/TemplateCards";

const LAYOUT_LABELS: Record<string, string> = {
  single: "Single",
  "two-column": "Two-col",
  mixed: "Mixed",
};

const DATE_FORMAT_OPTIONS = [
  { value: "MM/YYYY", label: "MM/YYYY" },
  { value: "MMM YYYY", label: "MMM YYYY" },
  { value: "Month YYYY", label: "Month YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
];

const SKILLS_LAYOUT_OPTIONS: { value: SkillsLayout; label: string }[] = [
  { value: "categoryInline", label: "Category + inline" },
  { value: "commaSeparated", label: "Comma-separated" },
  { value: "categoryColumns", label: "Category + columns" },
];

const INTERESTS_OPTIONS = [
  { value: "comma", label: "Comma-separated" },
  { value: "bullets", label: "Bullet list" },
  { value: "tags", label: "Tags" },
];

const BULLET_OPTIONS: { value: BulletStyle; label: string }[] = [
  { value: "•", label: "•" },
  { value: "-", label: "−" },
  { value: "»", label: "»" },
  { value: "→", label: "→" },
];

function FieldRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <label className="shrink-0 text-[13px] text-gray-600">{label}</label>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function applyTemplateDesign(
  template: ResumeTemplate,
  current: Settings
): Settings {
  const ts = template.settings;
  return {
    ...current,
    templateId: ts.templateId ?? current.templateId,
    themeColor: ts.themeColor ?? current.themeColor,
    fontFamily: ts.fontFamily ?? current.fontFamily,
    fontSize: ts.fontSize ?? current.fontSize,
    lineHeight: ts.lineHeight ?? current.lineHeight,
    listLineHeight: ts.listLineHeight ?? current.listLineHeight,
    dateFormat: ts.dateFormat ?? current.dateFormat,
    bulletStyle: (ts.bulletStyle as BulletStyle) ?? current.bulletStyle,
    skillsLayout: (ts.skillsLayout as SkillsLayout) ?? current.skillsLayout,
    skillsColumns: ts.skillsColumns ?? current.skillsColumns,
    marginLeftRight: ts.marginLeftRight ?? current.marginLeftRight,
    marginTopBottom: ts.marginTopBottom ?? current.marginTopBottom,
    formToShow: ts.formToShow ?? current.formToShow,
    formsOrder: ts.formsOrder ?? current.formsOrder,
    sidebarFormIds: ts.sidebarFormIds ?? current.sidebarFormIds,
    interestsDisplayMode: ts.interestsDisplayMode ?? current.interestsDisplayMode,
  };
}

function isTemplateDesignActive(
  template: ResumeTemplate,
  settings: Settings
): boolean {
  const ts = template.settings;
  return (
    (ts.templateId ?? "single") === settings.templateId &&
    (ts.themeColor ?? DEFAULT_THEME_COLOR) === settings.themeColor &&
    (ts.fontFamily ?? "Arial") === settings.fontFamily
  );
}

export function DesignerTab() {
  const settings = useAppSelector(selectSettings);
  const dispatch = useAppDispatch();
  const { controls } = useWindowManager();
  const themeColor = settings.themeColor || DEFAULT_THEME_COLOR;

  const handleSettingsChange = (field: GeneralSetting, value: string) => {
    dispatch(changeSettings({ field, value }));
  };

  const handleApplyTemplate = (template: ResumeTemplate) => {
    const newSettings = applyTemplateDesign(template, settings);
    dispatch(setSettings(newSettings));
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="px-4 pb-1 pt-4">
        <h2 className="text-base font-semibold text-gray-900">Designer</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Pick a template or fine-tune styling below.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* ── Templates ── */}
        <CollapsibleSection title="Templates">
          <div className="grid grid-cols-3 gap-2">
            {RESUME_TEMPLATES.map((template) => {
              const active = isTemplateDesignActive(template, settings);
              const layoutId = template.settings.templateId ?? "single";
              const isAtsRisky = template.atsRating === "risky";
              const isDisabledByAtsMode =
                settings.atsSafeMode &&
                (layoutId === "two-column" || layoutId === "mixed");
              return (
                <button
                  key={template.id}
                  type="button"
                  disabled={isDisabledByAtsMode}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border-2 text-left transition-all",
                    active
                      ? "border-brand shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm",
                    isDisabledByAtsMode && "cursor-not-allowed opacity-40"
                  )}
                  onClick={() => !isDisabledByAtsMode && handleApplyTemplate(template)}
                  aria-pressed={active}
                  title={isAtsRisky ? `${template.name} — ATS risk` : template.name}
                >
                  <TemplateThumbnail
                    template={template}
                    className="rounded-t-[5px]"
                  />
                  <div className="px-1.5 py-1.5">
                    <span
                      className={cn(
                        "block truncate text-[10px] font-semibold leading-tight",
                        active ? "text-brand" : "text-gray-800"
                      )}
                    >
                      {template.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="block text-[9px] capitalize text-gray-400">
                        {LAYOUT_LABELS[layoutId] ?? "Single"}
                      </span>
                      {isAtsRisky && (
                        <span className="text-[8px] font-medium text-red-500">(ATS risk)</span>
                      )}
                    </div>
                  </div>
                  {active && (
                    <CheckIcon className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full bg-brand p-0.5 text-white" />
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() =>
              controls.openWindow({ appId: "templates", focusIfExists: true })
            }
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
          >
            Browse all templates
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </button>
        </CollapsibleSection>

        {/* ── Styling ── */}
        <CollapsibleSection title="Styling">
          <div className="space-y-4">
            {/* ATS Safe Mode */}
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <div className="min-w-0">
                <span className="block text-[13px] font-medium text-green-800">ATS Safe Mode</span>
                <span className="block text-[11px] text-green-600">
                  Disables multi-column layouts and risky bullet styles
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.atsSafeMode}
                onClick={() => dispatch(toggleAtsSafeMode())}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                  settings.atsSafeMode ? "bg-green-600" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                    settings.atsSafeMode ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
            {/* Accent Color */}
            <div>
              <FieldRow label="Accent Color">
                <div className="relative">
                  <span
                    className="absolute left-2 top-1/2 inline-block h-3 w-3 -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: themeColor }}
                  />
                  <input
                    type="text"
                    value={settings.themeColor}
                    placeholder={DEFAULT_THEME_COLOR}
                    onChange={(e) =>
                      handleSettingsChange("themeColor", e.target.value)
                    }
                    className="h-8 w-28 rounded-md border border-gray-300 pl-7 pr-2 text-xs font-medium text-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  />
                </div>
              </FieldRow>
              <div
                className="mt-2 flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label="Theme color"
              >
                {THEME_COLORS_LIST.map((color, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md text-[10px] text-white transition-transform hover:scale-110",
                      settings.themeColor === color && "ring-2 ring-offset-1 ring-gray-400"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handleSettingsChange("themeColor", color)}
                    aria-pressed={settings.themeColor === color}
                    aria-label={`Color ${color}`}
                  >
                    {settings.themeColor === color ? "✓" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="mb-1.5 block text-[13px] text-gray-600">
                Font Family
              </label>
              <FontFamilySelectionsCSR
                selectedFontFamily={settings.fontFamily}
                themeColor={themeColor}
                handleSettingsChange={handleSettingsChange}
              />
            </div>

            {/* Font Size */}
            <div>
              <FieldRow label="Font Size">
                <input
                  type="text"
                  value={settings.fontSize}
                  onChange={(e) =>
                    handleSettingsChange("fontSize", e.target.value)
                  }
                  className="h-8 w-14 rounded-md border border-gray-300 text-center text-xs font-medium text-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                />
                <span className="text-[11px] text-gray-400">pt</span>
              </FieldRow>
              <div className="mt-1.5">
                <FontSizeSelections
                  fontFamily={settings.fontFamily as FontFamily}
                  themeColor={themeColor}
                  selectedFontSize={settings.fontSize}
                  handleSettingsChange={handleSettingsChange}
                />
              </div>
            </div>

            {/* Line Heights */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px] text-gray-600">
                  Line Height
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={100}
                    max={200}
                    value={settings.lineHeight}
                    onChange={(e) =>
                      handleSettingsChange("lineHeight", e.target.value)
                    }
                    className="h-8 w-full text-xs"
                  />
                  <span className="shrink-0 text-[11px] text-gray-400">%</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[13px] text-gray-600">
                  List Line Height
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={100}
                    max={200}
                    value={settings.listLineHeight}
                    onChange={(e) =>
                      handleSettingsChange("listLineHeight", e.target.value)
                    }
                    className="h-8 w-full text-xs"
                  />
                  <span className="shrink-0 text-[11px] text-gray-400">%</span>
                </div>
              </div>
            </div>

            {/* Date Format & Bullet Style */}
            <div>
              <label className="mb-1 block text-[13px] text-gray-600">
                Date Format
              </label>
              <Select
                value={settings.dateFormat}
                onChange={(e) =>
                  handleSettingsChange("dateFormat", e.target.value)
                }
                options={DATE_FORMAT_OPTIONS}
                className="h-8 max-w-none text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-[13px] text-gray-600">
                Bullet Style
              </label>
              <div className="flex flex-wrap gap-1.5">
                {BULLET_OPTIONS.map((opt) => {
                  const isRisky = opt.value === "→" || opt.value === "»";
                  const isSelected = settings.bulletStyle === opt.value;
                  const isDisabled = settings.atsSafeMode && isRisky;
                  return (
                    <div key={opt.value} className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        disabled={isDisabled}
                        className={cn(
                          "flex h-8 w-10 items-center justify-center rounded-md border text-base transition-colors",
                          isSelected
                            ? "border-brand bg-brand/10 font-semibold text-brand"
                            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50",
                          isDisabled && "cursor-not-allowed opacity-40"
                        )}
                        onClick={() =>
                          !isDisabled && handleSettingsChange("bulletStyle", opt.value)
                        }
                        aria-pressed={isSelected}
                        title={isRisky ? `${opt.value} — ATS risk` : opt.value}
                      >
                        {opt.label}
                      </button>
                      {isSelected && isRisky && (
                        <span className="text-[9px] font-medium text-red-500">(ATS risk)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Layout & Alignment ── */}
        <CollapsibleSection title="Layout & Alignment">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[13px] text-gray-600">
                Skills Layout
              </label>
              <Select
                value={settings.skillsLayout}
                onChange={(e) =>
                  handleSettingsChange(
                    "skillsLayout",
                    e.target.value as SkillsLayout
                  )
                }
                options={SKILLS_LAYOUT_OPTIONS}
                className="h-8 max-w-none text-xs"
              />
            </div>

            <FieldRow label="Skills Columns">
              <Input
                type="number"
                min={1}
                max={4}
                value={settings.skillsColumns}
                onChange={(e) =>
                  handleSettingsChange("skillsColumns", e.target.value)
                }
                className="h-8 w-16 text-center text-xs"
              />
            </FieldRow>

            <div>
              <label className="mb-1 block text-[13px] text-gray-600">
                Interests Display
              </label>
              <Select
                value={settings.interestsDisplayMode}
                onChange={(e) =>
                  dispatch(
                    changeInterestsDisplayMode({
                      mode: e.target.value as "comma" | "bullets" | "tags",
                    })
                  )
                }
                options={INTERESTS_OPTIONS}
                className="h-8 max-w-none text-xs"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Page Setup ── */}
        <CollapsibleSection title="Page Setup">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[13px] text-gray-600">
                Paper Size
              </label>
              <DocumentSizeSelections
                themeColor={themeColor}
                selectedDocumentSize={settings.documentSize}
                handleSettingsChange={handleSettingsChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px] text-gray-600">
                  Margin L/R
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.25}
                    value={settings.marginLeftRight}
                    onChange={(e) =>
                      handleSettingsChange("marginLeftRight", e.target.value)
                    }
                    className="h-8 w-full text-xs"
                  />
                  <span className="shrink-0 text-[11px] text-gray-400">in</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[13px] text-gray-600">
                  Margin T/B
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.25}
                    value={settings.marginTopBottom}
                    onChange={(e) =>
                      handleSettingsChange("marginTopBottom", e.target.value)
                    }
                    className="h-8 w-full text-xs"
                  />
                  <span className="shrink-0 text-[11px] text-gray-400">in</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
