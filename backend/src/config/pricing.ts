// Canonical packages (server-side source of truth). Student price is what we
// charge; mentorPayout is what the admin pays the mentor. Kept in sync with the
// frontend src/lib/pricing.ts.

export interface PackageDef {
  key: string;
  name: string;
  studentPrice: number;
  mentorPayout: number;
}

export const PACKAGES: PackageDef[] = [
  { key: "basic-career", name: "Basic Career Consultation", studentPrice: 2500, mentorPayout: 1500 },
  { key: "academic-mentorship", name: "Academic Mentorship", studentPrice: 6500, mentorPayout: 4500 },
  { key: "entrepreneurial-coaching", name: "Entrepreneurial Coaching Package", studentPrice: 6500, mentorPayout: 4500 },
  { key: "cv-resume", name: "CV/Resume Building", studentPrice: 3000, mentorPayout: 2000 },
  { key: "parental-guidance", name: "Parental Guidance Sessions", studentPrice: 2500, mentorPayout: 1500 },
];

export const packageByName = (name?: string): PackageDef | undefined =>
  PACKAGES.find((p) => p.name === name);
