# Skeletal Silk — second UI pass

Local preview: `npm run dev -- --host 127.0.0.1 --port 5176`.

## Removed

- The viewport HUD: view mode, material-study counts, sample IDs, source/status strings.
- The numbered SAMPLE / EXTRACT / MAP / SIMULATE sequence and its timing state. Only a plain progress message remains while a real request is pending.
- L01, angle and intensity annotations around the draggable light. The circle has a hover tooltip and an accessible name.
- The Material Inspector heading, section boxes and nearly all separators. One viewport/controls divider and slider tracks remain.
- Permanent swatch thumbnails, the large undo/redo row, always-visible prompt input, provenance badges and raw-response controls.
- Repeated pipeline text, source dimensions in the footer, and viewport export framing.
- The simultaneous material grid. These were independent material layers, not alternate renderer states.
- Dead `ViewportHUD` and `AnalysisSequence` implementations, `Reveal.jsx`, and their styles. The previous pass already removed `LeftPanel.jsx`.

## Changed

- Upload is first: “Upload a material”, “Drop an image here or choose a file”, supported formats, and a solid “Upload image” button.
- Loaded sources use a compact thumbnail, filename, original image dimensions and “Replace image”. Click the thumbnail to compare the reference. File metadata travels with the layer, so history restores its identity with the source image.
- Samples appear only after “Try a sample”. Text-based analysis remains under “Describe instead”. Both retain the original analysis transport and request guards.
- One centered, full-size selected material is rendered. Existing materials remain switchable under “Your materials”, including add/remove/reorder and shared edits.
- System sans-serif handles navigation, actions, headings and labels; monospace is limited to parameter values, dimensions and technical data. Sentence case replaces terminal-style capitalization.
- Three material sliders: Structure maps to `rigidity`, Flow to `flow`, Sheen to `specular`. Display values are 0–100; the original 0–1 uniforms and steps are unchanged. The existing color readout is preserved. No new material controls or view modes were added.
- Undo/redo are small actions beside “Material”. Light retains its original direct manipulation, intensity range and reset.
- Shader source, export, provenance and session accounting are grouped under “Technical details”.
- Footer shows WebGL / GLSL, measured FPS, and the conceptual sentence. The responsive controls drawer keeps upload visible on first use.

## Files

- `src/App.jsx`, `src/App.css`: simplified layout, typography, navigation, mobile drawer and dialogs; stylesheet replaced rather than extended with overrides.
- `src/components/SourceMaterial.jsx`: upload and compact source treatment.
- `src/components/Panel.jsx`: presentation, disclosures, compact history actions and filename/dimension metadata. Existing request, cancellation, validation and history flow retained.
- `src/components/LayerInspector.jsx`: three material controls and color; accessible displayed value descriptions.
- `src/components/LayerList.jsx`: quiet saved-material selection without duplicate parameter readouts.
- `src/components/Instrument.jsx`: minimal light interaction, light controls and footer; removed analytical/viewport HUD components.
- `src/components/Scene.jsx`: selected material replaces grid; camera frames one central object.
- `src/components/ExportShader.jsx`: presentation only in this pass; export contents retained.
- `src/utils/analyseFabric.js`: returns original width/height alongside the existing resized upload payload. Analysis and resizing logic unchanged.
- `src/components/MaterialSample.jsx`: updated its now-stale explanatory comment only in this pass.
- `src/components/Reveal.jsx`: removed, no remaining consumers.

The second pass makes no GLSL changes and adds no dependencies.

## Verification — 2026-09-07

- Build and ESLint pass. Vite retains the existing large-bundle advisory.
- Visually checked the default page at 1440 × 1000, and mobile at 390 × 844. Upload is prominent and visible on both.
- Native file-picker test: uploaded repository `hero.png`; preview showed `hero.png`, 343 × 361, and the analysis response updated color and material parameters.
- Browser drop-handler test: a temporary QA harness dispatched dragover/drop with a real JPEG File/DataTransfer into the actual upload component. Preview showed `dropped-brocade.jpg`, 1024 × 768, and analysis updated parameters. This verifies the DOM drop path; an OS Finder drag was not exercised.
- Tested source enlargement and close; Structure, Flow and Sheen extremes; intensity extremes; undo; direct pointer light drag and reset.
- Added two further materials and verified only one object remained visible. Switching back restored the original source identity and parameters.
- No browser runtime errors observed during these checks.

Analysis checks used a temporary local HTTP response fixture through the unchanged request/validation/store flow, not a paid live inference request. The QA server/harness is outside the repository and is not shipped. Ordinary Vite preview still needs the existing API backend for live analysis.
