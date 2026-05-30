const panelRoot = window.location.pathname.split("/").filter(Boolean)[0] === "su" ? "/su" : "/superuser";
const panelMode = panelRoot === "/su" ? "master" : "sub";
const tokenKey = panelMode === "master" ? "medicare_master_admin_token" : "medicare_sub_admin_token";
const adminPageKey = panelMode === "master" ? "medicare_master_admin_active_page" : "medicare_sub_admin_active_page";
const validAdminPages = ["dashboard", "content", "about", "doctors", "ambulance", "hospitals", "blood", "bloodDetail", "services", "products", "orders", "store-users", "comments", "contact", "sub-admins"];

function getSavedAdminPage() {
  try {
    const saved = localStorage.getItem(adminPageKey) || "";
    return validAdminPages.includes(saved) && saved !== "bloodDetail" ? saved : "dashboard";
  } catch {
    return "dashboard";
  }
}

function saveAdminPage(page = "dashboard") {
  try {
    const safePage = page === "bloodDetail" ? "blood" : page;
    if (validAdminPages.includes(safePage)) localStorage.setItem(adminPageKey, safePage);
  } catch {
    // Ignore storage errors; URL routing will still work.
  }
}

function applyAdminTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nextTheme === "dark" ? "#080b12" : "#f6f7fb");
  qsa("#adminThemeToggle").forEach((button) => {
    const isDark = nextTheme === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    const icon = qs(".theme-toggle-icon", button);
    const text = qs(".theme-toggle-text", button);
    if (icon) icon.textContent = isDark ? "☀" : "☾";
    if (text) text.textContent = isDark ? "Light mode" : "Dark mode";
  });
}

function initAdminTheme() {
  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem("medicare-theme") || "light";
  } catch {
    savedTheme = "light";
  }
  applyAdminTheme(savedTheme);
  qs("#adminThemeToggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nextTheme = current === "dark" ? "light" : "dark";
    try { localStorage.setItem("medicare-theme", nextTheme); } catch { /* ignore */ }
    applyAdminTheme(nextTheme);
  });
}

function updateAdminMenuPosition() {
  const header = qs(".admin-site-header");
  if (!header) return;

  const rect = header.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 700;
  const safeGap = 10;
  const safeBottom = 12;
  const fallbackTop = 92;
  const measuredTop = rect.bottom > 0 ? rect.bottom + safeGap : fallbackTop;
  const top = Math.max(12, Math.min(measuredTop, viewportHeight - 140));
  const maxHeight = Math.max(220, viewportHeight - top - safeBottom);

  document.documentElement.style.setProperty("--admin-menu-top", `${Math.round(top)}px`);
  document.documentElement.style.setProperty("--admin-menu-max-height", `${Math.round(maxHeight)}px`);
}

function setAdminMenu(open) {
  const isOpen = Boolean(open);
  if (isOpen) updateAdminMenuPosition();
  document.body.classList.toggle("admin-menu-open", isOpen);
  qs("#adminMenuButton")?.classList.toggle("is-open", isOpen);
  qs("#adminMenuButton")?.setAttribute("aria-expanded", String(isOpen));
}

function updateAdminBackButton() {
  const button = qs("#adminBackButton");
  if (!button) return;
  const isDashboard = state.activePage === "dashboard";
  button.classList.toggle("is-dashboard-back", isDashboard);
  button.textContent = isDashboard ? "← Back" : "← Back";
}

function goBackFromAdmin() {
  setAdminMenu(false);
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  if (state.activePage !== "dashboard") {
    setAdminPage("dashboard", true);
    return;
  }
  window.location.href = "/";
}

function initAdminMenu() {
  const button = qs("#adminMenuButton");
  const sidebar = qs(".admin-sidebar");
  const overlay = qs("#adminMenuOverlay");
  let menuPointerStart = null;
  let menuPointerMoved = false;
  let lastMenuScrollAt = 0;

  const markMenuScrolled = () => {
    lastMenuScrollAt = Date.now();
  };

  const shouldTreatAsScrollGesture = () => {
    return menuPointerMoved || Date.now() - lastMenuScrollAt < 260;
  };

  let adminMenuScrollStart = window.scrollY || document.documentElement.scrollTop || 0;
  const isDesktopAdminMenu = () => window.matchMedia("(min-width: 901px)").matches;

  button?.addEventListener("click", (event) => {
    event.preventDefault();
    const nextOpen = !document.body.classList.contains("admin-menu-open");
    if (nextOpen) adminMenuScrollStart = window.scrollY || document.documentElement.scrollTop || 0;
    setAdminMenu(nextOpen);
  });

  // Do not close the menu from the overlay. In desktop-browser mode on phones,
  // scroll/touch gestures can fire an overlay click and close the menu by mistake.
  overlay?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  overlay?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  overlay?.addEventListener("touchmove", markMenuScrolled, { passive: true });

  sidebar?.addEventListener("pointerdown", (event) => {
    menuPointerMoved = false;
    menuPointerStart = { x: event.clientX, y: event.clientY };
  }, { passive: true });

  sidebar?.addEventListener("pointermove", (event) => {
    if (!menuPointerStart) return;
    const dx = Math.abs(event.clientX - menuPointerStart.x);
    const dy = Math.abs(event.clientY - menuPointerStart.y);
    if (dx > 8 || dy > 8) menuPointerMoved = true;
  }, { passive: true });

  sidebar?.addEventListener("scroll", markMenuScrolled, { passive: true });
  sidebar?.addEventListener("touchmove", markMenuScrolled, { passive: true });

  sidebar?.addEventListener("click", (event) => {
    const targetLink = event.target.closest(".sidebar-link, #logoutButton");
    if (!targetLink) return;
    if (shouldTreatAsScrollGesture()) {
      event.preventDefault();
      event.stopPropagation();
      menuPointerMoved = false;
      return;
    }
    setAdminMenu(false);
  }, true);

  // Desktop admin menus should close as soon as the page scrolls.
  // Mobile admin keeps the menu open so users can scroll inside long navigation safely.
  window.addEventListener("scroll", () => {
    if (!document.body.classList.contains("admin-menu-open")) return;
    const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
    if (isDesktopAdminMenu() && Math.abs(currentScroll - adminMenuScrollStart) > 4) {
      setAdminMenu(false);
      return;
    }
    markMenuScrolled();
    updateAdminMenuPosition();
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (!document.body.classList.contains("admin-menu-open")) return;
    if (isDesktopAdminMenu()) {
      setAdminMenu(false);
      return;
    }
    adminMenuScrollStart = window.scrollY || document.documentElement.scrollTop || 0;
    updateAdminMenuPosition();
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setAdminMenu(false);
  });
}

const state = {
  token: localStorage.getItem(tokenKey) || "",
  doctors: [],
  bloodProfiles: [],
  ambulances: [],
  hospitals: [],
  bloodTab: "approved",
  bloodDetailId: "",
  settings: {},
  pendingDeleteIds: new Set(),
  serviceDraft: [],
  originalServiceDraft: [],
  serviceDirty: false,
  activePage: "dashboard",
  products: [],
  storeAvatars: [],
  storeUsers: [],
  storeOrders: [],
  storeComments: [],
  storePaymentSettings: {
    bkashNumber: "",
    nagadNumber: "",
    rocketNumber: "",
    bankTransferInfo: "",
    instructions: "Send payment through bKash and Nagad first, then enter your sender number and Transaction ID. For Cash on Delivery, customers must pay the delivery fee first by bKash or Nagad; the product price is paid on delivery."
  },
  storeError: "",
  permissions: [],
  isMaster: false,
  role: panelMode,
  adminModules: [],
  subAdmins: [],
  aboutProfiles: [],
  aboutPosts: [],
  activeContentPage: "main"
};

const contentPageFields = [
  ["navServicesLabel", "Services nav label"],
  ["navStoreLabel", "Store nav label"],
  ["navDoctorsLabel", "Doctors nav label"],
  ["navAmbulanceLabel", "Ambulance nav label"],
  ["navHospitalLabel", "Hospital nav label"],
  ["navBloodLabel", "Blood nav label"],
  ["navHowItWorksLabel", "About nav label"],
  ["navContactLabel", "Contact nav label"],
  ["servicesPageTitle", "Services page title"],
  ["servicesPageCopy", "Services page description"],
  ["storePageTitle", "Store page title"],
  ["storePageCopy", "Store page description"],
  ["doctorsPageTitle", "Doctors page title"],
  ["doctorsPageCopy", "Doctors page description"],
  ["ambulancePageTitle", "Ambulance page title"],
  ["ambulancePageCopy", "Ambulance page description"],
  ["hospitalPageTitle", "Hospital page title"],
  ["hospitalPageCopy", "Hospital page description"],
  ["bloodPageTitle", "Blood page title"],
  ["bloodPageCopy", "Blood page description"],
  ["howPageTitle", "About page title"],
  ["howPageCopy", "About page description"],
  ["contactPageTitle", "Contact page title"],
  ["contactPageCopy", "Contact page description"],
  ["loginPageTitle", "Login page title"],
  ["loginPageCopy", "Login page description"],
  ["signupPageTitle", "Signup page title"],
  ["signupPageCopy", "Signup page description"],
  ["profilePageTitle", "Profile page title"],
  ["profilePageCopy", "Profile page description"]
];

const contentPageDefaults = Object.fromEntries(contentPageFields.map(([key]) => [key, ""]));

const editableContentPages = [
  { key: "main", label: "Main Page", icon: "⌂", path: "/", title: "heroTitleLine", copy: "description", badge: "heroHighlight", primaryLabelField: "primaryButtonText", secondaryLabelField: "ambulanceButtonText" },
  { key: "services", label: "Services", icon: "🩺", path: "/Services", nav: "navServicesLabel", title: "servicesPageTitle", copy: "servicesPageCopy" },
  { key: "store", label: "Store", icon: "🛒", path: "/Store", nav: "navStoreLabel", title: "storePageTitle", copy: "storePageCopy" },
  { key: "doctors", label: "Doctors", icon: "👨‍⚕️", path: "/Doctors", nav: "navDoctorsLabel", title: "doctorsPageTitle", copy: "doctorsPageCopy" },
  { key: "ambulance", label: "Ambulance", icon: "🚑", path: "/Ambulance", nav: "navAmbulanceLabel", title: "ambulancePageTitle", copy: "ambulancePageCopy" },
  { key: "hospital", label: "Hospital", icon: "🏥", path: "/Hospital", nav: "navHospitalLabel", title: "hospitalPageTitle", copy: "hospitalPageCopy" },
  { key: "blood", label: "Blood", icon: "🩸", path: "/Blood", nav: "navBloodLabel", title: "bloodPageTitle", copy: "bloodPageCopy" },
  { key: "contact", label: "Contact", icon: "☎️", path: "/Contact", nav: "navContactLabel", title: "contactPageTitle", copy: "contactPageCopy" },
  { key: "about", label: "About", icon: "★", path: "/About", nav: "navHowItWorksLabel", title: "howPageTitle", copy: "howPageCopy" }
];

const editableContentPageMap = Object.fromEntries(editableContentPages.map((page) => [page.key, page]));

const doctorDesignations = ["Professor", "Associate Professor", "Assistant Professor", "Consultant"];
const chamberWeekdayOptions = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday - Thursday",
  "Everyday"
];
const chamberWeekdaySet = new Set(chamberWeekdayOptions);
const chamberRangeOptions = new Set(["Saturday - Thursday", "Everyday"]);

function normalizeWeekdaySelection(value = "") {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter((item) => chamberWeekdaySet.has(item));
  }

  const text = String(value || "").trim();
  if (!text) return [];

  const lower = text.toLowerCase().replace(/\s+/g, " ");
  if (lower === "everyday" || lower === "daily") return ["Everyday"];
  if (["saturday - thursday", "saturday-thursday", "saturday to thursday"].includes(lower)) {
    return ["Saturday - Thursday"];
  }

  const picked = text
    .split(/[,/|]+/)
    .map((item) => item.trim())
    .map((item) => chamberWeekdayOptions.find((option) => option.toLowerCase() === item.toLowerCase()) || "")
    .filter(Boolean);

  if (picked.includes("Everyday")) return ["Everyday"];
  if (picked.includes("Saturday - Thursday")) return ["Saturday - Thursday"];
  return chamberWeekdayOptions.filter((option) => !chamberRangeOptions.has(option) && picked.includes(option));
}

function weekdayCheckboxMarkup(selected = "") {
  const selectedSet = new Set(normalizeWeekdaySelection(selected));
  return `
    <div class="weekday-check-grid" data-chamber-weekdays>
      ${chamberWeekdayOptions.map((weekday) => `
        <label class="weekday-check ${selectedSet.has(weekday) ? "is-selected" : ""}">
          <input type="checkbox" value="${escapeHtml(weekday)}" ${selectedSet.has(weekday) ? "checked" : ""} />
          <span>${escapeHtml(weekday)}</span>
        </label>
      `).join("")}
    </div>
  `;
}
const chamberTimeOptions = (() => {
  const items = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const hour12 = hour % 12 || 12;
      const suffix = hour < 12 ? "AM" : "PM";
      items.push(`${hour12}:${String(minute).padStart(2, "0")} ${suffix}`);
    }
  }
  return items;
})();
const fields = [
  "name",
  "designation",
  "designationNote",
  "specialty",
  "degrees",
  "hospital",
  "phone",
  "whatsapp",
  "sortOrder",
  "photoUrl",
  "bio",
  "isActive"
];

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitList(value = "") {
  return String(value)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStats(value = "") {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [valuePart, ...labelParts] = line.split("|");
      return {
        value: String(valuePart || "").trim(),
        label: String(labelParts.join("|") || "").trim()
      };
    })
    .filter((stat) => stat.value && stat.label)
    .slice(0, 4);
}

function formatStats(stats = []) {
  return (Array.isArray(stats) ? stats : [])
    .map((stat) => `${stat.value || ""} | ${stat.label || ""}`.trim())
    .filter((line) => line !== "|")
    .join("\n");
}

function formatList(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n");
}

function formatSocialLinks(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const label = String(item?.label || "").trim();
      const url = String(item?.url || "").trim();
      return label && url ? `${label} | ${url}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function parseSocialLinks(value = "") {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes("|")) {
        const [labelPart, ...urlParts] = line.split("|");
        return { label: labelPart.trim().slice(0, 60), url: urlParts.join("|").trim().slice(0, 600) };
      }
      const parts = line.split(/\s+/);
      const url = parts.pop() || "";
      const label = parts.join(" ").trim() || url.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
      return { label: label.slice(0, 60), url: url.trim().slice(0, 600) };
    })
    .filter((item) => item.label && item.url)
    .slice(0, 12);
}

function cleanEmoji(value = "") {
  return String(value || "")
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, 12);
}

function cleanServiceMedia(value = "") {
  const media = String(value || "").trim();
  if (!media) return "";
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(media)) return media.slice(0, 800000);
  if (/^https?:\/\//i.test(media) || media.startsWith("/")) return media.replace(/[<>]/g, "").slice(0, 1200);
  return "";
}

function isImageMedia(value = "") {
  const media = String(value || "").trim();
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(media) || /^https?:\/\//i.test(media) || media.startsWith("/");
}

function serviceVisualMarkup(value = "", alt = "Service", className = "service-admin-photo") {
  const media = String(value || "").trim();
  if (isImageMedia(media)) {
    return `<span class="${className} has-photo"><img src="${escapeHtml(media)}" alt="${escapeHtml(alt)}" loading="lazy" /></span>`;
  }
  return `<span class="${className} service-admin-photo-empty" aria-hidden="true">✚</span>`;
}

function formatServiceIcons(serviceIcons = {}, serviceTags = []) {
  const icons = serviceIcons && typeof serviceIcons === "object" ? serviceIcons : {};
  const lines = [];
  const used = new Set();

  (Array.isArray(serviceTags) ? serviceTags : []).forEach((service) => {
    const name = String(service || "").trim();
    if (!name) return;
    const icon = icons[name] || icons[name.toLowerCase()] || "";
    if (icon) {
      lines.push(`${icon} | ${name}`);
      used.add(name);
      used.add(name.toLowerCase());
    }
  });

  Object.entries(icons).forEach(([service, icon]) => {
    const name = String(service || "").trim();
    if (!name || used.has(name) || used.has(name.toLowerCase())) return;
    lines.push(`${icon} | ${name}`);
  });

  return lines.join("\n");
}

function parseServiceIcons(value = "") {
  const result = {};
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      let icon = "";
      let service = "";
      if (line.includes("|")) {
        const [first, ...rest] = line.split("|");
        const left = first.trim();
        const right = rest.join("|").trim();
        const leftLooksEmoji = /[^A-Za-z0-9\s.,/&()_-]/u.test(left);
        if (leftLooksEmoji) {
          icon = left;
          service = right;
        } else {
          service = left;
          icon = right;
        }
      } else {
        const parts = line.split(/\s+/);
        icon = parts.shift() || "";
        service = parts.join(" ").trim();
      }
      icon = cleanEmoji(icon);
      service = String(service || "").trim().slice(0, 90);
      if (icon && service) result[service] = icon;
    });
  return result;
}



function formatServiceDescriptions(serviceDescriptions = {}, serviceTags = []) {
  const descriptions = serviceDescriptions && typeof serviceDescriptions === "object" ? serviceDescriptions : {};
  const lines = [];
  const used = new Set();

  (Array.isArray(serviceTags) ? serviceTags : []).forEach((service) => {
    const name = String(service || "").trim();
    if (!name) return;
    const description = descriptions[name] || descriptions[name.toLowerCase()] || "";
    if (description) {
      lines.push(`${name} | ${description}`);
      used.add(name);
      used.add(name.toLowerCase());
    }
  });

  Object.entries(descriptions).forEach(([service, description]) => {
    const name = String(service || "").trim();
    if (!name || used.has(name) || used.has(name.toLowerCase())) return;
    lines.push(`${name} | ${description}`);
  });

  return lines.join("\n");
}

function parseServiceDescriptions(value = "") {
  const result = {};
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (!line.includes("|")) return;
      const [servicePart, ...descriptionParts] = line.split("|");
      const service = String(servicePart || "").trim().slice(0, 90);
      const description = String(descriptionParts.join("|") || "").trim().slice(0, 700);
      if (service && description) result[service] = description;
    });
  return result;
}

function normalizeServiceKey(name = "") {
  return String(name || "").trim().toLowerCase();
}

function serviceEntriesFromSettings(settings = {}) {
  const serviceTags = Array.isArray(settings.serviceTags) ? settings.serviceTags : [];
  const icons = settings.serviceIcons && typeof settings.serviceIcons === "object" ? settings.serviceIcons : {};
  const descriptions = settings.serviceDescriptions && typeof settings.serviceDescriptions === "object" ? settings.serviceDescriptions : {};
  const photosByService = settings.servicePhotos && typeof settings.servicePhotos === "object" ? settings.servicePhotos : {};
  const seen = new Set();
  const entries = [];

  serviceTags.forEach((service) => {
    const name = String(service || "").trim().slice(0, 90);
    const key = normalizeServiceKey(name);
    if (!name || seen.has(key)) return;
    seen.add(key);
    entries.push({
      name,
      emoji: String(icons[name] || icons[key] || "").trim(),
      photos: Array.isArray(photosByService[name]) ? photosByService[name] : (Array.isArray(photosByService[key]) ? photosByService[key] : []),
      description: String(descriptions[name] || descriptions[key] || "").trim().slice(0, 700)
    });
  });

  Object.entries(icons).forEach(([service, emoji]) => {
    const name = String(service || "").trim().slice(0, 90);
    const key = normalizeServiceKey(name);
    if (!name || seen.has(key)) return;
    seen.add(key);
    entries.push({
      name,
      emoji: String(emoji || "").trim(),
      photos: Array.isArray(photosByService[name]) ? photosByService[name] : (Array.isArray(photosByService[key]) ? photosByService[key] : []),
      description: String(descriptions[name] || descriptions[key] || "").trim().slice(0, 700)
    });
  });

  Object.entries(descriptions).forEach(([service, description]) => {
    const name = String(service || "").trim().slice(0, 90);
    const key = normalizeServiceKey(name);
    if (!name || seen.has(key)) return;
    seen.add(key);
    entries.push({
      name,
      emoji: "",
      photos: Array.isArray(photosByService[name]) ? photosByService[name] : (Array.isArray(photosByService[key]) ? photosByService[key] : []),
      description: String(description || "").trim().slice(0, 700)
    });
  });

  return entries;
}

function serviceSettingsFromDraft() {
  const entries = Array.isArray(state.serviceDraft) ? state.serviceDraft : [];
  const serviceTags = [];
  const serviceIcons = {};
  const serviceDescriptions = {};
  const servicePhotos = {};
  const seen = new Set();

  entries.forEach((entry) => {
    const name = String(entry?.name || "").trim().slice(0, 90);
    const key = normalizeServiceKey(name);
    if (!name || seen.has(key)) return;
    seen.add(key);
    serviceTags.push(name);
    const media = cleanServiceMedia(entry?.emoji || "");
    if (media) serviceIcons[name] = media;
    const description = String(entry?.description || "").trim().slice(0, 700);
    if (description) serviceDescriptions[name] = description;
    const photos = parsePhotoLines(Array.isArray(entry?.photos) ? entry.photos.join("\n") : (entry?.photos || "")).slice(0, 8);
    if (photos.length) servicePhotos[name] = photos;
  });

  return { serviceTags, serviceIcons, serviceDescriptions, servicePhotos };
}

function cloneServiceEntries(entries = []) {
  return JSON.parse(JSON.stringify(Array.isArray(entries) ? entries : []));
}

function markServiceDirty(message) {
  state.serviceDirty = true;
  updateServiceChangesUI();
  if (message) toast(message);
}

function updateServiceChangesUI() {
  const saveButton = qs("#saveServiceChangesButton");
  const discardButton = qs("#discardServiceChangesButton");
  const status = qs("#serviceChangesStatus");
  if (saveButton) saveButton.disabled = !state.serviceDirty;
  if (discardButton) discardButton.disabled = !state.serviceDirty;
  if (status) status.textContent = state.serviceDirty
    ? "Unsaved service changes. Click Save Changes to publish."
    : "No unsaved service changes.";
}

function resetServiceForm() {
  const form = qs("#serviceForm");
  if (form) form.reset();
  const original = qs("#serviceOriginalName");
  if (original) original.value = "";
  const title = qs("#serviceFormTitle");
  if (title) title.textContent = "Add service";
  const servicePhotoUpload = qs("#servicePhotoUpload");
  if (servicePhotoUpload) servicePhotoUpload.value = "";
  const servicePhotoUrl = qs("#servicePhotoUrl");
  if (servicePhotoUrl) servicePhotoUrl.value = "";
  if (qs("#servicePhotos")) qs("#servicePhotos").value = "";
  setServicePhotoPreview("");
  setServicePhotosPreview([]);
}

function fillServiceForm(entry) {
  qs("#serviceFormTitle").textContent = `Edit ${entry.name}`;
  qs("#serviceOriginalName").value = entry.name || "";
  qs("#serviceName").value = entry.name || "";
  const media = cleanServiceMedia(entry.emoji || "");
  const servicePhotoUrl = qs("#servicePhotoUrl");
  if (servicePhotoUrl) servicePhotoUrl.value = media;
  const servicePhotoUpload = qs("#servicePhotoUpload");
  if (servicePhotoUpload) servicePhotoUpload.value = "";
  setServicePhotoPreview(media);
  setCurrentServicePhotos(entry.photos || []);
  qs("#serviceDescription").value = entry.description || "";
  qs("#serviceForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderServiceList() {
  const list = qs("#adminServiceList");
  if (!list) return;
  const entries = Array.isArray(state.serviceDraft) ? state.serviceDraft : [];

  if (!entries.length) {
    list.innerHTML = `<div class="empty-state">No services found. Add the first one from the form.</div>`;
    return;
  }

  list.innerHTML = entries
    .map((entry) => `
      <article class="admin-list-item admin-service-item">
        <div class="admin-service-summary">
          ${serviceVisualMarkup(entry.emoji || "", entry.name || "Service", "service-admin-photo")}
          <div>
            <strong>${escapeHtml(entry.name)}</strong>
            <p>${escapeHtml(entry.description || "No description added yet.")}</p>
            ${Array.isArray(entry.photos) && entry.photos.length ? `<p>${entry.photos.length} gallery photo${entry.photos.length === 1 ? "" : "s"}</p>` : ""}
          </div>
        </div>
        <div class="admin-list-actions">
          <button class="small-btn" data-service-action="edit" data-service-name="${escapeHtml(entry.name)}" type="button">Edit</button>
          <button class="small-btn danger-small" data-service-action="delete" data-service-name="${escapeHtml(entry.name)}" type="button">Delete</button>
        </div>
      </article>
    `)
    .join("");
}

async function persistServices(message = "Services saved.") {
  const serviceData = serviceSettingsFromDraft();
  if (!serviceData.serviceTags.length) {
    toast("Add at least one service.");
    return;
  }

  await api("/api/settings", {
    method: "PATCH",
    body: JSON.stringify({ ...getCurrentSettingsPayload(), ...serviceData })
  });
  state.originalServiceDraft = cloneServiceEntries(state.serviceDraft);
  state.serviceDirty = false;
  updateServiceChangesUI();
  toast(message);
  await loadAdminData();
}

async function saveService(event) {
  event.preventDefault();
  const originalName = qs("#serviceOriginalName").value.trim();
  const name = qs("#serviceName").value.trim().slice(0, 90);
  const emoji = cleanServiceMedia(qs("#servicePhotoUrl")?.value || "");
  const photos = getCurrentServicePhotos();
  const description = qs("#serviceDescription").value.trim().slice(0, 700);

  if (!name) {
    toast("Add a service name.");
    return;
  }
  if (!description) {
    toast("Add a service description.");
    return;
  }

  const originalKey = normalizeServiceKey(originalName);
  const newKey = normalizeServiceKey(name);
  const duplicate = state.serviceDraft.some((entry) => normalizeServiceKey(entry.name) === newKey && normalizeServiceKey(entry.name) !== originalKey);
  if (duplicate) {
    toast("A service with this name already exists.");
    return;
  }

  if (originalName) {
    state.serviceDraft = state.serviceDraft.map((entry) => normalizeServiceKey(entry.name) === originalKey ? { name, emoji, photos, description } : entry);
  } else {
    state.serviceDraft = [...state.serviceDraft, { name, emoji, photos, description }];
  }

  renderServiceList();
  resetServiceForm();
  markServiceDirty(originalName ? "Service updated. Click Save Changes to publish." : "Service added. Click Save Changes to publish.");
}

async function deleteService(name) {
  const service = state.serviceDraft.find((entry) => normalizeServiceKey(entry.name) === normalizeServiceKey(name));
  if (!service) return;
  if (state.serviceDraft.length <= 1) {
    toast("Keep at least one service on the website.");
    return;
  }
  const confirmed = window.confirm(`Mark ${service.name} for deletion? It will not be deleted from the website until you click Save Changes.`);
  if (!confirmed) return;
  state.serviceDraft = state.serviceDraft.filter((entry) => normalizeServiceKey(entry.name) !== normalizeServiceKey(name));
  renderServiceList();
  markServiceDirty("Service marked for deletion. Click Save Changes to confirm.");
}

async function commitServiceChanges() {
  await persistServices("Service changes saved.");
}

function discardServiceChanges() {
  state.serviceDraft = cloneServiceEntries(state.originalServiceDraft);
  state.serviceDirty = false;
  resetServiceForm();
  renderServiceList();
  updateServiceChangesUI();
  toast("Unsaved service changes discarded.");
}

function setPhotoPreview(value = "") {
  const preview = qs("#photoPreview");
  if (!preview) return;

  const photo = String(value || "").trim();
  if (!photo) {
    preview.classList.remove("has-photo");
    preview.innerHTML = "No photo selected";
    return;
  }

  preview.classList.add("has-photo");
  preview.innerHTML = `<img src="${escapeHtml(photo)}" alt="Doctor photo preview" loading="lazy" />`;
}

function setServicePhotoPreview(value = "") {
  const preview = qs("#servicePhotoPreview");
  if (!preview) return;

  const photo = cleanServiceMedia(value);
  if (!photo) {
    preview.classList.remove("has-photo");
    preview.innerHTML = "No service photo selected";
    return;
  }

  preview.classList.add("has-photo");
  preview.innerHTML = `<img src="${escapeHtml(photo)}" alt="Service photo preview" loading="lazy" />`;
}


function getCurrentServicePhotos() {
  return parsePhotoLines(qs("#servicePhotos")?.value || "").slice(0, 8);
}

function setCurrentServicePhotos(items = []) {
  const photos = (Array.isArray(items) ? items : []).map((item) => cleanServiceMedia(item)).filter(Boolean).slice(0, 8);
  if (qs("#servicePhotos")) qs("#servicePhotos").value = formatPhotoLines(photos);
  setServicePhotosPreview(photos);
}

function setServicePhotosPreview(items = []) {
  const preview = qs("#servicePhotosPreview");
  if (!preview) return;
  const photos = (Array.isArray(items) ? items : []).filter(Boolean);
  preview.innerHTML = photos.length
    ? photos.map((photo) => `<span class="mini-photo-thumb"><img src="${escapeHtml(photo)}" alt="Service gallery photo" loading="lazy" /></span>`).join("")
    : `<span class="form-help">No gallery photos selected</span>`;
}

function resizeImageFile(file, maxSize = 760, quality = 0.74, outputMime = "") {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please choose a JPG, PNG, or WEBP image."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load the selected image."));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const mime = outputMime || (file.type === "image/png" ? "image/png" : "image/jpeg");
        const dataUrl = canvas.toDataURL(mime, mime === "image/jpeg" || mime === "image/webp" ? quality : undefined);
        resolve(dataUrl);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}


function initPasswordVisibilityToggles(root = document) {
  qsa('input[type="password"]', root).forEach((input) => {
    if (input.dataset.passwordToggleReady === "true") return;
    input.dataset.passwordToggleReady = "true";
    input.dataset.passwordInput = "true";

    const wrapper = document.createElement("div");
    wrapper.className = "password-field";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(input);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "password-toggle-btn";
    button.setAttribute("aria-label", "Show password");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = "👁";
    button.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", String(show));
      button.innerHTML = show ? "🙈" : "👁";
      input.focus({ preventScroll: true });
    });
    wrapper.append(button);
  });
}

function toast(message) {
  const container = qs("#toast");
  if (!container) return;
  const item = document.createElement("div");
  item.className = "toast-message";
  item.textContent = message;
  container.append(item);
  setTimeout(() => item.remove(), 3600);
}

async function api(url, options = {}) {
  const headers = {
    accept: "application/json",
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(state.token ? { authorization: `Bearer ${state.token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

function permissionForPage(page = "dashboard") {
  const map = {
    dashboard: "dashboard",
    main: "content",
    content: "content",
    about: "content",
    doctors: "doctors",
    ambulance: "ambulance",
    hospitals: "hospitals",
    blood: "blood",
    bloodDetail: "blood",
    services: "services",
    products: "products",
    orders: "orders",
    "store-users": "store-users",
    comments: "comments",
    contact: "contact",
    "sub-admins": "master"
  };
  return map[page] || page;
}

function hasAccess(page = "dashboard") {
  const permission = permissionForPage(page);
  if (state.isMaster) return true;
  if (permission === "master") return false;
  if (permission === "content" && state.permissions.includes("main")) return true;
  return state.permissions.includes(permission);
}

function firstAllowedPage() {
  if (hasAccess("dashboard")) return "dashboard";
  return validAdminPages.find((page) => page !== "bloodDetail" && page !== "sub-admins" && hasAccess(page)) || "dashboard";
}

function setPermissionNodeVisible(node, visible) {
  const shouldShow = Boolean(visible);
  node.classList.toggle("hidden", !shouldShow);
  node.hidden = !shouldShow;
  node.style.display = shouldShow ? "" : "none";
  node.setAttribute("aria-hidden", shouldShow ? "false" : "true");
  if (!shouldShow) {
    node.classList.remove("is-active");
    node.setAttribute("tabindex", "-1");
  } else {
    node.removeAttribute("tabindex");
  }
}

function applyAdminPermissions() {
  document.body.dataset.adminMode = panelMode;
  qsa("[data-master-only]").forEach((node) => setPermissionNodeVisible(node, state.isMaster));
  qsa("[data-permission]").forEach((node) => {
    const permission = node.dataset.permission || "";
    const allowed = state.isMaster || !permission || state.permissions.includes(permission);
    setPermissionNodeVisible(node, allowed);
  });
  qsa(".sidebar-group").forEach((group) => {
    const visibleLinks = qsa(".sidebar-link", group).filter((link) => !link.hidden && link.style.display !== "none");
    group.classList.toggle("is-empty", visibleLinks.length === 0);
  });
  const subtitle = qs("[data-admin-panel-subtitle]");
  if (subtitle) subtitle.textContent = panelMode === "master" ? "Master Admin Panel" : "Sub-Admin Panel";
  const loginTitle = qs("[data-login-title]");
  if (loginTitle) loginTitle.textContent = panelMode === "master" ? "Master admin login" : "Sub-admin login";
  const loginCopy = qs("[data-login-copy]");
  if (loginCopy) loginCopy.textContent = panelMode === "master" ? "Use the master ADMIN_PASSWORD to create sub-admins and manage everything." : "Use your sub-admin username and password. You will only see allowed modules.";
  qs("#subAdminLoginFields")?.classList.toggle("hidden", panelMode !== "sub");
  qs("#masterAdminPasswordLabel") && (qs("#masterAdminPasswordLabel").textContent = panelMode === "master" ? "Master Admin Password" : "Sub-Admin Password");
}

function showAdmin(isLoggedIn) {
  qs("#loginView")?.classList.toggle("hidden", isLoggedIn);
  qs("#adminView")?.classList.toggle("hidden", !isLoggedIn);
}

function contentPageFromLocation() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === panelRoot.slice(1) && parts[1] === "content" && parts[2]) {
    const key = decodeURIComponent(parts[2]).toLowerCase();
    return editableContentPageMap[key] ? key : "";
  }
  return "";
}

function contentEditorUrl(pageKey = "") {
  const key = String(pageKey || "").toLowerCase();
  return key && editableContentPageMap[key] ? `${panelRoot}/content/${encodeURIComponent(key)}` : `${panelRoot}/content`;
}

function pageFromLocation() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === panelRoot.slice(1) && parts[1] === "blood" && parts[2]) {
    state.bloodDetailId = parseBloodDetailId(decodeURIComponent(parts[2]));
    return "bloodDetail";
  }
  if (parts[0] === panelRoot.slice(1) && parts[1]) {
    const page = parts[1].toLowerCase();
    if (page === "main") {
      state.activeContentPage = "main";
      return "content";
    }
    if (page === "content") {
      const contentKey = contentPageFromLocation();
      state.activeContentPage = contentKey || "main";
      return "content";
    }
    const normalizedPage = page === "reviews" ? "comments" : page;
    return validAdminPages.includes(normalizedPage) ? normalizedPage : "dashboard";
  }
  const hash = window.location.hash.replace("#", "").trim().toLowerCase();
  if (hash && validAdminPages.includes(hash)) return hash;

  // /superuser must always open the Dashboard. Deep links like
  // /superuser/orders still win above.
  if (parts[0] === panelRoot.slice(1)) return "dashboard";

  return "dashboard";
}

function setAdminPage(page, updateUrl = false) {
  let nextPage = validAdminPages.includes(page) ? page : "dashboard";
  if (!hasAccess(nextPage)) nextPage = firstAllowedPage();
  if (nextPage === "bloodDetail" && !state.bloodDetailId) {
    state.bloodDetailId = getBloodDetailIdFromLocation();
  }
  if (nextPage !== "bloodDetail") {
    state.bloodDetailId = "";
  }
  state.activePage = nextPage;
  saveAdminPage(nextPage);

  qsa(".admin-page").forEach((section) => {
    section.classList.toggle("is-active", section.dataset.adminPage === nextPage);
  });

  qsa("[data-admin-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.adminNav === nextPage);
  });

  const title = qs("#adminCurrentPageTitle");
  if (title) {
    const names = {
      dashboard: "Dashboard",
      content: "Content Pages",
      about: "About & Blog",
      doctors: "Doctors",
      blood: "Blood",
      bloodDetail: "Blood Detail",
      services: "Services",
      products: "Add Products",
      orders: "Order Details",
      "store-users": "User Login Information",
      comments: "User Reviews",
      contact: "Contact Settings",
      "sub-admins": "Sub-Admin Accounts"
    };
    title.textContent = names[nextPage] || "Dashboard";
  }

  updateAdminBackButton();

  if (nextPage === "bloodDetail") {
    renderAdminBloodDetail();
  }

  if (updateUrl) {
    let url = nextPage === "dashboard" ? panelRoot : `${panelRoot}/${nextPage === "comments" ? "reviews" : nextPage}`;
    if (nextPage === "content") {
      url = `${panelRoot}/content`;
    }
    if (nextPage === "bloodDetail") {
      const profile = state.bloodProfiles.find((item) => String(item.id) === String(state.bloodDetailId));
      url = profile ? adminBloodUrl(profile) : `${panelRoot}/blood/${encodeURIComponent(state.bloodDetailId || "profile")}`;
    }
    const statePayload = { page: nextPage, bloodDetailId: state.bloodDetailId };
    if (window.location.pathname.replace(/\/+$/, "") === url.replace(/\/+$/, "")) {
      history.replaceState(statePayload, "", url);
    } else {
      history.pushState(statePayload, "", url);
    }
  }
}

async function login(password, username = "") {
  const data = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password, username, mode: panelMode === "master" ? "master" : "sub" })
  });
  state.token = data.token;
  state.permissions = Array.isArray(data.permissions) ? data.permissions : [];
  state.isMaster = data.role === "master";
  state.role = data.role || panelMode;
  state.adminModules = data.modules || state.adminModules || [];
  localStorage.setItem(tokenKey, state.token);
  applyAdminPermissions();
  showAdmin(true);
  setAdminPage(pageFromLocation());
  await loadAdminData();
  toast("Logged in successfully.");
}

function logout() {
  state.token = "";
  state.pendingDeleteIds.clear();
  localStorage.removeItem(tokenKey);
  state.permissions = [];
  state.isMaster = false;
  applyAdminPermissions();
  showAdmin(false);
}

async function loadAdminData() {
  const page = state.activePage || "dashboard";
  state.pendingDeleteIds.clear();
  if (!hasAccess(page)) {
    showAdminPageError(page, "You do not have permission to access this section.");
    return;
  }

  try {
    if (["content", "services", "contact"].includes(page)) {
      const settingsData = await api("/api/settings");
      state.settings = settingsData.settings || {};
      fillMainPageForm();
      fillContentPageForm();
      fillServicesForm();
      fillSettingsForm();
      fillAmbulanceForm();
      updatePendingDeleteUI();
      return;
    }


    if (page === "ambulance") {
      const [settingsData, ambulancesData] = await Promise.all([
        api("/api/settings"),
        api("/api/ambulances?includeInactive=true")
      ]);
      state.settings = settingsData.settings || {};
      state.ambulances = ambulancesData.ambulances || [];
      fillAmbulanceForm();
      renderAmbulanceAdminList();
      return;
    }

    if (page === "hospitals") {
      const [hospitalsData, doctorsData] = await Promise.all([
        api("/api/hospitals?includeInactive=true"),
        api("/api/doctors?includeInactive=true").catch(() => api("/api/doctors").catch(() => ({ doctors: [] })))
      ]);
      state.hospitals = hospitalsData.hospitals || [];
      state.doctors = doctorsData.doctors || [];
      renderHospitalDoctorPicker();
      renderHospitalAdminList();
      return;
    }

    if (page === "about") {
      const aboutData = await api("/api/about?includeDrafts=true");
      state.aboutProfiles = aboutData.profiles || [];
      state.aboutPosts = aboutData.posts || [];
      renderAboutAdmin();
      return;
    }

    if (page === "sub-admins") {
      const subAdminData = await api("/api/admin/subadmins");
      state.subAdmins = subAdminData.admins || [];
      state.adminModules = subAdminData.modules || [];
      renderSubAdminList();
      return;
    }

    if (page === "doctors") {
      const doctorsData = await api("/api/doctors?includeInactive=true");
      state.doctors = doctorsData.doctors || [];
      renderDoctorList();
      updatePendingDeleteUI();
      updateDashboardMetrics();
      return;
    }

    if (page === "blood" || page === "bloodDetail") {
      const bloodData = await api("/api/blood?status=all");
      state.bloodProfiles = bloodData.profiles || [];
      renderBloodList();
      renderAdminBloodDetail();
      updateDashboardMetrics();
      return;
    }

    if (page === "products") {
      const productsData = await api("/api/store/products?includeInactive=true");
      state.products = productsData.products || [];
      state.storeError = "";
      renderProductList();
      updateDashboardMetrics();
      return;
    }

    if (page === "orders") {
      const [ordersData, paymentSettingsData] = await Promise.all([
        api("/api/store/admin/orders"),
        api("/api/store/payment-settings")
      ]);
      state.storeOrders = ordersData.orders || [];
      state.storePaymentSettings = { ...state.storePaymentSettings, ...(paymentSettingsData.paymentSettings || {}) };
      state.storeError = "";
      renderOrderList();
      fillPaymentSettingsForm();
      updateDashboardMetrics();
      return;
    }

    if (page === "store-users") {
      const [usersData, avatarsData] = await Promise.all([
        api("/api/store/admin/users"),
        api("/api/store/admin/avatars")
      ]);
      state.storeUsers = usersData.users || [];
      state.storeAvatars = avatarsData.avatars || [];
      state.storeError = "";
      renderAvatarList();
      renderStoreUserList();
      return;
    }

    if (page === "comments") {
      const commentsData = await api("/api/store/admin/comments");
      state.storeComments = commentsData.comments || [];
      state.storeError = "";
      renderCommentList();
      return;
    }

    // Dashboard: load only the metric data the current admin is allowed to access.
    const [doctorsData, bloodData, productsData, ordersData, hospitalsData, ambulancesData] = await Promise.all([
      hasAccess("doctors") ? api("/api/doctors?includeInactive=true").catch(() => ({ doctors: [] })) : Promise.resolve({ doctors: [] }),
      hasAccess("blood") ? api("/api/blood?status=all").catch(() => ({ profiles: [] })) : Promise.resolve({ profiles: [] }),
      hasAccess("products") ? api("/api/store/products?includeInactive=true").catch(() => ({ products: [] })) : Promise.resolve({ products: [] }),
      hasAccess("orders") ? api("/api/store/admin/orders").catch(() => ({ orders: [] })) : Promise.resolve({ orders: [] }),
      hasAccess("hospitals") ? api("/api/hospitals?includeInactive=true").catch(() => ({ hospitals: [] })) : Promise.resolve({ hospitals: [] }),
      hasAccess("ambulance") ? api("/api/ambulances?includeInactive=true").catch(() => ({ ambulances: [] })) : Promise.resolve({ ambulances: [] })
    ]);
    state.doctors = doctorsData.doctors || [];
    state.bloodProfiles = bloodData.profiles || [];
    state.products = productsData.products || [];
    state.storeOrders = ordersData.orders || [];
    state.hospitals = hospitalsData.hospitals || [];
    state.ambulances = ambulancesData.ambulances || [];
    state.storeError = "";
    updateDashboardMetrics();
  } catch (error) {
    console.warn(error);
    state.storeError = error.message || "Could not load this admin page.";
    showAdminPageError(page, state.storeError);
  }
}

function showAdminPageError(page, message) {
  const selectors = {
    doctors: ["#adminDoctorList"],
    ambulance: ["#adminAmbulanceList"],
    hospitals: ["#adminHospitalList"],
    blood: ["#adminBloodList"],
    bloodDetail: ["#adminBloodDetail"],
    products: ["#adminProductList"],
    orders: ["#adminOrderList"],
    "store-users": ["#adminStoreUserList", "#adminAvatarList"],
    comments: ["#adminCommentList"],
    about: ["#aboutProfileList", "#aboutPostList"],
    "sub-admins": ["#subAdminList"]
  };
  (selectors[page] || []).forEach((selector) => {
    const node = qs(selector);
    if (node) node.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  });
}

function updateDashboardMetrics() {
  const totalDoctors = qs("#adminTotalDoctors");
  if (totalDoctors) totalDoctors.textContent = String(state.doctors.length || "—");
  const pendingBlood = qs("#adminPendingBlood");
  if (pendingBlood) pendingBlood.textContent = String(state.bloodProfiles.filter((item) => item.isApproved === false).length || 0);
  const pendingBloodCount = qs("#pendingBloodCount");
  if (pendingBloodCount) pendingBloodCount.textContent = String(state.bloodProfiles.filter((item) => item.isApproved === false).length || 0);
  const totalProducts = qs("#adminTotalProducts");
  if (totalProducts) totalProducts.textContent = String(state.products.length || "—");
  const pendingOrders = qs("#adminPendingOrders");
  if (pendingOrders) pendingOrders.textContent = String(state.storeOrders.filter((item) => isActiveOrderStatus(item.status)).length || 0);
}

function formatAdminGender(profile = {}) {
  if (profile.gender === "other") return profile.customGender || "Other";
  return profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "";
}

function slugify(value = "") {
  const slug = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "blood-profile";
}

function adminBloodUrl(profile = {}) {
  const id = String(profile.id || "").trim();
  const nameSlug = slugify(profile.fullName || profile.bloodGroup || "blood-profile");
  return `${panelRoot}/blood/${encodeURIComponent(id ? `${id}-${nameSlug}` : nameSlug)}`;
}

function parseBloodDetailId(value = "") {
  const match = String(value || "").match(/^\d+/);
  return match ? match[0] : "";
}

function getBloodDetailIdFromLocation() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === panelRoot.slice(1) && parts[1] === "blood" && parts[2]) {
    return parseBloodDetailId(decodeURIComponent(parts[2]));
  }
  return "";
}

function formatAdminDate(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function renderBloodList() {
  const list = qs("#adminBloodList");
  if (!list) return;

  const activeTab = state.bloodTab === "pending" ? "pending" : "approved";
  qsa("[data-blood-tab]").forEach((button) => {
    const isActive = button.dataset.bloodTab === activeTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  const profiles = state.bloodProfiles
    .filter((profile) => activeTab === "pending" ? profile.isApproved === false : profile.isApproved !== false)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  if (!profiles.length) {
    list.innerHTML = `<div class="empty-state">${activeTab === "pending" ? "No profiles waiting for approval." : "No approved blood profiles found."}</div>`;
    return;
  }

  list.innerHTML = profiles
    .map((profile) => {
      const id = String(profile.id || "");
      const detailUrl = adminBloodUrl(profile);
      const cardAttrs = activeTab === "approved" && id
        ? ` data-blood-detail-card-id="${escapeHtml(id)}" role="link" tabindex="0" aria-label="Open ${escapeHtml(profile.fullName || "blood profile")}"`
        : "";
      return `
        <article class="admin-list-item admin-blood-item${activeTab === "approved" ? " is-clickable" : ""}"${cardAttrs}>
          <div class="admin-doctor-summary">
            ${activeTab === "approved" ? `
              <a class="admin-blood-name" href="${detailUrl}" data-blood-detail-id="${escapeHtml(id)}">
                ${escapeHtml(profile.fullName || "Blood Person")} <span class="blood-admin-group">${escapeHtml(profile.bloodGroup || "")}</span>
              </a>
            ` : `
              <strong>${escapeHtml(profile.fullName || "Blood Person")} <span class="blood-admin-group">${escapeHtml(profile.bloodGroup || "")}</span></strong>
            `}
            <p>${escapeHtml(formatAdminGender(profile))} • ${escapeHtml(profile.phone || "No phone")} • ${escapeHtml(profile.whatsapp || "No WhatsApp")}</p>
            <p>${escapeHtml(profile.homeAddress || "No address")}</p>
            ${profile.isApproved === false ? `<span class="pending-badge">Waiting for approval</span>` : `<span class="approved-badge">Listed publicly</span>`}
          </div>
          <div class="admin-list-actions">
            ${profile.isApproved === false ? `<button class="small-btn" data-blood-action="approve" data-id="${escapeHtml(id)}" type="button">Approve</button>` : ""}
            <button class="small-btn danger-small" data-blood-action="delete" data-id="${escapeHtml(id)}" type="button">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAdminBloodDetail() {
  const container = qs("#adminBloodDetail");
  if (!container) return;

  const id = String(state.bloodDetailId || getBloodDetailIdFromLocation() || "");
  if (!id) {
    container.innerHTML = `<div class="empty-state">Select a listed blood profile first.</div>`;
    return;
  }

  const profile = state.bloodProfiles.find((item) => String(item.id) === id);
  if (!profile) {
    container.innerHTML = state.bloodProfiles.length
      ? `<div class="empty-state"><h2>Blood profile not found</h2><p>This profile may have been deleted.</p><button class="btn btn-primary" type="button" id="bloodDetailNotFoundBack">Back to Blood List</button></div>`
      : `<div class="loading-state">Loading blood profile...</div>`;
    qs("#bloodDetailNotFoundBack")?.addEventListener("click", () => setAdminPage("blood", true));
    return;
  }

  const idAttr = escapeHtml(String(profile.id || ""));
  const gender = formatAdminGender(profile) || "Not set";
  const createdAt = formatAdminDate(profile.createdAt);
  const updatedAt = formatAdminDate(profile.updatedAt);

  container.innerHTML = `
    <article class="blood-detail-card admin-blood-detail-card">
      <div class="blood-detail-head">
        <span class="blood-detail-icon" aria-hidden="true">🩸</span>
        <div>
          <p class="section-kicker">${profile.isApproved === false ? "Pending blood profile" : "Listed blood profile"}</p>
          <h2>${escapeHtml(profile.fullName || "Blood Person")}</h2>
          <p class="blood-group-large">${escapeHtml(profile.bloodGroup || "Blood group")}</p>
        </div>
      </div>
      <div class="doctor-detail-grid blood-info-grid">
        <div class="detail-row"><small>Full Name</small><strong>${escapeHtml(profile.fullName || "")}</strong></div>
        <div class="detail-row"><small>Blood Group</small><strong>${escapeHtml(profile.bloodGroup || "")}</strong></div>
        <div class="detail-row"><small>Gender</small><strong>${escapeHtml(gender)}</strong></div>
        <div class="detail-row"><small>Status</small><strong>${profile.isApproved === false ? "Pending Approval" : "Listed Publicly"}</strong></div>
        <div class="detail-row"><small>Phone</small><strong>${escapeHtml(profile.phone || "No phone")}</strong></div>
        <div class="detail-row"><small>WhatsApp</small><strong>${escapeHtml(profile.whatsapp || "No WhatsApp")}</strong></div>
        <div class="detail-row full"><small>Home Address</small><strong>${escapeHtml(profile.homeAddress || "No address")}</strong></div>
        ${createdAt ? `<div class="detail-row"><small>Submitted</small><strong>${escapeHtml(createdAt)}</strong></div>` : ""}
        ${updatedAt ? `<div class="detail-row"><small>Last Updated</small><strong>${escapeHtml(updatedAt)}</strong></div>` : ""}
      </div>
      <div class="card-actions detail-actions">
        ${profile.isApproved === false ? `<button class="btn btn-primary" data-blood-action="approve" data-id="${idAttr}" type="button">Approve Profile</button>` : ""}
        <button class="small-btn danger-small" data-blood-action="delete" data-id="${idAttr}" type="button">Delete</button>
      </div>
    </article>
  `;
}

function openBloodAdminDetail(id) {
  state.bloodDetailId = String(id || "");
  setAdminPage("bloodDetail", true);
}

async function handleBloodAdminAction(button) {
  const id = button.dataset.id || "";
  if (!id) return;
  if (button.dataset.bloodAction === "approve") await approveBloodProfile(id);
  if (button.dataset.bloodAction === "delete") await deleteBloodProfileAdmin(id);
}

async function approveBloodProfile(id) {
  const result = await api(`/api/blood/${encodeURIComponent(id)}`, {
    method: "PATCH",
    cache: "no-store",
    body: JSON.stringify({ isApproved: true })
  });

  const approvedProfile = result.profile || {};
  state.bloodProfiles = state.bloodProfiles.map((profile) => {
    if (String(profile.id) !== String(id)) return profile;
    return { ...profile, ...approvedProfile, isApproved: true };
  });

  renderBloodList();
  renderAdminBloodDetail();
  updateDashboardMetrics();
  toast("Blood profile approved and listed publicly.");
}

async function deleteBloodProfileAdmin(id) {
  const profile = state.bloodProfiles.find((item) => String(item.id) === String(id));
  const confirmed = window.confirm(`Delete ${profile?.fullName || "this blood profile"} permanently?`);
  if (!confirmed) return;
  const deletingOpenDetail = state.activePage === "bloodDetail" && String(state.bloodDetailId) === String(id);
  await api(`/api/blood/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Blood profile deleted.");
  await loadAdminData();
  if (deletingOpenDetail) {
    setAdminPage("blood", true);
  }
}

function doctorPhotoMarkup(doctor = {}, className = "service-admin-photo") {
  const photo = String(doctor.photoUrl || "").trim();
  const name = String(doctor.name || "Doctor").trim();
  if (photo) return `<span class="${className} has-photo"><img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy" /></span>`;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "DR";
  return `<span class="${className} service-admin-photo-empty" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

function renderDoctorList() {
  const list = qs("#adminDoctorList");
  if (!list) return;

  if (!state.doctors.length) {
    list.innerHTML = `<div class="empty-state">No doctors found. Add the first one from the form.</div>`;
    return;
  }

  list.innerHTML = [...state.doctors]
    .sort((a, b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99))
    .map((doctor) => {
      const id = String(doctor.id || "");
      const isPendingDelete = state.pendingDeleteIds.has(id);
      const chamberSummary = summarizeChambers(doctor.chambers?.length ? doctor.chambers : normalizeChamberSource([], doctor));
      return `
        <article class="admin-list-item admin-service-item admin-doctor-item ${isPendingDelete ? "is-pending-delete" : ""}">
          <div class="admin-service-summary admin-doctor-summary">
            ${doctorPhotoMarkup(doctor)}
            <div>
              <strong>${escapeHtml(doctor.name)}</strong>
              <p>${escapeHtml(doctor.designation || "No designation")} • ${escapeHtml(doctor.specialty || "No specialty")} • ${escapeHtml(doctor.phone || "No phone")}</p>
              <p>${escapeHtml(chamberSummary || "No chamber location added")}</p>
              ${isPendingDelete ? `<span class="pending-badge">Pending delete — click Save Changes to confirm</span>` : ""}
            </div>
          </div>
          <div class="admin-list-actions">
            <button class="small-btn" data-action="edit" data-id="${escapeHtml(id)}" ${isPendingDelete ? "disabled" : ""}>Edit</button>
            <button class="small-btn ${isPendingDelete ? "" : "danger-small"}" data-action="${isPendingDelete ? "undo-delete" : "delete"}" data-id="${escapeHtml(id)}">${isPendingDelete ? "Undo" : "Delete"}</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function updatePendingDeleteUI() {
  const count = state.pendingDeleteIds.size;
  const saveButton = qs("#saveDoctorChangesButton");
  const discardButton = qs("#discardDoctorChangesButton");
  const status = qs("#doctorChangesStatus");

  if (saveButton) saveButton.disabled = count === 0;
  if (discardButton) discardButton.disabled = count === 0;
  if (status) status.textContent = count ? `${count} delete change${count > 1 ? "s" : ""} waiting to be saved.` : "No unsaved doctor changes.";
}

function markDoctorForDelete(id) {
  const doctor = state.doctors.find((item) => String(item.id) === String(id));
  const confirmed = window.confirm(`Mark ${doctor?.name || "this doctor"} for deletion? It will not be deleted until you click Save Changes.`);
  if (!confirmed) return;
  state.pendingDeleteIds.add(String(id));
  renderDoctorList();
  updatePendingDeleteUI();
  toast("Doctor marked for deletion. Click Save Changes to confirm.");
}

function undoDoctorDelete(id) {
  state.pendingDeleteIds.delete(String(id));
  renderDoctorList();
  updatePendingDeleteUI();
  toast("Delete cancelled.");
}

async function commitDoctorChanges() {
  const ids = [...state.pendingDeleteIds];
  if (!ids.length) return;

  const confirmed = window.confirm(`Save changes and permanently delete ${ids.length} doctor${ids.length > 1 ? "s" : ""}?`);
  if (!confirmed) return;

  for (const id of ids) {
    await api(`/api/doctors/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  toast("Doctor changes saved.");
  await loadAdminData();
}

function discardDoctorChanges() {
  state.pendingDeleteIds.clear();
  renderDoctorList();
  updatePendingDeleteUI();
  toast("Unsaved doctor changes discarded.");
}

function chamberSelectOptions(options = [], selected = "") {
  return `<option value="">Select</option>${options.map((option) => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}`;
}

function splitChamberTime(time = "") {
  const text = String(time || "").trim();
  const parts = text.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
  return { start: parts[0] || "", end: parts[1] || "" };
}

function normalizeChamberSource(chambers = [], doctor = {}) {
  if (Array.isArray(chambers) && chambers.length) {
    return chambers
      .map((item) => ({
        location: String(item?.location || "").trim(),
        weekday: normalizeWeekdaySelection(item?.weekdays || item?.weekday || "").join(", "),
        time: String(item?.time || item?.times || "").trim()
      }))
      .filter((item) => item.location || item.weekday || item.time);
  }
  const location = String(doctor.serviceArea || "").trim();
  const available = String(doctor.available || "").trim();
  if (!location && !available) return [];
  return [{ location, weekday: "Everyday", time: available || "9:00 AM - 10:00 PM" }];
}

function addChamberRow(chamber = {}, { focus = false } = {}) {
  const list = qs("#chamberList");
  if (!list) return;
  const timeParts = splitChamberTime(chamber.time || chamber.times || "");
  const startTime = chamber.startTime || timeParts.start || "";
  const endTime = chamber.endTime || timeParts.end || "";
  const row = document.createElement("div");
  row.className = "chamber-row";
  row.innerHTML = `
    <div class="form-group chamber-location-field">
      <label>Location</label>
      <input class="form-input" data-chamber-location type="text" placeholder="Type chamber location" value="${escapeHtml(chamber.location || "")}" />
    </div>
    <div class="form-group chamber-weekday-field">
      <label>Weekdays</label>
      ${weekdayCheckboxMarkup(chamber.weekday || chamber.weekdays || "")}
      <small class="form-hint">Choose one or multiple weekdays for this chamber.</small>
    </div>
    <div class="form-group">
      <label>Starting Time</label>
      <select class="form-input" data-chamber-start-time>${chamberSelectOptions(chamberTimeOptions, startTime)}</select>
    </div>
    <div class="form-group">
      <label>Ending Time</label>
      <select class="form-input" data-chamber-end-time>${chamberSelectOptions(chamberTimeOptions, endTime)}</select>
    </div>
    <button class="small-btn danger-small chamber-remove-button" data-remove-chamber type="button" aria-label="Remove chamber location">Remove</button>
  `;
  list.appendChild(row);
  if (focus) row.querySelector("[data-chamber-location]")?.focus();
}

function renderChamberRows(chambers = []) {
  const list = qs("#chamberList");
  if (!list) return;
  list.innerHTML = "";
  const rows = normalizeChamberSource(chambers);
  if (!rows.length) {
    addChamberRow({});
    return;
  }
  rows.forEach((row) => addChamberRow(row));
}

function getDoctorChambers() {
  return qsa(".chamber-row", qs("#chamberList") || document)
    .map((row) => {
      const startTime = row.querySelector("[data-chamber-start-time]")?.value.trim() || "";
      const endTime = row.querySelector("[data-chamber-end-time]")?.value.trim() || "";
      return {
        location: row.querySelector("[data-chamber-location]")?.value.trim() || "",
        weekday: qsa("[data-chamber-weekdays] input:checked", row).map((input) => input.value).join(", "),
        time: startTime && endTime ? `${startTime} - ${endTime}` : ""
      };
    })
    .filter((item) => item.location || item.weekday || item.time);
}

function summarizeChambers(chambers = []) {
  const valid = normalizeChamberSource(chambers);
  return valid.map((item) => `${item.location}${item.weekday || item.time ? ` — ${[item.weekday, item.time].filter(Boolean).join(", ")}` : ""}`).join(" • ");
}

function getDoctorPayload() {
  const chambers = getDoctorChambers();
  return {
    name: qs("#name").value.trim(),
    designation: qs("#designation").value.trim(),
    designationNote: qs("#designationNote")?.value.trim() || "",
    specialty: qs("#specialty").value.trim(),
    degrees: qs("#degrees").value.trim(),
    hospital: qs("#hospital").value.trim(),
    chambers,
    phone: "+8801609672748",
    whatsapp: "+8801609672748",
    sortOrder: Number(qs("#sortOrder").value || 99),
    photoUrl: qs("#photoUrl").value.trim(),
    bio: qs("#bio").value.trim(),
    isActive: qs("#isActive").checked
  };
}


function updateDesignationNoteVisibility() {
  const group = qs("#designationNoteGroup");
  const input = qs("#designationNote");
  const select = qs("#designation");
  const show = Boolean(select?.value);
  if (group) group.hidden = !show;
  if (input && !show) input.value = "";
}

function resetDoctorForm() {
  qs("#doctorForm").reset();
  qs("#doctorId").value = "";
  qs("#photoUrl").value = "";
  const photoUpload = qs("#photoUpload");
  if (photoUpload) photoUpload.value = "";
  setPhotoPreview("");
  renderChamberRows([]);
  qs("#isActive").checked = true;
  qs("#doctorFormTitle").textContent = "Add doctor";
  updateDesignationNoteVisibility();
}

function fillDoctorForm(doctor) {
  qs("#doctorFormTitle").textContent = `Edit ${doctor.name}`;
  qs("#doctorId").value = doctor.id || "";
  fields.forEach((field) => {
    const node = qs(`#${field}`);
    if (!node) return;
    if (field === "isActive") {
      node.checked = doctor.isActive !== false;
    } else {
      node.value = doctor[field] ?? "";
    }
  });
  renderChamberRows(normalizeChamberSource(doctor.chambers, doctor));
  const photoUpload = qs("#photoUpload");
  if (photoUpload) photoUpload.value = "";
  setPhotoPreview(doctor.photoUrl || "");
  updateDesignationNoteVisibility();
  setAdminPage("doctors", true);
  qs("#doctorForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveDoctor(event) {
  event.preventDefault();
  const id = qs("#doctorId").value;
  const payload = getDoctorPayload();

  if (!payload.designation) {
    toast("Select a designation.");
    return;
  }
  if (!payload.chambers.length || payload.chambers.some((item) => !item.location || !item.weekday || !item.time)) {
    toast("Add chamber location, at least one weekday, starting time and ending time for each chamber entry.");
    return;
  }

  if (id) {
    await api(`/api/doctors/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    toast("Doctor updated.");
  } else {
    await api("/api/doctors", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    toast("Doctor added.");
  }

  resetDoctorForm();
  await loadAdminData();
}

function fillMainPageForm() {
  const settings = state.settings || {};
  if (qs("#siteName")) qs("#siteName").value = settings.siteName || "";
  if (qs("#heroHighlight")) qs("#heroHighlight").value = settings.heroHighlight || "Medical care";
  if (qs("#heroTitleLine")) qs("#heroTitleLine").value = settings.heroTitleLine || "at your home.";
  if (qs("#description")) qs("#description").value = settings.description || "";
  if (qs("#primaryButtonText")) qs("#primaryButtonText").value = settings.primaryButtonText || "WhatsApp Appointment";
  if (qs("#secondaryButtonText")) qs("#secondaryButtonText").value = settings.secondaryButtonText || "View Doctors";
  if (qs("#servicesButtonText")) qs("#servicesButtonText").value = settings.servicesButtonText || "Services";
  if (qs("#contactButtonText")) qs("#contactButtonText").value = settings.contactButtonText || "Contact";
  if (qs("#statsSetting")) qs("#statsSetting").value = formatStats(settings.stats || []);
}

function parseContentBlocks(value = "") {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        title: parts[0] || "",
        copy: parts[1] || "",
        imageUrl: parts[2] || "",
        buttonLabel: parts[3] || "",
        buttonUrl: parts[4] || ""
      };
    })
    .filter((block) => block.title || block.copy || block.imageUrl)
    .slice(0, 12);
}

function formatContentBlocks(blocks = []) {
  return (Array.isArray(blocks) ? blocks : [])
    .map((block) => [block.title, block.copy, block.imageUrl, block.buttonLabel, block.buttonUrl].map((value) => String(value || "").trim()).join(" | "))
    .join("\n");
}

function normalizeAdminPageContentEntry(page, settings = state.settings) {
  const stored = settings?.pageContent && typeof settings.pageContent === "object" ? settings.pageContent[page.key] || {} : {};
  return {
    label: stored.label || (page.nav ? settings?.[page.nav] : "") || page.label,
    badge: stored.badge || (page.badge ? settings?.[page.badge] : "") || page.label,
    title: stored.title || (page.title ? settings?.[page.title] : "") || page.label,
    copy: stored.copy || (page.copy ? settings?.[page.copy] : "") || "",
    body: stored.body || "",
    bannerImage: stored.bannerImage || "",
    noticeTitle: stored.noticeTitle || "",
    noticeText: stored.noticeText || "",
    listTitle: stored.listTitle || "",
    listCopy: stored.listCopy || "",
    bottomNote: stored.bottomNote || "",
    blocks: Array.isArray(stored.blocks) ? stored.blocks : [],
    primaryLabel: stored.primaryLabel || (page.primaryLabelField ? settings?.[page.primaryLabelField] : "") || "",
    primaryUrl: stored.primaryUrl || "",
    secondaryLabel: stored.secondaryLabel || (page.secondaryLabelField ? settings?.[page.secondaryLabelField] : "") || "",
    secondaryUrl: stored.secondaryUrl || "",
    layout: stored.layout || "standard",
    hidden: stored.hidden === true,
    hideDefaultModule: stored.hideDefaultModule === true
  };
}

function getAdminPageContent(settings = state.settings) {
  const result = {};
  editableContentPages.forEach((page) => {
    result[page.key] = normalizeAdminPageContentEntry(page, settings);
  });
  return result;
}

function currentContentEditorEntry() {
  return {
    label: qs("#contentPageLabel")?.value.trim() || "",
    badge: qs("#contentPageBadge")?.value.trim() || "",
    title: qs("#contentPageTitleField")?.value.trim() || "",
    copy: qs("#contentPageCopyField")?.value.trim() || "",
    body: qs("#contentPageBodyField")?.value.trim() || "",
    bannerImage: qs("#contentBannerImage")?.value.trim() || "",
    noticeTitle: qs("#contentNoticeTitle")?.value.trim() || "",
    noticeText: qs("#contentNoticeText")?.value.trim() || "",
    listTitle: qs("#contentListTitle")?.value.trim() || "",
    listCopy: qs("#contentListCopy")?.value.trim() || "",
    bottomNote: qs("#contentBottomNote")?.value.trim() || "",
    blocks: parseContentBlocks(qs("#contentBlocksField")?.value || ""),
    primaryLabel: qs("#contentPrimaryLabel")?.value.trim() || "",
    primaryUrl: qs("#contentPrimaryUrl")?.value.trim() || "",
    secondaryLabel: qs("#contentSecondaryLabel")?.value.trim() || "",
    secondaryUrl: qs("#contentSecondaryUrl")?.value.trim() || "",
    layout: qs("#contentPageLayout")?.value || "standard",
    hidden: qs("#contentPageHidden")?.checked === true,
    hideDefaultModule: qs("#contentHideDefaultModule")?.checked === true
  };
}

function renderContentPageCards() {
  const grid = qs("#contentPagesOverview");
  if (!grid) return;
  const settings = state.settings || {};
  const pageContent = getAdminPageContent(settings);
  grid.hidden = false;
  grid.innerHTML = editableContentPages.map((page) => {
    const entry = pageContent[page.key];
    const blockCount = Array.isArray(entry.blocks) ? entry.blocks.length : 0;
    return `
      <button class="content-page-card" type="button" data-content-page-card="${escapeHtml(page.key)}">
        <span class="content-page-card-icon">${escapeHtml(page.icon)}</span>
        <span class="content-page-card-title">${escapeHtml(entry.label || page.label)}</span>
        <span class="content-page-card-copy">${escapeHtml(entry.title || page.label)}</span>
        <span class="content-page-card-meta">Click to open full ${escapeHtml(page.label)} page editor · ${blockCount} custom block${blockCount === 1 ? "" : "s"}${entry.hideDefaultModule ? " · custom-only page" : ""}</span>
        <span class="content-page-card-status ${entry.hidden ? "is-hidden" : ""}">${entry.hidden ? "Hidden from menu" : "Visible"}</span>
      </button>
    `;
  }).join("");
}

function showContentPageOverview(updateUrl = false) {
  const grid = qs("#contentPagesOverview");
  const form = qs("#contentPageForm");
  state.activeContentPage = "main";
  if (grid) grid.hidden = false;
  if (form) form.hidden = true;
  const title = qs("#adminCurrentPageTitle");
  if (title && state.activePage === "content") title.textContent = "Content Pages";
  if (updateUrl) {
    const url = contentEditorUrl("");
    if (window.location.pathname.replace(/\/+$/, "") !== url.replace(/\/+$/, "")) {
      history.pushState({ page: "content" }, "", url);
    }
  }
}

function fillContentEditor(pageKey) {
  const page = editableContentPageMap[pageKey] || editableContentPages[0];
  state.activeContentPage = page.key;
  const entry = normalizeAdminPageContentEntry(page, state.settings || {});
  if (qs("#contentEditorPageKey")) qs("#contentEditorPageKey").value = page.key;
  if (qs("#contentEditorKicker")) qs("#contentEditorKicker").textContent = `${page.label} full page editor`;
  if (qs("#contentEditorTitle")) qs("#contentEditorTitle").textContent = `Edit full ${page.label} page`;
  const title = qs("#adminCurrentPageTitle");
  if (title && state.activePage === "content") title.textContent = `Content Pages / ${page.label}`;
  if (qs("#contentPageLabel")) qs("#contentPageLabel").value = entry.label || "";
  if (qs("#contentPageBadge")) qs("#contentPageBadge").value = entry.badge || "";
  if (qs("#contentPageTitleField")) qs("#contentPageTitleField").value = entry.title || "";
  if (qs("#contentPageCopyField")) qs("#contentPageCopyField").value = entry.copy || "";
  if (qs("#contentPageBodyField")) qs("#contentPageBodyField").value = entry.body || "";
  if (qs("#contentBannerImage")) qs("#contentBannerImage").value = entry.bannerImage || "";
  if (qs("#contentNoticeTitle")) qs("#contentNoticeTitle").value = entry.noticeTitle || "";
  if (qs("#contentNoticeText")) qs("#contentNoticeText").value = entry.noticeText || "";
  if (qs("#contentListTitle")) qs("#contentListTitle").value = entry.listTitle || "";
  if (qs("#contentListCopy")) qs("#contentListCopy").value = entry.listCopy || "";
  if (qs("#contentBlocksField")) qs("#contentBlocksField").value = formatContentBlocks(entry.blocks || []);
  if (qs("#contentBottomNote")) qs("#contentBottomNote").value = entry.bottomNote || "";
  if (qs("#contentPrimaryLabel")) qs("#contentPrimaryLabel").value = entry.primaryLabel || "";
  if (qs("#contentPrimaryUrl")) qs("#contentPrimaryUrl").value = entry.primaryUrl || "";
  if (qs("#contentSecondaryLabel")) qs("#contentSecondaryLabel").value = entry.secondaryLabel || "";
  if (qs("#contentSecondaryUrl")) qs("#contentSecondaryUrl").value = entry.secondaryUrl || "";
  if (qs("#contentPageLayout")) qs("#contentPageLayout").value = entry.layout || "standard";
  if (qs("#contentPageHidden")) qs("#contentPageHidden").checked = entry.hidden === true;
  if (qs("#contentHideDefaultModule")) qs("#contentHideDefaultModule").checked = entry.hideDefaultModule === true;
  renderContentPreview();
}

function openContentPageEditor(pageKey, updateUrl = true) {
  const page = editableContentPageMap[pageKey] || editableContentPages[0];
  const grid = qs("#contentPagesOverview");
  const form = qs("#contentPageForm");
  fillContentEditor(page.key);
  if (grid) grid.hidden = true;
  if (form) form.hidden = false;
  if (updateUrl) {
    const url = contentEditorUrl(page.key);
    const statePayload = { page: "content", contentPage: page.key };
    if (window.location.pathname.replace(/\/+$/, "") === url.replace(/\/+$/, "")) {
      history.replaceState(statePayload, "", url);
    } else {
      history.pushState(statePayload, "", url);
    }
  }
  form?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderContentPreview() {
  const entry = currentContentEditorEntry();
  if (qs("#contentPreviewBadge")) qs("#contentPreviewBadge").textContent = entry.badge || "Preview";
  if (qs("#contentPreviewTitle")) qs("#contentPreviewTitle").textContent = entry.title || "Page title";
  if (qs("#contentPreviewCopy")) qs("#contentPreviewCopy").textContent = entry.copy || "Page description preview.";
  const body = qs("#contentPreviewBody");
  if (body) {
    body.innerHTML = entry.body ? escapeHtml(entry.body).replaceAll("\n", "<br />") : "";
    body.hidden = !entry.body;
  }
  const actions = qs("#contentPreviewActions");
  if (actions) {
    const buttons = [];
    if (entry.primaryLabel) buttons.push(`<span class="btn btn-primary">${escapeHtml(entry.primaryLabel)}</span>`);
    if (entry.secondaryLabel) buttons.push(`<span class="btn btn-ghost">${escapeHtml(entry.secondaryLabel)}</span>`);
    actions.innerHTML = buttons.join("");
    actions.hidden = buttons.length === 0;
  }
  const advanced = qs("#contentPreviewAdvanced");
  if (advanced) {
    const parts = [];
    if (entry.bannerImage) parts.push(`<img class="content-preview-banner" src="${escapeHtml(entry.bannerImage)}" alt="" loading="lazy" />`);
    if (entry.noticeTitle || entry.noticeText) parts.push(`<div class="content-preview-note"><strong>${escapeHtml(entry.noticeTitle || "Notice")}</strong><span>${escapeHtml(entry.noticeText || "")}</span></div>`);
    if (entry.listTitle || entry.listCopy) parts.push(`<div class="content-preview-list"><strong>${escapeHtml(entry.listTitle || "Main section")}</strong><span>${escapeHtml(entry.listCopy || "")}</span></div>`);
    if (entry.blocks.length) parts.push(`<div class="content-preview-block-grid">${entry.blocks.map((block) => `<article><strong>${escapeHtml(block.title || "Content block")}</strong><span>${escapeHtml(block.copy || "")}</span></article>`).join("")}</div>`);
    if (entry.bottomNote) parts.push(`<div class="content-preview-note"><span>${escapeHtml(entry.bottomNote)}</span></div>`);
    if (entry.hideDefaultModule) parts.push(`<div class="content-preview-note"><strong>Custom-only page</strong><span>The default page cards/list/form will be hidden.</span></div>`);
    advanced.innerHTML = parts.join("");
    advanced.hidden = parts.length === 0;
  }
}

function fillContentPageForm() {
  renderContentPageCards();
  const directContentPage = contentPageFromLocation();
  if (directContentPage) {
    openContentPageEditor(directContentPage, false);
  } else {
    showContentPageOverview(false);
  }
}

function contentPagesPayload() {
  const settings = state.settings || {};
  const payload = {};
  contentPageFields.forEach(([key]) => {
    payload[key] = settings[key] || "";
  });

  const pageContent = getAdminPageContent(settings);
  const editorKey = qs("#contentEditorPageKey")?.value || state.activeContentPage || "";
  const contentForm = qs("#contentPageForm");
  const editorIsOpen = Boolean(contentForm && contentForm.hidden === false && editableContentPageMap[editorKey]);
  if (editorIsOpen) {
    pageContent[editorKey] = currentContentEditorEntry();
  }

  editableContentPages.forEach((page) => {
    const entry = pageContent[page.key] || {};
    if (page.nav) payload[page.nav] = entry.label || settings[page.nav] || page.label;
    if (page.badge) payload[page.badge] = entry.badge || settings[page.badge] || "";
    if (page.title) payload[page.title] = entry.title || settings[page.title] || page.label;
    if (page.copy) payload[page.copy] = entry.copy || settings[page.copy] || "";
    if (page.primaryLabelField) payload[page.primaryLabelField] = entry.primaryLabel || settings[page.primaryLabelField] || "";
    if (page.secondaryLabelField) payload[page.secondaryLabelField] = entry.secondaryLabel || settings[page.secondaryLabelField] || "";
  });
  payload.pageContent = pageContent;
  return payload;
}

function fillServicesForm() {
  const settings = state.settings || {};
  state.serviceDraft = serviceEntriesFromSettings(settings);
  state.originalServiceDraft = cloneServiceEntries(state.serviceDraft);
  state.serviceDirty = false;
  resetServiceForm();
  renderServiceList();
  updateServiceChangesUI();
}

function fillSettingsForm() {
  const settings = state.settings || {};
  if (qs("#location")) qs("#location").value = settings.location || "";
  if (qs("#whatsappSetting")) qs("#whatsappSetting").value = settings.whatsapp || "";
  if (qs("#phonesSetting")) qs("#phonesSetting").value = (settings.phones || []).join(", ");
  const socialInput = qs("#socialLinksSetting");
  if (socialInput) socialInput.value = formatSocialLinks(settings.socialLinks || []);
  if (qs("#emergencyNote")) qs("#emergencyNote").value = settings.emergencyNote || "";
}

function fillAmbulanceForm() {
  const settings = state.settings || {};
  if (qs("#ambulanceButtonText")) qs("#ambulanceButtonText").value = settings.ambulanceButtonText || "Order Ambulance";
  if (qs("#ambulancePhone")) qs("#ambulancePhone").value = settings.ambulancePhone || "+8801609672748";
  if (qs("#ambulanceWhatsapp")) qs("#ambulanceWhatsapp").value = settings.ambulanceWhatsapp || "+8801609672748";
  if (qs("#ambulanceDescription")) qs("#ambulanceDescription").value = settings.ambulanceDescription || "";
}

function getCurrentSettingsPayload() {
  const settings = state.settings || {};
  const serviceData = state.serviceDraft?.length ? serviceSettingsFromDraft() : {
    serviceTags: settings.serviceTags || [],
    serviceIcons: settings.serviceIcons || {},
    serviceDescriptions: settings.serviceDescriptions || {}
  };

  return {
    siteName: qs("#siteName")?.value.trim() || settings.siteName || "Medicare At Home",
    heroHighlight: qs("#heroHighlight")?.value.trim() || settings.heroHighlight || "Medical care",
    heroTitleLine: qs("#heroTitleLine")?.value.trim() || settings.heroTitleLine || "at your home.",
    description: qs("#description")?.value.trim() || settings.description || "",
    primaryButtonText: qs("#primaryButtonText")?.value.trim() || settings.primaryButtonText || "WhatsApp Appointment",
    secondaryButtonText: qs("#secondaryButtonText")?.value.trim() || settings.secondaryButtonText || "View Doctors",
    servicesButtonText: qs("#servicesButtonText")?.value.trim() || settings.servicesButtonText || "Services",
    contactButtonText: qs("#contactButtonText")?.value.trim() || settings.contactButtonText || "Contact",
    ambulanceButtonText: qs("#ambulanceButtonText")?.value.trim() || settings.ambulanceButtonText || "Order Ambulance",
    ambulancePhone: qs("#ambulancePhone")?.value.trim() || settings.ambulancePhone || "+8801609672748",
    ambulanceWhatsapp: qs("#ambulanceWhatsapp")?.value.trim() || settings.ambulanceWhatsapp || "+8801609672748",
    ambulanceDescription: qs("#ambulanceDescription")?.value.trim() || settings.ambulanceDescription || "",
    ...contentPagesPayload(),
    location: qs("#location")?.value.trim() || settings.location || "",
    whatsapp: qs("#whatsappSetting")?.value.trim() || settings.whatsapp || "",
    phones: splitList(qs("#phonesSetting")?.value || (settings.phones || []).join(", ")),
    socialLinks: parseSocialLinks(qs("#socialLinksSetting")?.value || formatSocialLinks(settings.socialLinks || [])),
    serviceTags: serviceData.serviceTags,
    serviceIcons: serviceData.serviceIcons,
    serviceDescriptions: serviceData.serviceDescriptions,
    emergencyNote: qs("#emergencyNote")?.value.trim() || settings.emergencyNote || "",
    stats: parseStats(qs("#statsSetting")?.value || formatStats(settings.stats || []))
  };
}

async function saveMainPage(event) {
  event.preventDefault();
  await api("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(getCurrentSettingsPayload())
  });
  toast("Main page saved.");
  await loadAdminData();
}

async function saveContentPages(event) {
  event.preventDefault();
  await api("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(getCurrentSettingsPayload())
  });
  toast("Page content saved.");
  await loadAdminData();
}

async function saveSettings(event) {
  event.preventDefault();
  await api("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(getCurrentSettingsPayload())
  });
  toast("Contact settings saved.");
  await loadAdminData();
}

async function saveAmbulanceSettings(event) {
  event.preventDefault();
  await api("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(getCurrentSettingsPayload())
  });
  toast("Ambulance settings saved.");
  await loadAdminData();
}

function money(value) {
  const number = Number(value || 0);
  return `৳${number.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

function productFeniDeliveryCharge(product = {}) {
  return Number(product.feniDeliveryCharge ?? product.deliveryCharge ?? 0);
}

function productOutsideFeniDeliveryCharge(product = {}) {
  return Number(product.outsideFeniDeliveryCharge ?? product.deliveryCharge ?? productFeniDeliveryCharge(product));
}

function paymentMethodLabel(method = "") {
  if (["bkash", "nagad", "bkash_nagad"].includes(method)) return "bKash and Nagad";
  if (method === "rocket") return "Rocket";
  if (method === "bank_transfer") return "Bangladeshi Bank Transfer";
  return "Cash on Delivery";
}

function deliveryPaymentLabel(method = "") {
  if (method === "bkash") return "bKash delivery fee paid";
  if (method === "nagad") return "Nagad delivery fee paid";
  return "";
}

function orderStatusLabel(status = "") {
  const labels = {
    pending: "Pending",
    pending_payment: "Pending Payment",
    payment_submitted: "Payment Submitted",
    confirmed: "Payment Confirmed",
    on_the_way: "On the Way",
    delivered: "Delivered",
    completed: "Delivered",
    cancelled: "Cancelled"
  };
  return labels[String(status || "").toLowerCase()] || "Pending";
}

function isActiveOrderStatus(status = "") {
  return ["pending", "pending_payment", "payment_submitted", "confirmed", "on_the_way"].includes(String(status || "").toLowerCase());
}

function productPhotoMarkup(product = {}, className = "service-admin-photo") {
  const photo = String(product.photoUrl || "").trim();
  if (photo) return `<span class="${className} has-photo"><img src="${escapeHtml(photo)}" alt="${escapeHtml(product.name || "Product")}" loading="lazy" /></span>`;
  return `<span class="${className} service-admin-photo-empty" aria-hidden="true">💊</span>`;
}

function parsePhotoLines(value = "") {
  return String(value || "")
    .split("\n")
    .map((line) => cleanServiceMedia(line))
    .filter(Boolean)
    .slice(0, 8);
}

function formatPhotoLines(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => String(item || "").trim()).filter(Boolean).join("\n");
}

function setProductPhotoPreview(value = "") {
  const preview = qs("#productPhotoPreview");
  if (!preview) return;
  const photo = cleanServiceMedia(value);
  if (!photo) {
    preview.classList.remove("has-photo");
    preview.innerHTML = "No product photo selected";
    return;
  }
  preview.classList.add("has-photo");
  preview.innerHTML = `<img src="${escapeHtml(photo)}" alt="Product photo preview" loading="lazy" />`;
}

function setProductAdditionalPhotosPreview(items = []) {
  const preview = qs("#productAdditionalPhotosPreview");
  if (!preview) return;
  const photos = Array.isArray(items) ? items.filter(Boolean) : parsePhotoLines(items);
  if (!photos.length) {
    preview.classList.remove("has-photos");
    preview.innerHTML = "No additional photos selected";
    return;
  }
  preview.classList.add("has-photos");
  preview.innerHTML = photos.map((photo, index) => `
    <span class="multi-photo-item">
      <img src="${escapeHtml(photo)}" alt="Additional product photo ${index + 1}" loading="lazy" />
    </span>
  `).join("");
}

function getCurrentProductAdditionalPhotos() {
  return parsePhotoLines(qs("#productAdditionalPhotos")?.value || "");
}

function setCurrentProductAdditionalPhotos(items = []) {
  const photos = (Array.isArray(items) ? items : []).map((item) => cleanServiceMedia(item)).filter(Boolean).slice(0, 8);
  if (qs("#productAdditionalPhotos")) qs("#productAdditionalPhotos").value = formatPhotoLines(photos);
  setProductAdditionalPhotosPreview(photos);
}

function productRateInputsAreComplete() {
  return Boolean(qs("#productFeniDeliveryCharge")?.value.trim()) && Boolean(qs("#productOutsideFeniDeliveryCharge")?.value.trim());
}

function getProductPayload() {
  const feniDeliveryCharge = Number(qs("#productFeniDeliveryCharge")?.value || 0);
  const outsideFeniDeliveryCharge = Number(qs("#productOutsideFeniDeliveryCharge")?.value || 0);
  return {
    name: qs("#productName")?.value.trim() || "",
    productType: qs("#productType")?.value || "medicine",
    price: Number(qs("#productPrice")?.value || 0),
    deliveryCharge: feniDeliveryCharge,
    feniDeliveryCharge,
    outsideFeniDeliveryCharge,
    stock: Number(qs("#productStock")?.value || 0),
    sortOrder: Number(qs("#productSortOrder")?.value || 99),
    photoUrl: cleanServiceMedia(qs("#productPhotoUrl")?.value || ""),
    additionalPhotos: parsePhotoLines(qs("#productAdditionalPhotos")?.value || ""),
    description: qs("#productDescription")?.value.trim() || "",
    isActive: qs("#productIsActive")?.checked !== false
  };
}

function resetProductForm() {
  qs("#productForm")?.reset();
  if (qs("#productId")) qs("#productId").value = "";
  if (qs("#productPhotoUrl")) qs("#productPhotoUrl").value = "";
  if (qs("#productAdditionalPhotos")) qs("#productAdditionalPhotos").value = "";
  const upload = qs("#productPhotoUpload");
  if (upload) upload.value = "";
  const additionalUpload = qs("#productAdditionalPhotoUpload");
  if (additionalUpload) additionalUpload.value = "";
  if (qs("#productType")) qs("#productType").value = "medicine";
  if (qs("#productIsActive")) qs("#productIsActive").checked = true;
  const title = qs("#productFormTitle");
  if (title) title.textContent = "Add product";
  setProductPhotoPreview("");
  setProductAdditionalPhotosPreview([]);
}

function fillProductForm(product = {}) {
  qs("#productFormTitle").textContent = `Edit ${product.name || "product"}`;
  qs("#productId").value = product.id || "";
  if (qs("#productType")) qs("#productType").value = product.productType === "equipment" ? "equipment" : "medicine";
  qs("#productName").value = product.name || "";
  qs("#productPrice").value = product.price ?? "";
  qs("#productFeniDeliveryCharge").value = String(productFeniDeliveryCharge(product));
  qs("#productOutsideFeniDeliveryCharge").value = String(productOutsideFeniDeliveryCharge(product));
  qs("#productStock").value = product.stock ?? "";
  qs("#productSortOrder").value = product.sortOrder ?? 99;
  qs("#productPhotoUrl").value = product.photoUrl || "";
  qs("#productAdditionalPhotos").value = formatPhotoLines(product.additionalPhotos || []);
  qs("#productDescription").value = product.description || "";
  qs("#productIsActive").checked = product.isActive !== false;
  const upload = qs("#productPhotoUpload");
  if (upload) upload.value = "";
  const additionalUpload = qs("#productAdditionalPhotoUpload");
  if (additionalUpload) additionalUpload.value = "";
  setProductPhotoPreview(product.photoUrl || "");
  setProductAdditionalPhotosPreview(product.additionalPhotos || []);
  setAdminPage("products", true);
  qs("#productForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderProductList() {
  const list = qs("#adminProductList");
  if (!list) return;
  if (state.storeError) {
    list.innerHTML = `<div class="empty-state">${escapeHtml(state.storeError)}</div>`;
    return;
  }
  if (!state.products.length) {
    list.innerHTML = `<div class="empty-state">No store products found. Add the first medicine or equipment product from the form.</div>`;
    return;
  }
  const labelForType = (type) => type === "equipment" ? "Medical Equipment" : "Medicine Store";
  list.innerHTML = ["medicine", "equipment"].map((type) => {
    const products = [...state.products]
      .filter((product) => String(product.productType || "medicine") === type)
      .sort((a, b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99));
    return `
      <div class="admin-product-category-block">
        <h3>${labelForType(type)}</h3>
        ${products.length ? products.map((product) => `
          <article class="admin-product-card ${product.isActive === false ? "is-hidden" : ""}">
            ${productPhotoMarkup(product, "admin-product-photo")}
            <div class="admin-product-body">
              <strong>${escapeHtml(product.name || "Product")}</strong>
              <p class="admin-product-price">${money(product.price)}</p>
              <p class="admin-product-meta">${labelForType(type)} • Stock ${escapeHtml(String(product.stock || 0))}</p>
              <p class="admin-product-meta">Feni ${money(productFeniDeliveryCharge(product))} • Outside ${money(productOutsideFeniDeliveryCharge(product))}</p>
              <span class="admin-product-status">${product.isActive === false ? "Hidden from public store" : "Listed publicly"}</span>
            </div>
            <div class="admin-product-actions">
              <button class="small-btn" data-product-action="edit" data-id="${escapeHtml(product.id)}" type="button">Edit</button>
              <button class="small-btn danger-small" data-product-action="delete" data-id="${escapeHtml(product.id)}" type="button">Delete</button>
            </div>
          </article>
        `).join("") : `<div class="empty-state compact-empty">No ${labelForType(type).toLowerCase()} products yet.</div>`}
      </div>`;
  }).join("");
}

async function saveProduct(event) {
  event.preventDefault();
  const id = qs("#productId")?.value || "";
  const payload = getProductPayload();
  if (!payload.name || !payload.price) {
    toast("Product name and price are required.");
    return;
  }
  if (!productRateInputsAreComplete()) {
    toast("Enter both Feni and outside-Feni delivery charges before saving the product.");
    return;
  }
  if (id) {
    await api(`/api/store/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
    toast("Product updated.");
  } else {
    await api("/api/store/products", { method: "POST", body: JSON.stringify(payload) });
    toast("Product added.");
  }
  resetProductForm();
  await loadAdminData();
}

async function deleteProductAdmin(id) {
  const product = state.products.find((item) => String(item.id) === String(id));
  const confirmed = window.confirm(`Delete ${product?.name || "this product"} permanently?`);
  if (!confirmed) return;
  await api(`/api/store/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Product deleted.");
  await loadAdminData();
}

function fillPaymentSettingsForm() {
  const settings = state.storePaymentSettings || {};
  if (qs("#storeBkashNumber")) qs("#storeBkashNumber").value = settings.bkashNumber || "";
  if (qs("#storeNagadNumber")) qs("#storeNagadNumber").value = settings.nagadNumber || "";
  if (qs("#storeRocketNumber")) qs("#storeRocketNumber").value = settings.rocketNumber || "";
  if (qs("#storeBankTransferInfo")) qs("#storeBankTransferInfo").value = settings.bankTransferInfo || "";
  if (qs("#storePaymentInstructions")) qs("#storePaymentInstructions").value = settings.instructions || "";
}

async function savePaymentSettings(event) {
  event.preventDefault();
  const payload = {
    bkashNumber: qs("#storeBkashNumber")?.value.trim() || "",
    nagadNumber: qs("#storeNagadNumber")?.value.trim() || "",
    rocketNumber: qs("#storeRocketNumber")?.value.trim() || "",
    bankTransferInfo: qs("#storeBankTransferInfo")?.value.trim() || "",
    instructions: qs("#storePaymentInstructions")?.value.trim() || ""
  };
  const data = await api("/api/store/payment-settings", { method: "PATCH", body: JSON.stringify(payload) });
  state.storePaymentSettings = data.paymentSettings || payload;
  fillPaymentSettingsForm();
  toast("Payment settings saved.");
}

function prescriptionQuoteIsSet(order = {}) {
  return String(order.orderType || "product") === "prescription" && (Number(order.productPrice || 0) > 0 || Number(order.deliveryCharge || 0) > 0 || Boolean(order.prescriptionQuotedAt));
}

function adminPrescriptionPaymentSummary(order = {}) {
  if (String(order.orderType || "product") !== "prescription") return escapeHtml(paymentMethodLabel(order.paymentMethod));
  if (!prescriptionQuoteIsSet(order)) return "Admin review / custom quote";
  if (order.transactionId || String(order.status || "").toLowerCase() === "payment_submitted") {
    const delivery = order.paymentMethod === "cod" && order.deliveryPaymentMethod ? ` • ${deliveryPaymentLabel(order.deliveryPaymentMethod)}` : "";
    return `${paymentMethodLabel(order.paymentMethod)}${delivery}`;
  }
  return "Price sent / waiting for user payment";
}

function renderPrescriptionQuoteForm(order = {}) {
  if (String(order.orderType || "product") !== "prescription") return "";
  const status = String(order.status || "pending").toLowerCase();
  if (["delivered", "cancelled"].includes(status)) {
    return `<div class="prescription-quote-summary">Custom price editing is closed for this order.</div>`;
  }
  const quoted = prescriptionQuoteIsSet(order);
  return `
    <form class="prescription-quote-form" data-prescription-quote-form="${escapeHtml(order.id)}">
      <div class="prescription-quote-head">
        <strong>${quoted ? "Update prescription price" : "Set prescription price"}</strong>
        <span>${quoted ? "User was already quoted" : "Email will be sent to the user"}</span>
      </div>
      <div class="prescription-quote-fields">
        <label>Total medicine price
          <input class="form-input" type="number" min="1" step="1" inputmode="decimal" data-quote-price required value="${escapeHtml(String(order.productPrice || ""))}" placeholder="Total medicine price" />
        </label>
        <label>Delivery charge
          <input class="form-input" type="number" min="0" step="1" inputmode="decimal" data-quote-delivery required value="${escapeHtml(String(order.deliveryCharge || 0))}" placeholder="Delivery charge" />
        </label>
        <button class="small-btn" type="submit">Save price & email user</button>
      </div>
      <small class="form-help">Enter the full medicine price for the whole prescription request. Saving a price moves the order to Pending Payment and notifies the customer by email.</small>
    </form>`;
}

function renderOrderList() {
  const list = qs("#adminOrderList");
  if (!list) return;
  if (state.storeError) {
    list.innerHTML = `<div class="empty-state">${escapeHtml(state.storeError)}</div>`;
    return;
  }
  if (!state.storeOrders.length) {
    list.innerHTML = `<div class="empty-state">No store orders found yet.</div>`;
    return;
  }
  list.innerHTML = state.storeOrders.map((order) => {
    const isPrescription = String(order.orderType || "product") === "prescription";
    const quoteSet = prescriptionQuoteIsSet(order);
    const priceLine = isPrescription
      ? (quoteSet ? `Quoted: ${money(order.productPrice)} total medicine price + ${money(order.deliveryCharge)} delivery • Qty ${escapeHtml(String(order.quantity || 1))}` : `Quote not set yet • Qty ${escapeHtml(String(order.quantity || 1))}`)
      : `${money(order.productPrice)} + ${money(order.deliveryCharge)} delivery • Qty ${escapeHtml(String(order.quantity || 1))}`;
    return `
    <article class="admin-list-item order-admin-item${isPrescription ? " prescription-admin-order" : ""}">
      <div class="admin-doctor-summary">
        <strong>${escapeHtml(order.productName || "Product")}</strong>
        <p>${escapeHtml(order.customerName || "Customer")} • ${escapeHtml(order.phone || "No phone")}</p>
        <p>${escapeHtml(order.address || "No address")}</p>
        ${order.deliveryLocation ? `<p>Delivery location: ${escapeHtml(order.deliveryLocation)}</p>` : ""}
        <p>${priceLine}</p>
        <p>Payment: <b>${escapeHtml(isPrescription ? adminPrescriptionPaymentSummary(order) : paymentMethodLabel(order.paymentMethod))}</b>${order.deliveryPaymentMethod && !isPrescription ? ` • ${escapeHtml(deliveryPaymentLabel(order.deliveryPaymentMethod))}` : ""}${order.senderNumber ? ` • Sender: ${escapeHtml(order.senderNumber)}` : ""}${order.transactionId ? ` • TxID: ${escapeHtml(order.transactionId)}` : ""}</p>
        ${order.prescriptionText ? `<p>Prescription note: ${escapeHtml(order.prescriptionText)}</p>` : ""}
        ${order.prescriptionFileUrl ? `<p><a class="small-btn" href="${escapeHtml(order.prescriptionFileUrl)}" target="_blank" rel="noopener noreferrer">Open Prescription File</a></p>` : ""}
        ${order.prescriptionQuotedAt ? `<p>Price quoted: ${escapeHtml(new Date(order.prescriptionQuotedAt).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" }))}</p>` : ""}
        ${(order.userEmail || order.userPhone) ? `<p>User: ${escapeHtml(order.userName || "")} ${escapeHtml(order.userEmail || "")} ${order.userPhone ? `• ${escapeHtml(order.userPhone)}` : ""}</p>` : ""}
        ${renderPrescriptionQuoteForm(order)}
      </div>
      <div class="admin-list-actions order-status-actions">
        <select class="form-input compact-select" data-order-status="${escapeHtml(order.id)}" title="Current: ${escapeHtml(orderStatusLabel(order.status))}">
          <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="pending_payment" ${order.status === "pending_payment" ? "selected" : ""}>Pending Payment</option>
          <option value="payment_submitted" ${order.status === "payment_submitted" ? "selected" : ""}>Payment Submitted</option>
          <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>Payment Confirmed</option>
          <option value="on_the_way" ${order.status === "on_the_way" ? "selected" : ""}>On the Way</option>
          <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>Delivered</option>
          <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
        <button class="small-btn danger-small" data-order-delete="${escapeHtml(order.id)}" type="button">Delete</button>
      </div>
    </article>
  `;
  }).join("");
}

async function savePrescriptionQuoteAdmin(form) {
  const id = form?.dataset?.prescriptionQuoteForm || "";
  const productPrice = Number(form.querySelector("[data-quote-price]")?.value || 0);
  const deliveryCharge = Number(form.querySelector("[data-quote-delivery]")?.value || 0);
  if (!id) throw new Error("Order not found.");
  if (!productPrice || productPrice <= 0) throw new Error("Enter the total medicine price first.");
  if (!Number.isFinite(deliveryCharge) || deliveryCharge < 0) throw new Error("Enter a valid delivery charge.");
  const data = await api(`/api/store/admin/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "quote", productPrice, deliveryCharge })
  });
  if (data.email?.ok) {
    toast("Prescription price saved and email sent.");
  } else if (data.email?.skipped) {
    toast(`Prescription price saved. Email skipped: ${data.email.reason || "not configured"}.`);
  } else {
    toast("Prescription price saved. Email could not be sent.");
  }
  await loadAdminData();
}

async function updateOrderStatusAdmin(id, status) {
  const data = await api(`/api/store/admin/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
  if (data.email?.ok) {
    toast("Order status updated and email sent.");
  } else if (data.email?.skipped) {
    toast(`Order status updated. Email skipped: ${data.email.reason || "not configured"}.`);
  } else {
    toast("Order status updated. Email could not be sent.");
  }
  await loadAdminData();
}

async function deleteOrderAdmin(id) {
  const order = state.storeOrders.find((item) => String(item.id) === String(id));
  const restoreNote = order && isActiveOrderStatus(order.status) ? " Active order stock will be restored." : "";
  const confirmed = window.confirm(`Delete this order permanently?${restoreNote}`);
  if (!confirmed) return;
  await api(`/api/store/admin/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Order deleted.");
  await loadAdminData();
}

function setAvatarPhotoPreview(value = "") {
  const preview = qs("#avatarPhotoPreview");
  if (!preview) return;
  const photo = cleanServiceMedia(value);
  if (!photo) {
    preview.classList.remove("has-photo");
    preview.innerHTML = "No profile photo selected";
    return;
  }
  preview.classList.add("has-photo");
  preview.innerHTML = `<img src="${escapeHtml(photo)}" alt="Profile photo preview" loading="eager" decoding="async" />`;
}

function resetAvatarForm() {
  qs("#avatarForm")?.reset();
  if (qs("#avatarPhotoUrl")) qs("#avatarPhotoUrl").value = "";
  const upload = qs("#avatarPhotoUpload");
  if (upload) upload.value = "";
  if (qs("#avatarIsActive")) qs("#avatarIsActive").checked = true;
  setAvatarPhotoPreview("");
}

function renderAvatarList() {
  const list = qs("#adminAvatarList");
  if (!list) return;
  if (state.storeError) {
    list.innerHTML = `<div class="empty-state">${escapeHtml(state.storeError)}</div>`;
    return;
  }
  if (!state.storeAvatars.length) {
    list.innerHTML = `<div class="empty-state">No default profile photos added yet.</div>`;
    return;
  }
  list.innerHTML = state.storeAvatars.map((avatar) => `
    <article class="admin-list-item avatar-admin-item">
      <div class="admin-service-summary">
        <span class="service-admin-photo has-photo"><img src="${escapeHtml(avatar.photoUrl)}" alt="${escapeHtml(avatar.label || "Profile photo")}" loading="eager" decoding="async" width="76" height="76" /></span>
        <div>
          <strong>${escapeHtml(avatar.label || "Profile photo")}</strong>
          <p>Sort ${escapeHtml(String(avatar.sortOrder || 99))} • ${avatar.isActive === false ? "Hidden from sign up" : "Shown during sign up"}</p>
        </div>
      </div>
      <div class="admin-list-actions">
        <button class="small-btn danger-small" data-avatar-delete="${escapeHtml(avatar.id)}" type="button">Delete</button>
      </div>
    </article>
  `).join("");
}

async function saveAvatar(event) {
  event.preventDefault();
  const payload = {
    label: qs("#avatarLabel")?.value.trim() || "Profile photo",
    photoUrl: cleanServiceMedia(qs("#avatarPhotoUrl")?.value || ""),
    sortOrder: Number(qs("#avatarSortOrder")?.value || 99),
    isActive: qs("#avatarIsActive")?.checked !== false
  };
  if (!payload.photoUrl) {
    toast("Upload a profile photo first.");
    return;
  }
  await api("/api/store/admin/avatars", { method: "POST", body: JSON.stringify(payload) });
  toast("Default profile photo saved.");
  resetAvatarForm();
  await loadAdminData();
}

async function deleteAvatarAdmin(id) {
  const confirmed = window.confirm("Delete this default profile photo?");
  if (!confirmed) return;
  await api(`/api/store/admin/avatars/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Default profile photo deleted.");
  await loadAdminData();
}

async function deleteStoreUserAdmin(id) {
  const user = state.storeUsers.find((item) => String(item.id) === String(id));
  const confirmed = window.confirm(`Delete ${user?.fullName || "this user"} account? Their cart will be removed. Past order records stay in Order Details.`);
  if (!confirmed) return;
  await api(`/api/store/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("User account deleted.");
  await loadAdminData();
}

async function resetStoreUserPasswordAdmin(id) {
  const user = state.storeUsers.find((item) => String(item.id) === String(id));
  const label = user?.fullName || user?.email || user?.phone || "this user";
  const password = window.prompt(`Enter a new temporary password for ${label}. Minimum 6 characters.`);
  if (password === null) return;
  const trimmed = String(password || "").trim();
  if (trimmed.length < 6) {
    toast("Password must be at least 6 characters.");
    return;
  }
  await api(`/api/store/admin/users/${encodeURIComponent(id)}/password`, {
    method: "POST",
    body: JSON.stringify({ password: trimmed })
  });
  toast("Password reset successfully. Share the new temporary password with the user privately.");
  await loadAdminData();
}

function renderStoreUserList() {
  const list = qs("#adminStoreUserList");
  if (!list) return;
  if (state.storeError) {
    list.innerHTML = `<div class="empty-state">${escapeHtml(state.storeError)}</div>`;
    return;
  }
  if (!state.storeUsers.length) {
    list.innerHTML = `<div class="empty-state">No registered store users found yet.</div>`;
    return;
  }
  list.innerHTML = state.storeUsers.map((user) => `
    <article class="admin-list-item">
      <div class="admin-service-summary">
        ${user.photoUrl ? `<span class="service-admin-photo has-photo"><img src="${escapeHtml(user.photoUrl)}" alt="${escapeHtml(user.fullName || "User")}" loading="lazy" /></span>` : `<span class="service-admin-photo service-admin-photo-empty">👤</span>`}
        <div>
          <strong>${escapeHtml(user.fullName || "Store User")}</strong>
          <p>${escapeHtml(user.email || "No email")} ${user.phone ? `• ${escapeHtml(user.phone)}` : ""} • Age ${escapeHtml(String(user.age || "N/A"))}</p>
          <p>Password: Protected • Registered: ${escapeHtml(formatAdminDate(user.createdAt) || "Unknown")}</p>
        </div>
      </div>
      <div class="admin-list-actions">
        <button class="small-btn" data-user-password-reset="${escapeHtml(user.id)}" type="button">Reset Password</button>
        <button class="small-btn danger-small" data-user-delete="${escapeHtml(user.id)}" type="button">Delete</button>
      </div>
    </article>
  `).join("");
}

function groupAdminComments(comments = []) {
  const replies = new Map();
  const topLevel = [];
  comments.forEach((item) => {
    const parentId = String(item.parentId || "");
    if (parentId) {
      if (!replies.has(parentId)) replies.set(parentId, []);
      replies.get(parentId).push(item);
    } else {
      topLevel.push(item);
    }
  });
  return { topLevel, replies };
}

function adminCommentMeta(comment = {}) {
  const type = comment.commenterType === "admin" ? "Admin reply" : comment.isReview ? `Review ${comment.rating || 0}/5` : "Customer reply";
  return `${comment.userName || "Store User"} • ${type}`;
}

function renderAdminCommentThread(comment = {}, replies = new Map(), depth = 0) {
  const children = replies.get(String(comment.id)) || [];
  return `
    <article class="admin-list-item comment-admin-item ${depth ? "comment-admin-reply" : ""}">
      <div class="admin-doctor-summary">
        <strong>${escapeHtml(comment.productName || "Product")}</strong>
        <p>${escapeHtml(adminCommentMeta(comment))}</p>
        <p>${escapeHtml(comment.comment || "")}</p>
        <p>${comment.isVisible === false ? "Hidden" : "Visible"} • ${escapeHtml(formatAdminDate(comment.createdAt) || "")}</p>
      </div>
      <div class="comment-reply-box">
        <textarea class="form-textarea" data-comment-reply-input="${escapeHtml(comment.id)}" placeholder="Reply to this review"></textarea>
        <label class="check-row"><input type="checkbox" data-comment-visible="${escapeHtml(comment.id)}" ${comment.isVisible !== false ? "checked" : ""} /> Visible</label>
        <button class="small-btn" data-comment-reply="${escapeHtml(comment.id)}" type="button">Add Reply</button>
        <button class="small-btn danger-small" data-comment-delete="${escapeHtml(comment.id)}" type="button">Delete</button>
      </div>
      ${children.length ? `<div class="admin-comment-replies">${children.map((reply) => renderAdminCommentThread(reply, replies, depth + 1)).join("")}</div>` : ""}
    </article>
  `;
}

function renderCommentList() {
  const list = qs("#adminCommentList");
  if (!list) return;
  if (state.storeError) {
    list.innerHTML = `<div class="empty-state">${escapeHtml(state.storeError)}</div>`;
    return;
  }
  if (!state.storeComments.length) {
    list.innerHTML = `<div class="empty-state">No product reviews found yet.</div>`;
    return;
  }
  const { topLevel, replies } = groupAdminComments(state.storeComments);
  const reviewRoots = topLevel.filter((comment) => comment.isReview);
  if (!reviewRoots.length) {
    list.innerHTML = `<div class="empty-state">No product reviews found yet.</div>`;
    return;
  }
  list.innerHTML = reviewRoots.map((comment) => renderAdminCommentThread(comment, replies)).join("");
}

async function saveCommentReply(id) {
  const input = qs(`[data-comment-reply-input="${CSS.escape(String(id))}"]`);
  const visible = qs(`[data-comment-visible="${CSS.escape(String(id))}"]`);
  const replyText = input?.value.trim() || "";
  await api(`/api/store/admin/comments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ replyText, isVisible: visible?.checked !== false })
  });
  toast(replyText ? "Review reply added." : "Review visibility updated.");
  await loadAdminData();
}

async function deleteCommentAdmin(id) {
  const confirmed = window.confirm("Delete this review and its replies permanently?");
  if (!confirmed) return;
  await api(`/api/store/admin/comments/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Review deleted.");
  await loadAdminData();
}


async function bootstrapAdminSession() {
  if (!state.token) return false;
  try {
    const data = await api("/api/admin/me");
    const session = data.session || {};
    state.permissions = Array.isArray(session.permissions) ? session.permissions : [];
    state.isMaster = session.role === "master" || session.isMaster === true;
    state.role = session.role || panelMode;
    state.adminModules = data.modules || state.adminModules || [];
    applyAdminPermissions();
    return true;
  } catch (error) {
    console.warn(error);
    logout();
    return false;
  }
}

function renderPermissionCheckboxes(container, selected = []) {
  if (!container) return;
  const modules = state.adminModules.length ? state.adminModules : [
    { key: "dashboard", label: "Dashboard" }, { key: "content", label: "Content Pages" },
    { key: "contact", label: "Contact Settings" }, { key: "blood", label: "Blood" }, { key: "ambulance", label: "Ambulance" },
    { key: "doctors", label: "Doctors" }, { key: "comments", label: "User Reviews" }, { key: "store-users", label: "User Login Information" },
    { key: "orders", label: "Order Details" }, { key: "products", label: "Add Products" }, { key: "services", label: "Services" }
  ];
  const selectedSet = new Set(selected);
  container.innerHTML = modules.map((module) => `
    <label class="check-row permission-check"><input type="checkbox" value="${escapeHtml(module.key)}" ${selectedSet.has(module.key) ? "checked" : ""} /> ${escapeHtml(module.label)}</label>
  `).join("");
}

function selectedSubAdminPermissions() {
  return qsa('#subAdminPermissions input[type="checkbox"]:checked').map((input) => input.value);
}

function resetSubAdminForm() {
  qs("#subAdminId") && (qs("#subAdminId").value = "");
  qs("#subAdminUsername") && (qs("#subAdminUsername").value = "");
  qs("#subAdminDisplayName") && (qs("#subAdminDisplayName").value = "");
  qs("#subAdminPassword") && (qs("#subAdminPassword").value = "");
  qs("#subAdminIsActive") && (qs("#subAdminIsActive").checked = true);
  renderPermissionCheckboxes(qs("#subAdminPermissions"), ["dashboard"]);
  const title = qs("#subAdminFormTitle");
  if (title) title.textContent = "Create sub-admin";
}

function fillSubAdminForm(admin = {}) {
  qs("#subAdminId") && (qs("#subAdminId").value = admin.id || "");
  qs("#subAdminUsername") && (qs("#subAdminUsername").value = admin.username || "");
  qs("#subAdminDisplayName") && (qs("#subAdminDisplayName").value = admin.displayName || "");
  qs("#subAdminPassword") && (qs("#subAdminPassword").value = "");
  qs("#subAdminIsActive") && (qs("#subAdminIsActive").checked = admin.isActive !== false);
  renderPermissionCheckboxes(qs("#subAdminPermissions"), admin.permissions || []);
  const title = qs("#subAdminFormTitle");
  if (title) title.textContent = "Edit sub-admin";
}

function renderSubAdminList() {
  renderPermissionCheckboxes(qs("#subAdminPermissions"), qsa('#subAdminPermissions input[type="checkbox"]:checked').map((input) => input.value));
  const list = qs("#subAdminList");
  if (!list) return;
  if (!state.subAdmins.length) {
    list.innerHTML = `<div class="empty-state">No sub-admin accounts yet. Create one from the form.</div>`;
    return;
  }
  list.innerHTML = state.subAdmins.map((admin) => `
    <article class="admin-list-item">
      <div class="admin-doctor-summary">
        <span class="service-admin-photo service-admin-photo-empty" aria-hidden="true">${escapeHtml((admin.displayName || admin.username || "A").slice(0, 1).toUpperCase())}</span>
        <div><strong>${escapeHtml(admin.displayName || admin.username)}</strong><p>${escapeHtml(admin.username)} • ${admin.isActive ? "Active" : "Disabled"}</p><p>${(admin.permissions || []).map(escapeHtml).join(", ")}</p></div>
      </div>
      <div class="admin-list-actions">
        <button class="small-btn" data-sub-admin-edit="${escapeHtml(admin.id)}" type="button">Edit</button>
        <button class="small-btn danger-small" data-sub-admin-delete="${escapeHtml(admin.id)}" type="button">Delete</button>
      </div>
    </article>
  `).join("");
}

async function saveSubAdmin(event) {
  event.preventDefault();
  const id = qs("#subAdminId")?.value || "";
  const payload = {
    username: qs("#subAdminUsername")?.value || "",
    displayName: qs("#subAdminDisplayName")?.value || "",
    password: qs("#subAdminPassword")?.value || "",
    permissions: selectedSubAdminPermissions(),
    isActive: qs("#subAdminIsActive")?.checked !== false
  };
  const url = id ? `/api/admin/subadmins/${encodeURIComponent(id)}` : "/api/admin/subadmins";
  const method = id ? "PATCH" : "POST";
  await api(url, { method, body: JSON.stringify(payload) });
  toast(id ? "Sub-admin updated." : "Sub-admin created.");
  resetSubAdminForm();
  await loadAdminData();
}

async function deleteSubAdminAccount(id) {
  const confirmed = window.confirm("Delete this sub-admin account permanently?");
  if (!confirmed) return;
  await api(`/api/admin/subadmins/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Sub-admin deleted.");
  await loadAdminData();
}


function setAmbulancePhotoPreview(value = "") {
  const preview = qs("#ambulancePhotoPreview");
  if (!preview) return;
  const photo = cleanServiceMedia(value);
  preview.classList.toggle("has-photo", Boolean(photo));
  preview.innerHTML = photo ? `<img src="${escapeHtml(photo)}" alt="Ambulance photo" loading="lazy" />` : "No ambulance photo selected";
}

function resetAmbulanceEntryForm() {
  ["ambulanceEntryId", "ambulanceEntryTitle", "ambulanceEntryInfo", "ambulanceEntryPhotoUrl", "ambulanceEntryPhone", "ambulanceEntryWhatsapp"].forEach((id) => {
    const el = qs(`#${id}`); if (el) el.value = "";
  });
  if (qs("#ambulanceEntrySortOrder")) qs("#ambulanceEntrySortOrder").value = "99";
  if (qs("#ambulanceEntryIsActive")) qs("#ambulanceEntryIsActive").checked = true;
  if (qs("#ambulanceEntryFormTitle")) qs("#ambulanceEntryFormTitle").textContent = "Add custom ambulance";
  const upload = qs("#ambulanceEntryPhotoUpload"); if (upload) upload.value = "";
  setAmbulancePhotoPreview("");
}

function fillAmbulanceEntryForm(item = {}) {
  if (qs("#ambulanceEntryFormTitle")) qs("#ambulanceEntryFormTitle").textContent = `Edit ${item.title || "ambulance"}`;
  const values = {
    ambulanceEntryId: item.id || "",
    ambulanceEntryTitle: item.title || "",
    ambulanceEntryInfo: item.info || "",
    ambulanceEntryPhotoUrl: item.photoUrl || "",
    ambulanceEntryPhone: item.phone || "",
    ambulanceEntryWhatsapp: item.whatsapp || "",
    ambulanceEntrySortOrder: item.sortOrder ?? 99
  };
  Object.entries(values).forEach(([id, value]) => { const el = qs(`#${id}`); if (el) el.value = value; });
  if (qs("#ambulanceEntryIsActive")) qs("#ambulanceEntryIsActive").checked = item.isActive !== false;
  setAmbulancePhotoPreview(item.photoUrl || "");
  qs("#ambulanceEntryForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ambulanceEntryPayload() {
  return {
    title: qs("#ambulanceEntryTitle")?.value.trim() || "",
    info: qs("#ambulanceEntryInfo")?.value.trim() || "",
    photoUrl: cleanServiceMedia(qs("#ambulanceEntryPhotoUrl")?.value || ""),
    phone: qs("#ambulanceEntryPhone")?.value.trim() || "",
    whatsapp: qs("#ambulanceEntryWhatsapp")?.value.trim() || "",
    sortOrder: Number(qs("#ambulanceEntrySortOrder")?.value || 99),
    isActive: qs("#ambulanceEntryIsActive")?.checked !== false
  };
}

function renderAmbulanceAdminList() {
  const list = qs("#adminAmbulanceList");
  if (!list) return;
  const items = Array.isArray(state.ambulances) ? state.ambulances : [];
  list.innerHTML = items.length ? items.sort((a,b)=>(Number(a.sortOrder)||99)-(Number(b.sortOrder)||99)).map((item)=>`
    <article class="admin-list-item admin-service-item">
      <div class="admin-service-summary">
        ${serviceVisualMarkup(item.photoUrl || "🚑", item.title || "Ambulance", "service-admin-photo")}
        <div><strong>${escapeHtml(item.title || "Custom Ambulance")}</strong><p>${escapeHtml(item.info || "No details added.")} • ${item.isActive === false ? "Hidden" : "Visible"}</p></div>
      </div>
      <div class="admin-list-actions"><button class="small-btn" data-ambulance-edit="${escapeHtml(item.id)}" type="button">Edit</button><button class="small-btn danger-small" data-ambulance-delete="${escapeHtml(item.id)}" type="button">Delete</button></div>
    </article>`).join("") : `<div class="empty-state">No custom ambulances added yet.</div>`;
}

async function saveAmbulanceEntry(event) {
  event.preventDefault();
  const id = qs("#ambulanceEntryId")?.value || "";
  const payload = ambulanceEntryPayload();
  if (id) {
    await api(`/api/ambulances/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
    toast("Ambulance updated.");
  } else {
    await api("/api/ambulances", { method: "POST", body: JSON.stringify(payload) });
    toast("Ambulance added.");
  }
  resetAmbulanceEntryForm();
  await loadAdminData();
}

async function deleteAmbulanceEntry(id) {
  if (!window.confirm("Delete this ambulance card?")) return;
  await api(`/api/ambulances/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Ambulance deleted.");
  await loadAdminData();
}

function setHospitalPhotoPreview(value = "") {
  const preview = qs("#hospitalPhotoPreview");
  if (!preview) return;
  const photo = cleanServiceMedia(value);
  preview.classList.toggle("has-photo", Boolean(photo));
  preview.innerHTML = photo ? `<img src="${escapeHtml(photo)}" alt="Hospital photo" loading="lazy" />` : "No hospital photo selected";
}

function getCurrentHospitalGalleryPhotos() {
  return parsePhotoLines(qs("#hospitalGalleryPhotos")?.value || "").slice(0, 10);
}

function setCurrentHospitalGalleryPhotos(items = []) {
  const photos = (Array.isArray(items) ? items : []).map((item) => cleanServiceMedia(item)).filter(Boolean).slice(0, 10);
  if (qs("#hospitalGalleryPhotos")) qs("#hospitalGalleryPhotos").value = formatPhotoLines(photos);
  setHospitalGalleryPreview(photos);
}

function setHospitalGalleryPreview(items = []) {
  const preview = qs("#hospitalGalleryPreview");
  if (!preview) return;
  const photos = (Array.isArray(items) ? items : []).filter(Boolean);
  preview.innerHTML = photos.length ? photos.map((photo)=>`<span class="mini-photo-thumb"><img src="${escapeHtml(photo)}" alt="Hospital gallery photo" loading="lazy" /></span>`).join("") : `<span class="form-help">No gallery photos selected</span>`;
}

function getSelectedHospitalDoctorIds() {
  return [...document.querySelectorAll("#hospitalDoctorPicker input[data-hospital-doctor-id]:checked")]
    .map((input) => String(input.dataset.hospitalDoctorId || "").trim())
    .filter(Boolean);
}

function setSelectedHospitalDoctorIds(ids = []) {
  const selected = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || "")));
  document.querySelectorAll("#hospitalDoctorPicker input[data-hospital-doctor-id]").forEach((input) => {
    input.checked = selected.has(String(input.dataset.hospitalDoctorId || ""));
  });
}

function renderHospitalDoctorPicker(selectedIds = getSelectedHospitalDoctorIds()) {
  const picker = qs("#hospitalDoctorPicker");
  if (!picker) return;
  const doctors = (Array.isArray(state.doctors) ? state.doctors : [])
    .slice()
    .sort((a, b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99));
  if (!doctors.length) {
    picker.innerHTML = `<div class="empty-state small-empty">No doctors found. Add doctor cards first, then come back to assign them.</div>`;
    return;
  }
  const selected = new Set((Array.isArray(selectedIds) ? selectedIds : []).map((id) => String(id || "")));
  picker.innerHTML = doctors.map((doctor) => {
    const id = String(doctor.id || "");
    const designation = [doctor.designation || "", doctor.designationNote ? `(${doctor.designationNote})` : ""].filter(Boolean).join(" ");
    return `
      <label class="hospital-doctor-option">
        <input type="checkbox" data-hospital-doctor-id="${escapeHtml(id)}" ${selected.has(id) ? "checked" : ""} />
        <span>
          <strong>${escapeHtml(doctor.name || "Doctor")}</strong>
          <small>${escapeHtml([designation, doctor.specialty || "", doctor.hospital || ""].filter(Boolean).join(" • "))}</small>
        </span>
      </label>
    `;
  }).join("");
}

function resetHospitalForm() {
  ["hospitalId", "hospitalName", "hospitalPhotoUrl", "hospitalGalleryPhotos", "hospitalAddress", "hospitalPhone", "hospitalWhatsapp", "hospitalDescription", "hospitalServices"].forEach((id)=>{ const el=qs(`#${id}`); if(el) el.value=""; });
  if (qs("#hospitalSortOrder")) qs("#hospitalSortOrder").value = "99";
  if (qs("#hospitalIsActive")) qs("#hospitalIsActive").checked = true;
  if (qs("#hospitalFormTitle")) qs("#hospitalFormTitle").textContent = "Add hospital";
  const mainUpload = qs("#hospitalPhotoUpload"); if (mainUpload) mainUpload.value = "";
  const galleryUpload = qs("#hospitalGalleryUpload"); if (galleryUpload) galleryUpload.value = "";
  setHospitalPhotoPreview("");
  setHospitalGalleryPreview([]);
  renderHospitalDoctorPicker([]);
}

function fillHospitalForm(item = {}) {
  if (qs("#hospitalFormTitle")) qs("#hospitalFormTitle").textContent = `Edit ${item.name || "hospital"}`;
  const values = {
    hospitalId: item.id || "",
    hospitalName: item.name || "",
    hospitalPhotoUrl: item.photoUrl || "",
    hospitalAddress: item.address || "",
    hospitalPhone: item.phone || "",
    hospitalWhatsapp: item.whatsapp || "",
    hospitalDescription: item.description || "",
    hospitalServices: item.services || "",
    hospitalSortOrder: item.sortOrder ?? 99
  };
  Object.entries(values).forEach(([id,value])=>{ const el=qs(`#${id}`); if(el) el.value=value; });
  if (qs("#hospitalIsActive")) qs("#hospitalIsActive").checked = item.isActive !== false;
  setHospitalPhotoPreview(item.photoUrl || "");
  setCurrentHospitalGalleryPhotos(item.galleryPhotos || []);
  renderHospitalDoctorPicker(item.doctorIds || []);
  qs("#hospitalForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hospitalPayload() {
  return {
    name: qs("#hospitalName")?.value.trim() || "",
    photoUrl: cleanServiceMedia(qs("#hospitalPhotoUrl")?.value || ""),
    galleryPhotos: getCurrentHospitalGalleryPhotos(),
    doctorIds: getSelectedHospitalDoctorIds(),
    address: qs("#hospitalAddress")?.value.trim() || "",
    phone: qs("#hospitalPhone")?.value.trim() || "",
    whatsapp: qs("#hospitalWhatsapp")?.value.trim() || "",
    description: qs("#hospitalDescription")?.value.trim() || "",
    services: qs("#hospitalServices")?.value.trim() || "",
    sortOrder: Number(qs("#hospitalSortOrder")?.value || 99),
    isActive: qs("#hospitalIsActive")?.checked !== false
  };
}

function renderHospitalAdminList() {
  const list = qs("#adminHospitalList");
  if (!list) return;
  const items = Array.isArray(state.hospitals) ? state.hospitals : [];
  list.innerHTML = items.length ? items.sort((a,b)=>(Number(a.sortOrder)||99)-(Number(b.sortOrder)||99)).map((item)=>`
    <article class="admin-list-item admin-service-item">
      <div class="admin-service-summary">
        ${serviceVisualMarkup(item.photoUrl || "🏥", item.name || "Hospital", "service-admin-photo")}
        <div><strong>${escapeHtml(item.name || "Hospital")}</strong><p>${escapeHtml(item.address || item.phone || "No details added.")} • ${(Array.isArray(item.doctorIds) ? item.doctorIds.length : 0)} doctor${(Array.isArray(item.doctorIds) && item.doctorIds.length === 1) ? "" : "s"} assigned • ${item.isActive === false ? "Hidden" : "Visible"}</p></div>
      </div>
      <div class="admin-list-actions"><button class="small-btn" data-hospital-edit="${escapeHtml(item.id)}" type="button">Edit</button><button class="small-btn danger-small" data-hospital-delete="${escapeHtml(item.id)}" type="button">Delete</button></div>
    </article>`).join("") : `<div class="empty-state">No hospitals added yet.</div>`;
}

async function saveHospital(event) {
  event.preventDefault();
  const id = qs("#hospitalId")?.value || "";
  const payload = hospitalPayload();
  if (!payload.name) { toast("Add hospital name."); return; }
  if (id) {
    await api(`/api/hospitals/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
    toast("Hospital updated.");
  } else {
    await api("/api/hospitals", { method: "POST", body: JSON.stringify(payload) });
    toast("Hospital added.");
  }
  resetHospitalForm();
  await loadAdminData();
}

async function deleteHospital(id) {
  if (!window.confirm("Delete this hospital profile?")) return;
  await api(`/api/hospitals/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Hospital deleted.");
  await loadAdminData();
}

function readFileAsAdminImage(file, maxWidth = 900) {
  return resizeImageFile(file, maxWidth, 0.78, "image/jpeg");
}

function resetAboutProfileForm() {
  ["aboutProfileId", "aboutProfileName", "aboutProfileRole", "aboutProfilePhotoUrl", "aboutProfileDescription", "aboutProfileSortOrder"].forEach((id) => {
    const el = qs(`#${id}`); if (el) el.value = id === "aboutProfileSortOrder" ? "99" : "";
  });
  qs("#aboutProfileIsPublished") && (qs("#aboutProfileIsPublished").checked = true);
}

function resetAboutPostForm() {
  ["aboutPostId", "aboutPostTitle", "aboutPostExcerpt", "aboutPostCoverImage", "aboutPostAuthor", "aboutPostContent"].forEach((id) => { const el = qs(`#${id}`); if (el) el.value = ""; });
  qs("#aboutPostIsPublished") && (qs("#aboutPostIsPublished").checked = true);
}

function renderAboutAdmin() {
  const profiles = qs("#aboutProfileList");
  if (profiles) {
    profiles.innerHTML = state.aboutProfiles.length ? state.aboutProfiles.map((profile) => `
      <article class="admin-list-item">
        <div class="admin-doctor-summary">
          ${profile.photoUrl ? `<span class="service-admin-photo has-photo"><img src="${escapeHtml(profile.photoUrl)}" alt="${escapeHtml(profile.name)}" loading="lazy" /></span>` : `<span class="service-admin-photo service-admin-photo-empty">${escapeHtml((profile.name || "T").slice(0, 1).toUpperCase())}</span>`}
          <div><strong>${escapeHtml(profile.name)}</strong><p>${escapeHtml(profile.role || "Team member")} • ${profile.isPublished ? "Published" : "Draft"}</p></div>
        </div>
        <div class="admin-list-actions"><button class="small-btn" data-about-profile-edit="${escapeHtml(profile.id)}">Edit</button><button class="small-btn danger-small" data-about-profile-delete="${escapeHtml(profile.id)}">Delete</button></div>
      </article>
    `).join("") : `<div class="empty-state">No team profiles yet.</div>`;
  }
  const posts = qs("#aboutPostList");
  if (posts) {
    posts.innerHTML = state.aboutPosts.length ? state.aboutPosts.map((post) => `
      <article class="admin-list-item">
        <div class="admin-doctor-summary">
          ${post.coverImage ? `<span class="service-admin-photo has-photo"><img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" loading="lazy" /></span>` : `<span class="service-admin-photo service-admin-photo-empty">✎</span>`}
          <div><strong>${escapeHtml(post.title)}</strong><p>${escapeHtml(post.author || "Medicare At Home")} • ${post.isPublished ? "Published" : "Draft"}</p></div>
        </div>
        <div class="admin-list-actions"><button class="small-btn" data-about-post-edit="${escapeHtml(post.id)}">Edit</button><button class="small-btn danger-small" data-about-post-delete="${escapeHtml(post.id)}">Delete</button></div>
      </article>
    `).join("") : `<div class="empty-state">No blog posts yet.</div>`;
  }
}

function fillAboutProfile(profile = {}) {
  qs("#aboutProfileId") && (qs("#aboutProfileId").value = profile.id || "");
  qs("#aboutProfileName") && (qs("#aboutProfileName").value = profile.name || "");
  qs("#aboutProfileRole") && (qs("#aboutProfileRole").value = profile.role || "");
  qs("#aboutProfilePhotoUrl") && (qs("#aboutProfilePhotoUrl").value = profile.photoUrl || "");
  qs("#aboutProfileDescription") && (qs("#aboutProfileDescription").value = profile.description || "");
  qs("#aboutProfileSortOrder") && (qs("#aboutProfileSortOrder").value = profile.sortOrder || 99);
  qs("#aboutProfileIsPublished") && (qs("#aboutProfileIsPublished").checked = profile.isPublished !== false);
}

function fillAboutPost(post = {}) {
  qs("#aboutPostId") && (qs("#aboutPostId").value = post.id || "");
  qs("#aboutPostTitle") && (qs("#aboutPostTitle").value = post.title || "");
  qs("#aboutPostExcerpt") && (qs("#aboutPostExcerpt").value = post.excerpt || "");
  qs("#aboutPostCoverImage") && (qs("#aboutPostCoverImage").value = post.coverImage || "");
  qs("#aboutPostAuthor") && (qs("#aboutPostAuthor").value = post.author || "");
  qs("#aboutPostContent") && (qs("#aboutPostContent").value = post.content || "");
  qs("#aboutPostIsPublished") && (qs("#aboutPostIsPublished").checked = post.isPublished !== false);
}

async function saveAboutProfile(event) {
  event.preventDefault();
  const id = qs("#aboutProfileId")?.value || "";
  const payload = {
    name: qs("#aboutProfileName")?.value || "",
    role: qs("#aboutProfileRole")?.value || "",
    photoUrl: qs("#aboutProfilePhotoUrl")?.value || "",
    description: qs("#aboutProfileDescription")?.value || "",
    sortOrder: Number(qs("#aboutProfileSortOrder")?.value || 99),
    isPublished: qs("#aboutProfileIsPublished")?.checked !== false
  };
  await api(id ? `/api/about/profiles/${encodeURIComponent(id)}` : "/api/about/profiles", { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) });
  toast(id ? "Team profile updated." : "Team profile published.");
  resetAboutProfileForm();
  await loadAdminData();
}

async function saveAboutPost(event) {
  event.preventDefault();
  const id = qs("#aboutPostId")?.value || "";
  const payload = {
    title: qs("#aboutPostTitle")?.value || "",
    excerpt: qs("#aboutPostExcerpt")?.value || "",
    coverImage: qs("#aboutPostCoverImage")?.value || "",
    author: qs("#aboutPostAuthor")?.value || "",
    content: qs("#aboutPostContent")?.value || "",
    isPublished: qs("#aboutPostIsPublished")?.checked !== false
  };
  await api(id ? `/api/about/posts/${encodeURIComponent(id)}` : "/api/about/posts", { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) });
  toast(id ? "Blog post updated." : "Blog post published.");
  resetAboutPostForm();
  await loadAdminData();
}

function bindEvents() {
  qs("#loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await login(qs("#adminPassword").value, qs("#adminUsername")?.value || "");
    } catch (error) {
      toast(error.message || "Login failed.");
    }
  });

  Array.from(new Set(qsa("[data-logout-button], #logoutButton"))).forEach((button) => {
    button.addEventListener("click", logout);
  });
  qs("#adminBackButton")?.addEventListener("click", goBackFromAdmin);

  qsa("[data-admin-brand]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!state.token) return;
      event.preventDefault();
      setAdminMenu(false);
      setAdminPage("dashboard", true);
      loadAdminData().catch((error) => console.warn(error));
    });
  });

  qsa("[data-admin-nav]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (!hasAccess(link.dataset.adminNav)) { toast("You do not have permission for this section."); return; }
      setAdminPage(link.dataset.adminNav, true);
      if (state.token) loadAdminData().catch((error) => console.warn(error));
    });
  });

  window.addEventListener("popstate", () => {
    setAdminMenu(false);
    setAdminPage(pageFromLocation());
    if (state.token) loadAdminData().catch((error) => console.warn(error));
  });

  qs("#doctorForm")?.addEventListener("submit", async (event) => {
    try {
      await saveDoctor(event);
    } catch (error) {
      toast(error.message || "Could not save doctor.");
    }
  });


  qs("#contentPageForm")?.addEventListener("submit", async (event) => {
    try {
      await saveContentPages(event);
    } catch (error) {
      toast(error.message || "Could not save page content.");
    }
  });

  qs("#contentPagesOverview")?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-content-page-card]");
    if (!card) return;
    openContentPageEditor(card.dataset.contentPageCard || "services", true);
  });

  qs("#contentEditorBack")?.addEventListener("click", () => showContentPageOverview(true));

  qsa("#contentPageForm input, #contentPageForm textarea, #contentPageForm select").forEach((input) => {
    input.addEventListener("input", renderContentPreview);
    input.addEventListener("change", renderContentPreview);
  });

  qs("#serviceForm")?.addEventListener("submit", async (event) => {
    try {
      await saveService(event);
    } catch (error) {
      toast(error.message || "Could not save service.");
    }
  });

  qs("#resetServiceForm")?.addEventListener("click", resetServiceForm);
  qs("#saveServiceChangesButton")?.addEventListener("click", async () => {
    try {
      await commitServiceChanges();
    } catch (error) {
      toast(error.message || "Could not save service changes.");
    }
  });
  qs("#discardServiceChangesButton")?.addEventListener("click", discardServiceChanges);

  qs("#adminServiceList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-service-action]");
    if (!button) return;
    const name = button.dataset.serviceName || "";
    const entry = state.serviceDraft.find((item) => normalizeServiceKey(item.name) === normalizeServiceKey(name));
    if (button.dataset.serviceAction === "edit" && entry) {
      fillServiceForm(entry);
      return;
    }
    if (button.dataset.serviceAction === "delete") {
      try {
        await deleteService(name);
      } catch (error) {
        toast(error.message || "Could not delete service.");
      }
    }
  });


  qsa("[data-blood-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.bloodTab = button.dataset.bloodTab === "pending" ? "pending" : "approved";
      renderBloodList();
    });
  });

  qs("#adminBloodList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-blood-action]");
    if (button) {
      try {
        await handleBloodAdminAction(button);
      } catch (error) {
        toast(error.message || "Could not update blood profile.");
      }
      return;
    }

    const detailTarget = event.target.closest("[data-blood-detail-id], [data-blood-detail-card-id]");
    if (!detailTarget) return;
    const id = detailTarget.dataset.bloodDetailId || detailTarget.dataset.bloodDetailCardId || "";
    if (!id) return;
    event.preventDefault();
    openBloodAdminDetail(id);
  });

  qs("#adminBloodList")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const detailCard = event.target.closest("[data-blood-detail-card-id]");
    if (!detailCard) return;
    event.preventDefault();
    openBloodAdminDetail(detailCard.dataset.bloodDetailCardId || "");
  });

  qs("#adminBloodDetail")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-blood-action]");
    if (!button) return;
    try {
      await handleBloodAdminAction(button);
    } catch (error) {
      toast(error.message || "Could not update blood profile.");
    }
  });

  qs("#backToBloodListButton")?.addEventListener("click", () => {
    state.bloodTab = "approved";
    setAdminPage("blood", true);
    renderBloodList();
  });

  qs("#settingsForm")?.addEventListener("submit", async (event) => {
    try {
      await saveSettings(event);
    } catch (error) {
      toast(error.message || "Could not save contact settings.");
    }
  });

  qs("#ambulanceSettingsForm")?.addEventListener("submit", async (event) => {
    try {
      await saveAmbulanceSettings(event);
    } catch (error) {
      toast(error.message || "Could not save ambulance settings.");
    }
  });

  qs("#ambulanceEntryForm")?.addEventListener("submit", async (event) => {
    try { await saveAmbulanceEntry(event); } catch (error) { toast(error.message || "Could not save ambulance card."); }
  });
  qs("#resetAmbulanceEntryForm")?.addEventListener("click", resetAmbulanceEntryForm);
  const ambulanceEntryPhotoUpload = qs("#ambulanceEntryPhotoUpload");
  ambulanceEntryPhotoUpload?.addEventListener("change", async () => {
    const file = ambulanceEntryPhotoUpload.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      qs("#ambulanceEntryPhotoUrl").value = dataUrl;
      setAmbulancePhotoPreview(dataUrl);
      toast("Ambulance photo uploaded.");
    } catch (error) { toast(error.message || "Could not upload ambulance photo."); }
    finally { ambulanceEntryPhotoUpload.value = ""; }
  });
  qs("#clearAmbulancePhotoButton")?.addEventListener("click", () => { qs("#ambulanceEntryPhotoUrl").value = ""; setAmbulancePhotoPreview(""); });
  qs("#adminAmbulanceList")?.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-ambulance-edit]");
    const del = event.target.closest("[data-ambulance-delete]");
    if (edit) { const item = state.ambulances.find((row) => String(row.id) === String(edit.dataset.ambulanceEdit)); if (item) fillAmbulanceEntryForm(item); }
    if (del) { try { await deleteAmbulanceEntry(del.dataset.ambulanceDelete || ""); } catch (error) { toast(error.message || "Could not delete ambulance card."); } }
  });

  qs("#hospitalForm")?.addEventListener("submit", async (event) => {
    try { await saveHospital(event); } catch (error) { toast(error.message || "Could not save hospital."); }
  });
  qs("#resetHospitalForm")?.addEventListener("click", resetHospitalForm);
  const hospitalPhotoUpload = qs("#hospitalPhotoUpload");
  hospitalPhotoUpload?.addEventListener("change", async () => {
    const file = hospitalPhotoUpload.files?.[0]; if (!file) return;
    try { const dataUrl = await resizeImageFile(file); qs("#hospitalPhotoUrl").value = dataUrl; setHospitalPhotoPreview(dataUrl); toast("Hospital photo uploaded."); }
    catch (error) { toast(error.message || "Could not upload hospital photo."); }
    finally { hospitalPhotoUpload.value = ""; }
  });
  qs("#clearHospitalPhotoButton")?.addEventListener("click", () => { qs("#hospitalPhotoUrl").value = ""; setHospitalPhotoPreview(""); });
  const hospitalGalleryUpload = qs("#hospitalGalleryUpload");
  hospitalGalleryUpload?.addEventListener("change", async () => {
    const files = [...(hospitalGalleryUpload.files || [])].slice(0, 10); if (!files.length) return;
    try { const existing = getCurrentHospitalGalleryPhotos(); const added = []; for (const file of files) added.push(await resizeImageFile(file)); setCurrentHospitalGalleryPhotos([...existing, ...added].slice(0, 10)); toast("Hospital gallery uploaded."); }
    catch (error) { toast(error.message || "Could not upload hospital gallery."); }
    finally { hospitalGalleryUpload.value = ""; }
  });
  qs("#clearHospitalGalleryButton")?.addEventListener("click", () => { setCurrentHospitalGalleryPhotos([]); if (hospitalGalleryUpload) hospitalGalleryUpload.value = ""; });
  qs("#adminHospitalList")?.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-hospital-edit]");
    const del = event.target.closest("[data-hospital-delete]");
    if (edit) { const item = state.hospitals.find((row) => String(row.id) === String(edit.dataset.hospitalEdit)); if (item) fillHospitalForm(item); }
    if (del) { try { await deleteHospital(del.dataset.hospitalDelete || ""); } catch (error) { toast(error.message || "Could not delete hospital."); } }
  });

  qs("#resetDoctorForm")?.addEventListener("click", resetDoctorForm);
  qs("#designation")?.addEventListener("change", updateDesignationNoteVisibility);
  qs("#addChamberButton")?.addEventListener("click", () => addChamberRow({}, { focus: true }));
  qs("#chamberList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-chamber]");
    if (!button) return;
    const row = button.closest(".chamber-row");
    row?.remove();
    if (!qsa(".chamber-row", qs("#chamberList") || document).length) addChamberRow({}, { focus: true });
  });
  qs("#chamberList")?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-chamber-weekdays] input[type='checkbox']");
    if (!input) return;
    const group = input.closest("[data-chamber-weekdays]");
    const current = input.value;
    const allInputs = qsa("input[type='checkbox']", group);

    if (input.checked && chamberRangeOptions.has(current)) {
      allInputs.forEach((item) => {
        if (item !== input) item.checked = false;
      });
    } else if (input.checked) {
      allInputs.forEach((item) => {
        if (chamberRangeOptions.has(item.value)) item.checked = false;
      });
    }

    allInputs.forEach((item) => {
      item.closest(".weekday-check")?.classList.toggle("is-selected", item.checked);
    });
  });
  qs("#saveDoctorChangesButton")?.addEventListener("click", async () => {
    try {
      await commitDoctorChanges();
    } catch (error) {
      toast(error.message || "Could not save doctor changes.");
    }
  });
  qs("#discardDoctorChangesButton")?.addEventListener("click", discardDoctorChanges);

  const photoUpload = qs("#photoUpload");
  if (photoUpload) {
    photoUpload.addEventListener("change", async () => {
      const file = photoUpload.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await resizeImageFile(file);
        qs("#photoUrl").value = dataUrl;
        setPhotoPreview(dataUrl);
        toast("Photo uploaded.");
      } catch (error) {
        photoUpload.value = "";
        toast(error.message || "Could not upload photo.");
      }
    });
  }

  qs("#clearPhotoButton")?.addEventListener("click", () => {
    qs("#photoUrl").value = "";
    if (photoUpload) photoUpload.value = "";
    setPhotoPreview("");
    toast("Photo removed.");
  });

  const servicePhotoUpload = qs("#servicePhotoUpload");
  if (servicePhotoUpload) {
    servicePhotoUpload.addEventListener("change", async () => {
      const file = servicePhotoUpload.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await resizeImageFile(file);
        qs("#servicePhotoUrl").value = dataUrl;
        setServicePhotoPreview(dataUrl);
        toast("Service photo uploaded.");
      } catch (error) {
        servicePhotoUpload.value = "";
        toast(error.message || "Could not upload service photo.");
      }
    });
  }

  qs("#clearServicePhotoButton")?.addEventListener("click", () => {
    qs("#servicePhotoUrl").value = "";
    if (servicePhotoUpload) servicePhotoUpload.value = "";
    setServicePhotoPreview("");
    toast("Service photo removed.");
  });

  const servicePhotoMultiUpload = qs("#servicePhotoMultiUpload");
  if (servicePhotoMultiUpload) {
    servicePhotoMultiUpload.addEventListener("change", async () => {
      const files = [...(servicePhotoMultiUpload.files || [])].slice(0, 8);
      if (!files.length) return;
      try {
        const existing = getCurrentServicePhotos();
        const added = [];
        for (const file of files) added.push(await resizeImageFile(file));
        setCurrentServicePhotos([...existing, ...added].slice(0, 8));
        toast("Service gallery photos uploaded.");
      } catch (error) {
        toast(error.message || "Could not upload service gallery photos.");
      } finally {
        servicePhotoMultiUpload.value = "";
      }
    });
  }
  qs("#clearServicePhotosButton")?.addEventListener("click", () => {
    setCurrentServicePhotos([]);
    if (servicePhotoMultiUpload) servicePhotoMultiUpload.value = "";
    toast("Service gallery photos removed.");
  });


  qs("#storePaymentSettingsForm")?.addEventListener("submit", async (event) => {
    try {
      await savePaymentSettings(event);
    } catch (error) {
      toast(error.message || "Could not save manual payment settings.");
    }
  });

  qs("#productForm")?.addEventListener("submit", async (event) => {
    try {
      await saveProduct(event);
    } catch (error) {
      toast(error.message || "Could not save product.");
    }
  });

  qs("#resetProductForm")?.addEventListener("click", resetProductForm);

  const productPhotoUpload = qs("#productPhotoUpload");
  if (productPhotoUpload) {
    productPhotoUpload.addEventListener("change", async () => {
      const file = productPhotoUpload.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await resizeImageFile(file);
        qs("#productPhotoUrl").value = dataUrl;
        setProductPhotoPreview(dataUrl);
        toast("Product photo uploaded.");
      } catch (error) {
        productPhotoUpload.value = "";
        toast(error.message || "Could not upload product photo.");
      }
    });
  }

  qs("#clearProductPhotoButton")?.addEventListener("click", () => {
    qs("#productPhotoUrl").value = "";
    if (productPhotoUpload) productPhotoUpload.value = "";
    setProductPhotoPreview("");
    toast("Product photo removed.");
  });

  const productAdditionalPhotoUpload = qs("#productAdditionalPhotoUpload");
  if (productAdditionalPhotoUpload) {
    productAdditionalPhotoUpload.addEventListener("change", async () => {
      const files = [...(productAdditionalPhotoUpload.files || [])].slice(0, 8);
      if (!files.length) return;
      try {
        const existing = getCurrentProductAdditionalPhotos();
        const added = [];
        for (const file of files) {
          added.push(await resizeImageFile(file));
        }
        setCurrentProductAdditionalPhotos([...existing, ...added].slice(0, 8));
        toast("Additional product photos uploaded.");
      } catch (error) {
        toast(error.message || "Could not upload additional photos.");
      } finally {
        productAdditionalPhotoUpload.value = "";
      }
    });
  }

  qs("#clearProductAdditionalPhotosButton")?.addEventListener("click", () => {
    setCurrentProductAdditionalPhotos([]);
    if (productAdditionalPhotoUpload) productAdditionalPhotoUpload.value = "";
    toast("Additional product photos removed.");
  });

  qs("#adminProductList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-product-action]");
    if (!button) return;
    const id = button.dataset.id || "";
    if (button.dataset.productAction === "edit") {
      const product = state.products.find((item) => String(item.id) === String(id));
      if (product) fillProductForm(product);
    }
    if (button.dataset.productAction === "delete") {
      try {
        await deleteProductAdmin(id);
      } catch (error) {
        toast(error.message || "Could not delete product.");
      }
    }
  });

  qs("#adminOrderList")?.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-prescription-quote-form]");
    if (!form) return;
    event.preventDefault();
    try {
      await savePrescriptionQuoteAdmin(form);
    } catch (error) {
      toast(error.message || "Could not save prescription price.");
    }
  });

  qs("#adminOrderList")?.addEventListener("change", async (event) => {
    const select = event.target.closest("[data-order-status]");
    if (!select) return;
    try {
      await updateOrderStatusAdmin(select.dataset.orderStatus, select.value);
    } catch (error) {
      toast(error.message || "Could not update order status.");
    }
  });

  qs("#adminOrderList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-order-delete]");
    if (!button) return;
    try {
      await deleteOrderAdmin(button.dataset.orderDelete || "");
    } catch (error) {
      toast(error.message || "Could not delete order.");
    }
  });

  qs("#avatarForm")?.addEventListener("submit", async (event) => {
    try {
      await saveAvatar(event);
    } catch (error) {
      toast(error.message || "Could not save profile photo.");
    }
  });

  const avatarPhotoUpload = qs("#avatarPhotoUpload");
  if (avatarPhotoUpload) {
    avatarPhotoUpload.addEventListener("change", async () => {
      const file = avatarPhotoUpload.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await resizeImageFile(file, 520, 0.78, "image/jpeg");
        qs("#avatarPhotoUrl").value = dataUrl;
        setAvatarPhotoPreview(dataUrl);
        toast("Profile photo uploaded.");
      } catch (error) {
        avatarPhotoUpload.value = "";
        toast(error.message || "Could not upload profile photo.");
      }
    });
  }

  qs("#clearAvatarPhotoButton")?.addEventListener("click", () => {
    qs("#avatarPhotoUrl").value = "";
    if (avatarPhotoUpload) avatarPhotoUpload.value = "";
    setAvatarPhotoPreview("");
    toast("Profile photo removed.");
  });

  qs("#adminAvatarList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-avatar-delete]");
    if (!button) return;
    try {
      await deleteAvatarAdmin(button.dataset.avatarDelete || "");
    } catch (error) {
      toast(error.message || "Could not delete profile photo.");
    }
  });

  qs("#adminStoreUserList")?.addEventListener("click", async (event) => {
    const resetButton = event.target.closest("[data-user-password-reset]");
    const deleteButton = event.target.closest("[data-user-delete]");
    try {
      if (resetButton) {
        await resetStoreUserPasswordAdmin(resetButton.dataset.userPasswordReset || "");
        return;
      }
      if (deleteButton) {
        await deleteStoreUserAdmin(deleteButton.dataset.userDelete || "");
      }
    } catch (error) {
      toast(error.message || "Could not update user.");
    }
  });

  qs("#adminCommentList")?.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest("[data-comment-delete]");
    if (deleteButton) {
      try {
        await deleteCommentAdmin(deleteButton.dataset.commentDelete || "");
      } catch (error) {
        toast(error.message || "Could not delete review.");
      }
      return;
    }

    const button = event.target.closest("[data-comment-reply]");
    if (!button) return;
    try {
      await saveCommentReply(button.dataset.commentReply || "");
    } catch (error) {
      toast(error.message || "Could not save reply.");
    }
  });


  qs("#subAdminForm")?.addEventListener("submit", async (event) => {
    try { await saveSubAdmin(event); } catch (error) { toast(error.message || "Could not save sub-admin."); }
  });
  qs("#resetSubAdminForm")?.addEventListener("click", resetSubAdminForm);
  qs("#subAdminList")?.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-sub-admin-edit]");
    const del = event.target.closest("[data-sub-admin-delete]");
    if (edit) {
      const admin = state.subAdmins.find((item) => String(item.id) === String(edit.dataset.subAdminEdit));
      if (admin) fillSubAdminForm(admin);
    }
    if (del) {
      try { await deleteSubAdminAccount(del.dataset.subAdminDelete || ""); } catch (error) { toast(error.message || "Could not delete sub-admin."); }
    }
  });

  qs("#aboutProfileForm")?.addEventListener("submit", async (event) => {
    try { await saveAboutProfile(event); } catch (error) { toast(error.message || "Could not save team profile."); }
  });
  qs("#resetAboutProfileForm")?.addEventListener("click", resetAboutProfileForm);
  qs("#aboutPostForm")?.addEventListener("submit", async (event) => {
    try { await saveAboutPost(event); } catch (error) { toast(error.message || "Could not save blog post."); }
  });
  qs("#resetAboutPostForm")?.addEventListener("click", resetAboutPostForm);
  qs("#aboutProfilePhotoUpload")?.addEventListener("change", async () => {
    const file = qs("#aboutProfilePhotoUpload")?.files?.[0];
    if (!file) return;
    try { qs("#aboutProfilePhotoUrl").value = await readFileAsAdminImage(file); toast("Team photo uploaded."); } catch (error) { toast(error.message || "Could not upload team photo."); }
  });
  qs("#aboutPostCoverUpload")?.addEventListener("change", async () => {
    const file = qs("#aboutPostCoverUpload")?.files?.[0];
    if (!file) return;
    try { qs("#aboutPostCoverImage").value = await readFileAsAdminImage(file); toast("Blog cover uploaded."); } catch (error) { toast(error.message || "Could not upload blog cover."); }
  });
  qs("#aboutProfileList")?.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-about-profile-edit]");
    const del = event.target.closest("[data-about-profile-delete]");
    if (edit) { const profile = state.aboutProfiles.find((item) => String(item.id) === String(edit.dataset.aboutProfileEdit)); if (profile) fillAboutProfile(profile); }
    if (del && window.confirm("Delete this team profile?")) { try { await api(`/api/about/profiles/${encodeURIComponent(del.dataset.aboutProfileDelete || "")}`, { method: "DELETE" }); toast("Team profile deleted."); await loadAdminData(); } catch (error) { toast(error.message || "Could not delete team profile."); } }
  });
  qs("#aboutPostList")?.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-about-post-edit]");
    const del = event.target.closest("[data-about-post-delete]");
    if (edit) { const post = state.aboutPosts.find((item) => String(item.id) === String(edit.dataset.aboutPostEdit)); if (post) fillAboutPost(post); }
    if (del && window.confirm("Delete this blog post?")) { try { await api(`/api/about/posts/${encodeURIComponent(del.dataset.aboutPostDelete || "")}`, { method: "DELETE" }); toast("Blog post deleted."); await loadAdminData(); } catch (error) { toast(error.message || "Could not delete blog post."); } }
  });

  qs("#adminDoctorList")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === "edit") {
      const doctor = state.doctors.find((item) => String(item.id) === String(id));
      if (doctor) fillDoctorForm(doctor);
    }
    if (button.dataset.action === "delete") markDoctorForDelete(id);
    if (button.dataset.action === "undo-delete") undoDoctorDelete(id);
  });
}

initAdminTheme();
initAdminMenu();
initPasswordVisibilityToggles();
bindEvents();
applyAdminPermissions();
setPhotoPreview(qs("#photoUrl")?.value || "");
renderChamberRows([]);
setServicePhotoPreview(qs("#servicePhotoUrl")?.value || "");
setServicePhotosPreview(getCurrentServicePhotos());
setAmbulancePhotoPreview(qs("#ambulanceEntryPhotoUrl")?.value || "");
setHospitalPhotoPreview(qs("#hospitalPhotoUrl")?.value || "");
setHospitalGalleryPreview(getCurrentHospitalGalleryPhotos());
renderHospitalDoctorPicker();
updateDesignationNoteVisibility();
setProductPhotoPreview(qs("#productPhotoUrl")?.value || "");
setProductAdditionalPhotosPreview(getCurrentProductAdditionalPhotos());
resetSubAdminForm();
resetAboutProfileForm();
resetAboutPostForm();

(async function initAdminApp() {
  if (state.token) {
    const ok = await bootstrapAdminSession();
    if (!ok) {
      showAdmin(false);
      return;
    }
    const initialAdminPage = pageFromLocation();
    setAdminPage(initialAdminPage);
    if (window.location.pathname.replace(/\/+$/, "") === panelRoot && initialAdminPage !== "dashboard") {
      const url = `${panelRoot}/${initialAdminPage === "comments" ? "reviews" : initialAdminPage}`;
      history.replaceState({ page: initialAdminPage, bloodDetailId: state.bloodDetailId }, "", url);
    }
    showAdmin(true);
    loadAdminData().catch((error) => {
      console.warn(error);
      toast("Session expired or not allowed. Please login again.");
      logout();
    });
  } else {
    showAdmin(false);
  }
})();
