const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const sidepanelHtml = read("sidepanel.html");
const sidepanelCss = read("sidepanel.css");
const sidepanelJs = read("sidepanel.js");
const backgroundJs = read("background.js");
const optionsJs = read("options.js");

test("theme controls expose persistent side-panel and Settings states", () => {
  const optionsHtml = read("options.html");
  const optionsCss = read("options.css");

  assert.match(
    sidepanelHtml,
    /id="themeToggleBtn"[\s\S]*type="button"[\s\S]*aria-label="Toggle dark mode"/,
  );
  assert.match(sidepanelJs, /const THEME_STORAGE_KEY = "ytd_options_theme"/);
  assert.match(
    sidepanelJs,
    /themeMediaQuery\.addEventListener\("change"[\s\S]*themePreference === "system"/,
  );
  assert.match(sidepanelCss, /\[data-theme="dark"\]/);
  assert.match(
    optionsHtml,
    /role="group"[\s\S]*data-theme-pref="light"[\s\S]*data-theme-pref="dark"[\s\S]*data-theme-pref="system"/,
  );
  assert.match(optionsCss, /\[data-theme="dark"\]/);
});

test("transcript search is labelled, debounced, navigable, and rerender-safe", () => {
  assert.match(
    sidepanelHtml,
    /id="transcriptSearchInput"[\s\S]*type="search"[\s\S]*aria-label="Search transcript"/,
  );
  assert.match(
    sidepanelHtml,
    /id="searchMatchCount"[\s\S]*role="status"[\s\S]*aria-live="polite"/,
  );
  assert.match(
    sidepanelJs,
    /addEventListener\("input"[\s\S]*setTimeout\([\s\S]*applyTranscriptSearch\(false\)[\s\S]*200/,
  );
  assert.match(
    sidepanelJs,
    /addEventListener\("keydown"[\s\S]*event\.key === "Enter"[\s\S]*event\.shiftKey \? -1 : 1/,
  );
  assert.ok(
    (sidepanelJs.match(/if \(transcriptSearchQuery\) applyTranscriptSearch\(false\)/g) || [])
      .length >= 3,
    "search must reapply after original, translated, and incremental rerenders",
  );
  assert.match(sidepanelCss, /\.search-hit\s*\{/);
  assert.match(sidepanelCss, /\.transcript-entry\.search-match-current\s*\{/);
});

test("all overview templates are accepted and changes retrigger safely", () => {
  for (const template of ["general", "course", "interview", "tutorial"]) {
    assert.match(
      sidepanelHtml,
      new RegExp(`<option value="${template}">`, "i"),
    );
  }
  assert.match(
    backgroundJs,
    /const VALID_TEMPLATES = \["general", "course", "interview", "tutorial"\]/,
  );
  assert.match(
    sidepanelJs,
    /getElementById\("analysisTemplateSelect"\)[\s\S]*addEventListener\("change"[\s\S]*currentAnalysis = null[\s\S]*triggerAnalysis\(\)/,
  );
  assert.match(
    sidepanelJs,
    /latestTemplate !== selectedTemplate[\s\S]*triggerAnalysis\(\)/,
  );
});

test("tabs, vocabulary, and exports expose complete accessible wiring", () => {
  assert.match(sidepanelHtml, /id="tabsNav"[\s\S]*role="tablist"/);
  for (const name of ["transcript", "overview", "notes", "vocabulary"]) {
    assert.match(
      sidepanelHtml,
      new RegExp(`id="${name}Tab"[\\s\\S]*role="tab"[\\s\\S]*aria-controls="${name}Panel"`),
    );
    assert.match(
      sidepanelHtml,
      new RegExp(`id="${name}Panel"[\\s\\S]*role="tabpanel"[\\s\\S]*aria-labelledby="${name}Tab"`),
    );
  }
  assert.match(
    sidepanelJs,
    /tab\.setAttribute\("aria-selected", String\(active\)\)/,
  );
  assert.match(
    sidepanelJs,
    /panel\.setAttribute\("aria-hidden", String\(!active\)\)/,
  );

  for (const id of [
    "vocabFilterThis",
    "vocabFilterAll",
    "exportNotesMdBtn",
    "exportNotesCsvBtn",
    "exportVocabMdBtn",
    "exportVocabCsvBtn",
  ]) {
    assert.match(sidepanelHtml, new RegExp(`id="${id}"`));
  }
  assert.match(sidepanelHtml, /id="notesExportStatus"[\s\S]*aria-live="polite"/);
  assert.match(sidepanelHtml, /id="vocabExportStatus"[\s\S]*aria-live="polite"/);
  assert.match(
    sidepanelJs,
    /const selectionTimestampPromise = getCurrentPlaybackSeconds\(\)[\s\S]*action: "saveVocabulary"/,
  );
  assert.match(sidepanelJs, /action: "getVocabulary"/);
  assert.match(sidepanelJs, /action: "deleteVocabulary"/);
  assert.match(sidepanelCss, /\.notes-export \.enhance-btn:focus-visible/);
  assert.match(sidepanelCss, /@media \(max-width: 390px\)[\s\S]*data-panel="vocabulary"/);
});

test("Settings deletion and published docs cover vocabulary lifecycle", () => {
  const englishReadme = read("README.md");
  const chineseReadme = read("README.zh-CN.md");
  const privacy = read("PRIVACY.md");

  assert.match(optionsJs, /storage\.remove\("ytd_vocabulary"\)/);
  assert.match(optionsJs, /vocabularyDeleted: "Deleted all saved vocabulary\."/);
  assert.match(optionsJs, /vocabularyDeleted: "已删除全部已保存的生词。"/);
  assert.match(optionsJs, /resetConfirm:[\s\S]*saved notes, and vocabulary/);
  assert.match(englishReadme, /maximum of 500 entries/i);
  assert.match(englishReadme, /export either collection as Markdown or CSV/i);
  assert.match(chineseReadme, /生词按最新优先保存在本地，最多 500 条/);
  assert.match(chineseReadme, /导出为 Markdown\/CSV/);
  assert.match(privacy, /keeps up to 500 vocabulary entries/i);
  assert.match(privacy, /delete all vocabulary/i);
});
