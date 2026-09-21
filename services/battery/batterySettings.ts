import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking } from 'react-native';

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return;
  }
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
    );
  } catch {
    await Linking.openSettings();
  }
}

export async function openLocationSourceSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return;
  }
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS);
  } catch {
    await Linking.openSettings();
  }
}
