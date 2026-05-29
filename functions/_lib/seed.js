import { createDoctor, createSettings } from "./turso.js";

export const defaultSettings = {
  siteName: "Medicare At Home",
  tagline: "Professional Home Visit Medical Service",
  description:
    "Professional home visit medical services for injection, cannula, dressing, plaster and basic medical care. Contact by WhatsApp or phone for appointment confirmation.",
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
  hospitalPageTitle: "Nearby hospitals",
  hospitalPageCopy: "Browse hospital information, photos, contact numbers and addresses.",
  ambulanceDescription: "Fast ambulance contact support for Medicare At Home visitors. Use the call button for urgent help or WhatsApp to send pickup details.",
  ambulanceButtonText: "Order Ambulance",
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
  facebookUrl: "",
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
  pageContent: {
    services: { label: "Services", badge: "Services", title: "What we provide", copy: "Home medical services built for quick contact, clear information, and simple appointment booking.", body: "", primaryLabel: "Book by WhatsApp", primaryUrl: "/Contact", secondaryLabel: "", secondaryUrl: "", layout: "cards-first", hidden: false },
    store: { label: "Store", badge: "Medicine Store", title: "Buy medicine online", copy: "Browse available medicines, check price and stock, then log in to order or add items to your cart.", body: "", primaryLabel: "Open store", primaryUrl: "/Store", secondaryLabel: "", secondaryUrl: "", layout: "cards-first", hidden: false },
    doctors: { label: "Doctors", badge: "Doctors", title: "Choose the right professional", copy: "Tap a card to open the full doctor profile with phone, WhatsApp, designation and chamber location.", body: "", primaryLabel: "Find appointment", primaryUrl: "/doctor-appointment", secondaryLabel: "", secondaryUrl: "", layout: "cards-first", hidden: false },
    ambulance: { label: "Ambulance", badge: "Ambulance options", title: "Need an ambulance?", copy: "Call or message us for ambulance support. Share patient condition, pickup location and destination.", body: "", primaryLabel: "WhatsApp", primaryUrl: "", secondaryLabel: "", secondaryUrl: "", layout: "cards-first", hidden: false },
    hospital: { label: "Hospital", badge: "Hospitals", title: "Hospitals", copy: "Browse hospitals by card, then open a profile to see full information and photos.", body: "", primaryLabel: "", primaryUrl: "", secondaryLabel: "", secondaryUrl: "", layout: "cards-first", hidden: false },
    blood: { label: "Blood", badge: "Blood", title: "Available blood people", copy: "Tap a card to view full details. Female contact details are protected and only available through admin.", body: "", primaryLabel: "Submit donor profile", primaryUrl: "/add-blood", secondaryLabel: "", secondaryUrl: "", layout: "cards-first", hidden: false },
    contact: { label: "Contact", badge: "Contact", title: "Need service today?", copy: "Use WhatsApp for the fastest booking. For emergency conditions, call local emergency services first.", body: "", primaryLabel: "WhatsApp", primaryUrl: "", secondaryLabel: "Call now", secondaryUrl: "", layout: "split", hidden: false },
    about: { label: "About", badge: "About", title: "About Medicare At Home", copy: "Meet the Medicare At Home team and read published updates.", body: "", primaryLabel: "", primaryUrl: "", secondaryLabel: "", secondaryUrl: "", layout: "standard", hidden: false }
  },
  emergencyNote:
    "This website is for home visit medical service contact. For life-threatening emergencies, contact your nearest hospital or emergency hotline immediately.",
  stats: [
    { value: "24/7", label: "Contact support" },
    { value: "5+", label: "Home care services" },
    { value: "3", label: "Contact numbers" },
    { value: "Fast", label: "WhatsApp response" }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

export const defaultDoctors = [];

async function createSchema(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    siteName TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    heroHighlight TEXT,
    heroTitleLine TEXT,
    primaryButtonText TEXT,
    secondaryButtonText TEXT,
    servicesButtonText TEXT,
    contactButtonText TEXT,
    navServicesLabel TEXT,
    navStoreLabel TEXT,
    navDoctorsLabel TEXT,
    navAmbulanceLabel TEXT,
    navHospitalLabel TEXT,
    navBloodLabel TEXT,
    navHowItWorksLabel TEXT,
    navContactLabel TEXT,
    servicesPageTitle TEXT,
    servicesPageCopy TEXT,
    storePageTitle TEXT,
    storePageCopy TEXT,
    doctorsPageTitle TEXT,
    doctorsPageCopy TEXT,
    ambulancePageTitle TEXT,
    ambulancePageCopy TEXT,
    hospitalPageTitle TEXT,
    hospitalPageCopy TEXT,
    ambulanceDescription TEXT,
    ambulanceButtonText TEXT,
    ambulancePhone TEXT,
    ambulanceWhatsapp TEXT,
    bloodPageTitle TEXT,
    bloodPageCopy TEXT,
    howPageTitle TEXT,
    howPageCopy TEXT,
    contactPageTitle TEXT,
    contactPageCopy TEXT,
    loginPageTitle TEXT,
    loginPageCopy TEXT,
    signupPageTitle TEXT,
    signupPageCopy TEXT,
    profilePageTitle TEXT,
    profilePageCopy TEXT,
    location TEXT,
    email TEXT,
    instagramHandle TEXT,
    facebookUrl TEXT,
    socialLinks TEXT,
    phones TEXT,
    whatsapp TEXT,
    serviceTags TEXT,
    serviceIcons TEXT,
    servicePhotos TEXT,
    serviceDescriptions TEXT,
    pageContent TEXT,
    emergencyNote TEXT,
    stats TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    designation TEXT,
    designationNote TEXT,
    specialty TEXT,
    degrees TEXT,
    experience TEXT,
    hospital TEXT,
    serviceArea TEXT,
    available TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    fee TEXT,
    chambers TEXT,
    services TEXT,
    languages TEXT,
    photoUrl TEXT,
    bio TEXT,
    sortOrder INTEGER DEFAULT 99,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS blood_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    bloodGroup TEXT NOT NULL,
    gender TEXT NOT NULL,
    customGender TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    homeAddress TEXT NOT NULL,
    isApproved INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS ambulances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    info TEXT,
    photoUrl TEXT,
    phone TEXT,
    whatsapp TEXT,
    sortOrder INTEGER DEFAULT 99,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    photoUrl TEXT,
    galleryPhotos TEXT,
    address TEXT,
    phone TEXT,
    whatsapp TEXT,
    description TEXT,
    services TEXT,
    sortOrder INTEGER DEFAULT 99,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await migrateSettingsSchema(db);
  await migrateDoctorsSchema(db);
  await migrateBloodProfilesSchema(db);
  await migrateAmbulancesSchema(db);
  await migrateHospitalsSchema(db);

  await db.execute("CREATE INDEX IF NOT EXISTS idx_doctors_active_sort ON doctors (isActive, sortOrder, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_blood_approved_group ON blood_profiles (isApproved, bloodGroup, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_ambulances_active_sort ON ambulances (isActive, sortOrder, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_hospitals_active_sort ON hospitals (isActive, sortOrder, createdAt)");
}

async function getTableColumns(db, table) {
  try {
    const result = await db.execute(`PRAGMA table_info(${table})`);
    return new Set((result.rows || []).map((row) => String(row.name || row[1] || "")));
  } catch {
    return new Set();
  }
}

async function addColumnIfMissing(db, table, existingColumns, name, type = "TEXT") {
  if (existingColumns.has(name)) return;
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    existingColumns.add(name);
  } catch (error) {
    const message = String(error?.message || error).toLowerCase();
    if (!message.includes("duplicate") && !message.includes("already exists")) {
      throw error;
    }
    existingColumns.add(name);
  }
}

async function migrateColumns(db, table, columns) {
  const existingColumns = await getTableColumns(db, table);
  for (const [name, type] of columns) {
    await addColumnIfMissing(db, table, existingColumns, name, type);
  }
}

async function migrateSettingsSchema(db) {
  await migrateColumns(db, "settings", [
    ["siteName", "TEXT"],
    ["tagline", "TEXT"],
    ["description", "TEXT"],
    ["heroHighlight", "TEXT"],
    ["heroTitleLine", "TEXT"],
    ["primaryButtonText", "TEXT"],
    ["secondaryButtonText", "TEXT"],
    ["servicesButtonText", "TEXT"],
    ["contactButtonText", "TEXT"],
    ["navServicesLabel", "TEXT"],
    ["navStoreLabel", "TEXT"],
    ["navDoctorsLabel", "TEXT"],
    ["navAmbulanceLabel", "TEXT"],
    ["navHospitalLabel", "TEXT"],
    ["navBloodLabel", "TEXT"],
    ["navHowItWorksLabel", "TEXT"],
    ["navContactLabel", "TEXT"],
    ["servicesPageTitle", "TEXT"],
    ["servicesPageCopy", "TEXT"],
    ["storePageTitle", "TEXT"],
    ["storePageCopy", "TEXT"],
    ["doctorsPageTitle", "TEXT"],
    ["doctorsPageCopy", "TEXT"],
    ["ambulancePageTitle", "TEXT"],
    ["ambulancePageCopy", "TEXT"],
    ["hospitalPageTitle", "TEXT"],
    ["hospitalPageCopy", "TEXT"],
    ["ambulanceDescription", "TEXT"],
    ["ambulanceButtonText", "TEXT"],
    ["ambulancePhone", "TEXT"],
    ["ambulanceWhatsapp", "TEXT"],
    ["bloodPageTitle", "TEXT"],
    ["bloodPageCopy", "TEXT"],
    ["howPageTitle", "TEXT"],
    ["howPageCopy", "TEXT"],
    ["contactPageTitle", "TEXT"],
    ["contactPageCopy", "TEXT"],
    ["loginPageTitle", "TEXT"],
    ["loginPageCopy", "TEXT"],
    ["signupPageTitle", "TEXT"],
    ["signupPageCopy", "TEXT"],
    ["profilePageTitle", "TEXT"],
    ["profilePageCopy", "TEXT"],
    ["location", "TEXT"],
    ["email", "TEXT"],
    ["instagramHandle", "TEXT"],
    ["facebookUrl", "TEXT"],
    ["socialLinks", "TEXT"],
    ["phones", "TEXT"],
    ["whatsapp", "TEXT"],
    ["serviceTags", "TEXT"],
    ["serviceIcons", "TEXT"],
    ["servicePhotos", "TEXT"],
    ["serviceDescriptions", "TEXT"],
    ["pageContent", "TEXT"],
    ["emergencyNote", "TEXT"],
    ["stats", "TEXT"],
    ["createdAt", "TEXT"],
    ["updatedAt", "TEXT"]
  ]);
}

async function migrateDoctorsSchema(db) {
  await migrateColumns(db, "doctors", [
    ["name", "TEXT"],
    ["designation", "TEXT"],
    ["designationNote", "TEXT"],
    ["specialty", "TEXT"],
    ["degrees", "TEXT"],
    ["experience", "TEXT"],
    ["hospital", "TEXT"],
    ["serviceArea", "TEXT"],
    ["available", "TEXT"],
    ["phone", "TEXT"],
    ["whatsapp", "TEXT"],
    ["fee", "TEXT"],
    ["chambers", "TEXT"],
    ["services", "TEXT"],
    ["languages", "TEXT"],
    ["photoUrl", "TEXT"],
    ["bio", "TEXT"],
    ["sortOrder", "INTEGER DEFAULT 99"],
    ["isActive", "INTEGER DEFAULT 1"],
    ["createdAt", "TEXT"],
    ["updatedAt", "TEXT"]
  ]);
}

async function migrateBloodProfilesSchema(db) {
  await migrateColumns(db, "blood_profiles", [
    ["fullName", "TEXT"],
    ["bloodGroup", "TEXT"],
    ["gender", "TEXT"],
    ["customGender", "TEXT"],
    ["phone", "TEXT"],
    ["whatsapp", "TEXT"],
    ["homeAddress", "TEXT"],
    ["isApproved", "INTEGER DEFAULT 0"],
    ["createdAt", "TEXT"],
    ["updatedAt", "TEXT"]
  ]);
}

async function migrateAmbulancesSchema(db) {
  await migrateColumns(db, "ambulances", [
    ["title", "TEXT"],
    ["info", "TEXT"],
    ["photoUrl", "TEXT"],
    ["phone", "TEXT"],
    ["whatsapp", "TEXT"],
    ["sortOrder", "INTEGER DEFAULT 99"],
    ["isActive", "INTEGER DEFAULT 1"],
    ["createdAt", "TEXT"],
    ["updatedAt", "TEXT"]
  ]);
}

async function migrateHospitalsSchema(db) {
  await migrateColumns(db, "hospitals", [
    ["name", "TEXT"],
    ["photoUrl", "TEXT"],
    ["galleryPhotos", "TEXT"],
    ["address", "TEXT"],
    ["phone", "TEXT"],
    ["whatsapp", "TEXT"],
    ["description", "TEXT"],
    ["services", "TEXT"],
    ["sortOrder", "INTEGER DEFAULT 99"],
    ["isActive", "INTEGER DEFAULT 1"],
    ["createdAt", "TEXT"],
    ["updatedAt", "TEXT"]
  ]);
}

async function countRows(db, table) {
  const result = await db.execute(`SELECT COUNT(*) AS total FROM ${table}`);
  return Number(result.rows[0]?.total || 0);
}


async function removeDefaultDoctorProfiles(db) {
  await db.execute({
    sql: `DELETE FROM doctors
          WHERE name IN ('Medicare Home Care Team', 'Home Injection Service', 'Dressing & Plaster Care')
          AND (photoUrl IS NULL OR photoUrl = '')`,
    args: []
  });
}

async function updateOldLocationValues(db) {
  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE settings SET location = ?, updatedAt = ? WHERE location = ?",
    args: ["Sultanpur, Feni, Bangladesh", now, "Feni, Barishal, Bangladesh"]
  });
  await db.execute({
    sql: "UPDATE doctors SET serviceArea = ?, updatedAt = ? WHERE serviceArea = ?",
    args: ["Sultanpur, Feni", now, "Feni, Barishal"]
  });
  await db.execute({
    sql: "UPDATE doctors SET serviceArea = ?, updatedAt = ? WHERE serviceArea = ?",
    args: ["Sultanpur, Feni and nearby areas", now, "Feni and nearby areas"]
  });
  await db.execute({
    sql: "UPDATE doctors SET serviceArea = ?, updatedAt = ? WHERE serviceArea = ?",
    args: ["Sultanpur, Feni and nearby areas", now, "Barishal and nearby areas"]
  });
}

export async function ensureSeed(db, env) {
  await createSchema(db);

  if (String(env.SEED_ON_EMPTY || "true").toLowerCase() !== "false") {
    const settingsCount = await countRows(db, "settings");
    if (!settingsCount) {
      await createSettings(db, defaultSettings);
    }

    const doctorsCount = await countRows(db, "doctors");
    if (!doctorsCount) {
      for (const doctor of defaultDoctors) {
        await createDoctor(db, doctor);
      }
    }
  }

  await removeDefaultDoctorProfiles(db);
  await updateOldLocationValues(db);
}
