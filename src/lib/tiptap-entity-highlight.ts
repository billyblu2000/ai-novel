import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Entity } from "@/types";
import { findEntityMatches, MatchResult } from "@/lib/entity-matcher";

export interface EntityHighlightOptions {
  entities: Entity[];
  ignoredEntities: string[];
  onEntityHover?: (entity: Entity | null, rect: DOMRect | null) => void;
  onEntityClick?: (entity: Entity, event: MouseEvent) => void;
  onEntityContextMenu?: (entity: Entity, event: MouseEvent) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    entityHighlight: {
      setEntities: (entities: Entity[]) => ReturnType;
      setIgnoredEntities: (ignored: string[]) => ReturnType;
    };
  }
}

const ENTITY_HIGHLIGHT_PLUGIN_KEY = new PluginKey("entityHighlight");

// Store entities and ignored entities in plugin state
interface PluginState {
  entities: Entity[];
  ignoredEntities: string[];
  decorations: DecorationSet;
}

export const EntityHighlight = Extension.create<EntityHighlightOptions>({
  name: "entityHighlight",

  addOptions() {
    return {
      entities: [],
      ignoredEntities: [],
      onEntityHover: undefined,
      onEntityClick: undefined,
      onEntityContextMenu: undefined,
    };
  },

  addCommands() {
    return {
      setEntities:
        (entities: Entity[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(ENTITY_HIGHLIGHT_PLUGIN_KEY, { type: "setEntities", entities });
          }
          return true;
        },
      setIgnoredEntities:
        (ignored: string[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(ENTITY_HIGHLIGHT_PLUGIN_KEY, { type: "setIgnoredEntities", ignored });
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: ENTITY_HIGHLIGHT_PLUGIN_KEY,

        state: {
          init: (_, state): PluginState => {
            const entities = extension.options.entities;
            const ignoredEntities = extension.options.ignoredEntities;
            const decorations = createDecorations(
              state.doc,
              entities,
              ignoredEntities
            );
            return { entities, ignoredEntities, decorations };
          },

          apply: (tr, pluginState, _, newState): PluginState => {
            const meta = tr.getMeta(ENTITY_HIGHLIGHT_PLUGIN_KEY);

            let entities = pluginState.entities;
            let ignoredEntities = pluginState.ignoredEntities;
            let needsUpdate = tr.docChanged;

            if (meta) {
              if (meta.type === "setEntities") {
                entities = meta.entities;
                needsUpdate = true;
              } else if (meta.type === "setIgnoredEntities") {
                ignoredEntities = meta.ignored;
                needsUpdate = true;
              }
            }

            if (needsUpdate) {
              const decorations = createDecorations(
                newState.doc,
                entities,
                ignoredEntities
              );
              return { entities, ignoredEntities, decorations };
            }

            return pluginState;
          },
        },

        props: {
          decorations: (state) => {
            const pluginState = ENTITY_HIGHLIGHT_PLUGIN_KEY.getState(state);
            return pluginState?.decorations || DecorationSet.empty;
          },

          handleDOMEvents: {
            mouseover: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains("entity-highlight")) {
                const entityId = target.dataset.entityId;
                const pluginState = ENTITY_HIGHLIGHT_PLUGIN_KEY.getState(view.state);
                const entity = pluginState?.entities.find((e: Entity) => e.id === entityId);
                if (entity && extension.options.onEntityHover) {
                  const rect = target.getBoundingClientRect();
                  extension.options.onEntityHover(entity, rect);
                }
              }
              return false;
            },

            mouseout: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains("entity-highlight")) {
                if (extension.options.onEntityHover) {
                  extension.options.onEntityHover(null, null);
                }
              }
              return false;
            },

            click: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains("entity-highlight")) {
                const entityId = target.dataset.entityId;
                const pluginState = ENTITY_HIGHLIGHT_PLUGIN_KEY.getState(view.state);
                const entity = pluginState?.entities.find((e: Entity) => e.id === entityId);
                if (entity && extension.options.onEntityClick) {
                  extension.options.onEntityClick(entity, event);
                }
              }
              return false;
            },

            contextmenu: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains("entity-highlight")) {
                const entityId = target.dataset.entityId;
                const pluginState = ENTITY_HIGHLIGHT_PLUGIN_KEY.getState(view.state);
                const entity = pluginState?.entities.find((e: Entity) => e.id === entityId);
                if (entity && extension.options.onEntityContextMenu) {
                  event.preventDefault();
                  extension.options.onEntityContextMenu(entity, event);
                }
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

/**
 * Create decorations for entity highlights
 */
function createDecorations(
  doc: import("@tiptap/pm/model").Node,
  entities: Entity[],
  ignoredEntities: string[]
): DecorationSet {
  if (!entities.length) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];

  // Traverse all text nodes
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const text = node.text;
    const matches = findEntityMatches(text, entities, ignoredEntities);

    matches.forEach((match: MatchResult) => {
      const from = pos + match.start;
      const to = pos + match.end;

      // Get entity type color
      const colorClass = getEntityColorClass(match.entityType);

      decorations.push(
        Decoration.inline(from, to, {
          class: `entity-highlight ${colorClass}`,
          "data-entity-id": match.entityId,
          "data-entity-name": match.entityName,
          "data-entity-type": match.entityType,
        })
      );
    });
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * Get CSS class for entity type
 */
function getEntityColorClass(type: Entity["type"]): string {
  switch (type) {
    case "CHARACTER":
      return "entity-character";
    case "LOCATION":
      return "entity-location";
    case "ITEM":
      return "entity-item";
    default:
      return "";
  }
}
