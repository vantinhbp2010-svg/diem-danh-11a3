function taoIdToast() {
  return `${Date.now()}-${Math.random()}`;
}

function guiToast(message, type, duration, id = taoIdToast()) {
  window.dispatchEvent(
    new CustomEvent("app:toast", {
      detail: { id, message, type, duration },
    })
  );
  return id;
}

export function showSuccess(message) {
  return guiToast(message, "success", 3000);
}

export function showError(message) {
  return guiToast(message, "error", 5000);
}

export function showWarning(message) {
  return guiToast(message, "warning", 4000);
}

export function showInfo(message) {
  return guiToast(message, "info", 4000);
}

export function showLoading(message) {
  return guiToast(message, "loading", 0);
}

export function updateToast(id, message, type = "success", duration) {
  const thoiGian = duration ?? (type === "error" ? 5000 : 3000);
  return guiToast(message, type, thoiGian, id);
}

export function confirmToast(messageOrOptions, additionalOptions = {}) {
  const message =
    typeof messageOrOptions === "string"
      ? messageOrOptions
      : messageOrOptions?.message;
  const options =
    typeof messageOrOptions === "string"
      ? additionalOptions
      : { ...messageOrOptions, ...additionalOptions };
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("app:confirm", {
        detail: { message, options, resolve },
      })
    );
  });
}
