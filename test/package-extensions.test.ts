import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// Exercise the consumer-facing manifest entries, not just the source imports.
test("default discovery registers one question tool and the legacy bridge, without subagent tools", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.private, true, "this package is distributed through a private Git repository");
  assert.equal(manifest.pi.extensions.length, 2);
  assert.equal(new Set(manifest.pi.extensions).size, 2);
  const tools: string[] = [];
  const events: string[] = [];
  for (const entry of manifest.pi.extensions) {
    const { default: load } = await import(new URL(`../${entry}`, import.meta.url).href);
    load({
      registerTool(tool: { name: string }) { tools.push(tool.name); },
      on(name: string) { events.push(name); },
      events: { on() {}, emit() {} },
    });
  }
  assert.deepEqual(tools, ["ask_user_question"]);
  assert.ok(events.includes("ui_prompt_start"));
  assert.ok(events.includes("ui_prompt_end"));
  assert.ok(events.includes("session_shutdown"));
});
