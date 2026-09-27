import { Prism } from "prism-react-renderer";

// prism-react-renderer only bundles a small default set of languages (no PHP, Bash, Java, C#,
// Ruby). Extra Prism language grammars self-register onto whatever object is assigned to
// global.Prism when required, so that assignment must happen before importing them — see
// https://github.com/FormidableLabs/prism-react-renderer#faq. Side-effect-only requires, so this
// file just needs to be imported once (from CodeBlock.tsx) before any <Highlight> renders.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(typeof global !== "undefined" ? (global as any) : (window as any)).Prism = Prism;

/* eslint-disable @typescript-eslint/no-require-imports -- must run synchronously, in this exact
   order, right after the global.Prism assignment above; a dynamic import() can't guarantee that. */
require("prismjs/components/prism-markup-templating");
require("prismjs/components/prism-php");
require("prismjs/components/prism-bash");
require("prismjs/components/prism-java");
require("prismjs/components/prism-csharp");
require("prismjs/components/prism-ruby");
require("prismjs/components/prism-sql");
require("prismjs/components/prism-yaml");
require("prismjs/components/prism-docker");
require("prismjs/components/prism-graphql");
/* eslint-enable @typescript-eslint/no-require-imports */
