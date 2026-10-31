export function migrateBrandStorage() {
  try {
    const storage = window.localStorage;
    const legacyPrefix = 'stepvolt.';

    for (const oldKey of Object.keys(storage)) {
      if (!oldKey.startsWith(legacyPrefix)) continue;

      const newKey = `vitalstep.${oldKey.slice(legacyPrefix.length)}`;
      if (storage.getItem(newKey) === null) {
        storage.setItem(newKey, storage.getItem(oldKey));
      }
      storage.removeItem(oldKey);
    }
  } catch (error) {
    console.warn('Não foi possível migrar as preferências para VitalStep:', error);
  }
}
