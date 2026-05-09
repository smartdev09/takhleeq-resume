// ---------------------------------------------------------------------------
// Client-side Job Description Parser
//
// Extracts structured requirements from raw JD text using heuristics &
// pattern matching. Runs instantly, no AI call needed.
// ---------------------------------------------------------------------------

export interface ParsedJobDescription {
  title: string;
  company: string;
  yearsOfExperience: { min: number; max?: number } | null;
  requiredSkills: string[];
  preferredSkills: string[];
  industries: string[];
  educationRequirements: string[];
  certifications: string[];
  responsibilities: string[];
  rawText: string;
}

// ---------------------------------------------------------------------------
// Skill / keyword dictionaries
// ---------------------------------------------------------------------------

const TECH_SKILLS = new Set([
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "golang",
  "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl",
  "html", "html5", "css", "css3", "sass", "less", "tailwind", "tailwindcss",
  "bootstrap", "material ui", "mui", "chakra ui", "styled-components",
  "react", "react.js", "reactjs", "next.js", "nextjs", "vue", "vue.js",
  "vuejs", "angular", "angularjs", "svelte", "sveltekit", "ember", "backbone",
  "jquery", "redux", "mobx", "zustand", "recoil", "context api",
  "node.js", "nodejs", "express", "express.js", "fastify", "nest.js",
  "nestjs", "deno", "bun", "django", "flask", "fastapi", "spring",
  "spring boot", "asp.net", ".net", "rails", "ruby on rails", "laravel",
  "sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "elasticsearch",
  "dynamodb", "firebase", "supabase", "cassandra", "neo4j", "graphql",
  "rest", "restful", "grpc", "soap", "websocket", "websockets",
  "aws", "amazon web services", "azure", "gcp", "google cloud", "cloud",
  "docker", "kubernetes", "k8s", "terraform", "ansible", "puppet", "chef",
  "jenkins", "github actions", "gitlab ci", "circleci", "travis ci",
  "ci/cd", "ci cd", "continuous integration", "continuous deployment",
  "git", "github", "gitlab", "bitbucket", "svn",
  "linux", "unix", "bash", "shell", "powershell",
  "agile", "scrum", "kanban", "jira", "confluence", "trello",
  "figma", "sketch", "adobe xd", "photoshop", "illustrator",
  "machine learning", "ml", "deep learning", "ai", "artificial intelligence",
  "nlp", "natural language processing", "computer vision", "tensorflow",
  "pytorch", "keras", "scikit-learn", "pandas", "numpy", "scipy",
  "data science", "data engineering", "data analysis", "data analytics",
  "tableau", "power bi", "looker", "metabase",
  "blockchain", "web3", "solidity", "ethereum",
  "microservices", "monolith", "serverless", "lambda",
  "oauth", "jwt", "saml", "sso", "authentication", "authorization",
  "unit testing", "integration testing", "e2e testing", "tdd", "bdd",
  "jest", "mocha", "cypress", "playwright", "selenium", "puppeteer",
  "webpack", "vite", "rollup", "esbuild", "parcel", "babel",
  "storybook", "chromatic",
  "responsive design", "responsive web design", "cross-browser",
  "accessibility", "a11y", "wcag", "aria",
  "seo", "performance optimization", "web performance",
  "api", "apis", "restful apis", "api design",
  "design patterns", "solid", "oop", "functional programming",
  "system design", "architecture", "distributed systems",
  "kafka", "rabbitmq", "sqs", "sns", "event-driven",
  "nginx", "apache", "load balancing", "cdn",
  "monitoring", "logging", "observability", "datadog", "new relic",
  "grafana", "prometheus", "elk", "splunk",
  "ios", "android", "react native", "flutter", "mobile development",
  "three.js", "webgl", "d3.js", "d3", "canvas",
  "ui/ux", "ui ux", "user interface", "user experience",
  "json", "xml", "yaml", "toml", "csv",
  "npm", "yarn", "pnpm", "pip", "maven", "gradle",
]);

const INDUSTRY_KEYWORDS = new Set([
  "fintech", "finance", "banking", "healthcare", "healthtech", "medtech",
  "edtech", "education", "e-commerce", "ecommerce", "retail", "saas",
  "enterprise", "b2b", "b2c", "startup", "insurance", "insurtech",
  "real estate", "proptech", "logistics", "supply chain", "manufacturing",
  "automotive", "aerospace", "defense", "government", "govtech",
  "telecommunications", "telecom", "media", "entertainment", "gaming",
  "social media", "advertising", "adtech", "martech", "marketing",
  "cybersecurity", "security", "information security", "infosec",
  "biotech", "pharmaceutical", "pharma", "life sciences",
  "energy", "cleantech", "climate", "sustainability",
  "travel", "hospitality", "food", "foodtech",
  "legal", "legaltech", "hr", "human resources", "hrtech",
  "consulting", "professional services",
  "artificial intelligence", "machine learning", "data",
  "cloud computing", "infrastructure", "devops",
  "information technology", "it", "software", "technology",
  "crypto", "cryptocurrency", "blockchain", "web3", "defi",
  "iot", "internet of things", "robotics", "automation",
]);

const CERTIFICATION_KEYWORDS = [
  "aws certified", "azure certified", "google cloud certified", "gcp certified",
  "pmp", "project management professional", "prince2",
  "cissp", "cism", "cisa", "ceh", "comptia",
  "scrum master", "csm", "psm", "safe", "scaled agile",
  "itil", "togaf", "cobit",
  "six sigma", "lean", "black belt", "green belt",
  "cpa", "cfa", "frm", "acca",
  "cisco", "ccna", "ccnp", "ccie",
  "oracle certified", "java certified",
  "kubernetes certified", "cka", "ckad",
  "terraform certified", "hashicorp certified",
  "salesforce certified",
  "hubspot certified",
  "google analytics",
  "meta certified",
];

const EDUCATION_KEYWORDS = [
  "bachelor", "bachelors", "bachelor's", "b.s.", "bs", "b.a.", "ba", "bsc",
  "master", "masters", "master's", "m.s.", "ms", "m.a.", "ma", "msc", "mba",
  "ph.d", "phd", "doctorate", "doctoral",
  "associate", "associates", "associate's",
  "degree", "diploma", "certificate",
  "computer science", "software engineering", "information technology",
  "electrical engineering", "mechanical engineering", "mathematics",
  "statistics", "data science", "information systems",
  "business administration", "economics", "finance",
];

// ---------------------------------------------------------------------------
// YoE extraction
// ---------------------------------------------------------------------------

const YOE_PATTERNS = [
  /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)/i,
  /(?:minimum|min|at least)\s+(\d+)\s*(?:years?|yrs?)/i,
  /(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)/i,
  /(\d+)\+?\s*(?:years?|yrs?)\s+(?:professional|relevant|related|industry)/i,
  /experience:?\s*(\d+)\+?\s*(?:years?|yrs?)/i,
];

function extractYearsOfExperience(
  text: string
): ParsedJobDescription["yearsOfExperience"] {
  for (const pattern of YOE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const min = parseInt(match[1]!, 10);
      const max = match[2] ? parseInt(match[2], 10) : undefined;
      if (!isNaN(min)) return { min, max: max && !isNaN(max) ? max : undefined };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Title extraction
// ---------------------------------------------------------------------------

const TITLE_PATTERNS = [
  /(?:job\s+title|position|role)\s*[:–-]\s*(.+)/i,
  /(?:we(?:'re| are)\s+(?:looking|hiring|seeking)\s+(?:for\s+)?(?:a|an)\s+)(.+?)(?:\s+(?:to|who|with|at|in)\b)/i,
  /(?:hiring|join\s+(?:us|our team)\s+as\s+(?:a|an)?\s*)(.+?)(?:\s+(?:to|who|with|at|in)\b|[.!])/i,
];

function extractTitle(text: string): string {
  for (const pattern of TITLE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const title = match[1].trim().replace(/[.!,;]+$/, "");
      if (title.length < 80) return title;
    }
  }
  // Fallback: use first non-empty line under 80 chars that looks like a title
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (
      line.length < 80 &&
      !line.includes(":") &&
      /[A-Z]/.test(line[0] ?? "")
    ) {
      return line;
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Company extraction
// ---------------------------------------------------------------------------

const COMPANY_PATTERNS = [
  /(?:company|organization|employer)\s*[:–-]\s*(.+)/i,
  /(?:about|join)\s+(.+?)(?:\s*[-–:]|\s+is\s+|\s+are\s+)/i,
  /(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,']+?)(?:\s*[,.]|\s+we\b|\s+is\b)/,
];

function extractCompany(text: string): string {
  for (const pattern of COMPANY_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const company = match[1].trim().replace(/[.!,;]+$/, "");
      if (company.length < 60) return company;
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Skill extraction
// ---------------------------------------------------------------------------

function extractSkills(
  text: string,
  existingSkills: Set<string>
): { required: string[]; preferred: string[] } {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  TECH_SKILLS.forEach((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lower)) {
      found.add(skill);
    }
  });

  // Also extract multi-word terms from bullet/list items
  const bulletLines = text
    .split("\n")
    .filter((l) => /^[\s]*[•\-*▪▸→❖✓✅]/.test(l) || /^\s*\d+[.)]\s/.test(l));
  for (const line of bulletLines) {
    const words = line.replace(/[•\-*▪▸→❖✓✅\d.)]/g, "").trim();
    TECH_SKILLS.forEach((skill) => {
      if (words.toLowerCase().includes(skill)) {
        found.add(skill);
      }
    });
  }

  // Classify required vs preferred based on surrounding context
  const requiredSection =
    /(?:required|must have|requirements|qualifications|what you need|minimum)/i;
  const preferredSection =
    /(?:preferred|nice to have|bonus|desired|plus|ideal)/i;

  const required: string[] = [];
  const preferred: string[] = [];

  const foundArray = Array.from(found);
  for (const skill of foundArray) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const skillRegex = new RegExp(`\\b${escaped}\\b`, "gi");
    let isPreferred = false;

    let match: RegExpExecArray | null;
    while ((match = skillRegex.exec(text)) !== null) {
      const contextBefore = text.slice(Math.max(0, match.index - 200), match.index);
      if (preferredSection.test(contextBefore) && !requiredSection.test(contextBefore)) {
        isPreferred = true;
      }
    }

    if (isPreferred) {
      preferred.push(normalizeSkillName(skill));
    } else {
      required.push(normalizeSkillName(skill));
    }
  }

  return { required, preferred };
}

function normalizeSkillName(skill: string): string {
  const normalizations: Record<string, string> = {
    "react.js": "React.js",
    "reactjs": "React.js",
    "react": "React",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "vue.js": "Vue.js",
    "vuejs": "Vue.js",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "nest.js": "NestJS",
    "nestjs": "NestJS",
    "express.js": "Express.js",
    "angular": "Angular",
    "angularjs": "AngularJS",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "python": "Python",
    "golang": "Go",
    "go": "Go",
    "html5": "HTML5",
    "html": "HTML",
    "css3": "CSS3",
    "css": "CSS",
    "tailwindcss": "Tailwind CSS",
    "tailwind": "Tailwind CSS",
    "graphql": "GraphQL",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "terraform": "Terraform",
    "aws": "AWS",
    "gcp": "GCP",
    "azure": "Azure",
    "ci/cd": "CI/CD",
    "ci cd": "CI/CD",
    "git": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",
    "redux": "Redux",
    "material ui": "Material UI",
    "mui": "Material UI",
    "sass": "Sass",
    "bootstrap": "Bootstrap",
    "json": "JSON",
    "rest": "REST",
    "restful": "RESTful",
    "restful apis": "RESTful APIs",
    "jest": "Jest",
    "cypress": "Cypress",
    "playwright": "Playwright",
    "webpack": "Webpack",
    "vite": "Vite",
    "storybook": "Storybook",
    "figma": "Figma",
    "jira": "Jira",
    "agile": "Agile",
    "scrum": "Scrum",
  };
  return normalizations[skill.toLowerCase()] ?? capitalize(skill);
}

function capitalize(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Industry extraction
// ---------------------------------------------------------------------------

function extractIndustries(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  INDUSTRY_KEYWORDS.forEach((industry) => {
    const escaped = industry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) {
      found.push(capitalize(industry));
    }
  });
  return Array.from(new Set(found));
}

// ---------------------------------------------------------------------------
// Education extraction
// ---------------------------------------------------------------------------

function extractEducation(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const kw of EDUCATION_KEYWORDS) {
    if (lower.includes(kw)) {
      found.push(capitalize(kw));
    }
  }
  return Array.from(new Set(found));
}

// ---------------------------------------------------------------------------
// Certification extraction
// ---------------------------------------------------------------------------

function extractCertifications(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const cert of CERTIFICATION_KEYWORDS) {
    if (lower.includes(cert.toLowerCase())) {
      found.push(capitalize(cert));
    }
  }
  return Array.from(new Set(found));
}

// ---------------------------------------------------------------------------
// Responsibilities extraction (bullet points from the JD)
// ---------------------------------------------------------------------------

function extractResponsibilities(text: string): string[] {
  const lines = text.split("\n");
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith("•") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("*") ||
        /^\d+[.)]/.test(trimmed)) &&
      trimmed.length > 20
    ) {
      bullets.push(trimmed.replace(/^[•\-*\d.)\s]+/, "").trim());
    }
  }
  return bullets;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseJobDescription(rawText: string): ParsedJobDescription {
  const text = rawText.trim();

  const { required, preferred } = extractSkills(text, new Set());

  return {
    title: extractTitle(text),
    company: extractCompany(text),
    yearsOfExperience: extractYearsOfExperience(text),
    requiredSkills: required,
    preferredSkills: preferred,
    industries: extractIndustries(text),
    educationRequirements: extractEducation(text),
    certifications: extractCertifications(text),
    responsibilities: extractResponsibilities(text),
    rawText: text,
  };
}
