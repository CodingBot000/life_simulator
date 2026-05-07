export type PriorityLocale = "ko" | "en";
export type PriorityGroup = string;
export type PriorityId = string;

export type PriorityLabels = Record<PriorityLocale, string>;

export interface PriorityGroupOption {
  id: PriorityGroup;
  labels: PriorityLabels;
}

export interface PriorityDefinition {
  id: PriorityId;
  group: PriorityGroup;
  labels: PriorityLabels;
}

export interface PriorityCatalog {
  maxSelections: number;
  groups: PriorityGroupOption[];
  definitions: PriorityDefinition[];
  categoryGroups: Record<string, PriorityGroup[]>;
}

export const FALLBACK_MAX_PRIORITY_SELECTIONS = 3;

function priorityMap(catalog: PriorityCatalog) {
  return new Map(catalog.definitions.map((definition) => [definition.id, definition]));
}

function groupMap(catalog: PriorityCatalog) {
  return new Map(catalog.groups.map((group) => [group.id, group]));
}

function localizedLabel(
  labels: Partial<PriorityLabels> | undefined,
  locale: PriorityLocale,
  fallback: string,
) {
  return labels?.[locale]?.trim() || labels?.ko?.trim() || labels?.en?.trim() || fallback;
}

export function isPriorityId(
  value: string,
  catalog: PriorityCatalog | null | undefined,
): value is PriorityId {
  return Boolean(catalog && priorityMap(catalog).has(value));
}

export function listPriorityDefinitionsByGroup(
  catalog: PriorityCatalog,
  group: PriorityGroup,
): PriorityDefinition[] {
  return catalog.definitions.filter((definition) => definition.group === group);
}

export function listPriorityGroupsForCategory(
  catalog: PriorityCatalog,
  category: string | null | undefined,
): PriorityGroupOption[] {
  const groupsById = groupMap(catalog);
  const preferredGroupIds = category ? catalog.categoryGroups[category] ?? [] : [];
  const orderedGroupIds = [
    ...preferredGroupIds,
    ...catalog.groups.map((group) => group.id),
  ];
  const seen = new Set<PriorityGroup>();

  return orderedGroupIds
    .filter((groupId) => {
      if (seen.has(groupId) || !groupsById.has(groupId)) {
        return false;
      }

      seen.add(groupId);
      return true;
    })
    .map((groupId) => groupsById.get(groupId))
    .filter((group): group is PriorityGroupOption => Boolean(group));
}

export function normalizePriorityIds(
  values: readonly string[],
  catalog: PriorityCatalog | null | undefined,
): PriorityId[] {
  const seen = new Set<PriorityId>();
  const normalized: PriorityId[] = [];
  const knownPriorities = catalog ? priorityMap(catalog) : null;
  const maxSelections = catalog?.maxSelections ?? FALLBACK_MAX_PRIORITY_SELECTIONS;

  for (const raw of values) {
    const value = raw.trim();

    if (!value || seen.has(value)) {
      continue;
    }

    if (knownPriorities && !knownPriorities.has(value)) {
      continue;
    }

    seen.add(value);
    normalized.push(value);

    if (normalized.length >= maxSelections) {
      break;
    }
  }

  return normalized;
}

function humanizePriorityId(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getPriorityLabel(
  value: string,
  locale: PriorityLocale,
  catalog: PriorityCatalog | null | undefined,
): string {
  if (!catalog) {
    return humanizePriorityId(value);
  }

  const definition = priorityMap(catalog).get(value);
  return definition ? localizedLabel(definition.labels, locale, value) : humanizePriorityId(value);
}

export function getPriorityGroupLabel(
  group: PriorityGroupOption,
  locale: PriorityLocale,
): string {
  return localizedLabel(group.labels, locale, group.id);
}

export function normalizePriorityLocale(
  value: string | null | undefined,
): PriorityLocale {
  return value?.toLowerCase().startsWith("en") ? "en" : "ko";
}
