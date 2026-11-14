export interface StoredSelection {
  anchor: number;
  head: number;
}

export interface StoredViewState {
  selections: StoredSelection[];
  primaryIndex: number;
  scrollTop: number;
  scrollAnchor?: number;
}

export function normalizeViewState(
  state: StoredViewState,
  documentLength: number
): StoredViewState {
  const selections = state.selections
    .filter(
      (selection) =>
        Number.isSafeInteger(selection.anchor) &&
        Number.isSafeInteger(selection.head) &&
        selection.anchor >= 0 &&
        selection.head >= 0
    )
    .map((selection) => ({
      anchor: Math.min(selection.anchor, documentLength),
      head: Math.min(selection.head, documentLength)
    }));

  if (selections.length === 0) {
    selections.push({ anchor: 0, head: 0 });
  }

  return {
    selections,
    primaryIndex: Math.min(Math.max(0, state.primaryIndex), selections.length - 1),
    scrollTop: Number.isFinite(state.scrollTop) ? Math.max(0, state.scrollTop) : 0,
    scrollAnchor:
      Number.isSafeInteger(state.scrollAnchor) && state.scrollAnchor! >= 0
        ? Math.min(state.scrollAnchor!, documentLength)
        : 0
  };
}
