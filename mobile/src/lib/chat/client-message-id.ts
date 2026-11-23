import { randomUUID } from "expo-crypto";

/**
 * The API uses this UUID to deduplicate retries and to replace optimistic
 * messages with the server-confirmed version.
 */
export const createClientMessageId = (): string => randomUUID();
