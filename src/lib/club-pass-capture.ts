interface ImageRestoreState {
  img: HTMLImageElement;
  src: string;
  visibility: string;
}

async function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function waitForImageReady(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
}

async function imageElementToDataUrl(img: HTMLImageElement): Promise<string | null> {
  await waitForImageReady(img);
  if (!img.naturalWidth) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function drawImageToDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      void imageElementToDataUrl(img).then(resolve);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function fetchImageDataUrl(url: string): Promise<string | null> {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url || null;
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (response.ok) return blobToDataUrl(await response.blob());
  } catch {
    /* try canvas fallback below */
  }
  return drawImageToDataUrl(url);
}

async function resolveImageDataUrl(img: HTMLImageElement): Promise<string | null> {
  const fromElement = await imageElementToDataUrl(img);
  if (fromElement) return fromElement;
  const url = img.currentSrc || img.src;
  if (!url) return null;
  return fetchImageDataUrl(url);
}

async function inlineImagesForCapture(root: HTMLElement): Promise<ImageRestoreState[]> {
  const restores: ImageRestoreState[] = [];
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map(async (img) => {
      const original = img.currentSrc || img.src;
      if (!original || original.startsWith("data:")) return;
      const dataUrl = await resolveImageDataUrl(img);
      restores.push({ img, src: original, visibility: img.style.visibility });
      if (dataUrl) {
        img.src = dataUrl;
        await img.decode().catch(() => undefined);
      } else {
        img.style.visibility = "hidden";
      }
    }),
  );
  return restores;
}

function restoreInlinedImages(restores: ImageRestoreState[]) {
  for (const { img, src, visibility } of restores) {
    img.src = src;
    img.style.visibility = visibility;
  }
}

function prepareCloneForCapture(clone: HTMLElement) {
  clone.style.overflow = "visible";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";

  clone.querySelectorAll<HTMLElement>("[data-club-pass-decoration]").forEach((node) => {
    node.style.display = "none";
  });

  const header = clone.querySelector<HTMLElement>("[data-club-pass-header]");
  if (header) {
    header.style.overflow = "visible";
    header.style.paddingTop = "16px";
    header.style.paddingBottom = "16px";
  }

  clone.querySelectorAll<HTMLElement>("[data-club-pass-header-line]").forEach((line) => {
    const lineHeight = line.dataset.lineHeight || "20";
    line.style.display = "block";
    line.style.overflow = "visible";
    line.style.overflowX = "hidden";
    line.style.lineHeight = `${lineHeight}px`;
    line.style.paddingTop = "3px";
    line.style.paddingBottom = "3px";
  });
}

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export async function captureClubPassAsPng(
  element: HTMLElement,
  backgroundColor: string,
): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const restores = await inlineImagesForCapture(element);

  const prevOverflow = element.style.overflow;
  const prevHeight = element.style.height;
  element.style.overflow = "visible";
  element.style.height = "auto";

  await waitForLayout();

  try {
    const canvas = await html2canvas(element, {
      backgroundColor,
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 15000,
      onclone: (_doc, clone) => {
        const target = clone.querySelector("[data-club-pass-root]");
        if (target instanceof HTMLElement) {
          prepareCloneForCapture(target);
        }
      },
    });

    try {
      return canvas.toDataURL("image/png");
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Pass image could not be encoded. Check photo and logo URLs.",
      );
    }
  } finally {
    element.style.overflow = prevOverflow;
    element.style.height = prevHeight;
    restoreInlinedImages(restores);
  }
}
