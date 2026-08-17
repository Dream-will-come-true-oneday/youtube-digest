# YouTube Digest

[English](README.md) | [简体中文](README.zh-CN.md)

Turn YouTube videos into searchable learning material in a Chrome side panel. Read timestamped bilingual transcripts, generate structured AI overviews, explain selected text, save notes and vocabulary, and export your study data.

- **Current remix:** [Dream-will-come-true-oneday/youtube-digest](https://github.com/Dream-will-come-true-oneday/youtube-digest)
- **Original upstream:** [zarazhangrui/youtube-digest](https://github.com/zarazhangrui/youtube-digest)

This remix keeps the upstream bring-your-own-key, local-storage, and no-telemetry model while extending the learning workflow and improving long-video usability.

## Compared with upstream

| Area | Original repository | This repository |
|---|---|---|
| Long videos | Standard timestamp navigation | `H:MM:SS` timestamps and continuous playback following |
| Reading experience | Light interface | Light, dark, and system themes with narrow-panel improvements |
| Transcript navigation | Timestamped original, Chinese, and bilingual views | Search highlighting plus Enter/Shift+Enter result navigation |
| AI overview | General overview | General, Course, Interview, and Tutorial templates |
| Study workflow | Explanations and timestamped notes | Local vocabulary notebook with current/all-video filters, copy, playback, and deletion |
| Data portability | Local notes | Notes and vocabulary export to Markdown or Excel-friendly CSV |
| Reliability | Core extension behavior | Stale template results are discarded, damaged vocabulary storage is tolerated, and CSV formula injection is blocked |
| Accessibility | Basic controls | ARIA tabs/panels, clearer labels and focus states, and responsive controls |

## Install

1. Open the [current `dev` branch](https://github.com/Dream-will-come-true-oneday/youtube-digest/tree/dev), choose **Code > Download ZIP**, and extract it to a permanent folder. You can also clone that branch:

   ```bash
   git clone -b dev https://github.com/Dream-will-come-true-oneday/youtube-digest.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** and click **Load unpacked**.
4. Select the extracted project folder that contains `manifest.json`.
5. Pin YouTube Digest if you want quick access.

After updating the source, click **Reload** on the extension card and refresh open YouTube tabs. Keep the source folder in place while the unpacked extension is installed.

## Configure API keys

YouTube Digest needs two user-owned keys:

1. Create a [Supadata account](https://dash.supadata.ai/auth/sign-up), then copy the key from the [Supadata API Key page](https://dash.supadata.ai/organizations/api-key).
2. Create a key on the [DeepSeek API Keys page](https://platform.deepseek.com/api_keys).
3. Open YouTube Digest **Settings**, paste each key into its matching field, and save.

Supadata retrieves timestamped native captions. DeepSeek V4 Flash generates overviews, explanations, translations, and polished notes. Provider pricing changes over time; check [Supadata pricing](https://supadata.ai/pricing) and [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/) before use.

Never put an API key in source code, commits, screenshots, or chat. Keys are stored in Chrome's local extension storage and sent only to their matching provider.

## Use

1. Open a standard `youtube.com/watch` page with native captions.
2. Click the YouTube Digest icon to open the side panel.
3. Use **Transcript** for original, Chinese, or bilingual text; search and click timestamps to navigate.
4. Use **Overview** and select the template that matches the video.
5. Select transcript text for an AI explanation, then save useful terms to **Vocabulary**.
6. Save timestamped **Notes**, filter vocabulary by current/all videos, and export either collection as Markdown or CSV.

Vocabulary is stored locally, newest first, with a maximum of 500 entries. The Settings page can delete vocabulary separately or reset all extension data.

## Privacy and limits

- The extension sends a canonical video URL to Supadata and requested transcript context to DeepSeek. It has no developer backend, account system, analytics, advertising, or telemetry.
- Supadata is forced to `mode=native`; videos without existing captions are not sent for paid AI transcription.
- Supported scope is Chrome 116 or newer and standard public YouTube watch pages. Shorts, live streams, private videos, and access-restricted videos may not work.
- The project is installed as an unpacked extension and does not update automatically.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for the complete data and security model.

## Troubleshooting

- Missing button or side panel: reload the extension at `chrome://extensions`, then refresh the YouTube tab.
- Setup warning: confirm that both API keys are saved in Settings.
- No transcript: confirm the video has native captions and the Supadata account has available credits.
- AI failure: check the DeepSeek key, account balance, rate limits, and provider status.

## Development checks

```bash
npm test
npm run check
npm run package
```

Reload the unpacked extension and test at least one real captioned YouTube video after UI or provider changes.

## License

MIT. This remix is based on the [original YouTube Digest repository](https://github.com/zarazhangrui/youtube-digest). See [LICENSE](LICENSE).
