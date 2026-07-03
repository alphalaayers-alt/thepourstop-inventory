import type { PourSizePrice, SellableItem } from "@/types/inventory";

export const DEFAULT_PEG_ML = 30;

/** Standard bar combo peg counts (30ml per peg) */
export const STANDARD_COMBO_PEG_COUNTS = [6, 12, 25] as const;

const CUSTOM_COMBO_PEG_COUNTS = [4, 5, 8, 10, 15, 20, 30];

export interface PourBillingOption {
  key: string;
  optionId?: string;
  ml: number;
  pours: number;
  totalMl: number;
  price: number;
  label: string;
  isCombo: boolean;
}

export function createPourComboId(): string {
  return crypto.randomUUID();
}

export function nextDefaultComboPours(combos: PourSizePrice[]): number {
  const used = new Set(combos.map((c) => c.pours ?? 6));
  for (const pours of STANDARD_COMBO_PEG_COUNTS) {
    if (!used.has(pours)) return pours;
  }
  return nextCustomComboPours(combos);
}

/** Next peg count for a custom combo (not 6 / 12 / 25 unless already used) */
export function nextCustomComboPours(combos: PourSizePrice[]): number {
  const used = new Set(combos.map((c) => c.pours ?? 6));
  for (const pours of CUSTOM_COMBO_PEG_COUNTS) {
    if (!used.has(pours)) return pours;
  }
  let pours = 2;
  while (used.has(pours)) pours += 1;
  return pours;
}

export function isStandardComboPeg(pours: number): boolean {
  return (STANDARD_COMBO_PEG_COUNTS as readonly number[]).includes(pours);
}

function normalizeSize(size: PourSizePrice): PourSizePrice {
  const pours = size.pours ?? 1;
  const isCombo = pours > 1 || Boolean(size.isCombo);
  return {
    ...size,
    pours,
    isCombo,
  };
}

function pourRowKey(size: PourSizePrice): string {
  const s = normalizeSize(size);
  if (isFullBottleSize(s) && s.id) return `full:${s.id}`;
  if (isComboSize(s) && s.id) return `id:${s.id}`;
  return `sig:${s.ml}x${s.pours}`;
}

/** Legacy rows without ids — keep one per ml×pours */
function dedupeLegacyCombos(combos: PourSizePrice[]): PourSizePrice[] {
  const withId = combos.filter((c) => c.id);
  const seen = new Set<string>();
  const legacy: PourSizePrice[] = [];

  for (const combo of combos.filter((c) => !c.id)) {
    const sig = `${combo.ml}x${combo.pours ?? 1}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    legacy.push(combo);
  }

  return [...withId, ...legacy];
}

function ensureComboIds(combos: PourSizePrice[]): PourSizePrice[] {
  return combos.map((combo) =>
    isComboSize(combo) && !combo.id ? { ...combo, id: createPourComboId() } : combo
  );
}

const LEGACY_AUTO_ML = new Set([60, 120, 250]);

export function isLegacyAutoMlSize(size: PourSizePrice): boolean {
  const s = normalizeSize(size);
  return !isComboSize(s) && LEGACY_AUTO_ML.has(s.ml);
}

export function isComboSize(size: PourSizePrice): boolean {
  const s = normalizeSize(size);
  if (s.isFullBottle) return false;
  return s.isCombo ?? false;
}

export function isFullBottleSize(size: PourSizePrice): boolean {
  return Boolean(normalizeSize(size).isFullBottle);
}

export function fullBottleLabel(ml: number): string {
  return `Full bottle (${ml}ml)`;
}

export function getItemPourSizes(
  item: Pick<SellableItem, "unitType" | "pourSizes" | "servingSizeMl"> & {
    sellPrice?: number;
  }
): PourSizePrice[] {
  if (item.unitType !== "pour") return [];
  if (item.pourSizes && item.pourSizes.length > 0) {
    return sanitizePourSizes(item.pourSizes);
  }
  if (item.servingSizeMl > 0 && item.sellPrice != null) {
    return [{ ml: item.servingSizeMl, price: item.sellPrice, pours: 1 }];
  }
  return [];
}

export function sanitizePourSizes(sizes: PourSizePrice[]): PourSizePrice[] {
  const { base30, fullBottles, custom, combos } = splitPourSizes(sizes);
  const hasCombos = combos.some((c) => c.price > 0);
  const cleanedCustom = hasCombos
    ? custom.filter((s) => !isLegacyAutoMlSize(s))
    : custom;
  const cleanedCombos = ensureComboIds(
    dedupeLegacyCombos(combos.filter((c) => c.price > 0))
  );
  return mergePourSizes(base30, cleanedCustom, cleanedCombos, fullBottles);
}

export function getBillingPourOptions(
  item: Pick<SellableItem, "unitType" | "pourSizes" | "servingSizeMl"> & {
    sellPrice?: number;
  }
): PourBillingOption[] {
  return getItemPourSizes(item)
    .filter((s) => s.price > 0)
    .map((s, index) => {
      const pours = s.pours ?? 1;
      const isCombo = s.isCombo ?? pours > 1;
      const totalMl = s.ml * pours;
      const isFullBottle = isFullBottleSize(s);
      return {
        optionId: s.id,
        key: s.id ? `${isFullBottle ? "full" : "combo"}-${s.id}` : `pour-${index}-${s.ml}x${pours}`,
        ml: s.ml,
        pours,
        totalMl,
        price: s.price,
        label:
          s.label ??
          (isFullBottle
            ? fullBottleLabel(totalMl)
            : isCombo
              ? `${pours}×${s.ml}ml Combo`
              : `${s.ml}ml`),
        isCombo,
      };
    });
}

export function findPourOption(
  item: Pick<SellableItem, "unitType" | "pourSizes" | "servingSizeMl"> & {
    sellPrice?: number;
  },
  match: number | { totalMl?: number; optionId?: string },
  preferCombo?: boolean
): PourBillingOption | undefined {
  const options = getBillingPourOptions(item);

  if (typeof match === "object" && match.optionId) {
    return options.find((o) => o.optionId === match.optionId);
  }

  const totalMl = typeof match === "number" ? match : match.totalMl;
  if (totalMl == null) return undefined;

  const matches = options.filter((o) => o.totalMl === totalMl);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  if (preferCombo != null) {
    return matches.find((o) => o.isCombo === preferCombo) ?? matches[0];
  }
  return matches.find((o) => !o.isCombo) ?? matches[0];
}

/** @deprecated use findPourOption */
export function getPourPrice(
  item: Pick<SellableItem, "unitType" | "pourSizes" | "servingSizeMl"> & {
    sellPrice?: number;
  },
  ml: number
): number | undefined {
  return findPourOption(item, ml)?.price ?? getItemPourSizes(item).find((p) => p.ml === ml)?.price;
}

export function getBasePegMl(
  item: Pick<SellableItem, "unitType" | "pourSizes" | "servingSizeMl"> & {
    sellPrice?: number;
  }
): number {
  if (item.unitType !== "pour") return 1;
  const sizes = getItemPourSizes(item);
  const base = sizes.find(isBase30ml) ?? sizes.find((s) => !isComboSize(s) && !isFullBottleSize(s));
  return base?.ml ?? DEFAULT_PEG_ML;
}

export function getMinPourMl(
  item: Pick<SellableItem, "unitType" | "pourSizes" | "servingSizeMl"> & {
    sellPrice?: number;
  }
): number {
  if (item.unitType !== "pour") return 1;
  const options = getBillingPourOptions(item);
  if (options.length > 0) {
    return Math.min(...options.map((o) => o.totalMl));
  }
  return item.servingSizeMl || DEFAULT_PEG_ML;
}

export function defaultPourSizes(): PourSizePrice[] {
  return [{ ml: DEFAULT_PEG_ML, price: 0, pours: 1 }];
}

/** @deprecated use defaultPourSizes */
export const emptyPourSizeRows = defaultPourSizes;

function sortPourSizes(sizes: PourSizePrice[]): PourSizePrice[] {
  return [...sizes].sort((a, b) => {
    const aTotal = a.ml * (a.pours ?? 1);
    const bTotal = b.ml * (b.pours ?? 1);
    if (a.isCombo !== b.isCombo) return a.isCombo ? 1 : -1;
    return aTotal - bTotal;
  });
}

/** Merge pour rows in the editor — keeps draft combos, preserves row order */
export function mergePourSizes(
  base30: PourSizePrice,
  custom: PourSizePrice[],
  combos: PourSizePrice[],
  fullBottles: PourSizePrice[] = []
): PourSizePrice[] {
  const rows: PourSizePrice[] = [];
  const indexByKey = new Map<string, number>();

  const fullBottleRows = fullBottles.map((fullBottle) => ({
    ...fullBottle,
    pours: 1,
    isCombo: false,
    isFullBottle: true,
    id: fullBottle.id ?? createPourComboId(),
    label:
      fullBottle.ml > 0
        ? fullBottle.label ?? fullBottleLabel(fullBottle.ml)
        : fullBottle.label ?? "",
  }));

  for (const size of [base30, ...custom, ...combos, ...fullBottleRows]) {
    const normalized = normalizeSize(size);
    if (normalized.price < 0) continue;

    const isDraft =
      Boolean(normalized.id) &&
      (isFullBottleSize(normalized) ||
        isComboSize(normalized) ||
        (!isBase30ml(normalized) &&
          !isComboSize(normalized) &&
          !isFullBottleSize(normalized)));

    if (!isDraft) {
      if (normalized.ml <= 0 || (normalized.pours ?? 1) <= 0) continue;
    }
    const key = pourRowKey(normalized);
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      rows[existingIndex] = normalized;
    } else {
      indexByKey.set(key, rows.length);
      rows.push(normalized);
    }
  }

  return rows;
}

/** Assign ids to combos for stable editor rows */
export function ensureEditorPourSizes(sizes: PourSizePrice[]): PourSizePrice[] {
  const { base30, fullBottles, custom, combos } = splitPourSizes(sizes);
  const combosWithIds = combos.map((combo) => ({
    ...combo,
    id: combo.id ?? createPourComboId(),
  }));
  const bottlesWithIds = fullBottles.map((bottle) => ({
    ...bottle,
    id: bottle.id ?? createPourComboId(),
    isFullBottle: true,
    label:
      bottle.ml > 0 ? bottle.label ?? fullBottleLabel(bottle.ml) : bottle.label ?? "",
  }));
  const customWithIds = custom.map((row) => ({
    ...row,
    id: row.id ?? createPourComboId(),
  }));
  return mergePourSizes(base30, customWithIds, combosWithIds, bottlesWithIds);
}

export function comboPegTaken(
  combos: PourSizePrice[],
  pours: number,
  ml: number,
  excludeId?: string
): boolean {
  return combos.some(
    (combo) =>
      combo.id !== excludeId &&
      (combo.pours ?? 1) === pours &&
      (combo.ml ?? DEFAULT_PEG_ML) === ml
  );
}

/** Normalize pour rows for saving — drops empty combos */
export function normalizePourSizes(sizes: PourSizePrice[]): PourSizePrice[] {
  const { base30, fullBottles, custom, combos } = splitPourSizes(sizes);
  const pricedCombos = ensureComboIds(
    dedupeLegacyCombos(combos.filter((c) => c.price > 0))
  );
  const unique = new Map<string, PourSizePrice>();

  for (const size of [base30, ...custom, ...pricedCombos]) {
    const normalized = normalizeSize(size);
    if (normalized.ml <= 0 || normalized.price < 0 || (normalized.pours ?? 1) <= 0) {
      continue;
    }
    if (isComboSize(normalized) && normalized.price <= 0) {
      continue;
    }
    unique.set(pourRowKey(normalized), normalized);
  }

  for (const fullBottle of fullBottles) {
    if (fullBottle.ml <= 0 || fullBottle.price <= 0) continue;
    const normalized = {
      ...normalizeSize(fullBottle),
      pours: 1,
      isCombo: false,
      isFullBottle: true,
      id: fullBottle.id ?? createPourComboId(),
      label: fullBottle.label ?? fullBottleLabel(fullBottle.ml),
    };
    unique.set(pourRowKey(normalized), normalized);
  }

  return sortPourSizes([...unique.values()]);
}

export function isBase30ml(size: PourSizePrice): boolean {
  const s = normalizeSize(size);
  return !isComboSize(s) && s.ml === DEFAULT_PEG_ML && (s.pours ?? 1) === 1;
}

export function fullBottleMlTaken(
  fullBottles: PourSizePrice[],
  ml: number,
  excludeId?: string
): boolean {
  return fullBottles.some(
    (bottle) => bottle.id !== excludeId && bottle.ml === ml
  );
}

export function splitPourSizes(sizes: PourSizePrice[]) {
  const normalized = sizes.map(normalizeSize);
  const base30 =
    normalized.find(isBase30ml) ?? { ml: DEFAULT_PEG_ML, price: 0, pours: 1 };
  const fullBottles = normalized.filter(isFullBottleSize);
  const custom = normalized.filter(
    (s) => !isComboSize(s) && !isBase30ml(s) && !isFullBottleSize(s)
  );
  const combos = normalized.filter((s) => isComboSize(s));
  return { base30, fullBottles, custom, combos };
}

export function getMenuBottleSizeMl(
  sizes: PourSizePrice[],
  fallback?: number
): number | undefined {
  const { fullBottles } = splitPourSizes(sizes);
  const priced = fullBottles.filter((b) => b.price > 0);
  const primary = priced[0] ?? fullBottles[0];
  return primary?.ml ?? fallback;
}

export function getPrimaryPourOption(sizes: PourSizePrice[]): {
  totalMl: number;
  price: number;
} {
  const normalized = normalizePourSizes(sizes);
  const base =
    normalized.find(isBase30ml) ??
    normalized.find((s) => !s.isCombo && !isFullBottleSize(s)) ??
    normalized[0];
  const pours = base?.pours ?? 1;
  return {
    totalMl: (base?.ml ?? DEFAULT_PEG_ML) * pours,
    price: base?.price ?? 0,
  };
}

export function formatPourOptionLabel(option: PourBillingOption): string {
  return option.label;
}
