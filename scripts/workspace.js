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
  const ADMIN_EMAILS = ["mohamedsnobri5@gmail.com"];
  const currentEmail = () => localStorage.getItem(C.SESSION_KEY) || "";
  const isAdmin = () => {
    const email = currentEmail().toLowerCase();
    if (ADMIN_EMAILS.includes(email)) return true;
    try { const s = window.NorthAuth?.cachedUser; if (s && ADMIN_EMAILS.includes(s.email?.toLowerCase())) return true; } catch {}
    return false;
  };
  const userTier = () => {
    if (isAdmin()) return "pro";
    return localStorage.getItem("thenorth_tier") || "core";
  };
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
    planning: ["Planning", "التخطيط"],
    finances: ["Finances", "المال"],
    health: ["Health", "الصحة"],
    learning: ["Learning & reading", "التعلم والقراءة"],
    dashboard: ["Momentum", "زخم الأهداف"],
    planner: ["Goal cascade", "خطة الأهداف"],
    notifications: ["Signals", "الإشارات"],
    account: ["Settings", "الإعدادات"],
  };
  const primaryRoutes = ["home", "goals", "tasks", "focus", "analytics", "finances"];
  const secondaryRoutes = Object.keys(labels).filter(k => !primaryRoutes.includes(k) && k !== "account");
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
      '<header id="lxTopbar" class="lx-topbar lx-desktop-only"></header>',
    );
    $(".app-main").prepend($("#lxTopbar"));
    document.body.insertAdjacentHTML(
      "beforeend",
      '<dialog id="lxDialog" class="lx-dialog" aria-labelledby="lxDialogTitle"></dialog><dialog id="lxCommand" class="lx-dialog lx-command" aria-label="Search"></dialog><div id="lxNotice" class="lx-notice" role="status" aria-live="polite"></div><div id="lxMini" class="lx-mini hidden"></div>',
    );
    $("#toast").setAttribute("role", "status");
    $("#toast").setAttribute("aria-live", "polite");
    $("#lxDialog").addEventListener("click", (e) => {
      const rect = $("#lxDialog").getBoundingClientRect();
      const inDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!inDialog) $("#lxDialog").close();
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
    const primary = primaryRoutes;
    const secondary = secondaryRoutes;
    $(".side-nav").innerHTML = primary.map(navItem).join("") +
      `<details class="lx-nav-more" ${secondary.includes(route) ? "open" : ""}><summary>${L("More", "المزيد")}</summary>${secondary.map(navItem).join("")}</details>`;
    const dockIcon = (k) => {
      const flat = {
        home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
        goals: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M16.5 7.5 21 3"/>',
        tasks: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/><path d="M8 8h8M8 16h4"/>',
        focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4M12 2v2"/>',
        more: '<path d="M5 6h14M5 12h14M5 18h14"/>'
      };
      if (flat[k]) return `<svg viewBox="0 0 24 24" aria-hidden="true">${flat[k]}</svg>`;
      return `<svg viewBox="0 0 24 24" aria-hidden="true">${icon(k)}</svg>`;
    };
    const mobileRoutes = ["home", "goals", "tasks", "focus"];
    $(".bottom-nav").innerHTML = mobileRoutes.map(k =>
      `<button class="bottom-item ${route === k ? "active" : ""}" data-route="${k}" aria-label="${name(k)}" ${route === k ? 'aria-current="page"' : ""}>${dockIcon(k)}<small>${name(k)}</small></button>`).join("") +
      `<button class="bottom-item ${!mobileRoutes.includes(route) ? "active" : ""}" data-action="menu" aria-haspopup="dialog" aria-label="${L("More sections", "المزيد من الأقسام")}">${dockIcon("more")}<small>${L("More", "المزيد")}</small></button>`;
    // Desktop topbar: breadcrumb + actions (hidden on mobile via CSS)
    $("#lxTopbar").innerHTML =
      `<div class="lx-topbar-brand"><span class="brand-mark lifeos-mark" aria-hidden="true"></span><div class="lx-breadcrumb">THE NORTH <span>/</span> ${name(route)}</div></div><div class="lx-top-actions"><button class="lx-btn lx-menu-button" data-action="menu">${icon("tasks")}${L("Explore","الأقسام")}</button>${btn(icon("inbox")+L("Search","بحث"),"command",'aria-label="'+L("Search, Control K","بحث، Control K")+'"')}${btn(ar()?"EN":"عربي","language")}${btn(icon("account"),"navigate",'data-to="account" aria-label="'+name("account")+'"')}</div>`;
    // Mobile header: hide the big wordmark text, show page name as small label
    const mh = $(".mobile-header");
    if (mh) {
      const wordmark = mh.querySelector(".north-name");
      if (wordmark) wordmark.style.display = "none";
      let pageLabel = mh.querySelector(".lx-mobile-page");
      if (!pageLabel) {
        pageLabel = document.createElement("span");
        pageLabel.className = "lx-mobile-page";
        mh.querySelector(".side-brand")?.after(pageLabel);
      }
      pageLabel.textContent = name(route);
    }
    $("#lxCommand").setAttribute(
      "aria-label",
      L("Global search", "البحث الشامل"),
    );
    const top=$("#lxTopbar");
    if(cloud){const state=document.createElement("small");state.dataset.cloudStatus="";state.setAttribute("role","status");state.textContent=cloudMessages()[cloudState];top.append(state);}
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
    return `<section class="lx-card lx-goal-board"><div class="lx-card-head"><div><div class="lx-eyebrow">${L("YOUR DIRECTION", "وجهتك أولًا")}</div><h2>${L("Where you are. Where you are going.", "أين أنت الآن، وإلى أين تتجه؟")}</h2></div>${btn(L("Momentum", "خريطة الزخم"), "navigate", 'data-to="home"')}</div><div class="lx-goal-strip">${
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
  const financeCategories = [
    { id: "food", icon: "🍽️", en: "Food & Dining", ar: "طعام ومطاعم", color: "#F59E0B" },
    { id: "housing", icon: "🏠", en: "Housing", ar: "سكن وإيجار", color: "#3B82F6" },
    { id: "transport", icon: "🚗", en: "Transport", ar: "مواصلات ونقل", color: "#8B5CF6" },
    { id: "bills", icon: "💡", en: "Bills & Utilities", ar: "فواتير وخدمات", color: "#14B8A6" },
    { id: "shopping", icon: "🛍️", en: "Shopping", ar: "تسوق", color: "#EC4899" },
    { id: "health", icon: "🏥", en: "Health", ar: "صحة", color: "#EF4444" },
    { id: "entertainment", icon: "🎮", en: "Entertainment", ar: "ترفيه", color: "#A855F7" },
    { id: "education", icon: "📚", en: "Education", ar: "تعليم", color: "#6366F1" },
    { id: "savings", icon: "💰", en: "Savings & Invest", ar: "ادخار واستثمار", color: "#10B981" },
    { id: "debt", icon: "💳", en: "Debt & Loans", ar: "ديون وقروض", color: "#F43F5E" },
    { id: "gifts", icon: "🎁", en: "Gifts & Charity", ar: "هدايا وتبرعات", color: "#FBBF24" },
    { id: "other", icon: "📋", en: "Other", ar: "أخرى", color: "#64748B" }
  ];

  function getCategoryInfo(catName) {
    return financeCategories.find(c => c.en === catName || c.ar === catName) || financeCategories[11];
  }

  function finance(d) {
    if (userTier() === "core") {
      return (
        heading(
          name("finances"),
          L("Executive Capital Allocation", "إدارة رأس المال والميزانية"),
          btn("👑 " + L("Upgrade to Pro", "الترقية إلى Pro"), "pricing", 'class="lx-btn lx-primary"')
        ) +
        `<section class="lx-card lx-paywall-card">
          <div class="lx-paywall-badge">👑 ${L("EXCLUSIVE TO PRO TIER", "ميزة حصرية لباقة PRO")}</div>
          <h2>${L("Executive Capital & Finance Management", "إدارة التدفقات المالية وتوزيع رأس المال الذكي")}</h2>
          <p class="lx-paywall-sub">${L("Take full control of your income streams, budget percentage allocations, and capital expenditures to support your strategic goals.", "تحكم في دخلك الشهري، توزيع نسب الميزانية، وتتبع النفقات الرأسمالية لتحقيق أهدافك بوضوح تنفيذي.")}</p>
          <div class="lx-paywall-features">
            <div class="lx-pw-item"><span class="lx-pw-icon">💎</span><div><strong>${L("Dynamic Percentage Budgeting", "توزيع آلي للدخل بالنسب المئوية")}</strong><p>${L("Real-time distribution across business, investments, and personal buffers.", "حدد نسباً واضحة للادخار والاستثمار ومصاريف التشغيل تتوزع تلقائياً.")}</p></div></div>
            <div class="lx-pw-item"><span class="lx-pw-icon">📊</span><div><strong>${L("Smart Categorization & Insights", "تصنيف ذكي وتحليلات عميقة")}</strong><p>${L("Track 12 core categories with weekly velocity reports.", "تتبع 12 فئة مالية مع تقارير أسبوعية تفصيلية.")}</p></div></div>
            <div class="lx-pw-item"><span class="lx-pw-icon">📥</span><div><strong>${L("Data Portability", "تصدير البيانات")}</strong><p>${L("Export all financial records to CSV/Excel.", "تصدير كل المعاملات إلى ملفات Excel/CSV للمحاسبة.")}</p></div></div>
          </div>
          <div class="lx-paywall-cta">
            <button type="button" class="lx-btn lx-primary lx-paywall-btn" data-action="pricing">👑 ${L("Upgrade to Pro — $2.99 / month", "الترقية إلى باقة Pro — 2.99$ / شهرياً")}</button>
          </div>
        </section>`
      );
    }
    const month = C.day().slice(0, 7),
      normMonth = (s) => {
        if (!s || typeof s !== "string") return "";
        const p = s.split("-");
        return p.length >= 2 ? `${p[0]}-${p[1].padStart(2, "0")}` : s.slice(0, 7);
      },
      rows = d.finances.filter((x) => !x.archived && normMonth(x.date) === month),
      income = rows.filter((x) => x.type === "income").reduce((n, x) => n + Math.round(Number(x.amount || 0) * 100), 0),
      spent = rows.filter((x) => x.type !== "income").reduce((n, x) => n + Math.round(Number(x.amount || 0) * 100), 0),
      planned = (d.settings.moneyTodos || []).filter((t) => !t.done).reduce((n, t) => n + Math.round(Number(t.amount || 0) * 100), 0),
      money = (n) => new Intl.NumberFormat(ar() ? "ar-MA" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n / 100) + " " + esc(d.settings.currency),
      budget = C.allocateBudget(income, budgetRows(d)),
      allocated = budget.reduce((n, b) => n + b.cents, 0);

    const safeToSpend = Math.max(0, income - spent - planned);
    const totalDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const monthProgress = currentDay / totalDays;
    const spentRatio = income > 0 ? spent / income : 0;
    
    // Advice logic
    let advice = "";
    if (spentRatio > monthProgress + 0.15) {
      advice = `<div class="lx-advice-card warning">⚠️ <strong>${L("Burn Rate Alert", "تنبيه سرعة الإنفاق")}</strong>: ${L("You are spending faster than the month is progressing. Consider slowing down discretionary purchases.", "سرعة إنفاقك أعلى من تقدم أيام الشهر. حاول تقليل المصاريف غير الضرورية.")}</div>`;
    } else if (income > 0 && budget.filter(b => b.name.includes("Saving") || b.name.includes("ادخار")).length === 0) {
      advice = `<div class="lx-advice-card info">💡 <strong>${L("Wealth Building", "بناء الثروة")}</strong>: ${L("You haven't set a Savings budget. The 50/30/20 rule suggests saving 20% of your income.", "لم تحدد بنداً للادخار. قاعدة 50/30/20 تنصح بادخار 20% من دخلك.")}</div>`;
    } else if (income > 0 && spentRatio < monthProgress - 0.1) {
      advice = `<div class="lx-advice-card good">✅ <strong>${L("On Track", "مسار ممتاز")}</strong>: ${L("Your spending velocity is well below your income. Great discipline this month.", "سرعة إنفاقك أقل بكثير من الدخل. انضباط مالي ممتاز هذا الشهر.")}</div>`;
    }

    return (
      heading(
        name("finances"),
        L("Executive Financial Command", "مركز القيادة المالية التنفيذية"),
        btn("📥 " + L("Export CSV", "تصدير CSV"), "export-finance", 'class="lx-btn lx-secondary"') +
        btn("+ " + L("Transaction", "معاملة"), "new", 'data-kind="finances"', true)
      ) +
      advice +
      `<section class="lx-finance-dashboard">
        <div class="lx-safe-spend">
          <small>${L("Safe-to-Spend Balance", "المبلغ الآمن المتبقي للإنفاق")}</small>
          <strong>${money(safeToSpend)}</strong>
        </div>
        <div class="lx-stats-grid">
          ${stat(L("Total Income", "إجمالي الدخل"), money(income))}
          ${stat(L("Total Spent", "المصروف الفعلي"), money(spent))}
          ${stat(L("Planned Bills", "فواتير مجدولة"), money(planned))}
        </div>
        <div class="lx-burn-bar">
          <div class="lx-burn-fill" style="width: ${Math.min(100, spentRatio * 100)}%; background: ${spentRatio > monthProgress ? '#F43F5E' : '#10B981'}"></div>
          <div class="lx-burn-marker" style="left: ${monthProgress * 100}%" title="${L("Today", "اليوم")}"></div>
        </div>
      </section>
      
      <div class="lx-grid-two">
        <section class="lx-card">
          <div class="lx-card-head">
            <div><h2>${L("Budget Allocation", "توزيع الميزانية")}</h2></div>
            ${btn(L("Edit rules", "تعديل القواعد"), "budget-edit")}
          </div>
          <div class="lx-budget-list">
          ${
            budget.map((b) => {
              const target = b.cents,
                actual = rows.filter((x) => x.type !== "income" && x.category === b.name).reduce((n, x) => n + Math.round(Number(x.amount) * 100), 0),
                catInfo = getCategoryInfo(b.name);
              return `<div class="lx-budget-row">
                <div class="lx-budget-name"><span class="lx-cat-icon" style="background:${catInfo.color}20">${catInfo.icon}</span> <strong>${esc(b.name)}</strong> <span class="lx-badge">${b.percent}%</span></div>
                <div class="lx-budget-numbers">
                  <div class="lx-budget-track"><div class="lx-budget-fill" style="width:${Math.min(100, (actual/(target||1))*100)}%;background:${catInfo.color}"></div></div>
                  <small>${money(actual)} / ${money(target)}</small>
                </div>
              </div>`;
            }).join("") || `<p>${L("Add your 50/30/20 allocation rules.", "أضف قواعد توزيع 50/30/20 الخاصة بك.")}</p>`
          }
          </div>
        </section>

        <section class="lx-card">
          <h2>${L("Recent Transactions", "أحدث المعاملات")}</h2>
          <div class="lx-tx-list">
          ${rows.slice(0, 10).map((x) => {
            const catInfo = getCategoryInfo(x.category || "");
            return `<button class="lx-list-button lx-tx-item" data-action="edit" data-kind="finances" data-id="${esc(x.id)}">
              <span class="lx-cat-icon" style="background:${catInfo.color}20">${catInfo.icon}</span>
              <div class="lx-tx-details">
                <strong>${esc(x.title)}</strong>
                <small>${dateText(x.date)} · ${esc(x.category || "")}</small>
              </div>
              <strong class="lx-tx-amt" style="color:${x.type === 'income' ? '#10B981' : ''}">${x.type === "income" ? "+" : "−"} ${money(Math.round(Number(x.amount) * 100))}</strong>
            </button>`;
          }).join("") || empty(L("No transactions this month.", "لا توجد معاملات هذا الشهر."), "finances")}
          </div>
        </section>
      </div>

      <details class="lx-card">
        <summary>${L("All Transactions History", "سجل كل المعاملات")}</summary>
        <div class="lx-tx-list">
        ${d.finances.filter((x) => !x.archived).map((x) => {
          const catInfo = getCategoryInfo(x.category || "");
          return `<button class="lx-list-button lx-tx-item" data-action="edit" data-kind="finances" data-id="${esc(x.id)}">
            <span class="lx-cat-icon" style="background:${catInfo.color}20">${catInfo.icon}</span>
            <div class="lx-tx-details">
              <strong>${esc(x.title)}</strong>
              <small>${dateText(x.date)} · ${esc(x.category || "")}</small>
            </div>
            <strong class="lx-tx-amt" style="color:${x.type === 'income' ? '#10B981' : ''}">${x.type === "income" ? "+" : "−"} ${money(Math.round(Number(x.amount) * 100))}</strong>
          </button>`;
        }).join("")}
        </div>
      </details>`
    );
  }


  function momentumMap(d) {
    const gs = d.goals.filter((g) => !g.archived);
    if (!gs.length) {
      return empty(L("Your momentum line begins with your first goal.", "تبدأ خريطة الزخم مع أول هدف لك."), "goals");
    }
    const th = d.profile?.threshold || 60;
    const avgMom = Math.round(gs.reduce((acc, g) => acc + (g.momentum || 0), 0) / gs.length);
    const onTrack = gs.filter((g) => (g.momentum || 0) >= th).length;
    const sorted = [...gs].sort((a, b) => (b.momentum || 0) - (a.momentum || 0));
    const leading = sorted[0];
    const colors = ["#00D4FF", "#7B61FF", "#00E599", "#FFB800", "#FF4D6A", "#0099FF"];

    const days = 14;
    const dates = Array.from({ length: days }, (_, i) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - (days - 1 - i));
      return C.day(+dt);
    });

    const width = 800, height = 210, padTop = 18, padBottom = 28, padLeft = 40, padRight = 20;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const thY = padTop + plotH - (th / 100) * plotH;

    const paths = gs.map((g, gi) => {
      const col = colors[gi % colors.length];
      const histMap = new Map((g.history || []).map((h) => [h.date, h.value]));
      let lastVal = g.momentum || 0;
      const pts = dates.map((dStr, idx) => {
        if (histMap.has(dStr)) lastVal = histMap.get(dStr);
        const x = padLeft + (idx / Math.max(1, days - 1)) * plotW;
        const y = padTop + plotH - (Math.max(0, Math.min(100, lastVal)) / 100) * plotH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return {
        id: g.id,
        name: g.name,
        momentum: g.momentum || 0,
        progress: g.progress || 0,
        color: col,
        path: pts.join(" ")
      };
    });

    return `<div class="lx-momentum-wrapper">
      <div class="lx-stats">
        ${stat(L("System Momentum", "مؤشر الزخم العام"), `${avgMom}%`, avgMom >= th ? L("Above baseline (Stable)", "فوق خط الاستقرار") : L("Needs attention", "دون خط الاستقرار"))}
        ${stat(L("Goals on Track", "أهداف مستقرة"), `${onTrack} / ${gs.length}`, `${Math.round((onTrack / gs.length) * 100)}% ${L("stable", "مستقر")}`)}
        ${stat(L("Stability Line", "خط الزخم الأدنى"), `${th}%`, L("Critical boundary", "الحد الأدنى المستهدف"))}
        ${stat(L("Leading Goal", "الهدف الأسرع نمواً"), esc(leading?.name || "—"), `${leading?.momentum || 0}% ${L("momentum", "زخم")}`)}
      </div>
      <div class="lx-momentum-graph" role="img" aria-label="${L("Momentum Map chart", "رسم خريطة الزخم")}">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          <line x1="${padLeft}" y1="${padTop}" x2="${width - padRight}" y2="${padTop}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3"/>
          <text x="${padLeft - 8}" y="${padTop + 4}" fill="var(--n-i3)" font-size="9" text-anchor="end">100</text>
          
          <line x1="${padLeft}" y1="${thY}" x2="${width - padRight}" y2="${thY}" stroke="rgba(0,212,255,0.5)" stroke-width="1.5" stroke-dasharray="4,4"/>
          <text x="${padLeft - 8}" y="${thY + 4}" fill="var(--n-a)" font-size="9" font-weight="700" text-anchor="end">${th}%</text>

          <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="rgba(255,255,255,0.08)"/>
          <text x="${padLeft - 8}" y="${padTop + plotH + 4}" fill="var(--n-i3)" font-size="9" text-anchor="end">0</text>

          ${paths.map((p) => `<polyline points="${p.path}" fill="none" stroke="${p.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}
        </svg>
      </div>
      <div class="lx-momentum-legend">
        ${paths.map((p) => `
          <button class="lx-momentum-pill" data-route="goals" data-id="${esc(p.id)}">
            <span class="lx-dot" style="background:${p.color}"></span>
            <strong>${esc(p.name)}</strong>
            <span class="lx-badge ${p.momentum >= th ? "good" : "warn"}">${p.momentum}%</span>
          </button>
        `).join("")}
      </div>
    </div>`;
  }

  function home(d) {
    const tt = totals(d), today = C.day(), now = Date.now();
    const deepWeek = C.duration(
      tt.all,
      C.week(now, d.settings.weekStart),
      Infinity,
      (s) => s.categoryId === "Deep Work"
    );
    const due = d.tasks.filter((t) => !t.archived && !t.done && (!t.date || t.date <= today))
      .sort((a, b) => ["high", "medium", "low"].indexOf(a.priority) - ["high", "medium", "low"].indexOf(b.priority));

    return heading(L("Executive Radar", "القيادة التنفيذية"),
      L("Trajectory. Deep attention. Relentless execution.", "مسار الزخم. التركيز العميق. والوصول إلى أهدافك.")) +
      /* 1. خريطة الزخم */
      `<section class="lx-card lx-momentum-section">
        <div class="lx-card-head">
          <div>
            <div class="lx-eyebrow">${L("SYSTEM TRAJECTORY", "مسار الزخم")}</div>
            <h2>${L("Momentum Map", "خريطة الزخم")}</h2>
            <p class="lx-muted">${L("Live trajectory of your goals against the stability baseline.", "المسار الحي لزخم أهدافك وموقعها مقارنة بخط الاستقرار.")}</p>
          </div>
          ${btn(L("Manage goals", "إدارة الأهداف"), "navigate", 'data-to="goals"')}
        </div>
        ${momentumMap(d)}
      </section>` +
      /* 2. وقت التركيز حسب اليوم + 3. العمل العميق الأسبوعي */
      `<div class="lx-grid-two">
        <section class="lx-card">
          <div class="lx-card-head">
            <div>
              <div class="lx-eyebrow">${L("TODAY'S ATTENTION", "انتباه اليوم")}</div>
              <h2>${L("Focus time by day", "وقت التركيز حسب اليوم")}</h2>
            </div>
            <div class="lx-badge">${hrs(tt.deep)} / ${d.settings.dailyHours} ${L("h", "س")}</div>
          </div>
          <div class="lx-big-number">${hrs(tt.deep)}</div>
          <p class="lx-muted">${L("Daily target: ", "الهدف اليومي: ")} ${d.settings.dailyHours} ${L("hours of deep execution.", "ساعات من العمل العميق المتواصل.")}</p>
          ${progress(percent(tt.deep, d.settings.dailyHours * 3600000))}
          <div class="lx-actions" style="margin-top:16px;">
            ${btn(L(d.activeSession ? "Resume focus" : "Start focus", d.activeSession ? "استأنف التركيز" : "ابدأ جلسة تركيز"), "navigate", 'data-to="focus"', true)}
            ${btn(L("Log time", "تسجيل يدوي"), "manual")}
          </div>
        </section>
        <section class="lx-card">
          <div class="lx-card-head">
            <div>
              <div class="lx-eyebrow">${L("SEVEN-DAY EXECUTION", "إنجاز الأسبوع")}</div>
              <h2>${L("Weekly deep work", "العمل العميق الأسبوعي")}</h2>
            </div>
            <div class="lx-badge">${hrs(deepWeek)} / ${d.settings.weeklyHours} ${L("h", "س")}</div>
          </div>
          <div class="lx-big-number">${hrs(deepWeek)}</div>
          <p class="lx-muted">${L("of", "من")} ${d.settings.weeklyHours} ${L("hours", "ساعة")} · ${hrs(Math.max(0, d.settings.weeklyHours * 3600000 - deepWeek))} ${L("remaining", "متبقية هذا الأسبوع")}</p>
          ${progress(percent(deepWeek, d.settings.weeklyHours * 3600000))}
          ${dayChart(tt.all, d)}
        </section>
      </div>` +
      /* 4. خطة الأهداف */
      goalBoard(d) +
      /* 5. أولويات التنفيذ (Next Actions) */
      `<section class="lx-card">
        <div class="lx-card-head">
          <div>
            <div class="lx-eyebrow">${L("HIGH LEVERAGE", "الخطوات القادمة")}</div>
            <h2>${L("Execution priorities", "أولويات التنفيذ")}</h2>
          </div>
          ${btn(L("All tasks", "كل المهام"), "navigate", 'data-to="tasks"')}
        </div>
        <div class="lx-task-list">
          ${due.slice(0, 4).map((t) => taskRow(t, d)).join("") || empty(L("Add your next action in Tasks.", "أضف خطوتك القادمة في قسم المهام."), "tasks")}
        </div>
      </section>`;
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
          btn(L("Add time manually", "إضافة وقت يدوي"), "manual") + btn(L("Pomodoro settings", "إعدادات بومودورو"), "pomodoro-settings"),
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
        )}${field(L("Target minutes · 0 = open ended", "المدة بالدقائق · 0 = بلا حد"), "targetMinutes", 60, "number", 'min="0" max="1440"')}</div></details><div class="lx-info">${L("Pomodoro uses your saved focus and break settings. Time survives refresh and is calculated from real timestamps.", "يستخدم بومودورو مدد التركيز والراحة المحفوظة. الوقت يستمر بعد تحديث الصفحة ويُحسب من الطوابع الزمنية الفعلية.")}</div><button class="lx-btn lx-primary lx-wide" type="submit">${icon("focus")}${L("Start focus", "ابدأ التركيز")}</button></form><details class="lx-card"><summary>${L("Session rhythm and history", "إيقاع الجلسات وسجلها")}</summary><div class="lx-eyebrow">${L("YOUR RHYTHM", "إيقاعك")}</div><h2>${d.settings.focusMinutes} / ${d.settings.shortBreak}</h2><p>${L("Minutes of focus / short break", "دقائق تركيز / راحة قصيرة")}</p><p>${L("Long break every", "راحة طويلة كل")} ${d.settings.cycles} ${L("sessions", "جلسات")} · ${d.settings.longBreak} ${L("minutes", "دقيقة")}</p><hr><h3>${L("Recent sessions", "الجلسات الأخيرة")}</h3>${
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
      const ts = d.tasks.filter((t) => t.goalId === g.id && !t.archived),
        hs = (d.habits || []).filter((h) => h.goalId === g.id && !h.archived),
        time = C.duration(
          C.reportSessions(d),
          0,
          Infinity,
          (s) => s.goalId === g.id,
        );
      return (
        heading(
          esc(g.name),
          (g.identity ? `👑 ${esc(g.identity)} · ` : "") + esc(g.why || ""),
          btn(L("All goals", "كل الأهداف"), "navigate", 'data-to="goals"') +
            btn(
              L("Edit goal", "تعديل الهدف"),
              "edit",
              `data-kind="goals" data-id="${g.id}"`,
            ) +
            btn(
              "+ " + L("Add habit", "إضافة عادة"),
              "new",
              `data-kind="habits" data-goal="${g.id}"`,
            ) +
            btn(
              "+ " + L("Add task", "إضافة مهمة"),
              "new",
              `data-kind="tasks" data-goal="${g.id}"`,
            ),
        ) +
        `<section class="lx-card lx-cascade-card">
          <div class="lx-cascade-badge">👑 ${L("IDENTITY CASCADE", "سلسلة الهوية والتنفيذ")}</div>
          <div class="lx-cascade-pipeline">
            <div class="lx-cascade-step is-identity">
              <div class="lx-cascade-step-tag">${L("01 · IDENTITY", "01 · الهوية")}</div>
              <strong>${esc(g.identity || L("I am someone who consistently reaches this", "أنا شخص يحقق هذا الهدف بإتقان"))}</strong>
            </div>
            <div class="lx-cascade-step is-goal">
              <div class="lx-cascade-step-tag">${L("02 · GOAL", "02 · الهدف")}</div>
              <strong>${esc(g.name)}</strong>
            </div>
            <div class="lx-cascade-step is-habits">
              <div class="lx-cascade-step-tag">${L("03 · HABITS", "03 · العادات اليومية")}</div>
              <strong>${hs.length} ${L("rituals", "عادات جارية")}</strong>
            </div>
            <div class="lx-cascade-step is-tasks">
              <div class="lx-cascade-step-tag">${L("04 · TASKS", "04 · المهام الميدانية")}</div>
              <strong>${ts.filter((t) => t.done).length}/${ts.length} ${L("done", "مكتملة")}</strong>
            </div>
          </div>
        </section>` +
        entityTime(d, "goalId", g.id) +
        `<div class="lx-grid-two"><section class="lx-card"><h2>${L("Outcome progress", "تقدم النتيجة")} · ${g.progress}%</h2>${progress(g.progress)}<p>${L("Time is an investment, not an automatic measure of completion.", "الوقت استثمار، وليس مقياسًا تلقائيًا لاكتمال الهدف.")}</p><div class="lx-mini-stats">${stat(L("Estimated", "المقدر"), (g.targetHours || 0) + L(" hours", " ساعة"))}${stat(L("Remaining", "المتبقي"), hrs(Math.max(0, (g.targetHours || 0) * 3600000 - time)))}${stat(L("Momentum", "الزخم"), (g.momentum || 0) + "%")}${stat(L("Days left", "الأيام المتبقية"), g.deadline ? Math.max(0, Math.ceil((+new Date(g.deadline + "T23:59:59") - Date.now()) / 86400000)) : "—")}</div><h3>${L("Milestones", "المراحل")}</h3>${["m6", "m3", "month", "week"].map((key, i) => `<div class="lx-list-line"><span>${L(["6 months", "Quarter", "Month", "Week"][i], ["ستة أشهر", "ربع سنة", "شهر", "أسبوع"][i])}</span><strong>${esc(g.plan?.[key] || "—")}</strong></div>`).join("")}<p class="lx-pre">${esc(g.notes || "")}</p></section><section class="lx-card"><h2>${name("tasks")} (${ts.filter((t) => t.done).length}/${ts.length})</h2>${ts.map((t) => taskRow(t, d)).join("") || empty(L("Connect actions to this outcome.", "اربط التنفيذ بهذه النتيجة."), "tasks")}<h3>${name("habits")} (${hs.length})</h3>${hs.map((h) => `<div class="lx-list-line"><span><strong>${esc(h.title)}</strong><small>🔥 ${C.habitStreak(h.checks || [], C.day()).current} ${L("day streak", "أيام متتالية")}</small></span>${btn(h.checks?.includes(C.day()) ? "✓ " + L("Done", "تمت") : L("Check", "إكمال"), "habit-toggle", `data-id="${h.id}"`, h.checks?.includes(C.day()))}</div>`).join("") || `<p class="lx-pre">${L("No habits linked to this goal yet.", "لا توجد عادات مرتبطة بهذا الهدف بعد.")}</p>`}</section></div>`
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
          .map((g) => {
            const ts = d.tasks.filter((t) => t.goalId === g.id && !t.archived);
            const hs = (d.habits || []).filter((h) => h.goalId === g.id && !h.archived);
            const doneTs = ts.filter((t) => t.done).length;
            const idTag = g.identity ? `<div class="lx-identity-tag">👑 ${esc(g.identity)}</div>` : "";
            return `<article class="lx-card lx-goal-card">${idTag}<div class="lx-eyebrow">${esc(g.horizon ? L(g.horizon, { annual: "سنوي", quarterly: "ربع سنوي", monthly: "شهري", weekly: "أسبوعي" }[g.horizon] || g.horizon) : L("Long term", "بعيد المدى"))}</div><h2><button class="lx-text-button" data-route="goals" data-id="${g.id}">${esc(g.name)}</button></h2><p>${esc(g.why || "")}</p><div class="lx-split"><strong>${g.progress}%</strong><small>${dateText(g.deadline)}</small></div>${progress(g.progress)}<p>${hrs(C.duration(C.reportSessions(d), 0, Infinity, (s) => s.goalId === g.id))} ${L("invested", "مستثمرة")}</p><div class="lx-mini-stats">${stat(name("tasks"), `${doneTs}/${ts.length}`)}${stat(name("habits"), `${hs.length}`)}${stat(L("Momentum", "الزخم"), `${g.momentum || 0}%`)}</div></article>`;
          })
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
        )}</section><section class="lx-card"><h2>${L("Projects · this week", "المشاريع · هذا الأسبوع")}</h2>${d.projects.map((p) => `<div class="lx-list-line"><span>${esc(p.name)}</span><strong>${hrs(C.duration(tt.all, C.week(now, d.settings.weekStart), Infinity, (s) => s.projectId === p.id))}</strong></div>`).join("") || "<p>—</p>"}</section><section class="lx-card"><h2>${L("Your rhythm", "إيقاعك")}</h2><p>${L("Most tracked hour", "الساعة الأكثر تسجيلًا")}: <b dir="ltr">${hours[bestHour] ? String(bestHour).padStart(2, "0") + ":00 – " + String(bestHour + 1).padStart(2, "0") + ":00" : "—"}</b></p><p>${L("Best day · last 30 days", "أفضل يوم · آخر 30 يومًا")}: ${best?.[1] ? dateText(best[0]) : "—"}</p><p>${L("Average daily deep work · 7 days", "متوسط العمل العميق اليومي · 7 أيام")}: ${hrs(C.duration(tt.all, C.midnight(now) - 6 * 86400000, Infinity, (s) => s.categoryId === "Deep Work") / 7)}</p><p>${L("Time tracked describes effort, not quality.", "الوقت المسجل يصف الجهد، وليس جودته.")}</p></section></div><div class="lx-grid-two"><section class="lx-card"><h2>${L("Execution", "التنفيذ")}</h2><p>${L("Tasks completed", "المهام المكتملة")}: ${d.tasks.filter((t) => !t.archived && t.done).length} / ${d.tasks.filter((t) => !t.archived).length}</p>${progress(percent(d.tasks.filter((t) => !t.archived && t.done).length, d.tasks.filter((t) => !t.archived).length))}<p>${L("Habits today", "عادات اليوم")}: ${d.habits.filter((h) => !h.archived && h.checks?.includes(C.day())).length} / ${d.habits.filter((h) => !h.archived).length}</p>${progress(percent(d.habits.filter((h) => !h.archived && h.checks?.includes(C.day())).length, d.habits.filter((h) => !h.archived).length))}</section><section class="lx-card"><h2>${L("Goals progress", "تقدم الأهداف")}</h2>${d.goals.filter((g) => !g.archived).map((g) => `<div class="lx-list-line"><span>${esc(g.name)}</span><strong>${g.progress}%</strong></div>${progress(g.progress)}`).join("") || "<p>—</p>"}</section></div><div class="lx-grid-two"><section class="lx-card"><h2>${L("Focus time by week", "وقت التركيز حسب الأسبوع")}</h2>${weeklyChart(tt.all, d)}</section><section class="lx-card"><h2>${L("Time per goal · this month", "الوقت لكل هدف · هذا الشهر")}</h2>${d.goals.map((g) => `<button class="lx-list-button" data-route="goals" data-id="${g.id}">${esc(g.name)}<strong>${hrs(C.duration(tt.all, +new Date(new Date().getFullYear(), new Date().getMonth(), 1), Infinity, (s) => s.goalId === g.id))}</strong></button>`).join("") || "<p>—</p>"}</section></div><section class="lx-card"><h2>${L("Session history", "سجل الجلسات")}</h2>${
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
          .map((h) => {
            const strk = C.habitStreak(h.checks || [], C.day());
            const goal = h.goalId ? d.goals.find((g) => g.id === h.goalId) : null;
            const isTodayChecked = h.checks?.includes(C.day());
            const weekDays = Array.from({ length: 7 }, (_, i) => {
              const dt = new Date();
              dt.setDate(dt.getDate() - 6 + i);
              const key = C.day(+dt);
              const isChk = h.checks?.includes(key);
              const isToday = key === C.day();
              const dayName = new Intl.DateTimeFormat(ar() ? "ar-MA" : "en-GB", { weekday: "narrow" }).format(dt);
              return `<button type="button" class="lx-habit-day-btn ${isChk ? "checked" : ""} ${isToday ? "is-today" : ""}" data-action="habit-toggle-day" data-id="${h.id}" data-date="${key}" title="${key}: ${isChk ? L("Done", "مكتمل") : L("Not done", "غير مكتمل")}"><small>${dayName}</small><span>${dt.getDate()}</span></button>`;
            }).join("");
            const past7Count = Array.from({ length: 7 }, (_, i) => {
              const dt = new Date();
              dt.setDate(dt.getDate() - i);
              return h.checks?.includes(C.day(+dt)) ? 1 : 0;
            }).reduce((a, b) => a + b, 0);

            const freqMap = {
              daily: L("Daily", "يوميًا"),
              weekdays: L("Weekdays (Sun-Thu)", "أيام العمل"),
              weekly: L("Weekly", "أسبوعيًا"),
            };
            const freqText = freqMap[h.frequency] || L("Daily", "يوميًا");

            return `<article class="lx-card"><div class="lx-card-head"><div><span class="lx-streak-badge" title="${L("Current streak / Best streak", "التتابع الحالي / أفضل تتابع")}">🔥 ${strk.current} <small>(${L("Best", "الأفضل")}: ${strk.best})</small></span><h2>${esc(h.title)}</h2></div>${btn(L("Edit", "تعديل"), "edit", `data-kind="habits" data-id="${h.id}"`)}</div><p>${esc(h.description || "")}</p>${goal ? `<div class="lx-habit-goal-pill"><button class="lx-text-button" data-route="goals" data-id="${goal.id}">🎯 ${esc(goal.name)}</button><small>+${h.impact || 5}% ${L("momentum", "زخم")}</small></div>` : ""}<p class="lx-habit-meta"><span>${L("Last 7 days", "آخر 7 أيام")}: <strong>${past7Count} / 7</strong></span><span>${esc(h.time || "")} · ${freqText}</span></p><div class="lx-habit-days">${weekDays}</div>${btn(isTodayChecked ? L("Completed today ✓", "تمت اليوم ✓") : L("Mark today complete", "إكمال عادة اليوم"), "habit-toggle", `data-id="${h.id}"`, isTodayChecked)}</article>`;
          })
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
    if (!dialog) return;
    dialog.innerHTML = `<div class="lx-dialog-head"><h2 id="lxDialogTitle">${title}</h2><button type="button" class="lx-btn lx-close-btn" data-action="close" aria-label="${L("Close", "إغلاق")}">✕</button></div><div class="lx-dialog-body">${body}</div>`;
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    }
    dialog.scrollTop = 0;
    dialog.querySelector("input:not([type=hidden]),textarea,select")?.focus();
  }
  const endForm = (editing, kind, id) =>
    `<div class="lx-dialog-footer">${editing ? btn(L("Archive", "أرشفة"), "archive", `data-kind="${kind}" data-id="${id}"`) : ""}${btn(L("Cancel", "إلغاء"), "close")}<button class="lx-btn lx-primary" type="submit">${L("Save", "حفظ")}</button></div>`;
  function editor(kind, id = "", seed = {}) {
    const d = db.read();
    if (!Array.isArray(d[kind])) return;
    if (kind === "finances" && userTier() === "core") {
      openPricingModal();
      return;
    }
    if (kind === "goals" && !id && userTier() === "core") {
      const activeGoals = (d.goals || []).filter((g) => !g.archived);
      if (activeGoals.length >= 3) {
        modal(
          L("Goal Limit · Core Tier", "الحد الأقصى للأهداف · الباقة العادية"),
          `<div class="lx-limit-modal" style="padding:10px 0">
            <p style="margin-bottom:18px;line-height:1.75">${L(
              "You have reached the limit of 3 active goals on the Free Core tier. Upgrade to Pro ($2.99/mo) to unlock unlimited goal portfolios, projects, and finance management.",
              "لقد وصلت إلى الحد الأقصى للباقة العادية (3 أهداف نشطة). اشترك في باقة Pro (2.99$ شهرياً) لإضافة أهداف ومشاريع غير محدودة وإدارة التدفقات المالية والميزانية."
            )}</p>
            <div class="lx-dialog-footer">
              <button type="button" class="lx-btn" data-action="close">${L("Cancel", "إلغاء")}</button>
              <button type="button" class="lx-btn lx-primary" data-action="pricing">👑 ${L("Upgrade to Pro ($2.99)", "الترقية إلى Pro (2.99$)")}</button>
            </div>
          </div>`
        );
        return;
      }
    }
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
    if (kind === "tasks") {
      body +=
        `<div class="lx-fields-two">
          ${select(name("goals"), "goalId", options(d.goals), o.goalId)}
          ${field(L("Due date", "تاريخ الاستحقاق"), "date", o.date || C.day(), "date", "required")}
        </div>
        <div class="lx-fields-two">
          ${select(
            L("Priority", "الأولوية"),
            "priority",
            [
              ["high", L("High", "عالية")],
              ["medium", L("Medium", "متوسطة")],
              ["low", L("Low", "منخفضة")],
            ],
            o.priority || "medium",
          )}
          ${select(name("projects"), "projectId", options(d.projects), o.projectId)}
        </div>
        <details class="lx-details" style="margin-top:12px">
          <summary>${L("Advanced options · optional", "خيارات إضافية · اختياري")}</summary>
          <div class="lx-fields-two" style="margin-top:10px">
            ${select(
              L("Status", "الحالة"),
              "status",
              [
                ["todo", L("To do", "للتنفيذ")],
                ["doing", L("In progress", "قيد التنفيذ")],
                ["done", L("Done", "مكتملة")],
              ],
              o.status || "todo",
            )}
            ${field(L("Estimated hours", "الوقت المقدر بالساعات"), "estimatedHours", o.estimatedHours || 0, "number", 'min="0" max="10000" step="0.25"')}
          </div>
          ${area(L("Notes", "ملاحظات"), "notes", o.notes || "")}
        </details>` +
        (existing
          ? `<div class="lx-info">${L("Actual time", "الوقت الفعلي")}: ${hrs(C.duration(C.reportSessions(d), 0, Infinity, (s) => s.taskId === id))} · ${L("Difference from estimate", "الفرق عن التقدير")}: ${(C.duration(C.reportSessions(d), 0, Infinity, (s) => s.taskId === id) / 3600000 - (o.estimatedHours || 0)).toFixed(2)} ${L("hours", "ساعة")}</div>`
          : "");
    }
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
        `<details class="lx-details" style="margin-top:12px"><summary>${L("Advanced · optional", "خيارات إضافية")}</summary><div style="margin-top:10px">` +
        field(
          L("People · names", "الأشخاص · الأسماء"),
          "people",
          o.people || "",
        ) +
        area(L("Project notes", "ملاحظات المشروع"), "notes", o.notes || "") +
        `</div></details>`;
    if (kind === "goals")
      body +=
        field(
          L("I am becoming… (your identity)", "هويتي: أنا شخص يـ…"),
          "identity",
          o.identity || "",
          "text",
          'placeholder="' + L("e.g. I am someone who ships daily", "مثال: أنا شخص يعمل كل يوم بانتظام") + '" maxlength="200"',
        ) +
        area(
          L("Why does this matter?", "لماذا يهمني هذا الهدف؟"),
          "why",
          o.why || "",
          'rows="2"',
        ) +
        `<div class="lx-fields-two">${field(L("Deadline", "الموعد النهائي"), "deadline", o.deadline || "", "date")}${select(
          L("Horizon", "الأفق الزمني"),
          "horizon",
          [
            ["annual", L("Annual", "سنوي")],
            ["quarterly", L("Quarterly", "ربع سنوي")],
            ["monthly", L("Monthly", "شهري")],
            ["weekly", L("Weekly", "أسبوعي")],
          ],
          o.horizon || "annual",
        )}</div>` +
        `<details class="lx-details" style="margin-top:12px"><summary>${L("Advanced options · optional", "خيارات إضافية · اختياري")}</summary><div style="margin-top:10px">` +
        `<div class="lx-fields-two">${select(L("Domain", "المجال"), "category", d.categories.map((c) => [c, catName(c)]), o.category || "Personal")}${field(L("Outcome progress (%)", "تقدم النتيجة (%)"), "progress", o.progress || 0, "number", 'min="0" max="100" step="0.5"')}</div>` +
        field(L("Target hours (estimated total)", "الساعات المستهدفة (إجمالي)"), "targetHours", o.targetHours || 0, "number", 'min="0" max="100000" step="0.5"') +
        select(name("projects"), "projectId", options(d.projects), o.projectId) +
        [["m6", L("6-month milestone", "مرحلة ستة أشهر")], ["m3", L("Quarter milestone", "مرحلة ربع السنة")], ["month", L("Month milestone", "مرحلة الشهر")], ["week", L("Week milestone", "مرحلة الأسبوع")]].map(([k, label]) => field(label, k, o.plan?.[k] || "")).join("") +
        area(L("Notes", "ملاحظات"), "notes", o.notes || "") +
        `</div></details>`;
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
        `<details class="lx-details" style="margin-top:12px"><summary>${L("Advanced · optional", "خيارات إضافية")}</summary><div style="margin-top:10px">` +
        field(
          L("People / location", "الأشخاص / المكان"),
          "people",
          o.people || "",
        ) +
        area(
          L("Agenda & meeting notes", "جدول الأعمال وملاحظات الاجتماع"),
          "notes",
          o.notes || "",
        ) +
        `</div></details>`;
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
        select(
          name("goals"),
          "goalId",
          options(d.goals),
          o.goalId || seed.goalId || "",
        ) +
        `<div class="lx-fields-two">${select(
          L("Frequency", "التكرار"),
          "frequency",
          [
            ["daily", L("Daily", "يوميًا")],
            ["weekdays", L("Weekdays (Sun-Thu)", "أيام العمل")],
            ["weekly", L("Weekly", "أسبوعيًا")],
          ],
          o.frequency || "daily",
        )}${field(L("Scheduled time", "وقت التنفيذ"), "time", o.time || "07:00", "time")}</div>` +
        `<details class="lx-details" style="margin-top:12px"><summary>${L("Advanced · optional", "خيارات إضافية")}</summary><div style="margin-top:10px">` +
        field(
          L("Goal momentum impact (+%)", "أثر الزخم على الهدف (+%)"),
          "impact",
          o.impact !== undefined ? o.impact : 5,
          "number",
          'min="0" max="50" step="1"',
        ) +
        area(
          L("Intention / routine steps", "النية / خطوات الروتين"),
          "description",
          o.description || "",
        ) +
        `</div></details>`;
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
  function pomodoroSettings() {
    const d = db.read();
    modal(L("Pomodoro settings", "إعدادات بومودورو"), `<form id="lxPomodoroForm"><h3>Pomodoro</h3><div class="lx-fields-two">${field(L("Focus minutes", "دقائق التركيز"), "focusMinutes", d.settings.focusMinutes, "number", 'min="1" max="240" required')}${field(L("Short break minutes", "دقائق الراحة القصيرة"), "shortBreak", d.settings.shortBreak, "number", 'min="1" max="60" required')}${field(L("Long break minutes", "دقائق الراحة الطويلة"), "longBreak", d.settings.longBreak, "number", 'min="1" max="120" required')}${field(L("Sessions before long break", "جلسات قبل الراحة الطويلة"), "cycles", d.settings.cycles, "number", 'min="1" max="12" step="1" required')}</div><div class="lx-fields-two">${[
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
      )}</div><p class="lx-muted">${L("Changes apply to the next session. Automatic cycles include elapsed time while the device sleeps. Notifications and sound are delivered when the app is awake.", "تطبق التغييرات على الجلسة التالية. الدورات التلقائية تشمل الوقت المنقضي أثناء سكون الجهاز. تصل التنبيهات والأصوات عندما يكون التطبيق نشطًا.")}</p><button class="lx-btn lx-primary" type="submit">${L("Save Pomodoro settings", "حفظ إعدادات بومودورو")}</button></form>`);
  }
  let cloudState = "disconnected";
  const supabase = window.NorthAuth?.client;
  const cloudMessages = () => ({
    disconnected:L("Restoring account…", "جارٍ استرجاع الحساب…"),
    syncing:L("Syncing…", "جارٍ الحفظ والمزامنة…"), connecting:L("Connecting…", "جارٍ الاتصال…"),
    saved:L("Workspace saved", "تم حفظ مساحة العمل"),
    conflict:L("Changes exist on both devices. Choose which copy to keep; local recovery backup is retained.", "توجد تغييرات محلية وسحابية. اختر النسخة المعتمدة؛ نحتفظ بنسخة استعادة محلية."),
    schema:L("Run supabase-setup.sql in Supabase first.", "شغّل ملف supabase-setup.sql في Supabase أولًا."),
    offline:L("Cloud unavailable. Changes remain local; reconnect or retry.", "تعذر الحفظ السحابي. التغييرات محفوظة محليًا؛ أعد الاتصال أو المحاولة."),
    auth:L("Sign-in failed. Check your cloud account and confirmed email.", "تعذر الدخول. تحقق من الحساب السحابي وتأكيد البريد."),
    confirm:L("Confirm your email, then sign in here.", "أكد بريدك من الرسالة، ثم سجّل الدخول هنا."),
    identity:L("Cloud email must match the current local account.", "يجب أن يطابق البريد السحابي بريد الحساب المحلي الحالي."),
    active:L("Finish the active session before downloading cloud changes.", "أنهِ الجلسة النشطة قبل استرجاع التغييرات السحابية.")
  });
  const cloud = supabase && window.NorthCloud ? window.NorthCloud.create({
    client:supabase, read:()=>db.read(), storage:localStorage,
    email:()=>localStorage.getItem(C.SESSION_KEY),
    apply:payload=>{
      const validated=C.validateImport({...db.read(),...payload});
      db.update(d=>{for(const k of Object.keys(payload)) if(k!=="activeSession") d[k]=validated[k];});
      window.LifeLegacy?.renderAll?.(); render();
    },
    status:state=>{cloudState=state; for(const el of document.querySelectorAll("[data-cloud-status]")) el.textContent=cloudMessages()[state];}
  }) : null;
  function cloudPanel() {
    return `<details class="lx-card"><summary>${L("Sync and recovery", "المزامنة والاستعادة")}</summary><p id="lxCloudStatus" data-cloud-status role="status">${cloudMessages()[cloudState]}</p><p>${L("Your workspace saves automatically. If both devices change the same workspace, choose the copy to retain. Export a backup before replacing a copy.", "تُحفظ مساحة عملك تلقائيًا. إذا عُدّلت على جهازين، اختر النسخة المعتمدة. صدّر نسخة احتياطية قبل استبدال نسخة.")}</p>${btn(L("Retry sync", "إعادة المزامنة"),"cloud-sync")}<details><summary>${L("Resolve conflict", "حل تعارض")}</summary>${btn(L("Use cloud copy", "اعتماد النسخة السحابية"),"cloud-remote")}${btn(L("Use this device’s copy", "اعتماد نسخة هذا الجهاز"),"cloud-local")}</details></details>`;
  }
  document.addEventListener("click", async e=>{
    const action=e.target.closest("[data-action]")?.dataset.action;
    if(!cloud || !action?.startsWith("cloud-"))return;
    if(action==="cloud-sync")await cloud.resume();

    if(action==="cloud-remote" || action==="cloud-local")await cloud.resolve(action.slice(6));
  });
  if(cloud){
    const update=db.update;
    let pending;
    db.update=fn=>{const result=update(fn);clearTimeout(pending);pending=setTimeout(()=>cloud.sync(),700);return result;};
    setInterval(()=>cloud.resume(),15000);
    window.addEventListener("online",()=>cloud.resume());
    window.addEventListener("north:local-change",()=>{clearTimeout(pending);pending=setTimeout(()=>cloud.sync(),700);});
    window.NorthBoot={prepare:()=>cloud.resume(),flush:async()=>{flushSaves();await cloud.sync();}};
  }
  function settingsPanel(d) {
    let panel = $("#lxSettings");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "lxSettings";
      panel.className = "lx-card lx-margin";
      document.querySelector('[data-view-panel="account"]').prepend(panel);
    }
    panel.innerHTML = cloudPanel() +
      `<section class="lx-card lx-margin" style="margin-bottom:16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08)"><div class="lx-card-head"><div><div class="lx-eyebrow">${L("MEMBERSHIP", "العضوية والاشتراك")}</div><h2>${L("THE NORTH Plans & Upgrades", "باقات THE NORTH والترقية")}</h2></div>${btn(L("View Plans", "عرض الباقات"), "pricing", 'class="lx-btn lx-primary"')}</div><p class="lx-muted">${L("Choose your velocity tier. Autonomous AI Executive Coach coming soon.", "اختر باقة سرعتك التنفيذية. المدرب التنفيذي الذكي قريباً.")}</p></section>` +
      `<section class="lx-card lx-margin" style="margin-bottom:16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08)"><div class="lx-card-head"><div><div class="lx-eyebrow">${L("FEEDBACK", "صوتك وملاحظاتك")}</div><h2>${L("Help Shape THE NORTH", "شاركنا رؤيتك لتطوير التطبيق")}</h2></div>${btn("💡 " + L("Share feedback", "شاركنا اقتراحك"), "feedback")}</div><p class="lx-muted">${L("Tell us what would make you 10x more effective. Your suggestions directly guide our engineering roadmap.", "أخبرنا بما يضاعف كفاءتك 10 مرات. ملاحظاتك تقود خارطة تطويرنا مباشرة دون إزعاج.")}</p></section>` +
      `<h2>${L("Your operating preferences", "تفضيلات نظامك")}</h2><form id="lxSettingsForm"><div class="lx-fields-three">${select(
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
    )}${field(L("Daily deep work (hours)", "العمل العميق اليومي (ساعات)"), "dailyHours", d.settings.dailyHours, "number", 'min="0.5" max="24" step="0.5" required')}${field(L("Weekly deep work (hours)", "العمل العميق الأسبوعي (ساعات)"), "weeklyHours", d.settings.weeklyHours, "number", 'min="1" max="168" step="0.5" required')}${field(L("Daily summary time · in-app", "موعد ملخص اليوم · داخل التطبيق"), "summaryTime", d.settings.summaryTime || "20:00", "time")}${field(L("Currency", "العملة"), "currency", d.settings.currency, "text", 'required minlength="3" maxlength="3"')}</div><details class="lx-card"><summary>${L("Time categories", "تصنيفات الوقت")}</summary>${area(L("Time categories · one per line", "تصنيفات الوقت · تصنيف في كل سطر"), "categories", d.categories.join("\n"))}</details><button class="lx-btn lx-primary" type="submit">${L("Save preferences", "حفظ التفضيلات")}</button></form><details class="lx-card"><summary>${L("Data and recovery", "البيانات والاستعادة")}</summary><p>${L("Your workspace syncs automatically with your account. A local copy supports offline work. Export backups regularly. Imports preserve your login and create a recovery copy first.", "تُزامَن مساحة عملك تلقائيًا مع حسابك. تدعم النسخة المحلية العمل دون اتصال. صدّر نسخًا احتياطية دوريًا؛ يحافظ الاستيراد على دخولك ويحفظ نسخة استعادة أولًا.")}</p>${btn(L("Restore previous import", "استعادة ما قبل الاستيراد"), "restore-import")}</details>`;
  }
  function command() {
    const dialog = $("#lxCommand");
    dialog.innerHTML = `<div class="lx-dialog-head"><h2>${L("Search & commands", "البحث والأوامر")}</h2>${btn("×", "close-command", 'aria-label="' + L("Close", "إغلاق") + '"')}</div><label class="lx-field"><span>${L("Find tasks, projects, goals, notes, events or sessions", "ابحث في المهام والمشاريع والأهداف والملاحظات والأحداث والجلسات")}</span><input id="lxSearch" autocomplete="off" placeholder="${L("Type to search…", "اكتب للبحث…")}"></label><div id="lxSearchResults"></div>`;
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
  function exportFinanceCSV(d) {
    if (!d || !d.finances) return;
    const csvEsc = (s) => String(s || "").replace(/"/g, '""');
    const header = "Date,Title,Amount,Type,Category,Notes\n";
    const rows = d.finances.map(f => {
      return `"${f.date || ""}","${csvEsc(f.title)}","${f.amount || 0}","${f.type || "expense"}","${csvEsc(f.category)}","${csvEsc((f.notes || "").replace(/\n/g, " "))}"`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `thenorth_finance_${C.day()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 400);
  }

  async function onClick(e) {
    if (!db.read()) return;
    const b = e.target.closest("button,[data-route]");
    if (!b) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(8); } catch {}
    }
    if (b.id === "mobileProfileBtn") {
      e.preventDefault();
      e.stopImmediatePropagation();
      navigate("account");
      return;
    }
    if (b.id === "mobileLangBtn") {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.LifeLegacy.toggleLang();
      return;
    }
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
    if (!["close", "close-command", "menu", "pricing", "feedback", "language"].includes(a)) {
      try { flushSaves(); } catch {}
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    const id = b.dataset.id,
      kind = b.dataset.kind;
    if (a !== "close-command" && b.closest("#lxCommand"))
      $("#lxCommand").close();
    if (a === "navigate") navigate(b.dataset.to);
    if (a === "language") window.LifeLegacy.toggleLang();
    if (a === "new") editor(kind, "", { projectId: b.dataset.project || "", goalId: b.dataset.goal || "" });
    if (a === "edit") editor(kind, id);
    if (a === "close") $("#lxDialog").close();
    if (a === "close-command") $("#lxCommand").close();
    if (a === "command") command();
    if (a === "menu")
      modal(
        L("Your workspace", "مساحة عملك"),
        `<div class="lx-menu-grid">${primaryRoutes
          .map(k => btn(icon(k) + name(k), "navigate", `data-to="${k}"`)).join("")}</div>
          <details class="lx-nav-more" open><summary>${L("More sections", "المزيد من الأقسام")}</summary><div class="lx-menu-grid">${secondaryRoutes
          .map(k => btn(icon(k) + name(k), "navigate", `data-to="${k}"`)).join("")}</div></details>
          <div class="lx-menu-actions" style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
            ${btn("👑 " + L("Membership & Plans", "باقات الاشتراك والعضوية"), "pricing", 'class="lx-btn lx-primary"')}
            ${btn("💡 " + L("Share feedback & ideas", "شاركنا اقتراحك وملاحظاتك"), "feedback")}
            ${btn(icon("account") + name("account"), "navigate", 'data-to="account"')}
          </div>`,
      );
    if (a === "feedback") openFeedbackModal();
    if (a === "pricing") openPricingModal();
    if (a === "upgrade-pro") {
      $("#lxDialog").close();
      notice(L("Bank card payment integration is in progress. Core tier is active — you will be notified immediately once direct card payment goes live.", "بوابة الدفع البنكي الإلكتروني قيد الربط والتفعيل — تم تفعيل الباقة العادية لك حالياً، وستصلك رسالة إشعار للترقية فور اكتمال الربط."));
    }
    if (a === "waitlist-ai") {
      try {
        const email = (currentEmail() || "").trim();
        const waitlist = JSON.parse(localStorage.getItem("thenorth_ai_waitlist") || "[]");
        if (email && !waitlist.includes(email)) waitlist.push(email);
        localStorage.setItem("thenorth_ai_waitlist", JSON.stringify(waitlist));
      } catch {}
      $("#lxDialog").close();
      notice(L("✨ You are registered on the Executive AI Coach priority waitlist!", "✨ تم تسجيلك بنجاح في قائمة الانتظار ذات الأولوية للمدرب الذكي!"));
    }
    if (a === "export-finance") {
      exportFinanceCSV(db.read());
    }
    if (a === "more-sessions") {
      historyLimit += 50;
      render();
    }
    if (a === "manual") manualDialog();
    if (a === "pomodoro-settings") pomodoroSettings();
    if (a === "filter") {
      taskFilter = b.dataset.filter;
      render();
    }
    if (a === "calendar-mode") {
      calendarMode = b.dataset.mode;
      render();
    }
    if (a === "planning-mode") navigate("planning", b.dataset.mode);
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
    if (a === "habit-toggle") {
      await mutate((d) => C.toggleHabit(d, id, C.day()));
      window.LifeLegacy?.renderAll?.();
    }
    if (a === "habit-toggle-day") {
      await mutate((d) => C.toggleHabit(d, id, b.dataset.date));
      window.LifeLegacy?.renderAll?.();
    }
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
        const item = d[kind]?.find((x) => x.id === id);
        if (item) item.archived = true;
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
      try {
        const raw = localStorage.getItem(
          "lifeos_recovery_" + localStorage.getItem(C.SESSION_KEY),
        );
        if (!raw) throw Error("noBackup");
        const restored = JSON.parse(raw);
        const validated = C.migrate(restored);
        await mutate((d) => {
          for (const k of Object.keys(d)) delete d[k];
          Object.assign(d, validated);
        });
        $("#lxDialog").close();
        window.LifeLegacy.applyLang();
        notice(L("Data restored successfully.", "تمت استعادة البيانات بنجاح."));
      } catch (e) {
        error(e);
      }
    }
  }

  function openFeedbackModal() {
    modal(
      L("Share feedback & suggestions", "شاركنا اقتراحك لتطوير THE NORTH"),
      `<form id="lxFeedbackForm">
        <p class="lx-muted" style="margin-bottom:14px;font-size:13px">${L("Your thoughts directly guide our roadmap. Tell us what would make you 10x more effective.", "صوتك وملاحظاتك تساهم مباشرة في توجيه خارطة تطوير النظام وبناء أفضل تجربة ممكنة.")}</p>
        <div class="lx-feedback-cats" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <label class="lx-pill-opt"><input type="radio" name="fbCategory" value="feature" checked> <span>💡 ${L("New Feature", "ميزة جديدة")}</span></label>
          <label class="lx-pill-opt"><input type="radio" name="fbCategory" value="ux"> <span>⚡ ${L("UX / Speed", "تجربة وسرعة")}</span></label>
          <label class="lx-pill-opt"><input type="radio" name="fbCategory" value="bug"> <span>🐞 ${L("Bug report", "إبلاغ عن خطأ")}</span></label>
        </div>
        <label class="lx-field">
          <span>${L("Your suggestion or feedback", "اقتراحك أو فكرتك بالتفصيل")}</span>
          <textarea name="fbMessage" rows="4" required placeholder="${L("Describe what feature, refinement, or friction point you have in mind…", "اكتب فكرتك أو ملاحظتك أو المشكلة التي واجهتها بالتفصيل…")}"></textarea>
        </label>
        <label class="lx-field">
          <span>${L("Your email (optional, for updates)", "بريدك الإلكتروني (اختياري، لمتابعة التحديث)")}</span>
          <input type="email" name="fbEmail" value="${esc(currentEmail() || "")}" placeholder="name@example.com">
        </label>
        <div class="lx-dialog-footer">
          <button class="lx-btn" type="button" data-action="close">${L("Cancel", "إلغاء")}</button>
          <button class="lx-btn lx-primary" type="submit">${L("Submit feedback", "إرسال الاقتراح")}</button>
        </div>
      </form>`
    );
  }

  function openPricingModal() {
    modal(
      L("THE NORTH Membership & Plans", "باقات THE NORTH والترقية"),
      `<div class="lx-pricing-modal">
        <p class="lx-muted" style="margin-bottom:18px;font-size:13px">${L("Transparent tiers for compounding momentum. Choose your velocity.", "باقات شفافة لمضاعفة سرعة وزخم أهدافك. اختر المستوى الملائم لطموحك.")}</p>
        <div class="lx-pricing-grid">
          <!-- CORE -->
          <div class="lx-tier-card">
            <div class="lx-tier-status">${L("CURRENT PLAN", "باقتك الحالية")}</div>
            <h3>${L("Core", "النواة (Core)")}</h3>
            <div class="lx-tier-price"><strong>${L("Free", "مجاناً")}</strong> <small>${L("forever", "مدى الحياة")}</small></div>
            <p class="lx-tier-desc">${L("For individuals establishing their baseline execution rhythm.", "لبناء إيقاع انضباط وتنفيذ يومي حقيقي.")}</p>
            <ul class="lx-tier-features">
              <li>✓ ${L("Identity Cascade Pipeline", "سلسلة الهوية والأهداف المتسلسلة")}</li>
              <li>✓ ${L("Deep Work Capsule & Pomodoro", "كبسولة العمل العميق ومؤقت البومودورو")}</li>
              <li>✓ ${L("Visual Radar Momentum Map", "رادار الزخم البصري للأهداف")}</li>
              <li>✓ ${L("100% Private Offline Storage", "تخزين محلي خاص يعمل دون إنترنت")}</li>
            </ul>
            <button class="lx-btn" disabled style="width:100%;opacity:0.6">${L("Active Plan", "الخطة الحالية")}</button>
          </div>

          <!-- PRO -->
          <div class="lx-tier-card is-pro">
            <div class="lx-tier-badge">${L("MOST POPULAR", "الأكثر طلباً")}</div>
            <h3>${L("Pro", "المحترف (Pro)")}</h3>
            <div class="lx-tier-price"><strong>$2.99</strong> <small>${L("/ month", "/ شهرياً")}</small></div>
            <p class="lx-tier-desc">${L("For founders and executives who execute across multiple machines.", "للمؤسسين والقادة الذين يديرون مشاريعهم عبر أجهزة متعددة.")}</p>
            <ul class="lx-tier-features">
              <li class="lead">✓ ${L("Everything in Core, plus:", "كل ما في باقة Core، بالإضافة إلى:")}</li>
              <li>💎 ${L("Executive capital & finance budget tracker", "إدارة التدفقات المالية وتوزيع رأس المال الذكي")}</li>
              <li>✓ ${L("Real-time encrypted cloud sync", "مزامنة سحابية فورية ومشفرة")}</li>
              <li>✓ ${L("30-day velocity audits & analytics", "تحليلات وتدقيق الزخم لآخر 30 يوماً")}</li>
              <li>✓ ${L("Unlimited goals & projects", "أهداف ومشاريع غير محدودة")}</li>
              <li>✓ ${L("Exportable executive reports", "تصدير تقارير تنفيذية عالية الدقة")}</li>
            </ul>
            <button class="lx-btn lx-primary" data-action="upgrade-pro" style="width:100%">${L("Upgrade to Pro ($2.99)", "الترقية إلى Pro (2.99$)")}</button>
            <small style="font-size:11px;color:var(--n-i3);margin-top:8px;text-align:center;display:block">${L("Bank card integration in progress — click to register interest", "بوابة الدفع البنكي الإلكتروني قيد الربط والتفعيل — انقر لتسجيل رغبتك")}</small>
          </div>

          <!-- EXECUTIVE AI COACH -->
          <div class="lx-tier-card is-ai">
            <div class="lx-tier-badge is-soon">✨ ${L("COMING SOON", "قريباً · COMING SOON")}</div>
            <h3>${L("Executive AI", "المدرب الذكي (AI Coach)")}</h3>
            <div class="lx-tier-price"><strong>$9.99</strong> <small>${L("/ month", "/ شهرياً")}</small></div>
            <p class="lx-tier-desc">${L("An autonomous AI accountability coach that studies your performance data.", "مدرب ذكاء اصطناعي تنفيذي يقرأ بيانات حسابك ويوجهك أسبوعياً.")}</p>
            <ul class="lx-tier-features">
              <li class="lead">✓ ${L("Everything in Pro, plus:", "كل ما في باقة Pro، بالإضافة إلى:")}</li>
              <li>🧠 ${L("Autonomous AI Coach for focus & decay", "مدرب ذكي يحلل جلسات تركيزك وسرعة زخمك")}</li>
              <li>🧠 ${L("Automated detection of procrastination", "اكتشاف تلقائي للتسويف وهدر الانتباه")}</li>
              <li>🧠 ${L("Weekly executive strategic briefings", "إحاطة استراتيجية أسبوعية مخصصة")}</li>
              <li>🧠 ${L("Dynamic habit biological calibration", "معايرة عاداتك حسب أوقات ذروة طاقتك")}</li>
            </ul>
            <button class="lx-btn lx-btn-ai" data-action="waitlist-ai" style="width:100%">${L("Join Priority Waitlist", "الانضمام لقائمة الانتظار المبكرة")}</button>
          </div>
        </div>
        <div class="lx-dialog-footer" style="margin-top:22px;display:flex;justify-content:flex-end">
          <button type="button" class="lx-btn wide" data-action="close">${L("Back / Close", "رجوع / إغلاق")}</button>
        </div>
      </div>`
    );
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
    if (form.id !== "lxFeedbackForm") {
      try { flushSaves(); } catch {}
    }
    const data = Object.fromEntries(new FormData(form));
    const submitButton = form.querySelector("[type=submit]");
    if (submitButton) submitButton.disabled = true;
    let result;
    try {
      if (form.id === "lxFeedbackForm") {
        const cat = data.fbCategory || "feature";
        const msg = String(data.fbMessage || "").trim();
        const eml = String(data.fbEmail || "").trim();
        if (!msg) {
          notice(L("Please write your suggestion.", "يرجى كتابة فكرتك أو ملاحظتك."), true);
          if (submitButton) submitButton.disabled = false;
          return;
        }
        try {
          const stored = JSON.parse(localStorage.getItem("thenorth_feedbacks") || "[]");
          stored.push({ id: C.id(), date: Date.now(), category: cat, message: msg, email: eml });
          localStorage.setItem("thenorth_feedbacks", JSON.stringify(stored));
        } catch {}
        try {
          const client = window.NorthAuth?.client;
          if (client) {
            client.from("feedbacks").insert([{ category: cat, message: msg, email: eml, created_at: new Date().toISOString() }]).then(() => {}, () => {});
          }
        } catch {}
        $("#lxDialog").close();
        notice(L("Thank you! Your feedback directly shapes the future of THE NORTH.", "شكراً لك! صوتك واقتراحك يبني معنا مستقبل THE NORTH."));
        return;
      }
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
          if (k in data) if (form.elements[k]) data[k] = Number(data[k]);
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
          if (kind === "habits") {
            item.checks = item.checks || [];
            item.frequency = data.frequency || "daily";
            item.goalId = data.goalId || "";
            item.impact = Number(data.impact) >= 0 ? Number(data.impact) : 5;
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
            const source = d.inbox?.find((x) => x.id === form.dataset.source);
            if (source) {
              source.archived = true;
              source.convertedTo = { kind, id: item.id };
            }
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
      if (["lxSettingsForm", "lxPomodoroForm"].includes(form.id)) {
        for (const k of [
          "dailyHours",
          "weeklyHours",
          "focusMinutes",
          "shortBreak",
          "longBreak",
          "cycles",
          "weekStart",
        ])
          if (form.elements[k]) data[k] = Number(data[k]);
        for (const k of ["autoBreak", "autoFocus", "sound", "notifications"])
          if (form.elements[k]) data[k] = form.elements[k].checked;
        result = await mutate((d) => {
          if (typeof data.categories === "string") d.categories = [
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
        if (result) { if (form.id === "lxPomodoroForm") $("#lxDialog").close(); render(); notice(L("Preferences saved", "تم حفظ التفضيلات")); }
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
    d.habits.forEach((habit) => {
      if (habit.archived || !habit.time) return;
      const doneToday = habit.checks?.includes(today);
      if (doneToday) return;
      const at = +new Date(today + "T" + habit.time);
      if (Date.now() >= at && Date.now() - at <= 3600000) {
        alerts.push({
          id: "habit-" + habit.id + "-" + today,
          title: L("Habit reminder: ", "تذكير بالعادة: ") + habit.title,
        });
      }
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
