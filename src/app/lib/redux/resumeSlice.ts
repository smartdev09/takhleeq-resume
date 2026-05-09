import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "lib/redux/store";
import type {
  FeaturedSkill,
  Resume,
  ResumeAward,
  ResumeCertification,
  ResumeEducation,
  ResumeInterest,
  ResumeProfile,
  ResumeProject,
  ResumePublication,
  ResumeSkills,
  ResumeVolunteering,
  ResumeWorkExperience,
} from "lib/redux/types";
import type { ShowForm } from "lib/redux/settingsSlice";

export const initialProfile: ResumeProfile = {
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  phone: "",
  linkedin: "",
  website: "",
  summary: "",
  city: "",
  state: "",
  country: "",
};

export const initialCertification: ResumeCertification = {
  name: "",
  issuer: "",
  date: "",
};

export const initialAward: ResumeAward = {
  title: "",
  description: "",
  date: "",
};

export const initialPublication: ResumePublication = {
  title: "",
  authors: "",
  venue: "",
  date: "",
};

export const initialVolunteering: ResumeVolunteering = {
  organization: "",
  role: "",
  date: "",
  descriptions: [],
};

export const initialInterest: ResumeInterest = {
  commaSeparated: "",
  bullets: [],
  tags: [],
};

export const initialWorkExperience: ResumeWorkExperience = {
  company: "",
  jobTitle: "",
  date: "",
  descriptions: [],
};

export const initialEducation: ResumeEducation = {
  school: "",
  degree: "",
  gpa: "",
  date: "",
  descriptions: [],
};

export const initialProject: ResumeProject = {
  project: "",
  date: "",
  descriptions: [],
};

export const initialFeaturedSkill: FeaturedSkill = { skill: "", rating: 4 };
export const initialFeaturedSkills: FeaturedSkill[] = Array.from(
  { length: 6 },
  () => ({ ...initialFeaturedSkill })
);
export const initialSkills: ResumeSkills = {
  featuredSkills: initialFeaturedSkills,
  descriptions: [],
};

export const initialCustom = {
  descriptions: [],
};

export const initialResumeState: Resume = {
  profile: initialProfile,
  workExperiences: [initialWorkExperience],
  educations: [initialEducation],
  projects: [initialProject],
  skills: initialSkills,
  certifications: [initialCertification],
  awards: [initialAward],
  publications: [initialPublication],
  volunteering: [initialVolunteering],
  interests: initialInterest,
  custom: initialCustom,
};

// Keep the field & value type in sync with CreateHandleChangeArgsWithDescriptions (components\ResumeForm\types.ts)
export type CreateChangeActionWithDescriptions<T> = {
  idx: number;
} & (
  | {
      field: Exclude<keyof T, "descriptions">;
      value: string;
    }
  | { field: "descriptions"; value: string[] }
);

export const resumeSlice = createSlice({
  name: "resume",
  initialState: initialResumeState,
  reducers: {
    changeProfile: (
      draft,
      action: PayloadAction<{ field: keyof ResumeProfile; value: string }>
    ) => {
      const { field, value } = action.payload;
      draft.profile[field] = value;
    },
    changeWorkExperiences: (
      draft,
      action: PayloadAction<
        CreateChangeActionWithDescriptions<ResumeWorkExperience>
      >
    ) => {
      const { idx, field, value } = action.payload;
      const workExperience = draft.workExperiences[idx];
      workExperience[field] = value as any;
    },
    changeEducations: (
      draft,
      action: PayloadAction<CreateChangeActionWithDescriptions<ResumeEducation>>
    ) => {
      const { idx, field, value } = action.payload;
      const education = draft.educations[idx];
      education[field] = value as any;
    },
    changeProjects: (
      draft,
      action: PayloadAction<CreateChangeActionWithDescriptions<ResumeProject>>
    ) => {
      const { idx, field, value } = action.payload;
      const project = draft.projects[idx];
      project[field] = value as any;
    },
    changeSkills: (
      draft,
      action: PayloadAction<
        | { field: "descriptions"; value: string[] }
        | {
            field: "featuredSkills";
            idx: number;
            skill: string;
            rating: number;
          }
      >
    ) => {
      const { field } = action.payload;
      if (field === "descriptions") {
        const { value } = action.payload;
        draft.skills.descriptions = value;
      } else {
        const { idx, skill, rating } = action.payload;
        const featuredSkill = draft.skills.featuredSkills[idx];
        featuredSkill.skill = skill;
        featuredSkill.rating = rating;
      }
    },
    changeCustom: (
      draft,
      action: PayloadAction<{ field: "descriptions"; value: string[] }>
    ) => {
      const { value } = action.payload;
      draft.custom.descriptions = value;
    },
    changeCertifications: (
      draft,
      action: PayloadAction<
        | { idx: number; field: keyof ResumeCertification; value: string }
        | { idx: number; field: "url"; value: string }
      >
    ) => {
      const { idx, field, value } = action.payload;
      const cert = draft.certifications[idx];
      if (cert) (cert as Record<string, unknown>)[field] = value;
    },
    changeAwards: (
      draft,
      action: PayloadAction<{
        idx: number;
        field: keyof ResumeAward;
        value: string;
      }>
    ) => {
      const { idx, field, value } = action.payload;
      const award = draft.awards[idx];
      if (award) award[field] = value;
    },
    changePublications: (
      draft,
      action: PayloadAction<
        | { idx: number; field: keyof ResumePublication; value: string }
        | { idx: number; field: "link"; value: string }
      >
    ) => {
      const { idx, field, value } = action.payload;
      const pub = draft.publications[idx];
      if (pub) (pub as Record<string, unknown>)[field] = value;
    },
    changeVolunteering: (
      draft,
      action: PayloadAction<
        CreateChangeActionWithDescriptions<ResumeVolunteering>
      >
    ) => {
      const { idx, field, value } = action.payload;
      const vol = draft.volunteering[idx];
      if (vol) (vol as Record<string, unknown>)[field] = value;
    },
    changeInterests: (
      draft,
      action: PayloadAction<{
        field: keyof ResumeInterest;
        value: string | string[];
      }>
    ) => {
      const { field, value } = action.payload;
      draft.interests[field] = value as never;
    },
    addSectionInForm: (draft, action: PayloadAction<{ form: ShowForm }>) => {
      const { form } = action.payload;
      switch (form) {
        case "workExperiences":
          draft.workExperiences.push(structuredClone(initialWorkExperience));
          break;
        case "educations":
          draft.educations.push(structuredClone(initialEducation));
          break;
        case "projects":
          draft.projects.push(structuredClone(initialProject));
          break;
        case "certifications":
          draft.certifications.push(structuredClone(initialCertification));
          break;
        case "awards":
          draft.awards.push(structuredClone(initialAward));
          break;
        case "publications":
          draft.publications.push(structuredClone(initialPublication));
          break;
        case "volunteering":
          draft.volunteering.push(structuredClone(initialVolunteering));
          break;
        default:
          break;
      }
    },
    moveSectionInForm: (
      draft,
      action: PayloadAction<{
        form: ShowForm;
        idx: number;
        direction: "up" | "down";
      }>
    ) => {
      const { form, idx, direction } = action.payload;
      const listForms: ShowForm[] = [
        "workExperiences",
        "educations",
        "projects",
        "certifications",
        "awards",
        "publications",
        "volunteering",
      ];
      if (listForms.includes(form)) {
        const arr = draft[form] as unknown[];
        if (
          (idx === 0 && direction === "up") ||
          (idx === arr.length - 1 && direction === "down")
        ) {
          return draft;
        }
        const section = arr[idx];
        if (direction === "up") {
          arr[idx] = arr[idx - 1];
          arr[idx - 1] = section;
        } else {
          arr[idx] = arr[idx + 1];
          arr[idx + 1] = section;
        }
      }
    },
    deleteSectionInFormByIdx: (
      draft,
      action: PayloadAction<{ form: ShowForm; idx: number }>
    ) => {
      const { form, idx } = action.payload;
      const listForms: ShowForm[] = [
        "workExperiences",
        "educations",
        "projects",
        "certifications",
        "awards",
        "publications",
        "volunteering",
      ];
      if (listForms.includes(form)) {
        (draft[form] as unknown[]).splice(idx, 1);
      }
    },
    setResume: (draft, action: PayloadAction<Resume>) => {
      return action.payload;
    },
  },
});

export const {
  changeProfile,
  changeWorkExperiences,
  changeEducations,
  changeProjects,
  changeSkills,
  changeCertifications,
  changeAwards,
  changePublications,
  changeVolunteering,
  changeInterests,
  changeCustom,
  addSectionInForm,
  moveSectionInForm,
  deleteSectionInFormByIdx,
  setResume,
} = resumeSlice.actions;

export const selectResume = (state: RootState) => state.resume;
export const selectProfile = (state: RootState) => state.resume.profile;
export const selectWorkExperiences = (state: RootState) =>
  state.resume.workExperiences;
export const selectEducations = (state: RootState) => state.resume.educations;
export const selectProjects = (state: RootState) => state.resume.projects;
export const selectSkills = (state: RootState) => state.resume.skills;
export const selectCertifications = (state: RootState) =>
  state.resume.certifications;
export const selectAwards = (state: RootState) => state.resume.awards;
export const selectPublications = (state: RootState) =>
  state.resume.publications;
export const selectVolunteering = (state: RootState) =>
  state.resume.volunteering;
export const selectInterests = (state: RootState) => state.resume.interests;
export const selectCustom = (state: RootState) => state.resume.custom;

export default resumeSlice.reducer;
