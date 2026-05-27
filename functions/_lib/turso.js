function safeJsonParse(value, fallback) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function toIsoText(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function boolToInt(value) {
  return value === false || value === 0 || value === "0" ? 0 : 1;
}

function intToBool(value) {
  return !(value === false || value === 0 || value === "0");
}

function asNumber(value, fallback = 99) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function rowToDoctor(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name || "",
    designation: row.designation || "",
    specialty: row.specialty || "",
    degrees: row.degrees || "",
    experience: row.experience || "",
    hospital: row.hospital || "",
    serviceArea: row.serviceArea || "",
    available: row.available || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || "",
    fee: row.fee || "",
    chambers: safeJsonParse(row.chambers, []),
    services: safeJsonParse(row.services, []),
    languages: safeJsonParse(row.languages, []),
    photoUrl: row.photoUrl || "",
    bio: row.bio || "",
    sortOrder: asNumber(row.sortOrder),
    isActive: intToBool(row.isActive),
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}
export function rowToBloodProfile(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    fullName: row.fullName || "",
    bloodGroup: row.bloodGroup || "",
    gender: row.gender || "",
    customGender: row.customGender || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || "",
    homeAddress: row.homeAddress || "",
    isApproved: intToBool(row.isApproved),
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}


export function rowToSettings(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    siteName: row.siteName || "Medicare At Home",
    tagline: row.tagline || "Professional Home Visit Medical Service",
    description: row.description || "Professional home visit medical services.",
    heroHighlight: row.heroHighlight || "Medical care",
    heroTitleLine: row.heroTitleLine || "at your home.",
    primaryButtonText: row.primaryButtonText || "WhatsApp Appointment",
    secondaryButtonText: row.secondaryButtonText || "View Doctors",
    servicesButtonText: row.servicesButtonText || "Services",
    contactButtonText: row.contactButtonText || "Contact",
    navServicesLabel: row.navServicesLabel || "Services",
    navStoreLabel: row.navStoreLabel || "Store",
    navDoctorsLabel: row.navDoctorsLabel || "Doctors",
    navAmbulanceLabel: row.navAmbulanceLabel || "Ambulance",
    navBloodLabel: row.navBloodLabel || "Blood",
    navHowItWorksLabel: row.navHowItWorksLabel || "About",
    navContactLabel: row.navContactLabel || "Contact",
    servicesPageTitle: row.servicesPageTitle || "What we provide",
    servicesPageCopy: row.servicesPageCopy || "Home medical services built for quick contact, clear information, and simple appointment booking.",
    storePageTitle: row.storePageTitle || "Buy medicine online",
    storePageCopy: row.storePageCopy || "Browse available medicines, check price and stock, then log in to order or add items to your cart.",
    doctorsPageTitle: row.doctorsPageTitle || "Choose the right professional",
    doctorsPageCopy: row.doctorsPageCopy || "Tap a card to open the full doctor profile with phone, WhatsApp, services and availability.",
    ambulancePageTitle: row.ambulancePageTitle || "Need an ambulance?",
    ambulancePageCopy: row.ambulancePageCopy || "Call or message us for ambulance support. Share patient condition, pickup location and destination.",
    ambulanceDescription: row.ambulanceDescription || "Fast ambulance contact support for Medicare At Home visitors. Use the call button for urgent help or WhatsApp to send pickup details.",
    ambulanceButtonText: row.ambulanceButtonText || "Order Ambulance",
    ambulancePhone: row.ambulancePhone || "+8801609672748",
    ambulanceWhatsapp: row.ambulanceWhatsapp || "+8801609672748",
    bloodPageTitle: row.bloodPageTitle || "Available blood people",
    bloodPageCopy: row.bloodPageCopy || "Tap a card to view full details. Female contact details are protected and only available through admin.",
    howPageTitle: row.howPageTitle || "About Medicare At Home",
    howPageCopy: row.howPageCopy || "Meet the Medicare At Home team and read published updates.",
    contactPageTitle: row.contactPageTitle || "Need service today?",
    contactPageCopy: row.contactPageCopy || "Use WhatsApp for the fastest booking. For emergency conditions, call local emergency services first.",
    loginPageTitle: row.loginPageTitle || "Log in",
    loginPageCopy: row.loginPageCopy || "Log in to order medicine, manage your cart and review delivered products.",
    signupPageTitle: row.signupPageTitle || "Sign up",
    signupPageCopy: row.signupPageCopy || "Create an account to order medicine, save cart items and rate products after delivery.",
    profilePageTitle: row.profilePageTitle || "My profile and orders",
    profilePageCopy: row.profilePageCopy || "View your profile information, cart and order status.",
    location: row.location || "Sultanpur, Feni, Bangladesh",
    email: row.email || "",
    instagramHandle: row.instagramHandle || "",
    facebookUrl: row.facebookUrl || "",
    socialLinks: safeJsonParse(row.socialLinks, []),
    phones: safeJsonParse(row.phones, []),
    whatsapp: row.whatsapp || "",
    serviceTags: safeJsonParse(row.serviceTags, []),
    serviceIcons: safeJsonParse(row.serviceIcons, {}),
    serviceDescriptions: safeJsonParse(row.serviceDescriptions, {}),
    emergencyNote: row.emergencyNote || "",
    stats: safeJsonParse(row.stats, []),
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

function doctorRecord(doctor) {
  return {
    name: doctor.name || "",
    designation: doctor.designation || "",
    specialty: doctor.specialty || "",
    degrees: doctor.degrees || "",
    experience: doctor.experience || "",
    hospital: doctor.hospital || "",
    serviceArea: doctor.serviceArea || "",
    available: doctor.available || "",
    phone: doctor.phone || "",
    whatsapp: doctor.whatsapp || "",
    fee: doctor.fee || "",
    chambers: JSON.stringify(doctor.chambers || []),
    services: JSON.stringify(doctor.services || []),
    languages: JSON.stringify(doctor.languages || []),
    photoUrl: doctor.photoUrl || "",
    bio: doctor.bio || "",
    sortOrder: asNumber(doctor.sortOrder),
    isActive: boolToInt(doctor.isActive),
    createdAt: toIsoText(doctor.createdAt),
    updatedAt: toIsoText(doctor.updatedAt)
  };
}
function bloodProfileRecord(profile) {
  return {
    fullName: profile.fullName || "",
    bloodGroup: profile.bloodGroup || "",
    gender: profile.gender || "",
    customGender: profile.customGender || "",
    phone: profile.phone || "",
    whatsapp: profile.whatsapp || "",
    homeAddress: profile.homeAddress || "",
    isApproved: boolToInt(profile.isApproved),
    createdAt: toIsoText(profile.createdAt),
    updatedAt: toIsoText(profile.updatedAt)
  };
}


function settingsRecord(settings) {
  return {
    siteName: settings.siteName || "Medicare At Home",
    tagline: settings.tagline || "Professional Home Visit Medical Service",
    description: settings.description || "Professional home visit medical services.",
    heroHighlight: settings.heroHighlight || "Medical care",
    heroTitleLine: settings.heroTitleLine || "at your home.",
    primaryButtonText: settings.primaryButtonText || "WhatsApp Appointment",
    secondaryButtonText: settings.secondaryButtonText || "View Doctors",
    servicesButtonText: settings.servicesButtonText || "Services",
    contactButtonText: settings.contactButtonText || "Contact",
    navServicesLabel: settings.navServicesLabel || "Services",
    navStoreLabel: settings.navStoreLabel || "Store",
    navDoctorsLabel: settings.navDoctorsLabel || "Doctors",
    navAmbulanceLabel: settings.navAmbulanceLabel || "Ambulance",
    navBloodLabel: settings.navBloodLabel || "Blood",
    navHowItWorksLabel: settings.navHowItWorksLabel || "About",
    navContactLabel: settings.navContactLabel || "Contact",
    servicesPageTitle: settings.servicesPageTitle || "What we provide",
    servicesPageCopy: settings.servicesPageCopy || "Home medical services built for quick contact, clear information, and simple appointment booking.",
    storePageTitle: settings.storePageTitle || "Buy medicine online",
    storePageCopy: settings.storePageCopy || "Browse available medicines, check price and stock, then log in to order or add items to your cart.",
    doctorsPageTitle: settings.doctorsPageTitle || "Choose the right professional",
    doctorsPageCopy: settings.doctorsPageCopy || "Tap a card to open the full doctor profile with phone, WhatsApp, services and availability.",
    ambulancePageTitle: settings.ambulancePageTitle || "Need an ambulance?",
    ambulancePageCopy: settings.ambulancePageCopy || "Call or message us for ambulance support. Share patient condition, pickup location and destination.",
    ambulanceDescription: settings.ambulanceDescription || "Fast ambulance contact support for Medicare At Home visitors. Use the call button for urgent help or WhatsApp to send pickup details.",
    ambulanceButtonText: settings.ambulanceButtonText || "Order Ambulance",
    ambulancePhone: settings.ambulancePhone || "+8801609672748",
    ambulanceWhatsapp: settings.ambulanceWhatsapp || "+8801609672748",
    bloodPageTitle: settings.bloodPageTitle || "Available blood people",
    bloodPageCopy: settings.bloodPageCopy || "Tap a card to view full details. Female contact details are protected and only available through admin.",
    howPageTitle: settings.howPageTitle || "About Medicare At Home",
    howPageCopy: settings.howPageCopy || "Meet the Medicare At Home team and read published updates.",
    contactPageTitle: settings.contactPageTitle || "Need service today?",
    contactPageCopy: settings.contactPageCopy || "Use WhatsApp for the fastest booking. For emergency conditions, call local emergency services first.",
    loginPageTitle: settings.loginPageTitle || "Log in",
    loginPageCopy: settings.loginPageCopy || "Log in to order medicine, manage your cart and review delivered products.",
    signupPageTitle: settings.signupPageTitle || "Sign up",
    signupPageCopy: settings.signupPageCopy || "Create an account to order medicine, save cart items and rate products after delivery.",
    profilePageTitle: settings.profilePageTitle || "My profile and orders",
    profilePageCopy: settings.profilePageCopy || "View your profile information, cart and order status.",
    location: settings.location || "Sultanpur, Feni, Bangladesh",
    email: settings.email || "",
    instagramHandle: settings.instagramHandle || "",
    facebookUrl: settings.facebookUrl || "",
    socialLinks: JSON.stringify(settings.socialLinks || []),
    phones: JSON.stringify(settings.phones || []),
    whatsapp: settings.whatsapp || "",
    serviceTags: JSON.stringify(settings.serviceTags || []),
    serviceIcons: JSON.stringify(settings.serviceIcons || {}),
    serviceDescriptions: JSON.stringify(settings.serviceDescriptions || {}),
    emergencyNote: settings.emergencyNote || "",
    stats: JSON.stringify(settings.stats || []),
    createdAt: toIsoText(settings.createdAt),
    updatedAt: toIsoText(settings.updatedAt)
  };
}

async function insertRecord(db, table, record) {
  const columns = Object.keys(record);
  const placeholders = columns.map(() => "?").join(", ");
  const args = columns.map((column) => record[column]);
  const result = await db.execute({
    sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
    args
  });
  return String(result.lastInsertRowid || "");
}

async function updateRecord(db, table, id, record) {
  const columns = Object.keys(record).filter((column) => column !== "createdAt");
  const setters = columns.map((column) => `${column} = ?`).join(", ");
  const args = [...columns.map((column) => record[column]), id];
  return db.execute({
    sql: `UPDATE ${table} SET ${setters} WHERE id = ?`,
    args
  });
}

export async function listDoctors(db, includeInactive = false) {
  const result = await db.execute({
    sql: includeInactive
      ? "SELECT * FROM doctors ORDER BY sortOrder ASC, createdAt DESC LIMIT 100"
      : "SELECT * FROM doctors WHERE isActive != 0 ORDER BY sortOrder ASC, createdAt DESC LIMIT 100",
    args: []
  });
  return result.rows.map(rowToDoctor);
}

export async function getDoctorById(db, id) {
  const result = await db.execute({
    sql: "SELECT * FROM doctors WHERE id = ? LIMIT 1",
    args: [id]
  });
  return rowToDoctor(result.rows[0]);
}

export async function createDoctor(db, doctor) {
  const id = await insertRecord(db, "doctors", doctorRecord(doctor));
  return getDoctorById(db, id);
}

export async function updateDoctor(db, id, doctor) {
  await updateRecord(db, "doctors", id, doctorRecord({ ...doctor, updatedAt: new Date() }));
  return getDoctorById(db, id);
}

export async function deleteDoctor(db, id) {
  const result = await db.execute({
    sql: "DELETE FROM doctors WHERE id = ?",
    args: [id]
  });
  return Number(result.rowsAffected || 0);
}

export async function listBloodProfiles(db, status = "approved") {
  let sql = "SELECT * FROM blood_profiles";
  const args = [];
  if (status === "approved") {
    sql += " WHERE isApproved != 0";
  } else if (status === "pending") {
    sql += " WHERE isApproved = 0";
  }
  sql += " ORDER BY createdAt DESC LIMIT 300";
  const result = await db.execute({ sql, args });
  return result.rows.map(rowToBloodProfile);
}

export async function getBloodProfileById(db, id) {
  const result = await db.execute({
    sql: "SELECT * FROM blood_profiles WHERE id = ? LIMIT 1",
    args: [id]
  });
  return rowToBloodProfile(result.rows[0]);
}

export async function createBloodProfile(db, profile) {
  const id = await insertRecord(db, "blood_profiles", bloodProfileRecord(profile));
  return getBloodProfileById(db, id);
}

export async function updateBloodProfile(db, id, profile) {
  await updateRecord(db, "blood_profiles", id, bloodProfileRecord({ ...profile, updatedAt: new Date() }));
  return getBloodProfileById(db, id);
}

export async function setBloodProfileApproval(db, id, isApproved) {
  await db.execute({
    sql: "UPDATE blood_profiles SET isApproved = ?, updatedAt = ? WHERE id = ?",
    args: [boolToInt(isApproved), new Date().toISOString(), id]
  });
  return getBloodProfileById(db, id);
}

export async function deleteBloodProfile(db, id) {
  const result = await db.execute({
    sql: "DELETE FROM blood_profiles WHERE id = ?",
    args: [id]
  });
  return Number(result.rowsAffected || 0);
}

export async function getSettings(db) {
  const result = await db.execute({
    sql: "SELECT * FROM settings ORDER BY id ASC LIMIT 1",
    args: []
  });
  return rowToSettings(result.rows[0]);
}

export async function createSettings(db, settings) {
  const id = await insertRecord(db, "settings", settingsRecord(settings));
  return getSettingsById(db, id);
}

export async function updateSettings(db, id, settings) {
  await updateRecord(db, "settings", id, settingsRecord({ ...settings, updatedAt: new Date() }));
  return getSettingsById(db, id);
}

async function getSettingsById(db, id) {
  const result = await db.execute({
    sql: "SELECT * FROM settings WHERE id = ? LIMIT 1",
    args: [id]
  });
  return rowToSettings(result.rows[0]);
}
