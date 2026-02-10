import fs from "node:fs";
import path from "node:path";
import { getConfig } from "../config.js";
import type { PrIndex, PrDetail } from "../types/pr.js";

function dataDir(): string {
  return getConfig().DATA_DIR;
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

// --- PR Index (JSONL) ---

export function getPrIndexPath(): string {
  return path.join(dataDir(), "pr_index.jsonl");
}

export function appendPrIndex(entry: PrIndex): void {
  const filePath = getPrIndexPath();
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(entry) + "\n");
}

export function readPrIndex(): PrIndex[] {
  const filePath = getPrIndexPath();
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PrIndex);
}

export function writePrIndex(entries: PrIndex[]): void {
  const filePath = getPrIndexPath();
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
}

// --- PR Detail (JSON) ---

export function getPrDetailPath(prNumber: number): string {
  return path.join(dataDir(), "pr_detail", `${prNumber}.json`);
}

export function writePrDetail(detail: PrDetail): void {
  const filePath = getPrDetailPath(detail.number);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(detail, null, 2));
}

export function readPrDetail(prNumber: number): PrDetail | null {
  const filePath = getPrDetailPath(prNumber);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as PrDetail;
}

export function prDetailExists(prNumber: number): boolean {
  return fs.existsSync(getPrDetailPath(prNumber));
}

// --- PR Diff ---

export function getPrDiffPath(prNumber: number): string {
  return path.join(dataDir(), "pr_diff", `${prNumber}.diff`);
}

export function writePrDiff(prNumber: number, diff: string): void {
  const filePath = getPrDiffPath(prNumber);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, diff);
}

export function readPrDiff(prNumber: number): string | null {
  const filePath = getPrDiffPath(prNumber);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

export function prDiffExists(prNumber: number): boolean {
  return fs.existsSync(getPrDiffPath(prNumber));
}

// --- Fact Cards (JSON) ---

export function getFactCardPath(prNumber: number): string {
  return path.join(dataDir(), "fact_cards", `${prNumber}.json`);
}

export function writeFactCard(prNumber: number, card: unknown): void {
  const filePath = getFactCardPath(prNumber);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(card, null, 2));
}

export function readFactCard(prNumber: number): unknown | null {
  const filePath = getFactCardPath(prNumber);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function factCardExists(prNumber: number): boolean {
  return fs.existsSync(getFactCardPath(prNumber));
}

export function readAllFactCards(): { prNumber: number; card: unknown }[] {
  const dir = path.join(dataDir(), "fact_cards");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      prNumber: parseInt(path.basename(f, ".json"), 10),
      card: JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")),
    }));
}

// --- Narratives (JSON) ---

export function getNarrativePath(type: "star" | "care"): string {
  return path.join(dataDir(), "narratives", `${type}.json`);
}

export function writeNarrative(type: "star" | "care", data: unknown): void {
  const filePath = getNarrativePath(type);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function readNarrative(type: "star" | "care"): unknown | null {
  const filePath = getNarrativePath(type);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
