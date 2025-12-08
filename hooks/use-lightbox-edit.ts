"use client";

import { useState, useCallback } from "react";

export interface LightboxEditState<T> {
  editing: boolean;
  editName: string;
  editRelationId: T;
  saving: boolean;
}

export interface LightboxEditActions<T> {
  startEditing: (name: string, relationId: T) => void;
  cancelEditing: () => void;
  setEditName: (name: string) => void;
  setEditRelationId: (id: T) => void;
  setSaving: (saving: boolean) => void;
}

/**
 * Shared hook for lightbox edit mode state management
 * Used by ItemsGallery (category editing) and OutfitsGallery (folder editing)
 */
export function useLightboxEdit<T = string | null>(
  initialRelationId: T
): [LightboxEditState<T>, LightboxEditActions<T>] {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRelationId, setEditRelationId] = useState<T>(initialRelationId);
  const [saving, setSaving] = useState(false);

  const startEditing = useCallback((name: string, relationId: T) => {
    setEditName(name);
    setEditRelationId(relationId);
    setEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditName("");
    setEditRelationId(initialRelationId);
  }, [initialRelationId]);

  const state: LightboxEditState<T> = {
    editing,
    editName,
    editRelationId,
    saving,
  };

  const actions: LightboxEditActions<T> = {
    startEditing,
    cancelEditing,
    setEditName,
    setEditRelationId,
    setSaving,
  };

  return [state, actions];
}
