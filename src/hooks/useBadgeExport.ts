import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { PLACEHOLDER_IMAGE_URI } from './useCreateBadge';

export function useBadgeExport() {
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);

  const exportImage = useCallback(async (imageUri: string | null) => {
    if (!imageUri || imageUri === PLACEHOLDER_IMAGE_URI) {
      Alert.alert('No image available', 'This badge does not have a baked image yet.');
      return;
    }

    setIsExportingImage(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(imageUri, {
        UTI: 'public.png',
        mimeType: 'image/png',
        dialogTitle: 'Save Badge Image',
      });
    } catch (error) {
      console.error('[useBadgeExport] Failed to export image', { imageUri, error });
      Alert.alert('Export failed', 'Something went wrong exporting the badge image.');
    } finally {
      setIsExportingImage(false);
    }
  }, []);

  const exportJSON = useCallback(async (credential: string | null, goalTitle: string) => {
    if (!credential) {
      Alert.alert('No credential', 'This badge does not have a credential yet.');
      return;
    }

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      Alert.alert('Export failed', 'Cannot access the device cache directory.');
      return;
    }

    setIsExportingJSON(true);
    const safeName = goalTitle.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40);
    const tempUri = `${cacheDir}badge-${safeName}-${Date.now()}.json`;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }

      await FileSystem.writeAsStringAsync(tempUri, credential, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(tempUri, {
        UTI: 'public.json',
        mimeType: 'application/ld+json',
        dialogTitle: 'Export Badge Credential',
      });
    } catch (error) {
      console.error('[useBadgeExport] Failed to export credential', { goalTitle, error });
      Alert.alert('Export failed', 'Something went wrong exporting the credential.');
    } finally {
      await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch((cleanupErr) => {
        console.warn('[useBadgeExport] Failed to clean up temp file', { tempUri, cleanupErr });
      });
      setIsExportingJSON(false);
    }
  }, []);

  return { exportImage, exportJSON, isExportingImage, isExportingJSON };
}
