const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");

function loadExportHelpers() {
  const listeners = { addListener() {} };
  const sandbox = {
    console,
    URL,
    Blob,
    TextDecoder,
    TextEncoder,
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval() {},
    clearInterval() {},
    IntersectionObserver: class {},
    CSS: { escape: (value) => value },
    window: { getSelection: () => null, close() {} },
    document: {
      addEventListener() {},
      querySelectorAll: () => [],
      querySelector: () => null,
      getElementById: () => null,
      createElement: () => ({
        click() {},
        remove() {},
        set textContent(value) {
          this.innerHTML = String(value);
        },
      }),
      body: { appendChild() {} },
    },
    chrome: {
      runtime: { onMessage: listeners, sendMessage: async () => ({}) },
      windows: { getCurrent: async () => ({ id: 1 }) },
      tabs: { onUpdated: listeners, onActivated: listeners },
    },
    YTD_SETTINGS: {},
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox);
  return sandbox.__YTD_EXPORT_TESTING__;
}

test("CSV escaping handles delimiters, line breaks, quotes, and formulas", () => {
  const { csvEscape } = loadExportHelpers();

  assert.equal(csvEscape("plain"), "plain");
  assert.equal(csvEscape("hello,world"), '"hello,world"');
  assert.equal(csvEscape('say "hello"'), '"say ""hello"""');
  assert.equal(csvEscape("line one\nline two"), '"line one\nline two"');
  assert.equal(csvEscape("=SUM(A1:A2)"), "'=SUM(A1:A2)");
  assert.equal(csvEscape("@command"), "'@command");
});

test("note Markdown groups videos and keeps generated structure intact", () => {
  const { serializeNotesMarkdown } = loadExportHelpers();
  const markdown = serializeNotesMarkdown([
    {
      videoId: "video-one",
      videoTitle: "Course #1",
      timestamp: "1:05",
      timestampedUrl: "https://www.youtube.com/watch?v=video-one&t=65s",
      text: "first line\nsecond *line*",
    },
    {
      videoId: "video-two",
      videoTitle: "Interview",
      timestamp: "2:00",
      timestampedUrl: "https://www.youtube.com/watch?v=video-two&t=120s",
      text: "another note",
    },
  ]);

  assert.match(markdown, /^# YouTube Digest Notes\n/);
  assert.match(markdown, /## Course \\#1/);
  assert.match(markdown, /first line second \\\*line\\\*/);
  assert.match(markdown, /## Interview/);
  assert.equal(serializeNotesMarkdown([]), "");
});

test("vocabulary Markdown preserves multiline explanations as blockquotes", () => {
  const { serializeVocabularyMarkdown } = loadExportHelpers();
  const markdown = serializeVocabularyMarkdown([
    {
      videoId: "video-one",
      videoTitle: "Language [Lab]",
      timestamp: "1:02:03",
      timestampedUrl: "https://www.youtube.com/watch?v=video-one&t=3723s",
      term: "array_map()",
      explanation: "First line\r\nSecond # line",
    },
  ]);

  assert.ok(markdown.includes("## Language \\[Lab\\]"));
  assert.match(markdown, /### array\\_map\(\)/);
  assert.match(markdown, /> First line\n> Second \\# line/);
  assert.equal(serializeVocabularyMarkdown(null), "");
});

test("CSV serializers use UTF-8 BOM, CRLF, and stable columns", () => {
  const { serializeNotesCsv, serializeVocabularyCsv } = loadExportHelpers();
  const noteCsv = serializeNotesCsv([
    {
      timestamp: "0:05",
      timestampSeconds: 5,
      videoTitle: 'Title, "One"',
      videoId: "abc123DEF_1",
      timestampedUrl: "https://www.youtube.com/watch?v=abc123DEF_1&t=5s",
      text: "line one\nline two",
    },
  ]);

  assert.ok(noteCsv.startsWith("\uFEFFtimestamp,timestampSeconds"));
  assert.match(noteCsv, /\r\n0:05,5,"Title, ""One"""/);
  assert.match(noteCsv, /,"line one\nline two"$/);

  const vocabCsv = serializeVocabularyCsv([
    {
      timestamp: "0:06",
      timestampSeconds: 6,
      videoTitle: "Video",
      videoId: "abc123DEF_1",
      timestampedUrl: "https://www.youtube.com/watch?v=abc123DEF_1&t=6s",
      term: "=1+1",
      explanation: "meaning, with comma",
    },
  ]);
  assert.ok(vocabCsv.startsWith("\uFEFFtimestamp,timestampSeconds"));
  assert.match(vocabCsv, /,'=1\+1,"meaning, with comma"$/);
  assert.equal(serializeNotesCsv([]), "");
  assert.equal(serializeVocabularyCsv([]), "");
});

test("dateStamp is deterministic for a supplied date", () => {
  const { dateStamp } = loadExportHelpers();
  assert.equal(dateStamp(new Date(2026, 7, 17)), "2026-08-17");
});
