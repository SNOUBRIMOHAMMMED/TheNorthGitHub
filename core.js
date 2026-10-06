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
    d.inbox.forEach(i => {
      if (!i.title && typeof i.text === "string") i.title = i.text;
      if (!i.createdAt && Number.isFinite(i.ts)) i.createdAt = i.ts;
    });
    d.schemaVersion = VERSION;
    return d;
  }
  function validateImport(input) {
    const source = input?.data || input;
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw Error('invalidData');
    // Migration can fill missing legacy fields, but must never turn corrupt data into empty lists.
    for (const key of ['goals','tasks','projects','notes','events','habits','inbox','finances','health','learning','sessions','notifications']) {
      if (source[key] !== undefined && !Array.isArray(source[key])) throw Error('invalidData');
      if (source[key]?.some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw Error('invalidData');
    }
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
            !x || !Number.isFinite(x.start) ||
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
            !s || !Number.isFinite(s.start) ||
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
  // Historical work is user data; never remove it implicitly during a save.
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
    return list.map(s => {
      if (s.goalId || !s.taskId) return s;
      const task = d.tasks.find(t => t.id === s.taskId);
      return task?.goalId ? { ...s, goalId: task.goalId } : s;
    });
  }
  function completeTask(d, taskId, done) {
    const t = d.tasks.find((t) => t.id === taskId);
    if (!t || t.archived) return;
    const next = done ?? !t.done;
    if (next === !!t.done) return;
    t.done = next;
    t.status = next ? "done" : "todo";
    t.completedDate = next ? day() : "";
    const g = d.goals.find((g) => g.id === t.goalId);
    if (g) {
      if (next) {
        t.appliedMomentum = Math.min(100 - g.momentum, num(t.impact, 0, 100));
        t.appliedProgress = g.progressMode === "checklist" ? 0 : Math.min(
          100 - g.progress,
          num(t.progressImpact, 0, 100),
        );
        g.momentum += t.appliedMomentum;
        if (g.progressMode !== "checklist") g.progress += t.appliedProgress;
      } else {
        g.momentum = Math.max(
          0,
          g.momentum - (t.appliedMomentum ?? t.impact ?? 0),
        );
        if (g.progressMode !== "checklist") g.progress = Math.max(
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

  function habitDue(frequency, dateStr) {
    const weekday = new Date(dateStr + "T12:00:00").getDay();
    return frequency !== "weekdays" || (weekday !== 5 && weekday !== 6);
  }
  function habitPeriod(dateStr, frequency, weekStart = 1) {
    const dt = new Date(dateStr + "T12:00:00");
    if (frequency === "weekly") dt.setDate(dt.getDate() - (dt.getDay() - Number(weekStart) + 7) % 7);
    return day(+dt);
  }
  function habitStreak(checks = [], todayStr = day(), frequency = "daily", weekStart = 1) {
    const previous = key => {
      const dt = new Date(key + "T12:00:00");
      do { dt.setDate(dt.getDate() - (frequency === "weekly" ? 7 : 1)); }
      while (!habitDue(frequency, day(+dt)));
      return day(+dt);
    };
    const set = new Set(checks.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= todayStr && habitDue(frequency,k)).map(k => habitPeriod(k,frequency,weekStart)));
    let cursor = habitPeriod(todayStr, frequency, weekStart);
    if (!habitDue(frequency, cursor)) cursor = previous(cursor);
    let current = 0, inGrace = false, graceUsed = false;
    if (!set.has(cursor)) {
      cursor = previous(cursor);
      if (!set.has(cursor) && set.has(previous(cursor))) { inGrace = true; graceUsed = true; cursor = previous(cursor); }
    }
    while (set.has(cursor)) {
      current++;
      cursor = previous(cursor);
      if (!set.has(cursor) && !graceUsed && set.has(previous(cursor))) { graceUsed = true; cursor = previous(cursor); }
    }
    let best = 0, length = 0, used = false, prev;
    for (const key of [...set].sort()) {
      if (prev === previous(key)) length++;
      else if (prev === previous(previous(key)) && !used) { length++; used = true; }
      else { length = 1; used = false; }
      best = Math.max(best, length); prev = key;
    }
    return {current, best:Math.max(best,current), inGrace};
  }
  function habitWeek(h, todayStr = day(), weekStart = 1) {
    const start = habitPeriod(todayStr, "weekly", weekStart);
    const dates = Array.from({length:7}, (_,i) => {const dt = new Date(start+"T12:00:00");dt.setDate(dt.getDate()+i);return day(+dt);});
    const due = dates.filter(k => habitDue(h.frequency,k));
    const count = due.filter(k => (h.checks || []).includes(k)).length;
    return {dates, completed:h.frequency === "weekly" ? Math.min(1,count) : count, target:h.frequency === "weekly" ? 1 : due.length};
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
        const impact = num(h.impact ?? 5, 0, 50);
        if (!wasChecked) {
          const added = Math.min(100 - g.momentum, impact);
          g.momentum += added;
          h.appliedMomentumByDate = h.appliedMomentumByDate || {};
          h.appliedMomentumByDate[targetDate] = added;
          h.appliedMomentum = added;
        } else {
          g.momentum = Math.max(0, g.momentum - (h.appliedMomentumByDate?.[targetDate] ?? h.appliedMomentum ?? impact));
        }
        if (wasChecked && h.appliedMomentumByDate) delete h.appliedMomentumByDate[targetDate];
        let hist = g.history.find((x) => x.date === targetDate);
        if (hist) hist.value = g.momentum;
        else g.history.push({ date: targetDate, value: g.momentum });
      }
    }
    return h;
  }

  function recordDebtPayment(d, debtId, amount, {deductBalance = false, date = day(), title = ''} = {}) {
    const debt = d.settings?.debts?.find(x => x.id === debtId);
    if (!debt) throw Error('debtNotFound');
    const cents = value => Math.round(Number(value) * 100);
    const total = cents(debt.totalAmount), paid = cents(debt.paidAmount || 0), payment = cents(amount);
    if (![total,paid,payment].every(Number.isSafeInteger) || paid < 0 || payment <= 0 || payment > total - paid) throw Error('invalidPayment');
    debt.paidAmount = (paid + payment) / 100;
    debt.updatedAt = Date.now();
    if (deductBalance) d.finances.unshift({id:id(), debtId, title:title || debt.name, amount:payment / 100, type:'expense', category:'Debts / سداد ديون', date, createdAt:Date.now()});
    return debt;
  }

  const checklistPercent = (done, total) => total > 0
    ? Math.round(Math.max(0, Math.min(100, done / total * 100)) * 100) / 100 : 0;
  function checklistReport(goal, data, date = day()) {
    const plan = goal?.taskPlan;
    const steps = Array.isArray(plan?.steps) ? plan.steps : [];
    const tasks = new Map((data?.tasks || []).map(t => [t.id, t]));
    let completedMinutes = 0, totalMinutes = 0, dailyCompletedMinutes = 0,
      dailyTargetMinutes = 0, scheduledMinutes = 0;
    for (const step of steps) {
      const weight = Number(step.weightMinutes);
      if (!(weight > 0) || !Number.isFinite(weight)) continue;
      totalMinutes += weight;
      if (step.date <= date) scheduledMinutes += weight;
      if (step.date === date) dailyTargetMinutes += weight;
      const task = tasks.get(step.id);
      // The manifest fixes membership and weights; archiving never erases completed work.
      if (task?.done && task.goalId === goal.id && task.planId === plan.id) {
        completedMinutes += weight;
        if (step.date === date) dailyCompletedMinutes += weight;
      }
    }
    const baseline = num(plan?.baselineProgress, 0, 100);
    const target = Number(plan?.targetMinutes);
    const percentWithBaseline = value => Math.round(num(baseline +
      (target > 0 && Number.isFinite(target) ? value / target * 100 : 0), 0, 100) * 100) / 100;
    return {
      dailyPercent: checklistPercent(dailyCompletedMinutes, dailyTargetMinutes),
      phasePercent: checklistPercent(completedMinutes, totalMinutes),
      completedMinutes, totalMinutes, dailyCompletedMinutes, dailyTargetMinutes,
      goalPercent: percentWithBaseline(completedMinutes),
      plannedPercent: percentWithBaseline(scheduledMinutes),
    };
  }

  function applyChecklistPlan(data, input) {
    const fail = () => { throw Error("invalidChecklistPlan"); };
    const object = value => value && typeof value === "object" && !Array.isArray(value);
    const only = (value, keys) => object(value) && Object.keys(value).every(k => keys.includes(k));
    const validId = value => typeof value === "string" && /^[\w-]{1,160}$/.test(value)
      && !["__proto__", "prototype", "constructor"].includes(value);
    const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value + "T00:00:00Z"))
      && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
    const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
    const positive = value => typeof value === "number" && Number.isFinite(value) && value > 0;
    const close = (a, b) => Math.abs(a - b) < 1e-6;
    if (!object(data) || !Array.isArray(data.goals) || !Array.isArray(data.tasks)
      || !only(input, ["type", "schemaVersion", "goalId", "goalName", "plan", "tasks"])
      || input.type !== "north-checklist-plan" || input.schemaVersion !== 1 || !validId(input.goalId)) fail();
    const matches = data.goals.filter(g => g.id === input.goalId && !g.archived);
    if (matches.length !== 1) fail();
    const goal = matches[0], plan = input.plan;
    if (!only(plan, ["id", "name", "startDate", "endDate", "phaseEndDate", "targetMinutes", "baselineProgress", "steps"])
      || !validId(plan.id) || !text(plan.name, 180)
      || ![plan.startDate, plan.endDate, plan.phaseEndDate].every(validDate)
      || plan.startDate > plan.phaseEndDate || plan.phaseEndDate > plan.endDate
      || !positive(plan.targetMinutes) || typeof plan.baselineProgress !== "number"
      || !Number.isFinite(plan.baselineProgress) || plan.baselineProgress < 0 || plan.baselineProgress > 100
      || !Array.isArray(plan.steps) || !plan.steps.length || !Array.isArray(input.tasks)
      || plan.steps.length !== input.tasks.length
      || (input.goalName !== undefined && !text(input.goalName, 180))) fail();
    const days = (Date.parse(plan.endDate + "T00:00:00Z") - Date.parse(plan.startDate + "T00:00:00Z")) / 86400000 + 1;
    if (!close(plan.targetMinutes, days * 180)) fail();
    const previous = goal.taskPlan;
    if (previous && (previous.id !== plan.id || previous.startDate !== plan.startDate
      || previous.baselineProgress !== plan.baselineProgress)) fail();
    if (!previous && !close(plan.baselineProgress, num(goal.progress, 0, 100))) fail();
    const existingTasks = new Map();
    for (const task of data.tasks) {
      if (!object(task) || !validId(task.id) || existingTasks.has(task.id)) fail();
      existingTasks.set(task.id, task);
    }
    const reserved = new Set();
    for (const [key, items] of Object.entries(data)) {
      if (key !== "tasks" && Array.isArray(items)) for (const item of items) {
        if (object(item) && typeof item.id === "string") reserved.add(item.id);
      }
    }
    // Other manifests reserve their identifiers even when a task record is missing.
    for (const other of data.goals) if (other !== goal && other.taskPlan) {
      if (typeof other.taskPlan.id === "string") reserved.add(other.taskPlan.id);
      for (const step of other.taskPlan.steps || []) if (typeof step?.id === "string") reserved.add(step.id);
    }
    if (existingTasks.has(plan.id) || reserved.has(plan.id)) fail();
    reserved.add(plan.id);
    const steps = new Map(), dailyWeights = new Map();
    let totalMinutes = 0;
    for (const step of plan.steps) {
      if (!only(step, ["id", "date", "weightMinutes"]) || !validId(step.id) || reserved.has(step.id)
        || steps.has(step.id) || !validDate(step.date) || step.date < plan.startDate
        || step.date > plan.phaseEndDate || !positive(step.weightMinutes) || step.weightMinutes > 180) fail();
      const fixed = {id: step.id, date: step.date, weightMinutes: step.weightMinutes};
      steps.set(step.id, fixed);
      dailyWeights.set(step.date, (dailyWeights.get(step.date) || 0) + step.weightMinutes);
      totalMinutes += step.weightMinutes;
    }
    const phaseDays = (Date.parse(plan.phaseEndDate + "T00:00:00Z") - Date.parse(plan.startDate + "T00:00:00Z")) / 86400000 + 1;
    if (dailyWeights.size !== phaseDays || [...dailyWeights.values()].some(weight => !close(weight, 180))
      || totalMinutes > plan.targetMinutes + 1e-6) fail();
    if (previous?.steps?.some(step => {
      const next = steps.get(step.id);
      return !next || next.date !== step.date || next.weightMinutes !== step.weightMinutes;
    })) fail();
    const added = [], skipped = [], taskIds = new Set();
    const taskKeys = ["id", "title", "goalId", "projectId", "planId", "checklistGroup", "checklistOrder",
      "weightMinutes", "date", "priority", "done", "status", "recurring", "subtasks", "body", "description", "tags",
      "estimatedHours", "completedDate", "archived", "impact", "progressImpact"];
    for (const task of input.tasks) {
      if (!only(task, taskKeys) || !validId(task.id) || taskIds.has(task.id) || !text(task.title, 180)
        || task.goalId !== goal.id || task.planId !== plan.id
        || (task.projectId !== undefined && task.projectId !== (goal.projectId || ""))
        || (task.priority !== undefined && !["low", "medium", "high"].includes(task.priority))
        || (task.done !== undefined && task.done !== false) || (task.status !== undefined && task.status !== "todo")
        || (task.completedDate !== undefined && task.completedDate !== "")
        || (task.archived !== undefined && task.archived !== false)
        || (task.impact !== undefined && task.impact !== 0)
        || (task.progressImpact !== undefined && task.progressImpact !== 0)
        || (task.recurring !== undefined && task.recurring !== "none")
        || (task.subtasks !== undefined && (!Array.isArray(task.subtasks) || task.subtasks.length))
        || (task.checklistGroup !== undefined && !text(task.checklistGroup, 180))
        || (task.checklistOrder !== undefined && (!Number.isSafeInteger(task.checklistOrder) || task.checklistOrder < 0))
        || (task.body !== undefined && (typeof task.body !== "string" || task.body.length > 10000))
        || (task.description !== undefined && (typeof task.description !== "string" || task.description.length > 10000))
        || (task.tags !== undefined && (!Array.isArray(task.tags)
          || task.tags.some(tag => typeof tag !== "string" || tag.length > 180)))
        || (task.estimatedHours !== undefined && (typeof task.estimatedHours !== "number"
          || !Number.isFinite(task.estimatedHours) || task.estimatedHours < 0 || task.estimatedHours > 24))) fail();
      taskIds.add(task.id);
      const step = steps.get(task.id);
      if (!step || task.date !== step.date || task.weightMinutes !== step.weightMinutes) fail();
      const existing = existingTasks.get(task.id);
      if (existing) {
        if (existing.goalId !== goal.id || existing.planId !== plan.id
          || existing.date !== step.date || existing.weightMinutes !== step.weightMinutes) fail();
        skipped.push(task.id);
      } else added.push({...task, ...(task.tags ? {tags: task.tags.slice()} : {}), title: task.title.trim(), projectId: goal.projectId || "",
        priority: task.priority || "medium", done: false, status: "todo", completedDate: "",
        recurring: "none", subtasks: [], impact: 0, progressImpact: 0});
    }
    const nextPlan = {...plan, name: plan.name.trim(), steps: [...steps.values()]};
    // All validation precedes mutation. Existing records, history, and live clocks stay intact.
    data.tasks.push(...added);
    Object.assign(goal, {deadline: plan.endDate, startDate: plan.startDate, dailyMinutes: 180,
      targetHours: plan.targetMinutes / 60, progressMode: "checklist", taskPlan: nextPlan});
    if (input.goalName !== undefined) goal.name = input.goalName.trim();
    return {goal, addedTaskIds: added.map(task => task.id), skippedTaskIds: skipped,
      report: checklistReport(goal, data)};
  }

  function goalProgress(goal, data) {
    if (!goal) return 0;
    if (goal.progressMode === "checklist") return checklistReport(goal, data).goalPercent;
    if (goal.progressMode === "time") {
      const target = goalTargetHours(goal);
      if (!(target > 0) || !Number.isFinite(target)) return 0;
      const worked = duration(reportSessions(data), 0, Infinity, s => s.goalId === goal.id);
      return Math.round(Math.max(0, Math.min(100, worked / (target * 3600000) * 100)) * 10) / 10;
    }
    return num(goal.progress, 0, 100);
  }
  function plannedGoalProgress(goal, now = Date.now()) {
    if (goal?.progressMode === "checklist") return checklistReport(goal, {tasks: []}, day(now)).plannedPercent;
    if (!goal?.startDate || !goal.deadline) return null;
    const start = +new Date(goal.startDate + "T00:00:00");
    const end = +new Date(goal.deadline + "T23:59:59");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return Math.round(Math.max(0, Math.min(100, (now-start)/(end-start)*100)));
  }

  function goalTargetHours(goal) {
    const explicit = Number(goal?.targetHours);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const daily = Number(goal?.dailyMinutes);
    const start = Date.parse(goal?.startDate);
    const end = Date.parse(goal?.deadline);
    if (!(daily > 0) || !Number.isFinite(daily) || !Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
    return (Math.round((end - start) / 86400000) + 1) * daily / 60;
  }

  function goalPlannedHours(goal, now = Date.now()) {
    if (goal?.progressMode === "checklist") {
      return (goal.taskPlan?.steps || []).filter(step => step.date <= day(now))
        .reduce((minutes, step) => minutes + num(step.weightMinutes), 0) / 60;
    }
    if (!goal?.startDate || !goal.deadline) return null;
    const start = +new Date(goal.startDate + "T00:00:00");
    const end = +new Date(goal.deadline + "T23:59:59");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return goalTargetHours(goal) * Math.max(0, Math.min(1, (now - start) / (end - start)));
  }

  return {
    recordDebtPayment,
    applyChecklistPlan,
    checklistReport,
    goalTargetHours,
    goalPlannedHours,
    goalProgress,
    plannedGoalProgress,
    completeTask,
    habitStreak,
    habitDue,
    habitWeek,
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
