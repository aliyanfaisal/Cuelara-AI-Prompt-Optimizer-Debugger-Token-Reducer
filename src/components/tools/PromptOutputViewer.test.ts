import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PromptOutputViewer, PromptViewToggle } from "./PromptOutputViewer";

describe("PromptOutputViewer", () => {
  it("renders markdown headings and bold text in rendered mode by default", () => {
    const content = "### ROLE\nYou are an **expert** engineer.\n\n- Rule 1\n- Rule 2";
    const html = renderToStaticMarkup(
      createElement(PromptOutputViewer, {
        content,
        viewMode: "rendered",
      })
    );

    // Should render heading as h3, bold as strong, lists as ul/li
    assert.match(html, /<h3[^>]*>ROLE<\/h3>/);
    assert.match(html, /<strong[^>]*>expert<\/strong>/);
    assert.match(html, /<ul[^>]*>/);
    assert.match(html, /<li>Rule 1<\/li>/);
  });

  it("renders raw preformatted text when viewMode is text", () => {
    const content = "### ROLE\nYou are an **expert** engineer.";
    const html = renderToStaticMarkup(
      createElement(PromptOutputViewer, {
        content,
        viewMode: "text",
      })
    );

    assert.match(html, /<pre[^>]*>/);
    assert.match(html, /### ROLE/);
    assert.match(html, /\*\*expert\*\*/);
    assert.doesNotMatch(html, /<h3/);
    assert.doesNotMatch(html, /<strong/);
  });

  it("renders fenced code block for non-markdown languages like xml or json", () => {
    const xmlContent = "<instruction>Do something</instruction>";
    const html = renderToStaticMarkup(
      createElement(PromptOutputViewer, {
        content: xmlContent,
        viewMode: "rendered",
        language: "xml",
      })
    );

    assert.match(html, /bg-\[#0d1117\]/);
    assert.match(html, /&lt;instruction&gt;Do something&lt;\/instruction&gt;/);
  });

  it("renders streaming indicator when isStreaming is true", () => {
    const html = renderToStaticMarkup(
      createElement(PromptOutputViewer, {
        content: "Drafting prompt...",
        isStreaming: true,
        viewMode: "rendered",
      })
    );

    assert.match(html, /aria-label="Generating"/);
  });
});

describe("PromptViewToggle", () => {
  it("renders both Rendered and Text buttons with correct active states", () => {
    const html = renderToStaticMarkup(
      createElement(PromptViewToggle, {
        viewMode: "rendered",
        onViewModeChange: () => {},
      })
    );

    assert.match(html, /aria-pressed="true"[^>]*>.*Rendered/);
    assert.match(html, /aria-pressed="false"[^>]*>.*Text/);
  });
});
