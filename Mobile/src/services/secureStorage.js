import * as SecureStore from "expo-secure-store";

let _isAvailable;

async function isSecureStoreAvailable() {
  if (_isAvailable !== undefined) return _isAvailable;
  try {
    _isAvailable = await SecureStore.isAvailableAsync();
  } catch {
    _isAvailable = false;
  }
  return _isAvailable;
}

export async function secureGet(key) {
  if (!(await isSecureStoreAvailable())) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSet(key, value) {
  if (!(await isSecureStoreAvailable())) return false;
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function secureDelete(key) {
  if (!(await isSecureStoreAvailable())) return false;
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch {
    return false;
  }
}

