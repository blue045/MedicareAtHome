const userTokenKey = "medicare_store_token";

const storeState = {
  token: localStorage.getItem(userTokenKey) || "",
  user: null,
  products: [],
  avatars: [],
  cart: [],
  orders: [],
  userReviews: [],
  comments: {},
  paymentSettings: {
    bkashNumber: "",
    nagadNumber: "",
    instructions: "Send payment through bKash and Nagad first, then enter your sender number and Transaction ID. For Cash on Delivery, customers must pay the delivery fee first by bKash or Nagad; the product price is paid on delivery."
  },
  selectedProduct: null,
  checkoutProduct: null
};

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

const storeCachePrefix = "medicare_store_cache_v5:";
const storeCacheMaxAge = 3 * 60 * 1000;

function readStoreCache(key, maxAge = storeCacheMaxAge) {
  try {
    const cached = JSON.parse(localStorage.getItem(`${storeCachePrefix}${key}`) || "null");
    if (!cached || !cached.timestamp || Date.now() - cached.timestamp > maxAge) return null;
    return cached.data || null;
  } catch {
    return null;
  }
}

function writeStoreCache(key, data) {
  try {
    localStorage.setItem(`${storeCachePrefix}${key}`, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // Some product/user images are stored as data URLs. If storage is full, skip caching.
  }
}

function removeStoreCache(key) {
  try { localStorage.removeItem(`${storeCachePrefix}${key}`); } catch { /* ignore */ }
}

if (storeState.token) {
  const cachedUser = readStoreCache("currentUser", 24 * 60 * 60 * 1000);
  if (cachedUser?.user) storeState.user = cachedUser.user;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    updateCheckoutPaymentFields();
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

function initStoreLocationPermissionButtons(root = document) {
  qsa("[data-use-current-location]", root).forEach((button) => updateLocationPermissionStatus(button));
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

function isFeniDeliveryLocation(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;
  if (text.includes("outside feni") || text.includes("outside of feni") || text.includes("out of feni") || text.includes("not feni") || text.includes("ফেনীর বাইরে")) return false;
  return /(^|[^a-z])feni([^a-z]|$)/i.test(text) || text.includes("ফেনী");
}

function deliveryChargeForLocation(product = {}, location = "") {
  return isFeniDeliveryLocation(location) ? productFeniDeliveryCharge(product) : productOutsideFeniDeliveryCharge(product);
}

function currentCheckoutLocation() {
  return qs("#checkoutDeliveryLocation")?.value.trim() || qs("#checkoutAddress")?.value.trim() || "";
}

function currentCheckoutDeliveryLabel() {
  return isFeniDeliveryLocation(currentCheckoutLocation()) ? "Feni rate" : "Outside Feni rate";
}

function paymentMethodLabel(method = "") {
  if (["bkash", "nagad", "bkash_nagad"].includes(method)) return "bKash and Nagad";
  return "Cash on Delivery";
}

function paymentChannelLabel(method = "") {
  if (method === "bkash") return "bKash";
  if (method === "nagad") return "Nagad";
  return "bKash/Nagad";
}

function paymentDestinationHtml() {
  const parts = [];
  if (storeState.paymentSettings.bkashNumber) parts.push(`bKash: <b>${escapeHtml(storeState.paymentSettings.bkashNumber)}</b>`);
  if (storeState.paymentSettings.nagadNumber) parts.push(`Nagad: <b>${escapeHtml(storeState.paymentSettings.nagadNumber)}</b>`);
  return parts.length ? parts.join("<br />") : "Payment number not configured yet";
}

function deliveryPaymentLabel(method = "") {
  if (method === "bkash") return "bKash delivery fee paid";
  if (method === "nagad") return "Nagad delivery fee paid";
  return "Delivery fee payment";
}

function isPrescriptionOrder(order = {}) {
  return String(order.orderType || "product") === "prescription";
}

function prescriptionQuoteIsSet(order = {}) {
  return isPrescriptionOrder(order) && (Number(order.productPrice || 0) > 0 || Number(order.deliveryCharge || 0) > 0 || Boolean(order.prescriptionQuotedAt));
}

function orderPriceSummary(order = {}) {
  const quantityText = `Qty ${escapeHtml(String(order.quantity || 1))}`;
  if (isPrescriptionOrder(order)) {
    if (!prescriptionQuoteIsSet(order)) return `Custom price will be confirmed by admin • ${quantityText}`;
    const total = Number(order.productPrice || 0) + Number(order.deliveryCharge || 0);
    return `Quoted: ${money(order.productPrice)} total medicine price + ${money(order.deliveryCharge)} delivery • Total ${money(total)} • ${quantityText}`;
  }
  return `${money(order.productPrice)} + ${money(order.deliveryCharge)} delivery • ${quantityText}`;
}

function prescriptionPaymentSummary(order = {}) {
  if (!isPrescriptionOrder(order)) return escapeHtml(paymentMethodLabel(order.paymentMethod));
  if (!prescriptionQuoteIsSet(order)) return "Admin review / custom quote";
  if (order.transactionId || String(order.status || "").toLowerCase() === "payment_submitted") {
    const delivery = order.paymentMethod === "cod" && order.deliveryPaymentMethod ? ` • ${deliveryPaymentLabel(order.deliveryPaymentMethod)}` : "";
    return `${paymentMethodLabel(order.paymentMethod)}${delivery}`;
  }
  return "Price quoted — waiting for payment details";
}

function prescriptionOrderTotal(order = {}) {
  return Number(order.productPrice || 0) + Number(order.deliveryCharge || 0);
}

function canSubmitPrescriptionPayment(order = {}) {
  return isPrescriptionOrder(order) && prescriptionQuoteIsSet(order) && normalizedOrderStatus(order.status) === "pending_payment" && !order.transactionId;
}

function statusLabel(status = "") {
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

function isActiveOrder(status = "") {
  return ["pending", "pending_payment", "payment_submitted", "confirmed", "on_the_way"].includes(String(status || "").toLowerCase());
}

function normalizedOrderStatus(status = "") {
  const value = String(status || "").toLowerCase();
  if (value === "completed" || value === "complete") return "delivered";
  return value || "pending";
}

function formatProfileDate(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function trackingStepIndex(status = "") {
  const normalized = normalizedOrderStatus(status);
  const map = {
    pending: 0,
    pending_payment: 1,
    payment_submitted: 1,
    confirmed: 2,
    on_the_way: 3,
    delivered: 4
  };
  return typeof map[normalized] === "number" ? map[normalized] : 0;
}

function orderTrackingSteps(order = {}) {
  const status = normalizedOrderStatus(order.status);
  if (isPrescriptionOrder(order)) {
    const quoted = prescriptionQuoteIsSet(order);
    return [
      {
        key: "placed",
        title: "Request submitted",
        helper: formatProfileDate(order.createdAt) || "Prescription request submitted"
      },
      {
        key: "quote",
        title: quoted ? "Price shared" : "Admin price review",
        helper: quoted ? "Admin added the medicine price and delivery charge. Check your email and order total." : "Admin is checking medicine availability and price."
      },
      {
        key: "confirmed",
        title: "Order confirmed",
        helper: status === "confirmed" ? "Admin confirmed your prescribed medicine order." : "The order will be confirmed after price/payment review."
      },
      {
        key: "onway",
        title: "On the way",
        helper: "The prescribed medicine order is out for delivery."
      },
      {
        key: "delivered",
        title: "Delivered",
        helper: status === "delivered" && formatProfileDate(order.updatedAt) ? `Delivered or completed by ${formatProfileDate(order.updatedAt)}.` : "Order received by the customer."
      }
    ];
  }
  const paymentReviewLabel = order.paymentMethod === "cod" ? "Delivery fee review" : "Payment review";
  const paymentWaitingText = order.paymentMethod === "cod"
    ? "Waiting for admin to verify the delivery-fee payment."
    : "Waiting for admin to verify the payment.";
  return [
    {
      key: "placed",
      title: "Order placed",
      helper: formatProfileDate(order.createdAt) || "Order placed"
    },
    {
      key: "payment",
      title: paymentReviewLabel,
      helper: status === "pending" ? "Payment details are not confirmed yet." : paymentWaitingText
    },
    {
      key: "confirmed",
      title: "Payment confirmed",
      helper: "Admin approved the payment and confirmed the order."
    },
    {
      key: "onway",
      title: "On the way",
      helper: "The order is out for delivery."
    },
    {
      key: "delivered",
      title: "Delivered",
      helper: status === "delivered" && formatProfileDate(order.updatedAt) ? `Delivered or completed by ${formatProfileDate(order.updatedAt)}.` : "Order received by the customer."
    }
  ];
}

function renderOrderTracking(order = {}, { compact = false } = {}) {
  const status = normalizedOrderStatus(order.status);
  const isCancelled = status === "cancelled";
  const steps = orderTrackingSteps(order);
  const currentIndex = isCancelled ? Math.min(trackingStepIndex(order.status), steps.length - 1) : trackingStepIndex(order.status);
  const progress = isCancelled ? 100 : Math.round((currentIndex / Math.max(steps.length - 1, 1)) * 100);
  const currentLabel = isCancelled ? "Cancelled" : statusLabel(status);
  const progressText = isCancelled ? "Stopped" : `${progress}%`;
  const updatedText = formatProfileDate(order.updatedAt);

  return `
    <div class="profile-order-tracking${compact ? " compact" : ""}${isCancelled ? " is-cancelled" : ""}" aria-label="Order tracking progress">
      <div class="tracking-head">
        <div>
          <span class="tracking-kicker">Tracking</span>
          <strong>${escapeHtml(currentLabel)}</strong>
          ${updatedText ? `<small>Last updated: ${escapeHtml(updatedText)}</small>` : ""}
        </div>
        <span class="tracking-percent">${escapeHtml(progressText)}</span>
      </div>
      ${isCancelled ? `<div class="tracking-cancelled-note">This order was cancelled. The normal delivery progress has stopped.</div>` : ""}
      <div class="tracking-bar" aria-hidden="true"><span style="width: ${escapeHtml(String(progress))}%"></span></div>
      <div class="tracking-steps">
        ${steps.map((step, index) => {
          const state = isCancelled
            ? (index <= currentIndex ? "complete" : "pending")
            : (index < currentIndex ? "complete" : (index === currentIndex ? "active" : "pending"));
          return `
            <div class="tracking-step is-${state}">
              <span class="tracking-dot" aria-hidden="true">${state === "complete" ? "✓" : ""}</span>
              <span class="tracking-step-copy">
                <strong>${escapeHtml(step.title)}</strong>
                ${compact ? "" : `<small>${escapeHtml(step.helper || "")}</small>`}
              </span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderLatestOrderTrackingCard({ showViewAll = true, showOrderButton = true, viewAllHref = "/profile/orders/history" } = {}) {
  const latestOrder = storeState.orders.find((order) => isActiveOrder(order.status)) || storeState.orders[0];
  if (!latestOrder) {
    return `
      <section class="admin-card profile-section-card profile-latest-tracking">
        <div class="section-head compact-head"><div><p class="section-kicker">Order Tracking</p><h2>No active order yet</h2><p class="section-copy">Your newest store order progress will appear here after checkout.</p></div></div>
        ${showOrderButton ? `<a class="btn btn-primary" href="/Store">Open Store</a>` : ""}
      </section>
    `;
  }
  return `
    <section class="admin-card profile-section-card profile-latest-tracking">
      <div class="section-head compact-head">
        <div><p class="section-kicker">Order Tracking</p><h2>Latest order progress</h2><p class="section-copy">This page shows only your newest order progress so the history page stays clean.</p></div>
        ${showViewAll ? `<a class="small-btn" href="${escapeHtml(viewAllHref)}">View full history</a>` : ""}
      </div>
      <div class="latest-tracking-product">
        <strong>${escapeHtml(latestOrder.productName || "Product")}</strong>
        <span>${orderPriceSummary(latestOrder)}</span>
      </div>
      ${renderOrderTracking(latestOrder)}
    </section>
  `;
}

function initials(name = "") {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function slugify(value = "") {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "product";
}

function productTypeSegment(type = "") {
  return String(type || "medicine") === "equipment" ? "equipment" : "medicine";
}

function productUrl(product = {}) {
  const id = String(product.id || "").trim();
  const nameSlug = slugify(product.name || "product");
  const segment = productTypeSegment(product.productType);
  if (id) {
    return `/Store/product/?id=${encodeURIComponent(id)}&type=${encodeURIComponent(segment)}&slug=${encodeURIComponent(nameSlug)}`;
  }
  return `/Store/${segment}/${encodeURIComponent(nameSlug)}`;
}

function productTypeLabel(type = "") {
  return String(type || "medicine") === "equipment" ? "Medical Equipment" : "Medicine Store";
}

function storeCategoryFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean).map((part) => part.toLowerCase());
  if (parts[0] !== "store") return "";
  if (parts[1] === "equipment") return "equipment";
  if (parts[1] === "medicine") return "medicine";
  if (parts[1] === "product") {
    const queryType = new URLSearchParams(window.location.search).get("type") || new URLSearchParams(window.location.search).get("category") || "";
    return String(queryType).toLowerCase() === "equipment" ? "equipment" : "medicine";
  }
  return "";
}

function currentStoreCategory() {
  const pathCategory = storeCategoryFromPath();
  if (pathCategory) return pathCategory;
  const value = String(document.body?.dataset.storeCategory || "medicine").toLowerCase();
  return value === "equipment" ? "equipment" : "medicine";
}

function currentStoreCategoryLabel() {
  return productTypeLabel(currentStoreCategory());
}

function productIdFromPath() {
  const query = new URLSearchParams(window.location.search);
  const queryId = query.get("id") || query.get("productId") || query.get("product");
  if (/^\d+$/.test(String(queryId || "").trim())) return String(queryId).trim();

  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() !== "store") return "";
  const storeSegment = (parts[1] || "").toLowerCase();
  if (storeSegment === "prescribed") return "";

  const candidates = [parts[2], parts[1], parts[3]].filter(Boolean);
  for (const candidate of candidates) {
    const decoded = decodeURIComponent(candidate);
    const match = decoded.match(/^\d+/) || decoded.match(/(?:^|-)id-(\d+)(?:-|$)/i) || decoded.match(/(?:^|-)(\d+)(?:-|$)/);
    if (match) return match[1] || match[0].replace(/\D/g, "");
  }
  return "";
}

function isProductDetailPath() {
  return Boolean(productIdFromPath());
}

function syncStorePagePanels() {
  const isDetail = isProductDetailPath();
  const hubSection = qs("#storeHubSection");
  const listSection = qs("#storeListSection");
  const detailSection = qs("#productDetailSection");
  if (hubSection) hubSection.hidden = isDetail;
  if (listSection) listSection.hidden = isDetail;
  if (detailSection) detailSection.hidden = !isDetail;
}

async function api(url, options = {}) {
  const headers = {
    accept: "application/json",
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(storeState.token ? { authorization: `Bearer ${storeState.token}` } : {}),
    ...(options.headers || {})
  };
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeout || 12000);
  try {
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text };
    }
    if (!response.ok) {
      const requestError = new Error(data.error || `Request failed: ${response.status}`);
      requestError.status = response.status;
      requestError.data = data;
      throw requestError;
    }
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

function productPhoto(product = {}, className = "store-product-photo") {
  const photo = String(product.photoUrl || "").trim();
  if (photo) return `<div class="${className} has-photo"><img src="${escapeHtml(photo)}" alt="${escapeHtml(product.name || "Product")}" loading="lazy" decoding="async" /></div>`;
  return `<div class="${className} store-product-photo-empty" aria-hidden="true">${String(product.productType || "medicine") === "equipment" ? "🩺" : "💊"}</div>`;
}

function userPhoto(user = {}, className = "user-profile-photo") {
  const photo = String(user.photoUrl || "").trim();
  if (photo) return `<span class="${className} has-photo"><img src="${escapeHtml(photo)}" alt="${escapeHtml(user.fullName || "User")}" loading="lazy" decoding="async" /></span>`;
  return `<span class="${className}">${escapeHtml(initials(user.fullName || "User"))}</span>`;
}

function renderAuthArea() {
  qsa("[data-auth-area]").forEach((area) => {
    if (storeState.user) {
      area.innerHTML = `
        <a class="profile-button" href="/profile" aria-label="Open product dashboard">
          ${userPhoto(storeState.user, "profile-button-photo")}
        </a>
      `;
      return;
    }
    area.innerHTML = `<a class="btn btn-secondary auth-open-button" href="/signup">Sign up</a>`;
  });
}

function authRedirectTarget(fallback = "/profile") {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "";
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

function currentPathForNext() {
  return `${window.location.pathname}${window.location.search || ""}`;
}

function goToAuthPage(mode = "login") {
  const base = mode === "signup" ? "/signup" : "/login";
  const next = encodeURIComponent(currentPathForNext());
  window.location.href = `${base}?next=${next}`;
}

function isAuthPage() {
  return document.body?.dataset.authPage === "login" || document.body?.dataset.authPage === "signup";
}

function ensureAuthModal() {
  // Login and sign up are now separate pages: /login and /signup.
}

function renderAuthPageHints() {
  const target = authRedirectTarget("/profile");
  const next = encodeURIComponent(target);
  qsa("[data-login-next-link]").forEach((link) => { link.href = `/login?next=${next}`; });
  qsa("[data-signup-next-link]").forEach((link) => { link.href = `/signup?next=${next}`; });
  qsa("[data-google-auth-link]").forEach((link) => { link.href = `/api/store/auth/google/start?next=${next}`; });
}

function ensureCheckoutModal() {
  if (qs("#storeCheckoutModal")) return;
  const modal = document.createElement("div");
  modal.className = "store-modal hidden";
  modal.id = "storeCheckoutModal";
  modal.innerHTML = `
    <div class="store-modal-backdrop" data-close-store-modal></div>
    <section class="store-modal-card" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle">
      <button class="modal-close" type="button" data-close-store-modal aria-label="Close">×</button>
      <p class="section-kicker">Checkout</p>
      <h2 id="checkoutTitle">Complete your order</h2>
      <div id="checkoutProductSummary" class="checkout-product-summary"></div>
      <form id="storeCheckoutForm" class="form-grid">
        <input type="hidden" id="checkoutProductId" />
        <div class="form-group full"><label for="checkoutFullName">Full Name</label><input class="form-input" id="checkoutFullName" required /></div>
        <div class="form-group"><label for="checkoutDeliveryLocation">Delivery Location</label><input class="form-input" id="checkoutDeliveryLocation" placeholder="Feni or your city/area" /></div>
        <div class="form-group full"><label for="checkoutAddress">Full Address</label><textarea class="form-textarea" id="checkoutAddress" required></textarea><button class="small-btn location-auto-button" type="button" data-use-current-location data-location-target="#checkoutAddress" data-location-short-target="#checkoutDeliveryLocation">Use my current location</button><small class="form-help">Tap to auto-fill your delivery address and area. If permission is denied, allow Location from browser site settings or type manually.</small></div>
        <div class="form-group"><label for="checkoutPhone">Phone Number</label><input class="form-input" id="checkoutPhone" required /></div>
        <div class="form-group"><label for="checkoutQuantity">Quantity</label><input class="form-input" id="checkoutQuantity" type="number" min="1" value="1" required /></div>
        <div class="form-group full"><label for="checkoutPaymentMethod">Payment Method</label><select class="form-input" id="checkoutPaymentMethod"><option value="cod">Cash on Delivery</option><option value="bkash_nagad">bKash and Nagad</option></select></div>
        <div class="form-group cod-delivery-payment-field full"><label for="checkoutDeliveryPaymentMethod">Pay Delivery Fee With</label><select class="form-input" id="checkoutDeliveryPaymentMethod"><option value="bkash">bKash delivery fee</option><option value="nagad">Nagad delivery fee</option></select></div>
        <div class="payment-instruction-card full" id="manualPaymentInstruction"></div>
        <div class="form-group manual-payment-field"><label for="checkoutSenderNumber">Sender Number</label><input class="form-input" id="checkoutSenderNumber" placeholder="Number used to send money" /></div>
        <div class="form-group manual-payment-field"><label for="checkoutTransactionId">Transaction ID</label><input class="form-input" id="checkoutTransactionId" placeholder="bKash/Nagad transaction ID" /></div>
        <button class="btn btn-primary btn-block full" type="submit">Place Order</button>
      </form>
    </section>
  `;
  document.body.append(modal);
}

function showModal(id) {
  if (id === "#storeAuthModal") {
    goToAuthPage("login");
    return;
  }
  ensureCheckoutModal();
  qs(id)?.classList.remove("hidden");
}

function hideModals() {
  qsa(".store-modal").forEach((modal) => modal.classList.add("hidden"));
}

function ensureLightboxModal() {
  if (qs("#storeLightboxModal")) return;
  const modal = document.createElement("div");
  modal.className = "store-modal store-lightbox hidden";
  modal.id = "storeLightboxModal";
  modal.innerHTML = `
    <div class="store-modal-backdrop" data-close-store-modal></div>
    <section class="store-lightbox-card" role="dialog" aria-modal="true" aria-label="Product photo preview">
      <button class="modal-close" type="button" data-close-store-modal aria-label="Close">×</button>
      <img id="storeLightboxImage" class="store-lightbox-image" alt="Product photo" />
    </section>
  `;
  document.body.append(modal);
}

function openLightbox(src = "") {
  const imageSrc = String(src || "").trim();
  if (!imageSrc) return;
  ensureLightboxModal();
  const img = qs("#storeLightboxImage");
  if (img) img.src = imageSrc;
  qs("#storeLightboxModal")?.classList.remove("hidden");
}

function switchAuthTab(tab) {
  goToAuthPage(tab === "signup" ? "signup" : "login");
}

function setSignupPhotoPreview(value = "") {
  const selected = String(value || "").trim();
  if (qs("#signupPhotoUrl")) qs("#signupPhotoUrl").value = selected;
  qsa("[data-avatar-choice]").forEach((button) => {
    const isSelected = String(button.dataset.avatarChoice || "") === selected;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function renderSignupAvatarChoices() {
  const picker = qs("#signupAvatarPicker");
  if (!picker) return;
  const selected = qs("#signupPhotoUrl")?.value || "";
  const choices = (Array.isArray(storeState.avatars) ? storeState.avatars : []).filter((avatar) => avatar.isActive !== false && avatar.photoUrl);
  picker.innerHTML = `
    <button class="avatar-choice none-choice${selected ? "" : " is-selected"}" type="button" data-avatar-choice="" aria-pressed="${selected ? "false" : "true"}">
      <span class="avatar-choice-empty">No photo</span>
    </button>
    ${choices.map((avatar) => `
      <button class="avatar-choice${selected === avatar.photoUrl ? " is-selected" : ""}" type="button" data-avatar-choice="${escapeHtml(avatar.photoUrl)}" aria-label="Choose ${escapeHtml(avatar.label || "profile photo")}" aria-pressed="${selected === avatar.photoUrl ? "true" : "false"}">
        <img src="${escapeHtml(avatar.photoUrl)}" alt="${escapeHtml(avatar.label || "Profile photo")}" loading="lazy" />
      </button>
    `).join("")}
  `;
}

function renderProfileAvatarChoices() {
  const picker = qs("#profileAvatarPicker");
  if (!picker) return;
  const selected = qs("#profilePhotoUrl")?.value || storeState.user?.photoUrl || "";
  const choices = (Array.isArray(storeState.avatars) ? storeState.avatars : []).filter((avatar) => avatar.isActive !== false && avatar.photoUrl);
  picker.innerHTML = `
    <button class="avatar-choice none-choice${selected ? "" : " is-selected"}" type="button" data-profile-avatar-choice="" aria-pressed="${selected ? "false" : "true"}">
      <span class="avatar-choice-empty">No photo</span>
    </button>
    ${choices.map((avatar) => `
      <button class="avatar-choice${selected === avatar.photoUrl ? " is-selected" : ""}" type="button" data-profile-avatar-choice="${escapeHtml(avatar.photoUrl)}" aria-label="Choose ${escapeHtml(avatar.label || "profile photo")}" aria-pressed="${selected === avatar.photoUrl ? "true" : "false"}">
        <img src="${escapeHtml(avatar.photoUrl)}" alt="${escapeHtml(avatar.label || "Profile photo")}" loading="lazy" />
      </button>
    `).join("")}
  `;
}

function setProfilePhotoPreview(value = "") {
  const selected = String(value || "").trim();
  const input = qs("#profilePhotoUrl");
  const preview = qs("#profilePhotoPreview");
  if (input) input.value = selected;

  if (preview) {
    if (selected) {
      preview.classList.add("has-photo");
      preview.innerHTML = `<img src="${escapeHtml(selected)}" alt="Profile photo preview" loading="eager" decoding="async" />`;
    } else {
      preview.classList.remove("has-photo");
      preview.innerHTML = "No avatar selected";
    }
  }

  qsa("[data-profile-avatar-choice]").forEach((button) => {
    const isSelected = String(button.dataset.profileAvatarChoice || "") === selected;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

async function loadAvatars(force = false) {
  if (!force && !qs("#signupAvatarPicker") && !qs("#profileAvatarPicker")) return;
  try {
    const data = await api("/api/store/avatars");
    storeState.avatars = Array.isArray(data.avatars) ? data.avatars : [];
  } catch {
    storeState.avatars = [];
  }
  renderSignupAvatarChoices();
  renderProfileAvatarChoices();
}

async function loadPaymentSettings() {
  try {
    const data = await api("/api/store/payment-settings");
    storeState.paymentSettings = { ...storeState.paymentSettings, ...(data.paymentSettings || {}) };
  } catch {
    // Keep checkout usable even if the store payment settings endpoint is temporarily unavailable.
  }
}

function resizeImageFile(file, maxSize = 760, quality = 0.74) {
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
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(mime, mime === "image/jpeg" ? quality : undefined));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function readPrescriptionFile(file) {
  if (!file) return Promise.resolve("");
  if (file.type.startsWith("image/")) return resizeImageFile(file, 900, 0.74).then((dataUrl) => { if (dataUrl.length > 950000) throw new Error("Prescription image is too large after compression. Please choose a smaller photo."); return dataUrl; });
  if (file.type === "application/pdf") {
    if (file.size > 900 * 1024) return Promise.reject(new Error("Prescription PDF must be under 900 KB on the free plan."));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the prescription file."));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
  }
  return Promise.reject(new Error("Upload a prescription image or PDF."));
}

function updatePrescriptionQuantityVisibility() {
  const medicineInput = qs("#prescriptionMedicineName");
  const quantityGroup = qs("#prescriptionQuantityGroup");
  if (!medicineInput || !quantityGroup) return;
  const hasMedicine = Boolean(medicineInput.value.trim());
  quantityGroup.hidden = !hasMedicine;
  qs("#prescriptionQuantity")?.toggleAttribute("required", hasMedicine);
}

function prescriptionQuantityOptions() {
  return Array.from({ length: 99 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join("");
}

function renderPrescriptionOrderPage() {
  const container = qs("#prescriptionOrderPage");
  if (!container) return;
  if (!storeState.user) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>Please log in first</h2>
        <p>You need an account to place prescribed medicine orders.</p>
        <div class="form-actions center-actions"><a class="btn btn-primary" href="/login?next=${encodeURIComponent(window.location.pathname)}">Log in</a><a class="btn btn-ghost" href="/signup?next=${encodeURIComponent(window.location.pathname)}">Sign up</a></div>
      </div>`;
    return;
  }
  container.innerHTML = `
    <div class="prescription-order-grid">
      <article class="product-detail-card prescription-order-card">
        <p class="section-kicker">Prescribed Medicine</p>
        <h2>Request custom medicine</h2>
        <p class="section-copy">Type the medicine name manually, upload a prescription, or provide prescription instructions. After admin confirms the price, you can choose Cash on Delivery or bKash/Nagad from your Order Status page.</p>
        <form id="prescriptionOrderForm" class="form-grid">
          <div class="form-group full"><label for="prescriptionFullName">Full Name</label><input class="form-input" id="prescriptionFullName" required value="${escapeHtml(storeState.user?.fullName || "")}" /></div>
          <div class="form-group"><label for="prescriptionPhone">Phone Number</label><input class="form-input" id="prescriptionPhone" required value="${escapeHtml(storeState.user?.phone || "")}" /></div>
          <div class="form-group"><label for="prescriptionDeliveryLocation">Delivery Location</label><input class="form-input" id="prescriptionDeliveryLocation" placeholder="Feni or your city/area" /></div>
          <div class="form-group full"><label for="prescriptionAddress">Full Address</label><textarea class="form-textarea" id="prescriptionAddress" required placeholder="House, road, area, city"></textarea><button class="small-btn location-auto-button" type="button" data-use-current-location data-location-target="#prescriptionAddress" data-location-short-target="#prescriptionDeliveryLocation">Use my current location</button><small class="form-help">Tap to auto-fill your delivery address, or type it manually.</small></div>
          <div class="form-group prescription-medicine-row full">
            <div><label for="prescriptionMedicineName">Medicine Name</label><input class="form-input" id="prescriptionMedicineName" placeholder="Example: Napa Extra 500mg" /></div>
            <div id="prescriptionQuantityGroup" hidden><label for="prescriptionQuantity">Quantity</label><select class="form-input" id="prescriptionQuantity">${prescriptionQuantityOptions()}</select></div>
          </div>
          <div class="form-group full"><label for="prescriptionUpload">Upload Prescription</label><input class="form-input" id="prescriptionUpload" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /><input id="prescriptionFileUrl" type="hidden" /><small class="form-help" id="prescriptionFileStatus">Optional. JPG, PNG, WEBP, or PDF supported.</small></div>
          <div class="form-group full"><label for="prescriptionText">Prescription / Medicine Details</label><textarea class="form-textarea" id="prescriptionText" placeholder="You can type doctor prescription details, dosage note, or extra medicines here."></textarea></div>
          <button class="btn btn-primary btn-block full" type="submit">Submit Prescription Order</button>
        </form>
      </article>
      <aside class="admin-card checkout-help-card">
        <p class="section-kicker">Custom order flow</p>
        <h2>Price first, payment after</h2>
        <p class="section-copy">Prescribed medicine orders do not show instant pricing. Admin sets the medicine price and delivery charge first, then you can pay like the other store orders: Cash on Delivery with delivery fee paid first, or full bKash/Nagad payment.</p>
      </aside>
    </div>`;
  updatePrescriptionQuantityVisibility();
  initStoreLocationPermissionButtons(container);
}

async function placePrescriptionOrder(event) {
  event.preventDefault();
  try {
    const payload = {
      orderType: "prescription",
      fullName: qs("#prescriptionFullName")?.value.trim() || "",
      phone: qs("#prescriptionPhone")?.value.trim() || "",
      deliveryLocation: qs("#prescriptionDeliveryLocation")?.value.trim() || "",
      address: qs("#prescriptionAddress")?.value.trim() || "",
      medicineName: qs("#prescriptionMedicineName")?.value.trim() || "",
      quantity: Number(qs("#prescriptionQuantity")?.value || 1),
      prescriptionText: qs("#prescriptionText")?.value.trim() || "",
      prescriptionFileUrl: qs("#prescriptionFileUrl")?.value || ""
    };
    const data = await api("/api/store/orders", { method: "POST", body: JSON.stringify(payload), timeout: 20000 });
    storeState.orders = [data.order, ...storeState.orders.filter((item) => String(item.id) !== String(data.order.id))];
    toast("Prescription order submitted. Admin will review it soon.");
    setTimeout(() => { window.location.href = "/profile/orders"; }, 800);
  } catch (error) {
    toast(error.message || "Could not submit prescription order.");
  }
}

async function loadCurrentUser() {
  if (!storeState.token) {
    storeState.user = null;
    removeStoreCache("currentUser");
    renderAuthArea();
    return;
  }
  try {
    const data = await api("/api/store/auth/me");
    storeState.user = data.user || null;
    if (storeState.user) writeStoreCache("currentUser", { user: storeState.user });
  } catch (error) {
    // Do not randomly log users out because of a slow network, temporary API error,
    // or Cloudflare/Turso hiccup. Only clear the saved session when the server
    // specifically says the token is unauthorized/forbidden.
    if (error?.status === 401 || error?.status === 403) {
      storeState.token = "";
      storeState.user = null;
      localStorage.removeItem(userTokenKey);
      removeStoreCache("currentUser");
    } else {
      const cachedUser = readStoreCache("currentUser", 24 * 60 * 60 * 1000);
      if (cachedUser?.user) storeState.user = cachedUser.user;
      console.warn("Could not refresh current user; keeping local session.", error);
    }
  }
  renderAuthArea();
}

async function logIn(identifier, password) {
  const data = await api("/api/store/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password })
  });
  storeState.token = data.token;
  storeState.user = data.user;
  localStorage.setItem(userTokenKey, storeState.token);
  writeStoreCache("currentUser", { user: storeState.user });
  renderAuthArea();
  hideModals();
  toast("Logged in successfully.");
  await refreshUserData();
  if (isAuthPage()) window.location.href = authRedirectTarget("/profile");
}

async function signUp(payload) {
  const data = await api("/api/store/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (data.needsVerification) {
    toast(data.message || "Account created. Please verify your email before logging in.");
    if (isAuthPage()) window.location.href = "/login?verify=1";
    return;
  }
  storeState.token = data.token;
  storeState.user = data.user;
  localStorage.setItem(userTokenKey, storeState.token);
  writeStoreCache("currentUser", { user: storeState.user });
  renderAuthArea();
  hideModals();
  toast("Account created successfully.");
  await refreshUserData();
  if (isAuthPage()) window.location.href = authRedirectTarget("/profile");
}

async function updateProfile(payload) {
  const data = await api("/api/store/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  storeState.user = data.user;
  writeStoreCache("currentUser", { user: storeState.user });
  renderAuthArea();
  renderProfileDashboard();
  initPasswordVisibilityToggles(qs("#profileDashboard") || document);
  toast("Profile updated successfully.");
}

async function updatePassword(payload) {
  const data = await api("/api/store/auth/password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (data.user) {
    storeState.user = data.user;
    writeStoreCache("currentUser", { user: storeState.user });
    renderAuthArea();
  }
  toast("Password updated successfully.");
}


async function loadProducts() {
  try {
    const data = await api("/api/store/products");
    storeState.products = Array.isArray(data.products) ? data.products : [];
    writeStoreCache("products", { products: storeState.products });
  } catch (error) {
    const cached = readStoreCache("products");
    if (Array.isArray(cached?.products)) {
      storeState.products = cached.products;
      return;
    }
    const message = error.message || "Could not load store products.";
    if (qs("#storeGrid")) qs("#storeGrid").innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
    throw error;
  }
}

async function loadCart() {
  if (!storeState.user) {
    storeState.cart = [];
    return;
  }
  try {
    const data = await api("/api/store/cart");
    storeState.cart = Array.isArray(data.cart) ? data.cart : [];
  } catch {
    storeState.cart = [];
  }
}

async function loadOrders() {
  if (!storeState.user) {
    storeState.orders = [];
    return;
  }
  try {
    const data = await api("/api/store/orders");
    storeState.orders = Array.isArray(data.orders) ? data.orders : [];
  } catch {
    storeState.orders = [];
  }
}

async function loadUserReviews() {
  if (!storeState.user) {
    storeState.userReviews = [];
    return;
  }
  try {
    const data = await api("/api/store/comments?mine=1");
    storeState.userReviews = Array.isArray(data.reviews) ? data.reviews : Array.isArray(data.comments) ? data.comments : [];
  } catch {
    storeState.userReviews = [];
  }
}

async function refreshUserData() {
  await Promise.all([loadCart(), loadOrders(), loadUserReviews()]);
  renderProfileDashboard();
}

function renderStoreGrid() {
  const grid = qs("#storeGrid");
  if (!grid) return;
  const category = currentStoreCategory();
  const products = storeState.products.filter((product) => product.isActive !== false && String(product.productType || "medicine") === category);
  if (!products.length) {
    grid.innerHTML = `<div class="empty-state">No ${escapeHtml(currentStoreCategoryLabel().toLowerCase())} products are available right now.</div>`;
    return;
  }
  grid.innerHTML = products.map((product) => `
    <article class="store-card">
      <a class="store-card-link" data-product-detail-link href="${productUrl(product)}" aria-label="View ${escapeHtml(product.name)}">
        ${productPhoto(product)}
        <div class="store-card-body">
          <h3>${escapeHtml(product.name)}</h3>
          <p class="store-price">${money(product.price)}</p>
          <p class="store-stock">${Number(product.stock || 0) > 0 ? `${escapeHtml(String(product.stock))} in stock` : "Out of stock"}</p>
        </div>
      </a>
      <div class="card-actions store-card-actions">
        <button class="btn btn-primary" type="button" data-store-order="${escapeHtml(product.id)}">Order Now</button>
        <button class="btn btn-ghost" type="button" data-store-cart="${escapeHtml(product.id)}">Add to Cart</button>
      </div>
    </article>
  `).join("");
}

async function loadProductComments(productId) {
  if (!productId) return [];
  try {
    const data = await api(`/api/store/comments?productId=${encodeURIComponent(productId)}`);
    storeState.comments[productId] = Array.isArray(data.comments) ? data.comments : [];
    return storeState.comments[productId];
  } catch {
    storeState.comments[productId] = [];
    return [];
  }
}

function ratingStars(value = 0) {
  const rating = Math.round(Number(value || 0));
  return "★★★★★".split("").map((star, index) => `<span class="${index < rating ? "is-filled" : ""}">${star}</span>`).join("");
}

async function renderProductDetail() {
  const container = qs("#productDetailPage");
  if (!container) return;
  const id = productIdFromPath();
  if (!id) {
    container.innerHTML = `<div class="empty-state"><h2>Product not found</h2></div>`;
    return;
  }

  let product = storeState.products.find((item) => String(item.id) === String(id));
  if (!product) {
    const cached = readStoreCache("products");
    if (Array.isArray(cached?.products)) {
      product = cached.products.find((item) => String(item.id) === String(id));
      if (!storeState.products.length) storeState.products = cached.products;
    }
  }
  if (!product) {
    try {
      const data = await api(`/api/store/products/${encodeURIComponent(id)}`);
      product = data.product;
    } catch (detailError) {
      try {
        await loadProducts();
        product = storeState.products.find((item) => String(item.id) === String(id));
      } catch (listError) {
        console.warn("Could not load product details.", detailError, listError);
        product = null;
      }
    }
  }

  if (!product) {
    container.innerHTML = `<div class="empty-state"><h2>Product not found</h2><p>This product is not available right now. Refresh the page or return to the Store Hub.</p><a class="btn btn-primary" href="/Store">Open Store Hub</a></div>`;
    return;
  }

  storeState.selectedProduct = product;
  document.title = `${product.name || "Product"} | ${productTypeLabel(product.productType)} | Medicare At Home`;
  const comments = await loadProductComments(product.id);
  const reviewThreads = filterReviewThreads(comments);
  const reviews = reviewThreads.filter((item) => item.isReview && !item.parentId);
  const average = reviews.length ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length : 0;
  const photos = [product.photoUrl, ...(Array.isArray(product.additionalPhotos) ? product.additionalPhotos : [])]
    .map((photo) => String(photo || "").trim())
    .filter(Boolean);
  const galleryMarkup = photos.length ? `
    <div class="product-gallery" data-product-gallery>
      <div class="product-gallery-track" data-gallery-track aria-label="Product photo gallery">
        ${photos.map((photo, index) => `
          <button class="product-detail-photo product-gallery-button product-gallery-slide" type="button" data-gallery-image="${escapeHtml(photo)}" aria-label="Open ${escapeHtml(product.name)} photo ${index + 1} of ${photos.length}">
            <img src="${escapeHtml(photo)}" alt="${escapeHtml(product.name)} photo ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}" />
          </button>
        `).join("")}
      </div>
      ${photos.length > 1 ? `
        <div class="product-gallery-controls" aria-label="Product gallery controls">
          <button class="product-gallery-nav" type="button" data-gallery-scroll="-1" aria-label="Previous product photo">‹</button>
          <span class="product-gallery-count">Swipe or scroll photos</span>
          <button class="product-gallery-nav" type="button" data-gallery-scroll="1" aria-label="Next product photo">›</button>
        </div>
      ` : ""}
    </div>
  ` : productPhoto(product, "product-detail-photo");

  container.innerHTML = `
    <article class="product-detail-card">
      <div class="product-detail-layout">
        <div>
          ${galleryMarkup}
        </div>
        <div class="product-detail-content">
          <p class="section-kicker">${escapeHtml(productTypeLabel(product.productType))}</p>
          <h2>${escapeHtml(product.name)}</h2>
          <p class="store-price product-price-large">${money(product.price)}</p>
          <div class="doctor-detail-grid product-info-grid">
            <div class="detail-row"><small>Feni Location Delivery Charge</small><strong>${money(productFeniDeliveryCharge(product))}</strong></div>
            <div class="detail-row"><small>Outside Feni Delivery Charge</small><strong>${money(productOutsideFeniDeliveryCharge(product))}</strong></div>
            <div class="detail-row"><small>Available Stock</small><strong>${escapeHtml(String(product.stock || 0))}</strong></div>
          </div>
          <p class="doctor-detail-bio">${escapeHtml(product.description || "No description added yet.")}</p>
          <div class="card-actions detail-actions">
            <button class="btn btn-primary" type="button" data-store-order="${escapeHtml(product.id)}">Order Now</button>
            <button class="btn btn-ghost" type="button" data-store-cart="${escapeHtml(product.id)}">Add to Cart</button>
          </div>
        </div>
      </div>
      <section class="reviews-section comments-section">
        <div class="section-head compact-head">
          <div>
            <p class="section-kicker">Customer Reviews</p>
            <h3>Public product reviews</h3>
            <p class="section-copy">Reviews are public. Only customers with a delivered order can rate this product from their profile.</p>
          </div>
          <div class="rating-summary review-summary"><span class="rating-stars">${ratingStars(average)}</span><strong>${reviews.length ? `${average.toFixed(1)} from ${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "No ratings yet"}</strong></div>
        </div>
        <div class="comment-list" id="storeReviewList">
          ${renderComments(reviewThreads)}
        </div>
      </section>
    </article>
  `;
}

function filterReviewThreads(comments = []) {
  const all = Array.isArray(comments) ? comments.filter(Boolean) : [];
  const byParent = new Map();
  all.forEach((item) => {
    const parentId = String(item.parentId || "");
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(item);
  });
  const keep = [];
  function addWithChildren(item) {
    keep.push(item);
    (byParent.get(String(item.id)) || []).forEach(addWithChildren);
  }
  (byParent.get("") || []).filter((item) => item.isReview).forEach(addWithChildren);
  return keep;
}

function groupCommentReplies(comments = []) {
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

function commentLabel(item = {}) {
  if (item.commenterType === "admin") return "Admin reply";
  return item.isReview ? "Verified purchase review" : "Customer reply";
}

function renderCommentThread(item = {}, replies = new Map(), depth = 0) {
  const childReplies = replies.get(String(item.id)) || [];
  return `
    <article class="comment-card ${item.commenterType === "admin" ? "is-admin-comment" : ""} ${depth ? "is-reply" : ""}">
      <div class="comment-card-head">
        <div><strong>${escapeHtml(item.userName || "Store User")}</strong><small>${escapeHtml(commentLabel(item))}</small></div>
        ${item.isReview ? `<span class="rating-stars">${ratingStars(item.rating)}</span>` : ""}
      </div>
      <p>${escapeHtml(item.comment)}</p>
      ${childReplies.length ? `<div class="comment-replies">${childReplies.map((reply) => renderCommentThread(reply, replies, depth + 1)).join("")}</div>` : ""}
    </article>
  `;
}

function renderComments(comments = []) {
  const visibleComments = filterReviewThreads(comments);
  if (!visibleComments.length) return `<div class="empty-state">No reviews yet. Delivered customers can review this product from their profile dashboard.</div>`;
  const { topLevel, replies } = groupCommentReplies(visibleComments);
  const reviewRoots = topLevel.filter((item) => item.isReview);
  return reviewRoots.map((item) => renderCommentThread(item, replies)).join("");
}

async function requireLoginForStoreAction() {
  if (storeState.user) return true;
  toast("Please log in first.");
  goToAuthPage("login");
  return false;
}

async function addToCart(productId) {
  if (!(await requireLoginForStoreAction())) return;
  try {
    const data = await api("/api/store/cart", { method: "POST", body: JSON.stringify({ productId, quantity: 1 }) });
    storeState.cart = data.cart || [];
    toast("Added to cart.");
    renderProfileDashboard();
    if (qs("#checkoutPage")) {
      setTimeout(() => { window.location.href = "/profile"; }, 700);
    }
  } catch (error) {
    toast(error.message || "Could not add to cart.");
  }
}

function checkoutProductSubtotal() {
  const product = storeState.checkoutProduct || {};
  const quantity = Math.max(1, Number(qs("#checkoutQuantity")?.value || 1));
  return Number(product.price || 0) * quantity;
}

function checkoutDeliveryFee() {
  const product = storeState.checkoutProduct || {};
  return deliveryChargeForLocation(product, currentCheckoutLocation());
}

function updateCheckoutSummary() {
  const product = storeState.checkoutProduct || {};
  const fee = checkoutDeliveryFee();
  const subtotal = checkoutProductSubtotal();
  const total = subtotal + fee;
  const locationLabel = currentCheckoutDeliveryLabel();
  const locationText = currentCheckoutLocation();
  const deliveryLabel = qs("#checkoutDeliveryRateLabel");
  const deliveryFees = qsa("#checkoutDeliveryFeeValue, #checkoutSummaryDeliveryFeeValue");
  const deliveryHint = qs("#checkoutDeliveryHint");
  const subtotalValue = qs("#checkoutSubtotalValue");
  const totalValue = qs("#checkoutTotalValue");
  if (deliveryLabel) deliveryLabel.textContent = locationLabel;
  deliveryFees.forEach((element) => { element.textContent = money(fee); });
  if (subtotalValue) subtotalValue.textContent = money(subtotal);
  if (totalValue) totalValue.textContent = money(total);
  if (deliveryHint) {
    deliveryHint.textContent = locationText
      ? `Using ${locationLabel} for “${locationText}”.`
      : `Default delivery charge is the Feni rate. Enter another location to see the outside-Feni rate.`;
  }
}

function getCheckoutProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("product") || params.get("id") || "";
}

function checkoutTotal() {
  return checkoutProductSubtotal() + checkoutDeliveryFee();
}

function updateCheckoutPaymentFields() {
  const methodSelect = qs("#checkoutPaymentMethod");
  const deliveryMethodSelect = qs("#checkoutDeliveryPaymentMethod");
  const bkashReady = Boolean(storeState.paymentSettings.bkashNumber);
  const nagadReady = Boolean(storeState.paymentSettings.nagadNumber);
  const setOptionState = (select, value, ready, label) => {
    const option = select?.querySelector(`option[value="${value}"]`);
    if (!option) return;
    option.disabled = !ready;
    option.textContent = ready ? label : `${label} (not configured)`;
  };
  setOptionState(methodSelect, "bkash_nagad", bkashReady || nagadReady, "bKash and Nagad");
  setOptionState(deliveryMethodSelect, "bkash", bkashReady, "bKash delivery fee");
  setOptionState(deliveryMethodSelect, "nagad", nagadReady, "Nagad delivery fee");

  if ((methodSelect?.value === "bkash_nagad" && !(bkashReady || nagadReady)) || (methodSelect?.value === "bkash" && !bkashReady) || (methodSelect?.value === "nagad" && !nagadReady)) methodSelect.value = "cod";
  if (deliveryMethodSelect && ((deliveryMethodSelect.value === "bkash" && !bkashReady) || (deliveryMethodSelect.value === "nagad" && !nagadReady) || !deliveryMethodSelect.value)) {
    deliveryMethodSelect.value = bkashReady ? "bkash" : (nagadReady ? "nagad" : "");
  }

  updateCheckoutSummary();

  const method = methodSelect?.value || "cod";
  const isManual = method === "bkash_nagad" || method === "bkash" || method === "nagad";
  const isCod = method === "cod";
  const sender = qs("#checkoutSenderNumber");
  const transaction = qs("#checkoutTransactionId");
  qsa(".manual-payment-field").forEach((field) => field.classList.toggle("hidden", !(isManual || isCod)));
  qsa(".cod-delivery-payment-field").forEach((field) => field.classList.toggle("hidden", !isCod));
  if (sender) sender.required = isManual || isCod;
  if (transaction) transaction.required = isManual || isCod;
  if (deliveryMethodSelect) deliveryMethodSelect.required = isCod;

  const instruction = qs("#manualPaymentInstruction");
  if (!instruction) return;
  if (isCod) {
    const advanceMethod = deliveryMethodSelect?.value || (bkashReady ? "bkash" : (nagadReady ? "nagad" : ""));
    const number = advanceMethod === "bkash" ? storeState.paymentSettings.bkashNumber : storeState.paymentSettings.nagadNumber;
    instruction.innerHTML = `
      <strong>Cash on Delivery: delivery fee must be paid first</strong>
      <p>Pay only the delivery fee now: <b>${money(checkoutDeliveryFee())}</b>. Pay product price <b>${money(checkoutProductSubtotal())}</b> when the order is delivered.</p>
      <p>Send delivery fee by ${escapeHtml(advanceMethod ? paymentChannelLabel(advanceMethod) : "bKash/Nagad")} to: <b>${escapeHtml(number || "Payment number not configured yet")}</b></p>
      <p>After sending, enter your sender number and Transaction ID to complete the order.</p>
    `;
    return;
  }
  instruction.innerHTML = `
    <strong>${paymentMethodLabel(method)}</strong>
    <p>Total to send now: <b>${money(checkoutTotal())}</b></p>
    <p>Send payment to:<br />${paymentDestinationHtml()}</p>
    <p>${escapeHtml(storeState.paymentSettings.instructions || "After payment, enter your sender number and Transaction ID. Admin will verify it manually.")}</p>
  `;
}

function checkoutPageUrl(productId = "") {
  return `/checkout?product=${encodeURIComponent(productId)}`;
}

function openCheckout(productId) {
  if (!productId) return;
  window.location.href = checkoutPageUrl(productId);
}

async function startOrder(productId) {
  if (!productId) return;
  const target = checkoutPageUrl(productId);
  if (!storeState.user) {
    window.location.href = `/login?next=${encodeURIComponent(target)}`;
    return;
  }
  window.location.href = target;
}

function checkoutFormMarkup(product = {}) {
  return `
    <div class="checkout-page-grid">
      <article class="product-detail-card checkout-page-card">
        <p class="section-kicker">Checkout</p>
        <h2>Complete your order</h2>
        <div id="checkoutProductSummary" class="checkout-product-summary">
          <div class="checkout-summary-card">
            ${productPhoto(product, "checkout-product-photo")}
            <div>
              <strong>${escapeHtml(product.name)}</strong>
              <p>${money(product.price)} + <span id="checkoutSummaryDeliveryFeeValue">${money(productFeniDeliveryCharge(product))}</span> delivery</p>
              <small id="checkoutDeliveryHint">Default delivery charge is the Feni rate.</small>
            </div>
          </div>
        </div>
        <form id="storeCheckoutForm" class="form-grid">
          <input type="hidden" id="checkoutProductId" value="${escapeHtml(product.id)}" />
          <div class="form-group full"><label for="checkoutFullName">Full Name</label><input class="form-input" id="checkoutFullName" required value="${escapeHtml(storeState.user?.fullName || "")}" /></div>
          <div class="form-group"><label for="checkoutDeliveryLocation">Delivery Location</label><input class="form-input" id="checkoutDeliveryLocation" placeholder="Feni or your city/area" /></div>
          <div class="form-group full"><label for="checkoutAddress">Full Address</label><textarea class="form-textarea" id="checkoutAddress" required placeholder="House, road, area, city"></textarea><button class="small-btn location-auto-button" type="button" data-use-current-location data-location-target="#checkoutAddress" data-location-short-target="#checkoutDeliveryLocation">Use my current location</button><small class="form-help">Tap to auto-fill your delivery address and area. If permission is denied, allow Location from browser site settings or type manually.</small></div>
          <div class="form-group"><label for="checkoutPhone">Phone Number</label><input class="form-input" id="checkoutPhone" required /></div>
          <div class="form-group"><label for="checkoutQuantity">Quantity</label><input class="form-input" id="checkoutQuantity" type="number" min="1" max="${escapeHtml(String(Math.max(1, Number(product.stock || 1))))}" value="1" required /></div>
          <div class="payment-instruction-card full checkout-total-card">
            <strong>Order total</strong>
            <p>Product subtotal: <b id="checkoutSubtotalValue">${money(product.price)}</b></p>
            <p>Delivery: <b id="checkoutDeliveryRateLabel">Feni rate</b> — <b id="checkoutDeliveryFeeValue">${money(productFeniDeliveryCharge(product))}</b></p>
            <p>Current total: <b id="checkoutTotalValue">${money(Number(product.price || 0) + productFeniDeliveryCharge(product))}</b></p>
          </div>
          <div class="form-group full"><label for="checkoutPaymentMethod">Payment Method</label><select class="form-input" id="checkoutPaymentMethod"><option value="cod">Cash on Delivery</option><option value="bkash_nagad">bKash and Nagad</option></select></div>
          <div class="form-group cod-delivery-payment-field full"><label for="checkoutDeliveryPaymentMethod">Pay Delivery Fee With</label><select class="form-input" id="checkoutDeliveryPaymentMethod"><option value="bkash">bKash delivery fee</option><option value="nagad">Nagad delivery fee</option></select></div>
          <div class="payment-instruction-card full" id="manualPaymentInstruction"></div>
          <div class="form-group manual-payment-field"><label for="checkoutSenderNumber">Sender Number</label><input class="form-input" id="checkoutSenderNumber" placeholder="Number used to send money" /></div>
          <div class="form-group manual-payment-field"><label for="checkoutTransactionId">Transaction ID</label><input class="form-input" id="checkoutTransactionId" placeholder="bKash/Nagad transaction ID" /></div>
          <button class="btn btn-primary btn-block full" type="submit">Place Order</button>
        </form>
      </article>
      <aside class="admin-card checkout-help-card">
        <p class="section-kicker">Payment rule</p>
        <h2>COD still needs delivery fee first</h2>
        <p class="section-copy">For Cash on Delivery, the product price is paid when delivered, but the delivery charge must be paid in advance by bKash or Nagad before submitting the order.</p>
      </aside>
    </div>
  `;
}

async function renderCheckoutPage() {
  const container = qs("#checkoutPage");
  if (!container) return;
  const productId = getCheckoutProductId();
  if (!storeState.user) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return;
  }
  if (!productId) {
    container.innerHTML = `<div class="empty-state"><h2>No product selected</h2><p>Please choose a product from the store first.</p></div>`;
    return;
  }
  try {
    const data = await api(`/api/store/products/${encodeURIComponent(productId)}`);
    const product = data.product;
    if (!product) throw new Error("Product not found.");
    storeState.checkoutProduct = product;
    document.title = `Checkout ${product.name || "Product"} | Medicare At Home`;
    container.innerHTML = checkoutFormMarkup(product);
    updateCheckoutPaymentFields();
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h2>Product not found</h2><p>${escapeHtml(error.message || "This product is not available right now.")}</p></div>`;
  }
}

async function placeOrder(event) {
  event.preventDefault();
  try {
    const payload = {
      productId: qs("#checkoutProductId").value,
      fullName: qs("#checkoutFullName").value.trim(),
      address: qs("#checkoutAddress").value.trim(),
      deliveryLocation: qs("#checkoutDeliveryLocation")?.value.trim() || "",
      phone: qs("#checkoutPhone").value.trim(),
      quantity: Number(qs("#checkoutQuantity").value || 1),
      paymentMethod: qs("#checkoutPaymentMethod")?.value || "cod",
      deliveryPaymentMethod: qs("#checkoutDeliveryPaymentMethod")?.value || "",
      senderNumber: qs("#checkoutSenderNumber")?.value.trim() || "",
      transactionId: qs("#checkoutTransactionId")?.value.trim() || ""
    };
    const data = await api("/api/store/orders", { method: "POST", body: JSON.stringify(payload) });
    storeState.orders = [data.order, ...storeState.orders.filter((item) => String(item.id) !== String(data.order.id))];
    hideModals();
    toast("Order placed. Admin will verify/process it soon.");
    await loadProducts();
    renderStoreGrid();
    await renderProductDetail();
    renderProfileDashboard();
    if (qs("#checkoutPage")) {
      setTimeout(() => { window.location.href = "/profile"; }, 700);
    }
  } catch (error) {
    toast(error.message || "Could not place order.");
  }
}

async function submitReply(event) {
  event.preventDefault();
  const form = event.target;
  try {
    await api("/api/store/comments", {
      method: "POST",
      body: JSON.stringify({
        productId: form.dataset.productId || "",
        parentId: form.dataset.parentId || "",
        userName: form.elements.userName?.value.trim() || "",
        comment: form.elements.comment?.value.trim() || ""
      })
    });
    toast("Reply posted.");
    await renderProductDetail();
  } catch (error) {
    toast(error.message || "Could not post reply.");
  }
}

async function removeCartItem(id) {
  try {
    await api(`/api/store/cart/${encodeURIComponent(id)}`, { method: "DELETE" });
    storeState.cart = storeState.cart.filter((item) => String(item.id) !== String(id));
    renderProfileDashboard();
    toast("Removed from cart.");
  } catch (error) {
    toast(error.message || "Could not remove cart item.");
  }
}

async function cancelOrder(id) {
  if (!id) return;
  const confirmed = window.confirm("Cancel this pending order?");
  if (!confirmed) return;
  try {
    const data = await api(`/api/store/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "cancel" })
    });
    storeState.orders = storeState.orders.map((order) => String(order.id) === String(id) ? data.order : order);
    toast("Order cancelled.");
    await loadCart();
    renderProfileDashboard();
    await loadProducts();
    renderStoreGrid();
  } catch (error) {
    toast(error.message || "Could not cancel order.");
  }
}

function profileView() {
  return document.body?.dataset.profileView || "dashboard";
}

function profileLoginRequiredHtml() {
  return `
    <div class="empty-state profile-login-required">
      <h2>Please log in first</h2>
      <p>You need an account to view your profile dashboard, cart, orders and reviews.</p>
      <div class="form-actions center-actions">
        <button class="btn btn-primary" type="button" data-open-auth="login">Log in</button>
        <button class="btn btn-ghost" type="button" data-open-auth="signup">Sign up</button>
      </div>
    </div>
  `;
}

function profileMetricCard(label, value, helper = "") {
  return `
    <article class="admin-card profile-mini-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      ${helper ? `<small>${escapeHtml(helper)}</small>` : ""}
    </article>
  `;
}

function profileNavCard({ href, kicker, title, copy, stat, icon }) {
  return `
    <a class="admin-card profile-nav-card" href="${escapeHtml(href)}">
      <span class="profile-nav-icon" aria-hidden="true">${escapeHtml(icon || "•")}</span>
      <span class="profile-nav-content">
        <span class="section-kicker">${escapeHtml(kicker)}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(copy)}</small>
      </span>
      <span class="profile-nav-stat">${escapeHtml(stat)}</span>
    </a>
  `;
}

function renderProfileHome() {
  const pendingOrders = storeState.orders.filter((item) => isActiveOrder(item.status)).length;
  const deliveredOrders = storeState.orders.filter((item) => item.status === "delivered" || item.status === "completed").length;
  const cartTotal = storeState.cart.reduce((sum, item) => sum + Number(item.product?.price || 0) * Number(item.quantity || 1), 0);
  const reviewCount = (storeState.userReviews || []).filter((review) => review.isReview).length;
  const age = storeState.user.age ? `${storeState.user.age} years` : "Not added";

  return `
    <div class="profile-clean-dashboard">
      <article class="admin-card profile-hero-card">
        <div class="profile-card-head profile-hero-head">
          ${userPhoto(storeState.user, "dashboard-profile-photo")}
          <div>
            <p class="section-kicker">Profile</p>
            <h2>${escapeHtml(storeState.user.fullName)}</h2>
          </div>
        </div>
        <div class="profile-hero-details">
          <div class="detail-row"><small>Age</small><strong>${escapeHtml(age)}</strong></div>
          <div class="detail-row"><small>Email</small><strong>${escapeHtml(storeState.user.email || "No email added")}</strong></div>
        </div>
        <div class="form-actions profile-main-actions">
          <a class="btn btn-primary" href="/profile/edit">Edit Profile</a>
          <button class="btn btn-danger" type="button" data-store-logout>Log Out</button>
        </div>
      </article>

      <div class="profile-action-grid">
        ${profileNavCard({
          href: "/profile/orders",
          kicker: "Orders",
          title: "Order Status",
          copy: "Pending, delivered and cancelled order history.",
          stat: `${pendingOrders} pending`,
          icon: "📦"
        })}
        ${profileNavCard({
          href: "/profile/cart",
          kicker: "Cart",
          title: "Cart",
          copy: "Cart total and current store items.",
          stat: money(cartTotal),
          icon: "🛒"
        })}
        ${profileNavCard({
          href: "/profile/reviews",
          kicker: "Reviews",
          title: "Reviews",
          copy: "Review delivered products and view posted reviews.",
          stat: `${reviewCount} posted`,
          icon: "★"
        })}
      </div>
    </div>
  `;
}

function renderProfileEditPage() {
  const provider = String(storeState.user.authProvider || "password").toLowerCase();
  const googleAccount = provider.includes("google");
  return `
    <div class="profile-dashboard-grid two-column profile-edit-grid profile-dedicated-grid">
      <section class="admin-card profile-edit-card">
        <div class="section-head compact-head"><div><p class="section-kicker">Profile Settings</p><h2>Edit profile</h2><p class="section-copy">Change your name, age, and avatar from this page.</p></div></div>
        <form id="profileEditForm" class="form-grid">
          <div class="form-group full"><label for="profileFullName">Full Name</label><input class="form-input" id="profileFullName" value="${escapeHtml(storeState.user.fullName || "")}" required /></div>
          <div class="form-group"><label for="profileAge">Age</label><input class="form-input" id="profileAge" type="number" min="1" max="120" value="${escapeHtml(String(storeState.user.age || ""))}" required /></div>
          <div class="form-group full">
            <label>Avatar</label>
            <input id="profilePhotoUrl" type="hidden" value="${escapeHtml(storeState.user.photoUrl || "")}" />
            <div class="photo-upload-box profile-photo-upload-box">
              <div class="photo-preview profile-photo-preview${storeState.user.photoUrl ? " has-photo" : ""}" id="profilePhotoPreview">${storeState.user.photoUrl ? `<img src="${escapeHtml(storeState.user.photoUrl)}" alt="Profile photo preview" loading="eager" decoding="async" />` : "No avatar selected"}</div>
              <input class="form-input" id="profilePhotoUpload" type="file" accept="image/png,image/jpeg,image/webp" />
              <div class="form-actions profile-photo-actions">
                <button class="small-btn" type="button" id="clearProfilePhotoButton">Remove avatar</button>
              </div>
            </div>
            <div class="avatar-choice-grid profile-avatar-grid" id="profileAvatarPicker"></div>
            <small class="form-help">Upload your own JPG/PNG/WEBP avatar or choose one of the default avatars.</small>
          </div>
          <button class="btn btn-primary btn-block full" type="submit">Save Profile</button>
        </form>
      </section>
      <section class="admin-card profile-password-card">
        <div class="section-head compact-head"><div><p class="section-kicker">Security</p><h2>Change password</h2><p class="section-copy">${googleAccount ? "Google users can set a website password for email login too." : "Use your current password before setting a new one."}</p></div></div>
        <form id="profilePasswordForm" class="form-grid">
          ${googleAccount ? "" : `<div class="form-group full"><label for="profileCurrentPassword">Current Password</label><input class="form-input" id="profileCurrentPassword" type="password" autocomplete="current-password" required /></div>`}
          <div class="form-group full"><label for="profileNewPassword">New Password</label><input class="form-input" id="profileNewPassword" type="password" autocomplete="new-password" minlength="6" required /></div>
          <div class="form-group full"><label for="profileConfirmPassword">Confirm New Password</label><input class="form-input" id="profileConfirmPassword" type="password" autocomplete="new-password" minlength="6" required /></div>
          <button class="btn btn-primary btn-block full" type="submit">Update Password</button>
        </form>
      </section>
    </div>
  `;
}

function orderStatusCounts() {
  return {
    pendingOrders: storeState.orders.filter((item) => isActiveOrder(item.status)).length,
    deliveredOrders: storeState.orders.filter((item) => item.status === "delivered" || item.status === "completed").length,
    cancelledOrders: storeState.orders.filter((item) => String(item.status || "").toLowerCase() === "cancelled").length
  };
}

function latestTrackableOrder() {
  return storeState.orders.find((order) => isActiveOrder(order.status)) || storeState.orders[0] || null;
}

function renderProfileOrdersPage() {
  const { pendingOrders, deliveredOrders, cancelledOrders } = orderStatusCounts();
  const latestOrder = latestTrackableOrder();
  return `
    <div class="profile-dedicated-stack">
      <div class="profile-summary-grid">
        ${profileMetricCard("Pending Orders", pendingOrders, "Needs action / processing")}
        ${profileMetricCard("Delivered Orders", deliveredOrders, "Completed orders")}
        ${profileMetricCard("Cancelled Orders", cancelledOrders, "Cancelled history")}
      </div>
      <div class="profile-action-grid profile-order-action-grid">
        ${profileNavCard({
          href: "/profile/orders/latest",
          kicker: "Tracking",
          title: "Latest order progress",
          copy: "Open a focused page for your newest active order timeline.",
          stat: latestOrder ? statusLabel(latestOrder.status) : "No order",
          icon: "🚚"
        })}
        ${profileNavCard({
          href: "/profile/orders/history",
          kicker: "History",
          title: "Order tracking & history",
          copy: "Open all orders with payment details, status, and tracking timelines.",
          stat: `${storeState.orders.length} orders`,
          icon: "📋"
        })}
      </div>
    </div>
  `;
}

function renderProfileLatestOrderPage() {
  return `
    <div class="profile-dedicated-stack">
      ${renderLatestOrderTrackingCard({ showViewAll: true, showOrderButton: true, viewAllHref: "/profile/orders/history" })}
    </div>
  `;
}

function renderProfileOrderHistoryPage() {
  const { pendingOrders, deliveredOrders, cancelledOrders } = orderStatusCounts();
  return `
    <div class="profile-dedicated-stack">
      <div class="profile-summary-grid">
        ${profileMetricCard("Pending Orders", pendingOrders, "Needs action / processing")}
        ${profileMetricCard("Delivered Orders", deliveredOrders, "Completed orders")}
        ${profileMetricCard("Cancelled Orders", cancelledOrders, "Cancelled history")}
      </div>
      <section class="admin-card profile-section-card">
        <div class="section-head compact-head"><div><p class="section-kicker">Order Status</p><h2>Order tracking & history</h2><p class="section-copy">All orders are listed here with payment details, status, and their delivery timeline.</p></div></div>
        ${renderOrderItems()}
      </section>
    </div>
  `;
}

function renderProfileCartPage() {
  const cartTotal = storeState.cart.reduce((sum, item) => sum + Number(item.product?.price || 0) * Number(item.quantity || 1), 0);
  const totalQuantity = storeState.cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  return `
    <div class="profile-dedicated-stack">
      <div class="profile-summary-grid">
        ${profileMetricCard("Cart Total", money(cartTotal), "Product price only")}
        ${profileMetricCard("Current Items", storeState.cart.length, "Unique products")}
        ${profileMetricCard("Total Quantity", totalQuantity, "All units")}
      </div>
      <section class="admin-card profile-section-card">
        <div class="section-head compact-head"><div><p class="section-kicker">Cart</p><h2>Cart details</h2><p class="section-copy">Review current items, remove products or continue to checkout.</p></div></div>
        ${renderCartItems()}
      </section>
    </div>
  `;
}

function renderUserReviewHistory() {
  const reviews = (storeState.userReviews || []).filter((review) => review.isReview);
  if (!reviews.length) return `<div class="empty-state">You have not posted any reviews yet.</div>`;
  return `<div class="admin-list profile-review-history">${reviews.map((review) => `
    <article class="admin-list-item profile-review-item already-reviewed-card">
      <div class="admin-doctor-summary">
        <strong>${escapeHtml(review.productName || "Product")}</strong>
        <div class="rating-stars">${ratingStars(review.rating)}</div>
        <p>${escapeHtml(review.comment || "")}</p>
        ${review.createdAt ? `<small>${escapeHtml(new Date(review.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" }))}</small>` : ""}
      </div>
      <div class="admin-list-actions"><span class="pending-badge">Posted</span></div>
    </article>
  `).join("")}</div>`;
}

function renderProfileReviewsPage() {
  const reviewCount = (storeState.userReviews || []).filter((review) => review.isReview).length;
  const deliveredProducts = new Set(storeState.orders.filter((order) => (order.status === "delivered" || order.status === "completed") && String(order.orderType || "product") === "product" && Number(order.productId) > 0).map((order) => String(order.productId || "")).filter(Boolean)).size;
  return `
    <div class="profile-dedicated-stack">
      <div class="profile-summary-grid">
        ${profileMetricCard("Posted Reviews", reviewCount, "Public reviews")}
        ${profileMetricCard("Delivered Products", deliveredProducts, "Available to review")}
      </div>
      <section class="admin-card profile-section-card">
        <div class="section-head compact-head"><div><p class="section-kicker">Reviews</p><h2>Review delivered products</h2><p class="section-copy">Rating is available only after your order is delivered.</p></div></div>
        ${renderReviewableOrders()}
      </section>
      <section class="admin-card profile-section-card">
        <div class="section-head compact-head"><div><p class="section-kicker">My Reviews</p><h2>Posted reviews</h2><p class="section-copy">These reviews are shown publicly on product pages.</p></div></div>
        ${renderUserReviewHistory()}
      </section>
    </div>
  `;
}

function renderProfileDashboard() {
  const container = qs("#profileDashboard");
  if (!container) return;
  if (!storeState.user) {
    container.innerHTML = profileLoginRequiredHtml();
    return;
  }

  const view = profileView();
  if (view === "edit") {
    container.innerHTML = renderProfileEditPage();
    renderProfileAvatarChoices();
    return;
  }
  if (view === "orders") {
    container.innerHTML = renderProfileOrdersPage();
    return;
  }
  if (view === "orders-latest") {
    container.innerHTML = renderProfileLatestOrderPage();
    return;
  }
  if (view === "orders-history") {
    container.innerHTML = renderProfileOrderHistoryPage();
    updatePrescriptionPaymentForms(container);
    return;
  }
  if (view === "cart") {
    container.innerHTML = renderProfileCartPage();
    return;
  }
  if (view === "reviews") {
    container.innerHTML = renderProfileReviewsPage();
    return;
  }

  container.innerHTML = renderProfileHome();
}

function renderCartItems() {
  if (!storeState.cart.length) return `<div class="empty-state">Your cart is empty.</div>`;
  return `<div class="admin-list">${storeState.cart.map((item) => `
    <article class="admin-list-item">
      <div class="admin-doctor-summary"><strong>${escapeHtml(item.product?.name || "Product")}</strong><p>Quantity: ${escapeHtml(String(item.quantity || 1))} • ${money(item.product?.price || 0)}</p></div>
      <div class="admin-list-actions"><button class="small-btn" type="button" data-profile-order="${escapeHtml(item.productId)}">Order</button><button class="small-btn danger-small" type="button" data-remove-cart="${escapeHtml(item.id)}">Remove</button></div>
    </article>
  `).join("")}</div>`;
}

function renderPrescriptionPaymentInstruction(order = {}, method = "cod", deliveryMethod = "bkash") {
  const deliveryFee = Number(order.deliveryCharge || 0);
  const medicineTotal = Number(order.productPrice || 0);
  const total = prescriptionOrderTotal(order);
  if (method === "cod") {
    const number = deliveryMethod === "nagad" ? storeState.paymentSettings.nagadNumber : storeState.paymentSettings.bkashNumber;
    return `
      <strong>Cash on Delivery: delivery fee must be paid first</strong>
      <p>Pay only the delivery fee now: <b>${money(deliveryFee)}</b>. Pay total medicine price <b>${money(medicineTotal)}</b> when delivered.</p>
      <p>Send delivery fee by ${escapeHtml(paymentChannelLabel(deliveryMethod))} to: <b>${escapeHtml(number || "Payment number not configured yet")}</b></p>
      <p>After sending, enter your sender number and Transaction ID, then submit payment details.</p>
    `;
  }
  return `
    <strong>bKash and Nagad full payment</strong>
    <p>Total to send now: <b>${money(total)}</b></p>
    <p>Send payment to:<br />${paymentDestinationHtml()}</p>
    <p>After payment, enter your sender number and Transaction ID. Admin will verify it manually.</p>
  `;
}

function renderPrescriptionPaymentForm(order = {}) {
  if (!canSubmitPrescriptionPayment(order)) return "";
  const bkashReady = Boolean(storeState.paymentSettings.bkashNumber);
  const nagadReady = Boolean(storeState.paymentSettings.nagadNumber);
  const hasAnyManualPayment = bkashReady || nagadReady;
  if (!hasAnyManualPayment) {
    return `<div class="payment-instruction-card prescription-payment-card"><strong>Payment number not configured</strong><p>Admin has added the price, but bKash/Nagad numbers are not configured yet. Please contact Medicare At Home before paying.</p></div>`;
  }
  const defaultDeliveryMethod = bkashReady ? "bkash" : "nagad";
  return `
    <form class="prescription-payment-form" data-prescription-payment-form="${escapeHtml(order.id)}">
      <div class="prescription-payment-head">
        <div>
          <strong>Complete prescribed medicine payment</strong>
          <small>Choose Cash on Delivery or full bKash/Nagad payment, then submit transaction details.</small>
        </div>
        <span>${money(prescriptionOrderTotal(order))}</span>
      </div>
      <div class="payment-instruction-card" data-prescription-payment-instruction>${renderPrescriptionPaymentInstruction(order, "cod", defaultDeliveryMethod)}</div>
      <div class="prescription-payment-fields">
        <label>Payment Method
          <select class="form-input" name="paymentMethod" data-prescription-payment-method>
            <option value="cod">Cash on Delivery</option>
            <option value="bkash_nagad" ${hasAnyManualPayment ? "" : "disabled"}>bKash and Nagad</option>
          </select>
        </label>
        <label data-prescription-cod-field>Pay Delivery Fee With
          <select class="form-input" name="deliveryPaymentMethod" data-prescription-delivery-payment-method>
            <option value="bkash" ${bkashReady ? "" : "disabled"}>${bkashReady ? "bKash delivery fee" : "bKash delivery fee (not configured)"}</option>
            <option value="nagad" ${nagadReady ? "" : "disabled"}>${nagadReady ? "Nagad delivery fee" : "Nagad delivery fee (not configured)"}</option>
          </select>
        </label>
        <label>Sender Number
          <input class="form-input" name="senderNumber" required placeholder="Number used to send money" />
        </label>
        <label>Transaction ID
          <input class="form-input" name="transactionId" required placeholder="bKash/Nagad transaction ID" />
        </label>
        <button class="small-btn" type="submit">Submit Payment Details</button>
      </div>
    </form>
  `;
}

function updatePrescriptionPaymentForms(root = document) {
  qsa("[data-prescription-payment-form]", root).forEach((form) => {
    const id = form.dataset.prescriptionPaymentForm || "";
    const order = storeState.orders.find((item) => String(item.id) === String(id)) || {};
    const methodSelect = form.querySelector("[data-prescription-payment-method]");
    const deliverySelect = form.querySelector("[data-prescription-delivery-payment-method]");
    const codField = form.querySelector("[data-prescription-cod-field]");
    const instruction = form.querySelector("[data-prescription-payment-instruction]");
    const bkashReady = Boolean(storeState.paymentSettings.bkashNumber);
    const nagadReady = Boolean(storeState.paymentSettings.nagadNumber);

    if (deliverySelect && ((deliverySelect.value === "bkash" && !bkashReady) || (deliverySelect.value === "nagad" && !nagadReady) || !deliverySelect.value)) {
      deliverySelect.value = bkashReady ? "bkash" : (nagadReady ? "nagad" : "");
    }
    const method = methodSelect?.value || "cod";
    if (codField) codField.classList.toggle("hidden", method !== "cod");
    if (deliverySelect) deliverySelect.required = method === "cod";
    if (instruction) instruction.innerHTML = renderPrescriptionPaymentInstruction(order, method, deliverySelect?.value || (bkashReady ? "bkash" : "nagad"));
  });
}

async function submitPrescriptionPayment(event) {
  event.preventDefault();
  const form = event.target;
  const id = form?.dataset?.prescriptionPaymentForm || "";
  if (!id) return;
  try {
    const payload = {
      action: "submit_payment",
      paymentMethod: form.elements.paymentMethod?.value || "cod",
      deliveryPaymentMethod: form.elements.deliveryPaymentMethod?.value || "",
      senderNumber: form.elements.senderNumber?.value.trim() || "",
      transactionId: form.elements.transactionId?.value.trim() || ""
    };
    const data = await api(`/api/store/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
    storeState.orders = storeState.orders.map((order) => String(order.id) === String(id) ? data.order : order);
    toast("Payment details submitted. Admin will verify it soon.");
    renderProfileDashboard();
  } catch (error) {
    toast(error.message || "Could not submit payment details.");
  }
}

function renderOrderItems() {
  if (!storeState.orders.length) return `<div class="empty-state">No orders yet.</div>`;
  return `<div class="admin-list profile-order-list">${storeState.orders.map((order) => `
    <article class="admin-list-item profile-order-card">
      <div class="profile-order-top">
        <div class="admin-doctor-summary">
          <strong>${escapeHtml(order.productName || "Product")}</strong>
          <p>${orderPriceSummary(order)}</p>
          ${order.deliveryLocation ? `<p>Delivery location: ${escapeHtml(order.deliveryLocation)}</p>` : ""}
          ${order.prescriptionText ? `<p>Prescription note: ${escapeHtml(order.prescriptionText)}</p>` : ""}
          ${order.prescriptionQuotedAt ? `<p>Price quoted: ${escapeHtml(formatProfileDate(order.prescriptionQuotedAt))}</p>` : ""}
          <p>Payment: <b>${escapeHtml(prescriptionPaymentSummary(order))}</b>${order.deliveryPaymentMethod && !isPrescriptionOrder(order) ? ` • ${escapeHtml(deliveryPaymentLabel(order.deliveryPaymentMethod))}` : ""}${order.transactionId ? ` • TxID: ${escapeHtml(order.transactionId)}` : ""}</p>
          <p>Status: <span class="pending-badge">${escapeHtml(statusLabel(order.status))}</span></p>
        </div>
        ${["pending", "pending_payment"].includes(normalizedOrderStatus(order.status)) ? `<div class="admin-list-actions"><button class="small-btn danger-small" type="button" data-cancel-order="${escapeHtml(order.id)}">Cancel Order</button></div>` : ""}
      </div>
      ${renderPrescriptionPaymentForm(order)}
      ${renderOrderTracking(order)}
    </article>
  `).join("")}</div>`;
}

function renderReviewableOrders() {
  const delivered = storeState.orders.filter((order) => (order.status === "delivered" || order.status === "completed") && String(order.orderType || "product") === "product" && Number(order.productId) > 0);
  if (!delivered.length) return `<div class="empty-state">Delivered orders will appear here for review. Pending or cancelled orders cannot be reviewed.</div>`;

  const reviewsByProduct = new Map((storeState.userReviews || [])
    .filter((review) => review.isReview)
    .map((review) => [String(review.productId), review]));

  const products = new Map();
  delivered.forEach((order) => {
    const productId = String(order.productId || "");
    if (!productId || productId === "0") return;
    if (!products.has(productId)) {
      products.set(productId, {
        productId,
        productName: order.productName || "Product",
        orderIds: [order.id]
      });
    } else {
      products.get(productId).orderIds.push(order.id);
    }
  });

  return `<div class="admin-list profile-review-list">${[...products.values()].map((item) => {
    const existingReview = reviewsByProduct.get(String(item.productId));
    if (existingReview) {
      return `
        <article class="admin-list-item profile-review-item already-reviewed-card">
          <div class="admin-doctor-summary">
            <strong>${escapeHtml(item.productName)}</strong>
            <p>You already reviewed this product. One review is allowed per product.</p>
            <div class="rating-stars">${ratingStars(existingReview.rating)}</div>
            <p>${escapeHtml(existingReview.comment || "")}</p>
          </div>
          <div class="admin-list-actions"><span class="pending-badge">Reviewed</span></div>
        </article>
      `;
    }
    return `
      <form class="admin-list-item profile-review-item" data-profile-review-form data-product-id="${escapeHtml(item.productId)}">
        <div class="admin-doctor-summary">
          <strong>${escapeHtml(item.productName)}</strong>
          <p>Delivered order completed. Share your rating and review. You can review each product only once.</p>
          <div class="form-group"><label>Rating</label><select class="form-input" name="rating"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></div>
          <div class="form-group full"><label>Review</label><textarea class="form-textarea" name="comment" placeholder="Write your product review" required></textarea></div>
        </div>
        <div class="admin-list-actions"><button class="small-btn" type="submit">Submit Review</button></div>
      </form>
    `;
  }).join("")}</div>`;
}

async function submitProfileReview(event) {
  event.preventDefault();
  const form = event.target;
  try {
    const data = await api("/api/store/comments", {
      method: "POST",
      body: JSON.stringify({
        productId: form.dataset.productId || "",
        isReview: true,
        rating: form.elements.rating?.value || 5,
        comment: form.elements.comment?.value.trim() || ""
      })
    });
    const createdReview = data.comment || data.review;
    if (createdReview) {
      storeState.userReviews = [createdReview, ...storeState.userReviews.filter((review) => String(review.productId) !== String(createdReview.productId))];
    } else {
      await loadUserReviews();
    }
    form.reset();
    renderProfileDashboard();
    toast("Review submitted. It is now visible on the product page.");
  } catch (error) {
    toast(error.message || "You can review this product after delivery.");
  }
}

function logOut() {
  storeState.token = "";
  storeState.user = null;
  storeState.cart = [];
  storeState.orders = [];
  storeState.userReviews = [];
  localStorage.removeItem(userTokenKey);
  removeStoreCache("currentUser");
  renderAuthArea();
  renderProfileDashboard();
  toast("Logged out.");
}

function bindStoreEvents() {
  document.addEventListener("click", async (event) => {
    const locationButton = event.target.closest("[data-use-current-location]");
    if (locationButton) {
      event.preventDefault();
      await fillLocationFromPermission(locationButton);
      return;
    }

    const authButton = event.target.closest("[data-open-auth]");
    if (authButton) {
      event.preventDefault();
      goToAuthPage(authButton.dataset.openAuth || "signup");
      return;
    }

    if (event.target.closest("[data-close-store-modal]")) {
      hideModals();
      return;
    }

    const tab = event.target.closest("[data-auth-tab]");
    if (tab) {
      switchAuthTab(tab.dataset.authTab);
      return;
    }

    const detailLink = event.target.closest("[data-product-detail-link]");
    if (detailLink) {
      event.preventDefault();
      window.location.assign(detailLink.getAttribute("href"));
      return;
    }

    const cartButton = event.target.closest("[data-store-cart]");
    if (cartButton) {
      event.preventDefault();
      await addToCart(cartButton.dataset.storeCart);
      return;
    }

    const orderButton = event.target.closest("[data-store-order], [data-profile-order]");
    if (orderButton) {
      event.preventDefault();
      await startOrder(orderButton.dataset.storeOrder || orderButton.dataset.profileOrder);
      return;
    }

    const removeButton = event.target.closest("[data-remove-cart]");
    if (removeButton) {
      event.preventDefault();
      await removeCartItem(removeButton.dataset.removeCart);
      return;
    }

    const cancelButton = event.target.closest("[data-cancel-order]");
    if (cancelButton) {
      event.preventDefault();
      await cancelOrder(cancelButton.dataset.cancelOrder);
      return;
    }

    const galleryScrollButton = event.target.closest("[data-gallery-scroll]");
    if (galleryScrollButton) {
      event.preventDefault();
      const gallery = galleryScrollButton.closest("[data-product-gallery]");
      const track = gallery?.querySelector("[data-gallery-track]");
      if (track) {
        const direction = Number(galleryScrollButton.dataset.galleryScroll || 1);
        track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.92, 260), behavior: "smooth" });
      }
      return;
    }

    const galleryButton = event.target.closest("[data-gallery-image]");
    if (galleryButton) {
      event.preventDefault();
      openLightbox(galleryButton.dataset.galleryImage || "");
      return;
    }

    if (event.target.closest("[data-store-logout]")) {
      logOut();
    }
  });

  document.addEventListener("change", async (event) => {
    if (event.target.matches("#checkoutPaymentMethod, #checkoutDeliveryPaymentMethod")) updateCheckoutPaymentFields();
    if (event.target.matches("[data-prescription-payment-method], [data-prescription-delivery-payment-method]")) updatePrescriptionPaymentForms();

    if (event.target.matches("#profilePhotoUpload")) {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await resizeImageFile(file, 480, 0.72);
        setProfilePhotoPreview(dataUrl);
        toast("Avatar selected.");
      } catch (error) {
        event.target.value = "";
        toast(error.message || "Could not upload avatar.");
      }
    }

    if (event.target.matches("#prescriptionUpload")) {
      const file = event.target.files?.[0];
      const status = qs("#prescriptionFileStatus");
      if (!file) {
        if (qs("#prescriptionFileUrl")) qs("#prescriptionFileUrl").value = "";
        if (status) status.textContent = "Optional. JPG, PNG, WEBP, or PDF supported.";
        return;
      }
      try {
        if (status) status.textContent = "Preparing prescription file...";
        const dataUrl = await readPrescriptionFile(file);
        if (qs("#prescriptionFileUrl")) qs("#prescriptionFileUrl").value = dataUrl;
        if (status) status.textContent = `${file.name} selected.`;
        toast("Prescription file selected.");
      } catch (error) {
        event.target.value = "";
        if (qs("#prescriptionFileUrl")) qs("#prescriptionFileUrl").value = "";
        if (status) status.textContent = "Optional. JPG, PNG, WEBP, or PDF supported.";
        toast(error.message || "Could not upload prescription.");
      }
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("#checkoutQuantity, #checkoutDeliveryLocation, #checkoutAddress")) updateCheckoutPaymentFields();
    if (event.target.matches("#prescriptionMedicineName")) updatePrescriptionQuantityVisibility();
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.matches("#storeLoginForm")) {
      event.preventDefault();
      try {
        await logIn(qs("#loginEmail").value.trim(), qs("#loginPassword").value);
      } catch (error) {
        toast(error.message || "Could not log in.");
      }
    }

    if (event.target.matches("#storeSignupForm")) {
      event.preventDefault();
      try {
        await signUp({
          fullName: qs("#signupFullName").value.trim(),
          age: Number(qs("#signupAge").value || 0),
          email: qs("#signupEmail").value.trim(),
          phone: qs("#signupPhone")?.value.trim() || "",
          password: qs("#signupPassword").value,
          photoUrl: qs("#signupPhotoUrl")?.value || ""
        });
      } catch (error) {
        toast(error.message || "Could not create account.");
      }
    }

    if (event.target.matches("#storeCheckoutForm")) {
      await placeOrder(event);
    }

    if (event.target.matches("#prescriptionOrderForm")) {
      await placePrescriptionOrder(event);
    }

    if (event.target.matches("[data-prescription-payment-form]")) {
      await submitPrescriptionPayment(event);
    }

    if (event.target.matches("#profileEditForm")) {
      event.preventDefault();
      try {
        await updateProfile({
          fullName: qs("#profileFullName")?.value.trim() || "",
          age: Number(qs("#profileAge")?.value || 0),
          photoUrl: qs("#profilePhotoUrl")?.value || ""
        });
      } catch (error) {
        toast(error.message || "Could not update profile.");
      }
    }

    if (event.target.matches("#profilePasswordForm")) {
      event.preventDefault();
      const newPassword = qs("#profileNewPassword")?.value || "";
      const confirmPassword = qs("#profileConfirmPassword")?.value || "";
      if (newPassword !== confirmPassword) {
        toast("New password and confirm password do not match.");
        return;
      }
      try {
        await updatePassword({
          currentPassword: qs("#profileCurrentPassword")?.value || "",
          newPassword
        });
        event.target.reset();
      } catch (error) {
        toast(error.message || "Could not update password.");
      }
    }

    if (event.target.matches("[data-profile-review-form]")) {
      await submitProfileReview(event);
    }

  });

  document.addEventListener("click", (event) => {
    const avatarChoice = event.target.closest("[data-avatar-choice]");
    if (avatarChoice) {
      event.preventDefault();
      setSignupPhotoPreview(avatarChoice.dataset.avatarChoice || "");
      return;
    }

    const profileAvatarChoice = event.target.closest("[data-profile-avatar-choice]");
    if (profileAvatarChoice) {
      event.preventDefault();
      setProfilePhotoPreview(profileAvatarChoice.dataset.profileAvatarChoice || "");
      const upload = qs("#profilePhotoUpload");
      if (upload) upload.value = "";
      return;
    }

    if (event.target.closest("#clearSignupPhotoButton")) {
      event.preventDefault();
      setSignupPhotoPreview("");
    }

    if (event.target.closest("#clearProfilePhotoButton")) {
      event.preventDefault();
      setProfilePhotoPreview("");
      const upload = qs("#profilePhotoUpload");
      if (upload) upload.value = "";
      toast("Avatar removed. Click Save Profile to publish the change.");
    }
  });
}

async function initStoreModule() {
  renderAuthPageHints();
  renderAuthArea();
  bindStoreEvents();
  syncStorePagePanels();
  initStoreLocationPermissionButtons();
  initPasswordVisibilityToggles();

  const needsStoreGrid = Boolean(qs("#storeGrid")) && !isProductDetailPath();
  const needsProductDetail = Boolean(qs("#productDetailPage")) && isProductDetailPath();
  const hasOnlyOrphanProductDetail = Boolean(qs("#productDetailPage")) && !needsProductDetail && !qs("#storeGrid") && !qs("#storeHubSection") && !qs("#prescriptionOrderPage");

  if (hasOnlyOrphanProductDetail) {
    window.location.replace("/Store");
    return;
  }
  const needsCheckout = Boolean(qs("#checkoutPage"));
  const needsPrescription = Boolean(qs("#prescriptionOrderPage"));
  const needsProfile = Boolean(qs("#profileDashboard"));
  const needsAvatars = Boolean(qs("#signupAvatarPicker"));

  const userPromise = loadCurrentUser();

  if (needsAvatars) {
    loadAvatars().catch(() => renderSignupAvatarChoices());
  }

  if (needsStoreGrid) {
    const cached = readStoreCache("products");
    if (Array.isArray(cached?.products)) {
      storeState.products = cached.products;
      renderStoreGrid();
    }
    loadProducts().then(renderStoreGrid).catch((error) => console.warn(error));
  }

  if (needsProductDetail) {
    renderProductDetail().catch((error) => {
      console.warn(error);
      const container = qs("#productDetailPage");
      if (container) {
        container.innerHTML = `<div class="empty-state"><h2>Could not load product information</h2><p>Please refresh the page or open the Store Hub again.</p><a class="btn btn-primary" href="/Store">Open Store Hub</a></div>`;
      }
    });
  }

  if (needsCheckout) {
    await Promise.all([userPromise, loadPaymentSettings()]);
    await renderCheckoutPage();
    initStoreLocationPermissionButtons(qs("#checkoutPage") || document);
    return;
  }

  if (needsPrescription) {
    await userPromise;
    renderPrescriptionOrderPage();
    return;
  }

  if (isAuthPage()) {
    await userPromise;
    if (storeState.user) {
      window.location.href = authRedirectTarget("/profile");
      return;
    }
    if (document.body?.dataset.authPage === "signup" && needsAvatars) renderSignupAvatarChoices();
  }

  if (needsProfile) {
    await userPromise;
    if (storeState.user) {
      await Promise.all([loadAvatars(true), loadPaymentSettings()]);
      await refreshUserData();
    }
    renderProfileDashboard();
    initPasswordVisibilityToggles(qs("#profileDashboard") || document);
  }
}

initStoreModule().catch((error) => {
  console.warn(error);
  renderAuthArea();
});
