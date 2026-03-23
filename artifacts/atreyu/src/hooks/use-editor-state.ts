import { useReducer, useCallback } from "react";
import type {
  EditorState,
  EditorAction,
  AnyEditorElement,
} from "@/types/content-editor";

const MAX_HISTORY = 50;

function pushHistory(state: EditorState): EditorState {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(structuredClone(state.elements));
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return { ...state, history: newHistory, historyIndex: newHistory.length - 1 };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_ELEMENTS": {
      const next = pushHistory(state);
      return { ...next, elements: action.elements };
    }

    case "ADD_ELEMENT": {
      const next = pushHistory(state);
      return { ...next, elements: [...next.elements, action.element] };
    }

    case "UPDATE_ELEMENT": {
      const next = pushHistory(state);
      return {
        ...next,
        elements: next.elements.map((el) =>
          el.id === action.id ? { ...el, ...action.props } as AnyEditorElement : el
        ),
      };
    }

    case "REMOVE_ELEMENT": {
      const next = pushHistory(state);
      return {
        ...next,
        elements: next.elements.filter((el) => el.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    }

    case "SELECT":
      return { ...state, selectedId: action.id };

    case "SET_BACKGROUND_IMAGE":
      return { ...state, backgroundImage: action.url };

    case "SET_BACKGROUND_COLOR":
      return { ...state, backgroundColor: action.color };

    case "REORDER": {
      const next = pushHistory(state);
      const sorted = [...next.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((el) => el.id === action.id);
      if (idx === -1) return next;

      let newZ: number;
      switch (action.direction) {
        case "up":
          newZ = idx < sorted.length - 1 ? sorted[idx + 1].zIndex + 1 : sorted[idx].zIndex;
          break;
        case "down":
          newZ = idx > 0 ? sorted[idx - 1].zIndex - 1 : sorted[idx].zIndex;
          break;
        case "top":
          newZ = Math.max(...sorted.map((e) => e.zIndex)) + 1;
          break;
        case "bottom":
          newZ = Math.min(...sorted.map((e) => e.zIndex)) - 1;
          break;
      }

      return {
        ...next,
        elements: next.elements.map((el) =>
          el.id === action.id ? { ...el, zIndex: newZ } : el
        ),
      };
    }

    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        elements: structuredClone(state.history[newIndex]),
        historyIndex: newIndex,
      };
    }

    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        elements: structuredClone(state.history[newIndex]),
        historyIndex: newIndex,
      };
    }

    default:
      return state;
  }
}

export function useEditorState(
  canvasWidth: number,
  canvasHeight: number,
  initialElements: AnyEditorElement[] = [],
  initialBgImage: string | null = null,
  initialBgColor: string = "#E8ECF4",
) {
  const initialState: EditorState = {
    canvasWidth,
    canvasHeight,
    backgroundImage: initialBgImage,
    backgroundColor: initialBgColor,
    elements: initialElements,
    selectedId: null,
    history: [structuredClone(initialElements)],
    historyIndex: 0,
  };

  const [state, dispatch] = useReducer(editorReducer, initialState);

  const addElement = useCallback(
    (el: AnyEditorElement) => dispatch({ type: "ADD_ELEMENT", element: el }),
    [],
  );

  const updateElement = useCallback(
    (id: string, props: Partial<AnyEditorElement>) =>
      dispatch({ type: "UPDATE_ELEMENT", id, props }),
    [],
  );

  const removeElement = useCallback(
    (id: string) => dispatch({ type: "REMOVE_ELEMENT", id }),
    [],
  );

  const select = useCallback(
    (id: string | null) => dispatch({ type: "SELECT", id }),
    [],
  );

  const setBackgroundImage = useCallback(
    (url: string | null) => dispatch({ type: "SET_BACKGROUND_IMAGE", url }),
    [],
  );

  const setBackgroundColor = useCallback(
    (color: string) => dispatch({ type: "SET_BACKGROUND_COLOR", color }),
    [],
  );

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const selectedElement = state.selectedId
    ? state.elements.find((el) => el.id === state.selectedId) ?? null
    : null;

  return {
    state,
    dispatch,
    addElement,
    updateElement,
    removeElement,
    select,
    setBackgroundImage,
    setBackgroundColor,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedElement,
  };
}
