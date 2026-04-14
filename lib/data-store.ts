import { DbUser, ReportListItem, ReportRecord } from "@/lib/types";
import { getDb } from "@/lib/mongodb";

type MemoryStore = {
  users: DbUser[];
  reports: ReportRecord[];
};

const globalForStore = globalThis as typeof globalThis & {
  _vizvaMemoryStore?: MemoryStore;
  _vizvaUsingMemoryStore?: boolean;
  _vizvaCollectionsPromise?: Promise<void> | null;
};

const memoryStore = globalForStore._vizvaMemoryStore ?? {
  users: [],
  reports: [],
};

globalForStore._vizvaMemoryStore = memoryStore;

async function ensureCollections() {
  const db = await getDb();

  if (!globalForStore._vizvaCollectionsPromise) {
    globalForStore._vizvaCollectionsPromise = Promise.all([
      db.collection<DbUser>("users").createIndex({ id: 1 }, { unique: true }),
      db.collection<DbUser>("users").createIndex({ email: 1 }, { unique: true }),
      db.collection<ReportRecord>("reports").createIndex({ id: 1 }, { unique: true }),
      db.collection<ReportRecord>("reports").createIndex({ employeeId: 1, updatedAt: -1 }),
    ]).then(() => undefined);
  }

  try {
    await globalForStore._vizvaCollectionsPromise;
  } catch (error) {
    globalForStore._vizvaCollectionsPromise = null;
    throw error;
  }

  return db;
}

async function withStoreFallback<T>(operation: () => Promise<T>, fallback: () => T | Promise<T>) {
  try {
    const result = await operation();
    globalForStore._vizvaUsingMemoryStore = false;
    return result;
  } catch (error) {
    if (!globalForStore._vizvaUsingMemoryStore) {
      console.error("MongoDB unavailable, using in-memory fallback store.", error);
      globalForStore._vizvaUsingMemoryStore = true;
    }
    return fallback();
  }
}

export async function listUsers() {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      return db.collection<DbUser>("users").find({}).sort({ name: 1 }).toArray();
    },
    () => [...memoryStore.users].sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export async function hasUsers() {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      return (await db.collection<DbUser>("users").findOne({}, { projection: { _id: 1 } })) !== null;
    },
    () => memoryStore.users.length > 0,
  );
}

export async function findUserById(userId: string) {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      return db.collection<DbUser>("users").findOne({ id: userId });
    },
    () => memoryStore.users.find((user) => user.id === userId) ?? null,
  );
}

export async function findUserByEmail(email: string) {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      return db.collection<DbUser>("users").findOne({ email: { $regex: `^${email}$`, $options: "i" } });
    },
    () => memoryStore.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null,
  );
}

export async function listUsersByIds(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return [] as DbUser[];
  }

  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      return db.collection<DbUser>("users").find({ id: { $in: uniqueIds } }).toArray();
    },
    () => memoryStore.users.filter((user) => uniqueIds.includes(user.id)),
  );
}

export async function createUserRecord(user: DbUser) {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      await db.collection<DbUser>("users").insertOne(user);
      return user;
    },
    () => {
      const exists = memoryStore.users.some(
        (existingUser) =>
          existingUser.id === user.id || existingUser.email.toLowerCase() === user.email.toLowerCase(),
      );
      if (exists) {
        const duplicateError = new Error("This record already exists.") as Error & { code?: number };
        duplicateError.code = 11000;
        throw duplicateError;
      }

      memoryStore.users.push(user);
      return user;
    },
  );
}

export async function createInitialAdmin(user: DbUser) {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      const usersCollection = db.collection<DbUser>("users");
      if ((await usersCollection.findOne({}, { projection: { _id: 1 } })) !== null) {
        throw new Error("Setup has already been completed.");
      }

      await usersCollection.insertOne(user);
      return user;
    },
    () => {
      if (memoryStore.users.length > 0) {
        throw new Error("Setup has already been completed.");
      }

      memoryStore.users.push(user);
      return user;
    },
  );
}

export async function listReports() {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      return db.collection<ReportRecord>("reports").find({}).sort({ updatedAt: -1 }).toArray();
    },
    () => [...memoryStore.reports].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

export async function listReportSummaries() {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      return db
        .collection<ReportRecord>("reports")
        .find(
          {},
          {
            projection: {
              snapshot: 0,
            },
          },
        )
        .sort({ updatedAt: -1 })
        .toArray() as Promise<ReportListItem[]>;
    },
    () =>
      [...memoryStore.reports]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(({ snapshot: _snapshot, ...report }) => report),
  );
}

export async function findReportById(reportId: string) {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      return db.collection<ReportRecord>("reports").findOne({ id: reportId });
    },
    () => memoryStore.reports.find((report) => report.id === reportId) ?? null,
  );
}

export async function upsertReport(report: ReportRecord) {
  return withStoreFallback(
    async () => {
      const db = await ensureCollections();
      await db.collection<ReportRecord>("reports").updateOne(
        { id: report.id },
        { $set: report },
        { upsert: true },
      );
      return report;
    },
    () => {
      const existingIndex = memoryStore.reports.findIndex((currentReport) => currentReport.id === report.id);
      if (existingIndex >= 0) {
        memoryStore.reports[existingIndex] = report;
      } else {
        memoryStore.reports.push(report);
      }
      return report;
    },
  );
}
