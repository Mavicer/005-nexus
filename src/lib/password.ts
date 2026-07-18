/**
 * 密码哈希（argon2id）
 * OWASP 首选，抗 GPU/ASIC 暴力破解；@node-rs/argon2（Rust 绑定，性能好）
 */
import { hash, verify } from "@node-rs/argon2";

// Argon2id（const enum 在 isolatedModules 下不可用，用数值字面量）
// Algorithm: Argon2d=0, Argon2i=1, Argon2id=2
const ALGORITHM_ARGON2ID = 2;

const OPTIONS = {
  algorithm: ALGORITHM_ARGON2ID,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export function verifyPassword(
  hashed: string,
  password: string,
): Promise<boolean> {
  return verify(hashed, password);
}

/** 密码强度最低要求：长度 ≥ 8 */
export function isPasswordValid(password: string): boolean {
  return password.length >= 8;
}

/** 邮箱格式校验（简单 RFC 近似） */
export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
