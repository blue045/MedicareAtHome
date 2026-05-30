const fallbackSettings = {
  siteName: "Medicare At Home",
  tagline: "Professional Home Visit Medical Service",
  description:
    "Get trusted injection, cannula, dressing, plaster and basic home medical care from available doctors and medical professionals.",
  heroHighlight: "Medical care",
  heroTitleLine: "at your home.",
  primaryButtonText: "WhatsApp Appointment",
  secondaryButtonText: "View Doctors",
  servicesButtonText: "Services",
  contactButtonText: "Contact",
  navServicesLabel: "Services",
  navStoreLabel: "Store",
  navDoctorsLabel: "Doctors",
  navAmbulanceLabel: "Ambulance",
  navHospitalLabel: "Hospital",
  navBloodLabel: "Blood",
  navHowItWorksLabel: "About",
  navContactLabel: "Contact",
  servicesPageTitle: "What we provide",
  servicesPageCopy: "Home medical services built for quick contact, clear information, and simple appointment booking.",
  storePageTitle: "Buy medicine online",
  storePageCopy: "Browse available medicines, check price and stock, then log in to order or add items to your cart.",
  doctorsPageTitle: "Choose the right professional",
  doctorsPageCopy: "Tap a card to open the full doctor profile with phone, WhatsApp, designation and chamber location.",
  ambulancePageTitle: "Need an ambulance?",
  ambulancePageCopy: "Call or message us for ambulance support. Share patient condition, pickup location and destination.",
  ambulanceDescription: "Fast ambulance contact support for Medicare At Home visitors. Use the call button for urgent help or WhatsApp to send pickup details.",
  ambulanceButtonText: "Order Ambulance",
  hospitalPageTitle: "Hospitals",
  hospitalPageCopy: "Browse hospitals by card, then open a profile to see full information and photos.",
  ambulancePhone: "+8801609672748",
  ambulanceWhatsapp: "+8801609672748",
  bloodPageTitle: "Available blood people",
  bloodPageCopy: "Tap a card to view full details. Female contact details are protected and only available through admin.",
  howPageTitle: "About Medicare At Home",
  howPageCopy: "Meet the Medicare At Home team and read published updates.",
  contactPageTitle: "Need service today?",
  contactPageCopy: "Use WhatsApp for the fastest booking. For emergency conditions, call local emergency services first.",
  loginPageTitle: "Log in",
  loginPageCopy: "Log in to order medicine, manage your cart and review delivered products.",
  signupPageTitle: "Sign up",
  signupPageCopy: "Create an account to order medicine, save cart items and rate products after delivery.",
  profilePageTitle: "My profile and orders",
  profilePageCopy: "View your profile information, cart and order status.",
  location: "Sultanpur, Feni, Bangladesh",
  email: "",
  instagramHandle: "",
  facebookUrl: "https://www.facebook.com/",
  socialLinks: [],
  phones: ["01647139287", "01609672748", "01623148949"],
  whatsapp: "8801647139287",
  serviceTags: ["Injection", "Cannula", "Dressing", "Plaster", "Home Medical Care"],
  serviceIcons: {
    Injection: "💉",
    Cannula: "🩺",
    Dressing: "🩹",
    Plaster: "🏥",
    "Home Medical Care": "🏠"
  },
  servicePhotos: {},
  serviceDescriptions: {
    Injection: "Home visit injection support from trained medical professionals.",
    Cannula: "Cannula support at home with appointment confirmation by phone or WhatsApp.",
    Dressing: "Clean wound dressing support at home after confirming patient condition.",
    Plaster: "Basic plaster care support with direct contact before appointment.",
    "Home Medical Care": "General home medical support for common care needs."
  },
  pageContent: {},
  emergencyNote:
    "This website is for home visit medical service contact. For life-threatening emergencies, contact your nearest hospital or emergency hotline immediately.",
  stats: [
    { value: "24/7", label: "Contact support" },
    { value: "5+", label: "Home care services" },
    { value: "3", label: "Contact numbers" },
    { value: "Fast", label: "WhatsApp response" }
  ]
};

const fallbackDoctors = [];

const serviceIcons = {
  injection: "💉",
  cannula: "🩺",
  dressing: "🩹",
  plaster: "🏥",
  "home medical care": "🏠"
};

const appointmentWeekdays = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const saturdayToThursday = new Set(["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"]);

const state = {
  settings: fallbackSettings,
  doctors: fallbackDoctors,
  bloodProfiles: [],
  hospitals: [],
  ambulances: [],
  visibleDoctors: [],
  query: "",
  bloodQuery: "",
  service: "",
  appointmentWeekday: "",
  aboutProfiles: [],
  aboutPosts: [],
  hospitalLoadError: false,
  hospitalsLoaded: false,
  ambulanceLoadError: false,
  ambulancesLoaded: false
};

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

function isImageMedia(value = "") {
  const media = String(value || "").trim();
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(media) || /^https?:\/\//i.test(media) || media.startsWith("/");
}

function renderServiceIcon(value = "", alt = "Service") {
  const media = String(value || "").trim();
  if (isImageMedia(media)) {
    return `<span class="service-icon has-image"><img src="${escapeHtml(media)}" alt="${escapeHtml(alt)}" loading="lazy" /></span>`;
  }
  return `<span class="service-icon">${escapeHtml(media || "✚")}</span>`;
}

function normalizePhone(phone = "") {
  return String(phone).replace(/[^0-9+]/g, "");
}

function normalizeWhatsApp(number = "") {
  const clean = String(number).replace(/[^0-9]/g, "");
  if (!clean) return "";
  if (clean.startsWith("0")) return `88${clean}`;
  return clean;
}

function normalizeDisplayLocation(value = "") {
  return String(value || "")
    .replaceAll("Feni, Barishal, Bangladesh", "Sultanpur, Feni, Bangladesh")
    .replaceAll("Feni, Barishal", "Sultanpur, Feni")
    .replaceAll("Feni and nearby areas", "Sultanpur, Feni and nearby areas")
    .replaceAll("Barishal and nearby areas", "Sultanpur, Feni and nearby areas");
}

function normalizeAboutNavLabel(value = "") {
  const label = String(value || "").trim();
  if (!label || /how\s*it\s*works/i.test(label)) return "About";
  return label;
}

function locationPermissionHelpMessage() {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Auto location needs HTTPS or localhost. Open the live HTTPS website, or type the address manually.";
  }
  return "Location permission is blocked. Tap the browser lock icon or site settings, allow Location for this website, then tap again. You can also type the address manually.";
}

function locationErrorMessage(error) {
  if (!error) return "Could not get your current location. You can type the address manually.";
  if (error.code === 1) return locationPermissionHelpMessage();
  if (error.code === 2) return "Your location is currently unavailable. Turn on GPS/mobile location, or type the address manually.";
  if (error.code === 3) return "Location request timed out. Turn on GPS and try again, or type the address manually.";
  return "Could not get your current location. You can type the address manually.";
}

function setLocationPermissionStatus(button, message = "", type = "info") {
  if (!button) return;
  const group = button.closest(".form-group") || button.parentElement;
  if (!group) return;
  let status = group.querySelector("[data-location-status]");
  if (!status) {
    status = document.createElement("small");
    status.className = "form-help location-permission-status";
    status.dataset.locationStatus = "true";
    button.insertAdjacentElement("afterend", status);
  }
  status.textContent = message;
  status.hidden = !message;
  status.classList.toggle("is-error", type === "error");
  status.classList.toggle("is-success", type === "success");
}

function canAskForLocation() {
  return Boolean(typeof window !== "undefined" && window.isSecureContext && navigator.geolocation);
}

function getCurrentPositionPromise() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(new Error(locationPermissionHelpMessage()));
      return;
    }
    if (!navigator.geolocation) {
      reject(new Error("Auto location is not supported on this browser. Please type the address manually."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    });
  });
}

async function updateLocationPermissionStatus(button) {
  if (!button) return;
  if (typeof window !== "undefined" && !window.isSecureContext) {
    setLocationPermissionStatus(button, locationPermissionHelpMessage(), "error");
    return;
  }
  if (!navigator.geolocation) {
    setLocationPermissionStatus(button, "Auto location is not supported on this browser. Please type the address manually.", "error");
    button.disabled = true;
    return;
  }
  if (!navigator.permissions?.query) return;
  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    if (permission.state === "denied") {
      setLocationPermissionStatus(button, locationPermissionHelpMessage(), "error");
    }
    permission.onchange = () => {
      if (permission.state === "denied") setLocationPermissionStatus(button, locationPermissionHelpMessage(), "error");
      if (permission.state === "granted") setLocationPermissionStatus(button, "Location permission allowed. Tap the button to auto-fill your address.", "success");
      if (permission.state === "prompt") setLocationPermissionStatus(button, "Tap the button and choose Allow when your browser asks for location permission.", "info");
    };
  } catch {
    // Some browsers do not support querying geolocation permission state.
  }
}

function mapLinkFromCoords(latitude, longitude) {
  return `https://www.google.com/maps?q=${encodeURIComponent(latitude)},${encodeURIComponent(longitude)}`;
}

function compactAreaFromAddress(address = {}, displayName = "") {
  const parts = [
    address.suburb || address.neighbourhood || address.quarter || address.village || address.town || address.city,
    address.city_district || address.county || address.state_district,
    address.state,
    address.country
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  const uniqueParts = [...new Set(parts)];
  if (uniqueParts.length) return uniqueParts.join(", ");
  return String(displayName || "").split(",").slice(-4).map((part) => part.trim()).filter(Boolean).join(", ");
}

async function reverseGeocodeLocation(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=18&addressdetails=1&accept-language=en`;
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Address lookup failed.");
    const data = await response.json();
    return {
      fullAddress: data.display_name || "",
      shortAddress: compactAreaFromAddress(data.address || {}, data.display_name || "")
    };
  } catch (error) {
    console.warn(error);
    return { fullAddress: "", shortAddress: "" };
  }
}

function setLocationFieldValue(selector, value) {
  const field = qs(selector);
  if (!field || !value) return;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

async function fillLocationFromPermission(button) {
  const targetSelector = button.dataset.locationTarget || "";
  const shortTargetSelector = button.dataset.locationShortTarget || "";
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Getting location...";
  setLocationPermissionStatus(button, "Waiting for location permission...", "info");
  try {
    const position = await getCurrentPositionPromise();
    const { latitude, longitude } = position.coords || {};
    if (typeof latitude !== "number" || typeof longitude !== "number") throw new Error("Invalid location data.");
    const lookup = await reverseGeocodeLocation(latitude, longitude);
    const coordsText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    const mapUrl = mapLinkFromCoords(latitude.toFixed(6), longitude.toFixed(6));
    const fullAddress = [lookup.fullAddress || `GPS Location: ${coordsText}`, `Google Maps: ${mapUrl}`].filter(Boolean).join("\n");
    setLocationFieldValue(targetSelector, fullAddress);
    if (shortTargetSelector) setLocationFieldValue(shortTargetSelector, lookup.shortAddress || coordsText);
    setLocationPermissionStatus(button, "Location selected successfully.", "success");
    toast("Location selected successfully.");
  } catch (error) {
    const message = error && typeof error.code === "number" ? locationErrorMessage(error) : error.message || "Could not select location. You can type the address manually.";
    setLocationPermissionStatus(button, message, "error");
    toast(message);
  } finally {
    button.disabled = false;
    button.textContent = originalText || "Use my current location";
  }
}

function initLocationPermissionButtons(root = document) {
  qsa("[data-use-current-location]", root).forEach((button) => {
    if (button.dataset.locationReady === "true") return;
    button.dataset.locationReady = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      fillLocationFromPermission(button);
    });
    updateLocationPermissionStatus(button);
  });
}

function normalizeDoctorChambers(doctor = {}) {
  const chambers = Array.isArray(doctor.chambers) ? doctor.chambers : [];
  const clean = chambers
    .map((item) => ({
      location: normalizeDisplayLocation(item?.location || ""),
      weekday: String(item?.weekday || item?.weekdays || "").trim(),
      time: String(item?.time || item?.times || "").trim()
    }))
    .filter((item) => item.location || item.weekday || item.time);
  if (clean.length) return clean;
  const legacyLocation = normalizeDisplayLocation(doctor.serviceArea || "");
  const legacyAvailable = String(doctor.available || "").trim();
  if (!legacyLocation && !legacyAvailable) return [];
  return [{ location: legacyLocation, weekday: "Everyday", time: legacyAvailable || "9:00 AM - 10:00 PM" }];
}

function renderDoctorChambers(doctor = {}) {
  const chambers = normalizeDoctorChambers(doctor).filter((item) => item.location && item.weekday && item.time);
  if (!chambers.length) return "";
  return `
    <div class="doctor-chamber-section">
      <h3>Chamber Location</h3>
      <div class="doctor-chamber-list">
        ${chambers.map((item) => `
          <div class="doctor-chamber-item">
            <strong>${escapeHtml(item.location)}</strong>
            <span>${escapeHtml(item.weekday)} • ${escapeHtml(item.time)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function normalizeAppointmentWeekday(value = "") {
  const clean = String(value || "").trim().toLowerCase();
  return appointmentWeekdays.find((weekday) => weekday.toLowerCase() === clean) || "";
}

function getAppointmentWeekdayFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return normalizeAppointmentWeekday(params.get("weekday") || "");
  } catch (error) {
    return "";
  }
}

function chamberMatchesWeekday(chamber = {}, weekday = "") {
  const selected = normalizeAppointmentWeekday(weekday).toLowerCase();
  if (!selected) return false;
  const raw = String(chamber.weekday || chamber.weekdays || "").trim().toLowerCase();
  if (!raw) return false;
  const compact = raw.replace(/\s+/g, " ");
  if (compact.includes("everyday") || compact.includes("daily")) return true;
  if (compact.includes("saturday - thursday") || compact.includes("saturday-thursday") || compact.includes("saturday to thursday")) {
    return saturdayToThursday.has(selected);
  }
  return compact.split(/[,/|]+/).some((part) => part.trim() === selected) || compact.includes(selected);
}

function doctorAvailableOnWeekday(doctor = {}, weekday = "") {
  if (doctor.isActive === false) return false;
  return normalizeDoctorChambers(doctor).some((chamber) => chamberMatchesWeekday(chamber, weekday));
}

function matchingDoctorChambers(doctor = {}, weekday = "") {
  return normalizeDoctorChambers(doctor)
    .filter((chamber) => chamber.location && chamber.time && chamberMatchesWeekday(chamber, weekday))
    .slice(0, 2);
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";
}

function slugify(value = "") {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "doctor";
}

function doctorUrl(doctor = {}) {
  const id = String(doctor.id || "").trim();
  const nameSlug = slugify(doctor.name || doctor.specialty || "doctor");
  return `/doctor/${encodeURIComponent(id ? `${id}-${nameSlug}` : nameSlug)}`;
}

function serviceUrl(serviceName = "") {
  return `/Services/${encodeURIComponent(slugify(serviceName || "service"))}`;
}

function doctorDesignationText(doctor = {}) {
  const designation = String(doctor.designation || "").trim();
  const note = String(doctor.designationNote || "").trim();
  if (designation && note) return `${designation} (${note})`;
  return designation;
}

function hospitalUrl(hospital = {}) {
  const id = String(hospital.id || "").trim();
  const nameSlug = slugify(hospital.name || "hospital");
  // Query-string routing is safer on Cloudflare Pages because it does not depend
  // on dynamic redirect matching for capitalized /Hospital/:slug paths. The
  // old pretty URL still works through getHospitalDetailSlug() below.
  if (id) return `/Hospital?hospital=${encodeURIComponent(id)}&name=${encodeURIComponent(nameSlug)}`;
  return `/Hospital/${encodeURIComponent(nameSlug)}`;
}

function hospitalMatchesSlug(hospital = {}, slug = "") {
  const cleanSlug = decodeURIComponent(String(slug || "")).replace(/^\/+|\/+$/g, "");
  if (!cleanSlug) return false;
  const id = String(hospital.id || "");
  if (id && (cleanSlug === id || cleanSlug.startsWith(`${id}-`))) return true;
  return cleanSlug === slugify(hospital.name || "hospital");
}

function getHospitalDetailSlug() {
  const params = new URLSearchParams(window.location.search || "");
  const queryId = params.get("hospital") || params.get("id");
  if (queryId) return decodeURIComponent(String(queryId));
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() !== "hospital" || !parts[1]) return "";
  return decodeURIComponent(parts.slice(1).join("/"));
}

function isHospitalDetailPath() {
  return Boolean(getHospitalDetailSlug());
}

function ambulanceUrl(ambulance = {}) {
  const id = String(ambulance.id || "").trim();
  const nameSlug = slugify(ambulance.title || "ambulance");
  if (id) return `/Ambulance?ambulance=${encodeURIComponent(id)}&name=${encodeURIComponent(nameSlug)}`;
  return `/Ambulance/${encodeURIComponent(nameSlug)}`;
}

function ambulanceMatchesSlug(ambulance = {}, slug = "") {
  const cleanSlug = decodeURIComponent(String(slug || "")).replace(/^\/+|\/+$/g, "");
  if (!cleanSlug) return false;
  const id = String(ambulance.id || "");
  if (id && (cleanSlug === id || cleanSlug.startsWith(`${id}-`))) return true;
  return cleanSlug === slugify(ambulance.title || "ambulance");
}

function getAmbulanceDetailSlug() {
  const params = new URLSearchParams(window.location.search || "");
  const queryId = params.get("ambulance") || params.get("id");
  if (queryId) return decodeURIComponent(String(queryId));
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() !== "ambulance" || !parts[1]) return "";
  return decodeURIComponent(parts.slice(1).join("/"));
}

function isAmbulanceDetailPath() {
  return Boolean(getAmbulanceDetailSlug());
}

function getServiceDefinitions() {
  const services = state.settings.serviceTags?.length
    ? state.settings.serviceTags
    : [...new Set(state.doctors.flatMap((doctor) => doctor.services || []))];
  const customIcons = state.settings.serviceIcons && typeof state.settings.serviceIcons === "object" ? state.settings.serviceIcons : {};
  const customDescriptions = state.settings.serviceDescriptions && typeof state.settings.serviceDescriptions === "object" ? state.settings.serviceDescriptions : {};
  const customPhotos = state.settings.servicePhotos && typeof state.settings.servicePhotos === "object" ? state.settings.servicePhotos : {};
  return (services.length ? services : fallbackSettings.serviceTags)
    .map((service) => {
      const name = String(service || "").trim();
      const key = name.toLowerCase();
      return {
        name,
        slug: slugify(name),
        icon: customIcons[name] || customIcons[key] || serviceIcons[key] || fallbackSettings.serviceIcons?.[name] || "✚",
        photos: Array.isArray(customPhotos[name]) ? customPhotos[name] : (Array.isArray(customPhotos[key]) ? customPhotos[key] : []),
        description: customDescriptions[name] || customDescriptions[key] || fallbackSettings.serviceDescriptions?.[name] || ""
      };
    })
    .filter((service) => service.name);
}

function getServiceSlug() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() !== "services" || !parts[1]) return "";
  return decodeURIComponent(parts.slice(1).join("/")).replace(/^\/+|\/+$/g, "");
}

function doctorMatchesSlug(doctor = {}, slug = "") {
  const cleanSlug = decodeURIComponent(String(slug || "")).replace(/^\/+|\/+$/g, "");
  if (!cleanSlug) return false;
  const id = String(doctor.id || "");
  if (id && (cleanSlug === id || cleanSlug.startsWith(`${id}-`))) return true;
  return cleanSlug === slugify(doctor.name || doctor.specialty || "doctor");
}

function bloodUrl(profile = {}) {
  const id = String(profile.id || "").trim();
  const nameSlug = slugify(profile.fullName || profile.bloodGroup || "blood");
  return `/Blood/${encodeURIComponent(id ? `${id}-${nameSlug}` : nameSlug)}`;
}

function bloodMatchesSlug(profile = {}, slug = "") {
  const cleanSlug = decodeURIComponent(String(slug || "")).replace(/^\/+|\/+$/g, "");
  if (!cleanSlug) return false;
  const id = String(profile.id || "");
  if (id && (cleanSlug === id || cleanSlug.startsWith(`${id}-`))) return true;
  return cleanSlug === slugify(profile.fullName || profile.bloodGroup || "blood");
}

function getBloodPathParts() {
  return window.location.pathname.split("/").filter(Boolean);
}

function getBloodDetailSlug() {
  const parts = getBloodPathParts();
  if (!parts.length || parts[0].toLowerCase() !== "blood") return "";
  return parts.slice(1).join("/");
}

function isBloodDetailPath() {
  return Boolean(getBloodDetailSlug());
}

function formatGender(profile = {}) {
  if (profile.gender === "other") return profile.customGender || "Other";
  return profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "";
}
function bloodGroupRank(group = "") {
  const normalized = String(group || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace("POSITIVE", "+")
    .replace("NEGATIVE", "-");
  const order = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const index = order.indexOf(normalized);
  return index === -1 ? order.length : index;
}

function sortBloodProfiles(profiles = []) {
  return [...profiles].sort((a, b) => {
    const byBlood = bloodGroupRank(a.bloodGroup) - bloodGroupRank(b.bloodGroup);
    if (byBlood !== 0) return byBlood;
    return String(a.fullName || "").localeCompare(String(b.fullName || ""));
  });
}

function bloodProfileMatches(profile = {}) {
  const query = state.bloodQuery.trim().toLowerCase();
  if (!query) return true;
  return [profile.fullName, profile.bloodGroup, formatGender(profile)]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
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

const publicCachePrefix = "medicare_public_cache_v5:";
const publicCacheMaxAge = 5 * 60 * 1000;

function readPublicCache(key, maxAge = publicCacheMaxAge) {
  try {
    const cached = JSON.parse(localStorage.getItem(`${publicCachePrefix}${key}`) || "null");
    if (!cached || !cached.timestamp || Date.now() - cached.timestamp > maxAge) return null;
    return cached.data || null;
  } catch {
    return null;
  }
}

function writePublicCache(key, data) {
  try {
    localStorage.setItem(`${publicCachePrefix}${key}`, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // Large data URLs can fill storage. Ignore cache errors and keep the page usable.
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeout || 9000);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: options.cache || "default",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function applyCachedPublicData(needsDoctors, needsBlood, needsHospitals, needsAmbulances) {
  const cachedSettings = readPublicCache("settings");
  if (cachedSettings?.settings) state.settings = { ...fallbackSettings, ...cachedSettings.settings };

  if (needsDoctors) {
    const cachedDoctors = readPublicCache("doctors");
    if (Array.isArray(cachedDoctors?.doctors)) state.doctors = cachedDoctors.doctors;
  }

  if (needsHospitals) {
    const cachedHospitals = readPublicCache("hospitals");
    if (Array.isArray(cachedHospitals?.hospitals)) state.hospitals = cachedHospitals.hospitals;
  }

  if (needsAmbulances) {
    const cachedAmbulances = readPublicCache("ambulances");
    if (Array.isArray(cachedAmbulances?.ambulances)) state.ambulances = cachedAmbulances.ambulances;
  }

  // Blood approvals must appear immediately after admin approval, so do not
  // show a stale localStorage blood list before the fresh API request returns.
  if (needsBlood) {
    state.bloodProfiles = [];
  }
}

async function loadData() {
  const needsDoctors = Boolean(qs("#doctorsGrid") || qs("#doctorDetailPage") || qs("#serviceFilter") || qs("#appointmentDoctorsGrid"));
  const needsBlood = Boolean(qs("#bloodGrid") || qs("#bloodDetailPage"));
  const needsAbout = Boolean(qs("#aboutProfilesGrid") || qs("#aboutPostsGrid"));
  const needsHospitals = Boolean(qs("#hospitalGrid") || qs("#hospitalDetailPage"));
  const needsAmbulances = Boolean(qs("#customAmbulanceGrid") || qs("#ambulancePage") || qs("#ambulanceDetailPage"));

  // Render immediately with fallback or cached content so users do not stare at blank sections.
  applyCachedPublicData(needsDoctors, needsBlood, needsHospitals, needsAmbulances);
  renderAll();

  // Load each public resource independently. One broken API must not keep another
  // page stuck on a loading message.
  try {
    const settingsResponse = await fetchJson(`/api/settings?fresh=${Date.now()}`, { cache: "no-store" });
    state.settings = { ...fallbackSettings, ...(settingsResponse.settings || {}) };
    writePublicCache("settings", settingsResponse);
    renderAll();
  } catch (error) {
    console.warn("Could not load settings", error);
  }

  const tasks = [];

  if (needsDoctors) {
    tasks.push((async () => {
      try {
        const doctorsResponse = await fetchJson(`/api/doctors?fresh=${Date.now()}`, { cache: "no-store" });
        state.doctors = Array.isArray(doctorsResponse?.doctors) ? doctorsResponse.doctors : fallbackDoctors;
        writePublicCache("doctors", doctorsResponse);
      } catch (error) {
        console.warn("Could not load doctors", error);
        state.doctors = Array.isArray(state.doctors) ? state.doctors : fallbackDoctors;
      }
    })());
  }

  if (needsBlood) {
    tasks.push((async () => {
      try {
        const bloodResponse = await fetchJson(`/api/blood?fresh=${Date.now()}`, { cache: "no-store" });
        state.bloodProfiles = Array.isArray(bloodResponse?.profiles) ? bloodResponse.profiles : [];
      } catch (error) {
        console.warn("Could not load blood profiles", error);
        state.bloodProfiles = [];
      }
    })());
  }

  if (needsHospitals) {
    tasks.push((async () => {
      try {
        state.hospitalLoadError = false;
        const hospitalsResponse = await fetchJson(`/api/hospitals?fresh=${Date.now()}`, { cache: "no-store" });
        state.hospitals = Array.isArray(hospitalsResponse?.hospitals) ? hospitalsResponse.hospitals : [];
        state.hospitalsLoaded = true;
        writePublicCache("hospitals", hospitalsResponse);
      } catch (error) {
        console.warn("Could not load hospitals", error);
        state.hospitalLoadError = true;
        state.hospitalsLoaded = true;
        state.hospitals = Array.isArray(state.hospitals) ? state.hospitals : [];
      }
    })());
  }

  if (needsAmbulances) {
    tasks.push((async () => {
      try {
        state.ambulanceLoadError = false;
        const ambulancesResponse = await fetchJson(`/api/ambulances?fresh=${Date.now()}`, { cache: "no-store" });
        state.ambulances = Array.isArray(ambulancesResponse?.ambulances) ? ambulancesResponse.ambulances : [];
        state.ambulancesLoaded = true;
        writePublicCache("ambulances", ambulancesResponse);
      } catch (error) {
        console.warn("Could not load ambulances", error);
        state.ambulanceLoadError = true;
        state.ambulancesLoaded = true;
        state.ambulances = Array.isArray(state.ambulances) ? state.ambulances : [];
      }
    })());
  }

  if (needsAbout) {
    tasks.push((async () => {
      try {
        const aboutResponse = await fetchJson(`/api/about?fresh=${Date.now()}`, { cache: "no-store" });
        state.aboutProfiles = Array.isArray(aboutResponse?.profiles) ? aboutResponse.profiles : [];
        state.aboutPosts = Array.isArray(aboutResponse?.posts) ? aboutResponse.posts : [];
      } catch (error) {
        console.warn("Could not load about content", error);
        state.aboutProfiles = [];
        state.aboutPosts = [];
      }
    })());
  }

  if (tasks.length) await Promise.allSettled(tasks);
  renderAll();
}

function renderAll() {
  renderBranding();
  renderStats();
  renderServices();
  renderServiceDetailPage();
  renderFilters();
  renderDoctors();
  renderDoctorPage();
  renderAppointmentDoctors();
  renderBloodList();
  renderBloodPage();
  renderAmbulancePage();
  renderHospitals();
  renderHospitalPage();
  renderContact();
  renderAboutPage();
}


function isRemovedAppointmentFlowText(value = "") {
  const text = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  return text === "simple appointment flow"
    || text.includes("simple appointment flow")
    || text.includes("contact the team, confirm the patient details")
    || text.includes("then receive the requested home visit service");
}

function cleanRemovedAppointmentFlowText(value = "", fallback = "") {
  return isRemovedAppointmentFlowText(value) ? fallback : value;
}

function isRemovedAppointmentFlowItem(item = {}) {
  return [
    item.title,
    item.name,
    item.excerpt,
    item.content,
    item.description,
    item.bio
  ].some(isRemovedAppointmentFlowText);
}

function renderAboutPage() {
  const profilesGrid = qs("#aboutProfilesGrid");
  const postsGrid = qs("#aboutPostsGrid");
  if (profilesGrid) {
    const profiles = (Array.isArray(state.aboutProfiles) ? state.aboutProfiles : []).filter((profile) => !isRemovedAppointmentFlowItem(profile));
    profilesGrid.innerHTML = profiles.length
      ? profiles.map((profile) => `
        <article class="about-profile-card">
          ${profile.photoUrl ? `<img class="about-profile-photo" src="${escapeHtml(profile.photoUrl)}" alt="${escapeHtml(profile.name || "Team member")}" loading="lazy" />` : `<span class="about-profile-photo about-profile-empty" aria-hidden="true">${escapeHtml((profile.name || "M").slice(0, 1).toUpperCase())}</span>`}
          <div>
            <p class="section-kicker">${escapeHtml(profile.role || "Team member")}</p>
            <h3>${escapeHtml(profile.name || "Team member")}</h3>
            ${profile.description ? `<p>${escapeHtml(profile.description)}</p>` : ""}
          </div>
        </article>
      `).join("")
      : `<div class="empty-state">Team profiles will appear here after admin publishes them.</div>`;
  }
  if (postsGrid) {
    const posts = (Array.isArray(state.aboutPosts) ? state.aboutPosts : []).filter((post) => !isRemovedAppointmentFlowItem(post));
    postsGrid.innerHTML = posts.length
      ? posts.map((post) => `
        <article class="about-post-card">
          ${post.coverImage ? `<img class="about-post-cover" src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title || "Blog post")}" loading="lazy" />` : ""}
          <div class="about-post-body">
            <p class="section-kicker">${escapeHtml(post.author || "Medicare At Home")}</p>
            <h3>${escapeHtml(post.title || "Blog post")}</h3>
            ${post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : ""}
            ${post.content ? `<div class="about-post-content">${escapeHtml(post.content).replaceAll("\n", "<br />")}</div>` : ""}
          </div>
        </article>
      `).join("")
      : `<div class="empty-state">Published blog posts will appear here.</div>`;
  }
}

function renderBranding() {
  const settings = state.settings;
  const pageTitle = document.body?.dataset?.pageTitle;
  document.title = pageTitle
    ? `${pageTitle} | ${settings.siteName || "Medicare At Home"}`
    : `${settings.siteName || "Medicare At Home"} | Home Visit Medical Service`;
  qsa("[data-site-name]").forEach((node) => (node.textContent = settings.siteName || fallbackSettings.siteName));
  qsa("[data-site-description]").forEach((node) => (node.textContent = settings.description || fallbackSettings.description));
  qsa("[data-hero-highlight]").forEach((node) => (node.textContent = settings.heroHighlight || fallbackSettings.heroHighlight));
  qsa("[data-hero-title-line]").forEach((node) => (node.textContent = settings.heroTitleLine || fallbackSettings.heroTitleLine));
  qsa("[data-primary-action-label]").forEach((node) => (node.textContent = settings.primaryButtonText || fallbackSettings.primaryButtonText));
  qsa("[data-secondary-action-label]").forEach((node) => (node.textContent = settings.secondaryButtonText || fallbackSettings.secondaryButtonText));
  qsa("[data-ambulance-action-label]").forEach((node) => (node.textContent = settings.ambulanceButtonText || fallbackSettings.ambulanceButtonText));
  qsa("[data-services-action-label]").forEach((node) => (node.textContent = settings.servicesButtonText || fallbackSettings.servicesButtonText));
  qsa("[data-contact-action-label]").forEach((node) => (node.textContent = settings.contactButtonText || fallbackSettings.contactButtonText));
  const aboutNavLabel = normalizeAboutNavLabel(settings.navHowItWorksLabel || fallbackSettings.navHowItWorksLabel);
  qsa("[data-about-action-label]").forEach((node) => (node.textContent = aboutNavLabel));
  const pageContent = settings.pageContent && typeof settings.pageContent === "object" ? settings.pageContent : {};
  const navLabels = [
    ["/Services", pageContent.services?.label || settings.navServicesLabel || fallbackSettings.navServicesLabel, pageContent.services?.hidden],
    ["/Store", pageContent.store?.label || settings.navStoreLabel || fallbackSettings.navStoreLabel, pageContent.store?.hidden],
    ["/Doctors", pageContent.doctors?.label || settings.navDoctorsLabel || fallbackSettings.navDoctorsLabel, pageContent.doctors?.hidden],
    ["/Ambulance", pageContent.ambulance?.label || settings.navAmbulanceLabel || fallbackSettings.navAmbulanceLabel, pageContent.ambulance?.hidden],
    ["/Hospital", pageContent.hospital?.label || settings.navHospitalLabel || fallbackSettings.navHospitalLabel, pageContent.hospital?.hidden],
    ["/Blood", pageContent.blood?.label || settings.navBloodLabel || fallbackSettings.navBloodLabel, pageContent.blood?.hidden],
    ["/Contact", pageContent.contact?.label || settings.navContactLabel || fallbackSettings.navContactLabel, pageContent.contact?.hidden],
    ["/About", pageContent.about?.label || aboutNavLabel, pageContent.about?.hidden]
  ];
  navLabels.forEach(([href, label, hidden]) => {
    qsa(`.nav-links a[href="${href}"]`).forEach((node) => {
      node.textContent = label;
      node.hidden = hidden === true;
    });
  });
  renderEditablePageText(settings);
  qsa("[data-footer-location]").forEach((node) => (node.textContent = normalizeDisplayLocation(settings.location || fallbackSettings.location)));
  qsa("[data-emergency-note]").forEach((node) => (node.textContent = settings.emergencyNote || fallbackSettings.emergencyNote));

  const whatsAppNumber = normalizeWhatsApp(settings.whatsapp || settings.phones?.[0] || fallbackSettings.whatsapp);
  const whatsAppMessage = encodeURIComponent(`Hello ${settings.siteName || "Medicare At Home"}, I need home medical service.`);
  const whatsAppHref = whatsAppNumber ? `https://wa.me/${whatsAppNumber}?text=${whatsAppMessage}` : "/Contact";
  const primaryPhone = normalizePhone(settings.phones?.[0] || fallbackSettings.phones[0]);

  qsa("[data-whatsapp-link]").forEach((link) => {
    link.href = whatsAppHref;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  qsa("[data-primary-phone-link]").forEach((link) => {
    link.href = primaryPhone ? `tel:${primaryPhone}` : "/Contact";
  });

  const heroChecks = qs("#heroChecks");
  if (heroChecks) {
    heroChecks.innerHTML = (settings.serviceTags || fallbackSettings.serviceTags)
      .slice(0, 3)
      .map((tag) => `<span class="check-pill">${escapeHtml(tag)}</span>`)
      .join("");
  }
}

function editablePageContentFor(pageKey, settings = state.settings) {
  const map = {
    "Main Page": ["main", "heroTitleLine", "description"],
    Services: ["services", "servicesPageTitle", "servicesPageCopy"],
    Store: ["store", "storePageTitle", "storePageCopy"],
    Doctors: ["doctors", "doctorsPageTitle", "doctorsPageCopy"],
    Ambulance: ["ambulance", "ambulancePageTitle", "ambulancePageCopy"],
    Hospital: ["hospital", "hospitalPageTitle", "hospitalPageCopy"],
    Blood: ["blood", "bloodPageTitle", "bloodPageCopy"],
    About: ["about", "howPageTitle", "howPageCopy"],
    Contact: ["contact", "contactPageTitle", "contactPageCopy"],
    "Log in": ["login", "loginPageTitle", "loginPageCopy"],
    "Sign up": ["signup", "signupPageTitle", "signupPageCopy"],
    "Product Dashboard": ["profile", "profilePageTitle", "profilePageCopy"]
  };
  const fields = map[pageKey];
  if (!fields) return null;
  const [contentKey, titleKey, copyKey] = fields;
  const custom = settings.pageContent && typeof settings.pageContent === "object" ? settings.pageContent[contentKey] || {} : {};
  let titleText = custom.title || settings[titleKey];
  let copyText = custom.copy || settings[copyKey];
  if (pageKey === "About") {
    titleText = cleanRemovedAppointmentFlowText(titleText, fallbackSettings.howPageTitle);
    copyText = cleanRemovedAppointmentFlowText(copyText, fallbackSettings.howPageCopy);
  }
  return {
    key: contentKey,
    title: titleText,
    copy: copyText,
    badge: custom.badge || (contentKey === "main" ? settings.heroHighlight || fallbackSettings.heroHighlight : ""),
    body: custom.body || "",
    bannerImage: custom.bannerImage || "",
    noticeTitle: custom.noticeTitle || "",
    noticeText: custom.noticeText || "",
    listTitle: custom.listTitle || "",
    listCopy: custom.listCopy || "",
    bottomNote: custom.bottomNote || "",
    blocks: Array.isArray(custom.blocks) ? custom.blocks : [],
    primaryLabel: custom.primaryLabel || "",
    primaryUrl: custom.primaryUrl || "",
    secondaryLabel: custom.secondaryLabel || "",
    secondaryUrl: custom.secondaryUrl || "",
    layout: custom.layout || "standard",
    hidden: custom.hidden === true,
    hideDefaultModule: custom.hideDefaultModule === true
  };
}

function pageDefaultModuleSelectors(pageKey) {
  return {
    main: ["#doctorAppointmentForm", ".spacebook-hero .hero-actions", ".stats-showcase"],
    services: ["#servicesGrid"],
    store: [".store-hub-grid"],
    doctors: [".doctor-search-bar", "#doctorsGrid"],
    ambulance: ["#customAmbulanceGrid", "#ambulanceSupportSection"],
    hospital: ["#hospitalGrid"],
    blood: [".blood-search-bar", "#bloodGrid", ".blood-add-cta"],
    contact: ["#contactList", "#contact .panel-card"],
    about: ["#aboutPage .about-layout"]
  }[pageKey] || [];
}

function applyDefaultModuleVisibility(content) {
  pageDefaultModuleSelectors(content.key).forEach((selector) => {
    qsa(selector).forEach((node) => {
      node.hidden = content.hideDefaultModule === true;
      node.classList.toggle("admin-hidden-page-module", content.hideDefaultModule === true);
    });
  });
}

function ensureAdminBlock(anchor, selector, className) {
  let node = qs(selector);
  if (!node) {
    node = document.createElement("div");
    node.className = className;
    const attr = selector.match(/\[([^=]+)=\"([^\"]+)\"\]/);
    if (attr) node.setAttribute(attr[1], attr[2]);
    anchor?.insertAdjacentElement("afterend", node);
  }
  node.hidden = false;
  return node;
}

function removeAdminBlock(selector) {
  const node = qs(selector);
  if (node) node.remove();
}

function renderEditablePageText(settings = state.settings) {
  const pageKey = document.body?.dataset?.pageTitle || "";
  const content = editablePageContentFor(pageKey, settings);
  if (!content) return;

  const title = qs("[data-editable-page-title]") || qs("main .section-title");
  const copy = qs("[data-editable-page-copy]") || qs("main .section-copy");
  if (content.key === "main") {
    const heroHighlight = qs("[data-hero-highlight]");
    const heroTitleLine = qs("[data-hero-title-line]");
    if (heroHighlight && content.badge) heroHighlight.textContent = content.badge;
    if (heroTitleLine && content.title) heroTitleLine.textContent = content.title;
  } else if (title && content.title) {
    title.textContent = content.title;
  }
  if (copy && content.copy) copy.textContent = content.copy;

  const firstKicker = qs("main .section-kicker");
  if (firstKicker && content.badge && content.key !== "main") firstKicker.textContent = content.badge;

  document.body.classList.remove("page-layout-standard", "page-layout-compact", "page-layout-wide", "page-layout-split", "page-layout-cards-first");
  document.body.classList.add(`page-layout-${content.layout || "standard"}`);
  document.body.classList.toggle("content-page-custom-only", content.hideDefaultModule === true);

  const host = copy?.parentElement || title?.parentElement || qs("main");
  if (!host) return;

  let anchor = copy || title;
  const textValue = (value) => typeof value === "string" ? value.trim() : "";
  const bodyText = textValue(content.body);
  const bannerImage = textValue(content.bannerImage);
  const noticeTitle = textValue(content.noticeTitle);
  const noticeText = textValue(content.noticeText);
  const listTitle = textValue(content.listTitle);
  const listCopy = textValue(content.listCopy);
  const bottomNote = textValue(content.bottomNote);
  const primaryLabel = textValue(content.primaryLabel);
  const primaryUrl = textValue(content.primaryUrl);
  const secondaryLabel = textValue(content.secondaryLabel);
  const secondaryUrl = textValue(content.secondaryUrl);
  const visibleBlocks = content.blocks.filter((block) => textValue(block.title) || textValue(block.copy) || textValue(block.imageUrl) || textValue(block.buttonLabel));

  if (bodyText) {
    const bodyBlock = ensureAdminBlock(anchor, '[data-admin-page-body="true"]', "admin-page-body-text");
    bodyBlock.innerHTML = escapeHtml(bodyText).replaceAll("\n", "<br />");
    anchor = bodyBlock;
  } else {
    removeAdminBlock('[data-admin-page-body="true"]');
  }

  const buttons = [];
  if (content.key !== "main") {
    if (primaryLabel) {
      const href = primaryUrl || "/Contact";
      buttons.push(`<a class="btn btn-primary" href="${escapeHtml(href)}">${escapeHtml(primaryLabel)}</a>`);
    }
    if (secondaryLabel) {
      const href = secondaryUrl || "/Contact";
      buttons.push(`<a class="btn btn-ghost" href="${escapeHtml(href)}">${escapeHtml(secondaryLabel)}</a>`);
    }
  }
  if (buttons.length) {
    const actions = ensureAdminBlock(anchor, '[data-admin-page-actions="true"]', "hero-actions page-admin-actions");
    actions.innerHTML = buttons.join("");
    anchor = actions;
  } else {
    removeAdminBlock('[data-admin-page-actions="true"]');
  }

  if (bannerImage) {
    const banner = ensureAdminBlock(anchor, '[data-admin-page-banner="true"]', "admin-page-banner");
    banner.innerHTML = `<img src="${escapeHtml(bannerImage)}" alt="${escapeHtml(content.title || "Page image")}" loading="lazy" />`;
    anchor = banner;
  } else {
    removeAdminBlock('[data-admin-page-banner="true"]');
  }

  if (noticeTitle || noticeText) {
    const notice = ensureAdminBlock(anchor, '[data-admin-page-notice="true"]', "admin-page-notice");
    notice.innerHTML = `<strong>${escapeHtml(noticeTitle || "Note")}</strong><span>${escapeHtml(noticeText)}</span>`;
    anchor = notice;
  } else {
    removeAdminBlock('[data-admin-page-notice="true"]');
  }

  if (visibleBlocks.length) {
    const blocks = ensureAdminBlock(anchor, '[data-admin-page-blocks="true"]', "admin-page-blocks");
    blocks.innerHTML = visibleBlocks.map((block) => `
      <article class="admin-page-block-card">
        ${block.imageUrl ? `<img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.title || "Content image")}" loading="lazy" />` : ""}
        <div>
          ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ""}
          ${block.copy ? `<p>${escapeHtml(block.copy)}</p>` : ""}
          ${block.buttonLabel ? `<a class="btn btn-ghost" href="${escapeHtml(block.buttonUrl || "#")}">${escapeHtml(block.buttonLabel)}</a>` : ""}
        </div>
      </article>
    `).join("");
    anchor = blocks;
  } else {
    removeAdminBlock('[data-admin-page-blocks="true"]');
  }

  if (listTitle || listCopy) {
    const listIntro = ensureAdminBlock(anchor, '[data-admin-page-list-intro="true"]', "admin-page-list-intro");
    listIntro.innerHTML = `<h2>${escapeHtml(listTitle || "More information")}</h2><p>${escapeHtml(listCopy)}</p>`;
    anchor = listIntro;
  } else {
    removeAdminBlock('[data-admin-page-list-intro="true"]');
  }

  if (bottomNote) {
    const bottom = ensureAdminBlock(anchor, '[data-admin-page-bottom-note="true"]', "admin-page-bottom-note");
    bottom.innerHTML = escapeHtml(bottomNote).replaceAll("\n", "<br />");
  } else {
    removeAdminBlock('[data-admin-page-bottom-note="true"]');
  }

  applyDefaultModuleVisibility(content);
}

function renderStats() {
  const grid = qs("#statsGrid");
  if (!grid) return;
  const stats = Array.isArray(state.settings.stats) && state.settings.stats.length ? state.settings.stats : fallbackSettings.stats;
  grid.innerHTML = stats
    .slice(0, 4)
    .map((stat) => `<article class="stat-card"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></article>`)
    .join("");
}

function isServiceDetailPath() {
  return Boolean(getServiceSlug());
}

function renderServices() {
  const grid = qs("#servicesGrid");
  const listSection = qs("#servicesListSection");
  const detailSection = qs("#serviceDetailSection");
  const isDetail = isServiceDetailPath();

  if (listSection) listSection.hidden = isDetail;
  if (detailSection) detailSection.hidden = !isDetail;
  if (!grid || isDetail) return;

  const services = getServiceDefinitions();

  grid.innerHTML = services
    .slice(0, 10)
    .map((service) => `
      <a class="service-card service-card-simple service-card-link" href="${serviceUrl(service.name)}" aria-label="Open ${escapeHtml(service.name)} service details">
        ${renderServiceIcon(service.icon, service.name)}
        <h3>${escapeHtml(service.name)}</h3>
        ${service.description ? `<p class="service-card-description">${escapeHtml(service.description)}</p>` : ""}
        <span class="service-card-more">View details →</span>
      </a>
    `)
    .join("");
}

function renderServiceDetailPage() {
  const container = qs("#serviceDetailPage");
  if (!container || !isServiceDetailPath()) return;
  const slug = getServiceSlug();
  const service = getServiceDefinitions().find((item) => item.slug === slug || item.name.toLowerCase() === String(slug || "").toLowerCase());
  if (!service) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>Service not found</h2>
        <p>This service page is not available right now.</p>
      </div>
    `;
    return;
  }
  document.title = `${service.name} | ${state.settings.siteName || fallbackSettings.siteName}`;
  const message = encodeURIComponent(`Hello ${state.settings.siteName || "Medicare At Home"}, I need ${service.name} service.`);
  const whatsapp = normalizeWhatsApp(state.settings.whatsapp || state.settings.phones?.[0] || fallbackSettings.whatsapp);
  const galleryPhotos = (Array.isArray(service.photos) ? service.photos : []).filter(isImageMedia).slice(0, 8);
  container.innerHTML = `
    <article class="service-detail-card doctor-page-card">
      <div class="doctor-detail-head">
        ${renderServiceIcon(service.icon, service.name)}
        <div>
          <p class="section-kicker">Service Details</p>
          <h2>${escapeHtml(service.name)}</h2>
          <p class="doctor-specialty">Home visit medical service</p>
        </div>
      </div>
      ${galleryPhotos.length ? `<div class="hospital-gallery service-detail-gallery">${galleryPhotos.map((photo) => `<img src="${escapeHtml(photo)}" alt="${escapeHtml(service.name)} photo" loading="lazy" />`).join("")}</div>` : ""}
      <p class="doctor-detail-bio">${escapeHtml(service.description || "Contact us by WhatsApp or phone to confirm availability, patient condition and appointment time.")}</p>
      <div class="doctor-detail-grid">
        <div class="detail-row"><small>Booking</small><strong>WhatsApp or phone confirmation</strong></div>
        <div class="detail-row"><small>Service area</small><strong>${escapeHtml(normalizeDisplayLocation(state.settings.location || fallbackSettings.location))}</strong></div>
      </div>
      <div class="card-actions detail-actions">
        ${whatsapp ? `<a class="btn btn-primary" href="https://wa.me/${whatsapp}?text=${message}" target="_blank" rel="noopener noreferrer">Book this service</a>` : ""}
      </div>
    </article>
  `;
}

function renderFilters() {
  const select = qs("#serviceFilter");
  if (!select) return;
  const services = [...new Set(state.doctors.flatMap((doctor) => doctor.services || []))].sort();
  select.innerHTML = `<option value="">All services</option>` + services
    .map((service) => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`)
    .join("");
  select.value = state.service;
}

function doctorMatches(doctor) {
  if (doctor.isActive === false) return false;

  const query = state.query.trim().toLowerCase();
  if (query && !String(doctor.name || "").toLowerCase().includes(query)) {
    return false;
  }

  return true;
}

function renderDoctors() {
  const grid = qs("#doctorsGrid");
  if (!grid) return;
  const filtered = state.doctors.filter(doctorMatches);

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state">${state.query ? "No doctor found with that name." : "No doctor information found. Please contact directly."}</div>`;
    return;
  }

  state.visibleDoctors = filtered.sort((a, b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99));
  grid.innerHTML = state.visibleDoctors
    .map(renderDoctorCard)
    .join("");
}

function renderDoctorCard(doctor) {
  const photo = doctor.photoUrl
    ? `<img src="${escapeHtml(doctor.photoUrl)}" alt="${escapeHtml(doctor.name || "Doctor")}" loading="lazy" decoding="async" />`
    : `<span>${escapeHtml(initials(doctor.name))}</span>`;

  return `
    <a class="doctor-card doctor-card-compact doctor-store-card" href="${doctorUrl(doctor)}" aria-label="View full details for ${escapeHtml(doctor.name || "Medical Professional")}">
      <div class="doctor-card-photo ${doctor.photoUrl ? "has-photo" : "doctor-card-photo-empty"}">${photo}</div>
      <div class="store-card-body doctor-card-body">
        <h3 class="doctor-name">${escapeHtml(doctor.name || "Medical Professional")}</h3>
        <p class="doctor-specialty">${escapeHtml([doctorDesignationText(doctor), doctor.specialty || "Home Medical Care"].filter(Boolean).join(" • "))}</p>
      </div>
    </a>
  `;
}

function renderAppointmentDoctorCard(doctor, weekday) {
  const photo = doctor.photoUrl
    ? `<img src="${escapeHtml(doctor.photoUrl)}" alt="${escapeHtml(doctor.name || "Doctor")}" loading="lazy" decoding="async" />`
    : `<span>${escapeHtml(initials(doctor.name))}</span>`;
  const matched = matchingDoctorChambers(doctor, weekday);
  const availability = matched.length
    ? matched.map((item) => `${item.location} • ${item.time}`).join(" • ")
    : `${weekday} appointment available`;

  return `
    <a class="doctor-card doctor-card-compact doctor-store-card appointment-doctor-card" href="${doctorUrl(doctor)}" aria-label="View full details for ${escapeHtml(doctor.name || "Medical Professional")}">
      <div class="doctor-card-photo ${doctor.photoUrl ? "has-photo" : "doctor-card-photo-empty"}">${photo}</div>
      <div class="store-card-body doctor-card-body">
        <h3 class="doctor-name">${escapeHtml(doctor.name || "Medical Professional")}</h3>
        <p class="doctor-specialty">${escapeHtml([doctorDesignationText(doctor), doctor.specialty || "Home Medical Care"].filter(Boolean).join(" • "))}</p>
        <p class="doctor-availability-mini">${escapeHtml(availability)}</p>
      </div>
    </a>
  `;
}

function renderAppointmentDoctors() {
  const grid = qs("#appointmentDoctorsGrid");
  if (!grid) return;

  const selected = normalizeAppointmentWeekday(state.appointmentWeekday || getAppointmentWeekdayFromUrl());
  state.appointmentWeekday = selected;

  const select = qs("#appointmentWeekdaySelect");
  if (select) select.value = selected;

  const intro = qs("#appointmentResultsIntro");
  if (!selected) {
    if (intro) intro.textContent = "Choose a weekday and tap Find.";
    grid.innerHTML = `<div class="empty-state">Choose a weekday to find available doctors.</div>`;
    return;
  }

  const filtered = state.doctors
    .filter((doctor) => doctorAvailableOnWeekday(doctor, selected))
    .sort((a, b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99));

  if (intro) {
    intro.textContent = filtered.length
      ? `${filtered.length} doctor${filtered.length === 1 ? "" : "s"} available on ${selected}.`
      : `No doctors are available on ${selected} right now.`;
  }

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state">No doctors are available on ${escapeHtml(selected)} right now. Try another weekday.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((doctor) => renderAppointmentDoctorCard(doctor, selected)).join("");
}

function renderDoctorDetails(doctor) {
  const phone = normalizePhone(doctor.phone || state.settings.phones?.[0] || "");
  const whatsapp = normalizeWhatsApp(doctor.whatsapp || doctor.phone || state.settings.whatsapp || state.settings.phones?.[0] || "");
  const message = encodeURIComponent(`Hello, I want to book home medical service with ${doctor.name || "Medicare At Home"}.`);
  const photo = doctor.photoUrl
    ? `<img src="${escapeHtml(doctor.photoUrl)}" alt="${escapeHtml(doctor.name)}" loading="lazy" />`
    : escapeHtml(initials(doctor.name));

  return `
    <div class="doctor-detail-head">
      <div class="avatar detail-avatar">${photo}</div>
      <div>
        <p class="section-kicker">Doctor</p>
        <h2 id="doctorDetailTitle">${escapeHtml(doctor.name || "Medical Professional")}</h2>
        <p class="doctor-specialty">${escapeHtml([doctorDesignationText(doctor), doctor.specialty || "Home Medical Care"].filter(Boolean).join(" • "))}</p>
      </div>
    </div>
    <p class="doctor-detail-bio">${escapeHtml(doctor.bio || "Contact for home visit medical service details and appointment confirmation.")}</p>
    <div class="doctor-detail-grid">
      ${doctorDesignationText(doctor) ? `<div class="detail-row"><small>Designation</small><strong>${escapeHtml(doctorDesignationText(doctor))}</strong></div>` : ""}
      ${doctor.degrees ? `<div class="detail-row"><small>Degrees</small><strong>${escapeHtml(doctor.degrees)}</strong></div>` : ""}
      ${doctor.hospital ? `<div class="detail-row"><small>Organization</small><strong>${escapeHtml(doctor.hospital)}</strong></div>` : ""}
      ${phone ? `<div class="detail-row"><small>Phone</small><strong>${escapeHtml(doctor.phone || phone)}</strong></div>` : ""}
    </div>
    ${renderDoctorChambers(doctor)}
    <div class="card-actions detail-actions">
      ${whatsapp ? `<a class="btn btn-primary" href="https://wa.me/${whatsapp}?text=${message}" target="_blank" rel="noopener noreferrer">WhatsApp Appointment</a>` : ""}
      ${phone ? `<a class="btn btn-ghost" href="tel:${phone}">Call Now</a>` : ""}
    </div>
  `;
}

function renderDoctorPage() {
  const container = qs("#doctorDetailPage");
  if (!container) return;

  const slug = window.location.pathname.split("/").filter(Boolean).slice(1).join("/");
  const doctor = state.doctors.find((item) => doctorMatchesSlug(item, slug));

  if (!doctor) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>Doctor not found</h2>
        <p>This doctor profile is not available right now.</p>
      </div>
    `;
    return;
  }

  document.title = `${doctor.name || "Doctor Details"} | ${state.settings.siteName || fallbackSettings.siteName}`;
  container.innerHTML = `
    <article class="doctor-page-card">
      ${renderDoctorDetails(doctor)}
    </article>
  `;
}


function renderHospitals() {
  const grid = qs("#hospitalGrid");
  const listSection = qs("#hospitalListSection");
  const detailSection = qs("#hospitalDetailSection");
  const isDetail = isHospitalDetailPath();
  if (listSection) listSection.hidden = isDetail;
  if (detailSection) detailSection.hidden = !isDetail;
  if (!grid || isDetail) return;
  const hospitals = (Array.isArray(state.hospitals) ? state.hospitals : [])
    .filter((item) => item.isActive !== false)
    .sort((a, b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99));
  if (!hospitals.length) {
    grid.innerHTML = state.hospitalLoadError
      ? `<div class="empty-state"><strong>Could not load hospital information.</strong><p>Please refresh once after deploy. If this keeps happening, check that your Turso environment variables are set in Cloudflare Pages.</p></div>`
      : `<div class="empty-state">No hospital information found yet.</div>`;
    return;
  }
  grid.innerHTML = hospitals.map((hospital) => {
    const photo = String(hospital.photoUrl || "").trim();
    const href = hospitalUrl(hospital);
    return `
      <a class="store-card store-card-link hospital-store-card" href="${escapeHtml(href)}" data-hospital-link="${escapeHtml(href)}" aria-label="View ${escapeHtml(hospital.name || "Hospital")} details">
        <div class="store-product-photo hospital-card-photo">
          ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(hospital.name || "Hospital")}" loading="lazy" decoding="async" />` : `<span>🏥</span>`}
        </div>
        <div class="store-card-body hospital-card-body"><h3>${escapeHtml(hospital.name || "Hospital")}</h3></div>
      </a>
    `;
  }).join("");
}

function renderHospitalGallery(hospital = {}, photos = []) {
  if (!photos.length) {
    return `
      <div class="product-gallery hospital-product-gallery" data-product-gallery>
        <div class="product-detail-photo hospital-detail-photo hospital-detail-photo-empty"><span>🏥</span></div>
      </div>
    `;
  }
  return `
    <div class="product-gallery hospital-product-gallery" data-product-gallery>
      <div class="product-gallery-track" data-gallery-track aria-label="Hospital photo gallery">
        ${photos.map((photo, index) => `
          <button class="product-detail-photo product-gallery-button product-gallery-slide hospital-gallery-slide" type="button" data-gallery-image="${escapeHtml(photo)}" aria-label="Open ${escapeHtml(hospital.name || "Hospital")} photo ${index + 1} of ${photos.length}">
            <img src="${escapeHtml(photo)}" alt="${escapeHtml(hospital.name || "Hospital")} photo ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" />
          </button>
        `).join("")}
      </div>
      ${photos.length > 1 ? `
        <div class="product-gallery-controls" aria-label="Hospital gallery controls">
          <button class="product-gallery-nav" type="button" data-gallery-scroll="-1" aria-label="Previous hospital photo">‹</button>
          <span class="product-gallery-count">Swipe or scroll photos</span>
          <button class="product-gallery-nav" type="button" data-gallery-scroll="1" aria-label="Next hospital photo">›</button>
        </div>
      ` : ""}
    </div>
  `;
}

function renderHospitalDetail(hospital = {}) {
  const photos = [hospital.photoUrl, ...(Array.isArray(hospital.galleryPhotos) ? hospital.galleryPhotos : [])]
    .map((photo) => String(photo || "").trim())
    .filter(Boolean)
    .slice(0, 12);
  const phone = normalizePhone(hospital.phone || "");
  const whatsapp = normalizeWhatsApp(hospital.whatsapp || hospital.phone || "");
  const message = encodeURIComponent(`Hello, I need information about ${hospital.name || "this hospital"}.`);
  return `
    <article class="product-detail-card hospital-detail-card">
      <div class="product-detail-layout hospital-detail-layout">
        <div>
          ${renderHospitalGallery(hospital, photos)}
        </div>
        <div class="product-detail-content hospital-detail-content">
          <p class="section-kicker">Hospital</p>
          <h2>${escapeHtml(hospital.name || "Hospital")}</h2>
          ${hospital.address ? `<p class="doctor-specialty hospital-address-text">${escapeHtml(hospital.address)}</p>` : ""}
          ${hospital.description ? `<p class="doctor-detail-bio hospital-description-text">${escapeHtml(hospital.description)}</p>` : ""}
          <div class="doctor-detail-grid product-info-grid hospital-info-grid">
            ${hospital.address ? `<div class="detail-row"><small>Address</small><strong>${escapeHtml(hospital.address)}</strong></div>` : ""}
            ${phone ? `<div class="detail-row"><small>Phone</small><strong>${escapeHtml(hospital.phone || phone)}</strong></div>` : ""}
            ${hospital.services ? `<div class="detail-row full"><small>Services / Notes</small><strong>${escapeHtml(hospital.services)}</strong></div>` : ""}
          </div>
          <div class="card-actions detail-actions hospital-detail-actions">
            ${phone ? `<a class="btn btn-ghost" href="tel:${phone}">Call Hospital</a>` : ""}
            ${whatsapp ? `<a class="btn btn-primary" href="https://wa.me/${whatsapp}?text=${message}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ""}
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderHospitalPage() {
  const container = qs("#hospitalDetailPage");
  if (!container) return;
  const slug = getHospitalDetailSlug();
  if (!slug) return;
  const hospital = state.hospitals.find((item) => hospitalMatchesSlug(item, slug));
  if (!hospital) {
    if (!state.hospitalsLoaded && !state.hospitalLoadError) {
      container.innerHTML = `<div class="loading-state">Loading hospital details...</div>`;
      return;
    }
    container.innerHTML = state.hospitalLoadError
      ? `<div class="empty-state"><h2>Could not load hospital details</h2><p>Please refresh once after deploy. If this keeps happening, check Cloudflare Pages environment variables and the /api/hospitals route.</p></div>`
      : `<div class="empty-state"><h2>Hospital not found</h2><p>This hospital profile is not available right now.</p></div>`;
    return;
  }
  document.title = `${hospital.name || "Hospital Details"} | ${state.settings.siteName || fallbackSettings.siteName}`;
  container.innerHTML = renderHospitalDetail(hospital);
}

function renderBloodList() {
  const grid = qs("#bloodGrid");
  const listSection = qs("#bloodListSection");
  if (isBloodDetailPath()) {
    if (listSection) listSection.hidden = true;
    return;
  }
  if (listSection) listSection.hidden = false;
  if (!grid) return;

  const profiles = sortBloodProfiles(Array.isArray(state.bloodProfiles) ? state.bloodProfiles : [])
    .filter(bloodProfileMatches);

  if (!profiles.length) {
    grid.innerHTML = `<div class="empty-state">${state.bloodQuery ? "No blood profile found with that search." : "No approved blood information found yet."}</div>`;
    return;
  }

  grid.innerHTML = profiles
    .map((profile) => `
      <a class="doctor-card doctor-card-compact blood-person-card" href="${bloodUrl(profile)}" aria-label="View blood details for ${escapeHtml(profile.fullName || "Blood Donor")}">
        <div class="doctor-top">
          <div class="avatar blood-avatar" aria-hidden="true">🩸</div>
          <div>
            <h3 class="doctor-name">${escapeHtml(profile.fullName || "Blood Donor")}</h3>
            <p class="doctor-specialty blood-group-label">${escapeHtml(profile.bloodGroup || "Blood group")}</p>
          </div>
        </div>
      </a>
    `)
    .join("");
}

async function fetchBloodProfileBySlug(slug) {
  const idMatch = String(slug || "").match(/^\d+/);
  if (idMatch) {
    try {
      const data = await fetchJson(`/api/blood/${encodeURIComponent(idMatch[0])}?fresh=${Date.now()}`, { cache: "no-store" });
      if (data.profile) return data.profile;
    } catch (error) {
      console.warn(error);
    }
  }
  return state.bloodProfiles.find((item) => bloodMatchesSlug(item, slug));
}

function renderBloodDetail(profile) {
  const genderLabel = formatGender(profile);
  const adminNumber = "8801609672748";
  const adminMessage = encodeURIComponent(`Hello Admin, I need contact information for ${profile.fullName || "this blood person"}. Blood Group: ${profile.bloodGroup || "N/A"}.`);
  const whatsapp = normalizeWhatsApp(profile.whatsapp || profile.phone || "");
  const phone = normalizePhone(profile.phone || "");

  return `
    <article class="blood-detail-card">
      <div class="blood-detail-head">
        <span class="blood-detail-icon" aria-hidden="true">🩸</span>
        <div>
          <p class="section-kicker">Blood profile</p>
          <h2>${escapeHtml(profile.fullName || "Blood Person")}</h2>
          <p class="blood-group-large">${escapeHtml(profile.bloodGroup || "")}</p>
        </div>
      </div>
      <div class="doctor-detail-grid blood-info-grid">
        <div class="detail-row"><small>Full Name</small><strong>${escapeHtml(profile.fullName || "")}</strong></div>
        <div class="detail-row"><small>Blood Group</small><strong>${escapeHtml(profile.bloodGroup || "")}</strong></div>
        ${genderLabel ? `<div class="detail-row"><small>Gender</small><strong>${escapeHtml(genderLabel)}</strong></div>` : ""}
        ${profile.contactAdminRequired ? `
          <div class="detail-row full"><small>Privacy protected</small><strong>Contact details are hidden. Please contact admin.</strong></div>
        ` : `
          ${phone ? `<div class="detail-row"><small>Phone</small><strong>${escapeHtml(profile.phone || phone)}</strong></div>` : ""}
          ${whatsapp ? `<div class="detail-row"><small>WhatsApp</small><strong>${escapeHtml(profile.whatsapp || whatsapp)}</strong></div>` : ""}
          ${profile.homeAddress ? `<div class="detail-row full"><small>Home Address</small><strong>${escapeHtml(profile.homeAddress)}</strong></div>` : ""}
        `}
      </div>
      <div class="card-actions detail-actions">
        ${profile.contactAdminRequired ? `<a class="btn btn-primary" href="https://wa.me/${adminNumber}?text=${adminMessage}" target="_blank" rel="noopener noreferrer">Contact Admin</a>` : ""}
        ${!profile.contactAdminRequired && whatsapp ? `<a class="btn btn-primary" href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ""}
        ${!profile.contactAdminRequired && phone ? `<a class="btn btn-ghost" href="tel:${phone}">Call</a>` : ""}
      </div>
    </article>
  `;
}

async function renderBloodPage() {
  const container = qs("#bloodDetailPage");
  const detailSection = qs("#bloodDetailSection");
  if (!container) return;

  const slug = getBloodDetailSlug();
  if (!slug) {
    if (detailSection) detailSection.hidden = true;
    return;
  }

  if (detailSection) detailSection.hidden = false;

  let profile = null;
  try {
    profile = await fetchBloodProfileBySlug(slug);
  } catch (error) {
    console.warn(error);
  }

  if (!profile) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>Blood profile not found</h2>
        <p>This profile is not approved or not available right now.</p>
      </div>
    `;
    return;
  }

  document.title = `${profile.fullName || "Blood Details"} | ${state.settings.siteName || fallbackSettings.siteName}`;
  container.innerHTML = renderBloodDetail(profile);
}

function getBloodFormPayload() {
  return {
    fullName: qs("#bloodFullName")?.value.trim() || "",
    bloodGroup: qs("#bloodGroup")?.value.trim() || "",
    gender: qs("#bloodGender")?.value.trim() || "",
    customGender: qs("#bloodCustomGender")?.value.trim() || "",
    phone: qs("#bloodPhone")?.value.trim() || "",
    whatsapp: qs("#bloodWhatsapp")?.value.trim() || "",
    homeAddress: qs("#bloodHomeAddress")?.value.trim() || ""
  };
}

function initBloodForm() {
  const form = qs("#bloodSubmitForm");
  const gender = qs("#bloodGender");
  const customGroup = qs("#customGenderGroup");
  const customInput = qs("#bloodCustomGender");

  function syncGender() {
    const isOther = gender?.value === "other";
    customGroup?.classList.toggle("hidden", !isOther);
    if (customInput) customInput.required = Boolean(isOther);
    if (!isOther && customInput) customInput.value = "";
  }

  gender?.addEventListener("change", syncGender);
  syncGender();

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await fetchJsonPost("/api/blood", getBloodFormPayload());
      form.reset();
      syncGender();
      toast("Submitted successfully. It will show after admin approval.");
      setTimeout(() => { window.location.href = "/Blood"; }, 900);
    } catch (error) {
      toast(error.message || "Could not submit blood information.");
    }
  });
}

async function fetchJsonPost(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

function ambulanceNumber(value = "") {
  return normalizePhone(value || fallbackSettings.ambulancePhone);
}

function renderAmbulanceDetailPhoto(ambulance = {}) {
  const photo = String(ambulance.photoUrl || "").trim();
  if (!photo) {
    return `
      <div class="product-gallery ambulance-product-gallery">
        <div class="product-detail-photo ambulance-detail-photo ambulance-detail-photo-empty"><span>🚑</span></div>
      </div>
    `;
  }
  return `
    <div class="product-gallery ambulance-product-gallery">
      <button class="product-detail-photo product-gallery-button ambulance-detail-photo" type="button" data-gallery-image="${escapeHtml(photo)}" aria-label="Open ${escapeHtml(ambulance.title || "Ambulance")} photo">
        <img src="${escapeHtml(photo)}" alt="${escapeHtml(ambulance.title || "Ambulance")}" loading="eager" decoding="async" />
      </button>
    </div>
  `;
}

function renderAmbulanceDetail(ambulance = {}) {
  const settings = state.settings || fallbackSettings;
  const phone = normalizePhone(ambulance.phone || settings.ambulancePhone || fallbackSettings.ambulancePhone);
  const whatsapp = normalizeWhatsApp(ambulance.whatsapp || ambulance.phone || settings.ambulanceWhatsapp || settings.ambulancePhone || fallbackSettings.ambulanceWhatsapp);
  const message = encodeURIComponent(`Hello ${settings.siteName || "Medicare At Home"}, I need ${ambulance.title || "ambulance"} support. Pickup: `);
  return `
    <article class="product-detail-card ambulance-detail-card">
      <div class="product-detail-layout ambulance-detail-layout">
        <div>
          ${renderAmbulanceDetailPhoto(ambulance)}
        </div>
        <div class="product-detail-content ambulance-detail-content">
          <p class="section-kicker">Ambulance</p>
          <h2>${escapeHtml(ambulance.title || "Ambulance")}</h2>
          ${ambulance.info ? `<p class="doctor-detail-bio ambulance-detail-info">${escapeHtml(ambulance.info)}</p>` : `<p class="doctor-detail-bio ambulance-detail-info">Contact us for this ambulance option.</p>`}
          <div class="doctor-detail-grid product-info-grid ambulance-info-grid">
            <div class="detail-row"><small>Type</small><strong>${escapeHtml(ambulance.title || "Ambulance")}</strong></div>
            ${ambulance.info ? `<div class="detail-row full"><small>Information</small><strong>${escapeHtml(ambulance.info)}</strong></div>` : ""}
            ${phone ? `<div class="detail-row"><small>Phone</small><strong>${escapeHtml(ambulance.phone || phone)}</strong></div>` : ""}
            ${whatsapp ? `<div class="detail-row"><small>WhatsApp</small><strong>${escapeHtml(ambulance.whatsapp || ambulance.phone || whatsapp)}</strong></div>` : ""}
          </div>
          <div class="card-actions detail-actions ambulance-detail-actions">
            <a class="btn btn-secondary" href="/Ambulance">← Back to ambulances</a>
            ${phone ? `<a class="btn btn-ghost" href="tel:${phone}">Call</a>` : ""}
            ${whatsapp ? `<a class="btn btn-primary" href="https://wa.me/${whatsapp}?text=${message}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ""}
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderAmbulancePage() {
  const container = qs("#ambulancePage");
  if (!container) return;
  const settings = state.settings || fallbackSettings;
  const isDetail = isAmbulanceDetailPath();
  const listSection = qs("#ambulanceListSection");
  const supportSection = qs("#ambulanceSupportSection");
  const detailSection = qs("#ambulanceDetailSection");
  const detailContainer = qs("#ambulanceDetailPage");
  if (listSection) listSection.hidden = isDetail;
  if (supportSection) supportSection.hidden = isDetail;
  if (detailSection) detailSection.hidden = !isDetail;

  const phone = ambulanceNumber(settings.ambulancePhone || fallbackSettings.ambulancePhone);
  const whatsapp = normalizeWhatsApp(settings.ambulanceWhatsapp || settings.ambulancePhone || fallbackSettings.ambulanceWhatsapp);
  const message = encodeURIComponent(`Hello ${settings.siteName || "Medicare At Home"}, I need an ambulance. Pickup: `);
  qsa("[data-ambulance-phone]").forEach((node) => { node.textContent = settings.ambulancePhone || fallbackSettings.ambulancePhone; });
  qsa("[data-ambulance-description]").forEach((node) => { node.textContent = settings.ambulanceDescription || fallbackSettings.ambulanceDescription; });
  qsa("[data-ambulance-call]").forEach((link) => { link.href = phone ? `tel:${phone}` : "/Contact"; });
  qsa("[data-ambulance-whatsapp]").forEach((link) => {
    link.href = whatsapp ? `https://wa.me/${whatsapp}?text=${message}` : "/Contact";
    link.target = whatsapp ? "_blank" : "";
    link.rel = whatsapp ? "noopener noreferrer" : "";
  });

  const ambulances = (Array.isArray(state.ambulances) ? state.ambulances : [])
    .filter((item) => item.isActive !== false)
    .sort((a, b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99));

  if (isDetail && detailContainer) {
    const slug = getAmbulanceDetailSlug();
    const ambulance = ambulances.find((item) => ambulanceMatchesSlug(item, slug));
    if (!ambulance) {
      if (!state.ambulancesLoaded && !state.ambulanceLoadError) {
        detailContainer.innerHTML = `<div class="loading-state">Loading ambulance details...</div>`;
        return;
      }
      detailContainer.innerHTML = state.ambulanceLoadError
        ? `<div class="empty-state"><h2>Could not load ambulance details</h2><p>Please refresh once after deploy. If this keeps happening, check Cloudflare Pages environment variables and the /api/ambulances route.</p></div>`
        : `<div class="empty-state"><h2>Ambulance not found</h2><p>This ambulance option is not available right now.</p><a class="btn btn-primary" href="/Ambulance">Back to ambulances</a></div>`;
      return;
    }
    document.title = `${ambulance.title || "Ambulance Details"} | ${settings.siteName || fallbackSettings.siteName}`;
    detailContainer.innerHTML = renderAmbulanceDetail(ambulance);
    return;
  }

  const customGrid = qs("#customAmbulanceGrid");
  if (customGrid) {
    customGrid.innerHTML = ambulances.length ? ambulances.map((item) => {
      const itemPhone = normalizePhone(item.phone || settings.ambulancePhone || fallbackSettings.ambulancePhone);
      const itemWhatsapp = normalizeWhatsApp(item.whatsapp || item.phone || settings.ambulanceWhatsapp || settings.ambulancePhone || fallbackSettings.ambulanceWhatsapp);
      const itemMessage = encodeURIComponent(`Hello ${settings.siteName || "Medicare At Home"}, I need ${item.title || "ambulance"} support. Pickup: `);
      const photo = String(item.photoUrl || "").trim();
      const href = ambulanceUrl(item);
      return `
        <article class="store-card ambulance-option-card">
          <a class="store-card-link ambulance-option-content" href="${escapeHtml(href)}" data-ambulance-link="${escapeHtml(href)}" aria-label="View ${escapeHtml(item.title || "Ambulance")} details">
            ${photo ? `<div class="store-product-photo ambulance-option-photo has-photo"><img src="${escapeHtml(photo)}" alt="${escapeHtml(item.title || "Ambulance")}" loading="lazy" decoding="async" /></div>` : `<div class="store-product-photo ambulance-option-photo store-product-photo-empty" aria-hidden="true">🚑</div>`}
            <div class="store-card-body ambulance-option-body">
              <h3>${escapeHtml(item.title || "Ambulance")}</h3>
              ${item.info ? `<p class="store-stock ambulance-option-info">${escapeHtml(item.info)}</p>` : `<p class="store-stock ambulance-option-info">Contact us for this ambulance option.</p>`}
              <span class="store-card-view">View details</span>
            </div>
          </a>
          <div class="card-actions store-card-actions ambulance-option-actions">
            ${itemPhone ? `<a class="btn btn-ghost" href="tel:${itemPhone}">Call</a>` : ""}
            ${itemWhatsapp ? `<a class="btn btn-primary" href="https://wa.me/${itemWhatsapp}?text=${itemMessage}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ""}
          </div>
        </article>`;
    }).join("") : (state.ambulanceLoadError
      ? `<div class="empty-state"><strong>Could not load ambulance options.</strong><p>Please refresh once after deploy. If this keeps happening, check your Turso environment variables.</p></div>`
      : `<div class="empty-state">Custom ambulance cards will appear here after admin adds them.</div>`);
  }
}

function getAmbulanceFormPayload() {
  return {
    fullName: qs("#ambulanceName")?.value.trim() || "",
    phone: qs("#ambulancePhone")?.value.trim() || "",
    pickup: qs("#ambulancePickup")?.value.trim() || "",
    destination: qs("#ambulanceDestination")?.value.trim() || "",
    patientCondition: qs("#ambulanceCondition")?.value.trim() || ""
  };
}

function initAmbulanceForm() {
  const form = qs("#ambulanceRequestForm");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await fetchJsonPost("/api/ambulance", getAmbulanceFormPayload());
      toast("Ambulance request sent to admin.");
      form.reset();
    } catch (error) {
      toast(error.message || "Could not send ambulance request.");
    }
  });
}

function initHospitalCardLinks() {
  const grid = qs("#hospitalGrid");
  if (!grid || grid.dataset.hospitalLinksReady === "true") return;
  grid.dataset.hospitalLinksReady = "true";
  grid.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-hospital-link]");
    if (!link) return;
    const href = link.getAttribute("href") || link.dataset.hospitalLink || "";
    if (!href) return;
    event.preventDefault();
    window.location.assign(href);
  });
}

function initAmbulanceCardLinks() {
  const grid = qs("#customAmbulanceGrid");
  if (!grid || grid.dataset.ambulanceLinksReady === "true") return;
  grid.dataset.ambulanceLinksReady = "true";
  grid.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-ambulance-link]");
    if (!link) return;
    const href = link.getAttribute("href") || link.dataset.ambulanceLink || "";
    if (!href) return;
    event.preventDefault();
    window.location.assign(href);
  });
}

function renderContact() {
  const settings = state.settings;
  const contactList = qs("#contactList");
  if (!contactList) return;
  const phones = Array.isArray(settings.phones) && settings.phones.length ? settings.phones : fallbackSettings.phones;
  const rows = [
    ...phones.map((phone) => ({ icon: "☎", label: "Phone", value: phone, href: `tel:${normalizePhone(phone)}` })),
    { icon: "💬", label: "WhatsApp", value: settings.whatsapp || fallbackSettings.whatsapp, href: `https://wa.me/${normalizeWhatsApp(settings.whatsapp || fallbackSettings.whatsapp)}` },
    { icon: "📍", label: "Service area", value: normalizeDisplayLocation(settings.location || fallbackSettings.location), href: "/Contact" }
  ];


  if (Array.isArray(settings.socialLinks)) {
    settings.socialLinks.forEach((item) => {
      const label = String(item?.label || "Social").trim();
      const rawUrl = String(item?.url || "").trim();
      if (!rawUrl) return;
      const href = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl.replace(/^\/\//, "")}`;
      rows.push({ icon: "↗", label, value: rawUrl.replace(/^https?:\/\//i, ""), href });
    });
  }

  contactList.innerHTML = rows
    .map((row) => `
      <a class="contact-item contact-item-no-icon" href="${escapeHtml(row.href)}" ${row.href.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>
        <span class="contact-text"><small>${escapeHtml(row.label)}</small><strong>${escapeHtml(row.value)}</strong></span>
      </a>
    `)
    .join("");
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  qs('meta[name="theme-color"]')?.setAttribute("content", nextTheme === "dark" ? "#101815" : "#f6f7fb");
  qsa("#themeToggle").forEach((button) => {
    const isDark = nextTheme === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    const icon = qs(".theme-toggle-icon", button);
    const text = qs(".theme-toggle-text", button);
    if (icon) icon.textContent = isDark ? "☀" : "☾";
    if (text) text.textContent = isDark ? "Light mode" : "Dark mode";
  });
}

function initTheme() {
  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem("medicare-theme") || "light";
  } catch (error) {
    savedTheme = "light";
  }
  applyTheme(savedTheme);

  qsa("#themeToggle").forEach((button) => {
    button.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      const nextTheme = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("medicare-theme", nextTheme);
      } catch (error) {
        console.warn(error);
      }
      applyTheme(nextTheme);
    });
  });
}


function initMenu() {
  const button = qs("#menuButton");
  const links = qs("#navLinks");
  if (!button || !links) return;

  const closeMenu = () => {
    links.classList.remove("is-open");
    button.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  };

  let scrollStart = window.scrollY || document.documentElement.scrollTop || 0;

  button.addEventListener("click", () => {
    const isOpen = links.classList.toggle("is-open");
    button.classList.toggle("is-open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) scrollStart = window.scrollY || document.documentElement.scrollTop || 0;
  });

  links.addEventListener("click", (event) => {
    if (event.target.matches("a")) closeMenu();
  });

  window.addEventListener("scroll", () => {
    if (!links.classList.contains("is-open")) return;
    const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
    if (Math.abs(currentScroll - scrollStart) > 4) closeMenu();
  }, { passive: true });
}

function initAppointmentFinder() {
  const initialWeekday = getAppointmentWeekdayFromUrl();
  if (initialWeekday) state.appointmentWeekday = initialWeekday;

  const homeForm = qs("#doctorAppointmentForm");
  const homeSelect = qs("#homeAppointmentWeekday");
  if (homeSelect && state.appointmentWeekday) homeSelect.value = state.appointmentWeekday;
  if (homeForm && !homeForm.dataset.ready) {
    homeForm.dataset.ready = "true";
    homeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const weekday = normalizeAppointmentWeekday(homeSelect?.value || "");
      if (!weekday) {
        toast("Please choose a weekday first.");
        homeSelect?.focus();
        return;
      }
      window.location.href = `/doctor-appointment?weekday=${encodeURIComponent(weekday)}`;
    });
  }

  const pageForm = qs("#appointmentWeekdayForm");
  const pageSelect = qs("#appointmentWeekdaySelect");
  if (pageSelect && state.appointmentWeekday) pageSelect.value = state.appointmentWeekday;
  if (pageForm && !pageForm.dataset.ready) {
    pageForm.dataset.ready = "true";
    pageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const weekday = normalizeAppointmentWeekday(pageSelect?.value || "");
      if (!weekday) {
        toast("Please choose a weekday first.");
        pageSelect?.focus();
        return;
      }
      state.appointmentWeekday = weekday;
      const nextUrl = `/doctor-appointment?weekday=${encodeURIComponent(weekday)}`;
      if (window.location.pathname.replace(/\/+$/, "").toLowerCase() === "/doctor-appointment") {
        window.history.pushState({}, "", nextUrl);
        renderAppointmentDoctors();
      } else {
        window.location.href = nextUrl;
      }
    });
  }
}

function initFilters() {
  const doctorSearch = qs("#doctorSearch");
  if (doctorSearch) {
    doctorSearch.value = state.query;
    doctorSearch.addEventListener("input", () => {
      state.query = doctorSearch.value;
      renderDoctors();
    });
  }

  const bloodSearch = qs("#bloodSearch");
  if (bloodSearch) {
    bloodSearch.value = state.bloodQuery;
    bloodSearch.addEventListener("input", () => {
      state.bloodQuery = bloodSearch.value;
      renderBloodList();
    });
  }
}

initTheme();
initMenu();
initFilters();
initAppointmentFinder();
initBloodForm();
initAmbulanceForm();
initHospitalCardLinks();
initAmbulanceCardLinks();
initLocationPermissionButtons();
initPasswordVisibilityToggles();
loadData();
