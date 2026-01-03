import { Entity } from "@/types";

export interface MatchResult {
  start: number;
  end: number;
  text: string;
  entityId: string;
  entityName: string;
  entityType: Entity["type"];
}

/**
 * Simple Aho-Corasick implementation for entity matching
 * Uses a trie-based approach for efficient multi-pattern matching
 */
class AhoCorasickMatcher {
  private patterns: Map<string, Entity> = new Map();
  private sortedPatterns: string[] = [];

  constructor(entities: Entity[]) {
    // Build pattern map from entities (name + aliases)
    entities.forEach((entity) => {
      const terms = [entity.name, ...entity.aliases].filter(Boolean);
      terms.forEach((term) => {
        // Use lowercase for case-insensitive matching
        const lowerTerm = term.toLowerCase();
        // Only keep the first entity if there are duplicates
        if (!this.patterns.has(lowerTerm)) {
          this.patterns.set(lowerTerm, entity);
        }
      });
    });

    // Sort patterns by length (longest first) to handle overlapping matches
    this.sortedPatterns = Array.from(this.patterns.keys()).sort(
      (a, b) => b.length - a.length
    );
  }

  /**
   * Find all entity matches in the given text
   */
  match(text: string, ignoredEntities: string[] = []): MatchResult[] {
    if (!text || this.sortedPatterns.length === 0) {
      return [];
    }

    const results: MatchResult[] = [];
    const lowerText = text.toLowerCase();
    const ignoredSet = new Set(ignoredEntities.map((e) => e.toLowerCase()));

    // Track covered ranges to avoid overlapping matches
    const coveredRanges: { start: number; end: number }[] = [];

    for (const pattern of this.sortedPatterns) {
      // Skip if this entity is ignored
      const entity = this.patterns.get(pattern)!;
      if (ignoredSet.has(entity.name.toLowerCase())) {
        continue;
      }

      let searchStart = 0;
      while (searchStart < lowerText.length) {
        const index = lowerText.indexOf(pattern, searchStart);
        if (index === -1) break;

        const matchEnd = index + pattern.length;

        // Check if this range overlaps with any existing match
        const overlaps = coveredRanges.some(
          (range) =>
            (index >= range.start && index < range.end) ||
            (matchEnd > range.start && matchEnd <= range.end) ||
            (index <= range.start && matchEnd >= range.end)
        );

        if (!overlaps) {
          // Check word boundaries (optional - for better matching)
          const isWordStart =
            index === 0 || !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(lowerText[index - 1]);
          const isWordEnd =
            matchEnd === lowerText.length ||
            !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(lowerText[matchEnd]);

          // For Chinese, we don't need strict word boundaries
          const isChinese = /[\u4e00-\u9fa5]/.test(pattern);
          const validMatch = isChinese || (isWordStart && isWordEnd);

          if (validMatch) {
            results.push({
              start: index,
              end: matchEnd,
              text: text.substring(index, matchEnd),
              entityId: entity.id,
              entityName: entity.name,
              entityType: entity.type,
            });
            coveredRanges.push({ start: index, end: matchEnd });
          }
        }

        searchStart = index + 1;
      }
    }

    // Sort results by position
    return results.sort((a, b) => a.start - b.start);
  }
}

// Cache the matcher instance
let cachedMatcher: AhoCorasickMatcher | null = null;
let cachedEntitiesHash = "";

/**
 * Create a hash of entities for cache invalidation
 */
function createEntitiesHash(entities: Entity[]): string {
  return entities
    .map((e) => `${e.id}:${e.name}:${e.aliases.join(",")}`)
    .sort()
    .join("|");
}

/**
 * Get or create a matcher for the given entities
 */
export function getMatcher(entities: Entity[]): AhoCorasickMatcher {
  const hash = createEntitiesHash(entities);
  if (cachedMatcher && cachedEntitiesHash === hash) {
    return cachedMatcher;
  }

  cachedMatcher = new AhoCorasickMatcher(entities);
  cachedEntitiesHash = hash;
  return cachedMatcher;
}

/**
 * Find entity matches in text
 */
export function findEntityMatches(
  text: string,
  entities: Entity[],
  ignoredEntities: string[] = []
): MatchResult[] {
  const matcher = getMatcher(entities);
  return matcher.match(text, ignoredEntities);
}

/**
 * Count entity frequencies in text
 */
export function countEntityFrequencies(
  text: string,
  entities: Entity[],
  ignoredEntities: string[] = []
): Map<string, number> {
  const matches = findEntityMatches(text, entities, ignoredEntities);
  const frequencies = new Map<string, number>();

  matches.forEach((match) => {
    const count = frequencies.get(match.entityId) || 0;
    frequencies.set(match.entityId, count + 1);
  });

  return frequencies;
}
