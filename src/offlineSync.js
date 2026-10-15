const OFFLINE_KEY = "offline_sync_queue";

export function readOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Không đọc queue offline:", error);
    return [];
  }
}

export function queueOfflineAction(action, payload) {
  try {
    const queue = readOfflineQueue();
    queue.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
    return true;
  } catch (error) {
    console.warn("Không ghi queue offline:", error);
    return false;
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_KEY);
  return true;
}

export async function syncOfflineQueue(syncHandler) {
  const queue = readOfflineQueue();
  if (!Array.isArray(queue) || queue.length === 0) return 0;

  if (typeof syncHandler !== "function") return queue.length;

  const remaining = [];
  for (const item of queue) {
    try {
      await syncHandler(item);
    } catch (error) {
      console.warn("Sync thất bại:", error);
      remaining.push(item);
    }
  }

  localStorage.setItem(OFFLINE_KEY, JSON.stringify(remaining));
  return remaining.length;
}
