export const scrollToFirstError = (errors: any) => {
  if (!errors || Object.keys(errors).length === 0) return;

  // Flatten nested keys (e.g. from react-hook-form nested structures)
  const getKeys = (obj: any, prefix = ''): string[] => {
    return Object.keys(obj).reduce((acc: string[], k) => {
      const pre = prefix ? prefix + '.' : '';
      if (obj[k] && typeof obj[k] === 'object' && !obj[k].message) {
        acc.push(...getKeys(obj[k], pre + k));
      } else {
        acc.push(pre + k);
      }
      return acc;
    }, []);
  };
  const flatKeys = getKeys(errors);

  const elementsWithErrors = flatKeys
    .map(name => {
      let el = document.querySelector(`[name="${name}"]`) as HTMLElement;
      if (!el) {
        // Fallback: search by id
        el = document.getElementById(name) as HTMLElement;
      }
      return el;
    })
    .filter(Boolean) as HTMLElement[];

  if (elementsWithErrors.length === 0) return;

  // Sort elements by their DOM vertical offset on the page to find the first error
  elementsWithErrors.sort((a, b) => {
    return (a.getBoundingClientRect().top + window.scrollY) - (b.getBoundingClientRect().top + window.scrollY);
  });

  const firstErrorElement = elementsWithErrors[0];

  // Auto-expand any collapsed details, accordions, stepper, or tab sections
  let parent = firstErrorElement.parentElement;
  while (parent) {
    // 1. Details tag
    if (parent.tagName === 'DETAILS') {
      (parent as HTMLDetailsElement).open = true;
    }

    // 2. Tab/Stepper/Accordion trigger click:
    // If the section is marked hidden or has aria-expanded="false" inside, look for the trigger button
    const collapsedBtn = parent.querySelector('[aria-expanded="false"]');
    if (collapsedBtn) {
      (collapsedBtn as HTMLElement).click();
    }

    parent = parent.parentElement;
  }

  // Perform smooth scroll to the element. Offset by -120px to avoid fixed headers.
  const yOffset = -120;
  const y = firstErrorElement.getBoundingClientRect().top + window.scrollY + yOffset;

  window.scrollTo({ top: y, behavior: 'smooth' });

  // Focus the cursor inside the element
  setTimeout(() => {
    firstErrorElement.focus();
  }, 400);
};
