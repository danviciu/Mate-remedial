import { useMemo, useState } from "react";
import MediaModal from "../MediaModal.jsx";
import ModalGallery from "../../ui/ModalGallery.jsx";
import PercentBarVisual from "../PercentBarVisual.jsx";
import BalanceScale from "./BalanceScale.jsx";
import FractionBar from "./FractionBar.jsx";
import FractionCircle from "./FractionCircle.jsx";
import NumberLine from "./NumberLine.jsx";
import PercentGrid from "./PercentGrid.jsx";
import SimpleSteps from "./SimpleSteps.jsx";
import VisualFallback from "./VisualFallback.jsx";

function FractionOperationVisual({ spec, concealAnswers = false }) {
  const left = spec?.left ?? { numerator: 0, denominator: 1 };
  const right = spec?.right ?? { numerator: 0, denominator: 1 };
  const result = spec?.result ?? { numerator: 0, denominator: 1 };
  const op = spec?.operation ?? "+";

  return (
    <div className="grid gap-3 rounded-3xl bg-indigo-50 p-4 sm:grid-cols-3">
      <div className="text-center">
        <FractionCircle
          numer={left.numerator}
          denom={left.denominator}
          size={120}
          showLabel={!concealAnswers}
          showCenterLabel={!concealAnswers}
        />
      </div>
      <div className="flex items-center justify-center text-4xl font-black text-indigo-700">
        {op}
      </div>
      <div className="text-center">
        <FractionCircle
          numer={right.numerator}
          denom={right.denominator}
          size={120}
          showLabel={!concealAnswers}
          showCenterLabel={!concealAnswers}
        />
      </div>
      <div className="col-span-full flex items-center justify-center text-2xl font-black text-indigo-700">
        =
      </div>
      <div className="col-span-full text-center">
        <FractionCircle
          numer={Math.max(result.numerator, 0)}
          denom={result.denominator}
          size={132}
          showLabel={!concealAnswers}
          showCenterLabel={!concealAnswers}
        />
      </div>
    </div>
  );
}

function SignTableVisual({ spec }) {
  const left = spec?.left ?? 0;
  const right = spec?.right ?? 0;
  const operation = spec?.operation ?? "*";
  const result = spec?.result ?? 0;
  return (
    <div className="rounded-3xl bg-orange-50 p-4">
      <p className="text-center text-2xl font-black text-orange-700">
        {left} {operation} {right} = {result}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-orange-200 bg-white p-3 text-sm font-semibold text-orange-700">
          Semne egale - rezultat pozitiv.
        </div>
        <div className="rounded-2xl border border-orange-200 bg-white p-3 text-sm font-semibold text-orange-700">
          Semne diferite - rezultat negativ.
        </div>
      </div>
    </div>
  );
}

function NumberLineMoveVisual({ spec }) {
  const start = Number(spec?.start ?? 0);
  const result = Number(spec?.result ?? 0);
  const min = Number(spec?.min ?? -10);
  const max = Number(spec?.max ?? 10);
  const delta = Number(spec?.delta ?? 0);
  const operation = spec?.operation ?? "+";

  return (
    <div className="rounded-3xl bg-orange-50 p-4">
      <NumberLine min={min} max={max} value={result} highlights={[start]} />
      <p className="mt-2 text-center text-lg font-black text-orange-700">
        Start {start} {operation} {delta} = {result}
      </p>
    </div>
  );
}

function renderVisual(spec, options = {}) {
  const concealAnswers = options.concealAnswers === true;
  if (!spec || typeof spec !== "object") {
    return (
      <VisualFallback
        compact
        title="Date vizuale lipsa"
        detail="Spec-ul vizual lipseste sau nu este valid."
      />
    );
  }
  switch (spec.type) {
    case "fractionCircle":
      return (
        <FractionCircle
          numer={spec.numerator}
          denom={spec.denominator}
          label={concealAnswers ? undefined : spec.label}
          showLabel={!concealAnswers}
          showCenterLabel={!concealAnswers}
          size={150}
        />
      );
    case "fractionBar":
      return (
        <FractionBar
          numer={spec.numerator}
          denom={spec.denominator}
          label={concealAnswers ? undefined : spec.label}
          showLabel={!concealAnswers}
        />
      );
    case "fractionOperation":
      return <FractionOperationVisual spec={spec} concealAnswers={concealAnswers} />;
    case "percentGrid":
      return <PercentGrid percent={spec.percent} label={concealAnswers ? undefined : spec.label} compact={concealAnswers} />;
    case "percentBar":
      return <PercentBarVisual percent={spec.percent} blocks={10} />;
    case "numberLine":
      return (
        <NumberLine
          min={spec.min}
          max={spec.max}
          value={spec.value}
          highlights={spec.highlights ?? []}
        />
      );
    case "numberLineMove":
      return <NumberLineMoveVisual spec={spec} />;
    case "balanceScale":
      return <BalanceScale left={spec.left} right={spec.right} tilt={spec.tilt} />;
    case "signTable":
      return <SignTableVisual spec={spec} />;
    case "simpleSteps":
      return <SimpleSteps steps={spec.steps ?? []} current={spec.current ?? 0} />;
    case "image":
      if (typeof spec.src !== "string" || !spec.src) {
        return (
          <VisualFallback
            compact
            title="Date vizuale lipsa"
            detail="Imaginea nu are sursa valida."
          />
        );
      }
      return (
        <div className="overflow-hidden rounded-2xl bg-slate-100 p-2">
          <img
            src={spec.src}
            alt={String(spec.alt ?? "Imagine")}
            className="mx-auto max-h-72 w-auto rounded-xl object-contain"
          />
        </div>
      );
    case "gallery":
      if (!Array.isArray(spec.images) || spec.images.length === 0) {
        return (
          <VisualFallback
            compact
            title="Date vizuale lipsa"
            detail="Galeria este goală."
          />
        );
      }
      return (
        <div className="overflow-hidden rounded-2xl bg-slate-100 p-2">
          <img
            src={String(spec.images[0]?.src ?? "")}
            alt={String(spec.images[0]?.alt ?? "Imagine")}
            className="mx-auto max-h-72 w-auto rounded-xl object-contain"
          />
        </div>
      );
    default:
      return (
        <VisualFallback
          compact
          title="Date vizuale lipsa"
          detail={`Tip vizual necunoscut: ${String(spec.type ?? "unknown")}.`}
        />
      );
  }
}

function getGalleryItems(spec) {
  if (!spec || typeof spec !== "object") return [];
  if (spec.type === "image" && typeof spec.src === "string" && spec.src) {
    return [
      {
        src: spec.src,
        alt: String(spec.alt ?? "Imagine"),
        caption: String(spec.caption ?? ""),
      },
    ];
  }
  if (spec.type === "gallery" && Array.isArray(spec.images)) {
    return spec.images
      .filter((item) => item && typeof item.src === "string" && item.src)
      .map((item) => ({
        src: item.src,
        alt: String(item.alt ?? "Imagine"),
        caption: String(item.caption ?? ""),
      }));
  }
  return [];
}

export default function VisualRenderer({
  spec,
  modalTitle = "Vizual matematic",
  withModal = true,
  concealAnswers = false,
}) {
  const [open, setOpen] = useState(false);
  const visual = useMemo(() => renderVisual(spec, { concealAnswers }), [concealAnswers, spec]);
  const galleryItems = useMemo(() => getGalleryItems(spec), [spec]);
  if (!withModal) return visual;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-3xl text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
        aria-label="Deschide vizualizarea mare"
      >
        {visual}
      </button>

      {galleryItems.length > 0 ? (
        <ModalGallery
          open={open}
          onClose={() => setOpen(false)}
          title={modalTitle}
          items={galleryItems}
          initialIndex={0}
        />
      ) : (
        <MediaModal open={open} onClose={() => setOpen(false)} title={modalTitle}>
          {renderVisual(spec, { concealAnswers })}
        </MediaModal>
      )}
    </>
  );
}
