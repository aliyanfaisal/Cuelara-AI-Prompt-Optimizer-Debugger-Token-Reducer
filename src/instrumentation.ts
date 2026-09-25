// Next.js calls this for any error thrown while handling a request that nothing caught (server components,
// route handlers, server actions). Routes that catch their own errors report them explicitly instead.
export async function onRequestError(error: unknown, request: { path: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("@/lib/error-report");
  await reportError(error, { source: "server", route: request.path.split("?")[0] });
}
