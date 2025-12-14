export enum CookMode {
  PANTRY = 'PANTRY',      // Resume/Profile
  RECIPE = 'RECIPE',      // Job Description & Analysis
  COVER_LETTER = 'COVER_LETTER', // Cover Letter Generation
}

export interface Ingredient {
  id: string;
  name: string;
  category: 'skill' | 'experience' | 'education' | 'certification';
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

export interface ChefState {
  ingredients: Ingredient[];
  currentRecipe: string; // Job Description
  companyName: string;
  analysis: DishAnalysis | null;
  companyResearch: CompanyResearchResult | null;
  generatedCoverLetter: string | null;
  isCooking: boolean; // Loading state
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}