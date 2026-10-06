import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

const PIN_HASH_KEY = 'fh-app-lock-pin-hash';
const PIN_SALT_KEY = 'fh-app-lock-pin-salt';
const BIOMETRIC_KEY = 'fh-app-lock-biometric';
const CREDENTIAL_ID_KEY = 'fh-app-lock-credential-id';

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64(new Uint8Array(digest));
}

export async function hashPin(pin: string, salt?: string) {
  const actualSalt = salt ?? bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await sha256(`${actualSalt}:${pin}`);
  return { hash, salt: actualSalt };
}

export async function setAppPin(pin: string) {
  const { hash, salt } = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, hash);
  localStorage.setItem(PIN_SALT_KEY, salt);
}

export function hasAppPin() {
  return Boolean(localStorage.getItem(PIN_HASH_KEY) && localStorage.getItem(PIN_SALT_KEY));
}

export async function verifyAppPin(pin: string) {
  const hash = localStorage.getItem(PIN_HASH_KEY);
  const salt = localStorage.getItem(PIN_SALT_KEY);
  if (!hash || !salt) return false;
  const calculated = await hashPin(pin, salt);
  return calculated.hash === hash;
}

export function removeAppPin() {
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
}

export function isNativeBiometricPlatform() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

export function isBiometricSupported() {
  if (isNativeBiometricPlatform()) return true;
  return typeof window !== 'undefined'
    && window.isSecureContext
    && typeof window.PublicKeyCredential !== 'undefined'
    && typeof navigator.credentials?.create === 'function'
    && typeof navigator.credentials?.get === 'function';
}

export function hasBiometricLock() {
  return localStorage.getItem(BIOMETRIC_KEY) === 'true';
}

async function registerWebBiometric() {
  if (typeof window === 'undefined' || !window.isSecureContext || typeof window.PublicKeyCredential === 'undefined') {
    throw new Error('Fingerprint/biometric lock साठी HTTPS किंवा localhost आवश्यक आहे.');
  }
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'VyaparOS' },
      user: { id: userId, name: 'vyaparos-local-user', displayName: 'VyaparOS User' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
      attestation: 'none',
    },
  });
  if (!(credential instanceof PublicKeyCredential)) throw new Error('Biometric credential तयार करता आले नाही.');
  localStorage.setItem(CREDENTIAL_ID_KEY, bytesToBase64(new Uint8Array(credential.rawId)));
}

export async function registerBiometric() {
  if (isNativeBiometricPlatform()) {
    const result = await NativeBiometric.isAvailable({ useFallback: false });
    if (!result.isAvailable) throw new Error('या Android डिव्हाइसवर biometric authentication उपलब्ध नाही.');
    await NativeBiometric.verifyIdentity({
      reason: 'VyaparOS App Lock सुरू करण्यासाठी ओळख सत्यापित करा',
      title: 'VyaparOS Fingerprint Lock',
      subtitle: 'तुमची ओळख सत्यापित करा',
      description: 'Fingerprint किंवा उपलब्ध device biometric वापरा.',
    });
    localStorage.setItem(BIOMETRIC_KEY, 'true');
    return;
  }
  if (!isBiometricSupported()) throw new Error('Fingerprint/biometric lock साठी HTTPS किंवा localhost आवश्यक आहे.');
  await registerWebBiometric();
  localStorage.setItem(BIOMETRIC_KEY, 'true');
}

export async function verifyBiometric() {
  if (!hasBiometricLock()) return false;
  if (isNativeBiometricPlatform()) {
    try {
      const result = await NativeBiometric.isAvailable({ useFallback: false });
      if (!result.isAvailable) return false;
      await NativeBiometric.verifyIdentity({
        reason: 'VyaparOS उघडण्यासाठी ओळख सत्यापित करा',
        title: 'VyaparOS App Lock',
        subtitle: 'तुमची ओळख सत्यापित करा',
        description: 'Fingerprint किंवा उपलब्ध device biometric वापरा.',
      });
      return true;
    } catch { return false; }
  }
  if (!isBiometricSupported()) return false;
  const storedId = localStorage.getItem(CREDENTIAL_ID_KEY);
  if (!storedId) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: base64ToBytes(storedId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return assertion instanceof PublicKeyCredential;
  } catch { return false; }
}

export function removeBiometric() {
  localStorage.removeItem(BIOMETRIC_KEY);
  localStorage.removeItem(CREDENTIAL_ID_KEY);
}
