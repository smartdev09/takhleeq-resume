export const DASHBOARD_ACTIONS = [
  {
    id: "new-resume",
    title: "New Resume",
    icon: "plus",
    iconClassName: "bg-app-muted text-brand",
    href: "/resume-builder",
  },
  {
    id: "job-description",
    title: "Start from job description",
    icon: "briefcase",
    iconClassName: "bg-[#dfe2fb] text-[#3d4db7]",
    href: "/resume-builder",
  },
  {
    id: "template",
    title: "Start from template",
    icon: "wand",
    iconClassName: "bg-[#f7dfe3] text-[#9f2f4a]",
    href: "/dashboard/templates",
  },
  {
    id: "cover-letter",
    title: "New Cover Letter",
    icon: "newspaper",
    iconClassName: "bg-[#f8f2d5] text-[#9d7600]",
    href: "/resume-builder",
  },
] as const;

export const MOCK_RESUMES = [
  {
    id: "resume-1",
    title: "Untitled Resume",
    editedAt: "03/02/2026",
  },
  {
    id: "resume-2",
    title: "Untitled Resume",
    editedAt: "03/02/2026",
  },
  {
    id: "resume-3",
    title: "Untitled Resume",
    editedAt: "06/03/2025",
  },
  {
    id: "resume-4",
    title: "Untitled Resume",
    editedAt: "05/29/2025",
  },
  {
    id: "resume-5",
    title: "my resume - 2024-05-23 03:29:43",
    editedAt: "05/23/2024",
  },
] as const;
