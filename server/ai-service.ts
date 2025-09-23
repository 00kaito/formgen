import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
console.log('Loaded API key:', process.env.OPENAI_API_KEY);

import OpenAI from "openai";
import type { FormField, FormResponse, FormTemplate } from "@shared/schema";


// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

// Initialize OpenAI client only if API key is provided
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface AIGeneratedQuestion {
  id: string;
  question: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "number"
    | "date"
    | "email";
  required: boolean;
  options?: string[];
  helpText?: string;
}

export interface AIAnalysisResult {
  questions: AIGeneratedQuestion[];
  analysis: string;
}

export class AIService {
  /**
   * Converts form response data to readable text format for AI analysis
   */
  private formatFormDataForAI(
    template: FormTemplate,
    response: FormResponse,
  ): string {
    let formattedData = `Tytuł formularza: ${template.title}\n`;
    if (template.description) {
      formattedData += `Opis formularza: ${template.description}\n`;
    }
    formattedData += `\nOdpowiedzi użytkownika:\n`;

    // Process each field and its corresponding response
    template.fields.forEach((field: FormField) => {
      const fieldResponse = response.responses[field.id];

      if (
        fieldResponse !== undefined &&
        fieldResponse !== null &&
        fieldResponse !== ""
      ) {
        formattedData += `\n${field.label}: `;

        // Format response based on field type
        if (Array.isArray(fieldResponse)) {
          // Handle arrays (checkboxes, multi-select)
          formattedData += fieldResponse.join(", ");
        } else if (typeof fieldResponse === "object" && fieldResponse !== null) {
          // Better object formatting - convert to readable text
          try {
            if (fieldResponse.hasOwnProperty('value')) {
              formattedData += String(fieldResponse.value);
            } else if (fieldResponse.hasOwnProperty('text')) {
              formattedData += String(fieldResponse.text);
            } else {
              // Extract readable values from object
              const readableValues = Object.entries(fieldResponse)
                .map(([key, value]) => `${key}: ${String(value)}`)
                .join('; ');
              formattedData += readableValues || JSON.stringify(fieldResponse);
            }
          } catch (e) {
            formattedData += JSON.stringify(fieldResponse);
          }
        } else {
          formattedData += String(fieldResponse);
        }

        if (field.helpText) {
          formattedData += ` (Pomoc: ${field.helpText})`;
        }
      } else {
        formattedData += `\n${field.label}: [brak odpowiedzi]`;
      }
    });

    // Debug: Log the formatted data to see what AI receives
    console.log("[DEBUG] Formatted data for AI:");
    console.log("=".repeat(50));
    console.log(formattedData);
    console.log("=".repeat(50));

    return formattedData;
  }

  /**
   * Generates additional clarifying questions using AI based on form response
   */
  async generateFollowUpQuestions(
    template: FormTemplate,
    response: FormResponse,
  ): Promise<AIAnalysisResult> {
    const formattedData = this.formatFormDataForAI(template, response);

    const prompt = `You are a business analyst. I received the process description below, but I need to ask some follow-up questions to gather more specific details for the development team. Please generate a list of precise, technical questions based on the provided answers. Your goal is to identify and clarify any ambiguities, logical gaps, or missing details.

When crafting the questions, please consider the following:
* **Don't ask about information already explicitly provided.**
* **Focus on the "why" and "how."** For example, if someone mentioned a problem, ask about its root cause and specific impact. If they mentioned a system, ask about its API, data structure, or version.
* **Challenge assumptions.** Look for areas where the process seems simplistic or where details are glossed over.
* **Address potential edge cases and exceptions.** What happens when things don't go as planned?
* **Focus on the future automated process (to-be).** What specific changes will the new system need to support?
* **Limit to 3-7 most important questions**
* **Make questions clear and specific**
* **Ask specific, actionable questions that will help developers understand implementation requirements**

**Here is the filled-out form:**

### FORMULARZ DATA START ###
${formattedData}
### FORMULARZ DATA END ###
**Based on this, what are the most critical follow-up questions we need to ask?**

Please respond with a JSON object in the following format:
{
  "analysis": "Brief analysis of what additional information is needed",
  "questions": [
    {
      "id": "unique_id_1",
      "question": "What is the question text?",
      "type": "text|textarea|select|radio|checkbox|number|date|email",
      "required": true|false,
      "options": ["option1", "option2"] // only for select, radio, checkbox types
      "helpText": "Optional help text for the question"
    }
  ]
}


Respond only with valid JSON.`;

    try {
      // Check if API key is available, if not use fallback
      if (!process.env.OPENAI_API_KEY || !openai) {
        console.warn("OPENAI_API_KEY not configured, using fallback questions");
        throw new Error("OPENAI_API_KEY not configured");
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Use gpt-4o which is currently available
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1500,
      });

      console.log(
        "[DEBUG] OpenAI response:",
        completion.choices[0].message.content,
      );
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      console.log("[DEBUG] Parsed AI result:", JSON.stringify(result, null, 2));

      // Validate and sanitize the result
      if (!result.questions || !Array.isArray(result.questions)) {
        console.warn("[DEBUG] Invalid AI response format:", result);
        throw new Error("Invalid AI response format: missing questions array");
      }

      // Ensure each question has required fields and valid types
      const validTypes = [
        "text",
        "textarea",
        "select",
        "radio",
        "checkbox",
        "number",
        "date",
        "email",
      ];
      const sanitizedQuestions: AIGeneratedQuestion[] = result.questions
        .filter((q: any) => q.question && q.type && validTypes.includes(q.type))
        .map((q: any, index: number) => ({
          id: q.id || `ai_question_${index + 1}`,
          question: String(q.question),
          type: q.type,
          required: Boolean(q.required),
          options: Array.isArray(q.options) ? q.options.map(String) : undefined,
          helpText: q.helpText ? String(q.helpText) : undefined,
        }));

      return {
        analysis: result.analysis || "AI analysis completed",
        questions: sanitizedQuestions,
      };
    } catch (error) {
      console.error("AI Service Error:", error);

      // Always return fallback questions if AI fails for any reason
      return {
        analysis: "AI analysis failed, providing default follow-up questions",
        questions: [
          {
            id: "fallback_1",
            question:
              "Are there any specific technical requirements or constraints we should consider?",
            type: "textarea",
            required: false,
            helpText:
              "Please describe any technical limitations, integrations, or special requirements",
          },
          {
            id: "fallback_2",
            question: "What is the expected volume of data or transactions?",
            type: "text",
            required: false,
            helpText:
              "Estimate daily/monthly usage to help with capacity planning",
          },
          {
            id: "fallback_3",
            question: "Are there any compliance or security requirements?",
            type: "textarea",
            required: false,
            helpText:
              "GDPR, industry regulations, data protection requirements, etc.",
          },
        ],
      };
    }
  }

  /**
   * Generates a Mermaid process flow chart based on form response data
   */
  async generateProcessFlow(
    template: FormTemplate,
    response: FormResponse,
  ): Promise<string> {
    const formattedData = this.formatFormDataForAI(template, response);

    const prompt = `You are an expert business process analyst. Analyze the specific form data below and create a detailed Mermaid flowchart that represents the ACTUAL process workflow described in the user's responses.

CRITICAL INSTRUCTIONS:
1. ANALYZE the specific answers provided in the form data - don't create a generic process
2. CREATE a flowchart based on the ACTUAL activities, steps, decisions, and conditions mentioned by the user
3. IDENTIFY specific process steps, decision points, responsible parties, conditions, and outcomes from the form responses
4. INCLUDE specific names, departments, systems, tools, and procedures mentioned in the form
5. CREATE decision points based on ACTUAL conditions, criteria, or choices mentioned in the responses
6. SHOW parallel processes if multiple departments/people are involved simultaneously
7. REFLECT the complexity and reality of the described process - not a simplified generic version

**SPECIFIC FORM DATA TO ANALYZE:**
### FORMULARZ DATA START ###
${formattedData}
### FORMULARZ DATA END ###

ANALYZE THE ABOVE DATA AND:
- Extract specific process steps mentioned by the user
- Identify actual decision criteria and conditions
- Note responsible parties, departments, or roles
- Find dependencies, prerequisites, and sequence requirements
- Identify different paths, exceptions, and alternative flows
- Include specific tools, systems, or documents mentioned
- Capture timing, deadlines, or sequence requirements

Create a Mermaid flowchart using 'flowchart TD' format that shows:
- [Process Steps] in rectangles with SPECIFIC names from the form
- {Actual Decision Points?} in diamonds based on REAL conditions from the responses  
- ((Start/End Points)) as circles
- Different paths based on ACTUAL conditions and scenarios described
- Subprocesses if mentioned: [Subprocess Name]
- Parallel processes with --> and separate branches

Use specific terminology and names from the form responses. Make the flowchart detailed and realistic based on the actual described process.

Return ONLY valid Mermaid flowchart code, nothing else.`;

    // Debug: Log the full prompt that goes to AI
    console.log("[DEBUG] Full AI Prompt for Process Flow:");
    console.log("=".repeat(70));
    console.log(prompt);
    console.log("=".repeat(70));

    try {
      // Check if API key is available, if not use fallback
      if (!process.env.OPENAI_API_KEY || !openai) {
        console.warn("OPENAI_API_KEY not configured, using fallback process flow");
        return this.getFallbackProcessFlow(template);
      }

      console.log("[DEBUG] Sending request to OpenAI GPT-4o...");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 1000,
      });

      const rawMermaidCode = completion.choices[0].message.content?.trim() || '';
      
      console.log("[DEBUG] Raw AI Response:");
      console.log(rawMermaidCode);
      console.log("[DEBUG] Generated Mermaid Process Flow Length:", rawMermaidCode.length);

      // Clean up the Mermaid code
      let mermaidCode = rawMermaidCode;
      
      // Remove markdown code blocks if present
      mermaidCode = mermaidCode.replace(/```mermaid\n?/g, '');
      mermaidCode = mermaidCode.replace(/```\n?/g, '');
      
      // Fix HTML entities in arrows
      mermaidCode = mermaidCode.replace(/--&gt;/g, '-->');
      mermaidCode = mermaidCode.replace(/&gt;/g, '>');
      mermaidCode = mermaidCode.replace(/&lt;/g, '<');
      mermaidCode = mermaidCode.replace(/&quot;/g, '"');
      mermaidCode = mermaidCode.replace(/&#39;/g, "'");
      
      // Remove extra whitespace and fix line endings
      mermaidCode = mermaidCode.trim();
      
      console.log("[DEBUG] Cleaned Mermaid Code:");
      console.log(mermaidCode);

      // Basic validation - check if it starts with flowchart
      if (!mermaidCode.includes('flowchart') && !mermaidCode.includes('graph')) {
        console.warn("[DEBUG] Invalid Mermaid format, using fallback");
        console.log("[DEBUG] AI Response doesn't contain 'flowchart' or 'graph'");
        return this.getFallbackProcessFlow(template);
      }

      console.log("[DEBUG] ✅ Valid Mermaid format detected and cleaned");
      return mermaidCode;
    } catch (error) {
      console.error("AI Process Flow Generation Error:", error);
      return this.getFallbackProcessFlow(template);
    }
  }

  /**
   * Returns a fallback process flow chart when AI generation fails
   */
  private getFallbackProcessFlow(template: FormTemplate): string {
    return `flowchart TD
    A[Start: ${template.title}] --> B[User fills form]
    B --> C{Form complete?}
    C -->|Yes| D[Process submission]
    C -->|No| E[Request missing info]
    E --> B
    D --> F[Store data]
    F --> G[Send confirmation]
    G --> H[End]`;
  }

  /**
   * Converts AI-generated questions to FormField format for the form builder
   */
  convertAIQuestionsToFormFields(
    aiQuestions: AIGeneratedQuestion[],
  ): FormField[] {
    return aiQuestions.map((aiQuestion) => ({
      id: aiQuestion.id,
      type: aiQuestion.type,
      label: aiQuestion.question,
      required: aiQuestion.required,
      options: aiQuestion.options || [],
      helpText: aiQuestion.helpText,
      placeholder: this.generatePlaceholder(
        aiQuestion.type,
        aiQuestion.question,
      ),
      validation: {
        min: aiQuestion.type === "number" ? 0 : undefined,
        max: aiQuestion.type === "number" ? 999999 : undefined,
        pattern:
          aiQuestion.type === "email" ? "^[^@]+@[^@]+\\.[^@]+$" : undefined,
      },
    }));
  }

  /**
   * Generate appropriate placeholder text based on question type and content
   */
  private generatePlaceholder(type: string, question: string): string {
    const lowercaseQuestion = question.toLowerCase();

    switch (type) {
      case "email":
        return "przykład@email.com";
      case "number":
        if (
          lowercaseQuestion.includes("wiek") ||
          lowercaseQuestion.includes("age")
        ) {
          return "np. 25";
        }
        if (
          lowercaseQuestion.includes("rok") ||
          lowercaseQuestion.includes("year")
        ) {
          return "np. 2024";
        }
        return "Wprowadź liczbę";
      case "date":
        return "Wybierz datę";
      case "textarea":
        return "Opisz szczegółowo...";
      case "text":
      default:
        return "Wprowadź odpowiedź...";
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
