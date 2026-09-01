import { prisma } from "@/lib/prisma";
import CookbookDashboard from "./CookbookDashboard";

export const metadata = {
  title: "Cookbook Management | Admin",
};

export default async function CookbookPage() {
  const categories = await prisma.cookbookCategory.findMany({
    orderBy: { name: "asc" },
  });

  const prompts = await prisma.cookbookPrompt.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
    }
  });

  const geminiApiKey = await prisma.setting.findUnique({
    where: { key: "GEMINI_API_KEY" }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Cookbook Library</h1>
        <p className="text-muted-foreground">Manage official public prompt templates and their categories.</p>
      </div>

      <CookbookDashboard 
        initialCategories={categories} 
        initialPrompts={prompts} 
        initialSettings={{ geminiApiKey: geminiApiKey?.value || "" }} 
      />
    </div>
  );
}
