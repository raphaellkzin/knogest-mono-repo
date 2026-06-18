import argon2 from "argon2";

export const createSaltHash = async (pass: string) => {
  return await argon2.hash(pass);
};

export const verifySaltHash = async ({
  hashed,
  value,
}: {
  hashed: string;
  value: string;
}) => {
  return await argon2.verify(hashed, value);
};

export const timeSleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
