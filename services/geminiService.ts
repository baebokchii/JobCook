import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Ingredient, DishAnalysis, CompanyResearchResult, InterviewMessage } from "../types.ts";

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

    Analyze the ingredients against the recipe with a focus on ATS (Applicant Tracking System) optimization.
    1. Give a "Match Score" from 0 to 100 based on keyword matching and semantic relevance.
    2. List "Missing Ingredients" (Critical keywords, skills, or experiences the job asks for but I lack).
    3. Provide a "Taste Profile" (A summary of the fit, highlighting strengths).
    4. Give 3 "Chef Tips" to improve the dish (Actionable advice to pass the ATS).
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

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return {
    summary: response.text || "No information found.",
    sources: [] 
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

export const refineDescription = async (text: string, category: string): Promise<string[]> => {
  const prompt = `
    You are a Resume Polish Expert.
    Refine the following "${category}" description to be more professional, impactful, and ATS-friendly.
    
    Original Text: "${text}"

    Provide exactly 3 distinct variations:
    1. **Action-Oriented:** Start with strong action verbs.
    2. **Quantified/Result-Driven:** Emphasize numbers or outcomes (add placeholders like [X%] if needed).
    3. **Professional/Concise:** Clean, formal, and direct.

    Return JSON format only:
    { "variations": ["Variation 1 text", "Variation 2 text", "Variation 3 text"] }
  `;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          variations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["variations"]
      }
    }
  }));

  const textResponse = response.text;
  if (!textResponse) return ["Could not generate variations."];
  try {
    const json = JSON.parse(textResponse);
    return json.variations;
  } catch (e) {
    return ["Error parsing improvements."];
  }
};

export const parseResume = async (base64Data: string, mimeType: string): Promise<Ingredient[]> => {
  const prompt = `
    You are an expert Resume Chef.
    Analyze the attached resume document.
    Extract key "ingredients" for a job application profile.
    
    Categorize them into one of these EXACT categories:
    - 'education' (Degrees, universities, high schools)
    - 'experience' (Work history, internships, employment)
    - 'project' (Academic projects, capstones, hackathons, personal projects)
    - 'certification' (Certificates, online courses, bootcamps, awards, honors)
    - 'skill' (Technical or soft skills, languages, tools)

    CRITICAL INSTRUCTION FOR 'details':
    - For 'experience' AND 'project': You MUST extract the full list of bullet points, responsibilities, and achievements. Do not summarize or truncate. Copy the content. Include dates and location at the beginning (e.g., "Jan 2023 - Present | City, Country \n- Responsibility 1...").
    - For 'education': Include degree, institution, dates, GPA (if available).
    - For 'skill': Proficiency level or related context.

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
    const validCategories = ['skill', 'experience', 'education', 'certification', 'project'];

    return rawIngredients.map((i: any) => {
      let category = i.category ? i.category.toLowerCase() : 'skill';
      if (!validCategories.includes(category)) {
        // Fallback logic for miscategorized items
        if (category.includes('work') || category.includes('intern')) category = 'experience';
        else if (category.includes('school') || category.includes('degree')) category = 'education';
        else if (category.includes('project')) category = 'project';
        else category = 'skill'; 
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

// --- Mock Interview (Taste Test) Functions ---

export const getInterviewQuestion = async (
  ingredients: Ingredient[],
  jobDescription: string,
  history: InterviewMessage[]
): Promise<string> => {
  const ingredientsList = ingredients.map(i => i.name).join(', ');
  
  // Filter history to only include text content to save tokens
  const conversationContext = history
    .map(msg => `${msg.role === 'chef' ? 'Interviewer' : 'Candidate'}: ${msg.content}`)
    .join('\n');

  const prompt = `
    You are a tough but fair Hiring Manager conducting an interview for the following job:
    "${jobDescription.substring(0, 500)}..."

    Candidate's Resume Highlights: ${ingredientsList}

    Current Conversation History:
    ${conversationContext}

    Your Task:
    Based on the context, ask the NEXT single interview question.
    - If this is the start, ask a "Tell me about yourself" or introductory question relevant to the role.
    - If the candidate just answered, ask a follow-up probing question OR move to a new topic (Technical, Behavioral, or Situational) based on the job requirements.
    - Keep the question professional, direct, and challenging.
    - Do NOT provide feedback yet, just ask the question.
  `;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return response.text || "Could you tell me a bit more about your background?";
};

export const evaluateAudioAnswer = async (
  question: string,
  audioBase64: string,
  mimeType: string
): Promise<{ feedback: string; score: number; transcription: string }> => {
  const prompt = `
    You are an Expert Interview Coach using the HireVue methodology.
    
    Context:
    The interviewer asked: "${question}"
    
    Task:
    1. Listen to the candidate's audio answer carefully.
    2. Transcribe the main points of what they said.
    3. Evaluate the answer using the STAR method (Situation, Task, Action, Result).
    4. Provide a score from 1-10.
    5. Provide brief, constructive feedback on both content and delivery (clarity, confidence).

    Return JSON format only:
    { 
      "transcription": "Summary of what was said",
      "feedback": "Constructive feedback...", 
      "score": number 
    }
  `;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: audioBase64 } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcription: { type: Type.STRING },
          feedback: { type: Type.STRING },
          score: { type: Type.NUMBER },
        },
        required: ["transcription", "feedback", "score"],
      }
    }
  }));

  const text = response.text;
  if (!text) throw new Error("Could not evaluate answer.");
  return JSON.parse(text);
};

export const evaluateAnswer = async (
  question: string,
  answer: string
): Promise<{ feedback: string; score: number }> => {
  const prompt = `
    You are an Expert Interview Coach.
    
    Question Asked: "${question}"
    Candidate's Answer: "${answer}"

    Evaluate the answer using the STAR method (Situation, Task, Action, Result) principles.
    1. Provide a score from 1-10.
    2. Provide brief, constructive feedback. Highlight what was good and what was missing (e.g., "You didn't mention the result" or "Great detailed action").
    
    Return JSON format: { "feedback": string, "score": number }
  `;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          feedback: { type: Type.STRING },
          score: { type: Type.NUMBER },
        },
        required: ["feedback", "score"],
      }
    }
  }));

  const text = response.text;
  if (!text) throw new Error("Could not evaluate answer.");
  return JSON.parse(text);
};