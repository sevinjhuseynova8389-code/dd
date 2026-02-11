
import { GoogleGenAI, Type } from "@google/genai";
import { Expense, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeExpenses = async (expenses: Expense[]): Promise<string> => {
  if (expenses.length === 0) return "Добавьте несколько расходов, чтобы я мог их проанализировать.";

  const expensesSummary = expenses
    .map(e => `${e.date}: ${e.amount} руб. на ${e.category} (${e.description})`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Проанализируй следующие расходы и дай 3 кратких совета по экономии на русском языке. Будь конструктивным и вежливым.\n\n${expensesSummary}`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text || "Не удалось получить анализ.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Произошла ошибка при анализе данных.";
  }
};

export const parseNaturalLanguageExpense = async (text: string): Promise<Partial<Expense> | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Извлеки информацию о расходе из текста: "${text}". Верни JSON объект с полями: amount (number), category (one of: ${Object.values(Category).join(', ')}), description (string). Если категория не ясна, используй "Прочее". Сегодняшняя дата по умолчанию.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["amount", "category", "description"]
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (jsonStr) {
      return JSON.parse(jsonStr);
    }
    return null;
  } catch (error) {
    console.error("Parsing Error:", error);
    return null;
  }
};
