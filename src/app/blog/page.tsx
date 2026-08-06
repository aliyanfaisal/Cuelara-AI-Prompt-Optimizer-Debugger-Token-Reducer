export default function BlogPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
      <h1 className="text-4xl font-bold mb-4 text-foreground">Cuelara Blog</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-center">
        Tips, tricks, and best practices for AI prompt engineering and optimizing your token usage.
      </p>
      {/* Article list will go here */}
    </div>
  );
}
