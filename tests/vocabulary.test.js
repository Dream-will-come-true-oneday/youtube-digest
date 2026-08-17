const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

/**
 * Creates an in-memory chrome.storage.local mock.
 * Pre-seeds ytd_settings so background.js startup code finds a valid settings object.
 */
function createStorageMock(seed = {}) {
  const store = new Map();
  // Pre-seed settings so startup code doesn't fail
  store.set("ytd_settings", {
    aiApiKey: "test-key",
    aiBaseUrl: "https://api.deepseek.com",
    aiModel: "deepseek-v4-flash",
    provider: "deepseek",
    supadataApiKey: "",
  });
  for (const [k, v] of Object.entries(seed)) {
    store.set(k, v);
  }
  return {
    local: {
      get: async (key) => {
        if (key === null) return Object.fromEntries(store);
        if (Array.isArray(key)) {
          const out = {};
          for (const k of key) if (store.has(k)) out[k] = store.get(k);
          return out;
        }
        if (store.has(key)) return { [key]: store.get(key) };
        return {};
      },
      set: async (obj) => {
        for (const [k, v] of Object.entries(obj)) store.set(k, v);
      },
      remove: async (key) => {
        if (Array.isArray(key)) for (const k of key) store.delete(k);
        else store.delete(key);
      },
      clear: async () => store.clear(),
      setAccessLevel: async () => {},
    },
  };
}

function loadVocabularyHelpers({ storageMock } = {}) {
  if (!storageMock) storageMock = createStorageMock();
  const sandbox = {
    console,
    URL,
    TextDecoder,
    TextEncoder,
    AbortController,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    importScripts() {},
    chrome: {
      storage: storageMock,
      action: { onClicked: { addListener() {} } },
      sidePanel: {
        setPanelBehavior() {},
        setOptions: () => Promise.resolve(),
      },
      runtime: {
        onInstalled: { addListener() {} },
        onMessage: { addListener() {} },
        openOptionsPage() {},
        getURL: (resourcePath) => `chrome-extension://test/${resourcePath}`,
      },
      tabs: { onUpdated: { addListener() {} }, onActivated: { addListener() {} } },
    },
    YTD_SETTINGS: {
      STORAGE_KEY: "ytd_settings",
      DEFAULTS: {
        provider: "deepseek",
        aiApiKey: "",
        aiBaseUrl: "https://api.deepseek.com",
        aiModel: "deepseek-v4-flash",
        supadataApiKey: "",
      },
      normalize: (input) => ({
        provider: "deepseek",
        aiApiKey: input?.aiApiKey || "",
        aiBaseUrl: input?.aiBaseUrl || "https://api.deepseek.com",
        aiModel: input?.aiModel || "deepseek-v4-flash",
        supadataApiKey: input?.supadataApiKey || "",
      }),
      migrateLegacyCustom: (input) => ({ settings: input, migrated: false }),
      chatCompletionsUrl: (baseUrl) => `${baseUrl || "https://api.deepseek.com"}/chat/completions`,
      formatTimestamp(seconds) {
        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        if (hours > 0) {
          return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        }
        return `${minutes}:${String(secs).padStart(2, "0")}`;
      },
      canonicalYouTubeUrl(videoId) {
        const normalized = String(videoId || "").trim();
        if (!/^[A-Za-z0-9_-]{6,20}$/.test(normalized)) {
          throw new Error("Invalid YouTube video ID.");
        }
        return `https://www.youtube.com/watch?v=${normalized}`;
      },
    },
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("background.js"), sandbox);
  return sandbox.__YTD_VOCABULARY_TESTING__;
}

test("saveVocabulary adds a properly structured entry", async () => {
  const { handleSaveVocabulary, handleGetVocabulary } = loadVocabularyHelpers();
  const result = await handleSaveVocabulary({
    term: "serendipity",
    explanation: "The occurrence of events by chance in a happy way.",
    videoId: "abc123DEF_",
    videoTitle: "My Video",
    channelName: "My Channel",
    timestampSeconds: 125,
  });
  assert.equal(result.success, true);
  assert.ok(result.entry.id.startsWith("vocab_"));
  assert.equal(result.entry.term, "serendipity");
  assert.equal(result.entry.timestamp, "2:05");
  assert.equal(result.entry.timestampSeconds, 125);
  assert.match(result.entry.timestampedUrl, /&t=125s$/);
  assert.equal(typeof result.entry.createdAt, "number");

  // Verify it was stored
  const getResult = await handleGetVocabulary();
  assert.equal(getResult.success, true);
  assert.equal(getResult.vocabulary.length, 1);
  assert.equal(getResult.vocabulary[0].term, "serendipity");
});

test("getVocabulary filters by videoId", async () => {
  const { handleSaveVocabulary, handleGetVocabulary } = loadVocabularyHelpers();
  await handleSaveVocabulary({
    term: "word1", videoId: "aaaaaa11111", timestampSeconds: 0,
  });
  await handleSaveVocabulary({
    term: "word2", videoId: "bbbbbb22222", timestampSeconds: 10,
  });

  const filtered = await handleGetVocabulary("aaaaaa11111");
  assert.equal(filtered.success, true);
  assert.equal(filtered.vocabulary.length, 1);
  assert.equal(filtered.vocabulary[0].term, "word1");

  const all = await handleGetVocabulary();
  assert.equal(all.vocabulary.length, 2);
});

test("deleteVocabulary removes an entry by id", async () => {
  const { handleSaveVocabulary, handleGetVocabulary, handleDeleteVocabulary } =
    loadVocabularyHelpers();
  const saved = await handleSaveVocabulary({
    term: "toast", videoId: "cccccc33333", timestampSeconds: 30,
  });
  const saved2 = await handleSaveVocabulary({
    term: "jam", videoId: "cccccc33333", timestampSeconds: 60,
  });

  const delResult = await handleDeleteVocabulary(saved.entry.id);
  assert.equal(delResult.success, true);

  const remaining = await handleGetVocabulary();
  assert.equal(remaining.vocabulary.length, 1);
  assert.equal(remaining.vocabulary[0].term, "jam");
});

test("saveVocabulary rejects empty term", async () => {
  const { handleSaveVocabulary } = loadVocabularyHelpers();
  const result = await handleSaveVocabulary({
    term: "   ",
    videoId: "dddddd44444",
    timestampSeconds: 0,
  });
  assert.equal(result.success, false);
  assert.match(result.error, /term is empty/i);
});

test("saveVocabulary rejects invalid videoId", async () => {
  const { handleSaveVocabulary } = loadVocabularyHelpers();
  const result = await handleSaveVocabulary({
    term: "hello",
    videoId: "short",
    timestampSeconds: 0,
  });
  assert.equal(result.success, false);
  assert.match(result.error, /invalid video id/i);
});

test("saveVocabulary caps term at 300 characters", async () => {
  const { handleSaveVocabulary, handleGetVocabulary } = loadVocabularyHelpers();
  const longTerm = "a".repeat(500);
  const result = await handleSaveVocabulary({
    term: longTerm,
    videoId: "eeeeee55555",
    timestampSeconds: 0,
  });
  assert.equal(result.success, true);
  assert.equal(result.entry.term.length, 300);

  const all = await handleGetVocabulary();
  assert.equal(all.vocabulary[0].term.length, 300);
});

test("vocabulary FIFO cap at 500 entries", async () => {
  const { handleSaveVocabulary, handleGetVocabulary } = loadVocabularyHelpers();
  for (let i = 0; i < 510; i++) {
    await handleSaveVocabulary({
      term: `word${i}`,
      videoId: "ffffff66666",
      timestampSeconds: i,
    });
  }

  const all = await handleGetVocabulary();
  assert.equal(all.vocabulary.length, 500);
  // The first 10 entries should be evicted — word0 should be gone
  assert.equal(all.vocabulary[0].term, "word509");
  assert.equal(all.vocabulary[499].term, "word10");
  assert.equal(all.vocabulary.some((e) => e.term === "word0"), false);
  assert.equal(all.vocabulary.some((e) => e.term === "word9"), false);
  assert.equal(all.vocabulary.some((e) => e.term === "word10"), true);
});

test("vocabulary handlers recover from malformed stored data", async () => {
  const storageMock = createStorageMock({ ytd_vocabulary: { invalid: true } });
  const { handleSaveVocabulary, handleGetVocabulary } = loadVocabularyHelpers({
    storageMock,
  });

  const before = await handleGetVocabulary();
  assert.equal(before.success, true);
  assert.equal(before.vocabulary.length, 0);

  const saved = await handleSaveVocabulary({
    term: "recovered",
    videoId: "gggggg77777",
    timestampSeconds: Number.POSITIVE_INFINITY,
  });
  assert.equal(saved.success, true);
  assert.equal(saved.entry.timestampSeconds, 0);
  assert.equal(saved.entry.timestamp, "0:00");
});

test("vocabulary IDs remain unique across rapid saves", async () => {
  const { handleSaveVocabulary } = loadVocabularyHelpers();
  const ids = new Set();

  for (let i = 0; i < 50; i++) {
    const saved = await handleSaveVocabulary({
      term: `term-${i}`,
      videoId: "hhhhhh88888",
      timestampSeconds: i,
    });
    ids.add(saved.entry.id);
  }

  assert.equal(ids.size, 50);
});

test("deleteVocabulary rejects an empty entry id", async () => {
  const { handleDeleteVocabulary } = loadVocabularyHelpers();
  const result = await handleDeleteVocabulary("  ");
  assert.equal(result.success, false);
  assert.match(result.error, /invalid vocabulary entry id/i);
});
