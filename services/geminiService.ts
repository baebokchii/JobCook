import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Ingredient, DishAnalysis, CompanyResearchResult } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to retry operations with exponential backoff.
 * Specifically targets 503 Service Unavailable / Overloaded errors.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 5,
  delay = 3000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Attempt to extract error code/status from various structures
    const errorCode = error?.status || error?.code || error?.error?.code || error?.response?.status;
    const errorMessage = error?.message || error?.error?.message || JSON.stringify(error);
    const errorStatus = error?.status || error?.error?.status;

    // Check for specific API Key issues
    if (errorMessage.includes('API key') || errorCode === 400 || errorCode === 403) {
       throw new Error("Invalid or missing API Key. Please check your configuration.");
    }

    const isOverloaded = 
      errorCode === 503 || 
      errorCode === 'UNAVAILABLE' || 
      errorStatus === 'UNAVAILABLE' ||
      (typeof errorMessage === 'string' && (errorMessage.includes('overloaded') || errorMessage.includes('503')));

    if (retries > 0 && isOverloaded) {
      console.warn(`Gemini API overloaded (503). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Linear backoff or smaller exponential to avoid extremely long waits
      return withRetry(operation, retries - 1, delay * 1.5); 
    }
    
    // Make error more readable for the UI
    if (errorMessage.includes('SAFETY')) {
        throw new Error("The request was blocked by safety filters. Please adjust the content.");
    }
    
    throw new Error(errorMessage.length < 100 ? errorMessage : "The kitchen is experiencing technical difficulties. Please try again.");
  }
}

// --- Text Generation ---

export const analyzeDish = async (
  ingredients: Ingredient[],
  jobDescription: string
): Promise<DishAnalysis> => {
  const ingredientsList = ingredients
    .map((i) => `- ${i.category.toUpperCase()}: ${i.name} ${i.details ? `(${i.details})` : ''}`)
    .join('\n');

  const prompt = `
    You are the Head Chef at a prestigious Career Kitchen. 
    I have the following ingredients (resume data):
    ${ingredientsList}

    I am trying to cook this dish (apply for this job):
    ${jobDescription}

    Analyze the ingredients against the recipe.
    1. Give a "Match Score" from 0 to 100 based on how well the ingredients fit the recipe.
    2. List "Missing Ingredients" (skills or experiences the job asks for but I lack).
    3. Provide a "Taste Profile" (a brief summary of the fit).
    4. Give 3 "Chef Tips" to improve the dish (application).
    5. Extract the "Company Name" from the job description. If not explicitly stated, use "Unknown Company".
  `;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchScore: { type: Type.NUMBER },
          missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          tasteProfile: { type: Type.STRING },
          chefTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          companyName: { type: Type.STRING },
        },
        required: ["matchScore", "missingIngredients", "tasteProfile", "chefTips", "companyName"],
      }
    }
  }));

  const text = response.text;
  if (!text) throw new Error("No analysis returned from the Chef.");
  return JSON.parse(text) as DishAnalysis;
};

export const researchCompany = async (companyName: string, ingredients: Ingredient[] = []): Promise<CompanyResearchResult> => {
  const ingredientsList = ingredients.map(i => i.name).join(', ');

  const prompt = `
    You are an expert Career Strategist and Company Researcher.
    Research the company "${companyName}".
    
    Candidate Context (Skills/Experience):
    ${ingredientsList}

    Provide a strategic "Establishment Review" (Company Analysis) tailored to this candidate.
    
    Output Format (Markdown):

    ### 🏢 Atmosphere & Values
    Analyze the company's mission and culture.
    *Crucial:* Explicitly identify which of the candidate's specific skills or values (from the context provided) align best with this company.

    ### 📰 Daily Specials (News & Strategy)
    Summarize recent headlines, financial performance, or product launches.

    ### 🔍 Inspection Tips (Interview Questions)
    List 3-5 specific, high-impact interview questions the candidate might be asked, based directly on the company's recent news/strategy and values.

    ### 🥡 Chef's Key Takeaways
    *   **Alignment:** The strongest selling point for this candidate.
    *   **Conversation Starter:** An insightful question the candidate should ask the interviewer.
    *   **Focus:** One key competency to emphasize during the interview.

    Keep it professional, insightful, and actionable.
  `;

  // Removed googleSearch tool as it can cause 500 errors in some preview environments/tiers.
  // The model's internal knowledge base is sufficient for most company research.
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return {
    summary: response.text || "No information found.",
    sources: [] // Sources unavailable without live search
  };
};

export const cookCoverLetter = async (
  ingredients: Ingredient[],
  jobDescription: string
): Promise<string> => {
   const ingredientsList = ingredients
    .map((i) => `- ${i.category.toUpperCase()}: ${i.name} ${i.details ? `(${i.details})` : ''}`)
    .join('\n');

  const prompt = `
    You are an expert executive career coach and professional copywriter.
    Write a highly professional, passionate, and persuasive cover letter for this job application.
    
    Candidate Profile (Ingredients):
    ${ingredientsList}

    Job Description (The Order):
    ${jobDescription}

    Directives:
    1. Tone: Professional, confident, enthusiastic, and passionate. 
    2. Content: Focus strictly on the value proposition. Connect the candidate's skills directly to the company's needs found in the job description.
    3. Structure: Use standard business letter formatting (Subject line, Salutation, Opening, Body Paragraphs, Closing).
    4. CRITICAL: Do NOT use cooking metaphors, puns, or the "JobCook" theme in the actual letter text. The output must be a serious, polished document ready to send to a hiring manager.
    5. Format: Markdown.
  `;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return response.text || "The chef is busy and couldn't write the letter.";
};

export const parseResume = async (base64Data: string, mimeType: string): Promise<Ingredient[]> => {
  const prompt = `
    You are an expert Resume Chef.
    Analyze the attached resume document.
    Extract key "ingredients" for a job application profile.
    
    Categorize them into:
    - 'skill' (Technical or soft skills)
    - 'experience' (Work history, job titles)
    - 'education' (Degrees, universities)
    - 'certification' (Certificates, courses)

    For 'experience', 'education', and 'certification', use the 'details' field to provide dates or short context (e.g. "2020-2022", "Senior Level").
    For 'skill', 'details' can be proficiency level if available, otherwise leave empty.

    Return a JSON array of objects with fields: name, category, details.
    Do not generate IDs, I will handle them.
  `;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            // Removed enum constraint to prevent validation errors on slight model deviations
            category: { type: Type.STRING },
            details: { type: Type.STRING },
          },
          required: ["name", "category"],
        },
      }
    }
  }));

  const text = response.text;
  if (!text) return [];
  
  try {
    const rawIngredients = JSON.parse(text);
    const validCategories = ['skill', 'experience', 'education', 'certification'];

    // Add IDs locally and normalize category
    return rawIngredients.map((i: any) => {
      let category = i.category ? i.category.toLowerCase() : 'skill';
      if (!validCategories.includes(category)) {
        category = 'skill'; // Default fallback
      }
      return {
        name: i.name || 'Unknown',
        category,
        details: i.details || '',
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      };
    });
  } catch (e) {
    throw new Error("Failed to read the chef's handwriting (JSON Parse Error).");
  }
};

export const extractJobDescriptionFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
  const prompt = `
    You are an OCR assistant used in a job application app.
    Extract the text from this job description screenshot.
    
    1. Maintain the logical structure (headers, bullet points) using Markdown.
    2. Ignore irrelevant UI elements (like "Apply Now" buttons, navigation bars, ads) if they appear in the screenshot.
    3. Return ONLY the raw extracted text in Markdown format.
  `;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: base64Data } },
        { text: prompt }
      ]
    },
  }));

  return response.text || "";
};