// File System Access API helpers.
// Works on Chromium browsers when served from localhost (or installed PWA).

async function verifyPermission(handle, readWrite = false) {
  const opts = { mode: readWrite ? "readwrite" : "read" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

export async function pickRepoDir() {
  if (!window.showDirectoryPicker) {
    throw new Error("File System Access API not available in this browser.");
  }
  const dir = await window.showDirectoryPicker({ mode: "readwrite" });
  const ok = await verifyPermission(dir, true);
  if (!ok) throw new Error("No permission to access selected folder.");
  return dir;
}

export async function getSubdir(rootDirHandle, pathParts, create = false) {
  let cur = rootDirHandle;
  for (const part of pathParts) {
    cur = await cur.getDirectoryHandle(part, { create });
  }
  return cur;
}

export async function listFilenames(dirHandle, { suffix = "" } = {}) {
  const out = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind !== "file") continue;
    if (suffix && !name.endsWith(suffix)) continue;
    out.push(name);
  }
  out.sort();
  return out;
}

export async function readTextFile(dirHandle, filename) {
  const h = await dirHandle.getFileHandle(filename);
  const f = await h.getFile();
  return await f.text();
}

export async function writeTextFile(dirHandle, filename, content) {
  const h = await dirHandle.getFileHandle(filename, { create: true });
  const w = await h.createWritable();
  await w.write(content);
  await w.close();
}

export async function readJsonFile(dirHandle, filename) {
  return JSON.parse(await readTextFile(dirHandle, filename));
}

export async function writeJsonFile(dirHandle, filename, obj) {
  const content = JSON.stringify(obj, null, 2) + "\n";
  await writeTextFile(dirHandle, filename, content);
}

