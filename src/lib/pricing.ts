// Canonical packages — single source of truth for what the STUDENT pays and what
// the MENTOR earns. Mentors offer one or more of these as their "specialities".

export interface PackageDef {
  key: string;
  name: string;
  studentPrice: number; // what the student is charged
  mentorPayout: number; // what the mentor is paid
  description: string;
}

export const PACKAGES: PackageDef[] = [
  { key: "basic-career", name: "Basic Career Consultation", studentPrice: 2500, mentorPayout: 1500, description: "A focused 1-on-1 career consultation." },
  { key: "academic-mentorship", name: "Academic Mentorship", studentPrice: 6500, mentorPayout: 4500, description: "In-depth academic guidance and mentorship." },
  { key: "entrepreneurial-coaching", name: "Entrepreneurial Coaching Package", studentPrice: 6500, mentorPayout: 4500, description: "Coaching for founders and aspiring entrepreneurs." },
  { key: "cv-resume", name: "CV/Resume Building", studentPrice: 3000, mentorPayout: 2000, description: "Craft a standout CV / resume with expert feedback." },
  { key: "parental-guidance", name: "Parental Guidance Sessions", studentPrice: 2500, mentorPayout: 1500, description: "Guidance sessions for parents." },
];

// The services a mentor can offer (their specialities) = the package names.
export const SPECIALITIES = PACKAGES.map((p) => p.name);

export const packageByName = (name?: string): PackageDef | undefined =>
  PACKAGES.find((p) => p.name === name);
