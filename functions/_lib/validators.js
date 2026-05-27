function cleanText(value, max = 500) {
  return String(value || "")
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, max);
}

function cleanList(value, maxItems = 12) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item, 90)).filter(Boolean).slice(0, maxItems);
  }
  return String(value || "")
    .split(",")
    .map((item) => cleanText(item, 90))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanPhone(value) {
  return String(value || "")
    .replace(/[^0-9+\-\s]/g, "")
    .trim()
    .slice(0, 24);
}

const FIXED_DOCTOR_CONTACT = "+8801609672748";

const DOCTOR_DESIGNATIONS = new Set(["Professor", "Associate Professor", "Assistant Professor", "Consultant"]);
const DOCTOR_WEEKDAY_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DOCTOR_WEEKDAYS = new Set([...DOCTOR_WEEKDAY_ORDER, "Saturday - Thursday", "Everyday"]);
const DOCTOR_TIME_RANGE = /^(1[0-2]|[1-9]):[0-5][0-9] (AM|PM) - (1[0-2]|[1-9]):[0-5][0-9] (AM|PM)$/i;

function cleanDoctorWeekdays(value) {
  const rawItems = Array.isArray(value) ? value : String(value || "").split(/[,/|]+/);
  const picked = rawItems
    .map((item) => cleanText(item, 40).replace(/\s+/g, " "))
    .map((item) => {
      const lower = item.toLowerCase();
      if (lower === "daily" || lower === "everyday") return "Everyday";
      if (["saturday - thursday", "saturday-thursday", "saturday to thursday"].includes(lower)) return "Saturday - Thursday";
      return [...DOCTOR_WEEKDAYS].find((weekday) => weekday.toLowerCase() === lower) || "";
    })
    .filter(Boolean);

  if (picked.includes("Everyday")) return "Everyday";
  if (picked.includes("Saturday - Thursday")) return "Saturday - Thursday";

  const unique = [...new Set(picked)].filter((item) => DOCTOR_WEEKDAY_ORDER.includes(item));
  return DOCTOR_WEEKDAY_ORDER.filter((weekday) => unique.includes(weekday)).join(", ");
}

function cleanDoctorChambers(input, existing = {}) {
  const source = Array.isArray(input.chambers) && input.chambers.length
    ? input.chambers
    : Array.isArray(existing.chambers) && existing.chambers.length
      ? existing.chambers
      : existing.serviceArea || input.serviceArea || existing.available || input.available
        ? [{ location: input.serviceArea || existing.serviceArea || "", weekday: "Everyday", time: input.available || existing.available || "9:00 AM - 10:00 PM" }]
        : [];

  return source
    .map((item) => {
      const location = cleanText(item?.location, 180);
      const weekday = cleanDoctorWeekdays(item?.weekdays || item?.weekday);
      const time = cleanText(item?.time || item?.times, 40);
      return {
        location,
        weekday,
        time: DOCTOR_TIME_RANGE.test(time) ? time : ""
      };
    })
    .filter((item) => item.location || item.weekday || item.time)
    .slice(0, 12);
}

function summarizeDoctorChambers(chambers = [], type = "location") {
  const valid = chambers.filter((item) => item.location && item.weekday && item.time);
  if (type === "location") return [...new Set(valid.map((item) => item.location))].join(" • ");
  return valid.map((item) => `${item.location}: ${item.weekday}, ${item.time}`).join(" • ");
}


function cleanServiceMedia(value) {
  const media = cleanText(value, 1500000);
  if (!media) return "";
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(media)) return media;
  if (/^https?:\/\//i.test(media) || media.startsWith("/")) return cleanText(media, 1200);
  // Keep old emoji/service mark values already used by older data, but do not allow long arbitrary text.
  return cleanText(media, 12);
}

function cleanServiceIcons(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([service, icon]) => [cleanText(service, 90), cleanServiceMedia(icon)])
      .filter(([service, icon]) => service && icon)
      .slice(0, 32)
  );
}

function cleanServiceDescriptions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([service, description]) => [cleanText(service, 90), cleanText(description, 700)])
      .filter(([service, description]) => service && description)
      .slice(0, 32)
  );
}

function cleanSocialLinks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      label: cleanText(item?.label, 60),
      url: cleanText(item?.url, 600)
    }))
    .filter((item) => item.label && item.url)
    .slice(0, 12);
}

export function normalizeDoctor(input, existing = {}) {
  const { _id, id, ...safeExisting } = existing || {};
  const designation = cleanText(input.designation || safeExisting.designation, 80);
  const chambers = cleanDoctorChambers(input, safeExisting);
  const validChambers = chambers.filter((item) => item.location && item.weekday && item.time);
  const doctor = {
    name: cleanText(input.name, 120),
    designation: DOCTOR_DESIGNATIONS.has(designation) ? designation : "",
    specialty: cleanText(input.specialty, 120),
    degrees: cleanText(input.degrees, 160),
    experience: cleanText(input.experience, 120),
    hospital: cleanText(input.hospital, 160),
    chambers: validChambers,
    serviceArea: summarizeDoctorChambers(validChambers, "location"),
    available: summarizeDoctorChambers(validChambers, "available"),
    phone: FIXED_DOCTOR_CONTACT,
    whatsapp: FIXED_DOCTOR_CONTACT,
    fee: cleanText(input.fee, 120),
    services: cleanList(input.services || safeExisting.services || [], 16),
    languages: cleanList(input.languages || safeExisting.languages || [], 8),
    photoUrl: cleanText(input.photoUrl, 1500000),
    bio: cleanText(input.bio, 900),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 99,
    isActive: input.isActive !== false,
    updatedAt: new Date()
  };

  if (!doctor.name || !doctor.designation || !doctor.specialty || !doctor.chambers.length) {
    return {
      ok: false,
      error: "Doctor name, designation, specialty, and at least one complete chamber location are required."
    };
  }

  return {
    ok: true,
    value: {
      ...safeExisting,
      ...doctor,
      createdAt: safeExisting.createdAt || new Date()
    }
  };
}

export function normalizeSettings(input, existing = {}) {
  const { _id, id, ...safeExisting } = existing || {};
  const settings = {
    ...safeExisting,
    siteName: cleanText(input.siteName, 100) || safeExisting.siteName || "Medicare At Home",
    tagline: cleanText(input.tagline, 160) || safeExisting.tagline || "Professional Home Visit Medical Service",
    description: cleanText(input.description, 800) || safeExisting.description || "Professional home visit medical services.",
    heroHighlight: cleanText(input.heroHighlight, 80) || safeExisting.heroHighlight || "Medical care",
    heroTitleLine: cleanText(input.heroTitleLine, 100) || safeExisting.heroTitleLine || "at your home.",
    primaryButtonText: cleanText(input.primaryButtonText, 60) || safeExisting.primaryButtonText || "WhatsApp Appointment",
    secondaryButtonText: cleanText(input.secondaryButtonText, 60) || safeExisting.secondaryButtonText || "View Doctors",
    servicesButtonText: cleanText(input.servicesButtonText, 60) || safeExisting.servicesButtonText || "Services",
    contactButtonText: cleanText(input.contactButtonText, 60) || safeExisting.contactButtonText || "Contact",
    navServicesLabel: cleanText(input.navServicesLabel, 240) || safeExisting.navServicesLabel || "Services",
    navStoreLabel: cleanText(input.navStoreLabel, 240) || safeExisting.navStoreLabel || "Store",
    navDoctorsLabel: cleanText(input.navDoctorsLabel, 240) || safeExisting.navDoctorsLabel || "Doctors",
    navAmbulanceLabel: cleanText(input.navAmbulanceLabel, 240) || safeExisting.navAmbulanceLabel || "Ambulance",
    navBloodLabel: cleanText(input.navBloodLabel, 240) || safeExisting.navBloodLabel || "Blood",
    navHowItWorksLabel: cleanText(input.navHowItWorksLabel, 240) || safeExisting.navHowItWorksLabel || "About",
    navContactLabel: cleanText(input.navContactLabel, 240) || safeExisting.navContactLabel || "Contact",
    servicesPageTitle: cleanText(input.servicesPageTitle, 240) || safeExisting.servicesPageTitle || "What we provide",
    servicesPageCopy: cleanText(input.servicesPageCopy, 240) || safeExisting.servicesPageCopy || "Home medical services built for quick contact, clear information, and simple appointment booking.",
    storePageTitle: cleanText(input.storePageTitle, 240) || safeExisting.storePageTitle || "Buy medicine online",
    storePageCopy: cleanText(input.storePageCopy, 240) || safeExisting.storePageCopy || "Browse available medicines, check price and stock, then log in to order or add items to your cart.",
    doctorsPageTitle: cleanText(input.doctorsPageTitle, 240) || safeExisting.doctorsPageTitle || "Choose the right professional",
    doctorsPageCopy: cleanText(input.doctorsPageCopy, 240) || safeExisting.doctorsPageCopy || "Tap a card to open the full doctor profile with phone, WhatsApp, services and availability.",
    ambulancePageTitle: cleanText(input.ambulancePageTitle, 240) || safeExisting.ambulancePageTitle || "Need an ambulance?",
    ambulancePageCopy: cleanText(input.ambulancePageCopy, 300) || safeExisting.ambulancePageCopy || "Call or message us for ambulance support. Share patient condition, pickup location and destination.",
    ambulanceDescription: cleanText(input.ambulanceDescription, 800) || safeExisting.ambulanceDescription || "Fast ambulance contact support for Medicare At Home visitors. Use the call button for urgent help or WhatsApp to send pickup details.",
    ambulanceButtonText: cleanText(input.ambulanceButtonText, 80) || safeExisting.ambulanceButtonText || "Order Ambulance",
    ambulancePhone: cleanPhone(input.ambulancePhone) || safeExisting.ambulancePhone || "+8801609672748",
    ambulanceWhatsapp: cleanPhone(input.ambulanceWhatsapp) || safeExisting.ambulanceWhatsapp || "+8801609672748",
    bloodPageTitle: cleanText(input.bloodPageTitle, 240) || safeExisting.bloodPageTitle || "Available blood people",
    bloodPageCopy: cleanText(input.bloodPageCopy, 240) || safeExisting.bloodPageCopy || "Tap a card to view full details. Female contact details are protected and only available through admin.",
    howPageTitle: cleanText(input.howPageTitle, 240) || safeExisting.howPageTitle || "About Medicare At Home",
    howPageCopy: cleanText(input.howPageCopy, 240) || safeExisting.howPageCopy || "Meet the Medicare At Home team and read published updates.",
    contactPageTitle: cleanText(input.contactPageTitle, 240) || safeExisting.contactPageTitle || "Need service today?",
    contactPageCopy: cleanText(input.contactPageCopy, 240) || safeExisting.contactPageCopy || "Use WhatsApp for the fastest booking. For emergency conditions, call local emergency services first.",
    loginPageTitle: cleanText(input.loginPageTitle, 240) || safeExisting.loginPageTitle || "Log in",
    loginPageCopy: cleanText(input.loginPageCopy, 240) || safeExisting.loginPageCopy || "Log in to order medicine, manage your cart and review delivered products.",
    signupPageTitle: cleanText(input.signupPageTitle, 240) || safeExisting.signupPageTitle || "Sign up",
    signupPageCopy: cleanText(input.signupPageCopy, 240) || safeExisting.signupPageCopy || "Create an account to order medicine, save cart items and rate products after delivery.",
    profilePageTitle: cleanText(input.profilePageTitle, 240) || safeExisting.profilePageTitle || "My profile and orders",
    profilePageCopy: cleanText(input.profilePageCopy, 240) || safeExisting.profilePageCopy || "View your profile information, cart and order status.",
    location: cleanText(input.location, 180) || safeExisting.location || "Bangladesh",
    email: cleanText(input.email, 120),
    instagramHandle: cleanText(input.instagramHandle, 100) || safeExisting.instagramHandle || "",
    facebookUrl: cleanText(input.facebookUrl, 600) || safeExisting.facebookUrl || "",
    socialLinks: Array.isArray(input.socialLinks) ? cleanSocialLinks(input.socialLinks) : (safeExisting.socialLinks || []),
    phones: cleanList(input.phones, 8).map(cleanPhone).filter(Boolean),
    whatsapp: cleanPhone(input.whatsapp) || safeExisting.whatsapp || "",
    serviceTags: cleanList(input.serviceTags, 16),
    serviceIcons: input.serviceIcons && typeof input.serviceIcons === "object" && !Array.isArray(input.serviceIcons) ? cleanServiceIcons(input.serviceIcons) : (safeExisting.serviceIcons || {}),
    serviceDescriptions: Object.keys(cleanServiceDescriptions(input.serviceDescriptions)).length ? cleanServiceDescriptions(input.serviceDescriptions) : (safeExisting.serviceDescriptions || {}),
    emergencyNote: cleanText(input.emergencyNote, 700) || safeExisting.emergencyNote || "For life-threatening emergencies, contact your nearest hospital or emergency hotline immediately.",
    stats: Array.isArray(input.stats) && input.stats.length
      ? input.stats.slice(0, 4).map((stat) => ({ value: cleanText(stat.value, 20), label: cleanText(stat.label, 80) })).filter((stat) => stat.value && stat.label)
      : safeExisting.stats || [],
    updatedAt: new Date()
  };

  if (!settings.phones.length) settings.phones = safeExisting.phones || [];
  if (!settings.serviceTags.length) settings.serviceTags = safeExisting.serviceTags || [];

  return { ok: true, value: settings };
}

function cleanBloodGroup(value) {
  const text = cleanText(value, 8).toUpperCase().replace(/\s+/g, "");
  const allowed = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
  return allowed.has(text) ? text : text.slice(0, 8);
}

function cleanGender(value) {
  const gender = cleanText(value, 20).toLowerCase();
  if (["male", "female", "other"].includes(gender)) return gender;
  return "";
}

export function normalizeBloodProfile(input, existing = {}) {
  const { _id, id, ...safeExisting } = existing || {};
  const gender = cleanGender(input.gender);
  const profile = {
    fullName: cleanText(input.fullName, 140),
    bloodGroup: cleanBloodGroup(input.bloodGroup),
    gender,
    customGender: gender === "other" ? cleanText(input.customGender, 60) : "",
    phone: cleanPhone(input.phone),
    whatsapp: cleanPhone(input.whatsapp || input.phone),
    homeAddress: cleanText(input.homeAddress, 260),
    isApproved: input.isApproved === true || input.isApproved === 1 || input.isApproved === "1",
    updatedAt: new Date()
  };

  if (!profile.fullName || !profile.bloodGroup || !profile.gender || !profile.phone || !profile.whatsapp || !profile.homeAddress) {
    return { ok: false, error: "Full name, blood group, gender, phone, WhatsApp, and home address are required." };
  }

  if (profile.gender === "other" && !profile.customGender) {
    return { ok: false, error: "Please type the gender when selecting Other." };
  }

  return {
    ok: true,
    value: {
      ...safeExisting,
      ...profile,
      createdAt: safeExisting.createdAt || new Date()
    }
  };
}

export function toPublicBloodProfile(document, { admin = false } = {}) {
  if (!document) return null;
  const { _id, id, ...rest } = document;
  const profile = { id: String(id ?? _id ?? ""), ...rest };

  if (!admin && String(profile.gender || "").toLowerCase() === "female") {
    return {
      ...profile,
      phone: "",
      whatsapp: "",
      homeAddress: "",
      contactAdminRequired: true
    };
  }

  return { ...profile, contactAdminRequired: false };
}

export function toPublicDoctor(document) {
  if (!document) return null;
  const { _id, id, ...rest } = document;
  return { id: String(id ?? _id ?? ""), ...rest };
}

export function toPublicSettings(document) {
  if (!document) return null;
  const { _id, id, ...rest } = document;
  return { id: String(id ?? _id ?? ""), ...rest };
}
