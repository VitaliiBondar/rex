import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getCandidatesForStats } from "@/lib/queries";
import {
  filterCandidates,
  candidatesForMonth,
  reachedStatusInMonth,
  activeAtEndOfMonth,
  activeNow,
  reachedStatusEver,
  earliestMonth,
  countBy,
  monthlyTrend,
} from "@/lib/stats";
import {
  RECRUITMENT_TYPES,
  RECRUITMENT_TYPE_LABELS,
  RECRUITMENT_TYPE_COLORS,
} from "@/lib/domain";
import { currentMonth, lastMonths, monthLabel, monthsBetween } from "@/lib/format";
import { DashboardControls } from "./dashboard-controls";
import { DistributionPie, TrendChart, type NamedDatum } from "./charts";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const month = sp.month || currentMonth();

  const all = await getCandidatesForStats();

  const filtered = filterCandidates(all, {
    recruitmentType: sp.recruitmentType,
    channel: sp.channel,
  });

  const isAll = month === "all";
  const monthOptions = lastMonths(6); // фіксований список для селектора контролів

  // Кандидати, що були "в роботі" протягом вибраного періоду — і ті, хто
  // лишався активним на кінець періоду, і ті, хто фіналізувався саме в ньому
  // (той самий знімок, що й на помісячному списку кандидатів). За весь час
  // це просто всі відфільтровані кандидати.
  const inProgressDuringPeriod = isAll ? filtered : candidatesForMonth(filtered, month);
  const enlistedCandidates = isAll
    ? reachedStatusEver(filtered, "ENLISTED")
    : reachedStatusInMonth(filtered, "ENLISTED", month);
  const enlisted = enlistedCandidates.length;
  const rejected = isAll
    ? reachedStatusEver(filtered, "REJECTED_BY_US").length
    : reachedStatusInMonth(filtered, "REJECTED_BY_US", month).length;
  const selfWithdrew = isAll
    ? reachedStatusEver(filtered, "SELF_WITHDREW").length
    : reachedStatusInMonth(filtered, "SELF_WITHDREW", month).length;
  const active = isAll ? activeNow(filtered) : activeAtEndOfMonth(filtered, month);

  // Зараховані (у вибраному місяці, або за весь час) за типом залучення.
  const enlistedByType = countBy(enlistedCandidates, (c) => c.recruitmentType);
  const enlistedTypeData: NamedDatum[] = RECRUITMENT_TYPES.filter(
    (t) => enlistedByType[t],
  ).map((t) => ({
    name: RECRUITMENT_TYPE_LABELS[t],
    value: enlistedByType[t],
    fill: RECRUITMENT_TYPE_COLORS[t],
  }));

  // Усього зараховано за весь час (незалежно від місяця/фільтрів) — для
  // завжди видимого верхнього блоку.
  const allTimeEnlisted = reachedStatusEver(all, "ENLISTED");
  const allTimeEnlistedByType = countBy(allTimeEnlisted, (c) => c.recruitmentType);

  // Тренд: 6 місяців, або повна історія в режимі "Весь період" (діапазон —
  // від нефільтрованого `all`, щоб вісь не змінювалась при зміні фільтрів).
  const trendMonths = isAll
    ? monthsBetween(earliestMonth(all), currentMonth())
    : lastMonths(6);
  const trend = monthlyTrend(filtered, trendMonths).map((p) => ({
    month: format(
      new Date(Number(p.month.split("-")[0]), Number(p.month.split("-")[1]) - 1),
      "LLL",
      { locale: uk },
    ),
    "В роботі": p.inProgress,
    Зараховано: p.enlisted,
    Відмови: p.rejected + p.selfWithdrew,
  }));

  return (
    <>
      <PageHeader title="Дашборд" />

      <div className="px-4 sm:px-6 py-4 border-b border-border bg-surface">
        <DashboardControls months={monthOptions} currentMonth={month} />
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-6">
        {/* Усього зараховано — завжди видимо, незалежно від місяця/фільтрів */}
        <div>
          <p className="eyebrow mb-2">Зараховано за весь час</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Kpi label="Усього зараховано" value={allTimeEnlisted.length} accent="green" dense />
            {RECRUITMENT_TYPES.map((t) => (
              <Kpi
                key={t}
                label={RECRUITMENT_TYPE_LABELS[t]}
                value={allTimeEnlistedByType[t] ?? 0}
                dense
              />
            ))}
          </div>
        </div>

        {/* KPI */}
        <div>
          <p className="eyebrow mb-2">
            Показники за {isAll ? "весь час" : monthLabel(month)}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Kpi label="В роботі за період" value={inProgressDuringPeriod.length} />
            <Kpi label="Зараз в роботі" value={active.length} accent="ink" />
            <Kpi label="Зараховано" value={enlisted} accent="green" />
            <Kpi label="Відмова з нашого боку" value={rejected} accent="red" />
            <Kpi label="Відмовився сам" value={selfWithdrew} accent="orange" />
          </div>
        </div>

        {/* Тренд */}
        <Card className="p-5">
          <p className="eyebrow mb-4">
            {isAll ? "Динаміка за весь час" : "Динаміка за 6 місяців"}
          </p>
          <TrendChart data={trend} />
        </Card>

        {/* Зараховано за типом залучення */}
        <Card className="p-5">
          <p className="eyebrow mb-4">Зараховано</p>
          <DistributionPie data={enlistedTypeData} />
        </Card>
      </div>
    </>
  );
}

const ACCENTS: Record<string, string> = {
  ink: "text-ink",
  green: "text-green-600 dark:text-green-400",
  red: "text-red-600 dark:text-red-400",
  orange: "text-orange-600 dark:text-orange-400",
};

function Kpi({
  label,
  value,
  accent = "ink",
  dense = false,
}: {
  label: string;
  value: number;
  accent?: string;
  dense?: boolean;
}) {
  return (
    <Card className={dense ? "p-3" : "p-4"}>
      <p className="eyebrow leading-tight">{label}</p>
      <p
        className={`tnum mt-2 font-semibold ${dense ? "text-xl" : "text-3xl"} ${ACCENTS[accent]}`}
      >
        {value}
      </p>
    </Card>
  );
}
