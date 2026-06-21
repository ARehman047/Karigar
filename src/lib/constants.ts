// Shared option lists used across signup, profile and filter UIs.

export const FIELDS = [
  "Computer Science",
  "Software Engineering",
  "Business Administration",
  "Data Science",
  "Electrical Engineering",
  "Medicine",
  "Law",
  "Graphic Design",
  "Civil Engineering",
  "Psychology",
  "Finance & Accounting",
  "Media & Communications",
  "Mechanical Engineering",
  "Biotechnology",
  "Education",
] as const;

export const CITIES = [
  "Islamabad",
  "Lahore",
  "Karachi",
  "Rawalpindi",
  "Faisalabad",
  "Peshawar",
  "Multan",
  "Quetta",
] as const;

export const TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

export const EDUCATION_LEVELS = ["High School", "Intermediate", "Undergraduate", "Postgraduate", "PhD", "Other"];

export const COUNTRIES = ["Pakistan", "India", "UAE", "UK", "USA", "Canada", "Saudi Arabia", "Other"];

export const LANGUAGES = ["English", "Urdu", "Punjabi", "Sindhi", "Pashto", "Arabic", "Hindi", "Other"];

export const MENTOR_TYPES = [
  { value: "academic", label: "Academic" },
  { value: "industry", label: "Industry" },
] as const;
