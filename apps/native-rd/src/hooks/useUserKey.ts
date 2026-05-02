/**
 * useUserKey
 *
 * Ensures an Ed25519 keypair exists for the current user/device.
 * On first mount (when UserSettings has no keyId), generates a keypair
 * via SecureStoreKeyProvider and persists the keyId to UserSettings.
 *
 * Self-healing — if a stored keyId points to SecureStore data that's gone
 * (e.g. iOS keychain wipe on reinstall, simulator reset, bundle id change),
 * the orphan keyId is cleared so the generation effect can produce a fresh
 * keypair. Without this, badge creation fails with "Public key not found".
 *
 * Idempotent — does nothing if a verified keyId is already stored.
 * Silent — no UI, key generation happens in the background.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@evolu/react";
import {
  userSettingsQuery,
  createUserSettings,
  updateUserSettingsKey,
  clearUserSettingsKey,
} from "../db";
import { keyProvider } from "../crypto";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("useUserKey");

export interface UserKeyState {
  /** The keyId stored in UserSettings (null until generation completes) */
  keyId: string | null;
  /** True once the key is ready (verified to exist in SecureStore) */
  isReady: boolean;
  /** Set if SecureStore is unavailable or key generation failed */
  error: string | null;
}

export function useUserKey(): UserKeyState {
  const rows = useQuery(userSettingsQuery);
  const settings = rows[0] ?? null;
  const didInit = useRef(false);
  const isGenerating = useRef(false);
  // Track which keyIds we've already verified so we don't probe SecureStore
  // on every render. Reset when settings.keyId changes (e.g. after self-heal).
  const verifiedKeyId = useRef<string | null>(null);
  const isVerifying = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Ensure a settings row exists (singleton pattern — same as useDensity)
  useEffect(() => {
    if (!settings && !didInit.current) {
      didInit.current = true;
      createUserSettings();
    }
  }, [settings]);

  // Verify the stored keyId still resolves in SecureStore. If the underlying
  // key data has been wiped (iOS keychain reset, app reinstall, bundle id
  // change), clear the orphan so the generation effect below can re-run.
  useEffect(() => {
    const storedKeyId = (settings?.keyId as string | null | undefined) ?? null;

    if (!settings || !storedKeyId) {
      setVerified(false);
      return;
    }

    // Already verified this exact keyId — nothing to do.
    if (verifiedKeyId.current === storedKeyId) return;
    if (isVerifying.current) return;

    isVerifying.current = true;

    (async () => {
      try {
        await keyProvider.getPublicKey(storedKeyId);
        verifiedKeyId.current = storedKeyId;
        setVerified(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Distinguish orphan ("not found") from transient store errors so
        // we don't wipe a valid keyId during a flaky SecureStore read.
        if (message.includes("not found")) {
          logger.warn(
            "Stored keyId orphaned in SecureStore — clearing so a fresh keypair can be generated",
            { keyId: storedKeyId },
          );
          clearUserSettingsKey(settings.id);
        } else {
          logger.error("Failed to verify stored keyId", {
            keyId: storedKeyId,
            error: err,
          });
          setError(`Key verification failed: ${message}`);
        }
        setVerified(false);
      } finally {
        isVerifying.current = false;
      }
    })();
  }, [settings]);

  // Generate keypair if settings row exists but has no keyId yet
  useEffect(() => {
    if (!settings || settings.keyId || isGenerating.current) return;

    isGenerating.current = true;

    (async () => {
      try {
        const available = await keyProvider.isAvailable();
        if (!available) {
          setError("Secure storage is unavailable on this device");
          logger.warn("SecureStore unavailable — badge signing will not work");
          return;
        }

        const { keyId } = await keyProvider.generateKeyPair();
        // Evolu mutations are synchronous CRDT operations — no await needed.
        updateUserSettingsKey(settings.id, keyId);
        logger.info("Ed25519 keypair ready", { keyId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(`Key generation failed: ${message}`);
        logger.error("Failed to generate or store keypair", { error: err });
      } finally {
        isGenerating.current = false;
      }
    })();
  }, [settings]);

  const keyId = (settings?.keyId as string | null | undefined) ?? null;
  const isReady = keyId !== null && verified && error === null;

  return { keyId, isReady, error };
}
