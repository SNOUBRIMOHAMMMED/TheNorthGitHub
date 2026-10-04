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
  const currentEmail = () => localStorage.getItem(C.SESSION_KEY) || "";
  // Only server-managed app_metadata represents an entitlement.
  const userTier = () => {
    return "pro"; // All features unlocked for everyone
  };
  const ar = () => document.documentElement.lang === "ar";
  const L = (en, arabic) => (ar() ? arabic : en);
  
  let activeTipEl = null;
  function tip(text) {
    return `<button type="button" class="v3-info-tip" data-action="show-tip" data-tip="${esc(text)}" aria-label="info">?</button>`;
  }
  function showTip(btn, text) {
    let existing = document.getElementById("v3GlobalTip");
    if (existing) {
      existing.remove();
      if (activeTipEl === btn) {
        activeTipEl = null;
        return;
      }
    }
    activeTipEl = btn;
    const pop = document.createElement("div");
    pop.id = "v3GlobalTip";
    pop.className = "v3-info-popover";
    pop.innerHTML = `<div class="v3-tip-body">${esc(text)}</div>`;
    document.body.appendChild(pop);

    const rect = btn.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    let top = rect.top - popRect.height - 8;
    if (top < 10) top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (popRect.width / 2);
    if (left < 10) left = 10;
    if (left + popRect.width > window.innerWidth - 10) {
      left = window.innerWidth - popRect.width - 10;
    }
    pop.style.top = `${Math.round(top)}px`;
    pop.style.left = `${Math.round(left)}px`;
    pop.classList.add("visible");
    setTimeout(() => {
      if (document.getElementById("v3GlobalTip") === pop) {
        pop.remove();
        if (activeTipEl === btn) activeTipEl = null;
      }
    }, 6500);
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".v3-info-tip") && !e.target.closest("#v3GlobalTip")) {
      const existing = document.getElementById("v3GlobalTip");
      if (existing) {
        existing.remove();
        activeTipEl = null;
      }
    }
  });

  const labels = {
    home: ["Home", "الرئيسية"],
    goals: ["Goals", "الأهداف"],
    tasks: ["Tasks", "المهام"],
    focus: ["Focus", "التركيز"],
    finances: ["Finances", "المال"],
    analytics: ["Analytics", "التحليلات"],
    dashboard: ["Momentum", "زخم الأهداف"],
    planner: ["Goal cascade", "خطة الأهداف"],
    notifications: ["Signals", "الإشارات"],
    account: ["Settings", "الإعدادات"],
    projects: ["Projects", "المشاريع"],
    notes: ["Notes", "الملاحظات"],
    inbox: ["Inbox", "الوارد"],
    events: ["Events", "الأحداث"],
    calendar: ["Calendar", "التقويم"],
    habits: ["Habits", "العادات"],
    planning: ["Planning & reviews", "التخطيط والمراجعات"],
  };
  const primaryRoutes = ["home", "goals", "tasks", "finances", "analytics"];
  const secondaryRoutes = ["inbox", "dashboard", "planner", "notifications", "account"];
  const name = (k) => (labels[k] ? L(...labels[k]) : k === "projects" ? L("Projects", "المشاريع") : k);
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
  const fmtMinSec = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const btn = (text, action, extra = "", primary = false) => {
    const match = extra.match(/class="([^"]*)"/);
    const attrs = extra.replace(/class="[^"]*"/, "");
    return `<button type="button" class="lx-btn ${primary ? "lx-primary" : ""} ${match?.[1] || ""}" data-action="${action}" ${attrs}>${text}</button>`;
  };
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
      invalidPayment:L("Payment must not exceed the remaining debt.","مبلغ السداد يجب ألا يتجاوز المبلغ المتبقي من الدين."),
      debtNotFound:L("This debt no longer exists. Reopen the list.","هذا الدين غير موجود. أعد فتح القائمة."),
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
        (e.name === "QuotaExceededError" || e.name === "SecurityError" ? L(
          "Could not save. Storage may be full or unavailable. Export a backup and try again.",
          "تعذر الحفظ. قد تكون مساحة التخزين ممتلئة أو غير متاحة. صدّر نسخة احتياطية وأعد المحاولة.",
        ) : L("Could not complete this action. Reload the page and try again.", "تعذر إكمال هذا الإجراء. حدّث الصفحة وأعد المحاولة.")),
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
          ? "#000000"
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
      navigate(labels[r] ? r : "home", i || "", false);
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
    const moreOpen = !!$(".side-nav .lx-nav-more")?.open;
    $(".side-nav").innerHTML = primary.map(navItem).join("") +
      `<details class="lx-nav-more" ${moreOpen ? "open" : ""}><summary>${L("More", "المزيد")}</summary>${secondary.map(navItem).join("")}</details>`;
    const dockIcon = (k) => {
      const flat = {
        home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
        goals: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M16.5 7.5 21 3"/>',
        tasks: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/><path d="M8 8h8M8 16h4"/>',
        finances: '<rect width="20" height="14" x="2" y="5" rx="3"/><line x1="2" x2="22" y1="10" y2="10"/><circle cx="16" cy="15" r="1.5"/>',
        focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4M12 2v2"/>',
        account: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
        more: '<path d="M5 6h14M5 12h14M5 18h14"/>'
      };
      if (flat[k]) return `<svg viewBox="0 0 24 24" aria-hidden="true">${flat[k]}</svg>`;
      return icon(k);
    };
    const mobileRoutes = ["home", "goals", "tasks", "finances", "account"];
    const bottomNavEl = $(".bottom-nav");
    if (bottomNavEl) {
      bottomNavEl.innerHTML = mobileRoutes.map(k => {
        const isAct = route === k || (k === "account" && route === "account");
        const labelText = k === "finances" ? L("Finances", "المال") : (k === "account" ? L("Settings", "الإعدادات") : name(k));
        return `<button class="bottom-item ${isAct ? "active" : ""}" data-route="${k}" aria-label="${labelText}" ${isAct ? 'aria-current="page"' : ""}>
          <span class="dock-icon-wrap">${dockIcon(k)}<i class="active-dot" aria-hidden="true"></i></span>
          <small>${labelText}</small>
        </button>`;
      }).join("");
    }
    // Desktop topbar: breadcrumb + actions (hidden on mobile via CSS)
    $("#lxTopbar").innerHTML =
      `<div class="lx-topbar-brand"><span class="brand-mark lifeos-mark" aria-hidden="true"></span><div class="lx-breadcrumb">THE NORTH <span>/</span> ${name(route)}</div></div><div class="lx-top-actions"><button class="lx-btn lx-menu-button" data-action="menu">${icon("tasks")}${L("Explore","الأقسام")}</button>${btn(icon("inbox")+L("Search","بحث"),"command",'aria-label="'+L("Search, Control K","بحث، Control K")+'"')}${btn(ar()?"EN":"عربي","language")}${btn(icon("account"),"navigate",'data-to="account" aria-label="'+name("account")+'"')}</div>`;
    // Mobile header: hide the big wordmark text, show page name as small label
    const mh = $(".mobile-header");
    if (mh) {
      const initial = (db.read()?.profile?.name || (isAdmin() ? "محمد" : "N")).slice(0, 1).toUpperCase();
      mh.innerHTML = `<div class="v3-header-start">
        <span class="brand-mark lifeos-mark" aria-hidden="true"></span>
        <span class="v3-header-page-title">${name(route)}</span>
      </div>
      <div class="v3-header-cluster">
        <button type="button" class="v3-hdr-btn" data-action="language">${ar() ? "EN" : "عربي"}</button>
        <button type="button" class="v3-hdr-btn v3-hdr-menu" data-action="menu" aria-label="${L("Explore", "الأقسام")}">
          <svg viewBox="0 0 24 24" class="v3-menu-svg"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
        </button>
        <button type="button" class="v3-hdr-avatar" data-action="navigate" data-to="account" aria-label="${L("Settings", "الإعدادات")}">
          <span>${esc(initial)}</span>
        </button>
      </div>`;
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
      if (location.hash !== "#" + r + (id ? "/" + id : "")) window.history.pushState(null, "", "#" + r + (id ? "/" + id : ""));
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
  function heading(title, sub, actions = "", tipText = "") {
    const tipHtml = tipText ? ` ${tip(tipText)}` : "";
    return `<div class="lx-page-head"><div><div class="lx-eyebrow">THE NORTH / ${name(route)}</div><h1 tabindex="-1">${title}${tipHtml}</h1><p>${sub}</p></div><div class="lx-actions">${actions}</div></div>`;
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
    return `<div class="lx-stats">${stat(L("Most tracked day", "اليوم الأكثر تسجيلًا"), values[0]?.value ? dateText(values[0].date) : "—")}${stat(L("Least tracked day", "أقل يوم تسجيلًا"), values.length ? dateText(values[values.length - 1].date) : "—")}${stat(L("Leading project", "المشروع الأكثر عملًا"), esc(ps[0]?.value ? ps[0].name : "—"))}${stat(L("Tasks completed this week", "المهام المكتملة هذا الأسبوع"), d.tasks.filter((t) => t.done && t.completedDate >= C.day(start)).length)}</div>`;
  }
  function page(d) {
    switch (route) {
      case "home":
      case "today":
        return home(d);
      case "tasks":
        return tasks(d);
      case "focus":
        return focus(d);
      case "goals":
        return goals(d);
      case "finances":
        return finance(d);
      case "analytics":
        return analytics(d);
      case "dashboard":
        return dashboard(d);
      case "planner":
        return planner(d);
      case "notifications":
        return notifications(d);
      case "account":
        return account(d);
      case "inbox": return inbox(d);
      case "notes": return notes(d);
      case "projects": return projects(d);
      case "habits": return habits(d);
      case "calendar":
      case "events": return calendar(d);
      case "planning": return planning(d);
      default:
        return home(d);
    }
  }

  function calcGoalProgress(g, d) {
    return C.goalProgress(g, d);
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
          return `<button class="lx-goal-tile" data-route="goals" data-id="${esc(g.id)}"><strong>${esc(g.name)}</strong><span class="lx-goal-value">${calcGoalProgress(g, d)}% <small>${L("of 100%", "من 100%")}</small></span><svg viewBox="0 0 240 70" role="img" aria-label="${L("Recorded momentum history", "سجل زخم الهدف الفعلي")}" preserveAspectRatio="none"><path d="M0 69H240" stroke="var(--lx-line)"/><polyline points="${values.map((v, i) => `${(i * 240) / Math.max(1, values.length - 1)},${65 - Math.max(0, Math.min(100, v)) * 0.6}`).join(" ")}" fill="none" stroke="currentColor" stroke-width="3"/></svg><small>${L("Momentum history · progress below", "سجل الزخم · نسبة الإنجاز أدناه")}</small>${progress(calcGoalProgress(g, d))}<small>${g.deadline ? L("Destination date: ", "موعد الوصول: ") + dateText(g.deadline) : L("Set a destination date", "حدد موعد الوصول")} · ${100 - calcGoalProgress(g, d)}% ${L("remaining", "متبقٍ")}</small></button>`;
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
  let financeTab = "overview";
  let financeMonth = "";
  let financeTxFilter = "all";

  const financeCategories = [
    { id: "salary", icon: "💼", en: "Salary / My Job", ar: "راتب / وظيفة (My Job)", color: "#10B981", type: "income" },
    { id: "business", icon: "📈", en: "Business / Dividends", ar: "أرباح ومشاريع (Business)", color: "#06B6D4", type: "income" },
    { id: "freelance", icon: "💻", en: "Freelance", ar: "أعمال حرة ومستقلة", color: "#3B82F6", type: "income" },
    { id: "tools_income", icon: "🛍️", en: "Tools & Products", ar: "مبيعات أدوات وتطبيقات", color: "#6366F1", type: "income" },
    { id: "other_income", icon: "💵", en: "Other Income", ar: "دخل إضافي آخر", color: "#8B5CF6", type: "income" },

    { id: "housing", icon: "🏠", en: "Housing / Rent (Lkarya)", ar: "كراء وسكن (Lkarya)", color: "#8B5CF6", type: "expense" },
    { id: "food", icon: "🍽️", en: "Food & Dining (lmakla)", ar: "أكل ومطاعم (lmakla 3la barra)", color: "#F59E0B", type: "expense" },
    { id: "pocket", icon: "👛", en: "Pocket Money (lmasrof)", ar: "مصروف شخصي (lmasrof)", color: "#EC4899", type: "expense" },
    { id: "telecom", icon: "📱", en: "Phone & Mobile", ar: "هاتف ومكالمات (Mobile phone)", color: "#6366F1", type: "expense" },
    { id: "internet", icon: "🌐", en: "Internet", ar: "إنترنت (Internet)", color: "#14B8A6", type: "expense" },
    { id: "subscriptions", icon: "🔄", en: "Subscriptions", ar: "اشتراكات وبرامج", color: "#06B6D4", type: "expense" },
    { id: "education", icon: "📚", en: "Courses & Books", ar: "دورات وكتب (Cources / Books)", color: "#38BDF8", type: "expense" },
    { id: "tools", icon: "🛠️", en: "Tools & Apps", ar: "أدوات وتطبيقات (Tools)", color: "#A855F7", type: "expense" },
    { id: "bank", icon: "🏦", en: "Bank Fees", ar: "رسوم بنكية (fees bank)", color: "#94A3B8", type: "expense" },
    { id: "debt", icon: "🤝", en: "Debts & Credi", ar: "ديون والتزامات (Credi)", color: "#F43F5E", type: "expense" },
    { id: "savings", icon: "💰", en: "Savings & Invest", ar: "ادخار واستثمار", color: "#059669", type: "expense" },
    { id: "transport", icon: "🚗", en: "Transport & Taxi", ar: "مواصلات وتنقل", color: "#F97316", type: "expense" },
    { id: "health", icon: "🏥", en: "Health", ar: "صحة وعلاج", color: "#EF4444", type: "expense" },
    { id: "other", icon: "📋", en: "Other", ar: "أخرى ومتنوعات", color: "#64748B", type: "expense" }
  ];

  function getCategoryInfo(catName, type) {
    const raw = String(catName || "").trim();
    const lower = raw.toLowerCase();
    const candidates = financeCategories.filter(c => !type || c.type === type);
    const exact = candidates.find(c => [c.id, c.en, c.ar].some(v => v.toLowerCase() === lower));
    if (exact) return exact;
    const aliases = {salary: ["salary", "job", "jop"], housing:["karya", "rent", "housing"], food:["makla", "food", "dining"], pocket:["masrof", "pocket"], debt:["credi", "debt"], education:["cource", "course", "book", "education"], bank:["fee", "bank"], telecom:["phone", "mobile"], internet:["internet"], tools:["tools"], subscriptions:["subscription"], savings:["saving", "invest"]};
    const alias = candidates.find(c => aliases[c.id]?.some(v => lower.includes(v)));
    if (alias) return alias;
    return {id: raw ? "custom:" + lower : "other", icon:"🏷️", en:raw || "Other", ar:raw || "أخرى", color:"#818CF8", type};
  }

  function expenseGroups(rows) {
    const groups = new Map();
    for (const row of rows.filter(x => x.type !== "income")) {
      const info = getCategoryInfo(row.category, "expense");
      const entry = groups.get(info.id) || {...info, amount:0};
      entry.amount += Math.round(Number(row.amount || 0) * 100);
      groups.set(info.id, entry);
    }
    return [...groups.values()].sort((a,b) => b.amount-a.amount);
  }

  function getStartingBalance(d, m) {
    if (d?.settings?.monthlyStartingBalance && typeof d.settings.monthlyStartingBalance[m] === "number") {
      return d.settings.monthlyStartingBalance[m];
    }
    if (typeof d?.settings?.startingBalance === "number") return d.settings.startingBalance;
    return 0;
  }

  function getDebts(d) {
    return Array.isArray(d?.settings?.debts) ? d.settings.debts : [];
  }

  function getFinancePlan(d, m) {
    const saved = d?.settings?.financePlans?.[m];
    return {
      income: (saved?.income || []).map(x => ({...x, source: x.source || x.category || ""})),
      expenses: saved?.expenses || []
    };
  }

  async function setStartingBalance(m, amount) {
    return mutate((d) => {
      if (!d.settings) d.settings = {};
      if (!d.settings.monthlyStartingBalance) d.settings.monthlyStartingBalance = {};
      d.settings.monthlyStartingBalance[m] = amount;

    });
  }

  async function setFinancePlan(m, plan) {
    return mutate((d) => {
      if (!d.settings) d.settings = {};
      if (!d.settings.financePlans) d.settings.financePlans = {};
      d.settings.financePlans[m] = plan;
    });
  }

  function formatFinanceMonth(m) {
    if (!m || typeof m !== "string") return "";
    const p = m.split("-");
    if (p.length < 2) return m;
    const y = p[0], mon = parseInt(p[1], 10);
    const arMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const enMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return ar() ? (arMonths[mon - 1] + " " + y) : (enMonths[mon - 1] + " " + y);
  }

  function finance(d) {
    const curMonth = financeMonth || C.day().slice(0, 7),
      normMonth = (s) => {
        if (!s || typeof s !== "string") return "";
        const p = s.split("-");
        return p.length >= 2 ? (p[0] + "-" + p[1].padStart(2, "0")) : s.slice(0, 7);
      },
      rows = d.finances.filter((x) => !x.archived && normMonth(x.date) === curMonth),
      income = rows.filter((x) => x.type === "income").reduce((n, x) => n + Math.round(Number(x.amount || 0) * 100), 0),
      spent = rows.filter((x) => x.type !== "income").reduce((n, x) => n + Math.round(Number(x.amount || 0) * 100), 0),
      money = (n) => new Intl.NumberFormat(ar() ? "ar-MA" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((n || 0) / 100) + " " + esc(d.settings.currency || "MAD"),
      startBalance = getStartingBalance(d, curMonth),
      plan = getFinancePlan(d, curMonth),
      debts = getDebts(d),
      plannedIncome = plan.income.reduce((n, x) => n + Math.round(Number(x.amount || 0) * 100), 0),
      plannedSpent = plan.expenses.reduce((n, x) => n + Math.round(Number(x.amount || 0) * 100), 0),
      netCashflow = income - spent,
      totalBalance = Math.round(startBalance * 100) + netCashflow,
      plannedTotalBalance = Math.round(startBalance * 100) + (plannedIncome - plannedSpent),
      totalDebts = debts.reduce((n, x) => n + Math.round(Number(x.totalAmount || 0) * 100), 0),
      paidDebts = debts.reduce((n, x) => n + Math.round(Number(x.paidAmount || 0) * 100), 0),
      remainingDebts = Math.max(0, totalDebts - paidDebts),
      savingsRate = income > 0 ? Math.max(0, Math.round(((income - spent) / income) * 100)) : 0;

    const now = new Date(), [year, monthNumber] = curMonth.split("-").map(Number);
    const totalDays = new Date(year, monthNumber, 0).getDate();
    const currentMonth = C.day().slice(0, 7);
    const currentDay = curMonth < currentMonth ? totalDays : curMonth > currentMonth ? 0 : now.getDate();
    const monthProgress = currentDay / totalDays;
    const spentRatio = plannedSpent > 0 ? spent / plannedSpent : 0;

    let advice = "";
    if (plannedSpent > 0 && spentRatio > monthProgress + 0.15) {
      advice = `<div class="lx-advice-card warning">⚠️ <strong>${L("Burn Rate Alert", "تنبيه سرعة الإنفاق")}</strong>: ${L("Your expenses are outpacing this month’s timeline. Watch discretionary purchases.", "سرعة إنفاقك تسبق الأيام المتبقية من الشهر. حاول ضبط المصاريف الجانبية.")}</div>`;
    } else if (remainingDebts > 0 && paidDebts === 0) {
      advice = `<div class="lx-advice-card info">🤝 <strong>${L("Debt Repayment", "إدارة الالتزامات")}</strong>: ${L("You have active debts. Logging installments regularly helps achieve full financial freedom.", "لديك ديون مستحقة مسجلة. ننصح بتسجيل دفعات منتظمة لتصفيتها وتحقيق الاستقرار المالي.")}</div>`;
    } else if (plannedSpent > 0 && income > 0 && spentRatio < monthProgress - 0.08) {
      advice = `<div class="lx-advice-card good">✅ <strong>${L("Masterful Discipline", "انضباط مالي ممتاز")}</strong>: ${L("Spending is well under your monthly planned targets. Great savings discipline!", "المصاريف أقل من المخطط لها ومعدل الادخار إيجابي. استمر على هذا النهج المميز!")}</div>`;
    }

    const categoriesOptions = financeCategories.filter(c => c.type === "expense").map(c => `<option value="${esc(c.en)}">${c.icon} ${esc(ar() ? c.ar : c.en)}</option>`).join("");

    return (
      `<div class="lx-page-head v3-finance-page-head">
        <div>
          <div class="lx-eyebrow">THE NORTH / ${name(route)}</div>
          <h1 tabindex="-1">${L("Executive Financial Command", "مركز القيادة المالية التنفيذية")}</h1>
          <p>${L("Plan vs Actual budgets, starting balance, debt ledger, and daily cash flow.", "المخطط مقابل الفعلي، الرصيد الافتتاحي، إدارة الديون، وسجل المعاملات اليومية.")}</p>
        </div>
        <div class="lx-actions v3-finance-top-actions">
          <div class="v3-finance-month-nav">
            <button type="button" class="v3-month-arrow-btn" data-action="finance-month-prev" title="${L("Previous month", "الشهر السابق")}">‹</button>
            <span class="v3-finance-month-label">${formatFinanceMonth(curMonth)}</span>
            <button type="button" class="v3-month-arrow-btn" data-action="finance-month-next" title="${L("Next month", "الشهر التالي")}">›</button>
          </div>
          <details class="lx-details"><summary>${L("Budget & export", "الميزانية والتصدير")}</summary><div class="lx-menu-actions">          ${btn("✏️ " + L("Starting Balance", "الرصيد الافتتاحي"), "finance-start-balance", 'class="lx-btn lx-secondary"')}
          ${btn("⚙️ " + L("Budget Plan", "خطة الميزانية"), "finance-plan-edit", 'class="lx-btn lx-secondary"')}
          ${btn("📥 " + L("Export CSV", "تصدير CSV"), "export-finance", 'class="lx-btn lx-secondary"')}
</div></details>
          ${btn("+ " + L("Transaction", "معاملة"), "new", 'data-kind="finances"', true)}
        </div>
      </div>` +
      advice +
      `<section class="v3-finance-kpi-grid">
        <div class="v3-kpi-card total-balance">
          <div class="v3-kpi-head">
            <span class="v3-kpi-icon">💼</span>
            <span class="v3-kpi-title">${L("Total Balance", "الرصيد الإجمالي")}</span>
          </div>
          <strong class="v3-kpi-val" dir="auto">${money(totalBalance)}</strong>
          <div class="v3-kpi-sub">
            <span>${L("Starting:", "الافتتاحي:")} ${money(Math.round(startBalance * 100))}</span>
            <span>·</span>
            <span>${L("Expected:", "المتوقع:")} ${money(plannedTotalBalance)}</span>
          </div>
        </div>

        <div class="v3-kpi-card income">
          <div class="v3-kpi-head">
            <span class="v3-kpi-icon">📈</span>
            <span class="v3-kpi-title">${L("Total Income", "إجمالي الدخل")}</span>
          </div>
          <strong class="v3-kpi-val" dir="auto" style="color:#10B981">${money(income)}</strong>
          <div class="v3-kpi-sub">
            <span>${L("Plan:", "المخطط:")} ${money(plannedIncome)}</span>
            <span class="v3-kpi-badge ${income >= plannedIncome ? 'good' : 'neutral'}">${plannedIncome > 0 ? Math.round((income / plannedIncome) * 100) + "%" : L("No plan", "لم تُحدّد خطة")}</span>
          </div>
        </div>

        <div class="v3-kpi-card expenses">
          <div class="v3-kpi-head">
            <span class="v3-kpi-icon">📉</span>
            <span class="v3-kpi-title">${L("Total Expenses", "إجمالي المصاريف")}</span>
          </div>
          <strong class="v3-kpi-val" dir="auto" style="color:#F43F5E">${money(spent)}</strong>
          <div class="v3-kpi-sub">
            <span>${L("Plan:", "المخطط:")} ${money(plannedSpent)}</span>
            <span class="v3-kpi-badge ${spent <= plannedSpent ? 'good' : 'warning'}">${plannedSpent <= 0 ? L("No budget", "لم تُحدّد ميزانية") : spent <= plannedSpent ? (L("Saved:", "وفرت:") + " " + money(plannedSpent - spent)) : (L("Over:", "تجاوز:") + " " + money(spent - plannedSpent))}</span>
          </div>
        </div>

        <div class="v3-kpi-card cashflow">
          <div class="v3-kpi-head">
            <span class="v3-kpi-icon">📊</span>
            <span class="v3-kpi-title">${L("Net Cashflow", "صافي التدفق")}</span>
          </div>
          <strong class="v3-kpi-val" dir="auto" style="color:${netCashflow >= 0 ? '#10B981' : '#F43F5E'}">${netCashflow >= 0 ? "+" : "−"} ${money(Math.abs(netCashflow))}</strong>
          <div class="v3-kpi-sub">
            <span>${L("Income surplus:", "نسبة فائض الدخل:")} ${savingsRate}%</span>
          </div>
        </div>

        <div class="v3-kpi-card debts">
          <div class="v3-kpi-head">
            <span class="v3-kpi-icon">🤝</span>
            <span class="v3-kpi-title">${L("Debts Remaining", "الديون والالتزامات")}</span>
          </div>
          <strong class="v3-kpi-val" dir="auto" style="color:#A78BFA">${money(remainingDebts)}</strong>
          <div class="v3-kpi-sub">
            <span>${L("Paid:", "سُدد:")} ${money(paidDebts)} ${L("of", "من")} ${money(totalDebts)}</span>
          </div>
        </div>
      </section>

      <section class="v3-quick-tx-card">
        <div class="v3-quick-tx-head">
          <span>⚡ <strong>${L("Quick Daily Transaction", "تسجيل سريع لمعاملة اليوم")}</strong></span>
          <small class="lx-muted">${L("Fast daily expense/income logger matching your sheet", "تسجيل سريع للمصاريف أو الدخل بضغطة زر واحدة")}</small>
        </div>
        <form id="lxQuickTxForm" class="v3-quick-tx-form">
          <div class="v3-quick-tx-pills">
            <label class="v3-tx-radio-pill"><input type="radio" name="type" value="expense" checked><span>📉 ${L("Expense", "مصروف")}</span></label>
            <label class="v3-tx-radio-pill"><input type="radio" name="type" value="income"><span>📈 ${L("Income", "دخل")}</span></label>
          </div>
          <input type="number" step="0.01" min="0.01" name="amount" aria-label="${L("Amount", "المبلغ")}" placeholder="${L("Amount", "المبلغ")}" required class="v3-quick-input amt">
          <select name="category" aria-label="${L("Category", "الفئة")}" class="v3-quick-input cat" required>
            <option value="">${L("Choose a category", "اختر الفئة")}</option>${categoriesOptions}
          </select>
          <input type="text" name="title" placeholder="${L("Title (e.g. Lunch, Rent, Course...)", "البيان (مثال: غداء، كراء، دورة...)")}" required class="v3-quick-input title">
          <input type="date" name="date" aria-label="${L("Transaction date", "تاريخ المعاملة")}" value="${C.day()}" required class="v3-quick-input date">
          <button type="submit" class="lx-btn lx-primary v3-quick-submit">+ ${L("Record", "تسجيل")}</button>
        </form>
      </section>

      <div class="v3-finance-tabs-nav">
        <button type="button" class="v3-finance-tab-btn ${financeTab === 'overview' ? 'active' : ''}" data-action="finance-tab" data-tab="overview">📊 ${L("Overview", "نظرة عامة")}</button>
        <button type="button" class="v3-finance-tab-btn ${financeTab === 'plan' ? 'active' : ''}" data-action="finance-tab" data-tab="plan">🎯 ${L("Planned vs Actual", "المخطط مقابل الفعلي")}</button>
        <button type="button" class="v3-finance-tab-btn ${financeTab === 'debts' ? 'active' : ''}" data-action="finance-tab" data-tab="debts">🤝 ${L("Debts Tracker", "إدارة الديون")}</button>
        <button type="button" class="v3-finance-tab-btn ${financeTab === 'ledger' ? 'active' : ''}" data-action="finance-tab" data-tab="ledger">📝 ${L("Transactions Ledger", "سجل المعاملات")}</button>
      </div>` +

      (financeTab === "overview" ? `
        <div class="v3-finance-tab-content">
          <div class="lx-grid-two">
            <section class="lx-card">
              <div class="lx-card-head">
                <div><h2>${L("Month Burn Velocity", "سرعة استهلاك الميزانية")}</h2></div>
                <small class="lx-muted">${L("Day", "اليوم")} ${currentDay} / ${totalDays}</small>
              </div>
              <div class="lx-burn-bar" style="margin:16px 0 10px 0;">
                <div class="lx-burn-fill" style="width: ${Math.min(100, spentRatio * 100)}%; background: ${spentRatio > monthProgress ? '#F43F5E' : '#10B981'}"></div>
                <div class="lx-burn-marker" style="left: ${monthProgress * 100}%" title="${L("Today", "اليوم")}"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;" class="lx-muted">
                <span>0%</span>
                <span>${L("Today marker", "مؤشر تقدم الشهر")} (${Math.round(monthProgress * 100)}%)</span>
                <span>100%</span>
              </div>
              <p class="lx-muted" style="margin-top:14px;">${plannedSpent > 0 ? L("Compare spending with the budget you set. The date marker is a pacing guide, not a prediction.", "قارن الإنفاق بميزانيتك. مؤشر الأيام يساعد على تنظيم الصرف ولا يتنبأ بالرصيد.") : L("Set a monthly budget to compare your spending with your plan.", "حدّد ميزانية شهرية لمقارنة مصاريفك بخطتك.")}</p>
            </section>

            <section class="lx-card">
              <div class="lx-card-head">
                <div><h2>${L("Top Expenses by Category", "أبرز أبواب المصاريف")}</h2></div>
                <button type="button" class="lx-btn lx-secondary" data-action="finance-tab" data-tab="plan">${L("All Categories", "كل الفئات")}</button>
              </div>
              <div class="v3-top-cat-list">
                ${expenseGroups(rows).map(c => {
                  const catSpent = c.amount;
                  if (!catSpent) return "";
                  const pct = spent > 0 ? Math.round((catSpent / spent) * 100) : 0;
                  return `<div class="v3-cat-bar-row">
                    <div class="v3-cat-bar-info">
                      <span>${c.icon} ${esc(ar() ? c.ar : c.en)}</span>
                      <strong>${money(catSpent)} <small>(${pct}%)</small></strong>
                    </div>
                    <div class="v3-cat-track"><div class="v3-cat-fill" style="width:${pct}%;background:${c.color}"></div></div>
                  </div>`;
                }).filter(Boolean).slice(0, 5).join("") || `<p class="lx-muted">${L("No expenses recorded yet this month.", "لا توجد مصاريف مسجلة هذا الشهر حتى الآن.")}</p>`}
              </div>
            </section>
          </div>

          <section class="lx-card" style="margin-top:16px;">
            <div class="lx-card-head">
              <div><h2>${L("Recent Daily Transactions", "أحدث المعاملات اليومية")}</h2></div>
              <button type="button" class="lx-btn lx-secondary" data-action="finance-tab" data-tab="ledger">${L("View All Ledger", "عرض السجل كاملاً")}</button>
            </div>
            <div class="lx-tx-list">
              ${rows.slice(0, 6).map((x) => {
                const catInfo = getCategoryInfo(x.category || "", x.type === "income" ? "income" : "expense");
                return `<button class="lx-list-button lx-tx-item" data-action="edit" data-kind="finances" data-id="${esc(x.id)}">
                  <span class="lx-cat-icon" style="background:${catInfo.color}20">${catInfo.icon}</span>
                  <div class="lx-tx-details">
                    <strong>${esc(x.title)}</strong>
                    <small>${dateText(x.date)} · ${esc(ar() ? catInfo.ar : catInfo.en)}</small>
                  </div>
                  <strong class="lx-tx-amt" style="color:${x.type === 'income' ? '#10B981' : '#F43F5E'}">${x.type === "income" ? "+" : "−"} ${money(Math.round(Number(x.amount) * 100))}</strong>
                </button>`;
              }).join("") || empty(L("No transactions recorded yet.", "لا توجد معاملات مسجلة بعد."), "finances")}
            </div>
          </section>
        </div>` : "") +

      (financeTab === "plan" ? `
        <div class="v3-finance-tab-content">
          <div class="lx-grid-two">
            <section class="lx-card v3-plan-table-card">
              <div class="lx-card-head">
                <div><h2>📉 ${L("Planned Expenses", "المصاريف المخططة")}</h2></div>
                <button type="button" class="lx-btn lx-secondary" data-action="finance-plan-edit">⚙️ ${L("Edit Plan", "تعديل المخطط")}</button>
              </div>
              <div class="v3-plan-list">
                ${plan.expenses.map((pe) => {
                  const catInfo = getCategoryInfo(pe.category, "expense");
                  const pTarget = Math.round(Number(pe.amount || 0) * 100);
                  const act = rows.filter(x => x.type !== "income" && (getCategoryInfo(x.category, x.type === "income" ? "income" : "expense").id === catInfo.id || x.category === pe.category)).reduce((s, x) => s + Math.round(Number(x.amount || 0) * 100), 0);
                  const pct = pTarget > 0 ? Math.round((act / pTarget) * 100) : 0;
                  const diff = pTarget - act;
                  return `<div class="v3-plan-row">
                    <div class="v3-plan-row-top">
                      <div class="v3-plan-cat"><span class="lx-cat-icon" style="background:${catInfo.color}20">${catInfo.icon}</span> <strong>${esc(pe.label || (ar() ? catInfo.ar : catInfo.en))}</strong></div>
                      <div class="v3-plan-amts">
                        <span>${money(act)} / <strong>${money(pTarget)}</strong></span>
                        <span class="v3-kpi-badge ${diff >= 0 ? 'good' : 'warning'}">${diff >= 0 ? (L("Rem: ", "متبقٍ: ") + money(diff)) : (L("Over: ", "تجاوز: ") + money(Math.abs(diff)))}</span>
                      </div>
                    </div>
                    <div class="v3-plan-track"><div class="v3-plan-fill" style="width:${Math.min(100, pct)}%;background:${pct > 100 ? '#F43F5E' : (pct > 80 ? '#F59E0B' : '#10B981')}"></div></div>
                  </div>`;
                }).join("")}
              </div>
              <div class="v3-plan-footer">
                <strong>${L("Total Planned Expenses", "إجمالي المصاريف المخططة")}: ${money(plannedSpent)}</strong>
                <strong style="color:${spent <= plannedSpent ? '#10B981' : '#F43F5E'}">${L("Actual", "الفعلي")}: ${money(spent)}</strong>
              </div>
            </section>

            <section class="lx-card v3-plan-table-card">
              <div class="lx-card-head">
                <div><h2>📈 ${L("Planned Income", "الدخل المخطط")}</h2></div>
                <button type="button" class="lx-btn lx-secondary" data-action="finance-plan-edit">⚙️ ${L("Edit Plan", "تعديل المخطط")}</button>
              </div>
              <div class="v3-plan-list">
                ${plan.income.map((pi) => {
                  const catInfo = getCategoryInfo(pi.source, "income");
                  const pTarget = Math.round(Number(pi.amount || 0) * 100);
                  const act = rows.filter(x => x.type === "income" && (getCategoryInfo(x.category, x.type === "income" ? "income" : "expense").id === catInfo.id || x.category === pi.source || x.title.toLowerCase().includes(pi.source.toLowerCase()))).reduce((s, x) => s + Math.round(Number(x.amount || 0) * 100), 0);
                  const diff = act - pTarget;
                  const pct = pTarget > 0 ? Math.round((act / pTarget) * 100) : 0;
                  return `<div class="v3-plan-row">
                    <div class="v3-plan-row-top">
                      <div class="v3-plan-cat"><span class="lx-cat-icon" style="background:${catInfo.color}20">${catInfo.icon}</span> <strong>${esc(pi.label || pi.source)}</strong></div>
                      <div class="v3-plan-amts">
                        <span>${money(act)} / <strong>${money(pTarget)}</strong></span>
                        <span class="v3-kpi-badge ${diff >= 0 ? 'good' : 'neutral'}">${diff >= 0 ? "+" + money(diff) : "-" + money(Math.abs(diff))}</span>
                      </div>
                    </div>
                    <div class="v3-plan-track"><div class="v3-plan-fill" style="width:${Math.min(100, pct)}%;background:#10B981"></div></div>
                  </div>`;
                }).join("")}
              </div>
              <div class="v3-plan-footer">
                <strong>${L("Total Planned Income", "إجمالي الدخل المخطط")}: ${money(plannedIncome)}</strong>
                <strong style="color:#10B981">${L("Actual", "الفعلي")}: ${money(income)}</strong>
              </div>
            </section>
          </div>
        </div>` : "") +

      (financeTab === "debts" ? `
        <div class="v3-finance-tab-content">
          <section class="lx-card">
            <div class="lx-card-head">
              <div>
                <h2>🤝 ${L("Debts & Obligations Ledger", "سجل الديون والالتزامات المالية")}</h2>
                <p class="lx-muted">${L("Track creditors (e.g. Credi mohammed), total amounts owed, and installments paid.", "تتبع الدائنين والديون المستحقة وسجل دفعات السداد لخصمها من الرصيد تلقائياً.")}</p>
              </div>
              <button type="button" class="lx-btn lx-primary" data-action="finance-debt-new">+ ${L("Add Debt", "إضافة دين جديد")}</button>
            </div>

            <div class="v3-debts-grid">
              ${debts.map(dbt => {
                const tot = Math.round(Number(dbt.totalAmount || 0) * 100);
                const pd = Math.round(Number(dbt.paidAmount || 0) * 100);
                const rem = Math.max(0, tot - pd);
                const pct = tot > 0 ? Math.min(100, Math.round((pd / tot) * 100)) : 0;
                return `<div class="v3-debt-card">
                  <div class="v3-debt-head">
                    <div>
                      <strong>${esc(dbt.name)}</strong>
                      ${dbt.note ? `<small class="lx-muted">${esc(dbt.note)}</small>` : ""}
                    </div>
                    <span class="v3-kpi-badge ${rem === 0 ? 'good' : 'warning'}">${rem === 0 ? L("Fully Paid", "سُدد بالكامل") : (pct + "% " + L("Paid", "مسدد"))}</span>
                  </div>
                  <div class="v3-debt-numbers">
                    <div><small>${L("Total Debt", "إجمالي الدين")}</small><strong>${money(tot)}</strong></div>
                    <div><small>${L("Paid to Date", "المدفوع حتى الآن")}</small><strong style="color:#10B981">${money(pd)}</strong></div>
                    <div><small>${L("Remaining", "المتبقي للسداد")}</small><strong style="color:#F43F5E">${money(rem)}</strong></div>
                  </div>
                  <div class="v3-debt-track"><div class="v3-debt-fill" style="width:${pct}%;"></div></div>
                  <div class="v3-debt-actions">
                    <button type="button" class="lx-btn lx-primary" data-action="finance-debt-pay" data-id="${esc(dbt.id)}">💳 ${L("Pay Installment", "سداد دفعة")}</button>
                    <button type="button" class="lx-btn lx-secondary" data-action="finance-debt-edit" data-id="${esc(dbt.id)}">✏️ ${L("Edit", "تعديل")}</button>
                    <button type="button" class="lx-btn ghost danger" data-action="finance-debt-delete" data-id="${esc(dbt.id)}" title="${L("Delete", "حذف")}">🗑️</button>
                  </div>
                </div>`;
              }).join("") || `<div class="v3-empty-card"><p>${L("No active debts recorded.", "لا توجد ديون مسجلة.")}</p></div>`}
            </div>
          </section>
        </div>` : "") +

      (financeTab === "ledger" ? `
        <div class="v3-finance-tab-content">
          <section class="lx-card">
            <div class="lx-card-head">
              <div>
                <h2>📝 ${L("Daily Transactions Ledger", "سجل المعاملات اليومي")}</h2>
                <p class="lx-muted">${L("All expenses and income recorded for this month.", "جميع حركات الدخل والمصاريف المسجلة خلال هذا الشهر.")}</p>
              </div>
              <div class="v3-tx-filter-chips">
                <button type="button" class="v3-filter-chip ${financeTxFilter === 'all' ? 'active' : ''}" data-action="finance-filter" data-filter="all">${L("All", "الكل")} (${rows.length})</button>
                <button type="button" class="v3-filter-chip ${financeTxFilter === 'expense' ? 'active' : ''}" data-action="finance-filter" data-filter="expense">📉 ${L("Expenses", "المصاريف")}</button>
                <button type="button" class="v3-filter-chip ${financeTxFilter === 'income' ? 'active' : ''}" data-action="finance-filter" data-filter="income">📈 ${L("Income", "الدخل")}</button>
                <button type="button" class="v3-filter-chip ${financeTxFilter === 'debt' ? 'active' : ''}" data-action="finance-filter" data-filter="debt">🤝 ${L("Debt Payments", "سداد ديون")}</button>
              </div>
            </div>

            <div class="lx-tx-list">
              ${rows
                .filter(x => {
                  if (financeTxFilter === "expense") return x.type !== "income" && !x.debtId;
                  if (financeTxFilter === "income") return x.type === "income";
                  if (financeTxFilter === "debt") return !!x.debtId || (x.category || "").includes("Debt");
                  return true;
                })
                .map((x) => {
                  const catInfo = getCategoryInfo(x.category || "", x.type === "income" ? "income" : "expense");
                  return `<div class="lx-list-button lx-tx-item" style="cursor:default">
                    <span class="lx-cat-icon" style="background:${catInfo.color}20">${catInfo.icon}</span>
                    <div class="lx-tx-details">
                      <strong>${esc(x.title)}</strong>
                      <small>${dateText(x.date)} · ${esc(ar() ? catInfo.ar : catInfo.en)} ${x.notes ? (' · ' + esc(x.notes)) : ''}</small>
                    </div>
                    <strong class="lx-tx-amt" style="color:${x.type === 'income' ? '#10B981' : '#F43F5E'}">${x.type === "income" ? "+" : "−"} ${money(Math.round(Number(x.amount) * 100))}</strong>
                    <div class="lx-tx-item-actions">
                      <button type="button" class="lx-btn lx-btn-sm" data-action="edit" data-kind="finances" data-id="${esc(x.id)}">✏️</button>
                      <button type="button" class="lx-btn lx-btn-sm danger" data-action="archive" data-kind="finances" data-id="${esc(x.id)}" title="${L("Delete", "حذف")}">🗑️</button>
                    </div>
                  </div>`;
                }).join("") || empty(L("No transactions found for this filter.", "لا توجد معاملات مسجلة لهذا التصنيف."), "finances")}
            </div>
          </section>
        </div>` : "")
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
        progress: calcGoalProgress(g, d) || 0,
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

  function plannedProgress(g) {
    return C.plannedGoalProgress(g);
  }
  function goalTone(d, g) {
    if (/^#[\da-f]{6}$/i.test(g.color || "")) return g.color;
    const tones = ["#c9b4e9", "#df847a", "#68b7ad"];
    return tones[Math.max(0, d.goals.indexOf(g)) % tones.length];
  }

  function workGauge(value, max) {
    const pct = Math.max(0, Math.min(100, percent(value, max)));
    return `<div class="north-gauge" style="--gauge:${pct}%" role="progressbar" aria-label="${L("Daily deep work", "العمل العميق اليومي")}" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><div><strong>${hrs(value)}</strong><small>${L("of", "من")} ${hrs(max)}</small></div></div>`;
  }
  function home(d) {
    const tt = totals(d), today = C.day();
    const goals = d.goals.filter(g => !g.archived).slice(0, 3);
    const due = d.tasks.filter(t => !t.archived && !t.done && (!t.date || t.date <= today))
      .sort((a,b) => ["high","medium","low"].indexOf(a.priority) - ["high","medium","low"].indexOf(b.priority));
    const next = due.find(t => goals.some(g => g.id === t.goalId)) || due[0];
    const linked = d.goals.find(g => g.id === next?.goalId);
    const minutes = d.settings.focusMinutes || 25;
    const goalRows = goals.map(g => {
      const actual = Math.max(0, Math.min(100, Number(calcGoalProgress(g, d)) || 0));
      // Planned progress is meaningful only when an explicit start and deadline exist.
      const planned = plannedProgress(g);
      return `<button class="north-goal" style="--goal-tone:${goalTone(d,g)}" data-route="goals" data-id="${esc(g.id)}"><div class="north-goal-title">${icon("goals")}<strong>${esc(g.name)}</strong></div><p>${esc(g.why || g.category || L("Your next destination", "وجهتك القادمة"))}</p><div class="north-goal-values" aria-label="${L("Actual", "الفعلي")} ${actual}%, ${L("Planned", "المخطط")} ${planned===null?L("not set", "غير محدد"):planned+'%'}"><span><b>${actual}%</b><small>${L("Actual", "الفعلي")}</small></span><span><b>${planned === null ? "—" : planned + "%"}</b><small>${L("Planned", "المخطط")}</small></span></div><div class="north-track" dir="ltr"><i style="width:${actual}%"></i>${planned === null ? "" : `<em style="left:${planned}%" title="${L("Planned", "المخطط")} ${planned}%"></em>`}</div><small>${planned === null ? L("Set a start date and deadline to compare your plan.", "حدّد تاريخ البداية والنهاية لمقارنة خطتك.") : dateText(g.deadline)}</small></button>`;
    }).join("");
    return `<div class="north-home"><header class="north-welcome"><p>${new Intl.DateTimeFormat(ar()?"ar-MA":"en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date())}</p><div>${L(new Date().getHours()<12?"Good morning":"Welcome back",new Date().getHours()<12?"صباح الخير":"مرحبًا بعودتك")} ${esc(d.profile.name || "")}</div><h1>${L("Your goals in sight.", "أهدافك أمامك.")}<span class="north-welcome-desktop"> ${L("Your next step clear.", "وخطوتك واضحة.")}</span></h1></header>` +
      `<section class="north-goals" aria-label="${L("Priority goals", "أهدافك الرئيسية")}">${goalRows || empty(L("Define your first destination.", "حدّد وجهتك الأولى."),"goals")}</section><div class="north-home-grid"><section class="lx-card north-next"><div class="lx-eyebrow">${L("YOUR NEXT STEP", "خطوتك التالية")}</div>${linked ? `<p class="north-linked">${icon("goals")} ${esc(linked.name)}</p>` : ""}<h2>${esc(next?.title || L("Make room for meaningful work", "امنح عملك المهم وقتًا للتركيز"))}</h2><p>${L("One task. Your full attention. Progress you can measure.", "مهمة واحدة. انتباه كامل. وتقدم تستطيع قياسه.")}</p>${d.activeSession ? btn(L("Resume focus", "استأنف التركيز"),"navigate",'data-to="focus"',true) : next ? btn(icon("focus") + " " + L("Start focus", "ابدأ التركيز") + " · " + minutes + " " + L("min", "دقيقة"),"home-focus",`data-id="${esc(next.id)}"`,true) : btn(L("Choose your focus", "اختر عملك وابدأ"),"navigate",'data-to="focus"',true)}</section><section class="lx-card north-today"><h2>${L("Deep work today", "العمل العميق اليوم")}</h2><div class="north-time"><strong dir="auto">${hrs(tt.deep)}</strong><span> / ${d.settings.dailyHours} ${L("hours", "ساعات")}</span></div>${workGauge(tt.deep,d.settings.dailyHours*3600000)}<p>${L("Time measures effort, not goal completion.", "الوقت يقيس الجهد، وليس نسبة اكتمال الهدف.")}</p><div class="lx-task-list">${due.slice(0,2).map(t=>taskRow(t,d)).join("")}</div></section></div><section class="lx-card north-week"><div class="lx-card-head"><div><h2>${L("Focus time this week", "وقت التركيز هذا الأسبوع")}</h2><p>${L("Your actual sessions, day by day.", "جلساتك الفعلية، يومًا بيوم.")}</p></div>${btn(L("Details", "التفاصيل"),"navigate",'data-to="analytics"')}</div>${dayChart(tt.all,d)}</section><details class="lx-card north-details"><summary>${L("More about your goals and daily review", "تفاصيل أهدافك ومراجعة يومك")}</summary>${goalBoard(d)}${momentumMap(d)}${btn(L("Daily review", "مراجعة اليوم"),"shutdown")}</details></div>`;
  }
  function linkFields(d, obj = {}) {
    return `<div class="lx-fields-three">${select(name("projects"), "projectId", options(d.projects), obj.projectId)}${select(name("goals"), "goalId", options(d.goals), obj.goalId)}${select(name("tasks"), "taskId", options(d.tasks, "title"), obj.taskId)}</div>`;
  }
  function taskFocusModal(task, d) {
    const goal = d.goals.find((g) => g.id === task.goalId);
    modal(
      L("Start Focus Session", "بدء جلسة تركيز"),
      `<div class="v3-quick-focus-modal">
        <div class="v3-qf-task-head">
          ${goal ? `<span class="v3-linked-goal-pill"><span class="v3-dot"></span><small>${L("Linked Goal: ", "الهدف المرتبط: ")}</small><strong>${esc(goal.name)}</strong></span>` : ''}
          <h3 class="v3-qf-title">${esc(task.title)}</h3>
          ${task.body ? `<p class="lx-muted" style="font-size:13px;margin:4px 0 16px;">${esc(task.body)}</p>` : ''}
        </div>
        <div class="v3-qf-mode-select">
          <button type="button" class="v3-mode-card active" data-action="qf-mode" data-qf-mode="pomodoro">
            <span class="v3-mode-icon">🍅</span>
            <div class="v3-mode-info">
              <strong>${L("Pomodoro", "بومودورو") + " · " + d.settings.focusMinutes + " " + L("min", "دقيقة")}</strong>
              <small>${d.settings.focusMinutes + " " + L("min focus", "دقيقة تركيز") + " · " + d.settings.shortBreak + " " + L("min break", "دقائق راحة")}</small>
            </div>
            <span class="v3-mode-check">✓</span>
          </button>
          <button type="button" class="v3-mode-card" data-action="qf-mode" data-qf-mode="countdown">
            <span class="v3-mode-icon">⏱️</span>
            <div class="v3-mode-info">
              <strong>${L("Custom Countdown", "عد تنازلي مخصص")}</strong>
              <small>${L("Choose target duration", "اختر المدة التي تناسبك")}</small>
            </div>
            <span class="v3-mode-check"></span>
          </button>
          <button type="button" class="v3-mode-card" data-action="qf-mode" data-qf-mode="stopwatch" aria-pressed="false">
            <div class="v3-mode-info"><strong>${L("Stopwatch", "ساعة تصاعدية")}</strong><small>${L("Track work without a time limit", "سجل العمل دون مدة محددة")}</small></div><span class="v3-mode-check"></span>
          </button>
        </div>
        ${btn(L("Configure Pomodoro", "إعدادات بومودورو"), "pomodoro-settings", `data-task-id="${esc(task.id)}"`)}
        <div id="v3CountdownRow" class="v3-qf-durations hidden">
          <span class="v3-dur-label">${L("Duration: ", "المدة: ")}</span>
          <div class="v3-dur-pills-wrap">
            <button type="button" class="v3-dur-pill" data-action="qf-duration" data-dur="15">15 ${L("min", "د")}</button>
            <button type="button" class="v3-dur-pill active" data-action="qf-duration" data-dur="25">25 ${L("min", "د")}</button>
            <button type="button" class="v3-dur-pill" data-action="qf-duration" data-dur="45">45 ${L("min", "د")}</button>
            <button type="button" class="v3-dur-pill" data-action="qf-duration" data-dur="60">60 ${L("min", "د")}</button>
          </div>
          ${field(L("Custom minutes", "دقائق مخصصة"), "customMinutes", "", "number", 'min="1" max="1440" step="1" placeholder="90"')}
        </div>
        <div class="v3-qf-actions">
          <button type="button" class="v3-apple-start-btn full-width" data-action="qf-launch" data-task-id="${task.id}" data-goal-id="${task.goalId || ''}" data-project-id="${task.projectId || ''}">
            <span class="v3-btn-icon">▶</span>
            <span>${L("Launch Focus Now", "انطلق في التركيز الآن")}</span>
          </button>
        </div>
      </div>`
    );
  }

  function focusIdleScreen(d) {
    const pendingTasks = d.tasks.filter((t) => !t.archived && !t.done)
      .sort((a, b) => ["high", "medium", "low"].indexOf(a.priority) - ["high", "medium", "low"].indexOf(b.priority));
    
    return heading(
      L("Deep Work Sessions", "جلسات التركيز والعمل العميق"),
      L("Focus is tied to your tasks and goals.", "التركيز مرتبط بمهامك وأهدافك. اختر مهمة للبدء فوراً:"),
      btn("+ " + L("New Task", "مهمة جديدة"), "new", 'data-kind="tasks" class="lx-btn lx-primary"') + btn(L("Settings", "إعدادات بومودورو"), "pomodoro-settings")
    ) +
    `<div class="v3-focus-idle-container">
      <div class="v3-focus-quick-bar">
        <form id="lxQuickTaskFocusForm" class="v3-quick-task-form">
          ${select(L("Linked goal", "الهدف المرتبط"), "goalId", [["", L("Choose a goal", "اختر الهدف")], ...d.goals.filter(g=>!g.archived).map(g=>[g.id,g.name])], "", "required")}<input name="quickTitle" type="text" placeholder="${L("Type a task to focus on right now...", "اكتب مهمة سريعة للتركيز عليها فوراً...")}" required>
          <button type="submit" class="v3-apple-start-btn compact">
            <span class="v3-btn-icon">▶</span>
            <span>${L("Start focus", "ابدأ التركيز")} · ${d.settings.focusMinutes} ${L("min", "دقيقة")}</span>
          </button>
        </form>
      </div>

      <div class="v3-section-title-row" style="margin-top:24px;">
        <span class="v3-section-kicker">⚡ ${L("TODAY'S PRIORITIES", "مهامك الجاهزة للتركيز")}</span>
      </div>

      <div class="v3-focus-task-list">
        ${pendingTasks.length ? pendingTasks.slice(0, 8).map((t) => {
          const goal = d.goals.find((g) => g.id === t.goalId);
          const mins = t.estimatedHours ? Math.round(t.estimatedHours * 60) : 25;
          return `<div class="v3-focus-task-item">
            <div class="v3-focus-task-info">
              <strong>${esc(t.title)}</strong>
              <div class="v3-focus-task-meta">
                ${goal ? `<span class="v3-task-goal-tag">🎯 ${esc(goal.name)}</span>` : ''}
                <span class="v3-task-time-tag">⏱️ ${mins} ${L("min", "دقيقة")}</span>
              </div>
            </div>
            <button type="button" class="v3-apple-start-btn compact" data-action="task-focus" data-id="${t.id}">
              <span class="v3-btn-icon">▶</span>
              <span>${L("Focus", "ابدأ التركيز")}</span>
            </button>
          </div>`;
        }).join("") : `<div class="v3-empty-card"><p>${L("No open tasks for today.", "لا توجد مهام مفتوحة حالياً.")}</p>${btn("+ " + L("Add task to focus on", "أضف مهمة للبدء"), "new", 'data-kind="tasks"', true)}</div>`}
      </div>

      <details class="lx-card v3-history-details" style="margin-top:24px;">
        <summary>${L("Recent Focus Sessions History", "سجل جلسات التركيز الأخيرة")}</summary>
        <div style="margin-top:14px;">
          ${d.sessions.slice(0, 5).map((s) => sessionRow(s, d)).join("") || `<p class="lx-muted">${L("No sessions yet.", "لا توجد جلسات مسجلة بعد.")}</p>`}
        </div>
      </details>
    </div>`;
  }

  function focus(d) {
    const a = d.activeSession;
    if (!a) return focusIdleScreen(d);

    const task = d.tasks.find((t) => t.id === a.taskId),
      project = d.projects.find((p) => p.id === a.projectId),
      goal = d.goals.find((g) => g.id === a.goalId);
    const cycleNum = (a.cyclesCompleted || 0) + 1;
    const totalCycles = d.settings.cycles || 4;

    return `<div class="lx-focus-screen v3-focus-screen ${a.phase === "break" ? "is-break" : ""}">
      <button type="button" class="v3-zen-exit-btn" data-action="zen-mode">✕ ${L("Exit Zen", "خروج من وضع زن")}</button>
      <button type="button" class="v3-zen-cancel-btn" data-action="session-cancel">🗑️ ${L("Cancel session", "إلغاء الجلسة")}</button>
      <div class="lx-focus-top">
        ${btn("← " + L("Workspace", "الرئيسية"), "navigate", 'data-to="home" class="v3-back-btn"')}
        <div class="v3-focus-pill-top">
          <span class="v3-dot"></span>
          <span>${a.phase === "break" ? L("Recovery Break", "استراحة") : esc(goal?.name || catName(a.categoryId))}</span>
        </div>
        ${btn("🧘 " + L("Zen", "زن"), "zen-mode", 'class="v3-zen-btn" title="Zen Focus"')}
      </div>
      
      <div class="v3-focus-header">
        <h1 class="v3-focus-task-title">${a.phase === "break" ? L("A moment to recharge.", "مساحة صغيرة للتنفس.") : esc(task?.title || a.title || L("Deep execution", "عمل بتركيز"))}</h1>
        ${project ? `<p class="v3-focus-goal-sub">${esc(project.name)}</p>` : ""}${goal ? `<p class="v3-focus-goal-sub">${L("Target: ", "الهدف: ")}${esc(goal.name)}</p>` : ''}
      </div>

      <div class="v3-timer-dial-container">
        <svg viewBox="0 0 280 280" class="v3-timer-svg" aria-hidden="true">
          <defs>
            <linearGradient id="v3TimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#b8a4e8"/>
              <stop offset="50%" stop-color="#d7a9cd"/>
              <stop offset="100%" stop-color="#d7a9cd"/>
            </linearGradient>
          </defs>
          <circle cx="140" cy="140" r="130" class="v3-dial-track"/>
          <circle id="v3DialFill" cx="140" cy="140" r="130" class="v3-dial-fill"/>
        </svg>
        <div class="v3-timer-dial-content">
          <div id="lxTimer" class="v3-timer-display" dir="ltr" role="timer" aria-label="${L("Session timer", "مؤقت الجلسة")}">25:00</div>
          <div id="lxTimerMeta" class="v3-timer-dial-meta">${a.phase === "break" ? L("Break time", "فترة راحة") : L("Deep focus session", "جلسة تركيز")}</div>
        </div>
      </div>

      <div class="v3-focus-controls-row">
        ${a.status === "completed" 
          ? (btn(L("Finish", "إنهاء"), "session-finish", 'class="v3-ctrl-btn primary"') + 
             btn(L("Take a break", "خذ استراحة"), "session-break", 'class="v3-ctrl-btn"') + 
             btn("+15 " + L("m", "د"), "session-extend", 'data-minutes="15" class="v3-ctrl-btn small"')) 
          : (`<button type="button" class="v3-ctrl-circle-btn main-play-pause" data-action="${a.segmentStartedAt === null ? "session-resume" : "session-pause"}" aria-label="${a.segmentStartedAt === null ? L("Resume", "استئناف") : L("Pause", "إيقاف مؤقت")}">
              ${a.segmentStartedAt === null ? "▶" : "❚❚"}
             </button>
             <button type="button" class="v3-ctrl-circle-btn stop-btn" data-action="session-finish" aria-label="${L("Stop & Save", "إنهاء وحفظ")}" title="${L("Save & Finish", "إنهاء وحفظ")}">
              ■
             </button>
             <button type="button" class="v3-ctrl-circle-btn cancel-btn" data-action="session-cancel" aria-label="${L("Cancel session", "إلغاء الجلسة")}" title="${L("Cancel & Discard", "إلغاء الجلسة دون حفظ")}">
              ✕
             </button>`)}
      </div>

      ${a.segmentStartedAt === null ? `<div class="v3-session-paused-banner">
        <span>⏸️ ${L("Session paused", "الجلسة متوقفة مؤقتًا")}</span>
        <button type="button" class="v3-paused-cancel-btn" data-action="session-cancel">🗑️ ${L("Cancel session", "إلغاء الجلسة والتراجع")}</button>
      </div>` : ""}

      <div class="v3-session-dots-wrap" style="${a.type === "pomodoro" ? "" : "display:none"}">
        <div class="v3-dots-row">
          ${Array.from({ length: totalCycles }, (_, i) => {
            const isDone = i < ((a.cyclesCompleted || 0) % totalCycles);
            const isCurr = i === ((a.cyclesCompleted || 0) % totalCycles);
            return `<span class="v3-session-dot ${isDone ? 'done' : (isCurr ? 'current' : '')}"></span>`;
          }).join("")}
        </div>
        <small class="v3-dots-label">${L(`Round ${(cycleNum - 1) % totalCycles + 1} of ${totalCycles}`, `الجلسة ${(cycleNum - 1) % totalCycles + 1} من ${totalCycles}`)}</small>
      </div>

      <div class="v3-next-phase-card" ${a.type === "pomodoro" ? "" : 'hidden'}>
        <small>${L("UP NEXT", "بعد هذه الجلسة")}</small>
        <strong>${a.phase === "break" ? L(`Focus · ${d.settings.focusMinutes} min`, `تركيز · ${d.settings.focusMinutes} دقيقة`) : (cycleNum % totalCycles === 0 ? L(`Long break · ${d.settings.longBreak} min`, `استراحة طويلة · ${d.settings.longBreak} دقيقة`) : L(`Short break · ${d.settings.shortBreak} min`, `استراحة قصيرة · ${d.settings.shortBreak} دقائق`))}</strong>
      </div>

      <div class="lx-focus-extras">
        ${btn(L("Fullscreen", "ملء الشاشة"), "zen-mode", 'class="north-focus-zen"')}
        <details>
          <summary>${L("Session notes & distraction capture", "ملاحظات الجلسة وتفريغ المشتتات")} <span id="lxSaved"></span></summary>
          ${area(L("Session notes · saved automatically", "ملاحظات الجلسة · تُحفظ تلقائيًا"), "activeNotes", a.notes, 'data-autosave="session"')}
          <div style="margin-top:10px;display:flex;gap:10px;align-items:center;">
            ${btn("+ " + L("Capture distraction", "سجل مشتتاً"), "distraction", 'class="lx-btn"')}
            <small class="lx-muted">${a.distractions.length} ${L("captured in Inbox", "سُجلت في الوارد")}</small>
          </div>
        </details>
        ${btn(L("Cancel session", "إلغاء الجلسة"), "session-cancel", 'class="lx-btn ghost danger" style="margin-top:12px;"')}
      </div>
    </div>`;
  }
  function taskRow(t, d) {
    const all = C.reportSessions(d),
      actual = C.duration(all, 0, Infinity, (s) => s.taskId === t.id);
    if (t.archived) return `<div class="lx-task-row"><div class="lx-task-title"><strong>${esc(t.title)}</strong><small>${L("Deleted · work history preserved", "محذوفة · سجل العمل محفوظ")}</small></div>${btn(L("Restore", "استعادة"), "task-restore", `data-id="${esc(t.id)}"`)}</div>`;
    return `<div class="lx-task-row ${t.done ? "is-done" : ""}">
      <button class="lx-check" data-action="task-toggle" data-id="${t.id}" role="checkbox" aria-checked="${!!t.done}" aria-label="${esc(t.title)}">${t.done ? "✓" : ""}</button>
      <button class="lx-task-title" data-action="edit" data-kind="tasks" data-id="${t.id}">
        <strong>${esc(t.title)}</strong>
        <small>${esc(d.goals.find((g) => g.id === t.goalId)?.name || d.projects.find((p) => p.id === t.projectId)?.name || L("Independent task", "مهمة مستقلة"))} · ${dateText(t.date)} ${actual || t.estimatedHours ? " · " + hrs(actual) + (t.estimatedHours ? " / " + t.estimatedHours + L("h", "س") : " " + L("worked", "منجز")) : ""}</small>
      </button>
      <span class="lx-priority ${t.priority}">${L(t.priority || "medium", { high: "عالية", medium: "متوسطة", low: "منخفضة" }[t.priority] || "متوسطة")}</span>
      <button type="button" class="lx-task-focus-pill" data-action="task-focus" data-id="${t.id}" title="${L("Start Focus Session", "ابدأ جلسة تركيز")}">
        <span class="v3-btn-icon">▶</span>
        <span>${L("Focus", "تركيز")}</span>
      </button>
      <button type="button" class="lx-task-delete" data-action="task-delete" data-id="${esc(t.id)}" aria-label="${esc(L("Delete task: ", "حذف المهمة: ") + t.title)}" title="${L("Delete task", "حذف المهمة")}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>
    </div>`;
  }
  function tasks(d) {
    const list = d.tasks
      .filter(
        (t) =>
          (taskFilter === "deleted" ? t.archived : !t.archived) &&
          (taskFilter === "deleted" || taskFilter === "all" || (taskFilter === "done" ? t.done : !t.done)),
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
        L("Actionable execution items linked to your goals. Launch the focus timer on any task to track real effort.", "المهام التنفيذية المرتبطة بأهدافك. اضغط على زر الساعة في المهمة لبدء جلسة بومودورو أو عد تنازلي وتوثيق إنجازك."),
      ) +
      `<div class="lx-toolbar"><div class="lx-segmented">${["all", "open", "done", "deleted"].map((k) => btn(L(k === "all" ? "All" : k === "open" ? "Open" : k === "deleted" ? "Deleted" : "Completed", k === "all" ? "الكل" : k === "open" ? "مفتوحة" : k === "deleted" ? "المحذوفة" : "مكتملة"), "filter", `data-filter="${k}" aria-pressed="${taskFilter === k}"`)).join("")}</div></div><div class="lx-card">${list.length ? list.map((t) => taskRow(t, d)).join("") : taskFilter === "deleted" ? `<p class="lx-muted">${L("No deleted tasks.", "لا توجد مهام محذوفة.")}</p>` : empty(L("Give your next action a name.", "سمِّ خطوتك التالية."), "tasks")}</div>`
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
                `<button class="lx-list-button" data-route="goals" data-id="${g.id}">${esc(g.name)} <span>${calcGoalProgress(g, d)}%</span></button>`,
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
  function v3GoalDetail(g, d) {
    const ts = d.tasks.filter((t) => t.goalId === g.id && !t.archived);
    const hs = (d.habits || []).filter((h) => h.goalId === g.id && !h.archived);
    const actual = calcGoalProgress(g, d);
    const planned = plannedProgress(g);
    const allSessions = C.reportSessions(d);
    const timeMs = C.duration(allSessions, 0, Infinity, (s) => s.goalId === g.id);
    const targetMs = C.goalTargetHours(g) * 3600000;
    const todayMs = C.duration(allSessions, C.midnight(Date.now()), Infinity, s => s.goalId === g.id);
    const goalSessions = allSessions.filter(s => s.goalId === g.id && s.status !== "cancelled");

    return `<div class="v3-goal-detail-page">
      <div class="v3-gd-top-nav">
        <button type="button" class="v3-back-btn" data-action="navigate" data-to="goals">← ${L("Goals", "الأهداف")}</button>
        <div class="v3-header-actions">
          ${btn(L("Edit", "تعديل"), "edit", `data-kind="goals" data-id="${g.id}" class="v3-shutdown-btn"`)}
          ${btn("+ " + L("Task", "مهمة"), "new", `data-kind="tasks" data-goal="${g.id}" class="lx-btn lx-primary"`)}
        </div>
      </div>

      <div class="v3-gd-header text-center">
        <h1 class="v3-gd-title">${esc(g.name)}</h1>
        ${g.identity ? `<div class="v3-gd-identity-pill"><span>👑</span><strong>${esc(g.identity)}</strong></div>` : ''}
      </div>

      <div class="v3-gd-progress-hero">
        <div class="v3-gd-circle-wrap">
          <svg viewBox="0 0 160 160" class="v3-gd-svg">
            <circle cx="80" cy="80" r="68" class="v3-donut-track" stroke-width="9"/>
            <circle cx="80" cy="80" r="68" class="v3-donut-fill" stroke-width="9" style="stroke:#8B5CF6;stroke-dasharray:427.26;stroke-dashoffset:${427.26 - (427.26 * actual) / 100}"/>
          </svg>
          <div class="v3-gd-circle-text">
            <strong>${actual}%</strong>
            <small>${L("Actual", "الفعلي")}</small>
          </div>
        </div>
      </div>

      <section class="lx-card v3-gd-compare-card">
        <div class="v3-gd-compare-head">
          <h3>${L("Planned vs Actual Progress", "المخطط مقابل الفعلي")}</h3>
        </div>
        <div class="v3-gd-compare-bars">
          <div class="v3-gd-bar-row">
            <div class="v3-gd-bar-label"><span>${L("Actual", "الفعلي")}</span><strong>${actual}%</strong></div>
            <div class="v3-gd-track"><div class="v3-gd-fill actual" style="width:${actual}%;"></div></div>
          </div>
          <div class="v3-gd-bar-row">
            <div class="v3-gd-bar-label"><span>${L("Planned", "المخطط")}</span><strong>${planned === null ? "—" : planned + "%"}</strong></div>
            <div class="v3-gd-track outline"><div class="v3-gd-fill planned" style="width:${planned ?? 0}%;"></div></div>
          </div>
        </div>
        <small class="v3-gd-note">${g.progressMode === "time" ? L("Time invested / target hours. Breaks are excluded.", "الوقت المستثمر ÷ الساعات المستهدفة. لا تُحتسب الراحة.") : L("Outcome progress you record. Time and completed tasks are tracked separately.", "تقدم النتيجة الذي تسجله. يُعرض الوقت والمهام المنجزة بشكل منفصل.")}</small>
      </section>

      <section class="lx-card">
        <h3>${L("Work invested in this goal", "العمل المنجز في هذا الهدف")}</h3>
        <div class="lx-fields-two">
          <p>${L("Actual work", "الوقت الفعلي")}: <strong>${hrs(timeMs)}</strong></p>
          <p>${L("Today", "اليوم")}: <strong>${hrs(todayMs)}</strong></p>
          <p>${L("This week", "هذا الأسبوع")}: <strong>${hrs(C.duration(allSessions, C.week(Date.now(), d.settings.weekStart), Infinity, s => s.goalId === g.id))}</strong></p>
          <p>${L("Total planned", "إجمالي الوقت المخطط")}: <strong>${targetMs ? hrs(targetMs) : L("Not configured", "لم تُحدد الخطة")}</strong></p>
          <p>${L("Remaining", "المتبقي")}: <strong>${targetMs ? hrs(Math.max(0, targetMs - timeMs)) : "—"}</strong></p>
        </div>
        <p>${L("Planned by today", "المخطط حتى اليوم")}: <strong>${targetMs && planned !== null ? hrs(C.goalPlannedHours(g) * 3600000) : L("Set the plan dates", "حدد تاريخ بداية الخطة ونهايتها")}</strong></p>
        ${!targetMs || planned === null ? btn(L("Set work plan", "حدد خطة العمل"), "edit", `data-kind="goals" data-id="${g.id}"`) : ""}
        <small>${L("Focus and manual work are included. Breaks are excluded.", "تُحتسب جلسات التركيز والوقت اليدوي، وتُستبعد فترات الراحة.")}</small>
      </section>
      <section class="lx-card">
        <h3>${L("Work log", "سجل الإنجاز")}</h3>
        ${goalSessions.length ? goalSessions.slice(0, 10).map(s => `<div class="lx-list-line"><div><strong>${esc(d.tasks.find(t => t.id === s.taskId)?.title || s.title || g.name)}</strong><p>${esc(s.notes || "")}</p><small>${esc(C.day(s.startedAt))}</small></div><strong>${hrs(C.duration([s]))}</strong></div>`).join("") : `<p>${L("Your saved sessions will appear here.", "ستظهر جلسات العمل المحفوظة هنا.")}</p>`}
      </section>
      <section class="v3-gd-section">
        <div class="v3-section-title-row">
          <div>
            <span class="v3-section-kicker">🔥 ${L("LINKED HABITS", "عاداتك المرتبطة")}</span>
            <h3 class="v3-section-title">${L("Routines & Rituals", "العادات والروتين")}</h3>
          </div>
          ${btn("+ " + L("Add habit", "إضافة عادة"), "new", `data-kind="habits" data-goal="${g.id}" class="v3-view-all-link"`)}
        </div>
        <div class="v3-gd-habits-list">
          ${hs.length ? hs.map((h) => {
            const strk = C.habitStreak(h.checks || [], C.day(), h.frequency, d.settings.weekStart);
            const isDone = h.checks?.includes(C.day());
            return `<div class="v3-gd-habit-card">
              <div class="v3-gd-habit-streak">
                <span>${strk.inGrace ? "🛡️" : "🔥"}</span>
                <strong>${strk.current} ${h.frequency === "weekly" ? L("weeks", "أسبوع") : L("days", "يوم")}</strong>
              </div>
              <div class="v3-gd-habit-title">
                <strong>${esc(h.title)}</strong>
              </div>
              <button type="button" class="v3-habit-check-btn ${isDone ? 'done' : ''}" data-action="habit-toggle" data-id="${h.id}" aria-label="${esc(h.title)}" aria-pressed="${!!isDone}">
                ${isDone ? "✓" : ""}
              </button>
            </div>`;
          }).join("") : `<div class="v3-empty-card compact"><p>${L("No habits linked yet.", "لا توجد عادات مرتبطة بعد.")}</p></div>`}
        </div>
      </section>

      <section class="v3-gd-section">
        <div class="v3-section-title-row">
          <div>
            <span class="v3-section-kicker">✓ ${L("THIS WEEK'S TASKS", "مهام هذا الأسبوع")}</span>
            <h3 class="v3-section-title">${L("Execution Actions", "مهام التنفيذ")}</h3>
          </div>
          ${btn("+ " + L("Add task", "إضافة مهمة"), "new", `data-kind="tasks" data-goal="${g.id}" class="v3-view-all-link"`)}
        </div>
        <div class="v3-gd-tasks-list">
          ${ts.length ? ts.map((t) => {
            const worked = C.duration(allSessions, 0, Infinity, s => s.taskId === t.id);
            return `<div class="v3-gd-task-card ${t.done ? 'is-done' : ''}">
              <span class="v3-task-time-pill">${hrs(worked)} ${L("worked", "منجز")}</span>
              <div class="v3-gd-task-text">
                <strong>${esc(t.title)}</strong>
              </div>
              <div class="v3-gd-task-actions">
                ${!t.done ? `<button type="button" class="v3-apple-start-btn mini" data-action="task-focus" data-id="${t.id}" title="${L("Start Focus", "ابدأ التركيز")}">▶</button>` : ''}
                <button type="button" class="lx-check" data-action="task-toggle" data-id="${t.id}" role="checkbox" aria-checked="${!!t.done}">
                  ${t.done ? "✓" : ""}
                </button>
              </div>
            </div>`;
          }).join("") : `<div class="v3-empty-card compact"><p>${L("No tasks linked yet.", "لا توجد مهام مرتبطة بعد.")}</p></div>`}
        </div>
      </section>
    </div>`;
  }

  function goals(d) {
    const g = d.goals.find((g) => g.id === detail);
    if (g) return v3GoalDetail(g, d);
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
        L("Track your outcome or choose a time target. Completing a task does not automatically complete the goal.", "تابع تقدم النتيجة أو اختر هدف ساعات. إكمال مهمة لا يعني اكتمال الهدف تلقائيًا."),
      ) +
      `<div class="lx-grid-three">${
        d.goals
          .filter((g) => !g.archived)
          .map((g) => {
            const ts = d.tasks.filter((t) => t.goalId === g.id && !t.archived);
            const hs = (d.habits || []).filter((h) => h.goalId === g.id && !h.archived);
            const doneTs = ts.filter((t) => t.done).length;
            const idTag = g.identity ? `<div class="lx-identity-tag">👑 ${esc(g.identity)}</div>` : "";
            return `<article class="lx-card lx-goal-card">${idTag}<div class="lx-eyebrow">${esc(g.horizon ? L(g.horizon, { annual: "سنوي", quarterly: "ربع سنوي", monthly: "شهري", weekly: "أسبوعي" }[g.horizon] || g.horizon) : L("Long term", "بعيد المدى"))}</div><h2><button class="lx-text-button" data-route="goals" data-id="${g.id}">${esc(g.name)}</button></h2><p>${esc(g.why || "")}</p><div class="lx-split"><strong>${calcGoalProgress(g, d)}%</strong><small>${dateText(g.deadline)}</small></div>${progress(calcGoalProgress(g, d))}<p>${hrs(C.duration(C.reportSessions(d), 0, Infinity, (s) => s.goalId === g.id))} ${L("invested", "مستثمرة")}</p><div class="lx-mini-stats">${stat(name("tasks"), `${doneTs}/${ts.length}`)}${stat(name("habits"), `${hs.length}`)}${stat(L("Momentum", "الزخم"), `${g.momentum || 0}%`)}</div></article>`;
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
      recordedSessions = d.sessions.filter(s => s.status !== "cancelled" && C.duration([s]) > 0),
      avg = recordedSessions.length ? C.duration(recordedSessions) / recordedSessions.length : 0;
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
        )}</section><section class="lx-card"><h2>${L("Projects · this week", "المشاريع · هذا الأسبوع")}</h2>${d.projects.map((p) => `<div class="lx-list-line"><span>${esc(p.name)}</span><strong>${hrs(C.duration(tt.all, C.week(now, d.settings.weekStart), Infinity, (s) => s.projectId === p.id))}</strong></div>`).join("") || "<p>—</p>"}</section><section class="lx-card"><h2>${L("Your rhythm", "إيقاعك")}</h2><p>${L("Most tracked hour", "الساعة الأكثر تسجيلًا")}: <b dir="ltr">${hours[bestHour] ? String(bestHour).padStart(2, "0") + ":00 – " + String(bestHour + 1).padStart(2, "0") + ":00" : "—"}</b></p><p>${L("Most tracked day · last 30 days", "اليوم الأكثر تسجيلًا · آخر 30 يومًا")}: ${best?.[1] ? dateText(best[0]) : "—"}</p><p>${L("Average daily deep work · 7 days", "متوسط العمل العميق اليومي · 7 أيام")}: ${hrs(C.duration(tt.all, C.midnight(now) - 6 * 86400000, Infinity, (s) => s.categoryId === "Deep Work") / 7)}</p><p>${L("Time tracked describes effort, not quality.", "الوقت المسجل يصف الجهد، وليس جودته.")}</p></section></div><div class="lx-grid-two"><section class="lx-card"><h2>${L("Execution", "التنفيذ")}</h2><p>${L("Tasks completed", "المهام المكتملة")}: ${d.tasks.filter((t) => !t.archived && t.done).length} / ${d.tasks.filter((t) => !t.archived).length}</p>${progress(percent(d.tasks.filter((t) => !t.archived && t.done).length, d.tasks.filter((t) => !t.archived).length))}<p>${L("Habits today", "عادات اليوم")}: ${d.habits.filter((h) => !h.archived && h.checks?.includes(C.day())).length} / ${d.habits.filter((h) => !h.archived).length}</p>${progress(percent(d.habits.filter((h) => !h.archived && h.checks?.includes(C.day())).length, d.habits.filter((h) => !h.archived).length))}</section><section class="lx-card"><h2>${L("Goals progress", "تقدم الأهداف")}</h2>${d.goals.filter((g) => !g.archived).map((g) => `<div class="lx-list-line"><span>${esc(g.name)}</span><strong>${calcGoalProgress(g, d)}%</strong></div>${progress(calcGoalProgress(g, d))}`).join("") || "<p>—</p>"}</section></div><div class="lx-grid-two"><section class="lx-card"><h2>${L("Focus time by week", "وقت التركيز حسب الأسبوع")}</h2>${weeklyChart(tt.all, d)}</section><section class="lx-card"><h2>${L("Time per goal · this month", "الوقت لكل هدف · هذا الشهر")}</h2>${d.goals.map((g) => `<button class="lx-list-button" data-route="goals" data-id="${g.id}">${esc(g.name)}<strong>${hrs(C.duration(tt.all, +new Date(new Date().getFullYear(), new Date().getMonth(), 1), Infinity, (s) => s.goalId === g.id))}</strong></button>`).join("") || "<p>—</p>"}</section></div><section class="lx-card"><h2>${L("Session history", "سجل الجلسات")}</h2>${
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
          badge: L("Event", "حدث"),
          kind: "events",
          id: e.id,
        })),
      ...d.tasks
        .filter((t) => t.date === date && !t.archived)
        .map((t) => ({
          title: t.title,
          time: t.startTime || "—",
          sub: t.done ? L("Done", "مكتملة") : L("Task", "مهمة"),
          badge: L("Task", "مهمة"),
          kind: "tasks",
          id: t.id,
        })),
      ...d.goals
        .filter((g) => !g.archived && g.deadline === date)
        .map((g) => ({
          title: g.name,
          time: "—",
          sub: L("Deadline", "موعد الهدف"),
          badge: L("Goal", "هدف"),
          kind: "goals",
          id: g.id,
        })),
      ...d.sessions
        .filter((s) => C.day(s.startedAt) === date)
        .map((s) => ({
          title: s.title || d.tasks.find((t) => t.id === s.taskId)?.title || catName(s.categoryId),
          time: timeText(s.startedAt),
          sub: hrs(C.duration([s])),
          badge: L("Focus", "تركيز"),
          kind: "session",
          id: s.id,
        })),
    ];
    return (
      entries
        .sort((a, b) => a.time.localeCompare(b.time))
        .map(
          (e) =>
            `<button class="lx-schedule-row" data-action="${e.kind === "session" ? "session-detail" : "edit"}" data-kind="${e.kind}" data-id="${e.id}"><time dir="auto">${esc(e.time)}</time><span class="lx-schedule-content"><strong class="lx-truncate">${esc(e.title)}</strong><small><span class="lx-sched-badge">${e.badge}</span> ${esc(e.sub)}</small></span></button>`,
        )
        .join("") ||
      `<p class="lx-muted" style="font-size:12px;padding:8px 0;">${L("Schedule is clear.", "لا توجد مواعيد.")}</p>`
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
      `<div class="lx-card" style="margin-bottom:16px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.22);display:flex;align-items:center;gap:12px;padding:12px 16px"><span style="font-size:24px">🛡️</span><div><strong style="color:var(--lx-text);font-size:14px">${L("Keep your rhythm", "حافظ على إيقاعك")}</strong><p class="lx-muted" style="margin:2px 0 0;font-size:13px">${L("Missed yesterday? The Recovery Shield protects your streak for 24 hours. Complete today to keep moving forward without resetting to zero.", "فاتتك عادة الأمس؟ درع التعافي يحمي سلسلتك لـ 24 ساعة. أنجزها اليوم لتستمر سلسلتك دون أن تتصفر وتفقد حماسك.")}</p></div></div>` +
      `<div class="lx-grid-three">${
        d.habits
          .filter((h) => !h.archived)
          .map((h) => {
            const strk = C.habitStreak(h.checks || [], C.day(), h.frequency, d.settings.weekStart);
            const goal = h.goalId ? d.goals.find((g) => g.id === h.goalId) : null;
            const isTodayChecked = h.checks?.includes(C.day());
            const week = C.habitWeek(h, C.day(), d.settings.weekStart);
            const weekDays = week.dates.map(key => {
              const dt = new Date(key + "T12:00:00"), isChk = h.checks?.includes(key), isToday = key === C.day();
              const disabled = key > C.day() || (!isChk && !C.habitDue(h.frequency,key));
              const dayName = new Intl.DateTimeFormat(ar() ? "ar-MA" : "en-GB", { weekday: "narrow" }).format(dt);
              return `<button type="button" class="lx-habit-day-btn ${isChk ? "checked" : ""} ${isToday ? "is-today" : ""}" data-action="habit-toggle-day" data-id="${h.id}" data-date="${key}" aria-label="${key}" aria-pressed="${!!isChk}" ${disabled ? "disabled" : ""}><small>${dayName}</small><span>${dt.getDate()}</span></button>`;
            }).join("");
            const freqMap = {
              daily: L("Daily", "يوميًا"),
              weekdays: L("Weekdays (Sun-Thu)", "أيام العمل"),
              weekly: L("Weekly", "أسبوعيًا"),
            };
            const freqText = freqMap[h.frequency] || L("Daily", "يوميًا");

            const streakBadge = strk.inGrace
              ? `<span class="lx-streak-badge is-grace" title="${L("Grace Day active: Never miss twice! Complete today to save your streak.", "درع التعافي مفعل: لا تفوّت مرتين أبداً! أنجزها اليوم لإنقاذ سلسلتك.")}">🛡️ ${strk.current} <small>(${L("Grace Recovery", "فرصة تعافي")})</small></span>`
              : `<span class="lx-streak-badge" title="${L("Current streak / Best streak", "التتابع الحالي / أفضل تتابع")}">🔥 ${strk.current} <small>(${L("Best", "الأفضل")}: ${strk.best})</small></span>`;

            const actionBtn = !C.habitDue(h.frequency,C.day()) && !isTodayChecked ? `<p class="lx-muted">${L("Not scheduled today", "غير مستحقة اليوم")}</p>` : isTodayChecked
              ? btn(L("Completed today ✓", "تمت اليوم ✓"), "habit-toggle", `data-id="${h.id}"`, true)
              : (strk.inGrace
                ? btn(L("🛡️ Save streak today!", "🛡️ أنقذ سلسلتك اليوم!"), "habit-toggle", `data-id="${h.id}"`, false, 'style="border-color:#f59e0b;color:#f59e0b;font-weight:700;"')
                : btn(L("Mark today complete", "إكمال عادة اليوم"), "habit-toggle", `data-id="${h.id}"`, false));

            return `<article class="lx-card ${strk.inGrace ? "is-grace-card" : ""}"><div class="lx-card-head"><div>${streakBadge}<h2>${esc(h.title)}</h2></div>${btn(L("Edit", "تعديل"), "edit", `data-kind="habits" data-id="${h.id}"`)}</div><p>${esc(h.description || "")}</p>${goal ? `<div class="lx-habit-goal-pill"><button class="lx-text-button" data-route="goals" data-id="${goal.id}">🎯 ${esc(goal.name)}</button><small>+${h.impact ?? 5}% ${L("momentum", "زخم")}</small></div>` : ""}<p class="lx-habit-meta"><span>${L("This week", "هذا الأسبوع")}: <strong>${week.completed} / ${week.target}</strong></span><span>${esc(h.time || "")} · ${freqText}</span></p><div class="lx-habit-days">${weekDays}</div>${actionBtn}</article>`;
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
    `<div class="lx-dialog-footer">${editing ? btn(kind === "tasks" ? L("Delete task", "حذف المهمة") : L("Archive", "أرشفة"), kind === "tasks" ? "task-delete" : "archive", `data-kind="${kind}" data-id="${id}"`) : ""}${btn(L("Cancel", "إلغاء"), "close")}<button class="lx-btn lx-primary" type="submit">${L("Save", "حفظ")}</button></div>`;
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
    if (kind === "tasks") {
      body +=
        `<div class="lx-fields-two">
          ${select(name("goals"), "goalId", options(d.goals), o.goalId)}
          ${field(L("Due date", "تاريخ الاستحقاق"), "date", o.date || C.day(), "date", "required")}
        </div>
        <div class="lx-fields-one">
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
        </div>` +
        (existing
          ? `<div class="lx-info">${L("Actual time", "الوقت الفعلي")}: ${hrs(C.duration(C.reportSessions(d), 0, Infinity, (s) => s.taskId === id))}</div>`
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
        field(L("Plan start date", "تاريخ بداية الخطة"), "startDate", o.startDate || (o.id ? "" : C.day()), "date") +
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
        select(L("Progress measurement", "طريقة قياس التقدم"), "progressMode", [["outcome", L("Outcome · recorded percentage", "النتيجة · نسبة تسجلها")], ["time", L("Time invested / target hours", "الوقت المستثمر ÷ الساعات المستهدفة")]], o.progressMode || (o.id ? "outcome" : "time")) +
        `<p class="lx-muted">${L("For automatic progress, enter total hours OR daily minutes with start and end dates. Outcome mode keeps a percentage you record yourself.", "للتقدم التلقائي: حدد إجمالي الساعات، أو دقائق يومية مع تاريخ البداية والنهاية. قياس النتيجة يحتفظ بنسبة تسجلها بنفسك.")}</p>` +
        field(L("Target hours (estimated total)", "الساعات المستهدفة (إجمالي)"), "targetHours", o.targetHours || 0, "number", 'min="0" max="100000" step="0.5"') +
        field(L("Daily minutes (used when total hours is zero)", "دقائق يومية (لحساب الإجمالي عندما تكون الساعات صفرًا)"), "dailyMinutes", o.dailyMinutes || 0, "number", 'min="0" max="1440" step="1"') +
        `<details class="lx-details" style="margin-top:12px"><summary>${L("Advanced options · optional", "خيارات إضافية · اختياري")}</summary><div style="margin-top:10px">` +
        `<div class="lx-fields-two">${select(L("Domain", "المجال"), "category", d.categories.map((c) => [c, catName(c)]), o.category || "Personal")}${field(L("Outcome progress (%)", "تقدم النتيجة (%)"), "progress", o.progress || 0, "number", 'min="0" max="100" step="0.5"')}</div>` +
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
    if (!await mutate((d) => C.transition(d, "pause"), false)) return;
    const a = db.read()?.activeSession;
    if (!a) return;
    modal(
      L("A meaningful step forward.", "خطوة حقيقية إلى الأمام."),
      `<form id="lxSummaryForm" data-id="${a.id}"><div class="lx-stats">${stat(L("Focus time", "وقت التركيز"), fmt(C.elapsed(a)))}${stat(L("Target", "المستهدف"), a.targetDuration ? hrs(a.targetDuration) : "—")}${stat(L("Completion", "الإتمام"), a.targetDuration ? percent(C.elapsed(a), a.targetDuration) + "%" : "—")}${stat(L("Distractions", "المشتتات"), a.distractions.length)}</div><p>${esc(a.title || db.read().tasks.find((t) => t.id === a.taskId)?.title || "")}</p><p>${name("projects")}: ${esc(db.read().projects.find((p) => p.id === a.projectId)?.name || "—")} · ${name("goals")}: ${esc(db.read().goals.find((g) => g.id === a.goalId)?.name || "—")}</p>${area(L("What did you accomplish?", "ماذا أنجزت؟"), "notes", a.notes)}${a.taskId && !db.read().tasks.find(t => t.id === a.taskId)?.done ? `<label class="lx-switch"><input type="checkbox" name="completeTask">${L("The task is finished · mark complete", "أنهيت المهمة بالكامل · ضعها مكتملة")}</label>` : ""}<div class="lx-fields-two">${select(
        L("Energy level", "مستوى الطاقة"),
        "energyScore",
        [
          ["", L("Not recorded", "لم أسجل تقييمًا")],
          ["low", L("Low", "منخفض")],
          ["medium", L("Medium", "متوسط")],
          ["high", L("High", "عالٍ")],
        ],
        "",
      )}${select(L("Focus quality · 1 to 5", "جودة التركيز · من 1 إلى 5"), "focusScore", [["", L("Not recorded", "لم أسجل تقييمًا")], 1, 2, 3, 4, 5], "")}</div><div class="lx-dialog-footer">${btn(L("Back to session", "العودة للجلسة"), "close")}<button type="submit" class="lx-btn lx-primary">${L("Save session", "حفظ الجلسة")}</button></div></form>`,
    );
  }
  function pomodoroSettings(taskId = "") {
    const d = db.read();
    modal(L("Pomodoro settings", "إعدادات بومودورو"), `<form id="lxPomodoroForm" data-task-id="${esc(taskId)}"><h3>Pomodoro</h3><div class="lx-fields-two">${field(L("Focus minutes", "دقائق التركيز"), "focusMinutes", d.settings.focusMinutes, "number", 'min="1" max="240" required')}${field(L("Short break minutes", "دقائق الراحة القصيرة"), "shortBreak", d.settings.shortBreak, "number", 'min="1" max="60" required')}${field(L("Long break minutes", "دقائق الراحة الطويلة"), "longBreak", d.settings.longBreak, "number", 'min="1" max="120" required')}${field(L("Sessions before long break", "جلسات قبل الراحة الطويلة"), "cycles", d.settings.cycles, "number", 'min="1" max="12" step="1" required')}</div><div class="lx-fields-two">${[
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
    pending:L("Changes are saved on this device. Cloud saving will retry automatically.", "التغييرات محفوظة على هذا الجهاز. سيُستأنف الحفظ السحابي تلقائيًا."),
    schema:L("The cloud table or its columns do not match this version. Your local copy is preserved. Inspect the existing schema before a data-preserving migration; do not reset the table.", "الجدول السحابي أو أعمدته غير متوافقة مع هذه النسخة. بيانات الجهاز محفوظة؛ افحص بنية الجدول قبل تعديلها دون حذف البيانات. لا تعِد تهيئة الجدول."),
    offline:L("Offline. Changes are saved on this device and will upload automatically when connection returns.", "الاتصال غير متاح. التغييرات محفوظة على هذا الجهاز وستُرفع تلقائيًا عند عودة الاتصال."),
    permission:L("Database access was denied. Your local copy is preserved. The administrator must check RLS and grants.", "رفضت قاعدة البيانات الوصول. النسخة المحلية محفوظة؛ يلزم فحص صلاحيات الجدول وسياسات RLS."),
    expired:L("Your cloud session expired. Sign in to the same account to resume sync.", "انتهت صلاحية الجلسة السحابية. سجّل الدخول إلى الحساب نفسه لاستئناف المزامنة."),
    invalidData:L("The cloud copy has an incompatible format. It was not replaced. Contact support before importing or resetting data.", "صيغة النسخة السحابية غير متوافقة ولم نستبدلها. يلزم فحصها قبل استيراد البيانات أو تصفيرها."),
    storage:L("Device storage is full. Export your data before making further changes.", "مساحة التخزين المحلية ممتلئة. صدّر بياناتك قبل إجراء تغييرات إضافية."),
    auth:L("Sign-in failed. Check your cloud account and confirmed email.", "تعذر الدخول. تحقق من الحساب السحابي وتأكيد البريد."),
    confirm:L("Confirm your email, then sign in here.", "أكد بريدك من الرسالة، ثم سجّل الدخول هنا."),
    identity:L("Cloud email must match the current local account.", "يجب أن يطابق البريد السحابي بريد الحساب المحلي الحالي."),
    active:L("Finish the active session before downloading cloud changes.", "أنهِ الجلسة النشطة قبل استرجاع التغييرات السحابية.")
  });
  const cloud = supabase && window.NorthCloud ? window.NorthCloud.create({
    client:supabase, read:()=>db.read(), storage:localStorage,
    email:()=>localStorage.getItem(C.SESSION_KEY),
    ownerId:()=>JSON.parse(localStorage.getItem(C.ACCOUNT_KEY)||"{}")[localStorage.getItem(C.SESSION_KEY)]?.cloudUserId,
    validate:payload=>C.validateImport({...db.read(),...payload,activeSession:null}),
    apply:payload=>{
      const validated=C.validateImport({...db.read(),...payload,activeSession:null});
      db.update(d=>{for(const k of Object.keys(payload)) if(k!=="activeSession") d[k]=validated[k];});
      window.LifeLegacy?.renderAll?.(); render();
    },
    status:state=>{cloudState=state; updateCloudPanel();}
  }) : null;
  function updateCloudPanel() {
    for (const el of document.querySelectorAll("[data-cloud-status]")) el.textContent = cloudMessages()[cloudState];
  }
  function cloudPanel() {
    return `<details class="lx-card" data-cloud-panel><summary>${L("Automatic account saving", "الحفظ التلقائي للحساب")}</summary><p id="lxCloudStatus" data-cloud-status role="status">${cloudMessages()[cloudState]}</p><p>${L("Changes save automatically to your account. Sign in to the same account on another device to restore your workspace. Independent changes from multiple devices are combined automatically; no copy selection is needed.", "تُحفظ تغييراتك تلقائيًا في حسابك. سجّل الدخول بالحساب نفسه من أي جهاز لاسترجاع مساحة عملك. تُدمج تغييرات الأجهزة تلقائيًا دون اختيار نسخة يدويًا.")}</p><details><summary>${L("Backup and connection diagnostics", "النسخ الاحتياطي وفحص الاتصال")}</summary>${btn(L("Export backup", "تصدير نسخة احتياطية"),"cloud-backup")}${btn(L("Check connection", "فحص الاتصال"),"cloud-sync")}</details></details>`;
  }
  if(cloud){
    const update=db.update;
    let pending;
    db.update=fn=>{const result=update(fn);clearTimeout(pending);pending=setTimeout(()=>cloud.sync(),100);return result;};
    setInterval(()=>cloud.resume(),15000);
    window.addEventListener("online",()=>cloud.resume());
    window.addEventListener("north:local-change",()=>{clearTimeout(pending);pending=setTimeout(()=>cloud.sync(),100);});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState === "visible")cloud.resume();});
    window.NorthBoot={prepare:()=>cloud.resume(),flush:async()=>{flushSaves();return await cloud.sync();}};
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
      "" +
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
        "inbox",
      ])
        for (const o of d[kind].filter(o => !o.archived))
          items.push({
            searchable: [o.title, o.name, o.body, o.notes].filter(x => typeof x === "string").join(" "),
            title:
              o.title || o.name || o.notes || L("Focus session", "جلسة تركيز"),
            action: kind === "sessions" ? "session-detail" : "edit",
            kind,
            id: o.id,
          });
    items = items
      .filter((i) => (i.searchable || i.title).toLowerCase().includes(query))
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
    if (a === "show-tip") {
      showTip(b, b.dataset.tip);
      return;
    }
    if (a === "finance-tab") {
      financeTab = b.dataset.tab || "overview";
      window.LifeLegacy.renderAll();
      return;
    }
    if (a === "finance-filter") {
      financeTxFilter = b.dataset.filter || b.dataset.cat || "all";
      window.LifeLegacy.renderAll();
      return;
    }
    if (a === "finance-month-prev") {
      const cur = financeMonth || C.day().slice(0, 7);
      const parts = cur.split("-");
      let y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1;
      if (m < 1) { m = 12; y--; }
      financeMonth = `${y}-${String(m).padStart(2, "0")}`;
      window.LifeLegacy.renderAll();
      return;
    }
    if (a === "finance-month-next") {
      const cur = financeMonth || C.day().slice(0, 7);
      const parts = cur.split("-");
      let y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) + 1;
      if (m > 12) { m = 1; y++; }
      financeMonth = `${y}-${String(m).padStart(2, "0")}`;
      window.LifeLegacy.renderAll();
      return;
    }
    if (a === "finance-start-balance") {
      const d = db.read();
      const curM = financeMonth || C.day().slice(0, 7);
      const bal = getStartingBalance(d, curM);
      const dlg = $("#lxDialog");
      dlg.innerHTML = `<div class="lx-modal-box">
        <div class="lx-modal-head">
          <h3>💰 ${L("Monthly Starting Balance", "الرصيد الافتتاحي للشهر")}</h3>
          <button type="button" class="lx-modal-close" data-action="close">✕</button>
        </div>
        <form id="lxStartBalanceForm">
          <input type="hidden" name="month" value="${esc(curM)}" />
          <p class="lx-muted" style="margin-bottom:14px">${L("Set your starting cash & bank balance at the beginning of this month.", "حدد إجمالي رصيدك النقدي والبنكي في بداية هذا الشهر لاحتساب الرصيد التراكمي بدقة.")}</p>
          <div class="lx-field">
            <label>${L("Amount", "المبلغ")} (${esc(d.settings?.currency || "MAD")})</label>
            <input type="number" step="any" min="0" name="amount" value="${bal}" required class="lx-input" />
          </div>
          <div class="lx-modal-actions">
            <button type="button" class="lx-btn lx-secondary" data-action="close">${L("Cancel", "إلغاء")}</button>
            <button type="submit" class="lx-btn lx-primary">${L("Save Balance", "حفظ الرصيد")}</button>
          </div>
        </form>
      </div>`;
      dlg.showModal();
      return;
    }
    if (a === "finance-plan-edit") {
      const d = db.read();
      const curM = financeMonth || C.day().slice(0, 7);
      const plan = getFinancePlan(d, curM);
      const dlg = $("#lxDialog");
      let expHtml = [...plan.expenses, ...Array.from({length:3},()=>({category:"",amount:0}))].map((e, idx) => `
        <div style="display:grid;grid-template-columns:1fr 100px;gap:8px;margin-bottom:8px;">
          <input type="text" name="exp_cat_${idx}" value="${esc(e.category)}" class="lx-input" placeholder="${L("Category", "الفئة")}" />
          <input type="number" step="any" min="0" name="exp_amt_${idx}" value="${e.amount}" class="lx-input" placeholder="${L("Amount", "المبلغ")}" />
        </div>
      `).join("");
      let incHtml = [...plan.income, ...Array.from({length:3},()=>({source:"",amount:0}))].map((i, idx) => `
        <div style="display:grid;grid-template-columns:1fr 100px;gap:8px;margin-bottom:8px;">
          <input type="text" name="inc_cat_${idx}" value="${esc(i.source || i.category || "")}" class="lx-input" placeholder="${L("Source", "المصدر")}" />
          <input type="number" step="any" min="0" name="inc_amt_${idx}" value="${i.amount}" class="lx-input" placeholder="${L("Amount", "المبلغ")}" />
        </div>
      `).join("");
      dlg.innerHTML = `<div class="lx-modal-box" style="max-width:580px;">
        <div class="lx-modal-head">
          <h3>⚙️ ${L("Edit Budget Plan", "تعديل خطة الميزانية")} (${formatFinanceMonth(curM)})</h3>
          <button type="button" class="lx-modal-close" data-action="close">✕</button>
        </div>
        <form id="lxFinancePlanForm">
          <input type="hidden" name="month" value="${esc(curM)}" />
          <h4 style="margin:10px 0 8px;">📉 ${L("Planned Expenses Targets", "أهداف المصاريف المخططة")}</h4>
          <div style="max-height:160px;overflow-y:auto;padding-right:4px;">${expHtml}</div>
          <h4 style="margin:14px 0 8px;">📈 ${L("Planned Income Targets", "أهداف الدخل المخطط")}</h4>
          <div style="max-height:140px;overflow-y:auto;padding-right:4px;">${incHtml}</div>
          <div class="lx-modal-actions" style="margin-top:16px;">
            <button type="button" class="lx-btn lx-secondary" data-action="close">${L("Cancel", "إلغاء")}</button>
            <button type="submit" class="lx-btn lx-primary">${L("Save Plan", "حفظ الخطة")}</button>
          </div>
        </form>
      </div>`;
      dlg.showModal();
      return;
    }
    if (a === "finance-debt-new" || a === "finance-debt-edit") {
      const d = db.read();
      const debts = getDebts(d);
      const debt = a === "finance-debt-edit" ? debts.find(x => x.id === b.dataset.id) : null;
      const dlg = $("#lxDialog");
      dlg.innerHTML = `<div class="lx-modal-box">
        <div class="lx-modal-head">
          <h3>🤝 ${debt ? L("Edit Debt / Obligation", "تعديل الدين / الالتزام") : L("Add New Debt / Obligation", "إضافة دين أو التزام جديد")}</h3>
          <button type="button" class="lx-modal-close" data-action="close">✕</button>
        </div>
        <form id="lxDebtForm">
          <input type="hidden" name="id" value="${debt ? esc(debt.id) : ""}" />
          <div class="lx-field">
            <label>${L("Creditor / Title", "الدائن / العنوان")}</label>
            <input type="text" name="name" required class="lx-input" value="${debt ? esc(debt.name) : ""}" placeholder="e.g. Credi mohammed" />
          </div>
          <div class="lx-fields-two">
            <div class="lx-field">
              <label>${L("Total Debt Amount", "إجمالي قيمة الدين")}</label>
              <input type="number" step="any" min="0" name="totalAmount" required class="lx-input" value="${debt ? debt.totalAmount : ""}" />
            </div>
            <div class="lx-field">
              <label>${L("Amount Already Paid", "المبلغ المسدد سابقاً")}</label>
              <input type="number" step="any" min="0" name="paidAmount" class="lx-input" value="${debt ? debt.paidAmount : 0}" />
            </div>
          </div>
          <div class="lx-field">
            <label>${L("Due Date / Notes (optional)", "تاريخ السداد / ملاحظات")}</label>
            <input type="text" name="notes" class="lx-input" value="${debt ? esc(debt.notes || "") : ""}" placeholder="Optional" />
          </div>
          <div class="lx-modal-actions">
            <button type="button" class="lx-btn lx-secondary" data-action="close">${L("Cancel", "إلغاء")}</button>
            <button type="submit" class="lx-btn lx-primary">${L("Save Debt", "حفظ الدين")}</button>
          </div>
        </form>
      </div>`;
      dlg.showModal();
      return;
    }
    if (a === "finance-debt-pay") {
      const d = db.read();
      const debts = getDebts(d);
      const debt = debts.find(x => x.id === b.dataset.id);
      if (!debt) return;
      const remaining = Math.max(0, Number(debt.totalAmount) - Number(debt.paidAmount || 0));
      const dlg = $("#lxDialog");
      dlg.innerHTML = `<div class="lx-modal-box">
        <div class="lx-modal-head">
          <h3>💳 ${L("Log Debt Payment", "تسجيل دفعة سداد دين")}</h3>
          <button type="button" class="lx-modal-close" data-action="close">✕</button>
        </div>
        <form id="lxDebtPayForm">
          <input type="hidden" name="debtId" value="${esc(debt.id)}" />
          <p><strong>${esc(debt.name)}</strong> - ${L("Remaining owed:", "المتبقي:")} <span style="color:#A78BFA">${remaining} ${esc(d.settings?.currency || "MAD")}</span></p>
          <div class="lx-field" style="margin-top:12px;">
            <label>${L("Installment Amount Paid", "مبلغ الدفعة المسددة")}</label>
            <input type="number" step="any" min="0.01" max="${remaining}" name="paymentAmount" value="${remaining}" required class="lx-input" />
          </div>
          <div class="lx-field">
            <label><input type="checkbox" name="deductBalance" checked /> ${L("Also record as expense (deduct from monthly cash balance)", "تسجيلها أيضاً كمصروف (خصمها من الرصيد النقدي للشهر)")}</label>
          </div>
          <div class="lx-modal-actions">
            <button type="button" class="lx-btn lx-secondary" data-action="close">${L("Cancel", "إلغاء")}</button>
            <button type="submit" class="lx-btn lx-primary">${L("Confirm Payment", "تأكيد السداد")}</button>
          </div>
        </form>
      </div>`;
      dlg.showModal();
      return;
    }
    if (a === "finance-debt-delete") {
      const debtId = b.dataset.id;
      const dlg = $("#lxDialog");
      dlg.innerHTML = `<div class="lx-modal-box">
        <div class="lx-modal-head">
          <h3>🗑️ ${L("Delete Debt", "حذف الدين")}</h3>
          <button type="button" class="lx-modal-close" data-action="close">✕</button>
        </div>
        <p>${L("Are you sure you want to remove this debt record?", "هل أنت متأكد من رغبتك في حذف هذا الالتزام المالي؟")}</p>
        <div class="lx-modal-actions">
          <button type="button" class="lx-btn lx-secondary" data-action="close">${L("Cancel", "إلغاء")}</button>
          <button type="button" class="lx-btn" style="background:#EF4444;color:#fff;" data-action="finance-debt-confirm-delete" data-id="${esc(debtId)}">${L("Delete", "حذف")}</button>
        </div>
      </div>`;
      dlg.showModal();
      return;
    }
    if (a === "finance-debt-confirm-delete") {
      const debtId = b.dataset.id;
      const saved = await mutate((d) => {
        if (!d.settings) d.settings = {};
        if (!Array.isArray(d.settings.debts)) d.settings.debts = [];
        d.settings.debts = d.settings.debts.filter(x => x.id !== debtId);
      });
      if (!saved) return;
      $("#lxDialog")?.close();
      notice(L("Debt removed.", "تم حذف الدين."));
      window.LifeLegacy.renderAll();
      return;
    }

    if (a.startsWith("cloud-")) {
      if (a === "cloud-backup") { $("#exportBtn")?.click(); return; }
      if (!cloud) { notice(cloudMessages().offline, true); return; }
      const label = b.textContent;
      b.disabled = true;
      b.textContent = L("Checking…", "جارٍ التحقق…");
      try {
        if (a === "cloud-sync") await cloud.resume();
        else if (a === "cloud-local" || a === "cloud-remote") await cloud.resolve(a.slice(6));
        notice(cloudMessages()[cloudState], cloudState !== "saved");
      } catch { notice(L("Could not complete sync. Your local data is preserved.", "تعذر إكمال المزامنة. بيانات جهازك محفوظة."), true); }
      finally { b.disabled = false; b.textContent = label; }
      return;
    }
    const id = b.dataset.id,
      kind = b.dataset.kind;
    if (a !== "close-command" && b.closest("#lxCommand"))
      $("#lxCommand").close();
    if (a === "navigate") navigate(b.dataset.to);
    if (a === "language") window.LifeLegacy.toggleLang();
    if (a === "zen-mode") {
      const isZen = document.body.classList.toggle("v3-zen-mode-active");
      try {
        if (isZen && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (!isZen && document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {}
      return;
    }
    if (a === "shutdown") {
      const today = C.day();
      const tt = totals(db.read());
      const doneTasks = db.read().tasks.filter(t => t.done && t.completedDate?.startsWith(today));
      const body = `<div class="lx-shutdown-modal" style="text-align:center">
        <h1 style="font-size:48px; margin-bottom:10px">🌙</h1>
        <h2>${L("Work is done.", "لقد انتهى العمل.")}</h2>
        <p class="lx-muted" style="margin-bottom:24px">${L("Review what you accomplished and capture anything you want to revisit tomorrow.", "راجع ما أنجزته وسجل الأفكار التي تريد العودة إليها غدًا.")}</p>
        
        <div class="lx-grid-two" style="text-align:start; margin-bottom:24px">
          <div class="lx-card" style="padding:16px">
            <div class="lx-eyebrow">${L("TODAY'S WINS", "إنجازات اليوم")}</div>
            <h3 style="font-size:24px; color:var(--lx-accent)">${doneTasks.length} ${L("Tasks", "مهام")}</h3>
          </div>
          <div class="lx-card" style="padding:16px">
            <div class="lx-eyebrow">${L("DEEP FOCUS", "التركيز العميق")}</div>
            <h3 style="font-size:24px; color:var(--lx-accent)">${hrs(tt.today)}</h3>
          </div>
        </div>
        
        <div style="text-align:start; margin-bottom:24px">
          <label class="full">
            <span>${L("Brain Dump (Inbox)", "تفريغ الدماغ (الوارد)")}</span>
            <textarea id="sdDump" rows="3" placeholder="${L("Any lingering thoughts? Write them here so you can sleep peacefully...", "هل هناك أفكار عالقة في ذهنك؟ اكتبها هنا لتنام بسلام ولتجدها غداً في الوارد...")}"></textarea>
          </label>
        </div>
        
        <button class="lx-btn lx-primary lx-wide" data-action="shutdown-confirm" style="font-size:16px; padding:16px">
          ${L("Disconnect Now", "أغلق اليوم وافصل عقلك")}
        </button>
      </div>`;
      modal(L("Daily Shutdown", "الإغلاق اليومي"), body);
      return;
    }
    
    if (a === "shutdown-confirm") {
      const dump = document.getElementById("sdDump")?.value.trim();
      if (dump) {
        if (!await mutate(d => {
          d.inbox.unshift({ id: C.id(), title: dump, createdAt: Date.now() });
        })) return;
      }
      document.getElementById("lxDialog").close();
      document.body.classList.add("lx-shutdown-active");
      const overlay = document.createElement("div");
      overlay.className = "lx-shutdown-overlay";
      overlay.innerHTML = `<h1>🌙</h1><h2>${L("The day is done.", "انتهى عمل اليوم.")}</h2><p>${L("Rest well. Return to your workspace whenever you are ready.", "نتمنى لك راحة هنيئة. يمكنك العودة إلى مساحة العمل متى شئت.")}</p>`;
      document.body.appendChild(overlay);
      overlay.insertAdjacentHTML("beforeend", btn(L("Return to workspace", "العودة إلى مساحة العمل"), "shutdown-exit", 'class="lx-btn lx-primary"'));
      return;
    }
    if (a === "shutdown-exit") {
      document.querySelector(".lx-shutdown-overlay")?.remove();
      document.body.classList.remove("lx-shutdown-active");
      return;
    }
    if (a === "new") editor(kind, "", { projectId: b.dataset.project || "", goalId: b.dataset.goal || "" });
    if (a === "edit") editor(kind, id);
    if (a === "close") $("#lxDialog").close();
    if (a === "close-command") $("#lxCommand").close();
    if (a === "command") command();
    if (a === "menu")
      modal(
        L("Your workspace", "مساحة عملك"),
        `<details class="lx-nav-more" open><summary>${L("More sections", "المزيد من الأقسام")}</summary><div class="lx-menu-grid">${secondaryRoutes
          .map(k => btn(icon(k) + name(k), "navigate", `data-to="${k}"`)).join("")}</div></details>
          <div class="lx-menu-actions" style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
            ${btn("👑 " + L("Membership & Plans", "باقات الاشتراك والعضوية"), "pricing", 'class="lx-btn lx-primary"')}
            ${btn("💡 " + L("Share feedback & ideas", "شاركنا اقتراحك وملاحظاتك"), "feedback")}
          </div>`,
      );
    if (a === "feedback") openFeedbackModal();
    if (a === "pricing") return;
    if (a === "upgrade-pro") {
      $("#lxDialog").close();
      notice(L("Bank card payment integration is in progress. Core tier is active — you will be notified immediately once direct card payment goes live.", "بوابة الدفع البنكي الإلكتروني قيد الربط والتفعيل — تم تفعيل الباقة العادية لك حالياً، وستصلك رسالة إشعار للترقية فور اكتمال الربط."));
    }
    if (a === "waitlist-ai") notice(L("The AI coach is not available yet. No waitlist registration has been submitted.", "المدرب الذكي غير متاح بعد. لم يتم إرسال تسجيل في قائمة انتظار."));
    if (a === "export-finance") {
      exportFinanceCSV(db.read());
    }
    if (a === "more-sessions") {
      historyLimit += 50;
      render();
    }
    if (a === "manual") manualDialog();
    if (a === "pomodoro-settings") pomodoroSettings(b.dataset.taskId || "");
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
    if (a === "home-focus") {
      if (db.read().activeSession) { activeDialog(); return; }
      const task = db.read().tasks.find(t => t.id === id && !t.archived && !t.done);
      if (!task) { navigate("tasks"); return; }
      if (await mutate(d => C.createSession(d, {taskId:id, type:"pomodoro", categoryId:"Deep Work"}))) navigate("focus");
      return;
    }
    if (a === "task-focus") {
      if (db.read().activeSession) {
        activeDialog();
        return;
      }
      const t = db.read().tasks.find((x) => x.id === id);
      if (t) {
        taskFocusModal(t, db.read());
        return;
      }
      navigate("focus");
      return;
    }
    if (a === "qf-mode") {
      const dialog = $("#lxDialog");
      dialog.querySelectorAll("[data-qf-mode]").forEach(x => {
        const selected = x === b;
        x.classList.toggle("active", selected);
        x.setAttribute("aria-pressed", String(selected));
        const check = x.querySelector(".v3-mode-check"); if(check) check.textContent = selected ? "✓" : "";
      });
      dialog.querySelector("#v3CountdownRow")?.classList.toggle("hidden", b.dataset.qfMode !== "countdown");
      return;
    }
    if (a === "qf-duration") {
      const custom = $("#lxDialog").querySelector('[name="customMinutes"]');
      if (custom) custom.value = "";
      $("#lxDialog").querySelectorAll("[data-dur]").forEach(x => {x.classList.toggle("active", x === b); x.setAttribute("aria-pressed", String(x === b));});
      return;
    }
    if (a === "qf-launch") {
      const taskId = b.dataset.taskId;
      const goalId = b.dataset.goalId;
      const projectId = b.dataset.projectId;
      const dialog = $("#lxDialog");
      const type = dialog?.querySelector('[data-qf-mode].active')?.dataset.qfMode || "pomodoro";
      const durPill = dialog?.querySelector(".v3-dur-pill.active");
      const custom = dialog?.querySelector('[name="customMinutes"]')?.value;
      const targetMinutes = type === "pomodoro" ? db.read().settings.focusMinutes : type === "stopwatch" ? 0 : (custom ? Number(custom) : Number(durPill?.dataset.dur) || 25);
      if (!Number.isFinite(targetMinutes) || targetMinutes < 0 || targetMinutes > 1440 || (type === "countdown" && targetMinutes < 1)) { notice(L("Choose 1–1440 minutes.", "اختر مدة بين دقيقة و1440 دقيقة."), true); return; }
      const t = db.read().tasks.find((x) => x.id === taskId);
      
      const launched = await mutate((d) => {
        C.createSession(d, {
          type,
          title: t ? t.title : "Deep Work",
          taskId: taskId || "",
          goalId: goalId || "",
          projectId: projectId || "",
          categoryId: "Deep Work",
          targetMinutes
        });
      });
      if (launched) {
        if (dialog?.open) dialog.close();
        navigate("focus");
      }
      return;
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
      const d = db.read(), item = d.inbox.find((x) => x.id === id);
      if (!item || item.archived) return;
      const origin = C.reportSessions(d).find(s => s.id === item.sessionId);
      editor(target, "", {
        title: item.title,
        name: item.title,
        body: item.body,
        sourceInbox: id,
        goalId: origin?.goalId || "",
        projectId: origin?.projectId || "",
      });
    }
    if (a === "task-delete" || a === "task-restore") {
      const deleting = a === "task-delete";
      if (deleting && db.read().activeSession?.taskId === id) {
        notice(L("Finish the active session before deleting its task.", "أنه جلسة التركيز النشطة قبل حذف مهمتها."), true);
        return;
      }
      const saved = await mutate(d => {
        const task = d.tasks.find(t => t.id === id);
        if (!task) throw Error("invalidData");
        task.archived = deleting;
        task.updatedAt = Date.now();
      });
      if (saved) {
        if ($("#lxDialog")?.open) $("#lxDialog").close();
        notice(deleting ? L("Task deleted. Restore it from Deleted.", "حُذفت المهمة. يمكنك استعادتها من «المحذوفة».") : L("Task restored.", "تمت استعادة المهمة."));
        window.LifeLegacy?.renderAll?.();
      }
      return;
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
    modal(L("Membership", "العضوية"), `<section class="lx-card">
      <h2>${L("Your workspace is available", "مساحة عملك متاحة")}</h2>
      <p>${L("Goals, focus, habits, finances and cloud saving are available in the current release. Paid subscriptions and the AI coach are not launched; no payment is collected.", "الأهداف والتركيز والعادات والمال والحفظ السحابي متاحة في الإصدار الحالي. الاشتراكات المدفوعة والمدرب الذكي لم يُطلقا بعد؛ لا يتم تحصيل أي مبلغ.")}</p>
      <p>${L("Plan", "الخطة")}: ${userTier() === "pro" ? "Pro" : "Core"}</p>
      ${btn(L("Back to workspace", "العودة لمساحة العمل"), "close", "", true)}
    </section>`);
  }

  function activeDialog() {
    modal(
      L("You already have an active session.", "لديك جلسة تركيز نشطة."),
      `<p>${L("Keep one clear focus. Resume or finish your current session first.", "حافظ على تركيز واحد. استأنف جلستك الحالية أو أنهها أولًا.")}</p><div class="lx-actions">${btn(L("Resume", "استئناف"), "navigate", 'data-to="focus"', true)}${btn(L("Finish current session", "إنهاء الجلسة الحالية"), "session-finish")}${btn(L("Cancel", "إلغاء"), "close")}</div>`,
    );
  }
  async function submit(e) {
    const form = e.target;
    const formId = form.getAttribute?.("id") || (typeof form.id === "string" ? form.id : "");
    if (!formId.startsWith("lx")) return;
    e.preventDefault();
    if (formId !== "lxFeedbackForm") {
      try { flushSaves(); } catch {}
    }
    const data = Object.fromEntries(new FormData(form));
    const submitButton = form.querySelector("[type=submit]");
    if (submitButton) submitButton.disabled = true;
    let result;
    try {
      if (formId === "lxQuickTaskFocusForm") {
        const title = (data.quickTitle || "").trim();
        result = await mutate(d => {
          const goal = d.goals.find(g => g.id === data.goalId && !g.archived);
          if (!goal || !title) throw Error("invalidData");
          if (d.activeSession) throw Error("activeSession");
          const task = {id:C.id(), title, goalId:goal.id, projectId:goal.projectId || "", date:C.day(), priority:"medium", status:"todo", done:false, subtasks:[]};
          d.tasks.unshift(task);
          C.createSession(d, {taskId:task.id, type:"pomodoro", categoryId:"Deep Work"});
        });
        if (result) navigate("focus");
        return;
      }
      if (formId === "lxQuickTxForm") {
        const type = data.type || "expense";
        const amount = parseFloat(data.amount);
        const category = data.category || "";
        if (!financeCategories.some(c => c.en === category && c.type === type)) {
          notice(L("Choose a category for this transaction.", "اختر فئة لهذه المعاملة."), true);
          return;
        }
        const title = (data.title || "").trim() || category;
        const curM = financeMonth || C.day().slice(0, 7);
        const todayStr = C.day();
        const date = data.date || (todayStr.startsWith(curM) ? todayStr : (curM + "-01"));
        if (!Number.isFinite(amount) || amount <= 0) {
          notice(L("Please enter a valid amount.", "يرجى إدخال مبلغ صحيح."), true);
          if (submitButton) submitButton.disabled = false;
          return;
        }
        const saved = await mutate((d) => {
          if (!Array.isArray(d.finances)) d.finances = [];
          d.finances.unshift({
            id: C.id(),
            title,
            amount,
            type,
            category,
            date,
            createdAt: Date.now()
          });
        });
        if (!saved) return;
        form.reset();
        notice(L("Transaction saved.", "تم تسجيل المعاملة بنجاح."));
        window.LifeLegacy.renderAll();
        return;
      }
      if (formId === "lxStartBalanceForm") {
        const m = data.month;
        const amount = Number(data.amount || 0);
        if (!Number.isFinite(amount)) throw Error("invalidData");
        if (!await setStartingBalance(m, amount)) return;
        $("#lxDialog")?.close();
        notice(L("Starting balance updated.", "تم تحديث الرصيد الافتتاحي."));
        window.LifeLegacy.renderAll();
        return;
      }
      if (formId === "lxFinancePlanForm") {
        const m = data.month;
        const readRows = (prefix, field) => Object.keys(data).filter(k => k.startsWith(prefix + "_cat_")).map(k => {
          const index = k.slice((prefix + "_cat_").length);
          return {[field]: String(data[k] || "").trim(), amount: Number(data[prefix + "_amt_" + index] || 0)};
        }).filter(x => x[field]);
        const newExpenses = readRows("exp", "category");
        const newIncome = readRows("inc", "source");
        if ([...newExpenses, ...newIncome].some(x => !Number.isFinite(x.amount) || x.amount < 0)) {
          notice(L("Enter valid non-negative amounts.", "أدخل مبالغ صحيحة غير سالبة."), true); return;
        }
        if (!await setFinancePlan(m, { expenses: newExpenses, income: newIncome })) return;
        $("#lxDialog")?.close();
        notice(L("Budget plan saved.", "تم حفظ خطة الميزانية."));
        window.LifeLegacy.renderAll();
        return;
      }
      if (formId === "lxDebtForm") {
        const id = data.id || C.id();
        const name = (data.name || "").trim();
        const totalAmount = Number(data.totalAmount || 0);
        const paidAmount = Number(data.paidAmount || 0);
        if (!name || ![totalAmount,paidAmount].every(Number.isFinite) || totalAmount < 0 || paidAmount < 0 || paidAmount > totalAmount) throw Error("invalidData");
        const notes = (data.notes || "").trim();
        const saved = await mutate((d) => {
          if (!d.settings) d.settings = {};
          if (!Array.isArray(d.settings.debts)) d.settings.debts = [];
          const idx = d.settings.debts.findIndex(x => x.id === id);
          const item = { id, name, totalAmount, paidAmount, notes, updatedAt: Date.now() };
          if (idx >= 0) d.settings.debts[idx] = item;
          else d.settings.debts.push(item);
        });
        if (!saved) return;
        $("#lxDialog")?.close();
        notice(L("Debt saved.", "تم حفظ بيانات الدين."));
        window.LifeLegacy.renderAll();
        return;
      }
      if (formId === "lxDebtPayForm") {
        const debtId = data.debtId;
        const paymentAmount = parseFloat(data.paymentAmount) || 0;
        const deductBalance = form.querySelector("[name=deductBalance]")?.checked;
        if (paymentAmount <= 0) {
          notice(L("Invalid payment amount.", "مبلغ السداد غير صحيح."), true);
          if (submitButton) submitButton.disabled = false;
          return;
        }
        const curM = financeMonth || C.day().slice(0, 7);
        const todayStr = C.day();
        const date = data.date || (todayStr.startsWith(curM) ? todayStr : curM + "-01");
        const saved = await mutate(d => C.recordDebtPayment(d, debtId, paymentAmount, {
          deductBalance, date, title: L("Debt Payment: ", "سداد دين: ") + (d.settings.debts.find(x=>x.id===debtId)?.name || "")
        }));
        if (!saved) return;
        $("#lxDialog")?.close();
        notice(deductBalance ? L("Payment recorded and deducted from balance.", "تم تسجيل دفعة السداد وخصمها من الرصيد.") : L("Payment recorded.", "تم تسجيل دفعة السداد."));
        window.LifeLegacy.renderAll();
        return;
      }

      if (formId === "lxFeedbackForm") {
        const cat = data.fbCategory || "feature";
        const msg = String(data.fbMessage || "").trim();
        const eml = String(data.fbEmail || "").trim();
        if (!msg) {
          notice(L("Please write your suggestion.", "يرجى كتابة فكرتك أو ملاحظتك."), true);
          if (submitButton) submitButton.disabled = false;
          return;
        }
        const client = window.NorthAuth?.client;
        const user = window.NorthAuth?.cachedUser;
        if (!client || !user) {
          notice(L("Connect to your account to send feedback. Your text is still here.", "اتصل بحسابك لإرسال الاقتراح. النص ما زال هنا."), true);
          return;
        }
        const response = await client.from("north_feedbacks").insert({user_id:user.id, category:cat, message:msg, email:eml});
        if (response.error) {
          notice(L("Feedback was not sent. Your text is still here; please retry later.", "لم يُرسل الاقتراح. النص محفوظ في هذه النافذة؛ أعد المحاولة لاحقًا."), true);
          return;
        }
        $("#lxDialog").close();
        notice(L("Feedback received. Thank you.", "تم استلام اقتراحك. شكرًا لك."));
        return;
      }
      if (formId === "lxBudgetForm") {
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
      if (formId === "lxMoneyTodo") {
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
      if (formId === "lxFocusForm") {
        result = await mutate((d) => C.createSession(d, data));
        if (result) navigate("focus");
        else if (db.read()?.activeSession) activeDialog();
      }
      if (formId === "lxEntityForm") {
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
          "dailyMinutes",
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
        if (kind === "goals" && data.startDate && data.deadline && data.deadline < data.startDate) {
          notice(L("The deadline must follow the start date.", "يجب أن تأتي نهاية الخطة بعد بدايتها."), true);
          return;
        }
        if (kind === "goals" && data.progressMode === "time" && !(C.goalTargetHours(data) > 0)) {
          notice(L("Set total hours, or daily minutes with both plan dates.", "حدد إجمالي الساعات، أو الدقائق اليومية مع تاريخ البداية والنهاية."), true);
          return;
        }
        result = await mutate((d) => {
          const old = d[kind].find((x) => x.id === id),
            item = old || { id: C.id(), createdAt: Date.now() };
          const wasDone = !!item.done;
          if (
            kind === "tasks" &&
            wasDone &&
            ["goalId", "impact", "progressImpact"].some(k => k in data && item[k] !== data[k])
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
            item.subtasks = typeof data.subtaskText === "string" ? data.subtaskText
              .split("\n")
              .filter((x) => x.trim())
              .map((x) => ({
                title: x.replace(/^\[x\]\s*/i, ""),
                done: /^\[x\]/i.test(x),
              })) : (item.subtasks || []);
            if (!old) item.done = false;
          }
          if (!old) d[kind].unshift(item);
          if (kind === "tasks")
            C.completeTask(d, item.id, "status" in data ? data.status === "done" : wasDone);
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
      if (formId === "lxManualForm") {
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
      if (formId === "lxSummaryForm") {
        result = await mutate((d) => {
          if (d.activeSession?.id !== form.dataset.id) throw Error("noSession");
          Object.assign(d.activeSession, data, {
            focusScore: data.focusScore ? C.num(data.focusScore, 1, 5) : null,
          });
          const taskId = d.activeSession.taskId;
          const complete = data.completeTask === "on";
          delete d.activeSession.completeTask;
          const finished = C.transition(d, "finish");
          if (complete && taskId) C.completeTask(d, taskId, true);
          return finished;
        });
        if (result) {
          $("#lxDialog").close();
          const savedSession = result.data.sessions.find(s => s.id === form.dataset.id);
          if (savedSession?.goalId) navigate("goals", savedSession.goalId);
          else navigate("analytics");
          notice(L("Session saved. Well done.", "حُفظت الجلسة. أحسنت."));
        }
      }
      if (formId === "lxDistractionForm") {
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
      if (["lxSettingsForm", "lxPomodoroForm"].includes(formId)) {
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
        if (result) {
          if (formId === "lxPomodoroForm") {
            const task = db.read().tasks.find(t => t.id === form.dataset.taskId && !t.archived);
            if (task) taskFocusModal(task, db.read()); else $("#lxDialog").close();
          }
          render(); notice(L("Preferences saved", "تم حفظ التفضيلات"));
        }
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
    if (e.target.form?.id === "lxQuickTxForm" && e.target.name === "type") {
      const select = e.target.form.querySelector('[name="category"]');
      select.innerHTML = `<option value="">${L("Choose a category", "اختر الفئة")}</option>` + financeCategories.filter(c => c.type === e.target.value)
        .map(c => `<option value="${esc(c.en)}">${c.icon} ${esc(ar() ? c.ar : c.en)}</option>`).join("");
    }
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
      timer.textContent = fmtMinSec(time);
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
        hrs(duration);
      const dial = $("#v3DialFill");
      if (dial && a.phaseDuration) {
        const circ = 2 * Math.PI * 130;
        dial.style.strokeDasharray = circ;
        const pct = Math.max(0, Math.min(100, (remaining / a.phaseDuration) * 100));
        dial.style.strokeDashoffset = circ - (circ * pct) / 100;
      }
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
  let routeOwner = "";
  function restoreWorkspaceRoute() {
    if (!db.read()) return;
    mount();
    if (routeOwner !== currentEmail()) {
      routeOwner = currentEmail();
      const [r, i] = location.hash.slice(1).split("/");
      navigate(labels[r] ? r : "home", i || "", false);
    } else render();
  }
  document.addEventListener("lifeos:render", restoreWorkspaceRoute);
  restoreWorkspaceRoute();
})();

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("v3-zen-mode-active")) {
      document.body.classList.remove("v3-zen-mode-active");
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && document.body.classList.contains("v3-zen-mode-active")) {
      document.body.classList.remove("v3-zen-mode-active");
    }
  });
