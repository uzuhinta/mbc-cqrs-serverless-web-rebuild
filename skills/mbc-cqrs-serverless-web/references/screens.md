# Using the screens

## Connected page or screen?

| The app…                                                        | Use                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| talks to the mbc-cqrs-serverless backend (master / survey APIs) | the connected pages from `/mbc` — they load, save, report errors and move on after a save                                       |
| has its own API, or needs control over loading and saving       | the screens from the root entry — they take data and callbacks (`onSave`, `onDelete`, `onImport`…)                              |
| needs data access in its own components                         | `/mbc` hooks (`useMasterSettings`, `useMasterData`, `useMasterMutations`…) or `createMasterApi(client)` (works on a server too) |
| validates on a server                                           | `/core` (`parseSurvey`, `validateAnswers`, `parseBulkJson`, `toSettingPayload`…) — no React                                     |

A screen's async callbacks show a failure on the screen when they reject; an error named `MbcTimeoutError` (or a dropped connection) is shown as "outcome unknown" — the save may have gone through, so the data editor keeps Save off after a create.

## master-web

- **Settings list / data list:** search, paging, sort; bulk JSON import (`onImport`, or automatic on the connected pages). `inputSampleJson` and `mapRawItem` adapt the import to the app's JSON shape.
- **Settings editor:** fields table, field dialog, JSON dialog. Host decisions are props: `canCopy` (show copy links — the app decides who may copy), `settingOptions` (extra on/off flags stored in the setting, for backends that read them), `formats` / `formatSettingCode` (sequences for auto-numbered codes).
- **Data editor:** a form built from the setting's fields; `components` replaces a field renderer by type.
- **Copy screens:** `loadTenants` supplies the tenants a setting can be copied to.
- **Another tenant's items** (including `common`) open read-only; the current tenant comes from `client.tenantCode()`.
- **Rich editors** (`/editors`, opt-in): install the peers, import `editors.css`, pass `components={editorRenderers}` to the data editor and `jsonEditor={JsonEditor}` to the JSON dialogs. They load after mount (a text box until then). CSP needs `style-src 'unsafe-inline'`, `worker-src blob:`, `script-src data:`; jsoneditor is about 1 MB, loaded only where used.

## survey-web

- `SurveyForm` (answer), `SurveyCreator` (build), `/templates` screens, `/mbc` template pages. `schema` may be stored JSON; question ids must not contain `.`, `[` or `]`.
- Answers keep v0's shapes (strings, `string[]`, numbers, `{ hour, minute }`…); validate on a server with `/core`'s `parseSurvey` → `validateAnswers` → `collectAnswers`.

## Text and language

- `<MbcProvider locale="en">` switches every screen; Japanese is the default.
- Override any string through `messages`, by namespace: `ui`; `survey`, `surveyCreator`, `surveyTemplates`; `master`, `masterSetting`, `masterData`, `masterCopy`. Partial objects are merged. Keep the object stable (module constant or `useMemo`).
- To call "tenants" something else, or match the app's wording, override the relevant keys — the README lists the namespaces; the types list every key.

## Theme and layout

- CSS variables (`--mbc-primary`, `--mbc-brand`, `--mbc-radius`, `-foreground` pairs…) on `:root`; dark values under `.dark` or `[data-mbc-theme="dark"]`.
- `className` on components accepts `mbc:` classes the library already ships; for anything else use the app's own classes on a wrapper.
- `SurveyCreator` pins its tabs while a long survey scrolls; with a fixed app header set `--mbc-creator-sticky-top` (e.g. `64px`) so the tabs stop below it.
- Dialogs and menus portal to `body` (or `portalContainer`); their elements carry `data-mbc`, so the theme applies there too.
