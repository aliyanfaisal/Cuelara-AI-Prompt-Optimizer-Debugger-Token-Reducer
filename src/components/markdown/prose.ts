// No @tailwindcss/typography plugin is installed, so react-markdown output gets its look from these
// manual utility overrides instead of a `prose` class. Mirrors the styling the blog post page uses.
export const markdownProseClass =
  "space-y-4 leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_img]:rounded-xl [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-0 [&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-6";
