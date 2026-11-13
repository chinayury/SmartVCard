import { useTranslation } from "react-i18next";

import { Icon, type IconName } from "../components/Icon";
import { useDocumentHead } from "../hooks/useDocumentHead";
import { APP_EDITION, APP_VERSION } from "../lib/version";

interface Principle {
 id: "local" | "interop" | "legible" | "quiet";
 icon: IconName;
}

const PRINCIPLES: Principle[] = [
 { id: "local", icon: "shield" },
 { id: "interop", icon: "globe" },
 { id: "legible", icon: "file-text" },
 { id: "quiet", icon: "lock" },
];

const STACK: { id: string; value: string }[] = [
 { id: "framework", value: "React 19 · TypeScript 5" },
 { id: "build", value: "Vite 8" },
 { id: "style", value: "Tailwind CSS 4" },
 { id: "form", value: "react-hook-form · Zod 4" },
 { id: "i18n", value: "i18next · react-i18next" },
 { id: "qr", value: "qrcode · custom SVG renderer" },
 { id: "pwa", value: "vite-plugin-pwa" },
 { id: "router", value: "react-router-dom 7" },
];

export function About() {
 const { t } = useTranslation();
 useDocumentHead({ title: t("about.title"), description: t("about.intro") });

 return (
 <div className="shell py-12 lg:py-16">
 <div className="grid gap-12 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16">
 <aside className="lg:sticky lg:top-24 lg:self-start">
 <p className="overline">{t("about.overline")}</p>
 <h1 className="mt-3 text-[36px] font-bold leading-tight tracking-[-0.02em] text-ink">{t("about.title")}</h1>
 <p className="mt-4 text-[13px] leading-relaxed text-muted">{t("about.intro")}</p>

 <dl className="mt-8 space-y-2 rounded-[14px] border border-line bg-surface p-5 shadow-panel">
 <div className="flex justify-between gap-3 border-b border-line pb-2">
 <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{t("about.versionLabel")}</dt>
 <dd className="font-mono text-[12px] font-bold text-indigo-deep">{APP_VERSION}</dd>
 </div>
 <div className="flex justify-between gap-3 border-b border-line pb-2">
 <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{t("about.editionLabel")}</dt>
 <dd className="text-[12px] font-semibold text-ink">{APP_EDITION}</dd>
 </div>
 <div className="flex justify-between gap-3">
 <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{t("about.licenseLabel")}</dt>
 <dd className="font-mono text-[12px] font-bold text-ink">MIT</dd>
 </div>
 </dl>
 </aside>

 <div className="space-y-12">
 <section aria-labelledby="principles-title">
 <h2 id="principles-title" className="text-[26px] font-bold leading-none tracking-[-0.02em] text-ink">
 {t("about.principlesTitle")}
 </h2>
 <div className="mt-6 grid gap-4 sm:grid-cols-2">
 {PRINCIPLES.map((principle, index) => (
 <article key={principle.id} className="rounded-[14px] border border-line bg-surface p-5 shadow-panel">
 <div className="flex items-center justify-between">
 <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-soft text-indigo">
 <Icon name={principle.icon} className="h-5 w-5" />
 </span>
 <span className="font-mono text-[10px] font-bold text-muted">
 {String(index + 1).padStart(2, "0")}
 </span>
 </div>
 <h3 className="mt-5 text-[18px] font-bold text-ink">
 {t(`about.principles.${principle.id}.title`)}
 </h3>
 <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
 {t(`about.principles.${principle.id}.desc`)}
 </p>
 </article>
 ))}
 </div>
 </section>

 <section aria-labelledby="stack-title">
 <div className="flex flex-wrap items-end justify-between gap-4">
 <h2 id="stack-title" className="text-[26px] font-bold leading-none tracking-[-0.02em] text-ink">
 {t("about.stackTitle")}
 </h2>
 <p className="max-w-sm text-[12px] leading-relaxed text-muted">{t("about.stackNote")}</p>
 </div>
 <dl className="mt-6 divide-y divide-line rounded-[14px] border border-line bg-surface px-5 shadow-panel">
 {STACK.map((item) => (
 <div key={item.id} className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-baseline sm:gap-6">
 <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
 {t(`about.stack.${item.id}`)}
 </dt>
 <dd className="text-[13px] text-ink-soft">{item.value}</dd>
 </div>
 ))}
 </dl>
 </section>

 <section aria-labelledby="interop-title">
 <h2 id="interop-title" className="text-[26px] font-bold leading-none tracking-[-0.02em] text-ink">
 {t("about.interopTitle")}
 </h2>
 <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-soft">{t("about.interopBody")}</p>
 <ul className="mt-5 space-y-3">
 {["format", "wechat", "folding", "privacy"].map((key) => (
 <li key={key} className="flex gap-3 rounded-lg border border-line bg-surface p-3">
 <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-teal-soft text-teal">
 <Icon name="check" className="h-3 w-3" />
 </span>
 <p className="text-[13px] leading-relaxed text-muted">
 {t(`about.interopPoints.${key}`)}
 </p>
 </li>
 ))}
 </ul>
 </section>

 <section aria-labelledby="credits-title">
 <h2 id="credits-title" className="text-[26px] font-bold leading-none tracking-[-0.02em] text-ink">
 {t("about.creditsTitle")}
 </h2>
 <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{t("about.creditsBody")}</p>
 <p className="mt-4 text-[13px] leading-relaxed text-muted">{t("about.licenseBody")}</p>
 </section>
 </div>
 </div>
 </div>
 );
}

export default About;
