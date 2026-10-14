import { useEffect, useRef, useLayoutEffect } from 'react';

export const useFocusRetention = () => {
  const activeElementRef = useRef<{
    element: HTMLElement | null;
    name: string | null;
    id: string | null;
    selectionStart: number | null;
    selectionEnd: number | null;
  }>({
    element: null,
    name: null,
    id: null,
    selectionStart: null,
    selectionEnd: null,
  });

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        let start: number | null = null;
        let end: number | null = null;
        
        try {
          if ('selectionStart' in target && ['text', 'search', 'url', 'tel', 'password'].includes((target as any).type || '')) {
            start = (target as HTMLInputElement).selectionStart;
            end = (target as HTMLInputElement).selectionEnd;
          }
        } catch {
          // Fail silent for unsupported input types
        }

        activeElementRef.current = {
          element: target,
          name: target.getAttribute('name'),
          id: target.getAttribute('id'),
          selectionStart: start,
          selectionEnd: end,
        };
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        let start: number | null = null;
        let end: number | null = null;

        try {
          if ('selectionStart' in target && ['text', 'search', 'url', 'tel', 'password'].includes(target.type || '')) {
            start = target.selectionStart;
            end = target.selectionEnd;
          }
        } catch {
          // Fail silent for unsupported input types
        }

        activeElementRef.current.selectionStart = start;
        activeElementRef.current.selectionEnd = end;
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('input', handleInput, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('input', handleInput, true);
    };
  }, []);

  useLayoutEffect(() => {
    // If the user has already focused a valid input/textarea/select element, do not steal focus.
    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'SELECT')
    ) {
      return;
    }

    const { element, name, id, selectionStart, selectionEnd } = activeElementRef.current;
    if (!name && !id) return;

    // Check if the previously focused element has been unmounted/removed from the DOM
    const wasUnmounted = element ? !document.body.contains(element) : true;

    // If it was not unmounted, check if it is still the active element.
    // If the focus has shifted to something else (like a button, select, or body) while the input is still in the DOM,
    // we should respect the user action and NOT steal focus back.
    if (!wasUnmounted) {
      if (document.activeElement !== element) {
        return;
      }
    }

    // Find the new/re-created element in the DOM
    let newElement: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null = null;
    if (name) {
      newElement = document.querySelector(`[name="${name}"]`) as any;
    }
    if (!newElement && id) {
      newElement = document.getElementById(id) as any;
    }

    if (newElement) {
      if (document.activeElement !== newElement) {
        newElement.focus();
        if (
          (newElement.tagName === 'INPUT' || newElement.tagName === 'TEXTAREA') &&
          selectionStart !== null &&
          selectionEnd !== null
        ) {
          try {
            const inputEl = newElement as HTMLInputElement;
            if (['text', 'search', 'url', 'tel', 'password'].includes(inputEl.type || '')) {
              inputEl.setSelectionRange(selectionStart, selectionEnd);
            }
          } catch {
            // Fail silent for unsupported input types
          }
        }
      }
      // Keep reference to the newly-focused node in case it gets unmounted in a future render
      activeElementRef.current.element = newElement;
    }
  });
};

export default useFocusRetention;
