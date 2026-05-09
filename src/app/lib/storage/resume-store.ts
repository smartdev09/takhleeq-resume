import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Resume } from "lib/redux/types";
import type { Settings } from "lib/redux/settingsSlice";
import { initialResumeState } from "lib/redux/resumeSlice";
import { initialSettings } from "lib/redux/settingsSlice";

export interface ResumeRecord {
  id: string;
  name: string;
  resume: Resume;
  settings: Settings;
  createdAt: string;
  updatedAt: string;
  atsScore?: number;
  lastJobMatch?: string;
}

export interface ResumeListItem {
  id: string;
  name: string;
  updatedAt: string;
  atsScore?: number;
}

interface ResumeDB extends DBSchema {
  resumes: {
    key: string;
    value: ResumeRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<ResumeDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ResumeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ResumeDB>("open-resume-db", 1, {
      upgrade(db) {
        db.createObjectStore("resumes", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function listResumes(): Promise<ResumeRecord[]> {
  const db = await getDB();
  const all = await db.getAll("resumes");
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getResume(
  id: string
): Promise<ResumeRecord | undefined> {
  const db = await getDB();
  return db.get("resumes", id);
}

export async function createResume(
  name: string,
  resume: Resume = initialResumeState,
  settings: Settings = initialSettings
): Promise<ResumeRecord> {
  const db = await getDB();
  const now = new Date().toISOString();
  const record: ResumeRecord = {
    id: crypto.randomUUID(),
    name,
    resume,
    settings,
    createdAt: now,
    updatedAt: now,
  };
  await db.put("resumes", record);
  return record;
}

export async function updateResume(
  id: string,
  patch: Partial<
    Pick<
      ResumeRecord,
      "name" | "resume" | "settings" | "atsScore" | "lastJobMatch"
    >
  >
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("resumes", id);
  if (!existing) return;
  const updated: ResumeRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.put("resumes", updated);
}

export async function deleteResume(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("resumes", id);
}

export async function duplicateResume(
  id: string
): Promise<ResumeRecord | undefined> {
  const db = await getDB();
  const existing = await db.get("resumes", id);
  if (!existing) return undefined;
  const now = new Date().toISOString();
  const copy: ResumeRecord = {
    ...existing,
    id: crypto.randomUUID(),
    name: `${existing.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  await db.put("resumes", copy);
  return copy;
}

export async function exportAll(): Promise<string> {
  const all = await listResumes();
  return JSON.stringify(all, null, 2);
}

export async function importAll(json: string): Promise<void> {
  const records = JSON.parse(json) as ResumeRecord[];
  const db = await getDB();
  const tx = db.transaction("resumes", "readwrite");
  await Promise.all(records.map((r) => tx.store.put(r)));
  await tx.done;
}
