const createFallbackUuid = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const randomValue = Math.floor(Math.random() * 16);
      const value =
        character === "x" ? randomValue : (randomValue & 0x3) | 0x8;

      return value.toString(16);
    },
  );

export const createClientMessageId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return createFallbackUuid();
};
