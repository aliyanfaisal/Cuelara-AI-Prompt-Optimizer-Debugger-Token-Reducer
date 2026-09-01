import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI, Type, Schema } from "@google/genai";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryName, idea } = await req.json();

    if (!categoryName) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }

    // Get the API key from DB
    const setting = await prisma.setting.findUnique({
      where: { key: "GEMINI_API_KEY" }
    });

    const apiKey = setting?.value;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key is not configured in settings." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
You are an expert AI prompt engineer. Create a highly detailed "Cookbook Prompt" based on the following input:
Category: ${categoryName}
User Idea/Topic: ${idea || "Generate a generic but highly useful and advanced prompt for this category."}

You must return a JSON object with the following schema:
{
  "title": "A catchy, clear title for the prompt",
  "explanation": "HTML formatted explanation of what this prompt does",
  "whenToUse": "HTML formatted explanation of when to use it",
  "bestPractices": "HTML formatted list of best practices",
  "commonMistakes": "HTML formatted list of common mistakes",
  "faqs": "HTML formatted FAQ section",
  "promptTemplate": "The actual raw prompt template with placeholders like [Topic]",
  "exampleInput": "A raw text example of inputs for the placeholders",
  "exampleOutput": "A simulated raw text example of the AI's output",
  "seoTitle": "SEO optimized title",
  "seoDesc": "SEO optimized meta description (150 chars max)"
}

For all HTML fields, use standard tags like <p>, <ul>, <li>, <strong>, <h3>. Do not include Markdown.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: promptText,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    whenToUse: { type: Type.STRING },
                    bestPractices: { type: Type.STRING },
                    commonMistakes: { type: Type.STRING },
                    faqs: { type: Type.STRING },
                    promptTemplate: { type: Type.STRING },
                    exampleInput: { type: Type.STRING },
                    exampleOutput: { type: Type.STRING },
                    seoTitle: { type: Type.STRING },
                    seoDesc: { type: Type.STRING },
                },
                required: ["title", "explanation", "whenToUse", "bestPractices", "commonMistakes", "promptTemplate", "exampleInput", "exampleOutput"]
            }
        }
    });

    if (!response.text) {
        throw new Error("No response from AI");
    }
    
    const data = JSON.parse(response.text);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate prompt." }, { status: 500 });
  }
}
