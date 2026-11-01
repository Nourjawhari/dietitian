/**
 * Mock data for local development.
 *
 * Run:   npx prisma db seed      (or: npm run seed)
 * Login: every seeded account uses the password in SEED_PASSWORD below.
 *
 * The seed wipes every table first, so it can be run again at any time.
 * It refuses to run when NODE_ENV=production.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import db from "@/lib/db"
import {
  AppointmentStatus,
  ContactSubmissionStatus,
  ExtractionStatus,
  Gender,
  Language,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  RecurrencePattern,
  Role,
} from "../app/generated/prisma/client";

const SEED_PASSWORD = "Password123!";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed: NODE_ENV is production.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = db

// ───────────────────────────── DATE HELPERS ─────────────────────────────
// All dates are relative to today, so the data stays realistic whenever the seed runs.
// @db.Date columns take a Date at UTC midnight; @db.Time columns take a Date on 1970-01-01 UTC.

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function time(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** The appointment's start as a full timestamp (used for reminder scheduling). */
function startsAt(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(date.getTime() + h * HOUR_MS + m * 60 * 1000);
}

function isWorkingDay(date: Date): boolean {
  const day = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  return day >= 1 && day <= 5;
}

/** The n-th working day from today (n = 0 is today if it is a working day). */
function workingDayFromToday(n: number): Date {
  let date = today();
  let count = -1;
  while (true) {
    if (isWorkingDay(date)) count++;
    if (count === n) return date;
    date = addDays(date, 1);
  }
}

/** The n-th working day before today (n = 1 is the most recent one). */
function workingDayBeforeToday(n: number): Date {
  let date = today();
  let count = 0;
  while (count < n) {
    date = addDays(date, -1);
    if (isWorkingDay(date)) count++;
  }
  return date;
}

function dateKey(date: Date, hhmm: string): string {
  return `${date.toISOString().slice(0, 10)} ${hhmm}`;
}

// ───────────────────────────── HEALTH HELPERS ─────────────────────────────

function bmiOf(heightCm: number, weightKg: number): number {
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 100) / 100;
}

function healthRecord(heightCm: number, weightKg: number) {
  const bmi = bmiOf(heightCm, weightKg);
  return { height: heightCm, weight: weightKg, bmi, isObese: bmi >= 30 };
}

// ───────────────────────────── RESET ─────────────────────────────

async function reset() {
  // Children before parents, so onDelete: Restrict never blocks the cleanup.
  await prisma.$transaction([
    prisma.appointmentNotification.deleteMany(),
    prisma.appointment.updateMany({ data: { parentAppointmentId: null, slotId: null } }),
    prisma.appointment.deleteMany(),
    prisma.appointmentSlot.deleteMany(),
    prisma.appointmentSettings.deleteMany(),
    prisma.bodyCompositionReport.deleteMany(),
    prisma.patientHealthRecord.deleteMany(),
    prisma.revokedToken.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.dietitian.deleteMany(),
    prisma.user.deleteMany(),
    prisma.healthTip.deleteMany(),
    prisma.pageSection.deleteMany(),
    prisma.page.deleteMany(),
    prisma.contactSubmission.deleteMany(),
  ]);
}

// ───────────────────────────── STAFF ─────────────────────────────

async function seedStaff(passwordHash: string) {
  const superAdmin = await prisma.user.create({
    data: {
      fullName: "System Owner",
      email: "superadmin@dietitian.test",
      passwordHash,
      phoneNumber: "+96170000001",
      role: Role.super_admin,
      preferredLanguage: Language.en,
    },
  });

  // The administrator is the dietitian, so the account also gets a dietitian row.
  const dietitian = await prisma.user.create({
    data: {
      fullName: "Rania Haddad",
      email: "admin@dietitian.test",
      passwordHash,
      phoneNumber: "+96170000002",
      role: Role.admin,
      preferredLanguage: Language.ar,
      dietitian: { create: {} },
    },
  });

  await prisma.appointmentSettings.create({
    data: { id: 1, appointmentDuration: 60, bufferTime: 15, updatedBy: dietitian.id },
  });

  return { superAdmin, dietitian };
}

// ───────────────────────────── PATIENTS ─────────────────────────────

type PatientSeed = {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  language: Language;
  dateOfBirth: string | null;
  gender: Gender | null;
  note: string | null;
  whatsappOptIn: boolean;
  aiConsent: boolean;
  deleted?: boolean;
  /** Weight history in kg, oldest first, recorded every 30 days up to today. */
  weights: number[];
  height: number;
  chronicConditions: string[];
  allergies: string[];
  goal: string | null;
};

const PATIENTS: PatientSeed[] = [
  {
    username: "nour_k",
    fullName: "Nour Khalil",
    email: "nour.khalil@example.com",
    phone: "+96171111111",
    language: Language.ar,
    dateOfBirth: "1992-04-18",
    gender: Gender.female,
    note: "Prefers morning appointments.",
    whatsappOptIn: true,
    aiConsent: true,
    weights: [92.4, 89.8, 87.1],
    height: 165,
    chronicConditions: ["type 2 diabetes"],
    allergies: ["peanuts"],
    goal: "Reach 78 kg and bring HbA1c under 6.5%.",
  },
  {
    username: "karim.saad",
    fullName: "Karim Saad",
    email: "karim.saad@example.com",
    phone: "+96171222222",
    language: Language.en,
    dateOfBirth: "1985-11-02",
    gender: Gender.male,
    note: null,
    whatsappOptIn: true,
    aiConsent: true,
    weights: [104.0, 101.5],
    height: 178,
    chronicConditions: ["hypertension", "high cholesterol"],
    allergies: [],
    goal: "Lower blood pressure through a low-sodium plan.",
  },
  {
    username: "maya_f",
    fullName: "Maya Farah",
    email: "maya.farah@example.com",
    phone: "+96171333333",
    language: Language.en,
    dateOfBirth: "1999-07-09",
    gender: Gender.female,
    note: "Vegetarian.",
    whatsappOptIn: false,
    aiConsent: true,
    weights: [58.2],
    height: 168,
    chronicConditions: [],
    allergies: ["lactose"],
    goal: "Build muscle mass on a vegetarian diet.",
  },
  {
    username: "ali.hassan",
    fullName: "Ali Hassan",
    email: "ali.hassan@example.com",
    phone: "+96171444444",
    language: Language.ar,
    dateOfBirth: "1978-01-25",
    gender: Gender.male,
    note: null,
    whatsappOptIn: true,
    aiConsent: false,
    weights: [96.3, 95.0, 93.2],
    height: 172,
    chronicConditions: ["sleep apnea"],
    allergies: ["shellfish"],
    goal: "Lose 10 kg before the follow-up sleep study.",
  },
  {
    // Registered but has not completed the health intake yet: no record, no bookings.
    username: "lea.m",
    fullName: "Lea Mansour",
    email: "lea.mansour@example.com",
    phone: "+96171555555",
    language: Language.en,
    dateOfBirth: null,
    gender: null,
    note: null,
    whatsappOptIn: false,
    aiConsent: false,
    weights: [],
    height: 0,
    chronicConditions: [],
    allergies: [],
    goal: null,
  },
  {
    // Soft-deleted: hidden from the app, but the medical history is kept.
    username: "omar.z",
    fullName: "Omar Zein",
    email: "omar.zein@example.com",
    phone: "+96171666666",
    language: Language.ar,
    dateOfBirth: "1990-09-30",
    gender: Gender.male,
    note: "Account closed at the patient's request.",
    whatsappOptIn: true,
    aiConsent: false,
    deleted: true,
    weights: [88.0],
    height: 175,
    chronicConditions: [],
    allergies: [],
    goal: "Maintain weight.",
  },
];

async function seedPatients(passwordHash: string) {
  const patients: Record<string, { patientId: string; userId: string; seed: PatientSeed }> = {};

  for (const [index, p] of PATIENTS.entries()) {
    const registeredAt = daysAgo(120 - index * 10);
    const deletedAt = p.deleted ? daysAgo(5) : null;

    const user = await prisma.user.create({
      data: {
        fullName: p.fullName,
        email: p.email,
        passwordHash,
        phoneNumber: p.phone,
        role: Role.patient,
        preferredLanguage: p.language,
        createdAt: registeredAt,
        deletedAt,
        patient: {
          create: {
            dateOfBirth: p.dateOfBirth ? new Date(`${p.dateOfBirth}T00:00:00.000Z`) : null,
            gender: p.gender,
            phone: p.phone,
            note: p.note,
            whatsappOptInAt: p.whatsappOptIn ? registeredAt : null,
            aiProcessingConsentAt: p.aiConsent ? registeredAt : null,
            createdAt: registeredAt,
            deletedAt,
          },
        },
      },
      include: { patient: true },
    });

    const patientId = user.patient!.id;
    patients[p.username] = { patientId, userId: user.id, seed: p };

    // Health records: one per weight, 30 days apart, the last one today.
    if (p.weights.length > 0) {
      await prisma.patientHealthRecord.createMany({
        data: p.weights.map((weight, i) => ({
          patientId,
          recordedAt: daysAgo((p.weights.length - 1 - i) * 30),
          ...healthRecord(p.height, weight),
          chronicConditions: p.chronicConditions,
          allergies: p.allergies,
          dietitianGoal: p.goal,
        })),
      });
    }
  }

  return patients;
}

// ───────────────────────────── BODY COMPOSITION ─────────────────────────────

async function seedBodyComposition(
  patients: Awaited<ReturnType<typeof seedPatients>>,
  dietitianUserId: string,
) {
  // Only patients with AI consent have reports, matching the upload rule (422 without consent).
  await prisma.bodyCompositionReport.createMany({
    data: [
      {
        patientId: patients["nour_k"].patientId,
        filePath: "uploads/body-composition/nour_k-1.pdf",
        extractionStatus: ExtractionStatus.reviewed,
        bodyFatPercentage: 38.4,
        visceralFatLevel: 11,
        basalMetabolicRate: 1480,
        muscleMass: 47.2,
        reviewedByDietitianId: dietitianUserId,
        reviewedAt: daysAgo(58),
        createdAt: daysAgo(60),
      },
      {
        patientId: patients["nour_k"].patientId,
        filePath: "uploads/body-composition/nour_k-2.pdf",
        extractionStatus: ExtractionStatus.success,
        bodyFatPercentage: 35.9,
        visceralFatLevel: 10,
        basalMetabolicRate: 1462,
        muscleMass: 47.6,
        createdAt: daysAgo(1),
      },
      {
        patientId: patients["karim.saad"].patientId,
        filePath: "uploads/body-composition/karim.saad-1.jpg",
        extractionStatus: ExtractionStatus.failed,
        extractionError: "Could not read the metrics table: image is too blurry.",
        createdAt: daysAgo(3),
      },
      {
        patientId: patients["maya_f"].patientId,
        filePath: "uploads/body-composition/maya_f-1.png",
        extractionStatus: ExtractionStatus.pending,
        createdAt: new Date(),
      },
    ],
  });
}

// ───────────────────────────── SLOTS & APPOINTMENTS ─────────────────────────────

const SLOT_STARTS = ["09:00", "10:15", "11:30", "12:45", "14:00", "15:15"]; // 60 min + 15 min buffer

async function seedSlots(): Promise<Map<string, string>> {
  const dates: Date[] = [];
  for (let n = 15; n >= 1; n--) dates.push(workingDayBeforeToday(n)); // 3 weeks of history
  for (let n = 0; n < 20; n++) dates.push(workingDayFromToday(n)); // 4 weeks ahead

  await prisma.appointmentSlot.createMany({
    data: dates.flatMap((date) =>
      SLOT_STARTS.map((start) => ({
        date,
        startTime: time(start),
        endTime: time(addMinutes(start, 60)),
      })),
    ),
  });

  const slots = await prisma.appointmentSlot.findMany();
  return new Map(slots.map((s) => [dateKey(s.date, s.startTime.toISOString().slice(11, 16)), s.id]));
}

async function seedAppointments(
  patients: Awaited<ReturnType<typeof seedPatients>>,
  slotIds: Map<string, string>,
) {
  const slotId = (date: Date, start: string) => {
    const id = slotIds.get(dateKey(date, start));
    if (!id) throw new Error(`No slot for ${dateKey(date, start)}`);
    return id;
  };

  /** Books a slot. Cancelled and rescheduled appointments release it (slotId = null). */
  const book = (
    username: string,
    date: Date,
    start: string,
    status: AppointmentStatus,
    extra: { cancellationReason?: string; parentAppointmentId?: string; isRecurring?: boolean; recurrencePattern?: RecurrencePattern; createdAt?: Date } = {},
  ) => {
    const releasesSlot = status === AppointmentStatus.cancelled || status === AppointmentStatus.rescheduled;
    return prisma.appointment.create({
      data: {
        patientId: patients[username].patientId,
        slotId: releasesSlot ? null : slotId(date, start),
        appointmentDate: date,
        startTime: time(start),
        endTime: time(addMinutes(start, 60)),
        status,
        isRecurring: extra.isRecurring ?? false,
        recurrencePattern: extra.recurrencePattern ?? RecurrencePattern.none,
        parentAppointmentId: extra.parentAppointmentId,
        cancellationReason: extra.cancellationReason,
        createdAt: extra.createdAt,
      },
    });
  };

  // Past history
  const nourPast = await book("nour_k", workingDayBeforeToday(10), "09:00", AppointmentStatus.completed, { createdAt: daysAgo(20) });
  const karimPast = await book("karim.saad", workingDayBeforeToday(8), "10:15", AppointmentStatus.completed, { createdAt: daysAgo(15) });
  const aliPast = await book("ali.hassan", workingDayBeforeToday(5), "14:00", AppointmentStatus.completed, { createdAt: daysAgo(12) });
  const omarPast = await book("omar.z", workingDayBeforeToday(12), "11:30", AppointmentStatus.completed, { createdAt: daysAgo(25) });
  const mayaCancelled = await book("maya_f", workingDayBeforeToday(3), "12:45", AppointmentStatus.cancelled, {
    cancellationReason: "Travelling for work.",
    createdAt: daysAgo(10),
  });

  // Weekly recurring series for Nour: the first appointment is the parent.
  const seriesDates = [0, 5, 10, 15].map((n) => workingDayFromToday(n + 2));
  const nourParent = await book("nour_k", seriesDates[0], "09:00", AppointmentStatus.confirmed, {
    isRecurring: true,
    recurrencePattern: RecurrencePattern.weekly,
    createdAt: daysAgo(2),
  });
  const nourChildren = [];
  for (const date of seriesDates.slice(1)) {
    nourChildren.push(
      await book("nour_k", date, "09:00", AppointmentStatus.confirmed, {
        isRecurring: true,
        recurrencePattern: RecurrencePattern.weekly,
        parentAppointmentId: nourParent.id,
        createdAt: daysAgo(2),
      }),
    );
  }

  // Karim rescheduled: the old appointment is marked rescheduled and the new one holds the slot.
  const karimOld = await book("karim.saad", workingDayFromToday(1), "10:15", AppointmentStatus.rescheduled, { createdAt: daysAgo(6) });
  const karimNew = await book("karim.saad", workingDayFromToday(4), "14:00", AppointmentStatus.confirmed, { createdAt: daysAgo(1) });

  // Waiting for the dietitian's approval
  const mayaPending = await book("maya_f", workingDayFromToday(3), "11:30", AppointmentStatus.pending, { createdAt: new Date() });
  const aliPending = await book("ali.hassan", workingDayFromToday(6), "15:15", AppointmentStatus.pending, { createdAt: new Date() });

  return {
    nourPast, karimPast, aliPast, omarPast, mayaCancelled,
    nourParent, nourChildren, karimOld, karimNew, mayaPending, aliPending,
  };
}

// ───────────────────────────── NOTIFICATIONS ─────────────────────────────

async function seedNotifications(
  patients: Awaited<ReturnType<typeof seedPatients>>,
  a: Awaited<ReturnType<typeof seedAppointments>>,
) {
  // WhatsApp only for patients who opted in; everyone else gets email.
  const channelFor = (username: string) =>
    patients[username].seed.whatsappOptIn ? NotificationChannel.whatsapp : NotificationChannel.email;

  const reminderAt = (appt: { appointmentDate: Date; startTime: Date }) =>
    new Date(startsAt(appt.appointmentDate, appt.startTime.toISOString().slice(11, 16)).getTime() - DAY_MS);

  await prisma.appointmentNotification.createMany({
    data: [
      // Completed history: confirmation + reminder both sent
      ...[
        [a.nourPast, "nour_k"],
        [a.karimPast, "karim.saad"],
        [a.aliPast, "ali.hassan"],
        [a.omarPast, "omar.z"],
      ].flatMap(([appt, username]) => {
        const ap = appt as typeof a.nourPast;
        return [
          { appointmentId: ap.id, channel: channelFor(username as string), notificationType: NotificationType.confirmation, status: NotificationStatus.sent, sentAt: ap.createdAt },
          { appointmentId: ap.id, channel: channelFor(username as string), notificationType: NotificationType.reminder, status: NotificationStatus.sent, scheduledAt: reminderAt(ap), sentAt: reminderAt(ap) },
        ];
      }),

      // Cancellation (Maya has no WhatsApp opt-in, so email)
      { appointmentId: a.mayaCancelled.id, channel: NotificationChannel.email, notificationType: NotificationType.confirmation, status: NotificationStatus.sent, sentAt: a.mayaCancelled.createdAt },
      { appointmentId: a.mayaCancelled.id, channel: NotificationChannel.email, notificationType: NotificationType.cancellation, status: NotificationStatus.sent, sentAt: daysAgo(4) },

      // Recurring series: confirmation sent for the parent, reminders queued for each
      { appointmentId: a.nourParent.id, channel: NotificationChannel.whatsapp, notificationType: NotificationType.confirmation, status: NotificationStatus.sent, sentAt: daysAgo(2) },
      ...[a.nourParent, ...a.nourChildren].map((appt) => ({
        appointmentId: appt.id,
        channel: NotificationChannel.whatsapp,
        notificationType: NotificationType.reminder,
        status: NotificationStatus.pending,
        scheduledAt: reminderAt(appt),
      })),

      // Reschedule: WhatsApp failed, email fallback succeeded
      { appointmentId: a.karimOld.id, channel: NotificationChannel.whatsapp, notificationType: NotificationType.confirmation, status: NotificationStatus.sent, sentAt: daysAgo(6) },
      { appointmentId: a.karimNew.id, channel: NotificationChannel.whatsapp, notificationType: NotificationType.reschedule, status: NotificationStatus.failed, errorMessage: "WhatsApp API timeout after 3 retries.", sentAt: null },
      { appointmentId: a.karimNew.id, channel: NotificationChannel.email, notificationType: NotificationType.reschedule, status: NotificationStatus.sent, sentAt: daysAgo(1) },
      { appointmentId: a.karimNew.id, channel: NotificationChannel.whatsapp, notificationType: NotificationType.reminder, status: NotificationStatus.pending, scheduledAt: reminderAt(a.karimNew) },
    ],
  });
  // Pending appointments get no confirmation until the dietitian approves them.
}

// ───────────────────────────── AUTH ─────────────────────────────

async function seedRevokedTokens(patients: Awaited<ReturnType<typeof seedPatients>>) {
  await prisma.revokedToken.createMany({
    data: [
      // Still blocked: logged out an hour ago, token valid for another 23 hours
      { jti: "seed-jti-active-0001", userId: patients["nour_k"].userId, expiresAt: new Date(Date.now() + 23 * HOUR_MS), createdAt: new Date(Date.now() - HOUR_MS) },
      // Already expired: the cleanup job can purge it
      { jti: "seed-jti-expired-0002", userId: patients["karim.saad"].userId, expiresAt: daysAgo(2), createdAt: daysAgo(3) },
    ],
  });
}

// ───────────────────────────── CONTACT ─────────────────────────────

async function seedContactSubmissions() {
  await prisma.contactSubmission.createMany({
    data: [
      { fullName: "Sara Nassar", email: "sara.nassar@example.com", phone: "+96176123456", subject: "Pregnancy nutrition", message: "Do you offer nutrition plans during pregnancy?", status: ContactSubmissionStatus.unread, submittedAt: daysAgo(0.2) },
      { fullName: "Georges Abi Nader", email: "georges.an@example.com", phone: null, subject: "Prices", message: "How much is the first consultation?", status: ContactSubmissionStatus.read, submittedAt: daysAgo(2) },
      { fullName: "Hiba Chami", email: "hiba.chami@example.com", phone: "+96103987654", subject: "Online sessions", message: "هل تقدمون استشارات أونلاين؟", status: ContactSubmissionStatus.replied, submittedAt: daysAgo(6) },
      { fullName: "Test Spam", email: "promo@spam.example.com", phone: null, subject: "SEO services", message: "We can rank your website first on Google.", status: ContactSubmissionStatus.archived, submittedAt: daysAgo(14) },
    ],
  });
}

// ───────────────────────────── PAGES & HEALTH TIPS ─────────────────────────────

type SectionSeed = { key: string; content: Record<string, unknown> };
type PageSeed = { slug: string; title: Record<Language, string>; sections: Record<Language, SectionSeed[]> };

const PAGES: PageSeed[] = [
  {
    slug: "home",
    title: { en: "Home", ar: "الرئيسية" },
    sections: {
      en: [
        { key: "hero", content: { heading: "Eat well, live better", subheading: "Personal nutrition plans built around you.", cta: { label: "Book an appointment", href: "/book" } } },
        { key: "health-tips", content: { heading: "Health tips" } },
      ],
      ar: [
        { key: "hero", content: { heading: "كُل جيداً، عِش أفضل", subheading: "خطط غذائية شخصية مصممة لك.", cta: { label: "احجز موعداً", href: "/book" } } },
        { key: "health-tips", content: { heading: "نصائح صحية" } },
      ],
    },
  },
  {
    slug: "services",
    title: { en: "Services", ar: "الخدمات" },
    sections: {
      en: [{ key: "list", content: { items: ["Weight management", "Diabetes nutrition", "Sports nutrition", "Body composition analysis"] } }],
      ar: [{ key: "list", content: { items: ["إدارة الوزن", "تغذية مرضى السكري", "التغذية الرياضية", "تحليل مكونات الجسم"] } }],
    },
  },
  {
    slug: "why-choose-me",
    title: { en: "Why Choose Me", ar: "لماذا تختارني" },
    sections: {
      en: [{ key: "reasons", content: { items: ["10+ years of clinical experience", "Plans based on your lab results", "Follow-up between sessions"] } }],
      ar: [{ key: "reasons", content: { items: ["أكثر من 10 سنوات من الخبرة السريرية", "خطط مبنية على نتائج فحوصاتك", "متابعة بين الجلسات"] } }],
    },
  },
  {
    slug: "how-it-works",
    title: { en: "How It Works", ar: "كيف يعمل" },
    sections: {
      en: [{ key: "steps", content: { items: ["Create your account", "Fill in your health intake", "Pick a time slot", "Meet your dietitian"] } }],
      ar: [{ key: "steps", content: { items: ["أنشئ حسابك", "املأ استمارة المعلومات الصحية", "اختر موعداً", "قابل أخصائية التغذية"] } }],
    },
  },
  {
    slug: "contact",
    title: { en: "Contact", ar: "تواصل معنا" },
    sections: {
      en: [{ key: "details", content: { address: "Hamra Street, Beirut", phone: "+961 1 234 567", hours: "Mon–Fri, 9:00–16:15" } }],
      ar: [{ key: "details", content: { address: "شارع الحمرا، بيروت", phone: "+961 1 234 567", hours: "الاثنين–الجمعة، 9:00–16:15" } }],
    },
  },
];

async function seedPagesAndTips() {
  const tipSections: Partial<Record<Language, string>> = {};

  for (const page of PAGES) {
    for (const language of [Language.en, Language.ar]) {
      const created = await prisma.page.create({
        data: {
          slug: page.slug,
          title: page.title[language],
          language,
          sections: {
            create: page.sections[language].map((s, i) => ({ sectionKey: s.key, content: s.content, displayOrder: i + 1 })),
          },
        },
        include: { sections: true },
      });
      const tips = created.sections.find((s) => s.sectionKey === "health-tips");
      if (tips) tipSections[language] = tips.id;
    }
  }

  // A soft-deleted page, to check that the public site hides it
  await prisma.page.create({
    data: { slug: "summer-offer", title: "Summer offer", language: Language.en, deletedAt: daysAgo(30) },
  });

  await prisma.healthTip.createMany({
    data: [
      { sectionId: tipSections.en, language: Language.en, title: "Drink water before meals", content: "A glass of water 30 minutes before eating helps you feel full sooner.", isPublished: true, publishedAt: daysAgo(20) },
      { sectionId: tipSections.en, language: Language.en, title: "Fill half your plate with vegetables", content: "Vegetables add fibre and volume with very few calories.", isPublished: true, publishedAt: daysAgo(10) },
      { sectionId: tipSections.en, language: Language.en, title: "Plan your snacks", content: "Draft: keep a portioned snack ready so hunger does not decide for you.", isPublished: false },
      { sectionId: tipSections.ar, language: Language.ar, title: "اشرب الماء قبل الوجبات", content: "كوب من الماء قبل الأكل بثلاثين دقيقة يساعدك على الشعور بالشبع أسرع.", isPublished: true, publishedAt: daysAgo(20) },
      { sectionId: tipSections.ar, language: Language.ar, title: "نصف طبقك خضار", content: "الخضار تضيف الألياف والحجم بسعرات حرارية قليلة جداً.", isPublished: true, publishedAt: daysAgo(10) },
      { sectionId: null, language: Language.en, title: "Sleep and appetite", content: "Short sleep raises hunger hormones the next day.", isPublished: true, publishedAt: daysAgo(3) },
    ],
  });
}

// ───────────────────────────── MAIN ─────────────────────────────

async function main() {
  console.log("Resetting tables...");
  await reset();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  console.log("Seeding staff and settings...");
  const { dietitian } = await seedStaff(passwordHash);

  console.log("Seeding patients and health records...");
  const patients = await seedPatients(passwordHash);

  console.log("Seeding body composition reports...");
  await seedBodyComposition(patients, dietitian.id);

  console.log("Seeding slots, appointments and notifications...");
  const slotIds = await seedSlots();
  const appointments = await seedAppointments(patients, slotIds);
  await seedNotifications(patients, appointments);

  console.log("Seeding revoked tokens, contact submissions, pages and health tips...");
  await seedRevokedTokens(patients);
  await seedContactSubmissions();
  await seedPagesAndTips();

  const counts = {
    users: await prisma.user.count(),
    patients: await prisma.patient.count(),
    healthRecords: await prisma.patientHealthRecord.count(),
    bodyCompositionReports: await prisma.bodyCompositionReport.count(),
    appointmentSlots: await prisma.appointmentSlot.count(),
    appointments: await prisma.appointment.count(),
    notifications: await prisma.appointmentNotification.count(),
    revokedTokens: await prisma.revokedToken.count(),
    contactSubmissions: await prisma.contactSubmission.count(),
    pages: await prisma.page.count(),
    pageSections: await prisma.pageSection.count(),
    healthTips: await prisma.healthTip.count(),
  };
  console.table(counts);
  console.log(`Done. Log in with any seeded email and the password "${SEED_PASSWORD}" (admin: admin@dietitian.test).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());