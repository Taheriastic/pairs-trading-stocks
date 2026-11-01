"use client";

import Image from "next/image";
import { useState } from "react";

const pages = [
  {
    label: "Company comparison",
    image: "/powerbi/report-1.png",
    description:
      "Reported revenue, operating income, growth, margins, and fixed-revenue margin sensitivity for all four companies.",
  },
  {
    label: "Scenario planning",
    image: "/powerbi/report-2.png",
    description:
      "Microsoft example: +5 percentage points of revenue growth and +1 point of operating margin. The waterfall reconciles $126.58B of base operating income to $135.01B.",
  },
  {
    label: "Sources & definitions",
    image: "/powerbi/report-3.png",
    description:
      "Exact fiscal periods, SEC filing URLs, and calculation definitions. Coca-Cola and PepsiCo use FY2023; Microsoft and Oracle use FY2024.",
  },
];

export default function PowerBIReport() {
  const [page, setPage] = useState(0);
  const selected = pages[page];

  return (
    <section
      className="lab-panel powerbi-panel"
      aria-labelledby="powerbi-title"
    >
      <div className="powerbi-heading">
        <div>
          <span className="lab-eyebrow">POWER BI / FINANCIAL PLANNING</span>
          <h2 id="powerbi-title">From operating drivers to decisions.</h2>
          <p>
            A three-page report built in Microsoft Power BI, comparing
            Coca-Cola, PepsiCo, Microsoft, and Oracle across 100 growth and
            margin scenarios.
          </p>
        </div>
        <div className="powerbi-finding">
          <span>Microsoft / +1pp margin</span>
          <strong>$2.45B</strong>
          <small>
            Modeled operating-income sensitivity at $245.122B of FY2024 revenue.
            This is not realized profit or savings.
          </small>
        </div>
      </div>

      <div className="powerbi-toolbar">
        <div
          className="powerbi-pages"
          role="group"
          aria-label="Power BI report pages"
        >
          {pages.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={page === index}
              aria-controls="powerbi-preview"
              onClick={() => setPage(index)}
            >
              <span aria-hidden="true">0{index + 1}</span> {item.label}
            </button>
          ))}
        </div>
        <span className="powerbi-snapshot">Filing cutoff · 23 Dec 2024</span>
      </div>

      <figure id="powerbi-preview" className="powerbi-preview">
        <a
          href={selected.image}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open full-size ${selected.label} report preview`}
        >
          <Image
            key={selected.image}
            src={selected.image}
            alt={`Exported Power BI report: ${selected.label}. ${selected.description}`}
            width={1600}
            height={909}
            sizes="(max-width: 800px) 95vw, 1100px"
            unoptimized
          />
        </a>
        <figcaption aria-live="polite">
          <b>{selected.label}.</b> {selected.description}
          <span> Select the preview to enlarge.</span>
        </figcaption>
      </figure>

      <div className="powerbi-downloads">
        <a className="lab-primary" href="/powerbi/fpa-report.pdf" download>
          Download report PDF ↓
        </a>
        <a className="lab-secondary" href="/powerbi/fpa-report.pbix" download>
          Download Power BI file ↓
        </a>
      </div>
      <p className="powerbi-access-note">
        This preview was exported from Power BI on 18 Oct 2026. Public embedding
        is restricted by the university account administrator. The PDF is open
        to everyone; the PBIX contains the report and imported public data for
        Power BI Desktop on Windows. Its company and assumption filters work
        inside Power BI. Use the operating outlook above to change assumptions
        here.
      </p>
    </section>
  );
}
