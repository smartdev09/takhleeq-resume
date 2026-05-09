import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "lib/redux/store";

export interface ResumeListItem {
  id: string;
  name: string;
  updatedAt: string;
  atsScore?: number;
}

interface ResumesState {
  resumes: ResumeListItem[];
  currentResumeId: string | null;
  status: "idle" | "loading" | "error";
}

const initialState: ResumesState = {
  resumes: [],
  currentResumeId: null,
  status: "idle",
};

export const resumesSlice = createSlice({
  name: "resumes",
  initialState,
  reducers: {
    setResumes: (state, action: PayloadAction<ResumeListItem[]>) => {
      state.resumes = action.payload;
    },
    addResume: (state, action: PayloadAction<ResumeListItem>) => {
      state.resumes.unshift(action.payload);
    },
    removeResume: (state, action: PayloadAction<string>) => {
      state.resumes = state.resumes.filter((r) => r.id !== action.payload);
    },
    updateResumeMeta: (
      state,
      action: PayloadAction<Partial<ResumeListItem> & { id: string }>
    ) => {
      const idx = state.resumes.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        state.resumes[idx] = { ...state.resumes[idx], ...action.payload };
      }
    },
    setCurrentResumeId: (state, action: PayloadAction<string | null>) => {
      state.currentResumeId = action.payload;
    },
    setResumesStatus: (
      state,
      action: PayloadAction<ResumesState["status"]>
    ) => {
      state.status = action.payload;
    },
  },
});

export const {
  setResumes,
  addResume,
  removeResume,
  updateResumeMeta,
  setCurrentResumeId,
  setResumesStatus,
} = resumesSlice.actions;

export const selectResumes = (state: RootState) => state.resumes.resumes;
export const selectCurrentResumeId = (state: RootState) =>
  state.resumes.currentResumeId;
export const selectResumesStatus = (state: RootState) => state.resumes.status;

export default resumesSlice.reducer;
