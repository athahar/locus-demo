import { readFile } from 'fs/promises';

const cache = new Map();

async function loadFile(path) {
  if (!path) return null;
  if (cache.has(path)) {
    return cache.get(path);
  }
  try {
    const data = await readFile(path, 'utf-8');
    cache.set(path, data);
    return data;
  } catch (error) {
    console.warn(`[content] Failed to read ${path}:`, error.message);
    cache.set(path, null);
    return null;
  }
}

export async function loadPrompt(path) {
  return loadFile(path);
}

export async function loadExcerpt(path) {
  return loadFile(path);
}
