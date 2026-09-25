import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { tryDecryptSecret } from "@/lib/secret-box";
import { withGenAIRetry } from "@/lib/genai-retry";
import { GENAI_TIMEOUT_MS } from "@/lib/genai-timeout";
import { GoogleGenAI, Type } from "@google/genai";
import { reportError } from "@/lib/error-report";

export async function POST(req: Request) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hint, count } = await req.json();

    const requestCount = parseInt(count, 10);
    if (isNaN(requestCount) || requestCount < 1 || requestCount > 50) {
      return NextResponse.json({ error: "Count must be a number between 1 and 50." }, { status: 400 });
    }

    // Get the API key from DB
    const setting = await prisma.setting.findUnique({
      where: { key: "GEMINI_API_KEY" }
    });

    const apiKey = setting?.value ? tryDecryptSecret(setting.value) : null;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key is not configured in settings." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GENAI_TIMEOUT_MS } });

    const promptText = `
You are an expert platform architect. Your task is to generate unique and highly relevant category ideas for a Prompt Engineering Cookbook platform.
The user requested ${requestCount} parent categories.
${hint ? `The user provided the following hint/context: "${hint}"` : ""}

You must return a JSON array containing exactly ${requestCount} objects. Each object represents a top-level parent category.
If appropriate, you may include an array of up to 3 child categories for each parent in a "children" property.

Each object must follow this schema:
{
  "name": "Category Name",
  "slug": "url-friendly-slug",
  "description": "Short description of what kind of prompts belong in this category.",
  "children": [
    {
      "name": "Subcategory Name",
      "slug": "url-friendly-slug",
      "description": "Short description."
    }
  ]
}
`;

    const response = await withGenAIRetry(() => ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: promptText,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        slug: { type: Type.STRING },
                        description: { type: Type.STRING },
                        children: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING },
                              slug: { type: Type.STRING },
                              description: { type: Type.STRING },
                            },
                            required: ["name", "slug", "description"]
                          }
                        }
                    },
                    required: ["name", "slug", "description"]
                }
            }
        }
    }));

    if (!response.text) {
        throw new Error("No response from AI");
    }
    
    const data = JSON.parse(response.text);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("AI Category Generation Error:", error);
    void reportError(error, { source: "api", route: "/api/admin/generate-bulk-categories" });
    return NextResponse.json({ error: error.message || "Failed to generate categories." }, { status: 500 });
  }
}
