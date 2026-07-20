import { describe, it, expect } from "vitest";
import {
  monthRange,
  statusAt,
  addedInMonth,
  reachedStatusInMonth,
  activeAtEndOfMonth,
  countBy,
  monthlyTrend,
  filterCandidates,
  type StatCandidate,
} from "./stats";

// Хелпер для стислого створення кандидата з історією статусів.
function makeCandidate(
  id: string,
  opts: Partial<StatCandidate> & {
    createdAt: Date;
    changes: { toStatus: string; changedAt: Date; fromStatus?: string | null }[];
  },
): StatCandidate {
  const changes = opts.changes;
  return {
    id,
    createdAt: opts.createdAt,
    status: changes.length ? changes[changes.length - 1].toStatus : "NEW",
    recruitmentType: opts.recruitmentType ?? "MOBILIZATION",
    channel: opts.channel ?? "DIRECT",
    responsibleUserId: opts.responsibleUserId ?? null,
    statusChanges: changes.map((c) => ({
      toStatus: c.toStatus,
      changedAt: c.changedAt,
    })),
  };
}

describe("monthRange", () => {
  it("повертає межі місяця [start, end)", () => {
    const { start, end } = monthRange("2026-06");
    expect(start).toEqual(new Date(2026, 5, 1));
    expect(end).toEqual(new Date(2026, 6, 1));
  });

  it("коректно переходить через межу року (грудень)", () => {
    const { start, end } = monthRange("2026-12");
    expect(start).toEqual(new Date(2026, 11, 1));
    expect(end).toEqual(new Date(2027, 0, 1));
  });
});

describe("statusAt", () => {
  const c = makeCandidate("1", {
    createdAt: new Date(2026, 4, 10),
    changes: [
      { toStatus: "NEW", changedAt: new Date(2026, 4, 10) },
      { toStatus: "MEDICAL_COMMISSION", changedAt: new Date(2026, 5, 20) },
      { toStatus: "ENLISTED", changedAt: new Date(2026, 6, 5) },
    ],
  });

  it("до першої зміни статусу — null", () => {
    expect(statusAt(c, new Date(2026, 3, 1))).toBeNull();
  });

  it("повертає статус, актуальний на дату", () => {
    expect(statusAt(c, new Date(2026, 4, 15))).toBe("NEW");
    expect(statusAt(c, new Date(2026, 5, 25))).toBe("MEDICAL_COMMISSION");
    expect(statusAt(c, new Date(2026, 7, 1))).toBe("ENLISTED");
  });
});

describe("addedInMonth", () => {
  const candidates = [
    makeCandidate("a", {
      createdAt: new Date(2026, 5, 3),
      changes: [{ toStatus: "NEW", changedAt: new Date(2026, 5, 3) }],
    }),
    makeCandidate("b", {
      createdAt: new Date(2026, 5, 28),
      changes: [{ toStatus: "NEW", changedAt: new Date(2026, 5, 28) }],
    }),
    makeCandidate("c", {
      createdAt: new Date(2026, 6, 1),
      changes: [{ toStatus: "NEW", changedAt: new Date(2026, 6, 1) }],
    }),
  ];

  it("рахує лише доданих у межах місяця", () => {
    expect(addedInMonth(candidates, "2026-06").length).toBe(2);
    expect(addedInMonth(candidates, "2026-07").length).toBe(1);
    expect(addedInMonth(candidates, "2026-05").length).toBe(0);
  });
});

describe("reachedStatusInMonth", () => {
  const enlistedInJuly = makeCandidate("a", {
    createdAt: new Date(2026, 4, 1), // доданий у травні
    changes: [
      { toStatus: "NEW", changedAt: new Date(2026, 4, 1) },
      { toStatus: "ENLISTED", changedAt: new Date(2026, 6, 10) }, // зарахований у липні
    ],
  });
  const rejectedInJune = makeCandidate("b", {
    createdAt: new Date(2026, 5, 2),
    changes: [
      { toStatus: "NEW", changedAt: new Date(2026, 5, 2) },
      { toStatus: "REJECTED_BY_US", changedAt: new Date(2026, 5, 20) },
    ],
  });
  const candidates = [enlistedInJuly, rejectedInJune];

  it("рахує за датою переходу у відповідний статус, а не за датою додавання", () => {
    expect(reachedStatusInMonth(candidates, "ENLISTED", "2026-07").length).toBe(1);
    expect(reachedStatusInMonth(candidates, "ENLISTED", "2026-05").length).toBe(0);
    expect(reachedStatusInMonth(candidates, "REJECTED_BY_US", "2026-06").length).toBe(1);
  });
});

describe("activeAtEndOfMonth (перехід між місяцями)", () => {
  // Ключовий сценарій користувача: додали в червні, ще проходить ВЛК,
  // зараховано аж у липні.
  const carryOver = makeCandidate("carry", {
    createdAt: new Date(2026, 5, 15),
    changes: [
      { toStatus: "NEW", changedAt: new Date(2026, 5, 15) },
      { toStatus: "MEDICAL_COMMISSION", changedAt: new Date(2026, 5, 25) },
      { toStatus: "ENLISTED", changedAt: new Date(2026, 6, 8) },
    ],
  });

  it("у червні він ще в роботі (активний)", () => {
    const active = activeAtEndOfMonth([carryOver], "2026-06");
    expect(active.map((c) => c.id)).toEqual(["carry"]);
  });

  it("у липні він уже НЕ активний (зарахований)", () => {
    const active = activeAtEndOfMonth([carryOver], "2026-07");
    expect(active.length).toBe(0);
  });

  it("не активний до свого створення (у травні)", () => {
    const active = activeAtEndOfMonth([carryOver], "2026-05");
    expect(active.length).toBe(0);
  });
});

describe("countBy", () => {
  const candidates = [
    makeCandidate("a", {
      createdAt: new Date(2026, 5, 1),
      recruitmentType: "MOBILIZATION",
      changes: [{ toStatus: "NEW", changedAt: new Date(2026, 5, 1) }],
    }),
    makeCandidate("b", {
      createdAt: new Date(2026, 5, 1),
      recruitmentType: "CONTRACT",
      changes: [{ toStatus: "NEW", changedAt: new Date(2026, 5, 1) }],
    }),
    makeCandidate("c", {
      createdAt: new Date(2026, 5, 1),
      recruitmentType: "MOBILIZATION",
      changes: [{ toStatus: "NEW", changedAt: new Date(2026, 5, 1) }],
    }),
  ];

  it("групує за довільним ключем", () => {
    const byType = countBy(candidates, (c) => c.recruitmentType);
    expect(byType).toEqual({ MOBILIZATION: 2, CONTRACT: 1 });
  });
});

describe("filterCandidates", () => {
  const candidates = [
    makeCandidate("a", {
      createdAt: new Date(2026, 5, 1),
      recruitmentType: "MOBILIZATION",
      channel: "DIRECT",
      responsibleUserId: "u1",
      changes: [{ toStatus: "NEW", changedAt: new Date(2026, 5, 1) }],
    }),
    makeCandidate("b", {
      createdAt: new Date(2026, 5, 1),
      recruitmentType: "CONTRACT",
      channel: "RECRUITING_CENTER",
      responsibleUserId: "u2",
      changes: [{ toStatus: "NEW", changedAt: new Date(2026, 5, 1) }],
    }),
  ];

  it("фільтрує за типом, каналом і відповідальним", () => {
    expect(filterCandidates(candidates, { recruitmentType: "CONTRACT" }).map((c) => c.id)).toEqual(["b"]);
    expect(filterCandidates(candidates, { channel: "DIRECT" }).map((c) => c.id)).toEqual(["a"]);
    expect(filterCandidates(candidates, { responsibleUserId: "u2" }).map((c) => c.id)).toEqual(["b"]);
    expect(filterCandidates(candidates, {}).length).toBe(2);
  });
});

describe("monthlyTrend", () => {
  const candidates = [
    makeCandidate("a", {
      createdAt: new Date(2026, 5, 1),
      changes: [
        { toStatus: "NEW", changedAt: new Date(2026, 5, 1) },
        { toStatus: "ENLISTED", changedAt: new Date(2026, 6, 1) },
      ],
    }),
    makeCandidate("b", {
      createdAt: new Date(2026, 6, 2),
      changes: [
        { toStatus: "NEW", changedAt: new Date(2026, 6, 2) },
        { toStatus: "REJECTED_BY_US", changedAt: new Date(2026, 6, 20) },
      ],
    }),
  ];

  it("будує ряд по місяцях: додані/зараховані/відмовлені", () => {
    const trend = monthlyTrend(candidates, ["2026-06", "2026-07"]);
    expect(trend).toEqual([
      { month: "2026-06", added: 1, enlisted: 0, rejected: 0, selfWithdrew: 0 },
      { month: "2026-07", added: 1, enlisted: 1, rejected: 1, selfWithdrew: 0 },
    ]);
  });
});
