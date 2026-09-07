import { useRef, useState, useCallback, useEffect } from "react";
import { useStore, selectPrimary, selectImageSrc } from "../store";
import {
  analyseFabric,
  fileToBase64,
  imageUrlToBase64,
  InvalidAnalysisError,
} from "../utils/analyseFabric";
import {
  beginRequest,
  endRequest,
  isLive,
  cancelRequest,
  touchedFor,
  refusalFor,
  RateLimitedError,
  AnalysisCancelledError,
} from "../utils/requests";
import { PRESETS } from "../data/presets";
import { RATES, estimateUsd } from "../data/rates";
import { emit } from "../utils/lab";
import LayerList from "./LayerList";
import LayerInspector from "./LayerInspector";
import SourceMaterial from "./SourceMaterial";
import ExportShader from "./ExportShader";
import { LightControls } from "./Instrument";

export default function Panel({ onShowSource }) {
  const fileRef = useRef();
  const [text, setText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showSamples, setShowSamples] = useState(false);

  const primary = useStore(selectPrimary);
  const images = useStore((s) => s.images);
  const putImage = useStore((s) => s.putImage);
  const patchLayer = useStore((s) => s.patchLayer);
  const applyAnalysis = useStore((s) => s.applyAnalysis);

  const pushHistory = useStore((s) => s.pushHistory);
  const setDescription = useStore((s) => s.setDescription);
  const usage = useStore((s) => s.usage);
  const recordLanded = useStore((s) => s.recordLanded);
  const recordCancelled = useStore((s) => s.recordCancelled);
  const recordRefused = useStore((s) => s.recordRefused);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);

  // Transient, and deliberately not in any snapshot. Undo aborting requests is
  // a real consequence with a cost attached, and the only moment a user can
  // connect it to the cause is the moment it happens.
  const [timeNote, setTimeNote] = useState(null);

  const primaryImage = selectImageSrc({ images }, primary);
  const busy = primary?.status === "analysing";
  // Analysis targets the selected layer. Swatches and uploads replace that
  // layer's image; "+ ADD LAYER" is the only way to grow the board, so a
  // click never silently creates a sample you did not ask for.
  const runOnPrimary = useCallback(
    async (payload, cachedParams) => {
      if (!primary) return;
      const id = primary.id;

      let requestId, controller;
      try {
        ({ requestId, controller } = beginRequest(id));
      } catch (err) {
        // Refused before any money was spent. Not an error state for the layer,
        // and not a state change of any kind: the cooldown and the concurrency
        // cap decided that nothing should happen, so nothing does. `status` is
        // deliberately not in this patch. It used to be reset to 'idle' here,
        // which wiped the ⊘ off a layer the user had just cancelled, so a refusal
        // erased the record of an action it had nothing to do with.
        recordRefused();
        patchLayer(id, { error: err.message });
        return;
      }

      // No pushHistory here. The snapshot point for an action is the moment
      // before it changes anything visible, and by the time this function runs
      // the caller has already written the layer's name and thumbnail. Pushing
      // here recorded a half-applied swatch click: COTTON's name and image with
      // the previous numbers, a state no sequence of user actions can produce.
      // Each entry point pushes before its first visible write instead.
      if (cachedParams) applyAnalysis(id, cachedParams, "CACHED");
      patchLayer(id, { status: "analysing", requestId, error: null });

      // Three questions, all of which must still be yes before a response is
      // allowed to write anything. They fail for three different reasons and one
      // check cannot cover the others:
      //   1. the request is still live      — it was not cancelled while open
      //   2. the layer still exists         — it was not removed while open
      //   3. the layer still owns this id   — a newer request did not replace it
      // Without these, a slow response from a deleted or re-analysed layer lands
      // on whatever is sitting in that slot now.
      //
      // Only check 1 has ever fired, and it fires far more often than first
      // recorded. It was written up 2026-08-07 as verified by fault injection,
      // where suppressing the abort let a real 200 arrive 2.4s after a cancel and
      // specular held at the cached 0.12 against an arriving 0.18. Corrected
      // 2026-08-10: it is also the live path for every ordinary cancel. See the
      // catch below for why. Checks 2 and 3 are untested code, see below.
      //
      // refusedBy is the one change this pass makes to existing code. Which
      // guard refused a response is half the information, and without it the
      // stream can only say "something stopped it".
      //
      // It is a side channel rather than a changed return value on purpose. Both
      // call sites test falsiness (`if (!layer)` and `if (!mayLand())`), so
      // returning a truthy reason object would have inverted both conditions.
      // The contract is untouched: layer on success, null on failure. Judgement
      // logic and order are untouched. Only the returned information grew, and
      // it grew beside the return rather than inside it.
      let refusedBy = null;
      const mayLand = () => {
        refusedBy = null;
        if (!isLive(requestId)) {
          refusedBy = "check 1 (isLive) request not live";
          return null;
        }
        const layer = useStore.getState().layers.find((l) => l.id === id);
        // NEVER FIRED as of 2026-08-10, with the reason corrected. Every path
        // that removes a layer aborts its request first: removeLayer calls
        // cancelLayer, undo calls cancelAll, and both delete the entry from
        // inflight before aborting. So check 1 above is already false by the time
        // the response resolves, and it short-circuits this one.
        //
        // The reason given here before was that the catch below returned on
        // AnalysisCancelledError first. That was wrong: that branch never runs,
        // because fetch rejects with the abort reason itself and the AbortError
        // name test in analyseFabric is therefore false.
        //
        // What would make it reachable: a layer disappearing without its request
        // being aborted, so check 1 still passes and this one is consulted.
        if (!layer) {
          refusedBy = "check 2 layer no longer exists";
          return null;
        }
        // NEVER FIRED as of 2026-08-07. Step 5's batch edit was expected to open
        // this and does not. Checked after building it: there is exactly one
        // beginRequest call site, here, and it targets primary.id, the first
        // selected layer. Multi-select widens which layers a UNIFORM edit writes
        // to; it does not widen which layers get analysed, and setSelectedParam
        // touches params only, never requestId. So a layer still cannot hold two
        // live requests and this can still never disagree.
        //
        // What would make it reachable: analysing a whole selection at once, or
        // any second beginRequest call site that can target a busy layer.
        if (layer.requestId !== requestId) {
          refusedBy = "check 3 layer no longer owns this request";
          return null;
        }
        return layer;
      };

      // Reads the three scalars as they stand right now. Colour is left out: the
      // row has to be legible at a glance and a hex adds width without adding
      // to the point being made.
      const triple = (p) =>
        p
          ? `${p.rigidity.toFixed(2)} ${p.flow.toFixed(2)} ${p.specular.toFixed(2)}`
          : null;
      const heldNow = () =>
        triple(useStore.getState().layers.find((l) => l.id === id)?.params);

      try {
        const { params, usage: spent } = await analyseFabric({
          ...payload,
          controller,
        });
        // Recorded before the landing check. The tokens were spent whether or
        // not the answer is still wanted.
        recordLanded(spent);
        const layer = mayLand();
        if (!layer) {
          // The core row of the whole demo. tokensCounted is true here and only
          // here: recordLanded ran above, before the guard, so this response was
          // paid for and then thrown away. A row that showed the discard without
          // that fact would read as "the guard saved you money".
          emit("discarded", {
            layerId: id,
            requestId,
            check: refusedBy,
            arrived: triple(params),
            held: heldNow(),
            tokensCounted: true,
          });
          return;
        }
        // The model's reading is a suggestion; a hand edit made while it was in
        // flight is a decision. Params the user touched during the request keep
        // their current value, and the layer records which ones, so the panel
        // can say why the numbers are not purely the model's.
        const kept = touchedFor(requestId);
        const merged = { ...params };
        for (const key of kept) merged[key] = layer.params[key];
        applyAnalysis(id, merged, "LIVE", kept);
        // After the write, not before. A row saying a value landed when it did
        // not is worse than a row that is missing.
        emit("land", { layerId: id, requestId, wrote: triple(merged), kept });
      } catch (err) {
        if (err instanceof AnalysisCancelledError) return; // the cancel already set the state
        if (!mayLand()) {
          // The other discard site. tokensCounted is false: the throw happened
          // at the await, before recordLanded, so nothing was counted here.
          emit("discarded", {
            layerId: id,
            requestId,
            check: refusedBy,
            arrived: null,
            held: heldNow(),
            tokensCounted: false,
            error: err.message,
          });
          return;
        }
        if (err instanceof InvalidAnalysisError) {
          patchLayer(id, {
            status: "idle",
            source: "FALLBACK",
            requestId: null,
          });
          emit("dropped", {
            layerId: id,
            requestId,
            reason: "unreadable response, last valid parameters kept",
            held: heldNow(),
          });
        } else if (err instanceof RateLimitedError) {
          patchLayer(id, {
            status: "idle",
            error: err.message,
            requestId: null,
          });
          emit("dropped", {
            layerId: id,
            requestId,
            reason: "rate limited",
            held: heldNow(),
          });
        } else {
          patchLayer(id, {
            status: "error",
            error: err.message,
            requestId: null,
          });
          emit("dropped", {
            layerId: id,
            requestId,
            reason: err.message,
            held: heldNow(),
          });
        }
      } finally {
        endRequest(requestId);
      }
    },
    [primary, applyAnalysis, patchLayer, recordLanded, recordRefused],
  );

  const cancelPrimary = useCallback(() => {
    if (!primary?.requestId) return;
    // Order matters: mark the layer first. cancelRequest aborts the fetch, and
    // the rejection handler reads this layer to decide whether to write.
    patchLayer(primary.id, {
      status: "cancelled",
      requestId: null,
      error: null,
    });
    cancelRequest(primary.requestId);
    recordCancelled();
  }, [primary, patchLayer, recordCancelled]);

  // Asked before anything visible moves. beginRequest asks the same questions
  // from the same predicate, but it asks them inside runOnPrimary, by which
  // time the caller has already swapped the layer's image, renamed it and
  // pushed a history entry. A refusal that renamed the layer to BROCADE and
  // left COTTON's numbers beside the name was not refusing anything; it was
  // producing exactly the half-applied state the undo harness exists to catch.
  //
  // The emit lives here as well as in beginRequest because the lab stream has
  // to record the refusal wherever the decision was actually taken. The
  // decision itself is in one place, refusalFor, so the two cannot drift.
  const refusedEarly = useCallback(
    (id) => {
      const refusal = refusalFor(id);
      if (!refusal) return false;
      emit("refused", { layerId: id, reason: refusal.reason });
      recordRefused();
      patchLayer(id, { error: refusal.message });
      return true;
    },
    [recordRefused, patchLayer],
  );

  const handlePreset = useCallback(
    async (preset) => {
      if (!primary) return;
      if (refusedEarly(primary.id)) return;
      // Before the first visible write. The name and thumbnail change here, so
      // the snapshot has to precede them or undo leaves the identity behind.
      pushHistory();
      setText("");
      setShowSamples(false);
      const imageId = putImage(preset.image);
      patchLayer(primary.id, {
        imageId,
        description: preset.label.toLowerCase(),
        imageName: preset.image.split("/").pop(),
        imageWidth: null,
        imageHeight: null,
      });
      try {
        const { base64, mediaType } = await imageUrlToBase64(preset.image);
        await runOnPrimary({ imageBase64: base64, mediaType }, preset.params);
      } catch (err) {
        patchLayer(primary.id, { status: "error", error: err.message });
      }
    },
    [primary, putImage, patchLayer, runOnPrimary, pushHistory, refusedEarly],
  );

  // No silent rejections: a wrong file type or an oversized image throws a
  // readable message rather than returning quietly.
  const handleFile = useCallback(
    async (file) => {
      if (!primary) return;
      try {
        // After validation, before the first visible write: a rejected file
        // changes nothing, so it must not leave an undo entry behind. A refused
        // one changes nothing either, and the check sits on the same boundary
        // for the same reason. Validation runs first so that a dropped PDF is
        // told it is a PDF rather than told to wait eight seconds and then told
        // it is a PDF.
        const { base64, mediaType, width, height } = await fileToBase64(file);
        if (refusedEarly(primary.id)) return;
        pushHistory();
        const imageId = putImage(`data:${mediaType};base64,${base64}`);
        patchLayer(primary.id, {
          imageId,
          imageName: file.name,
          imageWidth: width,
          imageHeight: height,
        });
        setShowSamples(false);
        await runOnPrimary({
          imageBase64: base64,
          mediaType,
          description: text,
        });
      } catch (err) {
        patchLayer(primary.id, { status: "error", error: err.message });
      }
    },
    [
      primary,
      text,
      putImage,
      patchLayer,
      runOnPrimary,
      pushHistory,
      refusedEarly,
    ],
  );

  // No push here. The text path's first visible write is the first keystroke,
  // not the submit, and setDescription already opened the entry there.
  const submitText = useCallback(() => {
    if (!text.trim()) return;
    runOnPrimary({ description: text });
  }, [text, runOnPrimary]);

  const travel = useCallback(
    (fn, label) => {
      const { moved, aborted } = fn();
      if (!moved) return;
      // Requests undo aborted cost whatever they cost; they join the cancelled
      // column, not the landed one.
      for (let i = 0; i < aborted; i++) recordCancelled();
      setTimeNote(
        aborted
          ? `${label} CANCELLED ${aborted} ANALYS${aborted === 1 ? "IS" : "ES"} IN FLIGHT`
          : null,
      );
    },
    [recordCancelled],
  );

  useEffect(() => {
    if (!timeNote) return;
    const t = setTimeout(() => setTimeNote(null), 4000);
    return () => clearTimeout(t);
  }, [timeNote]);

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if (e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      if (e.shiftKey) travel(redo, "REDO");
      else travel(undo, "UNDO");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, travel]);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      setDragOver(false);
      await handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile],
  );

  return (
    <div className="panel">
      <SourceMaterial
        src={primaryImage}
        filename={primary?.imageName}
        width={primary?.imageWidth}
        height={primary?.imageHeight}
        onUpload={() => fileRef.current?.click()}
        onDrop={handleDrop}
        dragOver={dragOver}
        setDragOver={setDragOver}
        samplesOpen={showSamples}
        onSamples={() => setShowSamples((value) => !value)}
      />
      {showSamples && (
        <div className="preset-row" aria-label="Sample materials">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className="preset"
              disabled={busy}
              onClick={() => handlePreset(p)}
            >
              <img src={p.image} alt="" />
              <span>{p.label[0] + p.label.slice(1).toLowerCase()}</span>
            </button>
          ))}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          await handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {busy && (
        <div className="analysis-status" role="status">
          <span>Creating your material…</span>
          <button className="link-btn" onClick={cancelPrimary}>
            Cancel
          </button>
        </div>
      )}
      {primary?.status === "cancelled" && (
        <p className="status" role="status">
          Analysis cancelled. Current material kept.
        </p>
      )}
      {primary?.source === "FALLBACK" && (
        <p className="status">
          The response could not be read. Your last material is kept.
        </p>
      )}
      {primary?.error && (
        <p
          className={`status ${primary.status === "error" ? "error" : "held"}`}
          role="alert"
        >
          {primary.error.charAt(0) + primary.error.slice(1).toLowerCase()}
        </p>
      )}
      <details className="describe-option">
        <summary>Describe instead</summary>
        <div className="text-input-row">
          <input
            type="text"
            className="text-input"
            aria-label="Material description"
            placeholder="A soft, woven silk…"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (primary) setDescription(primary.id, e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && submitText()}
          />
          <button
            className="link-btn"
            onClick={submitText}
            disabled={busy || !text.trim()}
          >
            Create
          </button>
        </div>
      </details>
      <LayerInspector
        historyActions={
          <div className="history-actions">
            <button
              aria-label="Undo"
              title="Undo (⌘Z)"
              disabled={!canUndo}
              onClick={() => travel(undo, "Undo")}
            >
              ↶
            </button>
            <button
              aria-label="Redo"
              title="Redo (⇧⌘Z)"
              disabled={!canRedo}
              onClick={() => travel(redo, "Redo")}
            >
              ↷
            </button>
          </div>
        }
      />
      {timeNote && (
        <p className="status" role="status">
          {timeNote}
        </p>
      )}
      <LightControls />
      <details className="secondary-details">
        <summary>Your materials</summary>
        <LayerList />
      </details>
      <details className="secondary-details">
        <summary>Technical details</summary>
        <p className="source-note">
          {primary?.source === "LIVE"
            ? "Estimated from your input, with any adjustments you made."
            : primary?.source === "FALLBACK"
              ? "Last valid parameters retained."
              : "Stored sample parameters; no new analysis has landed."}{" "}
          These are material estimates, not physical measurements.
        </p>
        {!!primary?.keptKeys?.length && (
          <p className="source-note">
            Your manual changes to {primary.keptKeys.join(", ")} were preserved
            during analysis.
          </p>
        )}
        <pre className="raw-json">{primary?.rawJson}</pre>
        <p className="source-note">
          Structure → rigidity · Sheen → specular. Slider values display the
          existing 0–1 range as 0–100. Light intensity retains its 0–3 range.
        </p>
        <button className="link-btn" onClick={onShowSource}>
          View shader source
        </button>
        <ExportShader />
        {usage.landed + usage.cancelled + usage.refused > 0 && (
          <div className="session-usage">
            <p>Session usage</p>
            <dl>
              <dt>Analyses</dt>
              <dd>{usage.landed}</dd>
              <dt>Input tokens</dt>
              <dd>{usage.input.toLocaleString()}</dd>
              <dt>Output tokens</dt>
              <dd>{usage.output.toLocaleString()}</dd>
              <dt>Estimated cost</dt>
              <dd>${estimateUsd(usage.input, usage.output).toFixed(4)}</dd>
              <dt>Cancelled / refused</dt>
              <dd>
                {usage.cancelled} / {usage.refused}
              </dd>
            </dl>
            <p className="source-note">
              {RATES.model} · ${RATES.inputPerMTok} / ${RATES.outputPerMTok} per
              million input / output tokens. Rates checked {RATES.verified},{" "}
              {RATES.source}.
            </p>
          </div>
        )}
      </details>
    </div>
  );
}
