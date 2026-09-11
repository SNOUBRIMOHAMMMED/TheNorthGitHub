/* Product UI: progressively extends the original LifeOS application. */
(() => {
  "use strict";
  const C = window.LifeCore,
    db = C.store(localStorage),
    $ = (s, p = document) => p.querySelector(s),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (m) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[m],
      );
  let route = "home",
    detail = "",
    mounted = false,
    calendarMode = "week",
    calendarDay = C.day(),
    taskFilter = "all",
    search = "",
    lastTick = "",
    busy = false,
    historyLimit = 50;
  const pendingSaves = new Map();
  const ar = () => document.documentElement.lang === "ar";
  const L = (en, arabic) => (ar() ? arabic : en);
  const labels = {
    home: ["Home", "الرئيسية"],
    today: ["Today", "اليوم"],
    focus: ["Focus", "التركيز"],
    tasks: ["Tasks", "المهام"],
    projects: ["Projects", "المشاريع"],
    goals: ["Goals", "الأهداف"],
    calendar: ["Calendar", "التقويم"],
    habits: ["Habits & routines", "العادات والروتين"],
    analytics: ["Analytics", "التحليلات"],
    notes: ["Notes", "الملاحظات"],
    inbox: ["Inbox", "الوارد"],
    planning: ["Planning & review", "التخطيط والمراجعة"],
    finances: ["Finances", "المال"],
    health: ["Health", "الصحة"],
    learning: ["Learning & reading", "التعلم والقراءة"],
    dashboard: ["Momentum", "زخم الأهداف"],
    planner: ["Goal cascade", "خطة الأهداف"],
    notifications: ["Signals", "الإشارات"],
    account: ["Settings", "الإعدادات"],
  };
  const name = (k) => (labels[k] ? L(...labels[k]) : k);
  const catName = (k) =>
    ({
      "Deep Work": L("Deep Work", "عمل عميق"),
      Management: L("Management", "إدارة"),
      Meetings: L("Meetings", "اجتماعات"),
      Learning: L("Learning", "تعلم"),
      Reading: L("Reading", "قراءة"),
      Admin: L("Admin", "أعمال إدارية"),
      Personal: L("Personal", "شخصي"),
      Health: L("Health", "صحة"),
    })[k] || k;
  const icon = (k = "home") => {
    const p = {
      home: "M3 10 12 3l9 7v10H4V10m5 10v-7h6v7",
      today: "m5 12 4 4L19 6",
      focus: "M12 8v5l3 2m-8-12h10M12 3v2 M21 13a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
      tasks: "M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1",
      projects: "M3 6h7l2 3h9v11H3V6Z",
      goals: "M20 12a8 8 0 1 1-8-8m0 4a4 4 0 1 0 4 4m-4 0 9-9",
      calendar: "M4 5h16v16H4V5Zm0 5h16M8 3v4m8-4v4",
      analytics: "M4 20V10m8 10V4m8 16v-7",
      notes: "M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4",
      inbox: "M3 14 6 4h12l3 10v6H3v-6Zm0 0h5l2 3h4l2-3h5",
      habits: "m6 12 4 4 8-8M21 12a9 9 0 1 1-4-7",
      account: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M3 12h2m14 0h2M12 3v2m0 14v2",
      planning: "M5 4h14v17H5V4Zm4-1h6v3H9V3Zm0 8h6m-6 5h6",
      finances: "M3 6h18v14H3V6Zm0 4h18m-5 5h3",
      health: "M3 12h4l3-8 4 16 3-8h4",
      learning: "M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3V4Zm9 2v15",
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${p[k] || p.analytics}"/></svg>`;
  };
  const fmt = (ms) => {
    const sec = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  };
  const hrs = (ms) => {
    if (ms > 0 && ms < 60000) return Math.floor(ms / 1000) + L("s", "ث");
    const m = Math.floor(Math.max(0, ms) / 60000);
    return ar()
      ? `${Math.floor(m / 60)}س ${m % 60}د`
      : `${Math.floor(m / 60)}h ${m % 60}m`;
  };
  const percent = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
  const dateText = (v) =>
    v
      ? new Intl.DateTimeFormat(ar() ? "ar-MA" : "en-GB", {
          month: "short",
          day: "numeric",
        }).format(new Date(v + "T12:00:00"))
      : "—";
  const timeText = (v) =>
    new Intl.DateTimeFormat(ar() ? "ar-MA" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: db.read()?.settings.timeFormat === "12",
    }).format(new Date(v));
  const btn = (text, action, extra = "", primary = false) =>
    `<button type="button" class="lx-btn ${primary ? "lx-primary" : ""}" data-action="${action}" ${extra}>${text}</button>`;
  const progress = (v, label = "") =>
    `<div class="lx-progress" role="progressbar" aria-label="${esc(label || L("Progress", "التقدم"))}" aria-valuenow="${Math.round(v)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
  const empty = (title, kind) =>
    `<div class="lx-empty">${icon(kind)}<h3>${title}</h3><p>${L("A clear next step is all you need to begin.", "خطوة واضحة واحدة تكفي لتبدأ.")}</p>${kind ? btn(L("Create your first item", "أضف أول عنصر"), "new", `data-kind="${kind}"`, true) : ""}</div>`;
  const field = (label, key, value = "", type = "text", extra = "") =>
    `<label class="lx-field"><span>${label}</span><input aria-label="${esc(label)}" name="${key}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const area = (label, key, value = "", extra = "") =>
    `<label class="lx-field"><span>${label}</span><textarea aria-label="${esc(label)}" name="${key}" rows="3" ${extra}>${esc(value)}</textarea></label>`;
  const select = (label, key, values, value = "", extra = "") =>
    `<label class="lx-field"><span>${label}</span><select aria-label="${esc(label)}" name="${key}" ${extra}>${values
      .map((x) => {
        const [v, n] = Array.isArray(x) ? x : [x, x];
        return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(n)}</option>`;
      })
      .join("")}</select></label>`;
  const options = (items, key = "name") => [
    ["", L("Unassigned", "دون ربط")],
    ...items
      .filter((x) => !x.archived)
      .map((x) => [x.id, x[key] || x.title || x.name]),
  ];
  function error(e) {
    const messages = {
      activeSession: L(
        "A session is already active. Resume or finish it first.",
        "لديك جلسة نشطة. استأنفها أو أنهها أولًا.",
      ),
      invalidTime: L(
        "Choose a valid past time range, up to 24 hours.",
        "اختر فترة زمنية صحيحة في الماضي لا تتجاوز 24 ساعة.",
      ),
      overlap: L(
        "This time overlaps a recorded or active session.",
        "هذا الوقت يتداخل مع جلسة مسجلة أو نشطة.",
      ),
      invalidData: L(
        "This backup is not compatible. Your data was not changed.",
        "النسخة الاحتياطية غير صالحة. لم تتغير بياناتك.",
      ),
      durationRequired: L(
        "Set a target duration first.",
        "حدد المدة المستهدفة أولًا.",
      ),
    };
    notice(
      messages[e.message] ||
        L(
          "Could not save. Storage may be full or unavailable. Export a backup and try again.",
          "تعذر الحفظ. قد تكون مساحة التخزين ممتلئة أو غير متاحة. صدّر نسخة احتياطية وأعد المحاولة.",
        ),
      true,
    );
  }
  function notice(message, bad = false) {
    const dialog = $("#lxDialog");
    if (bad && dialog?.open) {
      let status = dialog.querySelector(".lx-dialog-error");
      if (!status) {
        status = document.createElement("p");
        status.className = "lx-dialog-error lx-info";
        status.setAttribute("role", "alert");
        dialog.append(status);
      }
      status.textContent = message;
    }
    const el = $("#lxNotice");
    if (!el) return;
    el.textContent = message;
    el.className = "lx-notice visible" + (bad ? " error" : "");
    clearTimeout(el.hide);
    el.hide = setTimeout(() => el.classList.remove("visible"), 6000);
  }
  async function mutate(fn, refresh = true) {
    try {
      const email = localStorage.getItem(C.SESSION_KEY);
      const job = () => {
        if (email !== localStorage.getItem(C.SESSION_KEY))
          throw Error("signedOut");
        return db.update(fn);
      };
      const r = navigator.locks
        ? await navigator.locks.request("lifeos-write-" + email, job)
        : job();
      if (refresh) render();
      return r;
    } catch (e) {
      error(e);
      return null;
    }
  }
  function theme(d) {
    const mode = d.settings.theme;
    document.documentElement.dataset.theme =
      mode === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : mode;
    document
      .querySelector("meta[name=theme-color]")
      ?.setAttribute(
        "content",
        document.documentElement.dataset.theme === "dark"
          ? "#171b19"
          : "#f4f5f3",
      );
  }
  function mount() {
    if (mounted) return;
    mounted = true;
    document.body.classList.add("life-workspace");
    const content = $(".content");
    content.insertAdjacentHTML(
      "afterbegin",
      '<section id="lxView" class="view" data-view-panel="workspace"></section>',
    );
    $(".app-main").insertAdjacentHTML(
      "afterbegin",
      '<header id="lxTopbar" class="lx-topbar"></header>',
    );
    $(".mobile-header").insertAdjacentElement("afterend", $("#lxTopbar"));
    document.body.insertAdjacentHTML(
      "beforeend",
      '<dialog id="lxDialog" class="lx-dialog" aria-labelledby="lxDialogTitle"></dialog><dialog id="lxCommand" class="lx-dialog lx-command" aria-label="Search"></dialog><div id="lxNotice" class="lx-notice" role="status" aria-live="polite"></div><div id="lxMini" class="lx-mini hidden"></div>',
    );
    $("#toast").setAttribute("role", "status");
    $("#toast").setAttribute("aria-live", "polite");
    $("#lxDialog").addEventListener("close", () => {
      $("#lxDialog").innerHTML = "";
    });
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", keys);
    document.addEventListener("submit", submit);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    window.addEventListener("storage", (e) => {
      if ([C.ACCOUNT_KEY, C.SESSION_KEY].includes(e.key)) {
        if (!db.read()) {
          location.reload();
          return;
        }
        render();
      }
    });
    window.addEventListener("hashchange", () => {
      const [r, i] = location.hash.slice(1).split("/");
      if (labels[r]) navigate(r, i || "", false);
    });
    document.addEventListener("visibilitychange", tick);
    matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      () => {
        const d = db.read();
        if (d) theme(d);
      },
    );
    setInterval(tick, 500);
  }
  function chrome(d) {
    const primary = ["home", "goals", "tasks", "focus", "analytics"];
    const secondary = Object.keys(labels).filter(k => !primary.includes(k) && k !== "account");
    $(".side-nav").innerHTML = primary.map(navItem).join("") +
      `<details class="lx-nav-more" ${secondary.includes(route) ? "open" : ""}><summary>${L("More", "المزيد")}</summary>${secondary.map(navItem).join("")}</details>`;
    const mobileRoutes = ["home", "goals", "focus", "habits"];
    $(".bottom-nav").innerHTML = mobileRoutes.map(k =>
      `<button class="bottom-item ${route === k ? "active" : ""}" data-route="${k}" aria-label="${name(k)}" ${route === k ? 'aria-current="page"' : ""}>${icon(k)}<small>${k === "habits" ? L("Habits", "العادات") : name(k)}</small></button>`).join("") +
      `<button class="bottom-item ${!mobileRoutes.includes(route) ? "active" : ""}" data-action="menu" aria-haspopup="dialog" aria-label="${L("More sections", "المزيد من الأقسام")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14"/></svg><small>${L("More", "المزيد")}</small></button>`;
    $("#lxTopbar").innerHTML =
      `<div class="lx-breadcrumb">THE NORTH <span>/</span> ${name(route)}</div><div class="lx-top-actions"><button class="lx-btn lx-menu-button" data-action="menu">${icon("tasks")}${L("Explore", "الأقسام")}</button>${btn(icon("inbox") + L("Search", "بحث"), "command", 'aria-label="' + L("Search, Control K", "بحث، Control K") + '"')}${btn(ar() ? "EN" : "ع", "language")}${btn(icon("account"), "navigate", 'data-to="account" aria-label="' + name("account") + '"')}</div>`;
    $("#lxCommand").setAttribute(
      "aria-label",
      L("Global search", "البحث الشامل"),
    );
    theme(d);
  }
  function navItem(k) {
    return `<button class="nav-item ${route === k ? "active" : ""}" data-route="${k}" ${route === k ? 'aria-current="page"' : ""}>${icon(k)}<span>${name(k)}</span></button>`;
  }
  function navigate(r, id = "", history = true) {
    flushSaves();
    if ($("#lxDialog")?.open) $("#lxDialog").close();
    if (!labels[r]) r = "home";
    route = r;
    detail = id;
    search = "";
    if (history)
      window.history.replaceState(null, "", "#" + r + (id ? "/" + id : ""));
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    $("#lxView h1")?.focus({ preventScroll: true });
  }
  function render() {
    const d = db.read();
    if (!d) return;
    mount();
    chrome(d);
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    const legacy = [
      "dashboard",
      "planner",
      "notifications",
      "account",
    ].includes(route);
    if (legacy) {
      document
        .querySelector(`[data-view-panel="${route}"]`)
        .classList.add("active");
      if (route === "account") settingsPanel(d);
    } else {
      $("#lxView").classList.add("active");
      $("#lxView").innerHTML = page(d);
    }
    document.body.classList.toggle(
      "lx-focusing",
      route === "focus" && !!d.activeSession,
    );
    tickDisplay(d);
    lastTick = "";
  }
  function heading(title, sub, actions = "") {
    return `<div class="lx-page-head"><div><div class="lx-eyebrow">THE NORTH / ${name(route)}</div><h1 tabindex="-1">${title}</h1><p>${sub}</p></div><div class="lx-actions">${actions}</div></div>`;
  }
  function totals(d) {
    const all = C.reportSessions(d),
      now = Date.now(),
      start = C.midnight(now);
    return {
      all,
      today: C.duration(all, start, start + 86400000),
      week: C.duration(all, C.week(now, d.settings.weekStart)),
      month: C.duration(
        all,
        +new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      ),
      deep: C.duration(
        all,
        start,
        start + 86400000,
        (s) => s.categoryId === "Deep Work",
      ),
    };
  }
  function stat(label, value, sub = "") {
    return `<div class="lx-stat"><span>${label}</span><strong dir="auto">${value}</strong><small>${sub}</small></div>`;
  }
  function weeklyChart(sessions, d) {
    const start = C.week(Date.now(), d.settings.weekStart),
      values = Array.from({ length: 4 }, (_, i) => {
        const dt = new Date(start);
        dt.setDate(dt.getDate() - (3 - i) * 7);
        const end = new Date(dt);
        end.setDate(end.getDate() + 7);
        return { date: C.day(+dt), value: C.duration(sessions, +dt, +end) };
      });
    const max = Math.max(3600000, ...values.map((x) => x.value));
    return `<div class="lx-bars lx-week-bars" role="img" aria-label="${esc(values.map((v) => dateText(v.date) + ": " + hrs(v.value)).join(", "))}">${values.map((v) => `<div><small>${hrs(v.value)}</small><div class="lx-bar-track"><i style="height:${(v.value / max) * 100}%"></i></div><span>${dateText(v.date)}</span></div>`).join("")}</div>`;
  }
  function reviewMetrics(d) {
    const all = C.reportSessions(d),
      start = C.week(Date.now(), d.settings.weekStart),
      values = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(start);
      dt.setDate(dt.getDate() + i);
      if (C.day(+dt) > C.day()) break;
      const end = new Date(dt);
      end.setDate(end.getDate() + 1);
      values.push({ date: C.day(+dt), value: C.duration(all, +dt, +end) });
    }
    values.sort((a, b) => b.value - a.value);
    const ps = d.projects
      .map((p) => ({
        name: p.name,
        value: C.duration(all, start, Infinity, (s) => s.projectId === p.id),
      }))
      .sort((a, b) => b.value - a.value);
    return `<div class="lx-stats">${stat(L("Best day", "أفضل يوم"), values[0]?.value ? dateText(values[0].date) : "—")}${stat(L("Least tracked day", "أقل يوم تسجيلًا"), values.length ? dateText(values[values.length - 1].date) : "—")}${stat(L("Leading project", "المشروع الأكثر عملًا"), esc(ps[0]?.value ? ps[0].name : "—"))}${stat(L("Tasks completed this week", "المهام المكتملة هذا الأسبوع"), d.tasks.filter((t) => t.done && t.completedDate >= C.day(start)).length)}</div>`;
  }
  function page(d) {
    switch (route) {
      case "home":
      case "today":
        return home(d);
      case "focus":
        return focus(d);
      case "tasks":
        return tasks(d);
      case "projects":
        return projects(d);
      case "goals":
        return goals(d);
      case "analytics":
        return analytics(d);
      case "calendar":
        return calendar(d);
      case "planning":
        return planning(d);
      case "notes":
        return notes(d);
      case "inbox":
        return inbox(d);
      case "habits":
        return habits(d);
      case "finances":
        return finance(d);
      default:
        return journal(d);
    }
  }

  function goalBoard(d) {
    const gs = d.goals.filter((g) => !g.archived);
    return `<section class="lx-card lx-goal-board"><div class="lx-card-head"><div><div class="lx-eyebrow">${L("YOUR DIRECTION", "وجهتك أولًا")}</div><h2>${L("Where you are. Where you are going.", "أين أنت الآن، وإلى أين تتجه؟")}</h2></div>${btn(L("Momentum", "خريطة الزخم"), "navigate", 'data-to="dashboard"')}</div><div class="lx-goal-strip">${
      gs
        .map((g) => {
          const points = (g.history || [])
            .filter((h) => Number.isFinite(h.value))
            .slice(-14);
          const values = points.length
            ? points.map((h) => h.value)
            : [g.momentum || 0, g.momentum || 0];
          return `<button class="lx-goal-tile" data-route="goals" data-id="${esc(g.id)}"><strong>${esc(g.name)}</strong><span class="lx-goal-value">${g.progress}% <small>${L("of 100%", "من 100%")}</small></span><svg viewBox="0 0 240 70" role="img" aria-label="${L("Recorded momentum history", "سجل زخم الهدف الفعلي")}" preserveAspectRatio="none"><path d="M0 69H240" stroke="var(--lx-line)"/><polyline points="${values.map((v, i) => `${(i * 240) / Math.max(1, values.length - 1)},${65 - Math.max(0, Math.min(100, v)) * 0.6}`).join(" ")}" fill="none" stroke="currentColor" stroke-width="3"/></svg><small>${L("Momentum history · progress below", "سجل الزخم · نسبة الإنجاز أدناه")}</small>${progress(g.progress)}<small>${g.deadline ? L("Destination date: ", "موعد الوصول: ") + dateText(g.deadline) : L("Set a destination date", "حدد موعد الوصول")} · ${100 - g.progress}% ${L("remaining", "متبقٍ")}</small></button>`;
        })
        .join("") ||
      empty(L("Your first goal starts here.", "ابدأ هنا بأول هدف لك."), "goals")
    }</div></section>`;
  }
  function budgetInput(b, i) {
    return `<div class="lx-fields-two" data-budget-row><label class="lx-field"><span>${L("Category", "البند")} ${i + 1}</span><input data-budget-name maxlength="60" value="${esc(b.name)}"></label><label class="lx-field"><span>${L("Percentage", "النسبة")} %</span><input data-budget-percent type="number" min="0" max="100" step="0.01" value="${esc(b.percent)}"></label></div>`;
  }
  function budgetRows(d) {
    return Array.isArray(d.settings.budget) ? d.settings.budget : [];
  }
  function finance(d) {
    const month = C.day().slice(0, 7),
      rows = d.finances.filter((x) => !x.archived && x.date?.startsWith(month)),
      income = rows
        .filter((x) => x.type === "income")
        .reduce((n, x) => n + Math.round(Number(x.amount || 0) * 100), 0),
      spent = rows
        .filter((x) => x.type !== "income")
        .reduce((n, x) => n + Math.round(Number(x.amount || 0) * 100), 0),
      planned = (d.settings.moneyTodos || [])
        .filter((t) => !t.done)
        .reduce((n, t) => n + Math.round(Number(t.amount || 0) * 100), 0),
      money = (n) =>
        new Intl.NumberFormat(ar() ? "ar-MA" : "en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(n / 100) +
        " " +
        esc(d.settings.currency),
      budget = C.allocateBudget(income, budgetRows(d)),
      allocated = budget.reduce((n, b) => n + b.cents, 0);
    return (
      heading(
        name("finances"),
        L(
          "A home for every amount. This month: ",
          "مكان واضح لكل مبلغ. هذا الشهر: ",
        ) + month,
        btn(
          "+ " + L("Income / expense", "دخل / مصروف"),
          "new",
          'data-kind="finances"',
          true,
        ),
      ) +
      `<div class="lx-stats">${stat(L("Income received", "الدخل المستلم"), money(income))}${stat(L("Actually spent", "المصروف الفعلي"), money(spent))}${stat(L("Remaining balance", "الرصيد المتبقي"), money(income - spent))}${stat(L("After planned payments", "بعد الدفعات المخططة"), money(income - spent - planned))}</div><section class="lx-card"><div class="lx-card-head"><div><h2>${L("Your income plan", "خطة توزيع دخلك")}</h2><p>${L("Targets, not transactions. Recording income updates these amounts.", "مبالغ مخططة وليست معاملات فعلية. تتحدث تلقائيًا عند تسجيل الدخل.")}</p></div>${btn(L("Edit percentages", "تعديل النسب"), "budget-edit")}</div>${
        budget
          .map((b) => {
            const target = b.cents,
              actual = rows
                .filter((x) => x.type !== "income" && x.category === b.name)
                .reduce((n, x) => n + Math.round(Number(x.amount) * 100), 0);
            return `<div class="lx-budget-row"><strong>${esc(b.name)} <small>${b.percent}%</small></strong><span>${L("Planned", "المخطط")}: ${money(target)}</span><span>${L("Recorded", "المسجل")}: ${money(actual)}</span><span>${L("Available", "المتبقي للبند")}: ${money(target - actual)}</span></div>`;
          })
          .join("") ||
        `<p>${L("Choose your own categories and percentages to begin.", "حدد بنودك ونسبك لتبدأ. يمكنك إضافة الادخار والمنزل والكراء والأدوات.")}</p>`
      }<p>${L("Unallocated income", "الدخل غير الموزع")}: <b>${money(income - allocated)}</b></p><p class="lx-info">${L("Planning tip: leave room for irregular costs. A savings allocation is a target, not proof of a transfer. Choose percentages that fit your commitments.", "نصيحة تنظيمية: اترك مساحة للمصاريف غير المنتظمة. تخصيص مبلغ للادخار هو هدف وليس إثبات تحويل. اختر نسبًا تناسب التزاماتك.")}</p></section><div class="lx-grid-two"><section class="lx-card"><h2>${L("Money checklist", "قائمة متابعة المال")}</h2><form id="lxMoneyTodo"><div class="lx-fields-two">${field(L("Next action, e.g. pay rent", "الخطوة القادمة، مثل دفع الكراء"), "title", "", "text", 'required maxlength="160"')}${field(L("Planned amount · optional", "المبلغ المخطط · اختياري"), "amount", "", "number", 'min="0" step="0.01"')}<button class="lx-btn lx-primary" type="submit">${L("Add", "إضافة")}</button></div></form>${(d.settings.moneyTodos || []).map((t) => `<button class="lx-list-button" data-action="money-check" data-id="${esc(t.id)}" aria-pressed="${!!t.done}"><span>${t.done ? "✓" : "○"} ${esc(t.title)}</span><small>${money(Math.round(Number(t.amount || 0) * 100))}</small></button>`).join("")}<p class="lx-muted">${L("Forecast subtracts unchecked planned payments from this month’s balance. Record the expense when paid, then check its action.", "التوقع يخصم الدفعات غير المكتملة من رصيد الشهر. عند الدفع، سجّل المصروف ثم أكمل خطوته.")}</p></section><section class="lx-card"><h2>${L("This month’s transactions", "معاملات هذا الشهر")}</h2>${rows.map((x) => `<button class="lx-list-button" data-action="edit" data-kind="finances" data-id="${esc(x.id)}"><span>${esc(x.title)}<small>${dateText(x.date)} · ${esc(x.category || "")}</small></span><strong>${x.type === "income" ? "+" : "−"} ${money(Math.round(Number(x.amount) * 100))}</strong></button>`).join("") || empty(L("Record where money comes from and where it goes.", "سجل من أين يأتي المال وأين يُصرف."), "finances")}</section></div><details class="lx-card"><summary>${L("All transactions · previous months included", "كل المعاملات، بما فيها الأشهر السابقة")}</summary>${d.finances
        .filter((x) => !x.archived)
        .map(
          (x) =>
            `<button class="lx-list-button" data-action="edit" data-kind="finances" data-id="${esc(x.id)}">${esc(x.title)} · ${dateText(x.date)} · ${money(Math.round(Number(x.amount) * 100))}</button>`,
        )
        .join("")}</details>`
    );
  }

  function home(d) {
    const tt = totals(d), today = C.day();
    const due = d.tasks.filter(t => !t.archived && !t.done && (!t.date || t.date <= today))
      .sort((a,b) => ["high","medium","low"].indexOf(a.priority) - ["high","medium","low"].indexOf(b.priority));
    return heading(L("Your next step", "خطوتك القادمة"),
      L("See the goal. Choose the work. Begin.", "راجع هدفك. اختر عملك. ابدأ.")) + goalBoard(d) +
      `<section class="lx-card"><div class="lx-card-head"><h2>${L("Focus today", "تركيز اليوم")}</h2><span>${hrs(tt.deep)} / ${d.settings.dailyHours} ${L("hours", "ساعات")}</span></div>
      ${progress(percent(tt.deep, d.settings.dailyHours * 3600000))}
      <p>${L("Choose a task on the next screen and give it your attention.", "اختر مهمة في الشاشة التالية وامنحها انتباهك.")}</p>
      ${btn(L(d.activeSession ? "Resume focus" : "Start focus", d.activeSession ? "استأنف التركيز" : "ابدأ التركيز"), "navigate", 'data-to="focus"', true)}</section>
      <section class="lx-card"><div class="lx-card-head"><h2>${L("Next priorities", "الأولويات القادمة")}</h2>${btn(L("All tasks", "كل المهام"), "navigate", 'data-to="tasks"')}</div>
      ${due.slice(0,3).map(t=>`<p>${esc(t.title)}</p>`).join("") || `<p>${L("Add your next action in Tasks.", "أضف خطوتك القادمة في قسم المهام.")}</p>`}</section>
      <details class="lx-card"><summary>${L("Today’s schedule", "جدول اليوم")}</summary>${schedule(d,today)}</details>`;
  }
  function linkFields(d, obj = {}) {
    return `<div class="lx-fields-three">${select(name("projects"), "projectId", options(d.projects), obj.projectId)}${select(name("goals"), "goalId", options(d.goals), obj.goalId)}${select(name("tasks"), "taskId", options(d.tasks, "title"), obj.taskId)}</div>`;
  }
  function focus(d) {
    const a = d.activeSession;
    if (!a)
      return (
        heading(
          L("Protect your attention.", "احمِ انتباهك."),
          L(
            "Choose the work. Set your intention. Begin.",
            "اختر عملك. حدد نيتك. وابدأ.",
          ),
          btn(L("Add time manually", "إضافة وقت يدوي"), "manual"),
        ) +
        `<div class="lx-focus-layout"><form id="lxFocusForm" class="lx-card">${select(
          L("Session type", "نوع الجلسة"),
          "type",
          [
            ["stopwatch", L("Stopwatch", "ساعة إيقاف")],
            ["countdown", L("Countdown", "عد تنازلي")],
            ["pomodoro", L("Pomodoro", "بومودورو")],
          ],
          "stopwatch",
        )} ${field(L("What will you work on?", "على ماذا ستعمل؟"), "title", "", "text", 'placeholder="' + L("A meaningful piece of work", "عمل يستحق التركيز") + '"')}<details class="lx-card"><summary>${L("Link work and set duration", "ربط العمل وتحديد المدة")}</summary>${linkFields(d)}<div class="lx-fields-two">${select(
          L("Time category", "تصنيف الوقت"),
          "categoryId",
          d.categories.map((c) => [c, catName(c)]),
          "Deep Work",
        )}${field(L("Target minutes · 0 = open ended", "المدة بالدقائق · 0 = بلا حد"), "targetMinutes", 60, "number", 'min="0" max="1440"')}</div></details><div class="lx-info">${L("Pomodoro uses your saved focus and break settings. Time survives refresh and is calculated from real timestamps.", "يستخدم بومودورو مدد التركيز والراحة المحفوظة. الوقت يستمر بعد تحديث الصفحة ويُحسب من الطوابع الزمنية الفعلية.")}</div><button class="lx-btn lx-primary lx-wide" type="submit">${icon("focus")}${L("Start focus", "ابدأ التركيز")}</button></form><details class="lx-card"><summary>${L("Pomodoro settings and recent sessions", "إعدادات بومودورو والجلسات الأخيرة")}</summary><div class="lx-eyebrow">${L("YOUR RHYTHM", "إيقاعك")}</div><h2>${d.settings.focusMinutes} / ${d.settings.shortBreak}</h2><p>${L("Minutes of focus / short break", "دقائق تركيز / راحة قصيرة")}</p><p>${L("Long break every", "راحة طويلة كل")} ${d.settings.cycles} ${L("sessions", "جلسات")} · ${d.settings.longBreak} ${L("minutes", "دقيقة")}</p>${btn(L("Customize Pomodoro", "تخصيص بومودورو"), "navigate", 'data-to="account"')}<hr><h3>${L("Recent sessions", "الجلسات الأخيرة")}</h3>${
          d.sessions
            .slice(0, 4)
            .map((s) => sessionRow(s, d))
            .join("") ||
          `<p>${L("Your first focused minute starts here.", "دقيقتك الأولى من التركيز تبدأ هنا.")}</p>`
        }</details></div>`
      );
    const task = d.tasks.find((t) => t.id === a.taskId),
      project = d.projects.find((p) => p.id === a.projectId),
      goal = d.goals.find((g) => g.id === a.goalId);
    return `<div class="lx-focus-screen ${a.phase === "break" ? "is-break" : ""}"><div class="lx-focus-top">${btn("← " + L("Workspace", "مساحة العمل"), "navigate", 'data-to="home"')}<span class="lx-badge">${a.type === "pomodoro" ? "Pomodoro" : L("Focus", "تركيز")} · ${L("Round", "الجولة")} ${a.cyclesCompleted + 1}</span></div><div class="lx-session-context"><div class="lx-eyebrow">${a.phase === "break" ? L("RECOVER YOUR ATTENTION", "استعد انتباهك") : esc(project?.name || catName(a.categoryId))}</div><h1>${a.phase === "break" ? L("A little room to breathe.", "مساحة صغيرة لتتنفس.") : esc(task?.title || a.title || L("Focused work", "عمل بتركيز"))}</h1><p>${esc(goal?.name || "")}</p></div><div id="lxTimer" class="lx-timer" dir="ltr" role="timer" aria-label="${L("Session timer", "مؤقت الجلسة")}">00:00:00</div><div id="lxTimerMeta" class="lx-timer-meta"></div><div class="lx-timer-progress">${progress(0, L("Session progress", "تقدم الجلسة"))}</div><div class="lx-focus-controls">${a.status === "completed" ? btn(L("Finish", "إنهاء"), "session-finish", "", true) + btn(L("Take a break", "خذ استراحة"), "session-break") + btn(L("Continue working", "واصل العمل"), "session-continue") + btn("+15 " + L("min", "د"), "session-extend", 'data-minutes="15"') + btn("+30 " + L("min", "د"), "session-extend", 'data-minutes="30"') : btn(a.segmentStartedAt === null ? L("Resume", "استئناف") : L("Pause", "إيقاف مؤقت"), a.segmentStartedAt === null ? "session-resume" : "session-pause", "", true) + btn(L("Stop & review", "إيقاف ومراجعة"), "session-finish")}${btn(L("Cancel session", "إلغاء الجلسة"), "session-cancel")}</div>${a.phase === "break" ? `<p class="lx-break-tip">${L("Stand up. Drink water. Rest your eyes.", "قف قليلًا. اشرب الماء. وأرح عينيك.")}</p>` : ""}<div class="lx-focus-extras"><details><summary>${L("Session notes", "ملاحظات الجلسة")} <span id="lxSaved"></span></summary>${area(L("Keep a thought without leaving focus", "سجل فكرة دون مغادرة التركيز"), "activeNotes", a.notes, 'data-autosave="session"')}</details>${btn("+ " + L("Capture a distraction", "سجل مشتتًا"), "distraction")}<small>${a.distractions.length} ${L("captured in Inbox", "عناصر محفوظة في الوارد")}</small></div></div>`;
  }
  function taskRow(t, d) {
    const all = C.reportSessions(d),
      actual = C.duration(all, 0, Infinity, (s) => s.taskId === t.id);
    return `<div class="lx-task-row ${t.done ? "is-done" : ""}"><button class="lx-check" data-action="task-toggle" data-id="${t.id}" role="checkbox" aria-checked="${!!t.done}" aria-label="${esc(t.title)}">${t.done ? "✓" : ""}</button><button class="lx-task-title" data-action="edit" data-kind="tasks" data-id="${t.id}"><strong>${esc(t.title)}</strong><small>${esc(d.projects.find((p) => p.id === t.projectId)?.name || d.goals.find((g) => g.id === t.goalId)?.name || L("Independent task", "مهمة مستقلة"))} · ${dateText(t.date)} ${t.estimatedHours ? " · " + hrs(actual) + " / " + t.estimatedHours + L("h", "س") : ""}</small></button><span class="lx-priority ${t.priority}">${L(t.priority || "medium", { high: "عالية", medium: "متوسطة", low: "منخفضة" }[t.priority] || "متوسطة")}</span>${btn(icon("focus"), "task-focus", `data-id="${t.id}" aria-label="${L("Focus on", "ركز على")} ${esc(t.title)}"`)}</div>`;
  }
  function tasks(d) {
    const list = d.tasks
      .filter(
        (t) =>
          !t.archived &&
          (taskFilter === "all" || (taskFilter === "done" ? t.done : !t.done)),
      )
      .filter((t) => !search || t.title.toLowerCase().includes(search));
    return (
      heading(
        name("tasks"),
        L(
          "Turn intention into visible execution.",
          "حوّل النية إلى تنفيذ تراه.",
        ),
        btn(
          "+ " + L("New task", "مهمة جديدة"),
          "new",
          'data-kind="tasks"',
          true,
        ),
      ) +
      `<div class="lx-toolbar"><div class="lx-segmented">${["all", "open", "done"].map((k) => btn(L(k === "all" ? "All" : k === "open" ? "Open" : "Completed", k === "all" ? "الكل" : k === "open" ? "مفتوحة" : "مكتملة"), "filter", `data-filter="${k}" aria-pressed="${taskFilter === k}"`)).join("")}</div></div><div class="lx-card">${list.length ? list.map((t) => taskRow(t, d)).join("") : empty(L("Give your next action a name.", "سمِّ خطوتك التالية."), "tasks")}</div>`
    );
  }
  function entityTime(d, key, id) {
    const all = C.reportSessions(d),
      now = Date.now(),
      today = C.midnight(now);
    return `<div class="lx-stats">${stat(L("Total time", "إجمالي الوقت"), hrs(C.duration(all, 0, Infinity, (s) => s[key] === id)))}${stat(L("This month", "هذا الشهر"), hrs(C.duration(all, +new Date(new Date().getFullYear(), new Date().getMonth(), 1), Infinity, (s) => s[key] === id)))}${stat(L("This week", "هذا الأسبوع"), hrs(C.duration(all, C.week(now, d.settings.weekStart), Infinity, (s) => s[key] === id)))}${stat(L("Today", "اليوم"), hrs(C.duration(all, today, Infinity, (s) => s[key] === id)))}</div>`;
  }
  function projects(d) {
    const p = d.projects.find((p) => p.id === detail);
    if (p) {
      const ts = d.tasks.filter((t) => t.projectId === p.id && !t.archived);
      return (
        heading(
          esc(p.name),
          esc(p.description || ""),
          btn(
            L("All projects", "كل المشاريع"),
            "navigate",
            'data-to="projects"',
          ) +
            btn(
              L("Edit project", "تعديل المشروع"),
              "edit",
              `data-kind="projects" data-id="${p.id}"`,
            ),
        ) +
        entityTime(d, "projectId", p.id) +
        `<div class="lx-grid-two"><section class="lx-card"><div class="lx-card-head"><h2>${name("tasks")}</h2>${btn("+", "new", `data-kind="tasks" data-project="${p.id}" aria-label="${L("New task", "مهمة جديدة")}"`)}</div>${ts.map((t) => taskRow(t, d)).join("") || empty(L("Add a concrete next action.", "أضف خطوة تنفيذية واضحة."), "tasks")}</section><section class="lx-card"><h2>${L("Project overview", "نظرة على المشروع")}</h2>${progress(percent(ts.filter((t) => t.done).length, ts.length))}<p>${ts.filter((t) => t.done).length}/${ts.length} ${L("tasks completed", "مهام مكتملة")}</p><p>${L("Deadline", "الموعد النهائي")}: ${dateText(p.deadline)}</p><p>${L("People", "الأشخاص")}: ${esc(p.people || "—")}</p><h3>${name("goals")}</h3>${
          d.goals
            .filter((g) => g.projectId === p.id)
            .map(
              (g) =>
                `<button class="lx-list-button" data-route="goals" data-id="${g.id}">${esc(g.name)} <span>${g.progress}%</span></button>`,
            )
            .join("") || "<p>—</p>"
        }<h3>${L("Time this week", "الوقت هذا الأسبوع")}</h3>${dayChart(
          C.reportSessions(d).filter((s) => s.projectId === p.id),
          d,
        )}</section></div><section class="lx-card"><h2>${L("Notes & files", "الملاحظات والملفات")}</h2><p class="lx-pre">${esc(p.notes || "—")}</p>${files(p)}<h3>${L("Recent activity", "النشاط الأخير")}</h3>${
          d.sessions
            .filter((s) => s.projectId === p.id)
            .slice(0, 8)
            .map((s) => sessionRow(s, d))
            .join("") || "<p>—</p>"
        }</section>`
      );
    }
    return (
      heading(
        name("projects"),
        L(
          "Your work, organized around outcomes.",
          "أعمالك منظمة حول نتائج واضحة.",
        ),
        btn(
          "+ " + L("New project", "مشروع جديد"),
          "new",
          'data-kind="projects"',
          true,
        ),
      ) +
      `<div class="lx-grid-three">${
        d.projects
          .filter((p) => !p.archived)
          .map((p) => {
            const ts = d.tasks.filter((t) => t.projectId === p.id);
            return `<article class="lx-card lx-project"><div class="lx-project-icon">${icon("projects")}</div><h2><button data-route="projects" data-id="${p.id}">${esc(p.name)}</button></h2><p>${esc(p.description || L("Define the outcome. Build the next step.", "حدد النتيجة، ثم ابنِ الخطوة التالية."))}</p>${progress(percent(ts.filter((t) => t.done).length, ts.length))}<div class="lx-split"><small>${ts.filter((t) => t.done).length}/${ts.length} ${L("tasks", "مهام")}</small><small>${dateText(p.deadline)}</small></div></article>`;
          })
          .join("") ||
        empty(
          L(
            "Bring your next venture into focus.",
            "امنح مشروعك القادم اتجاهًا واضحًا.",
          ),
          "projects",
        )
      }</div>`
    );
  }
  function goals(d) {
    const g = d.goals.find((g) => g.id === detail);
    if (g) {
      const ts = d.tasks.filter((t) => t.goalId === g.id),
        time = C.duration(
          C.reportSessions(d),
          0,
          Infinity,
          (s) => s.goalId === g.id,
        );
      return (
        heading(
          esc(g.name),
          esc(g.why || ""),
          btn(L("All goals", "كل الأهداف"), "navigate", 'data-to="goals"') +
            btn(
              L("Edit goal", "تعديل الهدف"),
              "edit",
              `data-kind="goals" data-id="${g.id}"`,
            ),
        ) +
        entityTime(d, "goalId", g.id) +
        `<div class="lx-grid-two"><section class="lx-card"><h2>${L("Outcome progress", "تقدم النتيجة")} · ${g.progress}%</h2>${progress(g.progress)}<p>${L("Time is an investment, not an automatic measure of completion.", "الوقت استثمار، وليس مقياسًا تلقائيًا لاكتمال الهدف.")}</p><div class="lx-mini-stats">${stat(L("Estimated", "المقدر"), (g.targetHours || 0) + L(" hours", " ساعة"))}${stat(L("Remaining", "المتبقي"), hrs(Math.max(0, (g.targetHours || 0) * 3600000 - time)))}${stat(L("Days left", "الأيام المتبقية"), g.deadline ? Math.max(0, Math.ceil((+new Date(g.deadline + "T23:59:59") - Date.now()) / 86400000)) : "—")}</div><h3>${L("Milestones", "المراحل")}</h3>${["m6", "m3", "month", "week"].map((key, i) => `<div class="lx-list-line"><span>${L(["6 months", "Quarter", "Month", "Week"][i], ["ستة أشهر", "ربع سنة", "شهر", "أسبوع"][i])}</span><strong>${esc(g.plan?.[key] || "—")}</strong></div>`).join("")}<p class="lx-pre">${esc(g.notes || "")}</p></section><section class="lx-card"><h2>${name("tasks")}</h2>${ts.map((t) => taskRow(t, d)).join("") || empty(L("Connect actions to this outcome.", "اربط التنفيذ بهذه النتيجة."), "tasks")}</section></div>`
      );
    }
    return (
      heading(
        name("goals"),
        L("Keep the destination visible.", "أبقِ وجهتك أمام عينيك."),
        btn(
          L("Momentum chart", "خريطة الزخم"),
          "navigate",
          'data-to="dashboard"',
        ) +
          btn(
            "+ " + L("New goal", "هدف جديد"),
            "new",
            'data-kind="goals"',
            true,
          ),
      ) +
      `<div class="lx-grid-three">${
        d.goals
          .filter((g) => !g.archived)
          .map(
            (g) =>
              `<article class="lx-card"><div class="lx-eyebrow">${esc(g.horizon ? L(g.horizon, { annual: "سنوي", quarterly: "ربع سنوي", monthly: "شهري", weekly: "أسبوعي" }[g.horizon] || g.horizon) : L("Long term", "بعيد المدى"))}</div><h2><button class="lx-text-button" data-route="goals" data-id="${g.id}">${esc(g.name)}</button></h2><p>${esc(g.why || "")}</p><div class="lx-split"><strong>${g.progress}%</strong><small>${dateText(g.deadline)}</small></div>${progress(g.progress)}<p>${hrs(C.duration(C.reportSessions(d), 0, Infinity, (s) => s.goalId === g.id))} ${L("invested", "مستثمرة")}</p></article>`,
          )
          .join("") ||
        empty(
          L(
            "Choose a destination worth reaching.",
            "اختر نتيجة تستحق الوصول إليها.",
          ),
          "goals",
        )
      }</div>`
    );
  }
  function dayChart(sessions, d) {
    const start = C.week(Date.now(), d.settings.weekStart),
      values = Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(start);
        dt.setDate(dt.getDate() + i);
        const end = new Date(dt);
        end.setDate(end.getDate() + 1);
        return { date: C.day(+dt), value: C.duration(sessions, +dt, +end) };
      });
    const max = Math.max(3600000, ...values.map((x) => x.value));
    return `<div class="lx-bars" role="img" aria-label="${esc(values.map((v) => dateText(v.date) + ": " + hrs(v.value)).join(", "))}">${values.map((v) => `<div><small>${hrs(v.value)}</small><div class="lx-bar-track"><i style="height:${(v.value / max) * 100}%"></i></div><span>${new Intl.DateTimeFormat(ar() ? "ar-MA" : "en-GB", { weekday: "short" }).format(new Date(v.date + "T12:00:00"))}</span></div>`).join("")}</div>`;
  }
  function sessionRow(s, d) {
    return `<button class="lx-list-button" data-action="session-detail" data-id="${s.id}"><span><strong>${esc(s.title || d.tasks.find((t) => t.id === s.taskId)?.title || catName(s.categoryId))}</strong><small>${dateText(C.day(s.startedAt))} · ${timeText(s.startedAt)} · ${esc(d.projects.find((p) => p.id === s.projectId)?.name || "")}</small></span><b dir="ltr">${fmt(C.duration([s]))}</b></button>`;
  }
  function analytics(d) {
    const tt = totals(d),
      now = Date.now(),
      y = C.midnight(now) - 86400000,
      deepWeek = C.duration(
        tt.all,
        C.week(now, d.settings.weekStart),
        Infinity,
        (s) => s.categoryId === "Deep Work",
      ),
      avg = d.sessions.length ? C.duration(d.sessions) / d.sessions.length : 0;
    const dayTotals = {};
    for (let i = 0; i < 30; i++) {
      const dt = new Date(C.midnight(now));
      dt.setDate(dt.getDate() - i);
      const end = new Date(dt);
      end.setDate(end.getDate() + 1);
      dayTotals[C.day(+dt)] = C.duration(tt.all, +dt, +end);
    }
    const best = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
    let streak = 0,
      streakDate = new Date(C.midnight(now));
    if (!dayTotals[C.day(+streakDate)])
      streakDate.setDate(streakDate.getDate() - 1);
    while (streak < 30 && dayTotals[C.day(+streakDate)]) {
      streak++;
      streakDate.setDate(streakDate.getDate() - 1);
    }
    const hours = Array(24).fill(0);
    tt.all.forEach((s) =>
      s.segments
        .filter((x) => x.kind === "focus")
        .forEach((seg) => {
          let cursor = seg.start;
          while (cursor < seg.end) {
            const next = new Date(cursor);
            next.setHours(next.getHours() + 1, 0, 0, 0);
            const end = Math.min(+next, seg.end);
            hours[new Date(cursor).getHours()] += end - cursor;
            cursor = end;
          }
        }),
    );
    const bestHour = hours.indexOf(Math.max(...hours));
    return (
      heading(
        name("analytics"),
        L("Understand where your attention goes.", "افهم أين يذهب انتباهك."),
        btn(L("Add time", "إضافة وقت"), "manual"),
      ) +
      `<div class="lx-stats">${stat(L("Today", "اليوم"), hrs(tt.today))}${stat(L("Yesterday", "أمس"), hrs(C.duration(tt.all, y, y + 86400000)))}${stat(L("This week", "هذا الأسبوع"), hrs(tt.week))}${stat(L("This month", "هذا الشهر"), hrs(tt.month))}</div><div class="lx-grid-two"><section class="lx-card"><h2>${L("Focus time by day", "وقت التركيز حسب اليوم")}</h2>${dayChart(tt.all, d)}</section><section class="lx-card"><h2>${L("Weekly deep work", "العمل العميق الأسبوعي")}</h2><div class="lx-big-number">${hrs(deepWeek)}</div><p>${L("of", "من")} ${d.settings.weeklyHours} ${L("hours", "ساعة")} · ${hrs(Math.max(0, d.settings.weeklyHours * 3600000 - deepWeek))} ${L("remaining", "متبقية")}</p>${progress(percent(deepWeek, d.settings.weeklyHours * 3600000))}<div class="lx-mini-stats">${stat(L("Average session", "متوسط الجلسة"), hrs(avg))}${stat(L("Focus streak · last 30 days", "تتابع التركيز · آخر 30 يومًا"), streak + L(" days", " أيام"))}</div></section></div><div class="lx-grid-three"><section class="lx-card"><h2>${L("Time categories", "تصنيفات الوقت")}</h2>${d.categories
        .map((c) => {
          const value = C.duration(
            tt.all,
            C.week(now, d.settings.weekStart),
            Infinity,
            (s) => s.categoryId === c,
          );
          return `<div class="lx-list-line"><span>${esc(catName(c))}</span><strong>${hrs(value)}</strong></div>`;
        })
        .join(
          "",
        )}</section><section class="lx-card"><h2>${L("Projects · this week", "المشاريع · هذا الأسبوع")}</h2>${d.projects.map((p) => `<div class="lx-list-line"><span>${esc(p.name)}</span><strong>${hrs(C.duration(tt.all, C.week(now, d.settings.weekStart), Infinity, (s) => s.projectId === p.id))}</strong></div>`).join("") || "<p>—</p>"}</section><section class="lx-card"><h2>${L("Your rhythm", "إيقاعك")}</h2><p>${L("Most tracked hour", "الساعة الأكثر تسجيلًا")}: <b dir="ltr">${hours[bestHour] ? String(bestHour).padStart(2, "0") + ":00 – " + String(bestHour + 1).padStart(2, "0") + ":00" : "—"}</b></p><p>${L("Best day · last 30 days", "أفضل يوم · آخر 30 يومًا")}: ${best?.[1] ? dateText(best[0]) : "—"}</p><p>${L("Average daily deep work · 7 days", "متوسط العمل العميق اليومي · 7 أيام")}: ${hrs(C.duration(tt.all, C.midnight(now) - 6 * 86400000, Infinity, (s) => s.categoryId === "Deep Work") / 7)}</p><p>${L("Time tracked describes effort, not quality.", "الوقت المسجل يصف الجهد، وليس جودته.")}</p></section></div><div class="lx-grid-two"><section class="lx-card"><h2>${L("Execution", "التنفيذ")}</h2><p>${L("Tasks completed", "المهام المكتملة")}: ${d.tasks.filter((t) => t.done).length} / ${d.tasks.length}</p>${progress(percent(d.tasks.filter((t) => t.done).length, d.tasks.length))}<p>${L("Habits today", "عادات اليوم")}: ${d.habits.filter((h) => h.checks?.includes(C.day())).length} / ${d.habits.length}</p>${progress(percent(d.habits.filter((h) => h.checks?.includes(C.day())).length, d.habits.length))}</section><section class="lx-card"><h2>${L("Goals progress", "تقدم الأهداف")}</h2>${d.goals.map((g) => `<div class="lx-list-line"><span>${esc(g.name)}</span><strong>${g.progress}%</strong></div>${progress(g.progress)}`).join("") || "<p>—</p>"}</section></div><div class="lx-grid-two"><section class="lx-card"><h2>${L("Focus time by week", "وقت التركيز حسب الأسبوع")}</h2>${weeklyChart(tt.all, d)}</section><section class="lx-card"><h2>${L("Time per goal · this month", "الوقت لكل هدف · هذا الشهر")}</h2>${d.goals.map((g) => `<button class="lx-list-button" data-route="goals" data-id="${g.id}">${esc(g.name)}<strong>${hrs(C.duration(tt.all, +new Date(new Date().getFullYear(), new Date().getMonth(), 1), Infinity, (s) => s.goalId === g.id))}</strong></button>`).join("") || "<p>—</p>"}</section></div><section class="lx-card"><h2>${L("Session history", "سجل الجلسات")}</h2>${
        d.sessions
          .slice(0, historyLimit)
          .map((s) => sessionRow(s, d))
          .join("") ||
        `<p>${L("No tracked sessions yet.", "لا توجد جلسات مسجلة بعد.")}</p>`
      }${d.sessions.length > historyLimit ? btn(L("Show more sessions", "عرض جلسات أخرى"), "more-sessions") : ""}</section>`
    );
  }
  function schedule(d, date) {
    const entries = [
      ...d.events
        .filter((e) => !e.archived && e.date === date)
        .map((e) => ({
          title: e.title,
          time: e.startTime || "09:00",
          sub: e.endTime || "",
          kind: "events",
          id: e.id,
        })),
      ...d.tasks
        .filter((t) => t.date === date && !t.archived)
        .map((t) => ({
          title: t.title,
          time: t.startTime || "—",
          sub: L("Task", "مهمة"),
          kind: "tasks",
          id: t.id,
        })),
      ...d.goals
        .filter((g) => !g.archived && g.deadline === date)
        .map((g) => ({
          title: g.name,
          time: "—",
          sub: L("Goal deadline", "موعد الهدف"),
          kind: "goals",
          id: g.id,
        })),
      ...d.habits
        .filter((h) => !h.archived)
        .map((h) => ({
          title: h.title,
          time: h.time || "—",
          sub: L("Habit", "عادة"),
          kind: "habits",
          id: h.id,
        })),
      ...d.sessions
        .filter((s) => C.day(s.startedAt) === date)
        .map((s) => ({
          title:
            s.title ||
            d.tasks.find((t) => t.id === s.taskId)?.title ||
            catName(s.categoryId),
          time: timeText(s.startedAt),
          sub: hrs(C.duration([s])),
          kind: "session",
          id: s.id,
        })),
    ];
    return (
      entries
        .sort((a, b) => a.time.localeCompare(b.time))
        .map(
          (e) =>
            `<button class="lx-schedule-row" data-action="${e.kind === "session" ? "session-detail" : "edit"}" data-kind="${e.kind}" data-id="${e.id}"><time dir="auto">${esc(e.time)}</time><span><strong>${esc(e.title)}</strong><small>${esc(e.sub)}</small></span></button>`,
        )
        .join("") ||
      `<p class="lx-muted">${L("Your schedule is clear.", "جدولك متاح.")}</p>`
    );
  }
  function calendar(d) {
    const dt = new Date(calendarDay + "T12:00:00"),
      start =
        calendarMode === "day"
          ? +dt
          : calendarMode === "week"
            ? C.week(+dt, d.settings.weekStart)
            : +new Date(dt.getFullYear(), dt.getMonth(), 1, 12);
    const count =
      calendarMode === "day"
        ? 1
        : calendarMode === "week"
          ? 7
          : new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    return (
      heading(
        name("calendar"),
        L(
          "Plans and actual work, together.",
          "خططك ووقتك الفعلي في مكان واحد.",
        ),
        btn(
          "+ " + L("New event", "حدث جديد"),
          "new",
          'data-kind="events"',
          true,
        ),
      ) +
      `<div class="lx-toolbar"><div class="lx-segmented">${["day", "week", "month"].map((m) => btn(L(m, { day: "يوم", week: "أسبوع", month: "شهر" }[m]), "calendar-mode", `data-mode="${m}" aria-pressed="${calendarMode === m}"`)).join("")}</div>${field(L("Date", "التاريخ"), "calendarDay", calendarDay, "date")}</div><div class="lx-calendar ${calendarMode}">${Array.from(
        { length: count },
        (_, i) => {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          const key = C.day(+date);
          return `<section class="lx-calendar-day ${key === C.day() ? "is-today" : ""}"><h3>${dateText(key)} <small>${new Intl.DateTimeFormat(ar() ? "ar-MA" : "en-GB", { weekday: "short" }).format(date)}</small></h3>${schedule(d, key)}</section>`;
        },
      ).join("")}</div>`
    );
  }
  function planning(d) {
    const period = detail || "daily";
    const key =
        period === "daily"
          ? C.day()
          : period === "weekly"
            ? C.day(C.week(Date.now(), d.settings.weekStart))
            : period === "monthly"
              ? C.day().slice(0, 7)
              : new Date().getFullYear() +
                "-Q" +
                (Math.floor(new Date().getMonth() / 3) + 1),
      p = d.planning[period + ":" + key] || {},
      tt = totals(d);
    return (
      heading(
        name("planning"),
        L(
          "Choose with intention. Review with honesty.",
          "اختر بوعي. وراجع بصدق.",
        ),
      ) +
      reviewMetrics(d) +
      `<div class="lx-segmented lx-margin">${["daily", "weekly", "monthly", "quarterly"].map((v) => btn(L(v, { daily: "يومي", weekly: "أسبوعي", monthly: "شهري", quarterly: "ربع سنوي" }[v]), "planning-mode", `data-mode="${v}" aria-pressed="${period === v}"`)).join("")}</div><div class="lx-grid-two"><section class="lx-card"><div class="lx-card-head"><h2>${L("Plan", "الخطة")} · ${esc(key)}</h2><small id="lxPlanSaved" role="status">${L("Autosaved", "حفظ تلقائي")}</small></div><form id="lxPlanForm" data-key="${period}:${key}">${area(L("Top 3 priorities · one per line", "أهم 3 أولويات · أولوية في كل سطر"), "priorities", p.priorities || "")}${area(L("What must get done?", "ما الذي يجب إنجازه؟"), "must", p.must || "")}${area(L("Meetings, habits & notes", "الاجتماعات والعادات والملاحظات"), "notes", p.notes || "")}${field(L("Deep work target (hours)", "هدف العمل العميق (ساعات)"), "target", p.target || d.settings.dailyHours, "number", 'min="0" max="168" step="0.5"')}</form></section><section class="lx-card"><h2>${L("Review", "المراجعة")}</h2><p>${L("Today", "اليوم")}: ${hrs(tt.today)} · ${L("Week", "الأسبوع")}: ${hrs(tt.week)}</p><p>${L("Missed / overdue tasks", "المهام المتأخرة")}: ${d.tasks.filter((t) => !t.done && t.date < C.day()).length}</p><form id="lxReviewForm" data-key="${period}:${key}">${area(L("What did you accomplish?", "ماذا أنجزت؟"), "accomplished", p.accomplished || "")}${area(L("What remains unfinished?", "ما الذي لم يكتمل؟"), "unfinished", p.unfinished || "")}${area(L("Distractions & lessons learned", "المشتتات والدروس المستفادة"), "lessons", p.lessons || "")}${select(
        L("Energy", "الطاقة"),
        "energy",
        [
          ["low", L("Low", "منخفضة")],
          ["medium", L("Medium", "متوسطة")],
          ["high", L("High", "عالية")],
        ],
        p.energy || "medium",
      )}${area(L("Next priorities / tomorrow’s most important task", "الأولويات القادمة / أهم مهمة للغد"), "next", p.next || "")}</form></section></div>`
    );
  }
  function notes(d) {
    const list = d.notes.filter((n) => !n.archived);
    const n = list.find((n) => n.id === detail) || list[0];
    return (
      heading(
        name("notes"),
        L("A quiet place for your thinking.", "مساحة هادئة لأفكارك."),
        btn(
          "+ " + L("New note", "ملاحظة جديدة"),
          "new",
          'data-kind="notes"',
          true,
        ),
      ) +
      `<div class="lx-notes-layout"><section class="lx-card">${list.map((x) => `<button class="lx-list-button ${n?.id === x.id ? "selected" : ""}" data-route="notes" data-id="${x.id}">${esc(x.title)}</button>`).join("") || empty(L("Keep a thought.", "احتفظ بفكرة."), "notes")}</section>${n ? `<section class="lx-card"><div class="lx-card-head"><h2>${esc(n.title)}</h2><span id="lxNoteSaved" role="status">${L("Saved", "محفوظ")}</span>${btn(L("Edit details", "تعديل التفاصيل"), "edit", `data-kind="notes" data-id="${n.id}"`)}</div>${area(L("Note", "الملاحظة"), "noteBody", n.body || "", `data-note="${n.id}" class="lx-note-editor"`)}${files(n)}</section>` : ""}</div>`
    );
  }
  function inbox(d) {
    return (
      heading(
        name("inbox"),
        L(
          "Capture now. Decide when you are ready.",
          "سجل الآن. وقرر عندما تكون مستعدًا.",
        ),
        btn(
          "+ " + L("Capture", "تسجيل فكرة"),
          "new",
          'data-kind="inbox"',
          true,
        ),
      ) +
      `<section class="lx-card">${
        d.inbox
          .filter((i) => !i.archived)
          .map(
            (i) =>
              `<div class="lx-inbox-row"><div><strong>${esc(i.title)}</strong><small>${i.sessionId ? L("Captured during focus", "سُجلت أثناء التركيز") : dateText(C.day(i.createdAt || Date.now()))}</small></div><div class="lx-actions">${select(
                L("Convert to", "تحويل إلى"),
                "convert-" + i.id,
                ["tasks", "projects", "goals", "notes", "events"].map((k) => [
                  k,
                  name(k),
                ]),
              )}${btn(L("Convert", "تحويل"), "convert", `data-id="${i.id}"`)}</div></div>`,
          )
          .join("") ||
        empty(
          L(
            "Your mind can let go here.",
            "اترك أفكارك هنا لتعود إليها لاحقًا.",
          ),
          "inbox",
        )
      }</section>`
    );
  }
  function habits(d) {
    return (
      heading(
        name("habits"),
        L(
          "Small commitments. A stronger foundation.",
          "التزامات صغيرة. أساس أقوى.",
        ),
        btn(
          "+ " + L("New habit", "عادة جديدة"),
          "new",
          'data-kind="habits"',
          true,
        ),
      ) +
      `<div class="lx-grid-three">${
        d.habits
          .filter((h) => !h.archived)
          .map(
            (h) =>
              `<article class="lx-card"><div class="lx-card-head"><h2>${esc(h.title)}</h2>${btn(L("Edit", "تعديل"), "edit", `data-kind="habits" data-id="${h.id}"`)}</div><p>${esc(h.description || "")}</p><p>${L("Last 7 days", "آخر 7 أيام")}: ${Array.from(
                { length: 7 },
                (_, i) => {
                  const dt = new Date();
                  dt.setDate(dt.getDate() - i);
                  return h.checks?.includes(C.day(+dt)) ? 1 : 0;
                },
              ).reduce(
                (a, b) => a + b,
                0,
              )} / 7</p><div class="lx-habit-days">${Array.from(
                { length: 7 },
                (_, i) => {
                  const dt = new Date();
                  dt.setDate(dt.getDate() - 6 + i);
                  const key = C.day(+dt);
                  return `<span class="${h.checks?.includes(key) ? "checked" : ""}" title="${key}">${dt.getDate()}</span>`;
                },
              ).join(
                "",
              )}</div>${btn(h.checks?.includes(C.day()) ? L("Completed today ✓", "تمت اليوم ✓") : L("Mark today complete", "إكمال عادة اليوم"), "habit-toggle", `data-id="${h.id}"`, true)}<p>${esc(h.time || "")} · ${L("Daily", "يوميًا")}</p></article>`,
          )
          .join("") ||
        empty(
          L(
            "Build a rhythm you can sustain.",
            "ابنِ إيقاعًا تستطيع الاستمرار عليه.",
          ),
          "habits",
        )
      }</div>`
    );
  }
  function journal(d) {
    const kind = route,
      rows = (d[kind] || []).filter((x) => !x.archived);
    return (
      heading(
        name(kind),
        L("Keep a clear, useful record.", "احتفظ بسجل واضح ومفيد."),
        btn(
          "+ " + L("New entry", "سجل جديد"),
          "new",
          `data-kind="${kind}"`,
          true,
        ),
      ) +
      `<section class="lx-card">${rows.map((x) => `<button class="lx-list-button" data-action="edit" data-kind="${kind}" data-id="${x.id}"><span><strong>${esc(x.title)}</strong><small>${dateText(x.date)} · ${esc(x.notes || "")}</small></span><b>${esc(x.amount || x.value || x.status || "")}</b></button>`).join("") || empty(L("Start with one useful entry.", "ابدأ بسجل واحد مفيد."), kind)}</section>`
    );
  }
  function files(obj, kindOverride) {
    return (obj.attachments || [])
      .map(
        (f, i) =>
          `<button class="lx-btn" data-action="download-file" data-kind="${kindOverride || (route === "projects" ? "projects" : route === "notes" ? "notes" : "tasks")}" data-id="${obj.id}" data-index="${i}">${esc(f.name)}</button>`,
      )
      .join("");
  }
  function modal(title, body) {
    const dialog = $("#lxDialog");
    if (dialog.open) dialog.close();
    dialog.innerHTML = `<div class="lx-dialog-head"><h2 id="lxDialogTitle">${title}</h2>${btn("×", "close", 'aria-label="' + L("Close", "إغلاق") + '"')}</div>${body}`;
    dialog.showModal();
    dialog.querySelector("input:not([type=hidden]),textarea,select")?.focus();
  }
  const endForm = (editing, kind, id) =>
    `<div class="lx-dialog-footer">${editing ? btn(L("Archive", "أرشفة"), "archive", `data-kind="${kind}" data-id="${id}"`) : ""}${btn(L("Cancel", "إلغاء"), "close")}<button class="lx-btn lx-primary" type="submit">${L("Save", "حفظ")}</button></div>`;
  function editor(kind, id = "", seed = {}) {
    const d = db.read();
    if (!Array.isArray(d[kind])) return;
    const existing = d[kind].find((x) => x.id === id),
      o = existing || seed;
    const titleKey = ["projects", "goals"].includes(kind) ? "name" : "title";
    let body = field(
      L("Name / title", "الاسم / العنوان"),
      titleKey,
      o[titleKey] || "",
      "text",
      'required maxlength="180"',
    );
    if (kind === "tasks")
      body +=
        area(L("Description", "الوصف"), "description", o.description || "") +
        `<div class="lx-fields-two">${select(name("projects"), "projectId", options(d.projects), o.projectId)}${select(name("goals"), "goalId", options(d.goals), o.goalId)}${select(
          L("Priority", "الأولوية"),
          "priority",
          [
            ["high", L("High", "عالية")],
            ["medium", L("Medium", "متوسطة")],
            ["low", L("Low", "منخفضة")],
          ],
          o.priority || "medium",
        )}${select(
          L("Status", "الحالة"),
          "status",
          [
            ["todo", L("To do", "للتنفيذ")],
            ["doing", L("In progress", "قيد التنفيذ")],
            ["done", L("Done", "مكتملة")],
          ],
          o.status || "todo",
        )}${field(L("Due date", "تاريخ الاستحقاق"), "date", o.date || C.day(), "date", "required")}${field(L("Start date", "تاريخ البداية"), "startDate", o.startDate || C.day(), "date")}${field(L("Scheduled time", "الوقت المخطط"), "startTime", o.startTime || "", "time")}${field(L("Estimated hours", "الوقت المقدر بالساعات"), "estimatedHours", o.estimatedHours || 0, "number", 'min="0" max="10000" step="0.25"')}${field(L("Momentum impact", "أثر الزخم"), "impact", o.impact ?? 10, "number", 'min="0" max="100"')}${field(L("Goal progress impact (%)", "أثر تقدم الهدف (%)"), "progressImpact", o.progressImpact ?? 1, "number", 'min="0" max="100" step="0.5"')}${select(
          L("Repeat after completion", "تكرار بعد الإكمال"),
          "recurring",
          [
            ["none", L("No repeat", "بلا تكرار")],
            ["daily", L("Daily", "يومي")],
            ["weekly", L("Weekly", "أسبوعي")],
            ["monthly", L("Monthly", "شهري")],
          ],
          o.recurring || "none",
        )}</div>` +
        field(
          L("Tags · comma separated", "الوسوم · مفصولة بفواصل"),
          "tags",
          o.tags || "",
        ) +
        area(
          L(
            "Subtasks · one per line, prefix completed items with [x]",
            "المهام الفرعية · سطر لكل مهمة، ابدأ المكتملة بـ [x]",
          ),
          "subtaskText",
          (o.subtasks || [])
            .map((s) => (s.done ? "[x] " : "") + s.title)
            .join("\n"),
        ) +
        area(L("Notes", "ملاحظات"), "notes", o.notes || "") +
        (existing
          ? `<div class="lx-info">${L("Actual time", "الوقت الفعلي")}: ${hrs(C.duration(C.reportSessions(d), 0, Infinity, (s) => s.taskId === id))} · ${L("Difference from estimate", "الفرق عن التقدير")}: ${(C.duration(C.reportSessions(d), 0, Infinity, (s) => s.taskId === id) / 3600000 - (o.estimatedHours || 0)).toFixed(2)} ${L("hours", "ساعة")}</div>`
          : "");
    if (kind === "projects")
      body +=
        area(
          L("Desired outcome", "النتيجة المطلوبة"),
          "description",
          o.description || "",
        ) +
        field(
          L("Deadline", "الموعد النهائي"),
          "deadline",
          o.deadline || "",
          "date",
        ) +
        field(
          L("People · names", "الأشخاص · الأسماء"),
          "people",
          o.people || "",
        ) +
        area(L("Project notes", "ملاحظات المشروع"), "notes", o.notes || "");
    if (kind === "goals")
      body +=
        area(
          L("Why does this matter?", "لماذا يهمك هذا الهدف؟"),
          "why",
          o.why || "",
        ) +
        `<div class="lx-fields-two">${select(name("projects"), "projectId", options(d.projects), o.projectId)}${select(
          L("Horizon", "الأفق الزمني"),
          "horizon",
          [
            ["annual", L("Annual", "سنوي")],
            ["quarterly", L("Quarterly", "ربع سنوي")],
            ["monthly", L("Monthly", "شهري")],
            ["weekly", L("Weekly", "أسبوعي")],
          ],
          o.horizon || "annual",
        )}${select(
          L("Domain", "المجال"),
          "category",
          d.categories.map((c) => [c, catName(c)]),
          o.category || "Personal",
        )}${field(L("Deadline", "الموعد النهائي"), "deadline", o.deadline || "", "date")}${field(L("Target hours", "الساعات المستهدفة"), "targetHours", o.targetHours || 0, "number", 'min="0" max="100000" step="0.5"')}${field(L("Outcome progress (%)", "تقدم النتيجة (%)"), "progress", o.progress || 0, "number", 'min="0" max="100" step="0.5"')}</div>` +
        ["m6", "m3", "month", "week"]
          .map((k, i) =>
            field(
              L(
                [
                  "Six months milestone",
                  "Quarter milestone",
                  "Month milestone",
                  "Week milestone",
                ][i],
                [
                  "مرحلة ستة أشهر",
                  "مرحلة ربع السنة",
                  "مرحلة الشهر",
                  "مرحلة الأسبوع",
                ][i],
              ),
              k,
              o.plan?.[k] || "",
            ),
          )
          .join("") +
        area(L("Notes", "ملاحظات"), "notes", o.notes || "");
    if (kind === "events")
      body +=
        `<div class="lx-fields-two">${field(L("Date", "التاريخ"), "date", o.date || calendarDay, "date", "required")}${select(
          L("Type", "النوع"),
          "type",
          [
            ["event", L("Event", "حدث")],
            ["meeting", L("Meeting", "اجتماع")],
          ],
          o.type || "event",
        )}${field(L("Start", "البداية"), "startTime", o.startTime || "09:00", "time", "required")}${field(L("End", "النهاية"), "endTime", o.endTime || "10:00", "time", "required")}</div>` +
        field(
          L("People / location", "الأشخاص / المكان"),
          "people",
          o.people || "",
        ) +
        area(
          L("Agenda & meeting notes", "جدول الأعمال وملاحظات الاجتماع"),
          "notes",
          o.notes || "",
        );
    if (kind === "notes")
      body +=
        select(
          name("projects"),
          "projectId",
          options(d.projects),
          o.projectId,
        ) + area(L("Note", "الملاحظة"), "body", o.body || "");
    if (kind === "inbox")
      body += area(L("Details", "التفاصيل"), "body", o.body || "");
    if (kind === "habits")
      body +=
        area(
          L("Intention / routine steps", "النية / خطوات الروتين"),
          "description",
          o.description || "",
        ) +
        field(
          L("Daily scheduled time", "الوقت اليومي المخطط"),
          "time",
          o.time || "07:00",
          "time",
        );
    if (kind === "finances")
      body +=
        `<div class="lx-fields-two">${select(
          L("Type", "النوع"),
          "type",
          [
            ["income", L("Income", "دخل")],
            ["expense", L("Expense", "مصروف")],
          ],
          o.type || "expense",
        )}${field(L("Amount", "المبلغ"), "amount", o.amount || "", "number", 'required min="0.01" step="0.01"')}${field(L("Date", "التاريخ"), "date", o.date || C.day(), "date", "required")}</div>` +
        field(
          L(
            "Category · match your allocation name",
            "التصنيف · استخدم اسم بند التوزيع",
          ),
          "category",
          o.category || "",
          "text",
          'list="lxBudgetCategories"',
        ) +
        `<datalist id="lxBudgetCategories">${budgetRows(db.read())
          .map((b) => `<option value="${esc(b.name)}"></option>`)
          .join("")}</datalist>` +
        area(L("Notes", "ملاحظات"), "notes", o.notes || "");
    if (kind === "health")
      body +=
        select(
          L("Metric", "المقياس"),
          "metric",
          [
            ["sleep", L("Sleep (hours)", "النوم (ساعات)")],
            ["exercise", L("Exercise (minutes)", "الرياضة (دقائق)")],
            ["water", L("Water (liters)", "الماء (لترات)")],
            ["weight", L("Weight (kg)", "الوزن (كغ)")],
          ],
          o.metric || "sleep",
        ) +
        field(
          L("Value", "القيمة"),
          "value",
          o.value || "",
          "number",
          'min="0" step="0.1" required',
        ) +
        field(
          L("Date", "التاريخ"),
          "date",
          o.date || C.day(),
          "date",
          "required",
        ) +
        area(L("Notes", "ملاحظات"), "notes", o.notes || "");
    if (kind === "learning")
      body +=
        select(
          L("Type", "النوع"),
          "type",
          [
            ["course", L("Course", "دورة")],
            ["book", L("Book", "كتاب")],
          ],
          o.type || "book",
        ) +
        field(
          L("Author / source", "المؤلف / المصدر"),
          "author",
          o.author || "",
        ) +
        select(
          L("Status", "الحالة"),
          "status",
          [
            ["planned", L("Planned", "مخطط")],
            ["in-progress", L("In progress", "قيد التقدم")],
            ["completed", L("Completed", "مكتمل")],
          ],
          o.status || "planned",
        ) +
        field(
          L("Progress (%)", "التقدم (%)"),
          "progress",
          o.progress || 0,
          "number",
          'min="0" max="100"',
        ) +
        area(L("Learning notes", "ملاحظات التعلم"), "notes", o.notes || "");
    if (["tasks", "projects", "notes"].includes(kind))
      body += `<label class="lx-field"><span>${L("Attachment · up to 500 KB each, 3 per item", "مرفق · حتى 500 كيلوبايت لكل ملف، 3 للعنصر")}</span><input type="file" name="attachment"></label><p class="lx-muted">${(o.attachments || []).map((f) => esc(f.name)).join(" · ")}</p>${files(o, kind)}`;
    modal(
      (existing ? L("Edit · ", "تعديل · ") : L("New · ", "جديد · ")) +
        name(kind),
      `<form id="lxEntityForm" data-kind="${kind}" data-id="${id}" data-source="${esc(seed.sourceInbox || "")}">${body}${endForm(!!existing, kind, id)}</form>`,
    );
  }
  function manualDialog() {
    const d = db.read();
    modal(
      L("Add time manually", "إضافة وقت يدوي"),
      `<form id="lxManualForm">${field(L("What did you work on?", "على ماذا عملت؟"), "title", "", "text", "required")}${linkFields(d)}${select(
        L("Category", "التصنيف"),
        "categoryId",
        d.categories.map((c) => [c, catName(c)]),
        "Deep Work",
      )}<div class="lx-fields-two">${field(L("Start date & time", "تاريخ ووقت البداية"), "start", C.day() + "T09:00", "datetime-local", "required")}${field(L("End date & time", "تاريخ ووقت النهاية"), "end", C.day() + "T10:00", "datetime-local", "required")}</div>${area(L("Notes", "ملاحظات"), "notes")}${endForm(false)}</form>`,
    );
  }
  async function finish() {
    flushSaves();
    await mutate((d) => C.transition(d, "pause"), false);
    const a = db.read()?.activeSession;
    if (!a) return;
    modal(
      L("A meaningful step forward.", "خطوة حقيقية إلى الأمام."),
      `<form id="lxSummaryForm" data-id="${a.id}"><div class="lx-stats">${stat(L("Focus time", "وقت التركيز"), fmt(C.elapsed(a)))}${stat(L("Target", "المستهدف"), a.targetDuration ? hrs(a.targetDuration) : "—")}${stat(L("Completion", "الإتمام"), a.targetDuration ? percent(C.elapsed(a), a.targetDuration) + "%" : "—")}${stat(L("Distractions", "المشتتات"), a.distractions.length)}</div><p>${esc(a.title || db.read().tasks.find((t) => t.id === a.taskId)?.title || "")}</p><p>${name("projects")}: ${esc(db.read().projects.find((p) => p.id === a.projectId)?.name || "—")} · ${name("goals")}: ${esc(db.read().goals.find((g) => g.id === a.goalId)?.name || "—")}</p>${area(L("What did you accomplish?", "ماذا أنجزت؟"), "notes", a.notes)}<div class="lx-fields-two">${select(
        L("Energy level", "مستوى الطاقة"),
        "energyScore",
        [
          ["low", L("Low", "منخفض")],
          ["medium", L("Medium", "متوسط")],
          ["high", L("High", "عالٍ")],
        ],
        "medium",
      )}${select(L("Focus quality · 1 to 5", "جودة التركيز · من 1 إلى 5"), "focusScore", [1, 2, 3, 4, 5], 4)}</div><div class="lx-dialog-footer">${btn(L("Back to session", "العودة للجلسة"), "close")}<button type="submit" class="lx-btn lx-primary">${L("Save session", "حفظ الجلسة")}</button></div></form>`,
    );
  }
  function settingsPanel(d) {
    let panel = $("#lxSettings");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "lxSettings";
      panel.className = "lx-card lx-margin";
      document.querySelector('[data-view-panel="account"]').prepend(panel);
    }
    panel.innerHTML = `<h2>${L("Your operating preferences", "تفضيلات نظامك")}</h2><form id="lxSettingsForm"><div class="lx-fields-three">${select(
      L("Theme", "المظهر"),
      "theme",
      [
        ["system", L("System", "النظام")],
        ["dark", L("Dark", "داكن")],
        ["light", L("Light", "فاتح")],
      ],
      d.settings.theme,
    )}${select(
      L("Time format", "تنسيق الوقت"),
      "timeFormat",
      [
        ["24", L("24 hour", "24 ساعة")],
        ["12", L("12 hour", "12 ساعة")],
      ],
      d.settings.timeFormat,
    )}${select(
      L("Week starts", "بداية الأسبوع"),
      "weekStart",
      [
        [1, L("Monday", "الاثنين")],
        [0, L("Sunday", "الأحد")],
        [6, L("Saturday", "السبت")],
      ],
      d.settings.weekStart,
    )}${field(L("Daily deep work (hours)", "العمل العميق اليومي (ساعات)"), "dailyHours", d.settings.dailyHours, "number", 'min="0.5" max="24" step="0.5" required')}${field(L("Weekly deep work (hours)", "العمل العميق الأسبوعي (ساعات)"), "weeklyHours", d.settings.weeklyHours, "number", 'min="1" max="168" step="0.5" required')}${field(L("Daily summary time · in-app", "موعد ملخص اليوم · داخل التطبيق"), "summaryTime", d.settings.summaryTime || "20:00", "time")}${field(L("Currency", "العملة"), "currency", d.settings.currency, "text", 'required minlength="3" maxlength="3"')}</div><h3>Pomodoro</h3><div class="lx-fields-two">${field(L("Focus minutes", "دقائق التركيز"), "focusMinutes", d.settings.focusMinutes, "number", 'min="1" max="240" required')}${field(L("Short break minutes", "دقائق الراحة القصيرة"), "shortBreak", d.settings.shortBreak, "number", 'min="1" max="60" required')}${field(L("Long break minutes", "دقائق الراحة الطويلة"), "longBreak", d.settings.longBreak, "number", 'min="1" max="120" required')}${field(L("Sessions before long break", "جلسات قبل الراحة الطويلة"), "cycles", d.settings.cycles, "number", 'min="1" max="12" step="1" required')}</div><div class="lx-fields-two">${[
      ["autoBreak", L("Auto-start breaks", "بدء الراحة تلقائيًا")],
      ["autoFocus", L("Auto-start next focus", "بدء التركيز التالي تلقائيًا")],
      ["sound", L("Completion sound", "صوت الاكتمال")],
      ["notifications", L("In-app notifications", "تنبيهات داخل التطبيق")],
    ]
      .map(
        ([k, t]) =>
          `<label class="lx-switch"><input type="checkbox" name="${k}" ${d.settings[k] ? "checked" : ""}>${t}</label>`,
      )
      .join(
        "",
      )}</div><p class="lx-muted">${L("Changes apply to the next session. Automatic cycles include elapsed time while the device sleeps. Notifications and sound are delivered when the app is awake.", "تطبق التغييرات على الجلسة التالية. الدورات التلقائية تشمل الوقت المنقضي أثناء سكون الجهاز. تصل التنبيهات والأصوات عندما يكون التطبيق نشطًا.")}</p>${area(L("Time categories · one per line", "تصنيفات الوقت · تصنيف في كل سطر"), "categories", d.categories.join("\n"))}<button class="lx-btn lx-primary" type="submit">${L("Save preferences", "حفظ التفضيلات")}</button></form><hr><p>${L("Local workspace. Your data stays in this browser; no cloud sync or remote account protection. Export regularly. Import preserves your login and saves a recovery copy first.", "مساحة عمل محلية. بياناتك في هذا المتصفح؛ لا توجد مزامنة سحابية أو حماية حساب على خادم. صدّر بياناتك دوريًا. الاستيراد يحفظ بيانات الدخول وينشئ نسخة استعادة أولًا.")}</p>${btn(L("Restore previous import", "استعادة ما قبل الاستيراد"), "restore-import")}`;
  }
  function command(quick = false) {
    const dialog = $("#lxCommand");
    dialog.innerHTML = `<div class="lx-dialog-head"><h2>${quick ? L("Quick add", "إضافة سريعة") : L("Search & commands", "البحث والأوامر")}</h2>${btn("×", "close-command", 'aria-label="' + L("Close", "إغلاق") + '"')}</div><label class="lx-field"><span>${L("Find tasks, projects, goals, notes, events or sessions", "ابحث في المهام والمشاريع والأهداف والملاحظات والأحداث والجلسات")}</span><input id="lxSearch" autocomplete="off" placeholder="${L("Type to search…", "اكتب للبحث…")}"></label><div id="lxSearchResults"></div>`;
    dialog.showModal();
    commandResults("");
    $("#lxSearch").focus();
  }
  function commandResults(q) {
    const d = db.read(),
      query = q.toLowerCase();
    let items = [
      ...["tasks", "projects", "goals", "notes", "events", "inbox"].map(
        (k) => ({
          title: L("Create ", "إنشاء ") + name(k),
          action: "new",
          kind: k,
        }),
      ),
      {
        title: L("Start focus", "بدء التركيز"),
        action: "navigate",
        to: "focus",
      },
      { title: L("Start Pomodoro", "بدء بومودورو"), action: "pomodoro" },
      { title: L("Add time manually", "إضافة وقت يدوي"), action: "manual" },
      ...Object.keys(labels).map((k) => ({
        title: name(k),
        action: "navigate",
        to: k,
      })),
    ];
    if (query)
      for (const kind of [
        "tasks",
        "projects",
        "goals",
        "notes",
        "events",
        "sessions",
      ])
        for (const o of d[kind])
          items.push({
            title:
              o.title || o.name || o.notes || L("Focus session", "جلسة تركيز"),
            action: kind === "sessions" ? "session-detail" : "edit",
            kind,
            id: o.id,
          });
    items = items
      .filter((i) => i.title.toLowerCase().includes(query))
      .slice(0, 35);
    $("#lxSearchResults").innerHTML =
      items
        .map(
          (i) =>
            `<button class="lx-command-result" data-action="${i.action}" data-kind="${i.kind || ""}" data-id="${i.id || ""}" data-to="${i.to || ""}"><span>${esc(i.title)}</span><small>${name(i.kind || i.to || "focus")}</small></button>`,
        )
        .join("") ||
      `<p>${L("No matching results.", "لا توجد نتائج مطابقة.")}</p>`;
  }
  function keys(e) {
    if (!db.read()) return;
    const editing = e.target.closest(
      "input,textarea,select,[contenteditable=true]",
    );
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      command();
      return;
    }
    if (
      editing ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.repeat ||
      $("dialog[open]")
    )
      return;
    if (e.code === "Space" && route === "focus" && db.read()?.activeSession) {
      e.preventDefault();
      const a = db.read().activeSession;
      mutate((d) =>
        C.transition(d, a.segmentStartedAt === null ? "resume" : "pause"),
      );
      return;
    }
    if (e.key.toLowerCase() === "f") navigate("focus");
    if (e.key.toLowerCase() === "t") editor("tasks");
    if (e.key.toLowerCase() === "n") editor("notes");
  }
  async function onClick(e) {
    if (!db.read()) return;
    const b = e.target.closest("button,[data-route]");
    if (!b) return;
    if (b.id === "logoutBtn") {
      flushSaves();
      $("#lxMini")?.classList.add("hidden");
      document.body.classList.remove("lx-focusing");
      route = "home";
      detail = "";
      return;
    }
    if (b.matches("[data-add-goal],[data-add-task]")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      editor(b.hasAttribute("data-add-goal") ? "goals" : "tasks");
      return;
    }
    if (b.dataset.route) {
      e.preventDefault();
      e.stopImmediatePropagation();
      navigate(b.dataset.route, b.dataset.id || "");
      return;
    }
    if (b.dataset.task) {
      e.preventDefault();
      e.stopImmediatePropagation();
      await mutate((d) => C.completeTask(d, b.dataset.task));
      window.LifeLegacy.renderAll();
      return;
    }
    const a = b.dataset.action;
    if (!a) return;
    flushSaves();
    e.preventDefault();
    e.stopImmediatePropagation();
    const id = b.dataset.id,
      kind = b.dataset.kind;
    if (a !== "close-command" && b.closest("#lxCommand"))
      $("#lxCommand").close();
    if (a === "navigate") navigate(b.dataset.to);
    if (a === "language") window.LifeLegacy.toggleLang();
    if (a === "new") editor(kind, "", { projectId: b.dataset.project || "" });
    if (a === "edit") editor(kind, id);
    if (a === "close") $("#lxDialog").close();
    if (a === "close-command") $("#lxCommand").close();
    if (a === "command" || a === "quick") command(a === "quick");
    if (a === "menu")
      modal(
        L("Your workspace", "مساحة عملك"),
        `<div class="lx-menu-grid">${["home", "goals", "tasks", "focus", "analytics"]
          .map(k => btn(icon(k) + name(k), "navigate", `data-to="${k}"`)).join("")}</div>
          <details class="lx-nav-more"><summary>${L("More", "المزيد")}</summary><div class="lx-menu-grid">${Object.keys(labels)
          .filter(k => !["home", "goals", "tasks", "focus", "analytics", "account"].includes(k))
          .map(k => btn(icon(k) + name(k), "navigate", `data-to="${k}"`)).join("")}</div></details>
          ${btn(name("account"), "navigate", 'data-to="account"')}`,
      );
    if (a === "more-sessions") {
      historyLimit += 50;
      render();
    }
    if (a === "manual") manualDialog();
    if (a === "filter") {
      taskFilter = b.dataset.filter;
      render();
    }
    if (a === "calendar-mode") {
      calendarMode = b.dataset.mode;
      render();
    }
    if (a === "planning-mode") navigate("planning", b.dataset.mode);
    if (a === "preset")
      $("#lxFocusForm [name=targetMinutes]").value = b.dataset.minutes;
    if (a === "pomodoro") {
      navigate("focus");
      if ($("#lxFocusForm")) $("#lxFocusForm [name=type]").value = "pomodoro";
    }
    if (a === "task-focus") {
      if (db.read().activeSession) {
        activeDialog();
        return;
      }
      navigate("focus");
      $("#lxFocusForm [name=taskId]").value = id;
      syncLinks($("#lxFocusForm"), "taskId");
    }
    if (a === "session-finish") {
      await finish();
      return;
    }
    if (a === "session-cancel") {
      modal(
        L("Cancel this session?", "إلغاء هذه الجلسة؟"),
        `<p>${L("Tracked time will be discarded. Captured distractions remain in your Inbox.", "سيتم تجاهل وقت الجلسة. تبقى الأفكار المسجلة في الوارد.")}</p><div class="lx-actions">${btn(L("Keep focusing", "متابعة التركيز"), "close")}${btn(L("Discard session", "تجاهل الجلسة"), "confirm-cancel")}</div>`,
      );
      return;
    }
    if (a === "confirm-cancel") {
      if (await mutate((d) => C.transition(d, "cancel")))
        $("#lxDialog").close();
      return;
    }
    if (
      [
        "session-pause",
        "session-resume",
        "session-break",
        "session-continue",
        "session-extend",
      ].includes(a)
    )
      await mutate((d) =>
        C.transition(d, a.slice(8), Date.now(), Number(b.dataset.minutes)),
      );
    if (a === "distraction")
      modal(
        L("Capture and return.", "سجّل وعد للتركيز."),
        `<form id="lxDistractionForm">${field(L("What’s on your mind?", "ما الذي يشغلك؟"), "title", "", "text", 'required maxlength="500"')}${endForm(false)}</form>`,
      );
    if (a === "task-toggle") {
      await mutate((d) => C.completeTask(d, id));
      window.LifeLegacy.renderAll();
    }
    if (a === "budget-edit") {
      const bs = budgetRows(db.read());
      modal(
        L("Income allocation", "توزيع الدخل"),
        `<form id="lxBudgetForm"><p>${L("Name each category and choose its percentage. Leave unused rows empty. Total: up to 100%.", "سمّ كل بند وحدد نسبته. اترك الصفوف غير المستخدمة فارغة. المجموع حتى 100%.")}</p><div id="lxBudgetRows">${(bs.length
          ? bs
          : [
              { name: "", percent: "" },
              { name: "", percent: "" },
              { name: "", percent: "" },
            ]
        )
          .map((b, i) => budgetInput(b, i))
          .join(
            "",
          )}</div>${btn(L("Add category", "إضافة بند"), "budget-row")}<button class="lx-btn lx-primary" type="submit">${L("Save allocation", "حفظ التوزيع")}</button></form>`,
      );
    }
    if (a === "budget-row") {
      $("#lxBudgetRows").insertAdjacentHTML(
        "beforeend",
        budgetInput(
          { name: "", percent: "" },
          $("#lxBudgetRows").children.length,
        ),
      );
    }
    if (a === "money-check")
      await mutate((d) => {
        const t = d.settings.moneyTodos?.find((t) => t.id === id);
        if (t) t.done = !t.done;
      });
    if (a === "habit-toggle")
      await mutate((d) => {
        const h = d.habits.find((h) => h.id === id);
        h.checks = h.checks || [];
        h.checks = h.checks.includes(C.day())
          ? h.checks.filter((x) => x !== C.day())
          : [...h.checks, C.day()];
      });
    if (a === "convert") {
      const target = document.querySelector(`[name="convert-${id}"]`).value;
      const item = db.read().inbox.find((x) => x.id === id);
      editor(target, "", {
        title: item.title,
        name: item.title,
        body: item.body,
        sourceInbox: id,
      });
    }
    if (a === "archive") {
      modal(
        L("Archive this item?", "أرشفة هذا العنصر؟"),
        `<p>${L("The record and its time history are preserved. Restore it from search by editing and saving.", "سيبقى السجل وتاريخه محفوظين. يمكنك استعادته من البحث بتعديله وحفظه.")}</p>${btn(L("Cancel", "إلغاء"), "close")}${btn(L("Archive", "أرشفة"), "confirm-archive", `data-kind="${kind}" data-id="${id}"`)}`,
      );
    }
    if (a === "confirm-archive") {
      await mutate((d) => {
        d[kind].find((x) => x.id === id).archived = true;
      });
      $("#lxDialog").close();
    }
    if (a === "session-detail") {
      const s = db.read().sessions.find((s) => s.id === id);
      if (!s) return;
      modal(
        L("Session summary", "ملخص الجلسة"),
        `<div class="lx-stats">${stat(L("Focus time", "وقت التركيز"), fmt(C.duration([s])))}${stat(L("Focus quality", "جودة التركيز"), s.focusScore ? s.focusScore + "/5" : "—")}${stat(L("Energy", "الطاقة"), esc(s.energyScore || "—"))}</div><p>${dateText(C.day(s.startedAt))} · ${timeText(s.startedAt)} — ${timeText(s.endedAt)}</p><p class="lx-pre">${esc(s.notes || L("No notes for this session.", "لا توجد ملاحظات لهذه الجلسة."))}</p>${btn(L("Close", "إغلاق"), "close")}`,
      );
    }
    if (a === "download-file") {
      const f = db.read()[kind]?.find((x) => x.id === id)?.attachments?.[
        Number(b.dataset.index)
      ];
      if (f && /^data:/.test(f.data)) {
        const anchor = document.createElement("a");
        anchor.href = f.data;
        anchor.download = f.name;
        anchor.click();
      }
    }
    if (a === "restore-import") {
      const raw = localStorage.getItem(
        "lifeos_recovery_" + localStorage.getItem(C.SESSION_KEY),
      );
      if (!raw) {
        notice(L("No recovery copy available.", "لا توجد نسخة استعادة."));
        return;
      }
      modal(
        L("Restore previous data?", "استعادة البيانات السابقة؟"),
        `<p>${L("Current data will be replaced with the copy made before the last import. Export current data first.", "ستستبدل البيانات الحالية بالنسخة السابقة للاستيراد. صدّر البيانات الحالية أولًا.")}</p>${btn(L("Cancel", "إلغاء"), "close")}${btn(L("Restore", "استعادة"), "confirm-restore")}`,
      );
    }
    if (a === "confirm-restore") {
      const restored = JSON.parse(
        localStorage.getItem(
          "lifeos_recovery_" + localStorage.getItem(C.SESSION_KEY),
        ),
      );
      await mutate((d) => {
        for (const k of Object.keys(d)) delete d[k];
        Object.assign(d, C.migrate(restored));
      });
      $("#lxDialog").close();
      window.LifeLegacy.applyLang();
    }
  }
  function activeDialog() {
    modal(
      L("You already have an active session.", "لديك جلسة تركيز نشطة."),
      `<p>${L("Keep one clear focus. Resume or finish your current session first.", "حافظ على تركيز واحد. استأنف جلستك الحالية أو أنهها أولًا.")}</p><div class="lx-actions">${btn(L("Resume", "استئناف"), "navigate", 'data-to="focus"', true)}${btn(L("Finish current session", "إنهاء الجلسة الحالية"), "session-finish")}${btn(L("Cancel", "إلغاء"), "close")}</div>`,
    );
  }
  async function submit(e) {
    const form = e.target;
    if (!form.id.startsWith("lx")) return;
    e.preventDefault();
    flushSaves();
    const data = Object.fromEntries(new FormData(form));
    const submitButton = form.querySelector("[type=submit]");
    if (submitButton) submitButton.disabled = true;
    let result;
    try {
      if (form.id === "lxBudgetForm") {
        const budget = Array.from(form.querySelectorAll("[data-budget-row]"))
          .map((row) => ({
            name: row.querySelector("[data-budget-name]").value.trim(),
            percent: row.querySelector("[data-budget-percent]").value,
          }))
          .filter((item) => item.name || Number(item.percent));
        let allocation;
        try {
          if (budget.some((item) => item.percent === ""))
            throw Error("invalidBudget");
          allocation = C.allocateBudget(0, budget);
        } catch {
          notice(
            L(
              "Use unique categories and valid percentages (up to two decimals), totaling at most 100%.",
              "استخدم بنودًا غير مكررة ونسبًا صحيحة بمنزلتين عشريتين كحد أقصى، ومجموع لا يتجاوز 100%.",
            ),
            true,
          );
          return;
        }
        result = await mutate((d) => {
          d.settings.budget = allocation.map(({ name, percent }) => ({
            name,
            percent,
          }));
        });
        if (result) {
          $("#lxDialog").close();
          notice(L("Allocation updated", "تم تحديث توزيع الدخل"));
        }
      }
      if (form.id === "lxMoneyTodo") {
        if (!data.title.trim()) return;
        await mutate((d) => {
          d.settings.moneyTodos = d.settings.moneyTodos || [];
          d.settings.moneyTodos.push({
            id: C.id(),
            title: data.title.trim(),
            amount: Math.max(0, Number(data.amount) || 0),
            done: false,
          });
        });
      }
      if (form.id === "lxFocusForm") {
        result = await mutate((d) => C.createSession(d, data));
        if (result) navigate("focus");
        else if (db.read()?.activeSession) activeDialog();
      }
      if (form.id === "lxEntityForm") {
        const kind = form.dataset.kind,
          id = form.dataset.id;
        let attachment;
        const f = data.attachment;
        if (f?.size) {
          if (f.size > 512000) throw Error("fileTooLarge");
          attachment = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () =>
              resolve({ name: f.name, data: r.result, size: f.size });
            r.onerror = reject;
            r.readAsDataURL(f);
          });
        }
        delete data.attachment;
        for (const k of [
          "estimatedHours",
          "impact",
          "progressImpact",
          "targetHours",
          "progress",
          "amount",
          "value",
        ])
          if (k in data) data[k] = Number(data[k]);
        if (!String(data.name || data.title || "").trim()) {
          notice(L("Enter a title.", "أدخل عنوانًا."), true);
          return;
        }
        if (kind === "events" && data.endTime <= data.startTime) {
          notice(
            L(
              "End time must be after start time.",
              "يجب أن يكون وقت النهاية بعد البداية.",
            ),
            true,
          );
          return;
        }
        result = await mutate((d) => {
          const old = d[kind].find((x) => x.id === id),
            item = old || { id: C.id(), createdAt: Date.now() };
          const wasDone = !!item.done;
          if (
            kind === "tasks" &&
            wasDone &&
            (item.goalId !== data.goalId ||
              item.impact !== data.impact ||
              item.progressImpact !== data.progressImpact)
          )
            C.completeTask(d, id, false);
          Object.assign(item, data, { updatedAt: Date.now(), archived: false });
          if (attachment) {
            if ((item.attachments || []).length >= 3)
              throw Error("fileTooLarge");
            item.attachments = [...(item.attachments || []), attachment];
          }
          if (kind === "goals") {
            item.plan = {
              m6: data.m6,
              m3: data.m3,
              month: data.month,
              week: data.week,
            };
            item.history = item.history || [{ date: C.day(), value: 0 }];
            item.momentum = item.momentum || 0;
            item.color = item.color || "#789b8b";
          }
          if (kind === "tasks") {
            item.subtasks = data.subtaskText
              .split("\n")
              .filter((x) => x.trim())
              .map((x) => ({
                title: x.replace(/^\[x\]\s*/i, ""),
                done: /^\[x\]/i.test(x),
              }));
            if (!old) item.done = false;
          }
          if (!old) d[kind].unshift(item);
          if (kind === "tasks")
            C.completeTask(d, item.id, data.status === "done");
          if (form.dataset.source) {
            const source = d.inbox.find((x) => x.id === form.dataset.source);
            source.archived = true;
            source.convertedTo = { kind, id: item.id };
          }
          return item;
        });
        if (result) {
          $("#lxDialog").close();
          window.LifeLegacy.renderAll();
          notice(
            kind === "finances" && data.type === "income"
              ? L(
                  "Income saved. Your allocation amounts are updated in Finances.",
                  "حُفظ الدخل. تم تحديث مبالغ التوزيع في صفحة المال.",
                )
              : L("Saved", "تم الحفظ"),
          );
        }
      }
      if (form.id === "lxManualForm") {
        result = await mutate((d) => {
          const task = d.tasks.find((t) => t.id === data.taskId),
            goal = d.goals.find((g) => g.id === (task?.goalId || data.goalId));
          return C.manual(d, {
            ...data,
            taskId: task?.id || "",
            goalId: goal?.id || "",
            projectId: task?.projectId || goal?.projectId || data.projectId,
          });
        });
        if (result) {
          $("#lxDialog").close();
          notice(L("Time saved", "تم حفظ الوقت"));
        }
      }
      if (form.id === "lxSummaryForm") {
        result = await mutate((d) => {
          if (d.activeSession?.id !== form.dataset.id) throw Error("noSession");
          Object.assign(d.activeSession, data, {
            focusScore: Number(data.focusScore),
          });
          return C.transition(d, "finish");
        });
        if (result) {
          $("#lxDialog").close();
          navigate("analytics");
          notice(L("Session saved. Well done.", "حُفظت الجلسة. أحسنت."));
        }
      }
      if (form.id === "lxDistractionForm") {
        result = await mutate((d) => {
          if (!d.activeSession) throw Error("noSession");
          const entry = {
            id: C.id(),
            title: data.title,
            createdAt: Date.now(),
            sessionId: d.activeSession.id,
          };
          d.inbox.unshift(entry);
          d.activeSession.distractions.push(entry.id);
        });
        if (result) {
          $("#lxDialog").close();
          notice(
            L(
              "Captured in Inbox. Back to focus.",
              "تم الحفظ في الوارد. عد للتركيز.",
            ),
          );
        }
      }
      if (form.id === "lxSettingsForm") {
        for (const k of [
          "dailyHours",
          "weeklyHours",
          "focusMinutes",
          "shortBreak",
          "longBreak",
          "cycles",
          "weekStart",
        ])
          data[k] = Number(data[k]);
        for (const k of ["autoBreak", "autoFocus", "sound", "notifications"])
          data[k] = form.elements[k].checked;
        result = await mutate((d) => {
          d.categories = [
            ...new Set([
              ...C.categories,
              ...data.categories
                .split("\n")
                .map((c) => c.trim())
                .filter(Boolean),
              ...d.categories,
            ]),
          ];
          delete data.categories;
          Object.assign(d.settings, data);
        });
        if (result) notice(L("Preferences saved", "تم حفظ التفضيلات"));
      }
    } catch (err) {
      if (err.message === "fileTooLarge")
        notice(
          L(
            "Use up to 3 attachments, each smaller than 500 KB.",
            "استخدم حتى 3 مرفقات، كل منها أقل من 500 كيلوبايت.",
          ),
          true,
        );
      else error(err);
    } finally {
      if (submitButton?.isConnected) submitButton.disabled = false;
    }
  }
  function syncLinks(form, changed) {
    const d = db.read(),
      p = form.elements.projectId,
      g = form.elements.goalId,
      t = form.elements.taskId;
    if (changed === "taskId" && t?.value) {
      const task = d.tasks.find((x) => x.id === t.value);
      if (task) {
        g.value = task.goalId || "";
        p.value =
          task.projectId ||
          d.goals.find((x) => x.id === task.goalId)?.projectId ||
          "";
      }
    }
    if (changed === "goalId") {
      const goal = d.goals.find((x) => x.id === g.value);
      if (goal?.projectId) p.value = goal.projectId;
      if (t) t.value = "";
    }
    if (changed === "projectId") {
      if (
        g?.value &&
        d.goals.find((x) => x.id === g.value)?.projectId !== p.value
      )
        g.value = "";
      if (t) t.value = "";
    }
  }
  function onChange(e) {
    if (e.target.name === "calendarDay") {
      calendarDay = e.target.value || C.day();
      render();
    }
    if (
      ["projectId", "goalId", "taskId"].includes(e.target.name) &&
      e.target.form
    )
      syncLinks(e.target.form, e.target.name);
  }
  function flushSaves() {
    for (const [key, job] of pendingSaves) {
      clearTimeout(job.timer);
      if (job.email === localStorage.getItem(C.SESSION_KEY)) {
        try {
          db.update(job.save);
          if (job.status?.isConnected)
            job.status.textContent = L("Saved", "محفوظ");
        } catch (e) {
          error(e);
          continue;
        }
      }
      pendingSaves.delete(key);
    }
  }
  function onInput(e) {
    if (e.target.id === "lxSearch") {
      commandResults(e.target.value);
      return;
    }
    const form = e.target.closest("#lxPlanForm,#lxReviewForm"),
      note = e.target.dataset.note,
      session = e.target.dataset.autosave === "session";
    if (!form && !note && !session) return;
    const email = localStorage.getItem(C.SESSION_KEY),
      value = e.target.value,
      key = form?.dataset.key,
      values = form ? Object.fromEntries(new FormData(form)) : null,
      sessionId = session ? db.read().activeSession?.id : null,
      token =
        email +
        ":" +
        (form ? form.id + key : note ? "note:" + note : "session:" + sessionId);
    const status = $(
      form ? "#lxPlanSaved" : note ? "#lxNoteSaved" : "#lxSaved",
    );
    if (status) status.textContent = L("Saving…", "جارٍ الحفظ…");
    const save = (d) => {
      if (form) {
        d.planning[key] = {
          ...d.planning[key],
          ...values,
          updatedAt: Date.now(),
        };
        if (
          form.id === "lxPlanForm" &&
          key === "daily:" + C.day() &&
          Number(values.target) > 0
        )
          d.settings.dailyHours = C.num(values.target, 0.5, 24);
      }
      if (note) {
        const n = d.notes.find((x) => x.id === note);
        if (n) {
          n.body = value;
          n.updatedAt = Date.now();
        }
      }
      if (session && d.activeSession?.id === sessionId)
        d.activeSession.notes = value;
    };
    clearTimeout(pendingSaves.get(token)?.timer);
    pendingSaves.set(token, {
      email,
      save,
      status,
      timer: setTimeout(flushSaves, 300),
    });
  }
  window.addEventListener("pagehide", flushSaves);
  window.addEventListener("unhandledrejection", (e) => {
    if (db.read()) error(e.reason || new Error("unexpected"));
  });
  function tickDisplay(d) {
    const a = d.activeSession,
      mini = $("#lxMini");
    if (!mini) return;
    mini.classList.toggle("hidden", !a || route === "focus");
    if (!a) return;
    const duration = C.elapsed(a),
      phase = C.phaseElapsed(a, Date.now()),
      remaining = Math.max(0, a.phaseDuration - phase),
      time =
        (a.phase === "break" || a.type !== "stopwatch") && a.phaseDuration
          ? remaining
          : duration;
    const timer = $("#lxTimer");
    if (timer) {
      timer.textContent = fmt(time);
      $("#lxTimerMeta").textContent =
        (a.phase === "break"
          ? L("Break", "استراحة")
          : a.status === "completed"
            ? L("Target reached", "بلغت الهدف")
            : a.segmentStartedAt === null
              ? L("Paused", "متوقف مؤقتًا")
              : L("In focus", "في التركيز")) +
        " · " +
        L("Worked ", "عملت ") +
        hrs(duration) +
        (a.phaseDuration
          ? " · " +
            L("Target ", "الهدف ") +
            hrs(a.phaseDuration) +
            " · " +
            percent(phase, a.phaseDuration) +
            "%"
          : "");
      const p = $(".lx-timer-progress [role=progressbar]");
      if (p) {
        const v = percent(phase, a.phaseDuration);
        p.setAttribute("aria-valuenow", v);
        p.firstElementChild.style.width = v + "%";
      }
    }
    mini.innerHTML = `<button data-route="focus">${icon("focus")}<strong dir="ltr">${fmt(duration)}</strong><span>${L("Return to focus", "العودة إلى التركيز")}</span></button>`;
  }
  async function tick() {
    const d = db.read();
    if (!d || !mounted || busy) return;
    const a = d.activeSession;
    if (a) {
      const copy = JSON.parse(JSON.stringify(a));
      if (C.reconcile(copy)) {
        busy = true;
        const r = await mutate((latest) => {
          if (latest.activeSession?.id === a.id) {
            const changed = C.reconcile(latest.activeSession);
            return changed;
          }
          return false;
        });
        busy = false;
        if (r?.result && d.settings.notifications) {
          notice(
            copy.phase === "break"
              ? L(
                  "Focus complete. Time to recharge.",
                  "اكتمل التركيز. حان وقت الراحة.",
                )
              : copy.status === "completed"
                ? L(
                    "Target reached. Review your session or keep working.",
                    "بلغت المدة المستهدفة. راجع جلستك أو واصل العمل.",
                  )
                : L(
                    "Break finished. Ready to focus?",
                    "انتهت الراحة. مستعد للتركيز؟",
                  ),
          );
          if (d.settings.sound) playSound();
        }
      }
      tickDisplay(db.read());
    }
    const minute = Math.floor(Date.now() / 60000);
    if (lastTick === minute) return;
    lastTick = minute;
    const tt = totals(d),
      today = C.day();
    const alerts = [];
    const summaryAt = d.settings.summaryTime || "20:00";
    if (
      /^\d{2}:\d{2}$/.test(summaryAt) &&
      new Date().toTimeString().slice(0, 5) >= summaryAt &&
      tt.today > 0
    ) {
      const report = C.dailyReport(d);
      alerts.push({
        id: "work-summary-" + today,
        title: L("Today’s work: ", "عملك اليوم: ") + fmt(report.total),
        body: [...report.goals, ...report.tasks]
          .map((item) => item.title + ": " + fmt(item.duration))
          .join(" · "),
      });
    }
    const due = d.tasks.filter(
      (t) => !t.done && !t.archived && t.date === today,
    );
    if (due.length)
      alerts.push({
        id: "tasks-due-" + today,
        title: due.length + " " + L("tasks due today", "مهام مستحقة اليوم"),
      });
    if (tt.deep >= d.settings.dailyHours * 3600000)
      alerts.push({
        id: "daily-deep-" + today,
        title: L(
          "Daily deep work goal completed",
          "اكتمل هدف العمل العميق اليومي",
        ),
      });
    d.events.forEach((event) => {
      const at = +new Date(event.date + "T" + (event.startTime || "00:00"));
      if (at - Date.now() > 0 && at - Date.now() <= 600000)
        alerts.push({
          id: "event-" + event.id + "-" + event.date,
          title: L("In 10 minutes: ", "خلال 10 دقائق: ") + event.title,
        });
    });
    if (d.settings.notifications && alerts.length) {
      const fresh = alerts.filter(
        (x) => !d.notifications.some((n) => n.id === x.id),
      );
      if (fresh.length) {
        await mutate(
          (x) =>
            fresh.forEach((n) => {
              if (!x.notifications.some((i) => i.id === n.id))
                x.notifications.unshift({
                  ...n,
                  body: n.body || "",
                  type: "info",
                  ts: Date.now(),
                });
            }),
          false,
        );
        notice(fresh.map((x) => x.title).join(" · "));
      }
    }
  }
  function playSound() {
    try {
      const audio = new (window.AudioContext || window.webkitAudioContext)(),
        osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.4);
      osc.start();
      osc.stop(audio.currentTime + 0.4);
      osc.onended = () => audio.close();
    } catch {
      /* Sound is optional; autoplay restrictions must not affect tracking. */
    }
  }
  window.LifeWorkspace = {
    navigate,
    render,
    error,
    importData: async (input) => {
      try {
        const data = C.validateImport(input);
        if (db.read().activeSession) {
          notice(
            L(
              "Finish the active session before importing.",
              "أنهِ الجلسة النشطة قبل الاستيراد.",
            ),
            true,
          );
          return;
        }
        modal(
          L("Import this backup?", "استيراد هذه النسخة؟"),
          `<p>${L("Your current workspace will be replaced. A recovery copy is kept on this device; your login stays unchanged.", "ستستبدل مساحة العمل الحالية. ستُحفظ نسخة استعادة على هذا الجهاز، ولن تتغير بيانات دخولك.")}</p><p>${data.tasks.length} ${name("tasks")} · ${data.goals.length} ${name("goals")} · ${data.sessions.length} ${L("sessions", "جلسات")}</p><div class="lx-actions">${btn(L("Cancel", "إلغاء"), "close")}<button id="lxConfirmImport" class="lx-btn lx-primary">${L("Import", "استيراد")}</button></div>`,
        );
        $("#lxConfirmImport").onclick = async () => {
          const previous = db.read();
          try {
            localStorage.setItem(
              "lifeos_recovery_" + localStorage.getItem(C.SESSION_KEY),
              JSON.stringify(previous),
            );
            const r = await mutate((d) => {
              data.profile.email = d.profile.email;
              for (const k of Object.keys(d)) delete d[k];
              Object.assign(d, data);
            });
            if (r) {
              $("#lxDialog").close();
              window.LifeLegacy.applyLang();
              notice(L("Backup imported", "تم استيراد النسخة"));
            }
          } catch (e) {
            error(e);
          }
        };
      } catch (e) {
        error(e);
      }
    },
  };
  document.addEventListener("lifeos:render", () => {
    if (db.read()) {
      mount();
      render();
    }
  });
  if (db.read()) {
    mount();
    const [r, i] = location.hash.slice(1).split("/");
    navigate(labels[r] ? r : "home", i || "");
  }
})();
