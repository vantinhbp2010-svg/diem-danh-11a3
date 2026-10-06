const KEY = "faces_11A3";

export function getFaces() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveFace(studentId, descriptor) {
  const data = getFaces();
  if (!data[studentId]) data[studentId] = [];
  data[studentId].push(Array.from(descriptor));
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearFaces(studentId) {
  const data = getFaces();
  delete data[studentId];
  localStorage.setItem(KEY, JSON.stringify(data));
}