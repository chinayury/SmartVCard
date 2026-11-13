import { useTranslation } from "react-i18next";

import CardPreview from "../components/CardPreview";
import { Icon, type IconName } from "../components/Icon";
import { useDocumentHead } from "../hooks/useDocumentHead";
import { useQrPreview } from "../hooks/useQrPreview";
import { emptyVCard, toVCardData } from "../lib/schema";
import { createVCard } from "../lib/vcard";

const SPECIMEN_VALUES = {
 ...emptyVCard,
 firstName: "Zhiyuan",
 lastName: "Lin",
 title: "Brand Designer",
 organization: "Indigo Grid Studio",
 companyShortName: "IG",
 slogan: "Design that reads at a glance.",
 cellPhone: "+8613800000000",
 email: "zhiyuan@indigo-grid.studio",
 url: "https://indigo-grid.studio",
 workStreet: "Lane 320, Wukang Road",
 workCity: "Shanghai",
 workCountry: "China",
};

const SPECIMEN_DATA = toVCardData(SPECIMEN_VALUES);
const SPECIMEN_PAYLOAD = createVCard(SPECIMEN_DATA);

interface LedgerItem {
 id: "bilingual" | "dual" | "local" | "install";
 icon: IconName;
}

const LEDGER: LedgerItem[] = [
 { id: "bilingual", icon: "globe" },
 { id: "dual", icon: "qr" },
 { id: "local", icon: "shield" },
 { id: "install", icon: "download" },
];

const STEPS = ["one", "two", "three"] as const;

export function Home() {
 const { t } = useTranslation();
 useDocumentHead({ title: t("app.name"), description: t("app.description") });

 const specimenQr = useQrPreview(SPECIMEN_PAYLOAD, "#2b4acb", "rounded");

 return (
 <div>
 {/* Hero */}
 <section className="shell grid gap-12 pb-16 pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
 <div className="reveal">
 <p className="overline">{t("home.eyebrow")}</p>
 <h1 className="mt-5 max-w-[16ch] text-[44px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[56px] lg:text-[62px]">
 {t("home.titleTop")}
 <span className="text-indigo">{t("home.titleAccent")}</span>
 </h1>
 <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">{t("home.subtitle")}</p>

 <div className="mt-8 flex flex-wrap gap-3">
 <a href="#/generator" className="btn btn--primary btn--lg">
 {t("home.ctaPrimary")}
 <Icon name="arrow-right" className="h-4 w-4" />
 </a>
 <a href="#/about" className="btn btn--outline btn--lg">
 {t("home.ctaSecondary")}
 </a>
 </div>

 <dl className="mt-10 grid max-w-md grid-cols-3 gap-3">
 <div className="rounded-xl border border-line bg-surface p-4 shadow-panel">
 <dt className="text-[22px] font-bold leading-none text-indigo">100%</dt>
 <dd className="mt-1.5 text-[11px] leading-snug text-muted">{t("home.facts.local")}</dd>
 </div>
 <div className="rounded-xl border border-line bg-surface p-4 shadow-panel">
 <dt className="text-[22px] font-bold leading-none text-indigo">2</dt>
 <dd className="mt-1.5 text-[11px] leading-snug text-muted">{t("home.facts.bilingual")}</dd>
 </div>
 <div className="rounded-xl border border-line bg-surface p-4 shadow-panel">
 <dt className="text-[22px] font-bold leading-none text-indigo">0</dt>
 <dd className="mt-1.5 text-[11px] leading-snug text-muted">{t("home.facts.signup")}</dd>
 </div>
 </dl>
 </div>

 <div className="reveal reveal-delay-1">
 <div className="mx-auto max-w-[420px] rounded-[24px] border border-line bg-surface p-6 shadow-panel">
 <p className="mb-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">
 {t("home.specimenLabel")}
 </p>
 <div className="rotate-[0.7deg]">
 <CardPreview data={SPECIMEN_DATA} qrSrc={specimenQr.src} memoKey="home-specimen" />
 </div>
 <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
 {t("home.specimenNote")}
 </p>
 </div>
 </div>
 </section>

 {/* Capability ledger */}
 <section className="border-t border-line">
 <div className="shell py-16">
 <div className="flex flex-wrap items-end justify-between gap-6">
 <div>
 <p className="overline">{t("home.ledger.overline")}</p>
 <h2 className="mt-3 text-[30px] font-bold leading-tight text-ink">
 {t("home.ledger.title")}
 </h2>
 </div>
 <p className="max-w-sm text-[13px] leading-relaxed text-muted">{t("home.ledger.subtitle")}</p>
 </div>

 <ul className="mt-8 grid gap-4 sm:grid-cols-2">
 {LEDGER.map((item, index) => (
 <li key={item.id} className="rounded-[14px] border border-line bg-surface p-6 shadow-panel">
 <div className="flex items-center justify-between">
 <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-soft text-indigo">
 <Icon name={item.icon} className="h-5 w-5" />
 </span>
 <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-indigo">
 {String(index + 1).padStart(2, "0")}
 </span>
 </div>
 <h3 className="mt-5 text-[19px] font-bold leading-snug text-ink">
 {t(`home.ledger.items.${item.id}.title`)}
 </h3>
 <p className="mt-2 text-[13px] leading-relaxed text-muted">
 {t(`home.ledger.items.${item.id}.desc`)}
 </p>
 <span className="chip mt-4">{t(`home.ledger.items.${item.id}.meta`)}</span>
 </li>
 ))}
 </ul>
 </div>
 </section>

 {/* Three moves */}
 <section className="shell py-16">
 <div className="flex flex-wrap items-end justify-between gap-6">
 <div>
 <p className="overline">{t("home.flow.overline")}</p>
 <h2 className="mt-3 text-[30px] font-bold leading-tight text-ink">{t("home.flow.title")}</h2>
 </div>
 <p className="max-w-sm text-[13px] leading-relaxed text-muted">{t("home.flow.subtitle")}</p>
 </div>

 <ol className="mt-8 grid gap-4 sm:grid-cols-3">
 {STEPS.map((step, index) => (
 <li key={step} className="relative overflow-hidden rounded-[14px] border border-line bg-surface p-6 shadow-panel">
 <span
 aria-hidden="true"
 className="pointer-events-none absolute -right-2 -top-4 font-mono text-[64px] font-bold leading-none text-canvas"
 >
 {String(index + 1).padStart(2, "0")}
 </span>
 <span className="chip">{t(`home.flow.steps.${step}.tag`)}</span>
 <h3 className="mt-4 text-[20px] font-bold text-ink">{t(`home.flow.steps.${step}.title`)}</h3>
 <p className="mt-2 text-[13px] leading-relaxed text-muted">{t(`home.flow.steps.${step}.desc`)}</p>
 </li>
 ))}
 </ol>
 </section>

 {/* Privacy note */}
 <section className="border-y border-line bg-surface">
 <div className="shell grid gap-5 py-12 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8">
 <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-soft text-teal">
 <Icon name="shield" className="h-7 w-7" />
 </span>
 <div>
 <h2 className="text-[22px] font-bold leading-snug text-ink">{t("home.privacy.title")}</h2>
 <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{t("home.privacy.body")}</p>
 </div>
 <a href="#/about" className="btn btn--outline btn--sm justify-self-start">
 {t("home.privacy.cta")}
 </a>
 </div>
 </section>

 {/* Closing */}
 <section className="shell py-20 text-center">
 <p className="overline justify-center">{t("home.closing.overline")}</p>
 <h2 className="mt-4 text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[38px]">
 {t("home.closing.title")}
 </h2>
 <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-muted">
 {t("home.closing.body")}
 </p>
 <a href="#/generator" className="btn btn--primary btn--lg mt-8">
 {t("home.closing.cta")}
 <Icon name="arrow-right" className="h-4 w-4" />
 </a>
 </section>
 </div>
 );
}

export default Home;
