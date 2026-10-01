import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDomain, domainCovers } from "./domain";

test("normalizeDomain reduces URLs and hosts to a bare domain", () => {
  assert.equal(normalizeDomain("https://www.Example.com/path?q=1"), "example.com");
  assert.equal(normalizeDomain("*.example.co.uk"), "example.co.uk");
  assert.equal(normalizeDomain("app.example.com:8080"), "app.example.com");
  assert.equal(normalizeDomain("example.com."), "example.com");
});

test("normalizeDomain rejects things that are not real hostnames", () => {
  for (const bad of ["", "localhost", "192.168.1.1", "exa mple.com", "-bad.com", "chrome://extensions", "a..com"]) {
    assert.equal(normalizeDomain(bad), null, bad);
  }
});

test("domainCovers matches the domain and its subdomains only", () => {
  assert.equal(domainCovers("example.com", "example.com"), true);
  assert.equal(domainCovers("example.com", "app.example.com"), true);
  assert.equal(domainCovers("example.com", "badexample.com"), false);
  assert.equal(domainCovers("example.com", "example.com.evil.io"), false);
});
