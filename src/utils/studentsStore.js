export const STUDENTS_STORAGE_KEY = "mateResetStudents.v1";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "st") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function ensureNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function createDefaultAvatar(name = "Elev") {
  const first = ensureText(name).trim().toUpperCase().slice(0, 1) || "E";
  return {
    emoji: "🧠",
    frame: "circle",
    palette: {
      primary: "#4f46e5",
      secondary: "#06b6d4",
      accent: "#22c55e",
    },
    accessories: ["starter"],
    tagline: `${first} invata cu incredere.`,
  };
}

function normalizeAvatar(input, fallbackName = "Elev") {
  const base = createDefaultAvatar(fallbackName);
  const safe = input && typeof input === "object" ? input : {};
  const palette = safe.palette && typeof safe.palette === "object" ? safe.palette : {};
  return {
    emoji: ensureText(safe.emoji, base.emoji) || base.emoji,
    frame: ["circle", "hex", "star", "shield"].includes(ensureText(safe.frame))
      ? safe.frame
      : base.frame,
    palette: {
      primary: ensureText(palette.primary, base.palette.primary),
      secondary: ensureText(palette.secondary, base.palette.secondary),
      accent: ensureText(palette.accent, base.palette.accent),
    },
    accessories: ensureArray(safe.accessories).map(String).slice(0, 8),
    tagline: ensureText(safe.tagline, base.tagline),
  };
}

function normalizeStudent(input) {
  const safe = input && typeof input === "object" ? input : {};
  const name = ensureText(safe.name, "Elev").trim() || "Elev";
  return {
    id: ensureText(safe.id, makeId()),
    name,
    grade: ensureText(safe.grade, "V"),
    createdISO: ensureText(safe.createdISO, nowIso()),
    avatar: normalizeAvatar(safe.avatar, name),
    rewards: {
      coins: Math.max(0, Math.round(ensureNumber(safe.rewards?.coins, 0))),
      stars: Math.max(0, Math.round(ensureNumber(safe.rewards?.stars, 0))),
      badges: ensureArray(safe.rewards?.badges).map(String).slice(0, 30),
      lastUpdatedISO: ensureText(safe.rewards?.lastUpdatedISO, nowIso()),
    },
    battle: {
      wins: Math.max(0, Math.round(ensureNumber(safe.battle?.wins, 0))),
      losses: Math.max(0, Math.round(ensureNumber(safe.battle?.losses, 0))),
      draws: Math.max(0, Math.round(ensureNumber(safe.battle?.draws, 0))),
      rating: Math.max(0, Math.round(ensureNumber(safe.battle?.rating, 1000))),
    },
  };
}

function normalizeState(input) {
  const safe = input && typeof input === "object" ? input : {};
  return {
    students: ensureArray(safe.students).map(normalizeStudent),
    rewardsLog: ensureArray(safe.rewardsLog),
    battles: ensureArray(safe.battles),
  };
}

export function loadStudentsState() {
  if (typeof window === "undefined") return normalizeState({});
  try {
    const raw = window.localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (!raw) return normalizeState({});
    return normalizeState(JSON.parse(raw));
  } catch {
    return normalizeState({});
  }
}

export function saveStudentsState(state) {
  const safe = normalizeState(state);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(safe));
  }
  return safe;
}

export function addStudent(payload) {
  const state = loadStudentsState();
  const student = normalizeStudent({
    id: makeId(),
    name: payload?.name ?? "Elev",
    grade: payload?.grade ?? "V",
    avatar: payload?.avatar ?? createDefaultAvatar(payload?.name ?? "Elev"),
  });
  state.students.push(student);
  return saveStudentsState(state);
}

export function removeStudent(studentId) {
  const state = loadStudentsState();
  state.students = state.students.filter((student) => student.id !== studentId);
  return saveStudentsState(state);
}

export function updateStudent(studentId, patch) {
  const state = loadStudentsState();
  state.students = state.students.map((student) => {
    if (student.id !== studentId) return student;
    return normalizeStudent({
      ...student,
      ...patch,
      rewards: { ...student.rewards, ...(patch?.rewards ?? {}) },
      battle: { ...student.battle, ...(patch?.battle ?? {}) },
      avatar: { ...student.avatar, ...(patch?.avatar ?? {}) },
    });
  });
  return saveStudentsState(state);
}

export function updateStudentAvatar(studentId, avatar) {
  return updateStudent(studentId, { avatar });
}

export function grantStudentReward(studentId, payload) {
  const state = loadStudentsState();
  const safeCoins = Math.max(0, Math.round(ensureNumber(payload?.coins, 0)));
  const safeStars = Math.max(0, Math.round(ensureNumber(payload?.stars, 0)));
  const badge = ensureText(payload?.badge, "").trim();
  const reason = ensureText(payload?.reason, "Recompensa acordata");

  state.students = state.students.map((student) => {
    if (student.id !== studentId) return student;
    const nextBadges = badge
      ? [...student.rewards.badges, badge].slice(-30)
      : student.rewards.badges;
    return {
      ...student,
      rewards: {
        ...student.rewards,
        coins: student.rewards.coins + safeCoins,
        stars: student.rewards.stars + safeStars,
        badges: nextBadges,
        lastUpdatedISO: nowIso(),
      },
    };
  });

  state.rewardsLog.unshift({
    id: makeId("reward"),
    dateISO: nowIso(),
    studentId,
    coins: safeCoins,
    stars: safeStars,
    badge: badge || null,
    reason,
    kind: "grant",
  });
  state.rewardsLog = state.rewardsLog.slice(0, 200);
  return saveStudentsState(state);
}

export function removeStudentReward(studentId, payload) {
  const state = loadStudentsState();
  const safeCoins = Math.max(0, Math.round(ensureNumber(payload?.coins, 0)));
  const safeStars = Math.max(0, Math.round(ensureNumber(payload?.stars, 0)));
  const badge = ensureText(payload?.badge, "").trim();
  const reason = ensureText(payload?.reason, "Recompensa retrasa");

  state.students = state.students.map((student) => {
    if (student.id !== studentId) return student;
    const nextBadges = badge
      ? student.rewards.badges.filter((item, index) => {
          if (item !== badge) return true;
          const firstMatch = student.rewards.badges.indexOf(badge);
          return index !== firstMatch;
        })
      : student.rewards.badges;
    return {
      ...student,
      rewards: {
        ...student.rewards,
        coins: Math.max(0, student.rewards.coins - safeCoins),
        stars: Math.max(0, student.rewards.stars - safeStars),
        badges: nextBadges,
        lastUpdatedISO: nowIso(),
      },
    };
  });

  state.rewardsLog.unshift({
    id: makeId("reward"),
    dateISO: nowIso(),
    studentId,
    coins: safeCoins,
    stars: safeStars,
    badge: badge || null,
    reason,
    kind: "remove",
  });
  state.rewardsLog = state.rewardsLog.slice(0, 200);
  return saveStudentsState(state);
}

function updateBattleStats(student, outcome) {
  const next = { ...student.battle };
  if (outcome === "win") {
    next.wins += 1;
    next.rating += 16;
  } else if (outcome === "loss") {
    next.losses += 1;
    next.rating = Math.max(0, next.rating - 12);
  } else {
    next.draws += 1;
    next.rating += 2;
  }
  return next;
}

export function recordStudentBattle(payload) {
  const state = loadStudentsState();
  const battle = {
    id: makeId("battle"),
    dateISO: nowIso(),
    studentAId: payload.studentAId,
    studentBId: payload.studentBId,
    winnerId: payload.winnerId ?? null,
    mode: ensureText(payload.mode, "rapid"),
    scoreA: Math.round(ensureNumber(payload.scoreA, 0)),
    scoreB: Math.round(ensureNumber(payload.scoreB, 0)),
    summary: ensureText(payload.summary, ""),
  };

  state.students = state.students.map((student) => {
    if (student.id !== battle.studentAId && student.id !== battle.studentBId) return student;
    if (!battle.winnerId) {
      return { ...student, battle: updateBattleStats(student, "draw") };
    }
    const outcome = student.id === battle.winnerId ? "win" : "loss";
    return { ...student, battle: updateBattleStats(student, outcome) };
  });

  state.battles.unshift(battle);
  state.battles = state.battles.slice(0, 200);
  return saveStudentsState(state);
}
