import Constants from 'expo-constants';
import * as TaskManager from 'expo-task-manager';

export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function canUseBackgroundTasks(): Promise<boolean> {
  try {
    return await TaskManager.isAvailableAsync();
  } catch {
    return false;
  }
}
