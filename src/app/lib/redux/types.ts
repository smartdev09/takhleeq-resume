export interface ResumeProfile {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  github?: string;
  city: string;
  state: string;
  country?: string;
  summary: string;
}

export interface ResumeWorkExperience {
  company: string;
  jobTitle: string;
  date: string;
  descriptions: string[];
}

export interface ResumeEducation {
  school: string;
  degree: string;
  date: string;
  gpa: string;
  descriptions: string[];
}

export interface ResumeProject {
  project: string;
  date: string;
  descriptions: string[];
}

export interface FeaturedSkill {
  skill: string;
  rating: number;
}

export interface ResumeSkills {
  featuredSkills: FeaturedSkill[];
  descriptions: string[];
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface ResumeAward {
  title: string;
  description: string;
  date: string;
}

export interface ResumePublication {
  title: string;
  authors: string;
  venue: string;
  date: string;
  link?: string;
}

export interface ResumeVolunteering {
  organization: string;
  role: string;
  date: string;
  descriptions: string[];
}

export interface ResumeInterest {
  commaSeparated: string;
  bullets: string[];
  tags: string[];
}

export interface ResumeCustom {
  descriptions: string[];
}

export interface Resume {
  profile: ResumeProfile;
  workExperiences: ResumeWorkExperience[];
  educations: ResumeEducation[];
  projects: ResumeProject[];
  skills: ResumeSkills;
  certifications: ResumeCertification[];
  awards: ResumeAward[];
  publications: ResumePublication[];
  volunteering: ResumeVolunteering[];
  interests: ResumeInterest;
  custom: ResumeCustom;
}

export type ResumeKey = keyof Resume;
