export default function CookbookPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
      <h1 className="text-4xl font-bold mb-4 text-foreground">Prompt Cookbook</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-center">
        A comprehensive library of optimized, production-ready prompts for various AI models, programming languages, and tasks.
      </p>
      {/* Category grid will go here */}
    </div>
  );
}
