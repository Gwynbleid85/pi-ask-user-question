import assert from "node:assert/strict";
import test from "node:test";
import extension from "../extensions/ask-user-question.ts";

function tool() {
  let registered: any;
  extension({ registerTool(value: any) { registered = value; } } as any);
  return registered;
}

test("free text uses the native editor and returns a structured trimmed answer", async () => {
  const result = await tool().execute("text", { question: "Your name?", details: "Shown on reports" }, undefined, undefined, {
    hasUI: true,
    ui: { editor: async (title: string) => {
      assert.equal(title, "Your name?\n\nShown on reports");
      return "  Ada  ";
    } },
  });
  assert.equal(result.details.status, "answered");
  assert.equal(result.details.mode, "text");
  assert.deepEqual(result.details.answers, [{ type: "text", label: "Ada", value: "Ada" }]);
});

test("editor cancellation returns a cancelled result", async () => {
  const result = await tool().execute("cancel", { question: "Your name?" }, undefined, undefined, {
    hasUI: true, ui: { editor: async () => undefined },
  });
  assert.equal(result.details.status, "cancelled");
  assert.deepEqual(result.details.answers, []);
});

test("no-UI mode returns unavailable without opening a prompt", async () => {
  const result = await tool().execute("headless", { question: "Your name?" }, undefined, undefined, {
    hasUI: false,
    ui: { editor() { assert.fail("headless mode must not open a prompt"); } },
  });
  assert.equal(result.details.status, "unavailable");
});

test("an already aborted call returns cancelled without opening a prompt", async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await tool().execute("abort", { question: "Your name?" }, controller.signal, undefined, {
    hasUI: true,
    ui: { editor() { assert.fail("aborted calls must not open a prompt"); } },
  });
  assert.equal(result.details.status, "cancelled");
});

test("a failed editor releases the UI mutex for the next question", async () => {
  const question = tool();
  await assert.rejects(question.execute("failure", { question: "First?" }, undefined, undefined, {
    hasUI: true, ui: { editor: async () => { throw new Error("editor failed"); } },
  }), /editor failed/);
  const result = await question.execute("next", { question: "Second?" }, undefined, undefined, {
    hasUI: true, ui: { editor: async () => "ready" },
  });
  assert.equal(result.details.answers[0].value, "ready");
});
