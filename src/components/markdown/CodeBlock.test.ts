import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { CodeBlock, extractText } from "./CodeBlock";

const render = (md: string) => renderToStaticMarkup(createElement(ReactMarkdown, { components: { pre: CodeBlock } }, md));
// Syntax-highlighted code is split across many <span> tokens, so content checks strip tags first.
const stripTags = (html: string) => html.replace(/<[^>]+>/g, "");

describe("blog CodeBlock", () => {
  it("renders fenced code in an always-dark block with a copy button and language label", () => {
    const html = render("```bash\nnpm install --save-dev husky\n```");
    assert.match(html, /bg-\[#0d1117\]/);
    assert.match(html, /aria-label="Copy code"/);
    assert.match(html, />bash</);
    assert.match(stripTags(html), /npm install --save-dev husky/);
  });

  it("syntax-highlights a recognized language into colored tokens", () => {
    const html = render('```php\n<?php\necho "hi";\n```');
    assert.match(html, /token/);
    assert.match(stripTags(html), /echo &quot;hi&quot;;/);
  });

  it("omits the language label for unlabeled fences", () => {
    const html = render("```\nplain\n```");
    assert.match(html, /aria-label="Copy code"/);
    assert.doesNotMatch(html, /uppercase tracking-wider/);
  });

  it("leaves inline code alone", () => {
    const html = render("Use `prepare` here");
    assert.doesNotMatch(html, /Copy code/);
    assert.match(html, /<code>prepare<\/code>/);
  });

  it("still escapes raw HTML inside code blocks", () => {
    const html = render("```html\n<script>alert(1)</script>\n```");
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;/);
    assert.match(stripTags(html), /script/);
  });

  it("extracts the text to copy from nested nodes", () => {
    assert.equal(extractText(["a", createElement("span", null, "b", createElement("i", null, "c")), 4]), "abc4");
  });
});
