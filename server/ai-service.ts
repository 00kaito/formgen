import OpenAI from "openai";
import type { FormField, FormResponse, FormTemplate } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
          formattedData += fieldResponse.join(", ");
        } else if (typeof fieldResponse === "object") {
          formattedData += JSON.stringify(fieldResponse);
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
      if (!process.env.OPENAI_API_KEY) {
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

    const prompt = `You are a business process analyst. Based on the form submission below, create a Mermaid flowchart that represents the process workflow described by the user.

The flowchart should:
* Show the logical flow of the described process
* Include decision points where applicable
* Show different paths based on conditions
* Use proper Mermaid flowchart syntax
* Be clear and easy to understand
* Focus on the main process steps and decision points

**Form Data:**
### FORMULARZ DATA START ###
${formattedData}
### FORMULARZ DATA END ###

Please create a Mermaid flowchart using the 'flowchart TD' (top-down) format. Use:
- Rectangles for process steps: [Step Name]
- Diamonds for decisions: {Decision?}
- Different shapes for different types of actions
- Proper connections with labels where needed

Return ONLY the Mermaid code, nothing else. Example format:
flowchart TD
    A[Start] --> B[Process Step]
    B --> C{Decision?}
    C -->|Yes| D[Action 1]
    C -->|No| E[Action 2]
    D --> F[End]
    E --> F[End]

Respond with only valid Mermaid flowchart code.`;

    try {
      // Check if API key is available, if not use fallback
      if (!process.env.OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY not configured, using fallback process flow");
        return this.getFallbackProcessFlow(template);
      }

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

      const mermaidCode = completion.choices[0].message.content?.trim() || '';
      
      console.log("[DEBUG] Generated Mermaid Process Flow:", mermaidCode);

      // Basic validation - check if it starts with flowchart
      if (!mermaidCode.includes('flowchart') && !mermaidCode.includes('graph')) {
        console.warn("[DEBUG] Invalid Mermaid format, using fallback");
        return this.getFallbackProcessFlow(template);
      }

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
