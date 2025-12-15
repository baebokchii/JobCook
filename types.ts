export enum CookMode {
  PANTRY = 'PANTRY',      // Resume/Profile
  RECIPE = 'RECIPE',      // Job Description & Analysis
  COVER_LETTER = 'COVER_LETTER', // Cover Letter Generation
  TASTE_TEST = 'TASTE_TEST', // Mock Interview (Careermizing feature)
}

export interface Ingredient {
  id: string;
  name: string;
  category: 'skill' | 'experience' | 'education' | 'certification' | 'project';
  details?: string;
}

export interface DishAnalysis {
  matchScore: number; // 0-100
  missingIngredients: string[];
  tasteProfile: string; // Summary of fit
  chefTips: string[]; // Advice
  companyName: string; // Extracted company name
}

export interface CompanyResearchResult {
  summary: string; // Markdown text
  sources: { title: string; uri: string }[];
}

export interface InterviewMessage {
  id: string;
  role: 'chef' | 'candidate'; // chef = AI interviewer, candidate = user
  content: string;
  feedback?: string; // Feedback on candidate's answer
  score?: number; // 1-10 score for the answer
}

export interface ChefState {
  ingredients: Ingredient[];
  currentRecipe: string; // Job Description
  companyName: string;
  analysis: DishAnalysis | null;
  companyResearch: CompanyResearchResult | null;
  generatedCoverLetter: string | null;
  interviewHistory: InterviewMessage[]; // Chat history for mock interview
  isCooking: boolean; // Loading state
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}