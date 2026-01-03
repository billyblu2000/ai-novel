"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Entity, EntityType, ApiResult, Mention } from "@/types";

// ============ API Functions ============

async function fetchEntities(projectId: string): Promise<Entity[]> {
  const response = await fetch(`/api/projects/${projectId}/entities`);
  const result: ApiResult<Entity[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

interface CreateEntityInput {
  projectId: string;
  type: EntityType;
  name: string;
  aliases?: string[];
  description?: string;
  attributes?: Record<string, unknown>;
  avatar_url?: string | null;
}

async function createEntity(input: CreateEntityInput): Promise<Entity> {
  const { projectId, ...data } = input;
  const response = await fetch(`/api/projects/${projectId}/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result: ApiResult<Entity> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

interface UpdateEntityInput {
  entityId: string;
  type?: EntityType;
  name?: string;
  aliases?: string[];
  description?: string;
  attributes?: Record<string, unknown>;
  avatar_url?: string | null;
}

async function updateEntity(input: UpdateEntityInput): Promise<Entity> {
  const { entityId, ...data } = input;
  const response = await fetch(`/api/entities/${entityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result: ApiResult<Entity> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

async function deleteEntity(entityId: string): Promise<{ id: string }> {
  const response = await fetch(`/api/entities/${entityId}`, {
    method: "DELETE",
  });

  const result: ApiResult<{ id: string }> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

// ============ Hook ============

export function useEntities(projectId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["entities", projectId];

  // Query: Fetch all entities
  const query = useQuery({
    queryKey,
    queryFn: () => fetchEntities(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation: Create entity
  const createMutation = useMutation({
    mutationFn: createEntity,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEntities = queryClient.getQueryData<Entity[]>(queryKey);

      // Optimistic update
      const tempEntity: Entity = {
        id: `temp-${Date.now()}`,
        project_id: input.projectId,
        type: input.type,
        name: input.name,
        aliases: input.aliases || [],
        description: input.description || "",
        attributes: input.attributes || {},
        avatar_url: input.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Entity[]>(queryKey, (old) => [
        ...(old || []),
        tempEntity,
      ]);

      return { previousEntities, tempEntity };
    },
    onError: (err, _, context) => {
      if (context?.previousEntities) {
        queryClient.setQueryData(queryKey, context.previousEntities);
      }
      toast.error(`创建失败: ${err.message}`);
    },
    onSuccess: (newEntity, _, context) => {
      // Replace temp entity with real entity
      queryClient.setQueryData<Entity[]>(queryKey, (old) =>
        old?.map((e) => (e.id === context?.tempEntity.id ? newEntity : e)) || [
          newEntity,
        ]
      );
      toast.success("实体创建成功");
    },
  });

  // Mutation: Update entity
  const updateMutation = useMutation({
    mutationFn: updateEntity,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEntities = queryClient.getQueryData<Entity[]>(queryKey);

      // Optimistic update
      queryClient.setQueryData<Entity[]>(queryKey, (old) =>
        old?.map((e) => {
          if (e.id !== input.entityId) return e;
          const updated: Entity = { ...e, updated_at: new Date().toISOString() };
          if (input.type !== undefined) updated.type = input.type;
          if (input.name !== undefined) updated.name = input.name;
          if (input.aliases !== undefined) updated.aliases = input.aliases;
          if (input.description !== undefined)
            updated.description = input.description;
          if (input.attributes !== undefined)
            updated.attributes = input.attributes;
          if (input.avatar_url !== undefined)
            updated.avatar_url = input.avatar_url;
          return updated;
        })
      );

      return { previousEntities };
    },
    onError: (err, _, context) => {
      if (context?.previousEntities) {
        queryClient.setQueryData(queryKey, context.previousEntities);
      }
      toast.error(`更新失败: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("实体更新成功");
    },
  });

  // Mutation: Delete entity
  const deleteMutation = useMutation({
    mutationFn: deleteEntity,
    onMutate: async (entityId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEntities = queryClient.getQueryData<Entity[]>(queryKey);

      // Optimistic update
      queryClient.setQueryData<Entity[]>(queryKey, (old) =>
        old?.filter((e) => e.id !== entityId)
      );

      return { previousEntities };
    },
    onError: (err, _, context) => {
      if (context?.previousEntities) {
        queryClient.setQueryData(queryKey, context.previousEntities);
      }
      toast.error(`删除失败: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("实体删除成功");
    },
  });

  return {
    // Query state
    entities: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Mutations
    createEntity: createMutation.mutate,
    updateEntity: updateMutation.mutate,
    deleteEntity: deleteMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// ============ Mentions Hook ============

export interface MentionWithEntity extends Mention {
  entities: Pick<Entity, "id" | "name" | "type" | "aliases" | "description" | "avatar_url">;
}

async function fetchMentions(nodeId: string): Promise<MentionWithEntity[]> {
  const response = await fetch(`/api/nodes/${nodeId}/mentions`);
  const result: ApiResult<MentionWithEntity[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

interface UpdateMentionsInput {
  nodeId: string;
  mentions: { entity_id: string; frequency: number }[];
}

async function updateMentions(
  input: UpdateMentionsInput
): Promise<MentionWithEntity[]> {
  const { nodeId, mentions } = input;
  const response = await fetch(`/api/nodes/${nodeId}/mentions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mentions }),
  });

  const result: ApiResult<MentionWithEntity[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export function useMentions(nodeId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["mentions", nodeId];

  // Query: Fetch mentions for a node
  const query = useQuery({
    queryKey,
    queryFn: () => fetchMentions(nodeId!),
    enabled: !!nodeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation: Update mentions
  const updateMutation = useMutation({
    mutationFn: updateMentions,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    onError: (err) => {
      toast.error(`更新实体关联失败: ${err.message}`);
    },
  });

  return {
    // Query state
    mentions: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Mutations
    updateMentions: updateMutation.mutate,

    // Mutation states
    isUpdating: updateMutation.isPending,
  };
}

// ============ Utility Functions ============

/**
 * Group entities by type
 */
export function groupEntitiesByType(entities: Entity[]): Record<EntityType, Entity[]> {
  return entities.reduce(
    (groups, entity) => {
      groups[entity.type].push(entity);
      return groups;
    },
    {
      CHARACTER: [] as Entity[],
      LOCATION: [] as Entity[],
      ITEM: [] as Entity[],
    }
  );
}

/**
 * Get all searchable terms for an entity (name + aliases)
 */
export function getEntitySearchTerms(entity: Entity): string[] {
  return [entity.name, ...entity.aliases].filter(Boolean);
}

/**
 * Get all searchable terms for all entities
 */
export function getAllSearchTerms(
  entities: Entity[]
): Map<string, Entity> {
  const termMap = new Map<string, Entity>();

  entities.forEach((entity) => {
    getEntitySearchTerms(entity).forEach((term) => {
      // Use lowercase for case-insensitive matching
      termMap.set(term.toLowerCase(), entity);
    });
  });

  return termMap;
}

/**
 * Count entities by type
 */
export function countEntitiesByType(entities: Entity[]): Record<EntityType, number> {
  return entities.reduce(
    (counts, entity) => {
      counts[entity.type]++;
      return counts;
    },
    { CHARACTER: 0, LOCATION: 0, ITEM: 0 }
  );
}
