import { useRef, useState } from "react";

export default function SourceMaterial({
  src,
  filename,
  width,
  height,
  onUpload,
  onDrop,
  dragOver,
  setDragOver,
  onSamples,
  samplesOpen,
}) {
  const dialog = useRef(null);
  const [decoded, setDecoded] = useState(null);
  const dimensions =
    width && height
      ? `${width} × ${height}`
      : decoded?.src === src
        ? decoded.value
        : "";
  return (
    <>
      <section
        className={`source-material ${src ? "has-source" : ""} ${dragOver ? "drag-over" : ""}`}
        aria-label={src ? "Source image" : "Upload a material"}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
        }}
        onDrop={onDrop}
      >
        {src ? (
          <>
            <h2>Source</h2>
            <div className="source-preview">
              <button
                className="source-thumbnail"
                onClick={() => dialog.current.showModal()}
                aria-label="Enlarge source image"
              >
                <img
                  src={src}
                  alt="Material reference"
                  onLoad={(e) =>
                    setDecoded({
                      src,
                      value: `${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`,
                    })
                  }
                />
              </button>
              <div className="source-info">
                <span className="source-filename" title={filename}>
                  {filename || "Material image"}
                </span>
                <span className="dimensions">{dimensions}</span>
                <button className="link-btn" onClick={onUpload}>
                  Replace image
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1>Upload a material</h1>
            <p>Drop an image here or choose a file</p>
            <span className="file-types">JPG, PNG, WEBP</span>
            <div className="upload-actions">
              <button className="upload-button" onClick={onUpload}>
                Upload image <span aria-hidden="true">↗</span>
              </button>
              <button
                className="link-btn"
                aria-expanded={samplesOpen}
                onClick={onSamples}
              >
                Try a sample
              </button>
            </div>
          </>
        )}
      </section>
      {src && (
        <button
          className="link-btn sample-toggle"
          aria-expanded={samplesOpen}
          onClick={onSamples}
        >
          Try a sample
        </button>
      )}
      <dialog
        ref={dialog}
        className="reference-dialog"
        aria-label="Source image comparison"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current.close();
        }}
      >
        <div className="reference-head">
          <span>{filename || "Source image"}</span>
          <button className="link-btn" onClick={() => dialog.current.close()}>
            Close ×
          </button>
        </div>
        {src && <img src={src} alt="Expanded source material" />}
        <p className="dimensions">{dimensions}</p>
      </dialog>
    </>
  );
}
