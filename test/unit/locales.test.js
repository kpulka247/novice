import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOCALE, MESSAGES } from "../../src/locales.js";

const keys = Object.keys(MESSAGES[DEFAULT_LOCALE]).sort();

for (const [locale, messages] of Object.entries(MESSAGES)) {
  test(`${locale} translates every message`, () => {
    assert.deepEqual(Object.keys(messages).sort(), keys);
    for (const [key, text] of Object.entries(messages)) {
      assert.ok(text.trim(), `${locale}.${key} is empty`);
    }
  });

  test(`${locale} store description fits in 132 characters`, () => {
    assert.ok(
      messages.extDescription.length <= 132,
      `${messages.extDescription.length} characters`,
    );
  });

  test(`${locale} name fits in 45 characters`, () => {
    assert.ok(messages.extName.length <= 45);
  });
}
