import type { Resume } from "lib/redux/types";
import type { Settings } from "lib/redux/settingsSlice";

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  category: "professional" | "modern" | "creative" | "minimal" | "academic";
  accentColor: string;
  atsRating: "safe" | "moderate" | "risky";
  resume: Resume;
  settings: Partial<Settings>;
}

const PROFESSIONAL_RESUME: Resume = {
  profile: {
    firstName: "Sarah",
    lastName: "Mitchell",
    title: "Senior Marketing Manager",
    email: "sarah.mitchell@email.com",
    phone: "(555) 234-5678",
    linkedin: "linkedin.com/in/sarahmitchell",
    website: "",
    city: "Chicago",
    state: "IL",
    summary:
      "Results-driven marketing manager with 8+ years of experience leading cross-functional teams and executing data-driven campaigns. Proven track record of increasing brand awareness by 45% and driving $2M+ in annual revenue through strategic digital initiatives.",
  },
  workExperiences: [
    {
      company: "Apex Digital Solutions",
      jobTitle: "Senior Marketing Manager",
      date: "Jan 2021 - Present",
      descriptions: [
        "Lead a team of 12 marketers across content, paid media, and brand strategy verticals",
        "Increased organic traffic by 65% year-over-year through SEO-optimized content strategy",
        "Managed $1.2M annual marketing budget, achieving 3.5x return on ad spend",
        "Launched company rebrand initiative resulting in 40% improvement in brand recognition scores",
      ],
    },
    {
      company: "BrightWave Marketing",
      jobTitle: "Marketing Manager",
      date: "Mar 2018 - Dec 2020",
      descriptions: [
        "Developed and executed multi-channel campaigns across email, social, and paid media",
        "Grew email subscriber list from 15K to 85K with a 28% open rate",
        "Partnered with sales team to create lead nurture workflows that increased conversion by 22%",
      ],
    },
    {
      company: "Creativehaus Agency",
      jobTitle: "Marketing Coordinator",
      date: "Jun 2016 - Feb 2018",
      descriptions: [
        "Managed social media accounts for 8 client brands with combined 500K+ followers",
        "Coordinated product launch campaigns with PR, design, and development teams",
      ],
    },
  ],
  educations: [
    {
      school: "Northwestern University",
      degree: "MBA, Marketing Concentration",
      date: "May 2016",
      gpa: "3.8",
      descriptions: [],
    },
    {
      school: "University of Michigan",
      degree: "Bachelor of Arts in Communications",
      date: "May 2014",
      gpa: "3.6",
      descriptions: [],
    },
  ],
  projects: [],
  skills: {
    featuredSkills: [
      { skill: "Digital Strategy", rating: 5 },
      { skill: "SEO/SEM", rating: 5 },
      { skill: "Data Analytics", rating: 4 },
      { skill: "Brand Management", rating: 5 },
      { skill: "Team Leadership", rating: 4 },
      { skill: "Budget Management", rating: 4 },
    ],
    descriptions: [
      "Tools: Google Analytics, HubSpot, Salesforce, Tableau, Adobe Creative Suite",
      "Platforms: Meta Ads, Google Ads, LinkedIn Campaign Manager, Mailchimp",
    ],
  },
  certifications: [
    {
      name: "Google Analytics Professional Certificate",
      issuer: "Google",
      date: "2022",
    },
    {
      name: "HubSpot Inbound Marketing Certification",
      issuer: "HubSpot",
      date: "2021",
    },
  ],
  awards: [],
  publications: [],
  volunteering: [],
  interests: { commaSeparated: "", bullets: [], tags: [] },
  custom: { descriptions: [] },
};

const MODERN_RESUME: Resume = {
  profile: {
    firstName: "James",
    lastName: "Chen",
    title: "Full Stack Developer",
    email: "james.chen@email.com",
    phone: "(555) 987-6543",
    linkedin: "linkedin.com/in/jameschen",
    website: "jameschen.dev",
    github: "github.com/jameschen",
    city: "San Francisco",
    state: "CA",
    summary:
      "Full stack developer with 5 years of experience building scalable web applications. Passionate about clean architecture, developer experience, and shipping products that users love.",
  },
  workExperiences: [
    {
      company: "Streamline Technologies",
      jobTitle: "Senior Full Stack Developer",
      date: "Aug 2022 - Present",
      descriptions: [
        "Architected and built a real-time collaboration platform serving 50K+ daily active users using React, Node.js, and WebSockets",
        "Reduced API response times by 60% through query optimization and Redis caching layer",
        "Mentored 4 junior developers and established code review standards for the engineering team",
        "Led migration from monolithic architecture to microservices, improving deployment frequency by 3x",
      ],
    },
    {
      company: "DataPulse Inc.",
      jobTitle: "Full Stack Developer",
      date: "Jun 2020 - Jul 2022",
      descriptions: [
        "Built data visualization dashboards using React and D3.js for enterprise analytics platform",
        "Designed and implemented RESTful APIs handling 10M+ requests per day using Express and PostgreSQL",
        "Implemented CI/CD pipeline with GitHub Actions, reducing deployment time from 45 minutes to 8 minutes",
      ],
    },
    {
      company: "NovaTech Solutions",
      jobTitle: "Junior Developer",
      date: "Jan 2019 - May 2020",
      descriptions: [
        "Developed responsive front-end components using React and TypeScript",
        "Contributed to open-source internal component library used across 5 product teams",
      ],
    },
  ],
  educations: [
    {
      school: "UC Berkeley",
      degree: "B.S. Computer Science",
      date: "May 2019",
      gpa: "3.7",
      descriptions: [],
    },
  ],
  projects: [
    {
      project: "DevBoard — Developer Dashboard",
      date: "2023",
      descriptions: [
        "Built an open-source developer productivity dashboard with GitHub, Jira, and Slack integrations",
        "700+ GitHub stars, featured in JavaScript Weekly newsletter",
      ],
    },
    {
      project: "QuickDeploy CLI",
      date: "2022",
      descriptions: [
        "Created a CLI tool for zero-config deployments to AWS and GCP",
        "Used by 200+ developers, published to npm with 5K+ weekly downloads",
      ],
    },
  ],
  skills: {
    featuredSkills: [
      { skill: "React / Next.js", rating: 5 },
      { skill: "TypeScript", rating: 5 },
      { skill: "Node.js", rating: 5 },
      { skill: "PostgreSQL", rating: 4 },
      { skill: "AWS / GCP", rating: 4 },
      { skill: "Docker / K8s", rating: 4 },
    ],
    descriptions: [
      "Languages: TypeScript, JavaScript, Python, Go, SQL",
      "Frontend: React, Next.js, Vue.js, Tailwind CSS, D3.js",
      "Backend: Node.js, Express, FastAPI, GraphQL",
      "Infrastructure: AWS, GCP, Docker, Kubernetes, Terraform, GitHub Actions",
    ],
  },
  certifications: [
    {
      name: "AWS Solutions Architect — Associate",
      issuer: "Amazon Web Services",
      date: "2023",
    },
  ],
  awards: [],
  publications: [],
  volunteering: [],
  interests: { commaSeparated: "", bullets: [], tags: [] },
  custom: { descriptions: [] },
};

const CREATIVE_RESUME: Resume = {
  profile: {
    firstName: "Maya",
    lastName: "Rodriguez",
    title: "UX/UI Designer",
    email: "maya.rodriguez@email.com",
    phone: "(555) 345-6789",
    linkedin: "linkedin.com/in/mayarodriguez",
    website: "mayarod.design",
    city: "Austin",
    state: "TX",
    summary:
      "Award-winning UX/UI designer with 6 years of experience crafting intuitive digital experiences for startups and enterprise clients. Specializing in design systems, user research, and bridging the gap between design and development.",
  },
  workExperiences: [
    {
      company: "PixelCraft Studios",
      jobTitle: "Lead UX/UI Designer",
      date: "Mar 2022 - Present",
      descriptions: [
        "Lead design for a B2B SaaS platform used by 200+ enterprise clients, improving task completion rates by 35%",
        "Built and maintained a comprehensive design system with 120+ components in Figma",
        "Conducted 50+ user interviews and usability tests to drive data-informed design decisions",
        "Collaborated with engineering to implement a component library in React, ensuring design-to-code fidelity",
      ],
    },
    {
      company: "Luminary Digital",
      jobTitle: "UX Designer",
      date: "Sep 2019 - Feb 2022",
      descriptions: [
        "Redesigned onboarding flow for a fintech app, reducing drop-off rate by 42%",
        "Created wireframes, prototypes, and high-fidelity mockups for mobile and web applications",
        "Established design critique sessions and mentored 2 junior designers",
      ],
    },
    {
      company: "Freelance",
      jobTitle: "UI Designer",
      date: "Jan 2018 - Aug 2019",
      descriptions: [
        "Designed branding and web experiences for 15+ clients across tech, healthcare, and e-commerce",
        "Delivered responsive websites achieving an average 95+ Lighthouse accessibility score",
      ],
    },
  ],
  educations: [
    {
      school: "Rhode Island School of Design",
      degree: "BFA, Graphic Design",
      date: "May 2018",
      gpa: "",
      descriptions: [],
    },
  ],
  projects: [
    {
      project: "AccessFirst Design Toolkit",
      date: "2023",
      descriptions: [
        "Created an open-source accessibility-focused design toolkit for Figma with 8K+ installs",
        "Featured on Product Hunt with 500+ upvotes",
      ],
    },
  ],
  skills: {
    featuredSkills: [
      { skill: "Figma", rating: 5 },
      { skill: "User Research", rating: 5 },
      { skill: "Design Systems", rating: 5 },
      { skill: "Prototyping", rating: 4 },
      { skill: "HTML / CSS", rating: 4 },
      { skill: "Accessibility", rating: 5 },
    ],
    descriptions: [
      "Design: Figma, Sketch, Adobe XD, Illustrator, After Effects",
      "Research: UserTesting, Maze, Hotjar, Optimal Workshop",
      "Development: HTML, CSS, Tailwind, React basics, Storybook",
    ],
  },
  certifications: [],
  awards: [
    {
      title: "Webby Award — Best UX Design",
      description: "For redesign of HealthTrack patient portal",
      date: "2023",
    },
  ],
  publications: [],
  volunteering: [
    {
      organization: "Design for Good",
      role: "Volunteer Designer",
      date: "2020 - Present",
      descriptions: [
        "Provide pro-bono design services for nonprofits focused on education and social justice",
      ],
    },
  ],
  interests: {
    commaSeparated:
      "Typography, Illustration, Street Art, Ceramics, Hiking",
    bullets: [],
    tags: [],
  },
  custom: { descriptions: [] },
};

const MINIMAL_RESUME: Resume = {
  profile: {
    firstName: "David",
    lastName: "Park",
    title: "Financial Analyst",
    email: "david.park@email.com",
    phone: "(555) 876-5432",
    linkedin: "linkedin.com/in/davidpark",
    website: "",
    city: "New York",
    state: "NY",
    summary:
      "Detail-oriented financial analyst with 4 years of experience in investment banking and corporate finance. Expertise in financial modeling, valuation, and strategic analysis.",
  },
  workExperiences: [
    {
      company: "Goldman Sachs",
      jobTitle: "Financial Analyst",
      date: "Jul 2022 - Present",
      descriptions: [
        "Build financial models and perform DCF, comparable company, and precedent transaction analyses for M&A advisory engagements",
        "Supported 3 successful transactions totaling $4.2B in deal value",
        "Prepare client presentations and investment committee memoranda for senior management review",
      ],
    },
    {
      company: "Deloitte",
      jobTitle: "Analyst, Financial Advisory",
      date: "Aug 2020 - Jun 2022",
      descriptions: [
        "Conducted due diligence and financial analysis for private equity and corporate clients",
        "Developed valuation models for 12+ engagements across technology and healthcare sectors",
        "Automated recurring reporting workflows using Python, saving 15+ hours per week",
      ],
    },
  ],
  educations: [
    {
      school: "New York University — Stern School of Business",
      degree: "B.S. Finance, Minor in Data Science",
      date: "May 2020",
      gpa: "3.9",
      descriptions: ["Dean's List all semesters, Beta Gamma Sigma Honor Society"],
    },
  ],
  projects: [],
  skills: {
    featuredSkills: [
      { skill: "Financial Modeling", rating: 5 },
      { skill: "Valuation", rating: 5 },
      { skill: "Excel / VBA", rating: 5 },
      { skill: "Python", rating: 4 },
      { skill: "Bloomberg", rating: 4 },
      { skill: "SQL", rating: 3 },
    ],
    descriptions: [
      "Technical: Excel, VBA, Python, SQL, Bloomberg Terminal, Capital IQ, FactSet",
      "Certifications in progress: CFA Level III Candidate (Jun 2026)",
    ],
  },
  certifications: [
    {
      name: "Financial Modeling & Valuation Analyst (FMVA)",
      issuer: "Corporate Finance Institute",
      date: "2021",
    },
  ],
  awards: [],
  publications: [],
  volunteering: [],
  interests: { commaSeparated: "", bullets: [], tags: [] },
  custom: { descriptions: [] },
};

const EXECUTIVE_RESUME: Resume = {
  profile: {
    firstName: "Catherine",
    lastName: "Blackwell",
    title: "VP of Product",
    email: "c.blackwell@email.com",
    phone: "(555) 654-3210",
    linkedin: "linkedin.com/in/catherineblackwell",
    website: "",
    city: "Seattle",
    state: "WA",
    summary:
      "Seasoned product leader with 12+ years of experience scaling SaaS products from 0-to-1 and 1-to-N. Led teams of 40+ across product, design, and analytics to deliver platforms serving 5M+ users. Track record of driving $50M+ ARR growth through customer-centric product strategy.",
  },
  workExperiences: [
    {
      company: "CloudScale (Series D, $800M valuation)",
      jobTitle: "VP of Product",
      date: "Jan 2021 - Present",
      descriptions: [
        "Own product strategy and roadmap for a cloud infrastructure platform with $120M ARR",
        "Grew product organization from 15 to 42 members across 6 cross-functional squads",
        "Launched enterprise tier generating $28M in net-new ARR within first 12 months",
        "Established OKR framework and product analytics practice, improving feature adoption by 55%",
      ],
    },
    {
      company: "Zenith Software",
      jobTitle: "Director of Product Management",
      date: "Apr 2017 - Dec 2020",
      descriptions: [
        "Led product strategy for a project management SaaS platform with 2M+ active users",
        "Drove 3x growth in annual contract value through tiered pricing and packaging strategy",
        "Partnered with engineering to reduce time-to-market for new features by 40%",
        "Mentored 8 product managers and established career ladders for the PM organization",
      ],
    },
    {
      company: "TechVentures Inc.",
      jobTitle: "Senior Product Manager",
      date: "Jun 2013 - Mar 2017",
      descriptions: [
        "Launched a developer tools product from concept to $8M ARR in 2 years",
        "Conducted market research and competitive analysis to inform go-to-market strategy",
        "Built strong cross-functional partnerships with sales, marketing, and customer success",
      ],
    },
  ],
  educations: [
    {
      school: "Stanford University",
      degree: "MBA",
      date: "Jun 2013",
      gpa: "",
      descriptions: [],
    },
    {
      school: "MIT",
      degree: "B.S. Computer Science",
      date: "Jun 2009",
      gpa: "",
      descriptions: [],
    },
  ],
  projects: [],
  skills: {
    featuredSkills: [
      { skill: "Product Strategy", rating: 5 },
      { skill: "Team Leadership", rating: 5 },
      { skill: "Data-Driven PM", rating: 5 },
      { skill: "Go-to-Market", rating: 5 },
      { skill: "Stakeholder Mgmt", rating: 5 },
      { skill: "Technical Acumen", rating: 4 },
    ],
    descriptions: [
      "Methodologies: Agile, Lean, Jobs-to-be-Done, Design Thinking",
      "Tools: Amplitude, Mixpanel, Jira, Productboard, Looker, Figma",
    ],
  },
  certifications: [],
  awards: [
    {
      title: "Top 25 Product Leaders — Product School",
      description: "",
      date: "2023",
    },
  ],
  publications: [],
  volunteering: [],
  interests: { commaSeparated: "", bullets: [], tags: [] },
  custom: { descriptions: [] },
};

const ACADEMIC_RESUME: Resume = {
  profile: {
    firstName: "Dr. Priya",
    lastName: "Sharma",
    title: "Assistant Professor of Computer Science",
    email: "p.sharma@university.edu",
    phone: "(555) 432-1098",
    linkedin: "linkedin.com/in/priyasharma-cs",
    website: "priyasharma.cs.edu",
    city: "Boston",
    state: "MA",
    summary:
      "Computer science researcher specializing in natural language processing and machine learning. Published 18 peer-reviewed papers with 1,200+ citations. Passionate about advancing AI fairness and mentoring the next generation of researchers.",
  },
  workExperiences: [
    {
      company: "Boston University",
      jobTitle: "Assistant Professor, Computer Science",
      date: "Aug 2021 - Present",
      descriptions: [
        "Teach graduate courses in NLP, Machine Learning, and Deep Learning (avg. rating 4.8/5)",
        "Lead the Computational Linguistics Lab with 6 PhD students and 4 MS researchers",
        "Secured $1.2M in NSF funding for research on bias detection in large language models",
      ],
    },
    {
      company: "Google Research",
      jobTitle: "Research Scientist (Postdoc)",
      date: "Sep 2019 - Jul 2021",
      descriptions: [
        "Developed novel attention mechanisms for multilingual NLP models, improving cross-lingual transfer by 18%",
        "Published 5 papers at top-tier venues (ACL, EMNLP, NeurIPS)",
        "Collaborated with Google Translate team on low-resource language support",
      ],
    },
  ],
  educations: [
    {
      school: "Carnegie Mellon University",
      degree: "Ph.D. Computer Science (NLP)",
      date: "Aug 2019",
      gpa: "",
      descriptions: [
        "Dissertation: 'Robust Cross-Lingual Transfer Learning for Low-Resource Languages'",
        "Advisor: Prof. Robert Thompson",
      ],
    },
    {
      school: "IIT Delhi",
      degree: "B.Tech Computer Science",
      date: "May 2014",
      gpa: "9.2/10",
      descriptions: [],
    },
  ],
  projects: [],
  skills: {
    featuredSkills: [
      { skill: "NLP", rating: 5 },
      { skill: "Deep Learning", rating: 5 },
      { skill: "PyTorch", rating: 5 },
      { skill: "Python", rating: 5 },
      { skill: "Research Design", rating: 5 },
      { skill: "Grant Writing", rating: 4 },
    ],
    descriptions: [
      "Research: NLP, Machine Learning, AI Fairness, Multilingual Models, Transfer Learning",
      "Programming: Python, PyTorch, TensorFlow, JAX, C++, R",
      "Tools: Hugging Face, Weights & Biases, LaTeX, Git",
    ],
  },
  certifications: [],
  awards: [
    {
      title: "Best Paper Award — ACL 2023",
      description:
        "For 'FairLens: Detecting and Mitigating Bias in Multilingual LLMs'",
      date: "2023",
    },
    {
      title: "Outstanding Dissertation Award — CMU SCS",
      description: "",
      date: "2019",
    },
  ],
  publications: [
    {
      title:
        "FairLens: Detecting and Mitigating Bias in Multilingual LLMs",
      authors: "P. Sharma, A. Martinez, L. Chen",
      venue: "ACL 2023",
      date: "2023",
    },
    {
      title: "Cross-Lingual Transfer with Adapter Networks",
      authors: "P. Sharma, K. Liu",
      venue: "EMNLP 2022",
      date: "2022",
    },
    {
      title: "Low-Resource NLP: A Survey and Benchmark",
      authors: "P. Sharma, R. Thompson, J. Kim",
      venue: "NeurIPS 2021",
      date: "2021",
    },
  ],
  volunteering: [
    {
      organization: "Women in Machine Learning (WiML)",
      role: "Workshop Co-Chair",
      date: "2022 - Present",
      descriptions: [
        "Organize annual workshop at NeurIPS with 300+ attendees",
      ],
    },
  ],
  interests: {
    commaSeparated: "AI Ethics, Science Communication, Classical Piano, Rock Climbing",
    bullets: [],
    tags: [],
  },
  custom: { descriptions: [] },
};

const CAREER_CHANGE_RESUME: Resume = {
  profile: {
    firstName: "Alex",
    lastName: "Thompson",
    title: "Product Designer (Career Transition)",
    email: "alex.thompson@email.com",
    phone: "(555) 765-4321",
    linkedin: "linkedin.com/in/alexthompson",
    website: "alexthompson.design",
    city: "Denver",
    state: "CO",
    summary:
      "Former high school teacher transitioning into product design, bringing 6 years of curriculum design, user empathy, and communication expertise. Completed Google UX Design Certificate and built a portfolio of 4 end-to-end case studies demonstrating research-driven design thinking.",
  },
  workExperiences: [
    {
      company: "Freelance / Portfolio Projects",
      jobTitle: "Product Designer",
      date: "Jun 2025 - Present",
      descriptions: [
        "Designed a meal planning app (MealPrep Pro) from user research through high-fidelity prototypes, conducting 12 user interviews and 3 rounds of usability testing",
        "Redesigned the checkout flow for a local e-commerce store, reducing cart abandonment by 25% in A/B testing",
        "Created a community platform concept for teachers, featuring responsive design and an accessible component library",
      ],
    },
    {
      company: "Denver Public Schools",
      jobTitle: "High School English Teacher",
      date: "Aug 2019 - May 2025",
      descriptions: [
        "Designed engaging curriculum for 150+ students across 4 class sections, iterating based on student feedback",
        "Led workshops on digital literacy and educational technology for 30+ faculty members",
        "Used data analysis to identify student learning gaps and personalize instruction, improving test scores by 18%",
      ],
    },
  ],
  educations: [
    {
      school: "Google UX Design Professional Certificate",
      degree: "UX Design",
      date: "2025",
      gpa: "",
      descriptions: [],
    },
    {
      school: "University of Colorado Boulder",
      degree: "B.A. English Education",
      date: "May 2019",
      gpa: "3.7",
      descriptions: [],
    },
  ],
  projects: [
    {
      project: "MealPrep Pro — Meal Planning App",
      date: "2025",
      descriptions: [
        "Full case study: research, personas, user flows, wireframes, prototyping, and usability testing",
        "Designed for accessibility (WCAG 2.1 AA) with a focus on diverse dietary needs",
      ],
    },
    {
      project: "TeacherConnect — Community Platform",
      date: "2025",
      descriptions: [
        "Designed a peer mentorship platform for educators with scheduling, messaging, and resource sharing",
        "Built interactive prototype in Figma with 40+ screens and a responsive design system",
      ],
    },
  ],
  skills: {
    featuredSkills: [
      { skill: "Figma", rating: 4 },
      { skill: "User Research", rating: 4 },
      { skill: "Wireframing", rating: 4 },
      { skill: "Prototyping", rating: 4 },
      { skill: "Communication", rating: 5 },
      { skill: "Curriculum Design", rating: 5 },
    ],
    descriptions: [
      "Design: Figma, Adobe XD, FigJam, Miro, Whimsical",
      "Research: User Interviews, Surveys, Usability Testing, Affinity Mapping",
      "Transferable: Public Speaking, Workshop Facilitation, Data-Driven Iteration, Stakeholder Communication",
    ],
  },
  certifications: [
    {
      name: "Google UX Design Professional Certificate",
      issuer: "Google / Coursera",
      date: "2025",
    },
  ],
  awards: [],
  publications: [],
  volunteering: [
    {
      organization: "Code.org",
      role: "Volunteer Instructor",
      date: "2021 - Present",
      descriptions: [
        "Teach introductory coding workshops for underserved high school students",
      ],
    },
  ],
  interests: {
    commaSeparated: "Design Thinking, EdTech, Accessibility, Hiking, Photography",
    bullets: [],
    tags: [],
  },
  custom: { descriptions: [] },
};

const ENTRY_LEVEL_RESUME: Resume = {
  profile: {
    firstName: "Jordan",
    lastName: "Lee",
    title: "Recent Graduate — Business Analyst",
    email: "jordan.lee@email.com",
    phone: "(555) 123-4567",
    linkedin: "linkedin.com/in/jordanlee",
    website: "",
    city: "Atlanta",
    state: "GA",
    summary:
      "Ambitious business graduate with strong analytical skills and internship experience in data analysis and consulting. Eager to leverage academic knowledge and hands-on project experience to drive data-informed business decisions.",
  },
  workExperiences: [
    {
      company: "McKinsey & Company",
      jobTitle: "Business Analyst Intern",
      date: "Jun 2025 - Aug 2025",
      descriptions: [
        "Supported 2 client engagements in the retail and technology sectors as part of a 5-person consulting team",
        "Built financial models and market sizing analyses that informed a client's $15M investment decision",
        "Synthesized qualitative interview data from 20+ stakeholders into actionable recommendations",
      ],
    },
    {
      company: "Georgia Tech Research Institute",
      jobTitle: "Undergraduate Research Assistant",
      date: "Jan 2024 - May 2025",
      descriptions: [
        "Analyzed large datasets using Python and R to identify trends in supply chain efficiency",
        "Co-authored a research paper on predictive analytics in manufacturing logistics",
      ],
    },
  ],
  educations: [
    {
      school: "Georgia Institute of Technology",
      degree: "B.S. Business Administration, Concentration in Analytics",
      date: "May 2025",
      gpa: "3.85",
      descriptions: [
        "Dean's List (all semesters), President of Analytics Club",
        "Relevant coursework: Data Analytics, Financial Modeling, Operations Research, Machine Learning",
      ],
    },
  ],
  projects: [
    {
      project: "Atlanta Restaurant Market Analysis",
      date: "Spring 2025",
      descriptions: [
        "Led a team of 4 in analyzing 10K+ Yelp reviews to identify market opportunities for a local restaurant group",
        "Presented findings and strategic recommendations to client stakeholders",
      ],
    },
  ],
  skills: {
    featuredSkills: [
      { skill: "Data Analysis", rating: 4 },
      { skill: "Python", rating: 4 },
      { skill: "Excel", rating: 5 },
      { skill: "SQL", rating: 4 },
      { skill: "Tableau", rating: 4 },
      { skill: "PowerPoint", rating: 5 },
    ],
    descriptions: [
      "Technical: Python, R, SQL, Excel (VBA, Pivot Tables), Tableau, Power BI",
      "Business: Financial Modeling, Market Research, Competitive Analysis, Stakeholder Presentations",
    ],
  },
  certifications: [
    {
      name: "Tableau Desktop Specialist",
      issuer: "Tableau / Salesforce",
      date: "2024",
    },
  ],
  awards: [
    {
      title: "1st Place — Georgia Tech Case Competition",
      description: "Supply chain optimization for a Fortune 500 retailer",
      date: "2024",
    },
  ],
  publications: [],
  volunteering: [
    {
      organization: "Habitat for Humanity",
      role: "Volunteer Coordinator",
      date: "2022 - 2025",
      descriptions: [
        "Organized build events for 50+ student volunteers per semester",
      ],
    },
  ],
  interests: {
    commaSeparated: "Data Visualization, Basketball, Travel, Podcasts",
    bullets: [],
    tags: [],
  },
  custom: { descriptions: [] },
};

const CLASSIC_ATS_RESUME: Resume = {
  profile: {
    firstName: "Michael",
    lastName: "Torres",
    title: "Data Analyst",
    email: "michael.torres@email.com",
    phone: "(555) 246-8135",
    linkedin: "linkedin.com/in/michaeltorres",
    website: "",
    city: "Dallas",
    state: "TX",
    summary:
      "Results-oriented data analyst with 5 years of experience turning raw data into actionable insights for retail and supply-chain teams. Skilled in SQL, Python, and Tableau with a track record of reducing reporting cycles by 40% and supporting decisions that improved margins by 12%.",
  },
  workExperiences: [
    {
      company: "RetailCo Inc.",
      jobTitle: "Senior Data Analyst",
      date: "Feb 2022 - Present",
      descriptions: [
        "Built and maintained 20+ Tableau dashboards tracking KPIs for a 500-store retail network",
        "Wrote SQL pipelines to consolidate 8 data sources into a single reporting warehouse, cutting refresh time from 6 hours to 45 minutes",
        "Identified $1.4M in excess inventory through cohort analysis, enabling a targeted clearance strategy",
      ],
    },
    {
      company: "Apex Logistics",
      jobTitle: "Data Analyst",
      date: "Jun 2019 - Jan 2022",
      descriptions: [
        "Developed Python scripts to automate weekly KPI reporting for 12 regional managers, saving 15 hours per week",
        "Partnered with operations to redesign route efficiency model, reducing fuel spend by 8% annually",
        "Created and maintained a data dictionary for 40+ metrics used across the business",
      ],
    },
  ],
  educations: [
    {
      school: "University of Texas at Arlington",
      degree: "B.S. Mathematics, Minor in Computer Science",
      date: "May 2019",
      gpa: "3.7",
      descriptions: [],
    },
  ],
  projects: [],
  skills: {
    featuredSkills: [
      { skill: "SQL", rating: 5 },
      { skill: "Python", rating: 5 },
      { skill: "Tableau", rating: 5 },
      { skill: "Excel / VBA", rating: 4 },
      { skill: "Power BI", rating: 4 },
      { skill: "Statistical Analysis", rating: 4 },
    ],
    descriptions: [
      "Languages: SQL, Python, R, VBA",
      "Tools: Tableau, Power BI, Excel, Snowflake, dbt, Airflow",
    ],
  },
  certifications: [
    {
      name: "Google Data Analytics Professional Certificate",
      issuer: "Google / Coursera",
      date: "2021",
    },
  ],
  awards: [],
  publications: [],
  volunteering: [],
  interests: { commaSeparated: "", bullets: [], tags: [] },
  custom: { descriptions: [] },
};

const MODERN_TECH_RESUME: Resume = {
  profile: {
    firstName: "Priya",
    lastName: "Kapoor",
    title: "Backend Software Engineer",
    email: "priya.kapoor@email.com",
    phone: "(555) 369-2580",
    linkedin: "linkedin.com/in/priyakapoor",
    website: "priyakapoor.dev",
    github: "github.com/priyakapoor",
    city: "Austin",
    state: "TX",
    summary:
      "Backend engineer with 4 years of experience designing distributed systems and APIs at scale. Passionate about developer tooling, system reliability, and mentoring early-career engineers.",
  },
  workExperiences: [
    {
      company: "Amplitude",
      jobTitle: "Software Engineer II — Backend",
      date: "Mar 2022 - Present",
      descriptions: [
        "Designed and shipped a new event ingestion pipeline handling 2B events/day with p99 latency under 50ms",
        "Led reliability improvements that raised service uptime from 99.5% to 99.95% over 6 months",
        "Mentored 3 junior engineers and led weekly system design study group",
      ],
    },
    {
      company: "Razorpay",
      jobTitle: "Software Engineer — Platform",
      date: "Jul 2020 - Feb 2022",
      descriptions: [
        "Built internal rate-limiter service protecting 200+ downstream APIs from traffic spikes",
        "Migrated legacy monolith payment module to microservices, reducing deploy time by 60%",
        "Wrote RFC and led cross-team review for new authentication middleware adopted by 8 teams",
      ],
    },
  ],
  educations: [
    {
      school: "IIT Madras",
      degree: "B.Tech Computer Science",
      date: "May 2020",
      gpa: "9.1/10",
      descriptions: [],
    },
  ],
  projects: [
    {
      project: "GoQ — Distributed Task Queue",
      date: "2023",
      descriptions: [
        "Built an open-source distributed task queue in Go with Redis backend; 1.2K GitHub stars",
        "Supports priority queues, retries, dead-letter queues, and Prometheus metrics out of the box",
      ],
    },
  ],
  skills: {
    featuredSkills: [
      { skill: "Go", rating: 5 },
      { skill: "Python", rating: 5 },
      { skill: "Distributed Systems", rating: 5 },
      { skill: "PostgreSQL", rating: 4 },
      { skill: "Kubernetes", rating: 4 },
      { skill: "gRPC / Protobuf", rating: 4 },
    ],
    descriptions: [
      "Languages: Go, Python, Java, SQL, Bash",
      "Infrastructure: Kubernetes, Docker, Terraform, AWS, GCP, Prometheus, Grafana",
      "Databases: PostgreSQL, Redis, Cassandra, MongoDB",
    ],
  },
  certifications: [
    {
      name: "Certified Kubernetes Administrator (CKA)",
      issuer: "CNCF",
      date: "2023",
    },
  ],
  awards: [],
  publications: [],
  volunteering: [],
  interests: { commaSeparated: "", bullets: [], tags: [] },
  custom: { descriptions: [] },
};

const ALI_HASSAN_RESUME: Resume = {
  profile: {
    firstName: "Ali",
    lastName: "Hassan",
    title: "Software Engineer",
    email: "ali.hassan@email.com",
    phone: "+92-300-1234567",
    linkedin: "linkedin.com/in/alihassan-pk",
    website: "alihassan.dev",
    github: "github.com/alihassan-pk",
    city: "Islamabad",
    state: "",
    country: "Pakistan",
    summary:
      "CS graduate from NUST with a strong foundation in algorithms, distributed systems, and machine learning. Google STEP intern alumnus targeting SWE roles at FAANG/top-tier tech companies. Open-source contributor with multiple projects used in production.",
  },
  workExperiences: [
    {
      company: "Google",
      jobTitle: "STEP Intern — Software Engineering",
      date: "Jun 2023 - Aug 2023",
      descriptions: [
        "Shipped a latency improvement to Google Search's query pre-fetching layer, reducing p95 latency by 8ms for 1M+ daily queries",
        "Wrote design document for cache invalidation strategy reviewed and approved by senior SWE L6",
        "Worked in C++ and internal Flume/MapReduce frameworks; contributed 2,400 lines of production code",
      ],
    },
    {
      company: "NUST AI & Robotics Center (NARC)",
      jobTitle: "Undergraduate Research Assistant",
      date: "Jan 2022 - May 2023",
      descriptions: [
        "Developed a transformer-based Urdu NLP model achieving 91% accuracy on sentiment classification",
        "Collected and annotated a 50K-sentence Urdu dataset; published as open-source on HuggingFace (800+ downloads)",
        "Co-authored research paper submitted to EMNLP 2023 workshop",
      ],
    },
  ],
  educations: [
    {
      school: "National University of Sciences and Technology (NUST)",
      degree: "B.E. Computer Science",
      date: "Jun 2024",
      gpa: "3.92/4.0",
      descriptions: [
        "Rector's Gold Medal — top graduating student in SEECS",
        "Relevant coursework: Algorithms, OS, Distributed Systems, Machine Learning, Compilers",
      ],
    },
  ],
  projects: [
    {
      project: "CollabCode — Real-Time Collaborative IDE",
      date: "2023",
      descriptions: [
        "Browser-based collaborative code editor with OT-based conflict resolution supporting 10+ concurrent users",
        "Tech stack: React, Node.js, WebSockets, Redis pub/sub, Monaco Editor",
      ],
    },
    {
      project: "UrdúBERT — Urdu Language Model",
      date: "2022",
      descriptions: [
        "Fine-tuned mBERT on 50K Urdu sentences for sentiment analysis; open-sourced on HuggingFace",
        "800+ model downloads in 3 months post-release",
      ],
    },
  ],
  skills: {
    featuredSkills: [
      { skill: "Python", rating: 5 },
      { skill: "C++", rating: 5 },
      { skill: "Algorithms & DS", rating: 5 },
      { skill: "Machine Learning", rating: 4 },
      { skill: "TypeScript / React", rating: 4 },
      { skill: "Distributed Systems", rating: 4 },
    ],
    descriptions: [
      "Languages: Python, C++, Java, TypeScript, Go, SQL",
      "ML/AI: PyTorch, TensorFlow, HuggingFace, scikit-learn, NumPy",
      "Systems: Linux, Git, Docker, Kubernetes, PostgreSQL, Redis, gRPC",
    ],
  },
  certifications: [],
  awards: [
    {
      title: "Rector's Gold Medal — NUST SEECS",
      description: "Top graduating student in School of Electrical Engineering & Computer Science",
      date: "2024",
    },
    {
      title: "ICPC Asia Regionals — Honorable Mention",
      description: "Lahore site, team representing NUST",
      date: "2022",
    },
  ],
  publications: [],
  volunteering: [
    {
      organization: "NUST ACM Student Chapter",
      role: "Vice-President",
      date: "2022 - 2024",
      descriptions: [
        "Organized 8 competitive programming contests with 300+ participants each",
        "Ran weekly algorithmic problem-solving sessions for 60+ members",
      ],
    },
  ],
  interests: {
    commaSeparated: "Competitive Programming, Open Source, Cricket, Photography",
    bullets: [],
    tags: [],
  },
  custom: { descriptions: [] },
};

const FATIMA_MALIK_RESUME: Resume = {
  profile: {
    firstName: "Fatima",
    lastName: "Malik",
    title: "Management Consultant",
    email: "fatima.malik@email.com",
    phone: "+92-321-9876543",
    linkedin: "linkedin.com/in/fatimamalik-lums",
    website: "",
    city: "Lahore",
    state: "",
    country: "Pakistan",
    summary:
      "MBA graduate from LUMS with 4 years of consulting experience across financial services, energy, and consumer goods sectors. Led cross-functional teams on strategy, digital transformation, and operational efficiency mandates across Pakistan and GCC markets.",
  },
  workExperiences: [
    {
      company: "McKinsey & Company",
      jobTitle: "Consultant",
      date: "Sep 2022 - Present",
      descriptions: [
        "Led workstream for a $200M operational efficiency program at a major Pakistani commercial bank, identifying $18M in annual cost savings",
        "Managed client relationships and day-to-day delivery for 4 simultaneous engagements across Pakistan, Saudi Arabia, and UAE",
        "Developed go-to-market strategy for an FMCG client entering 3 new product categories; projected revenue uplift of PKR 1.2B in year 1",
      ],
    },
    {
      company: "McKinsey & Company",
      jobTitle: "Business Analyst",
      date: "Aug 2020 - Aug 2022",
      descriptions: [
        "Supported digital transformation roadmap for a state-owned energy utility; built financial models and stakeholder presentations",
        "Conducted market research across 5 GCC countries to assess expansion feasibility for a Pakistani textile exporter",
        "Promoted to Consultant 6 months ahead of schedule",
      ],
    },
  ],
  educations: [
    {
      school: "Lahore University of Management Sciences (LUMS)",
      degree: "MBA, Dean's Honour List",
      date: "Jun 2020",
      gpa: "3.88",
      descriptions: ["Suleman Dawood School of Business — Case Competition Champion 2019"],
    },
    {
      school: "Lahore University of Management Sciences (LUMS)",
      degree: "B.Sc. Economics & Mathematics",
      date: "Jun 2018",
      gpa: "3.82",
      descriptions: ["Dean's Honour List all semesters"],
    },
  ],
  projects: [],
  skills: {
    featuredSkills: [
      { skill: "Strategy & Analysis", rating: 5 },
      { skill: "Financial Modeling", rating: 5 },
      { skill: "Client Management", rating: 5 },
      { skill: "Data Analysis", rating: 4 },
      { skill: "Project Management", rating: 4 },
      { skill: "Stakeholder Mgmt", rating: 5 },
    ],
    descriptions: [
      "Languages: English (fluent), Urdu (native), Arabic (conversational)",
      "Tools: Excel, PowerPoint, Tableau, SQL, SPSS",
      "Frameworks: McKinsey Problem Solving, Lean Six Sigma (Green Belt)",
    ],
  },
  certifications: [
    {
      name: "Lean Six Sigma Green Belt",
      issuer: "IASSC",
      date: "2023",
    },
  ],
  awards: [
    {
      title: "LUMS MBA Case Competition Champion",
      description: "National-level business case competition",
      date: "2019",
    },
  ],
  publications: [],
  volunteering: [
    {
      organization: "Teach For Pakistan",
      role: "Fellow Alumni Mentor",
      date: "2021 - Present",
      descriptions: [
        "Mentor 2 TFP fellows each cycle on professional development and career planning",
      ],
    },
  ],
  interests: {
    commaSeparated: "Policy & Development Economics, Reading, Squash, Travel",
    bullets: [],
    tags: [],
  },
  custom: { descriptions: [] },
};

const AHMED_KHAN_RESUME: Resume = {
  profile: {
    firstName: "Ahmed",
    lastName: "Khan",
    title: "Full-Stack Developer (Remote)",
    email: "ahmed.khan@email.com",
    phone: "+92-333-5557890",
    linkedin: "linkedin.com/in/ahmedkhan-dev",
    website: "ahmedkhan.dev",
    github: "github.com/ahmedkhan-dev",
    city: "Karachi",
    state: "",
    country: "Pakistan",
    summary:
      "Self-taught full-stack developer with 5 years of freelance experience building web applications for European and US clients. Comfortable working across the stack — React frontends, Node/Python backends, PostgreSQL, cloud deployments. Actively seeking a remote full-time EU/UK role.",
  },
  workExperiences: [
    {
      company: "Freelance — Remote Clients (EU/US)",
      jobTitle: "Full-Stack Developer",
      date: "Jan 2020 - Present",
      descriptions: [
        "Built a multi-tenant SaaS HR platform for a Dutch startup; React + Node.js + PostgreSQL, serving 3,000 users in 5 countries",
        "Delivered a real-time auction platform for a German e-commerce client; handled WebSocket bidding for 500 concurrent users with zero downtime",
        "Integrated payment gateways (Stripe, PayPal, HBL Konnect) across 6 client projects with PCI-DSS compliance requirements",
        "Maintained consistent 5-star Upwork rating (Top Rated Plus badge, $120K+ earned)",
      ],
    },
    {
      company: "Devsinc",
      jobTitle: "Junior Web Developer",
      date: "Jun 2018 - Dec 2019",
      descriptions: [
        "Developed features for a US-based EdTech LMS using Django and React",
        "Reduced page load time by 35% by implementing lazy loading, code splitting, and CDN configuration",
      ],
    },
  ],
  educations: [
    {
      school: "University of Karachi",
      degree: "B.Sc. Computer Science",
      date: "May 2018",
      gpa: "3.5",
      descriptions: [],
    },
  ],
  projects: [
    {
      project: "RemoteHire PK — Remote Job Board",
      date: "2024",
      descriptions: [
        "Job board aggregating 500+ remote-friendly roles for Pakistani developers; Next.js + Supabase",
        "Reached 2,000 monthly active users organically within 4 months of launch",
      ],
    },
    {
      project: "AuctionLive — Real-Time Bidding Platform",
      date: "2023",
      descriptions: [
        "WebSocket-powered real-time auction engine with React frontend and Node.js backend",
        "Deployed on AWS (EC2, RDS, ElastiCache); handles 500 concurrent bidders with <100ms latency",
      ],
    },
  ],
  skills: {
    featuredSkills: [
      { skill: "React / Next.js", rating: 5 },
      { skill: "Node.js", rating: 5 },
      { skill: "Python / Django", rating: 4 },
      { skill: "PostgreSQL", rating: 4 },
      { skill: "Docker / AWS", rating: 4 },
      { skill: "TypeScript", rating: 4 },
    ],
    descriptions: [
      "Frontend: React, Next.js, Vue.js, Tailwind CSS, TypeScript",
      "Backend: Node.js (Express/Fastify), Python (Django/FastAPI), REST, GraphQL, WebSockets",
      "Database & Cloud: PostgreSQL, MongoDB, Redis, AWS (EC2, RDS, S3), Supabase, Docker",
    ],
  },
  certifications: [
    {
      name: "AWS Certified Developer — Associate",
      issuer: "Amazon Web Services",
      date: "2022",
    },
  ],
  awards: [
    {
      title: "Upwork Top Rated Plus",
      description: "Sustained top 3% of freelancers on the platform",
      date: "2023",
    },
  ],
  publications: [],
  volunteering: [],
  interests: {
    commaSeparated: "Open Source, EU Remote Work, Chess, Cricket",
    bullets: [],
    tags: [],
  },
  custom: { descriptions: [] },
};

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: "professional",
    name: "Professional",
    description: "Clean and traditional layout perfect for corporate roles, management, and experienced professionals.",
    category: "professional",
    accentColor: "#3a7a74",
    atsRating: "safe",
    resume: PROFESSIONAL_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#3a7a74",
      fontFamily: "Arial",
      fontSize: "11",
      lineHeight: "140",
      bulletStyle: "•",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: false,
        skills: true,
        certifications: true,
        awards: false,
        publications: false,
        volunteering: false,
        interests: false,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "educations",
        "skills",
        "certifications",
        "awards",
        "projects",
        "publications",
        "volunteering",
        "interests",
        "custom",
      ],
    },
  },
  {
    id: "modern-dev",
    name: "Modern Developer",
    description: "Two-column layout designed for software engineers and tech professionals to highlight skills alongside experience.",
    category: "modern",
    accentColor: "#2563eb",
    atsRating: "risky",
    resume: MODERN_RESUME,
    settings: {
      templateId: "two-column",
      themeColor: "#2563eb",
      fontFamily: "Roboto",
      fontSize: "11",
      lineHeight: "135",
      bulletStyle: "→",
      skillsLayout: "categoryColumns",
      skillsColumns: "2",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: true,
        skills: true,
        certifications: true,
        awards: false,
        publications: false,
        volunteering: false,
        interests: false,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "projects",
        "educations",
        "skills",
        "certifications",
        "awards",
        "publications",
        "volunteering",
        "interests",
        "custom",
      ],
      sidebarFormIds: ["skills", "certifications", "educations"],
    },
  },
  {
    id: "creative-designer",
    name: "Creative",
    description: "Bold mixed-column layout for designers, creatives, and anyone who wants their resume to stand out.",
    category: "creative",
    accentColor: "#9333ea",
    atsRating: "risky",
    resume: CREATIVE_RESUME,
    settings: {
      templateId: "mixed",
      themeColor: "#9333ea",
      fontFamily: "Lora",
      fontSize: "11",
      lineHeight: "140",
      bulletStyle: "»",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: true,
        skills: true,
        certifications: false,
        awards: true,
        publications: false,
        volunteering: true,
        interests: true,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "skills",
        "projects",
        "educations",
        "awards",
        "volunteering",
        "interests",
        "certifications",
        "publications",
        "custom",
      ],
      sidebarFormIds: ["skills", "interests", "awards"],
    },
  },
  {
    id: "minimal-finance",
    name: "Minimal",
    description: "Clean, understated design that lets your credentials speak for themselves. Great for finance and consulting.",
    category: "minimal",
    accentColor: "#1f2937",
    atsRating: "moderate",
    resume: MINIMAL_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#1f2937",
      fontFamily: "Merriweather",
      fontSize: "11",
      lineHeight: "140",
      bulletStyle: "-",
      dateFormat: "MMM YYYY",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: false,
        skills: true,
        certifications: true,
        awards: false,
        publications: false,
        volunteering: false,
        interests: false,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "educations",
        "skills",
        "certifications",
        "awards",
        "projects",
        "publications",
        "volunteering",
        "interests",
        "custom",
      ],
    },
  },
  {
    id: "executive",
    name: "Executive",
    description: "Polished layout designed for senior leaders, directors, and VP-level professionals with deep track records.",
    category: "professional",
    accentColor: "#0f766e",
    atsRating: "moderate",
    resume: EXECUTIVE_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#0f766e",
      fontFamily: "Lora",
      fontSize: "11",
      lineHeight: "145",
      bulletStyle: "•",
      dateFormat: "MMM YYYY",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: false,
        skills: true,
        certifications: false,
        awards: true,
        publications: false,
        volunteering: false,
        interests: false,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "skills",
        "educations",
        "awards",
        "projects",
        "certifications",
        "publications",
        "volunteering",
        "interests",
        "custom",
      ],
    },
  },
  {
    id: "academic",
    name: "Academic",
    description: "Publication and research-focused layout tailored for professors, researchers, and PhD candidates.",
    category: "academic",
    accentColor: "#7c3aed",
    atsRating: "moderate",
    resume: ACADEMIC_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#7c3aed",
      fontFamily: "Merriweather",
      fontSize: "10.5",
      lineHeight: "140",
      bulletStyle: "•",
      dateFormat: "Month YYYY",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: false,
        skills: true,
        certifications: false,
        awards: true,
        publications: true,
        volunteering: true,
        interests: true,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "educations",
        "publications",
        "skills",
        "awards",
        "volunteering",
        "interests",
        "projects",
        "certifications",
        "custom",
      ],
    },
  },
  {
    id: "career-change",
    name: "Career Changer",
    description: "Skills-forward layout that highlights transferable abilities and projects for professionals switching fields.",
    category: "modern",
    accentColor: "#ea580c",
    atsRating: "moderate",
    resume: CAREER_CHANGE_RESUME,
    settings: {
      templateId: "two-column",
      themeColor: "#ea580c",
      fontFamily: "Roboto",
      fontSize: "11",
      lineHeight: "135",
      bulletStyle: "•",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: true,
        skills: true,
        certifications: true,
        awards: false,
        publications: false,
        volunteering: true,
        interests: true,
        custom: false,
      },
      formsOrder: [
        "skills",
        "projects",
        "workExperiences",
        "educations",
        "certifications",
        "volunteering",
        "interests",
        "awards",
        "publications",
        "custom",
      ],
      sidebarFormIds: ["skills", "certifications", "interests"],
    },
  },
  {
    id: "entry-level",
    name: "Entry Level",
    description: "Education and project-focused layout perfect for recent graduates and those early in their career.",
    category: "minimal",
    accentColor: "#0891b2",
    atsRating: "safe",
    resume: ENTRY_LEVEL_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#0891b2",
      fontFamily: "Arial",
      fontSize: "11",
      lineHeight: "140",
      bulletStyle: "•",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: true,
        skills: true,
        certifications: true,
        awards: true,
        publications: false,
        volunteering: true,
        interests: true,
        custom: false,
      },
      formsOrder: [
        "educations",
        "workExperiences",
        "projects",
        "skills",
        "awards",
        "certifications",
        "volunteering",
        "interests",
        "publications",
        "custom",
      ],
    },
  },
  {
    id: "classic-ats",
    name: "Classic ATS",
    description: "Single-column, Arial 11pt layout optimised for Applicant Tracking Systems. Zero formatting tricks — just clean, parseable text.",
    category: "minimal",
    accentColor: "#374151",
    atsRating: "safe",
    resume: CLASSIC_ATS_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#374151",
      fontFamily: "Arial",
      fontSize: "11",
      lineHeight: "140",
      bulletStyle: "•",
      dateFormat: "MM/YYYY",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: false,
        skills: true,
        certifications: true,
        awards: false,
        publications: false,
        volunteering: false,
        interests: false,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "educations",
        "skills",
        "certifications",
        "awards",
        "projects",
        "publications",
        "volunteering",
        "interests",
        "custom",
      ],
    },
  },
  {
    id: "modern-tech",
    name: "Modern Tech",
    description: "ATS-safe single-column layout with a subtle blue accent for developers and engineers who want clarity without sacrificing parsability.",
    category: "modern",
    accentColor: "#1d4ed8",
    atsRating: "safe",
    resume: MODERN_TECH_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#1d4ed8",
      fontFamily: "Arial",
      fontSize: "11",
      lineHeight: "140",
      bulletStyle: "•",
      dateFormat: "MM/YYYY",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: true,
        skills: true,
        certifications: true,
        awards: false,
        publications: false,
        volunteering: false,
        interests: false,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "projects",
        "educations",
        "skills",
        "certifications",
        "awards",
        "publications",
        "volunteering",
        "interests",
        "custom",
      ],
    },
  },
  {
    id: "nust-faang",
    name: "NUST → FAANG",
    description: "CS graduate sample for Pakistani students applying to Google, Meta, and top-tier tech globally. Built around a real NUST curriculum.",
    category: "modern",
    accentColor: "#0d9488",
    atsRating: "safe",
    resume: ALI_HASSAN_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#0d9488",
      fontFamily: "Arial",
      fontSize: "11",
      lineHeight: "140",
      bulletStyle: "•",
      dateFormat: "MM/YYYY",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: true,
        skills: true,
        certifications: false,
        awards: true,
        publications: false,
        volunteering: true,
        interests: false,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "educations",
        "projects",
        "skills",
        "awards",
        "volunteering",
        "certifications",
        "interests",
        "publications",
        "custom",
      ],
    },
  },
  {
    id: "lums-mba",
    name: "LUMS MBA",
    description: "MBA consultant sample for LUMS graduates entering management consulting, banking, or strategy roles across Pakistan and GCC.",
    category: "professional",
    accentColor: "#7e22ce",
    atsRating: "safe",
    resume: FATIMA_MALIK_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#7e22ce",
      fontFamily: "Arial",
      fontSize: "11",
      lineHeight: "140",
      bulletStyle: "•",
      dateFormat: "MM/YYYY",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: false,
        skills: true,
        certifications: true,
        awards: true,
        publications: false,
        volunteering: true,
        interests: false,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "educations",
        "skills",
        "awards",
        "certifications",
        "volunteering",
        "projects",
        "interests",
        "publications",
        "custom",
      ],
    },
  },
  {
    id: "karachi-fullstack",
    name: "Karachi → EU Remote",
    description: "Freelance full-stack developer sample for Pakistani engineers targeting European or US remote roles. Upwork-battle-tested format.",
    category: "modern",
    accentColor: "#c2410c",
    atsRating: "safe",
    resume: AHMED_KHAN_RESUME,
    settings: {
      templateId: "single",
      themeColor: "#c2410c",
      fontFamily: "Arial",
      fontSize: "11",
      lineHeight: "140",
      bulletStyle: "•",
      dateFormat: "MM/YYYY",
      formToShow: {
        workExperiences: true,
        educations: true,
        projects: true,
        skills: true,
        certifications: true,
        awards: true,
        publications: false,
        volunteering: false,
        interests: false,
        custom: false,
      },
      formsOrder: [
        "workExperiences",
        "projects",
        "educations",
        "skills",
        "certifications",
        "awards",
        "volunteering",
        "interests",
        "publications",
        "custom",
      ],
    },
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "professional", label: "Professional" },
  { id: "modern", label: "Modern" },
  { id: "creative", label: "Creative" },
  { id: "minimal", label: "Minimal" },
  { id: "academic", label: "Academic" },
] as const;
