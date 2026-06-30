import argon2 from "argon2";

export const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  try {
    const valid = await argon2.verify(hash, password);
    return {
      valid,
      needsRehash: valid && argon2.needsRehash(hash, PASSWORD_HASH_OPTIONS),
    };
  } catch {
    return { valid: false, needsRehash: false };
  }
}
