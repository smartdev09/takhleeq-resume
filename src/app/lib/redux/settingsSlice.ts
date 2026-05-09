import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "lib/redux/store";

export type TemplateId = "single" | "two-column" | "mixed";
export type SkillsLayout = "categoryInline" | "commaSeparated" | "categoryColumns";
export type BulletStyle = "•" | "-" | "»" | "→";

export interface Settings {
  themeColor: string;
  fontFamily: string;
  fontSize: string;
  documentSize: string;
  templateId: TemplateId;
  lineHeight: string;
  listLineHeight: string;
  dateFormat: string;
  skillsLayout: SkillsLayout;
  skillsColumns: string;
  marginLeftRight: string;
  marginTopBottom: string;
  bulletStyle: BulletStyle;
  formToShow: {
    workExperiences: boolean;
    educations: boolean;
    projects: boolean;
    skills: boolean;
    certifications: boolean;
    awards: boolean;
    publications: boolean;
    volunteering: boolean;
    interests: boolean;
    custom: boolean;
  };
  formToHeading: {
    workExperiences: string;
    educations: string;
    projects: string;
    skills: string;
    certifications: string;
    awards: string;
    publications: string;
    volunteering: string;
    interests: string;
    custom: string;
  };
  formsOrder: ShowForm[];
  showBulletPoints: {
    educations: boolean;
    projects: boolean;
    skills: boolean;
    volunteering: boolean;
    custom: boolean;
  };
  sidebarFormIds: ShowForm[];
  interestsDisplayMode: "comma" | "bullets" | "tags";
  atsSafeMode: boolean;
}

export type ShowForm = keyof Settings["formToShow"];
export type FormWithBulletPoints = keyof Settings["showBulletPoints"];
export type GeneralSetting = Exclude<
  keyof Settings,
  | "formToShow"
  | "formToHeading"
  | "formsOrder"
  | "showBulletPoints"
  | "sidebarFormIds"
  | "interestsDisplayMode"
  | "atsSafeMode"
>;

export const DEFAULT_THEME_COLOR = "#3a7a74";
export const DEFAULT_FONT_FAMILY = "Arial";
export const DEFAULT_FONT_SIZE = "11"; // text-base https://tailwindcss.com/docs/font-size
export const DEFAULT_FONT_COLOR = "#000000";

export const initialSettings: Settings = {
  themeColor: DEFAULT_THEME_COLOR,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: DEFAULT_FONT_SIZE,
  documentSize: "Letter",
  templateId: "single",
  lineHeight: "140",
  listLineHeight: "130",
  dateFormat: "MM/YYYY",
  skillsLayout: "categoryInline",
  skillsColumns: "2",
  marginLeftRight: "0.5",
  marginTopBottom: "0.5",
  bulletStyle: "•",
  formToShow: {
    workExperiences: true,
    educations: true,
    projects: true,
    skills: true,
    certifications: false,
    awards: false,
    publications: false,
    volunteering: false,
    interests: false,
    custom: true,
  },
  formToHeading: {
    workExperiences: "WORK EXPERIENCE",
    educations: "EDUCATION",
    projects: "PROJECT",
    skills: "SKILLS",
    certifications: "CERTIFICATIONS",
    awards: "AWARDS & SCHOLARSHIPS",
    publications: "PUBLICATIONS",
    volunteering: "VOLUNTEERING & LEADERSHIP",
    interests: "INTERESTS",
    custom: "CUSTOM SECTION",
  },
  formsOrder: [
    "workExperiences",
    "projects",
    "educations",
    "skills",
    "custom",
    "certifications",
    "awards",
    "publications",
    "volunteering",
    "interests",
  ],
  showBulletPoints: {
    educations: true,
    projects: true,
    skills: true,
    volunteering: true,
    custom: true,
  },
  sidebarFormIds: ["skills"],
  interestsDisplayMode: "comma",
  atsSafeMode: false,
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState: initialSettings,
  reducers: {
    changeSettings: (
      draft,
      action: PayloadAction<{ field: GeneralSetting; value: string }>
    ) => {
      const { field, value } = action.payload;
      (draft as Record<string, unknown>)[field] = value;
    },
    changeShowForm: (
      draft,
      action: PayloadAction<{ field: ShowForm; value: boolean }>
    ) => {
      const { field, value } = action.payload;
      draft.formToShow[field] = value;
    },
    changeFormHeading: (
      draft,
      action: PayloadAction<{ field: ShowForm; value: string }>
    ) => {
      const { field, value } = action.payload;
      draft.formToHeading[field] = value;
    },
    changeFormOrder: (
      draft,
      action: PayloadAction<{ form: ShowForm; type: "up" | "down" }>
    ) => {
      const { form, type } = action.payload;
      const lastIdx = draft.formsOrder.length - 1;
      const pos = draft.formsOrder.indexOf(form);
      const newPos = type === "up" ? pos - 1 : pos + 1;
      const swapFormOrder = (idx1: number, idx2: number) => {
        const temp = draft.formsOrder[idx1];
        draft.formsOrder[idx1] = draft.formsOrder[idx2];
        draft.formsOrder[idx2] = temp;
      };
      if (newPos >= 0 && newPos <= lastIdx) {
        swapFormOrder(pos, newPos);
      }
    },
    setFormOrder: (draft, action: PayloadAction<{ formIds: ShowForm[] }>) => {
      draft.formsOrder = action.payload.formIds;
    },
    changeShowBulletPoints: (
      draft,
      action: PayloadAction<{
        field: FormWithBulletPoints;
        value: boolean;
      }>
    ) => {
      const { field, value } = action.payload;
      draft["showBulletPoints"][field] = value;
    },
    changeSidebarFormIds: (
      draft,
      action: PayloadAction<{ formIds: ShowForm[] }>
    ) => {
      draft.sidebarFormIds = action.payload.formIds;
    },
    changeInterestsDisplayMode: (
      draft,
      action: PayloadAction<{ mode: "comma" | "bullets" | "tags" }>
    ) => {
      draft.interestsDisplayMode = action.payload.mode;
    },
    toggleAtsSafeMode: (draft) => {
      draft.atsSafeMode = !draft.atsSafeMode;
    },
    setSettings: (draft, action: PayloadAction<Settings>) => {
      return action.payload;
    },
  },
});

export const {
  changeSettings,
  changeShowForm,
  changeFormHeading,
  changeFormOrder,
  setFormOrder,
  changeShowBulletPoints,
  changeSidebarFormIds,
  changeInterestsDisplayMode,
  toggleAtsSafeMode,
  setSettings,
} = settingsSlice.actions;

export const selectSettings = (state: RootState) => state.settings;
export const selectThemeColor = (state: RootState) => state.settings.themeColor;

export const selectFormToShow = (state: RootState) => state.settings.formToShow;
export const selectShowByForm = (form: ShowForm) => (state: RootState) =>
  state.settings.formToShow[form];

export const selectFormToHeading = (state: RootState) =>
  state.settings.formToHeading;
export const selectHeadingByForm = (form: ShowForm) => (state: RootState) =>
  state.settings.formToHeading[form];

export const selectFormsOrder = (state: RootState) => state.settings.formsOrder;
export const selectIsFirstForm = (form: ShowForm) => (state: RootState) =>
  state.settings.formsOrder[0] === form;
export const selectIsLastForm = (form: ShowForm) => (state: RootState) =>
  state.settings.formsOrder[state.settings.formsOrder.length - 1] === form;

export const selectShowBulletPoints =
  (form: FormWithBulletPoints) => (state: RootState) =>
    state.settings.showBulletPoints[form];

export default settingsSlice.reducer;
