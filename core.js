/* LifeOS domain layer. No DOM, no interval-based time counting. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object") module.exports = api;
  else root.LifeCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const VERSION = 4,
    ACCOUNT_KEY = "lifeos_v11_accounts",
    SESSION_KEY = "lifeos_v11_session";
  const defaults = {
    theme: "system",
    weekStart: 1,
    timeFormat: "24",
    dailyHours: 6,
    weeklyHours: 35,
    focusMinutes: 25,
    shortBreak: 5,
    longBreak: 20,
    cycles: 4,
    autoBreak: false,
    autoFocus: false,
    sound: false,
    notifications: true,
    currency: "MAD",
  };
  const categories = [
    "Deep Work",
    "Management",
    "Meetings",
    "Learning",
    "Reading",
    "Admin",
    "Personal",
    "Health",
  ];
  const id = () =>
    globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const day = (value = Date.now()) => {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const midnight = (value) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return +d;
  };
  const week = (value = Date.now(), start = 1) => {
    const d = new Date(midnight(value));
    d.setDate(d.getDate() - ((d.getDay() - start + 7) % 7));
    return +d;
  };
  const num = (v, min = 0, max = Infinity) =>
    Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : min;
  function dailyReport(d, now = Date.now()) {
    const from = midnight(now),
      end = new Date(from);
    end.setDate(end.getDate() + 1);
    const sessions = reportSessions(d, now);
    const group = (items, key) =>
      items
        .map((item) => ({
          id: item.id,
          title: item.name || item.title,
          duration: duration(sessions, from, +end, (s) => s[key] === item.id),
        }))
        .filter((x) => x.duration > 0);
    return {
      total: duration(sessions, from, +end),
      goals: group(d.goals, "goalId"),
      tasks: group(d.tasks, "taskId"),
    };
  }
  function allocateBudget(cents, budget) {
    if (!Number.isSafeInteger(cents) || cents < 0 || !Array.isArray(budget))
      throw Error("invalidBudget");
    const names = new Set();
    let total = 0;
    const rows = budget.map((b) => {
      const name = String(b.name || "").trim(),
        percent = Number(b.percent),
        units = Math.round(percent * 100);
      if (
        !name ||
        names.has(name) ||
        !Number.isFinite(percent) ||
        percent < 0 ||
        percent > 100 ||
        Math.abs(percent * 100 - units) > 1e-6
      )
        throw Error("invalidBudget");
      names.add(name);
      total += units;
      const exact = (cents * units) / 10000;
      return {
        name,
        percent,
        cents: Math.floor(exact),
        fraction: exact - Math.floor(exact),
      };
    });
    if (total > 10000) throw Error("invalidBudget");
    let remainder =
      Math.round((cents * total) / 10000) -
      rows.reduce((n, b) => n + b.cents, 0);
    for (const b of [...rows].sort((a, b) => b.fraction - a.fraction)) {
      if (remainder-- <= 0) break;
      b.cents++;
    }
    return rows.map(({ name, percent, cents }) => ({ name, percent, cents }));
  }
  function migrate(source) {
    const d = clone(source);
    if (!d || !d.profile || !Array.isArray(d.goals) || !Array.isArray(d.tasks))
      throw Error("invalidData");
    for (const key of [
      "projects",
      "sessions",
      "notes",
      "events",
      "habits",
      "inbox",
      "finances",
      "health",
      "learning",
      "notifications",
    ])
      if (!Array.isArray(d[key])) d[key] = [];
    d.settings = { ...defaults, ...d.settings };
    for (const [k, min, max] of [
      ["focusMinutes", 1, 240],
      ["shortBreak", 1, 60],
      ["longBreak", 1, 120],
      ["cycles", 1, 12],
      ["dailyHours", 0.5, 24],
      ["weeklyHours", 1, 168],
    ])
      d.settings[k] = num(d.settings[k], min, max);
    d.settings.cycles = Math.floor(d.settings.cycles);
    d.settings.weekStart = [0, 1, 6].includes(Number(d.settings.weekStart))
      ? Number(d.settings.weekStart)
      : 1;
    if (!["dark", "light", "system"].includes(d.settings.theme))
      d.settings.theme = "system";
    d.categories = Array.isArray(d.categories)
      ? d.categories.filter((c) => typeof c === "string")
      : categories.slice();
    d.planning = d.planning || {};
    d.dismissed = d.dismissed || {};
    d.activeSession = d.activeSession || null;
    d.goals.forEach((g) => {
      g.plan = g.plan || {};
      g.history = Array.isArray(g.history) ? g.history : [];
      g.progress = num(g.progress, 0, 100);
      g.momentum = num(g.momentum, 0, 100);
      g.color = g.color || "#789b8b";
    });
    d.tasks.forEach((t) => {
      t.status = t.status || (t.done ? "done" : "todo");
      t.priority = t.priority || "medium";
      t.subtasks = t.subtasks || [];
    });
    d.habits.forEach((h) => {
      h.checks = Array.isArray(h.checks) ? h.checks : [];
      h.goalId = typeof h.goalId === "string" ? h.goalId : "";
      h.impact = num(h.impact, 0, 50);
      h.frequency = typeof h.frequency === "string" ? h.frequency : "daily";
    });
    d.schemaVersion = VERSION;
    return d;
  }
  function validateImport(input) {
    const d = migrate(input.data || input);
    const collections = [
      "goals",
      "tasks",
      "projects",
      "notes",
      "events",
      "habits",
      "inbox",
      "finances",
      "health",
      "learning",
      "sessions",
      "notifications",
    ];
    for (const key of collections) {
      const seen = new Set();
      for (const item of d[key]) {
        if (
          !item ||
          typeof item !== "object" ||
          typeof item.id !== "string" ||
          !/^[\w-]{1,160}$/.test(item.id) ||
          seen.has(item.id)
        )
          throw Error("invalidData");
        seen.add(item.id);
        for (const field of [
          "title",
          "name",
          "body",
          "notes",
          "description",
          "category",
          "categoryId",
          "projectId",
          "taskId",
          "goalId",
          "date",
          "deadline",
          "time",
          "startTime",
          "endTime",
        ])
          if (item[field] !== undefined && typeof item[field] !== "string")
            throw Error("invalidData");
        for (const field of ["date", "deadline"])
          if (
            item[field] &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(item[field]) ||
              !Number.isFinite(+new Date(item[field] + "T12:00:00")))
          )
            throw Error("invalidData");
        if (
          item.attachments !== undefined &&
          (!Array.isArray(item.attachments) ||
            item.attachments.some(
              (f) =>
                !f ||
                typeof f.name !== "string" ||
                typeof f.data !== "string" ||
                !f.data.startsWith("data:"),
            ))
        )
          throw Error("invalidData");
      }
    }
    if (!["ar", "en"].includes(d.profile.lang)) d.profile.lang = "en";
    for (const g of d.goals) {
      if (
        typeof g.name !== "string" ||
        (g.color && !/^#[\da-f]{6}$/i.test(g.color)) ||
        typeof (g.category || "") !== "string" ||
        g.history.some(
          (h) =>
            !h ||
            !/^\d{4}-\d{2}-\d{2}$/.test(h.date) ||
            !Number.isFinite(h.value) ||
            h.value < 0 ||
            h.value > 100,
        )
      )
        throw Error("invalidData");
    }
    for (const t of d.tasks) {
      if (
        typeof t.title !== "string" ||
        !Array.isArray(t.subtasks) ||
        t.subtasks.some((s) => !s || typeof s.title !== "string")
      )
        throw Error("invalidData");
      t.impact = num(t.impact, 0, 100);
      t.progressImpact = num(t.progressImpact, 0, 100);
    }
    for (const s of d.sessions) {
      if (
        !Array.isArray(s.segments) ||
        s.segments.some(
          (x) =>
            !Number.isFinite(x.start) ||
            !Number.isFinite(x.end) ||
            x.end < x.start,
        )
      )
        throw Error("invalidData");
    }
    // Import the clock at export time in a paused state, never count offline time since export.
    if (d.activeSession) {
      const a = d.activeSession;
      if (
        !Array.isArray(a.segments) ||
        !a.settings ||
        !["focus", "break"].includes(a.phase) ||
        !Number.isFinite(a.updatedAt) ||
        !Number.isFinite(a.phaseDuration) ||
        a.phaseDuration < 0 ||
        !Number.isFinite(a.phaseAccumulated) ||
        a.phaseAccumulated < 0 ||
        (a.segmentStartedAt !== null && !Number.isFinite(a.segmentStartedAt)) ||
        a.segments.some(
          (s) =>
            !Number.isFinite(s.start) ||
            !Number.isFinite(s.end) ||
            s.end < s.start,
        )
      )
        throw Error("invalidData");
      for (const [k, min, max] of [
        ["focusMinutes", 1, 240],
        ["shortBreak", 1, 60],
        ["longBreak", 1, 120],
        ["cycles", 1, 12],
      ])
        a.settings[k] = num(a.settings[k], min, max);
      const at = Number.isFinite(input.exportedAt)
        ? input.exportedAt
        : a.updatedAt;
      reconcile(a, at);
      a.phaseAccumulated = phaseElapsed(a, at);
      closeSegment(a, at);
      a.status = a.status === "completed" ? "completed" : "paused";
      a.pauseStartedAt = at;
    }
    return d;
  }
  // ── Auto-prune: keeps localStorage lean forever ────────────────────────────
  // Runs silently on every save. Removes old data the user will never need again
  // while keeping everything that matters.
  function prune(d) {
    const now = Date.now();
    const msPerDay = 86400000;
    // Cutoff dates (ms timestamps for comparison)
    const taskCutoff    = now - 90  * msPerDay; // completed tasks  → keep 90 days
    const sessionCutoff = now - 60  * msPerDay; // focus sessions   → keep 60 days
    const notifCutoff   = now - 30  * msPerDay; // notifications    → keep 30 days
    const habitCutoff   = day(now - 365 * msPerDay); // habit checks → keep 365 days
    const HISTORY_LIMIT = 180; // goal history points

    // 1. Completed tasks older than 90 days
    if (Array.isArray(d.tasks)) {
      d.tasks = d.tasks.filter(t => {
        if (!t.done && t.status !== "done") return true; // keep all pending tasks
        const completed = t.completedDate
          ? new Date(t.completedDate + "T12:00:00").getTime()
          : (t.updatedAt || 0);
        return completed >= taskCutoff;
      });
    }

    // 2. Focus sessions older than 60 days
    if (Array.isArray(d.sessions)) {
      d.sessions = d.sessions.filter(s => {
        const ts = s.endedAt || s.startedAt || 0;
        return ts >= sessionCutoff;
      });
    }

    // 3. Notifications older than 30 days
    if (Array.isArray(d.notifications)) {
      d.notifications = d.notifications.filter(n => (n.ts || 0) >= notifCutoff);
      // Also clean up dismissed keys for notifications that no longer exist
      if (d.dismissed) {
        const remaining = new Set(d.notifications.map(n => n.id));
        for (const k of Object.keys(d.dismissed)) {
          if (!remaining.has(k)) delete d.dismissed[k];
        }
      }
    }

    // 4. Trim goal history to last HISTORY_LIMIT points (keep most recent)
    if (Array.isArray(d.goals)) {
      d.goals.forEach(g => {
        if (Array.isArray(g.history) && g.history.length > HISTORY_LIMIT) {
          g.history = g.history.slice(-HISTORY_LIMIT);
        }
      });
    }

    // 5. Trim old habit check dates (keep last 365 days)
    if (Array.isArray(d.habits)) {
      d.habits.forEach(h => {
        if (Array.isArray(h.checks) && h.checks.length > 0) {
          h.checks = h.checks.filter(dateStr => dateStr >= habitCutoff);
        }
      });
    }

    return d;
  }

  function store(storage) {
    let lastRaw, lastEmail, cached;
    function read() {
      const email = storage.getItem(SESSION_KEY),
        raw = storage.getItem(ACCOUNT_KEY) || "{}";
      if (raw === lastRaw && email === lastEmail) return cached;
      const all = JSON.parse(raw);
      cached = all[email]?.data ? migrate(all[email].data) : null;
      lastRaw = raw;
      lastEmail = email;
      return cached;
    }
    function update(fn) {
      const email = storage.getItem(SESSION_KEY),
        all = JSON.parse(storage.getItem(ACCOUNT_KEY) || "{}");
      if (!all[email]) throw Error("signedOut");
      const d = migrate(all[email].data);
      const result = fn(d);
      prune(d); // ← silently clean old data on every save
      all[email].data = d;
      storage.setItem(ACCOUNT_KEY, JSON.stringify(all));
      return { data: d, result };
    }
    return { read, update };
  }
  function openSegment(a, now) {
    a.segmentStartedAt = now;
    a.phaseStartedAt = now;
    a.updatedAt = now;
  }
  function closeSegment(a, now) {
    if (a.segmentStartedAt !== null) {
      a.segments.push({
        start: a.segmentStartedAt,
        end: Math.max(a.segmentStartedAt, now),
        kind: a.phase,
      });
      a.segmentStartedAt = null;
    }
    a.updatedAt = now;
  }
  function phaseElapsed(a, now) {
    return (
      a.phaseAccumulated +
      (a.segmentStartedAt === null ? 0 : Math.max(0, now - a.segmentStartedAt))
    );
  }
  function elapsed(a, now = Date.now()) {
    return (
      a.segments
        .filter((s) => s.kind === "focus")
        .reduce((n, s) => n + s.end - s.start, 0) +
      (a.phase === "focus" && a.segmentStartedAt !== null
        ? Math.max(0, now - a.segmentStartedAt)
        : 0)
    );
  }
  function createSession(d, config, now = Date.now()) {
    if (d.activeSession) throw Error("activeSession");
    const mode = ["stopwatch", "countdown", "pomodoro"].includes(config.type)
      ? config.type
      : "stopwatch";
    const target =
      mode === "pomodoro"
        ? num(d.settings.focusMinutes, 1, 240) * 60000
        : num(config.targetMinutes, 0, 1440) * 60000;
    if (mode === "countdown" && !target) throw Error("durationRequired");
    const task = d.tasks.find((t) => t.id === config.taskId);
    const goal = d.goals.find((g) => g.id === (task?.goalId || config.goalId));
    const a = {
      id: id(),
      userId: d.profile.email,
      projectId: task?.projectId || goal?.projectId || config.projectId || "",
      goalId: goal?.id || "",
      taskId: task?.id || "",
      categoryId: config.categoryId || "Deep Work",
      title: task?.title || config.title || "",
      type: mode,
      status: "running",
      phase: "focus",
      startedAt: now,
      endedAt: null,
      segmentStartedAt: now,
      phaseStartedAt: now,
      phaseAccumulated: 0,
      phaseDuration: target,
      targetDuration: target,
      totalDuration: 0,
      pausedDuration: 0,
      pauseStartedAt: null,
      segments: [],
      notes: "",
      distractions: [],
      cyclesCompleted: 0,
      settings: clone(d.settings),
      createdAt: now,
      updatedAt: now,
      transition: 0,
    };
    d.activeSession = a;
    return a;
  }
  function nextPhase(a, phase, now, auto) {
    a.phase = phase;
    a.phaseAccumulated = 0;
    a.phaseDuration =
      phase === "focus"
        ? a.settings.focusMinutes * 60000
        : (a.cyclesCompleted % a.settings.cycles === 0
            ? a.settings.longBreak
            : a.settings.shortBreak) * 60000;
    if (phase === "focus") {
      a.pendingTarget = !auto;
      if (auto) a.targetDuration += a.phaseDuration;
    }
    a.status = auto ? (phase === "break" ? "break" : "running") : "paused";
    a.pauseStartedAt = auto ? null : now;
    a.segmentStartedAt = null;
    if (auto) openSegment(a, now);
  }
  function reconcile(a, now = Date.now()) {
    if (!a || a.segmentStartedAt === null || !a.phaseDuration) return false;
    let changed = false,
      guard = 0;
    while (
      a.segmentStartedAt !== null &&
      a.phaseDuration &&
      phaseElapsed(a, now) >= a.phaseDuration &&
      guard++ < 2000
    ) {
      const boundary =
        a.segmentStartedAt + Math.max(0, a.phaseDuration - a.phaseAccumulated);
      closeSegment(a, boundary);
      a.phaseAccumulated = a.phaseDuration;
      a.transition++;
      changed = true;
      if (a.phase === "focus") {
        a.cyclesCompleted++;
        if (a.type === "pomodoro")
          nextPhase(a, "break", boundary, a.settings.autoBreak);
        else {
          a.status = "completed";
          a.pauseStartedAt = boundary;
        }
      } else if (a.type === "pomodoro")
        nextPhase(a, "focus", boundary, a.settings.autoFocus);
      else {
        a.phase = "focus";
        a.phaseAccumulated = 0;
        a.phaseDuration = 0;
        a.status = "paused";
        a.pauseStartedAt = boundary;
      }
    }
    return changed;
  }
  function transition(d, action, now = Date.now(), value) {
    const a = d.activeSession;
    if (!a) throw Error("noSession");
    reconcile(a, now);
    if (action === "pause" && a.segmentStartedAt !== null) {
      a.phaseAccumulated = phaseElapsed(a, now);
      closeSegment(a, now);
      a.status = "paused";
      a.pauseStartedAt = now;
    }
    if (
      action === "resume" &&
      a.segmentStartedAt === null &&
      a.status !== "completed"
    ) {
      a.pausedDuration += Math.max(0, now - (a.pauseStartedAt || now));
      a.pauseStartedAt = null;
      if (a.pendingTarget) {
        a.targetDuration += a.phaseDuration;
        a.pendingTarget = false;
      }
      a.status = a.phase === "break" ? "break" : "running";
      openSegment(a, now);
    }
    if (action === "extend" || action === "continue") {
      if (a.phase !== "focus") throw Error("invalidTransition");
      a.phaseDuration =
        action === "continue"
          ? 0
          : a.phaseDuration + num(value, 1, 1440) * 60000;
      if (action === "extend") a.targetDuration += num(value, 1, 1440) * 60000;
      if (a.status === "completed") {
        a.status = "running";
        a.pauseStartedAt = null;
        openSegment(a, now);
      }
    }
    if (action === "break") {
      if (a.segmentStartedAt !== null) closeSegment(a, now);
      nextPhase(a, "break", now, true);
    }
    if (action === "finish" || action === "cancel") {
      if (a.pauseStartedAt !== null) {
        a.pausedDuration += Math.max(0, now - a.pauseStartedAt);
        a.pauseStartedAt = null;
      }
      closeSegment(a, now);
      a.endedAt = now;
      a.totalDuration = elapsed(a, now);
      a.status = action === "finish" ? "completed" : "cancelled";
      a.updatedAt = now;
      if (action === "finish") d.sessions.unshift(clone(a));
      d.activeSession = null;
    }
    return a;
  }
  function manual(d, entry) {
    const start = +new Date(entry.start),
      end = +new Date(entry.end);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      end - start > 86400000 ||
      end > Date.now() + 60000
    )
      throw Error("invalidTime");
    if (
      d.sessions.some((s) =>
        s.segments.some(
          (x) => x.kind === "focus" && start < x.end && end > x.start,
        ),
      ) ||
      (d.activeSession && start < Date.now() && end > d.activeSession.startedAt)
    )
      throw Error("overlap");
    const s = {
      ...entry,
      id: id(),
      type: "manual",
      status: "completed",
      startedAt: start,
      endedAt: end,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalDuration: end - start,
      targetDuration: 0,
      segments: [{ start, end, kind: "focus" }],
      distractions: [],
    };
    d.sessions.unshift(s);
    return s;
  }
  function duration(sessions, from = 0, to = Infinity, filter = () => true) {
    return sessions
      .filter((s) => s.status !== "cancelled" && filter(s))
      .reduce(
        (n, s) =>
          n +
          s.segments
            .filter((x) => x.kind === "focus")
            .reduce(
              (m, x) =>
                m + Math.max(0, Math.min(to, x.end) - Math.max(from, x.start)),
              0,
            ),
        0,
      );
  }
  function reportSessions(d, now = Date.now()) {
    const list = d.sessions.slice();
    if (d.activeSession) {
      const a = clone(d.activeSession);
      reconcile(a, now);
      if (a.segmentStartedAt !== null) closeSegment(a, now);
      list.push(a);
    }
    return list;
  }
  function completeTask(d, taskId, done) {
    const t = d.tasks.find((t) => t.id === taskId);
    if (!t) return;
    const next = done ?? !t.done;
    if (next === !!t.done) return;
    t.done = next;
    t.status = next ? "done" : "todo";
    t.completedDate = next ? day() : "";
    const g = d.goals.find((g) => g.id === t.goalId);
    if (g) {
      if (next) {
        t.appliedMomentum = Math.min(100 - g.momentum, Number(t.impact || 0));
        t.appliedProgress = Math.min(
          100 - g.progress,
          Number(t.progressImpact || 0),
        );
        g.momentum += t.appliedMomentum;
        g.progress += t.appliedProgress;
      } else {
        g.momentum = Math.max(
          0,
          g.momentum - (t.appliedMomentum ?? t.impact ?? 0),
        );
        g.progress = Math.max(
          0,
          g.progress - (t.appliedProgress ?? t.progressImpact ?? 0),
        );
      }
      let h = g.history.find((h) => h.date === day());
      if (h) h.value = g.momentum;
      else g.history.push({ date: day(), value: g.momentum });
    }
    if (
      next &&
      t.recurring &&
      t.recurring !== "none" &&
      !d.tasks.some((x) => x.recurringFrom === t.id)
    ) {
      const date = new Date((t.date || day()) + "T12:00:00");
      if (t.recurring === "monthly") {
        const wanted = date.getDate();
        date.setDate(1);
        date.setMonth(date.getMonth() + 1);
        date.setDate(
          Math.min(
            wanted,
            new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
          ),
        );
      } else date.setDate(date.getDate() + (t.recurring === "weekly" ? 7 : 1));
      d.tasks.push({
        ...t,
        id: id(),
        done: false,
        status: "todo",
        date: day(+date),
        completedDate: "",
        recurringFrom: t.id,
        appliedMomentum: 0,
        appliedProgress: 0,
        subtasks: t.subtasks.map((s) => ({ ...s, done: false })),
      });
    }
  }

  function habitStreak(checks = [], todayStr = day()) {
    const set = new Set((checks || []).filter(Boolean));
    let current = 0,
      cursor = new Date(todayStr + "T12:00:00");
    if (!set.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
    while (set.has(day(+cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
    const sorted = [...set].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    let best = 0,
      temp = 0,
      prev = null;
    for (const dStr of sorted) {
      const curDate = new Date(dStr + "T12:00:00");
      if (prev) {
        const diff = Math.round((curDate - prev) / 86400000);
        if (diff === 1) temp++;
        else if (diff > 1) temp = 1;
      } else temp = 1;
      if (temp > best) best = temp;
      prev = curDate;
    }
    if (current > best) best = current;
    return { current, best };
  }

  function toggleHabit(d, id, targetDate = day()) {
    const h = d.habits.find((x) => x.id === id);
    if (!h) return;
    h.checks = Array.isArray(h.checks) ? h.checks : [];
    const wasChecked = h.checks.includes(targetDate);
    if (wasChecked) h.checks = h.checks.filter((x) => x !== targetDate);
    else h.checks.push(targetDate);
    if (h.goalId) {
      const g = d.goals.find((g) => g.id === h.goalId);
      if (g && !g.archived) {
        const impact = num(h.impact, 0, 50) || 5;
        if (!wasChecked) {
          const added = Math.min(100 - g.momentum, impact);
          g.momentum += added;
          h.appliedMomentum = added;
        } else {
          g.momentum = Math.max(0, g.momentum - (h.appliedMomentum || impact));
        }
        let hist = g.history.find((x) => x.date === targetDate);
        if (hist) hist.value = g.momentum;
        else g.history.push({ date: targetDate, value: g.momentum });
      }
    }
    return h;
  }

  return {
    completeTask,
    habitStreak,
    toggleHabit,
    VERSION,
    ACCOUNT_KEY,
    SESSION_KEY,
    defaults,
    categories,
    allocateBudget,
    dailyReport,
    id,
    day,
    midnight,
    week,
    num,
    migrate,
    validateImport,
    store,
    createSession,
    transition,
    reconcile,
    elapsed,
    phaseElapsed,
    manual,
    duration,
    reportSessions,
  };
});
