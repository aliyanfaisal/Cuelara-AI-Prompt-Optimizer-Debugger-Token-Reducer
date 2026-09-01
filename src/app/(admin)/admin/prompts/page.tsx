import { prisma } from "@/lib/prisma";
import PromptManager from "./PromptManager";

export const metadata = {
  title: "Prompts Management | Admin",
};

export default async function PromptsPage() {
  const prompts = await prisma.prompt.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { email: true, name: true, image: true }
      }
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Prompts Management</h1>
          <p className="text-muted-foreground">View and manage all user-generated prompts across the platform.</p>
        </div>
      </div>

      <PromptManager initialPrompts={prompts} />
    </div>
  );
}
