import { DbUser, ReportRecord } from "@/lib/types";
import { getDb } from "@/lib/mongodb";

async function ensureCollections() {
  const db = await getDb();
  await db.collection<DbUser>("users").createIndex({ id: 1 }, { unique: true });
  await db.collection<DbUser>("users").createIndex({ email: 1 }, { unique: true });
  await db.collection<ReportRecord>("reports").createIndex({ id: 1 }, { unique: true });
  await db.collection<ReportRecord>("reports").createIndex({ employeeId: 1, updatedAt: -1 });
  return db;
}

export async function listUsers() {
  const db = await ensureCollections();
  return db.collection<DbUser>("users").find({}).sort({ name: 1 }).toArray();
}

export async function hasUsers() {
  const db = await ensureCollections();
  return (await db.collection<DbUser>("users").countDocuments()) > 0;
}

export async function findUserById(userId: string) {
  const db = await ensureCollections();
  return db.collection<DbUser>("users").findOne({ id: userId });
}

export async function findUserByEmail(email: string) {
  const db = await ensureCollections();
  return db.collection<DbUser>("users").findOne({ email: { $regex: `^${email}$`, $options: "i" } });
}

export async function createUserRecord(user: DbUser) {
  const db = await ensureCollections();
  await db.collection<DbUser>("users").insertOne(user);
  return user;
}

export async function createInitialAdmin(user: DbUser) {
  const db = await ensureCollections();
  const usersCollection = db.collection<DbUser>("users");
  if ((await usersCollection.countDocuments()) > 0) {
    throw new Error("Setup has already been completed.");
  }

  await usersCollection.insertOne(user);
  return user;
}

export async function listReports() {
  const db = await ensureCollections();
  return db.collection<ReportRecord>("reports").find({}).sort({ updatedAt: -1 }).toArray();
}

export async function findReportById(reportId: string) {
  const db = await ensureCollections();
  return db.collection<ReportRecord>("reports").findOne({ id: reportId });
}

export async function upsertReport(report: ReportRecord) {
  const db = await ensureCollections();
  await db.collection<ReportRecord>("reports").updateOne(
    { id: report.id },
    { $set: report },
    { upsert: true },
  );
  return report;
}
