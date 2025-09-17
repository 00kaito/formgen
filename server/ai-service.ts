import OpenAI from "openai";
import type { FormField, FormFieldType, FormResponse, FormTemplate } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AIGeneratedQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date' | 'email';
  required: boolean;
  options?: string[];
  helpText?: string;
}

export interface AIAnalysisResult {
  questions: FormField[];
  analysis: string;
}

export class AIService {
  /**
   * Converts form response data to readable text format for AI analysis
   */
  private formatFormDataForAI(template: FormTemplate, response: FormResponse): string {
    let formattedData = `Tytuł formularza: ${template.title}\n`;
    if (template.description) {
      formattedData += `Opis formularza: ${template.description}\n`;
    }
    formattedData += `\nOdpowiedzi użytkownika:\n`;

    // Process each field and its corresponding response
    template.fields.forEach((field: FormField) => {
      const fieldResponse = response.responses[field.id];
      
      if (fieldResponse !== undefined && fieldResponse !== null && fieldResponse !== '') {
        formattedData += `\n${field.label}: `;
        
        // Format response based on field type
        if (Array.isArray(fieldResponse)) {
          formattedData += fieldResponse.join(', ');
        } else if (typeof fieldResponse === 'object') {
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
    response: FormResponse
  ): Promise<AIAnalysisResult> {
    const formattedData = this.formatFormDataForAI(template, response);
    
    const prompt = `You are a business analyst. You are gathering data for a development team so they can implement a business process automation.

I received the description below. What additional questions should be asked to fully clarify the implementation? Are the provided answers thorough, or do you think we should ask about something else?

### FORMULARZ DATA START ###
${formattedData}
### FORMULARZ DATA END ###

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

Guidelines for questions:
- Ask specific, actionable questions that will help developers understand implementation requirements
- Focus on technical details, edge cases, integration points, and business rules
- Use appropriate field types (text for short answers, textarea for longer descriptions, select/radio/checkbox for predefined options)
- Limit to 3-7 most important questions
- Make questions clear and specific
- Include help text when the question might need clarification

Respond only with valid JSON.`;

    try {
      // Check if API key is available, if not use fallback
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not configured, using fallback questions');
        throw new Error('OPENAI_API_KEY not configured');
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1500
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Validate and sanitize the result
      if (!result.questions || !Array.isArray(result.questions)) {
        throw new Error('Invalid AI response format: missing questions array');
      }

      // Ensure each question has required fields and valid types
      const validTypes = ['text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date', 'email'];
      const sanitizedQuestions: FormField[] = result.questions
        .filter((q: any) => q.question && q.type && validTypes.includes(q.type))
        .map((q: any, index: number) => ({
          id: q.id || `ai_question_${index + 1}`,
          label: String(q.question),
          type: q.type as FormFieldType,
          required: Boolean(q.required),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          helpText: q.helpText ? String(q.helpText) : undefined,
          placeholder: q.placeholder ? String(q.placeholder) : undefined
        }));

      return {
        analysis: result.analysis || 'AI analysis completed',
        questions: sanitizedQuestions
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Always return fallback questions if AI fails for any reason - matching FormField structure
      return {
        analysis: 'AI analysis failed, providing default follow-up questions',
        questions: [
          {
            id: 'fallback_1',
            type: 'textarea',
            label: 'Are there any specific technical requirements or constraints we should consider?',
            helpText: 'Please describe any technical limitations, integrations, or special requirements',
            required: false,
            placeholder: 'Opisz szczegółowo...',
            options: []
          },
          {
            id: 'fallback_2',
            type: 'text',
            label: 'What is the expected volume of data or transactions?',
            helpText: 'Estimate daily/monthly usage to help with capacity planning',
            required: false,
            placeholder: 'Wprowadź odpowiedź...',
            options: []
          },
          {
            id: 'fallback_3',
            type: 'textarea',
            label: 'Are there any compliance or security requirements?',
            helpText: 'GDPR, industry regulations, data protection requirements, etc.',
            required: false,
            placeholder: 'Opisz szczegółowo...',
            options: []
          }
        ]
      };
    }
  }

}

// Export singleton instance
export const aiService = new AIService();