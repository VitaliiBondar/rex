import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getCandidatesForStats } from "@/lib/queries";
import {
  filterCandidates,
  addedInMonth,
  reachedStatusInMonth,
  activeAtEndOfMonth,
  activeNow,
  reachedStatusEver,
  earliestMonth,
  countBy,
  monthlyTrend,
} from "@/lib/stats";
import {
  ACTIVE_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  RECRUITMENT_TYPES,
  RECRUITMENT_TYPE_LABELS,
  RECRUITMENT_TYPE_COLORS,
  CHANNELS,
  CHANNEL_LABELS,
  CHANNEL_COLORS,
} from "@/lib/domain";
import { currentMonth, lastMonths, monthLabel, monthsBetween } from "@/lib/format";
import { DashboardControls } from "./dashboard-controls";
import {
  StageBarChart,
  DistributionPie,
  TrendChart,
  type NamedDatum,
} from "./charts";

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

  const added = isAll ? filtered : addedInMonth(filtered, month);
  const enlisted = isAll
    ? reachedStatusEver(filtered, "ENLISTED").length
    : reachedStatusInMonth(filtered, "ENLISTED", month).length;
  const rejected = isAll
    ? reachedStatusEver(filtered, "REJECTED_BY_US").length
    : reachedStatusInMonth(filtered, "REJECTED_BY_US", month).length;
  const selfWithdrew = isAll
    ? reachedStatusEver(filtered, "SELF_WITHDREW").length
    : reachedStatusInMonth(filtered, "SELF_WITHDREW", month).length;
  const active = isAll ? activeNow(filtered) : activeAtEndOfMonth(filtered, month);

  // Розподіл активних по етапах.
  const activeByStatus = countBy(active, (c) => c.status);
  const stageData: NamedDatum[] = ACTIVE_STATUSES.filter(
    (s) => activeByStatus[s],
  ).map((s) => ({
    name: STATUS_LABELS[s],
    value: activeByStatus[s],
    fill: STATUS_COLORS[s],
  }));

  // Розподіл доданих (або всіх — у режимі "Весь період") по типах і каналах.
  const addedByType = countBy(added, (c) => c.recruitmentType);
  const typeData: NamedDatum[] = RECRUITMENT_TYPES.filter(
    (t) => addedByType[t],
  ).map((t) => ({
    name: RECRUITMENT_TYPE_LABELS[t],
    value: addedByType[t],
    fill: RECRUITMENT_TYPE_COLORS[t],
  }));

  const addedByChannel = countBy(added, (c) => c.channel);
  const channelData: NamedDatum[] = CHANNELS.filter(
    (c) => addedByChannel[c],
  ).map((c) => ({
    name: CHANNEL_LABELS[c],
    value: addedByChannel[c],
    fill: CHANNEL_COLORS[c],
  }));

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
    Додані: p.added,
    Зараховано: p.enlisted,
    Відмови: p.rejected + p.selfWithdrew,
  }));

  return (
    <>
      <PageHeader title="Дашборд" />

      <div className="px-4 sm:px-6 py-4 border-b border-border bg-surface">
        <DashboardControls months={monthOptions} currentMonth={month} />
        <p className="mt-2 text-sm text-ink-soft">
          Показники за{" "}
          <span className="font-medium text-ink">
            {isAll ? "весь час" : monthLabel(month)}
          </span>
        </p>
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-6">
        {/* Усього кандидатів — завжди видимо, незалежно від місяця/фільтрів */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Усього кандидатів" value={all.length} accent="ink" />
          {RECRUITMENT_TYPES.map((t) => (
            <Kpi
              key={t}
              label={RECRUITMENT_TYPE_LABELS[t]}
              value={countBy(all, (c) => c.recruitmentType)[t] ?? 0}
            />
          ))}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi label={isAll ? "Додано всього" : "Нових за місяць"} value={added.length} />
          <Kpi label="Зараз в роботі" value={active.length} accent="ink" />
          <Kpi label="Зараховано" value={enlisted} accent="green" />
          <Kpi label="Відмова з нашого боку" value={rejected} accent="red" />
          <Kpi label="Відмовився сам" value={selfWithdrew} accent="orange" />
        </div>

        {/* Тренд */}
        <Card className="p-5">
          <p className="eyebrow mb-4">
            {isAll ? "Динаміка за весь час" : "Динаміка за 6 місяців"}
          </p>
          <TrendChart data={trend} />
        </Card>

        {/* Розподіли */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <p className="eyebrow mb-4">В роботі за етапами</p>
            <StageBarChart data={stageData} />
          </Card>
          <Card className="p-5">
            <p className="eyebrow mb-4">Додані за типом залучення</p>
            <DistributionPie data={typeData} />
          </Card>
          <Card className="p-5 lg:col-span-2">
            <p className="eyebrow mb-4">Додані за каналом</p>
            <DistributionPie data={channelData} />
          </Card>
        </div>
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
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card className="p-4">
      <p className="eyebrow leading-tight">{label}</p>
      <p className={`tnum mt-2 text-3xl font-semibold ${ACCENTS[accent]}`}>
        {value}
      </p>
    </Card>
  );
}
