// Open a base64 data-URL (e.g. a certificate PDF) in a new browser tab.
// Converting to a Blob URL avoids browsers blocking direct data: navigation.
export const openDataUrl = (dataUrl: string) => {
  try {
    const [meta, b64] = dataUrl.split(",");
    const mime = (meta.match(/:(.*?);/) || [])[1] || "application/pdf";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const blob = new Blob([arr], { type: mime });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    window.open(dataUrl, "_blank");
  }
};
