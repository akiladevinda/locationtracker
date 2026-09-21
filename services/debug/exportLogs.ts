import { Directory, File, Paths } from 'expo-file-system';

import { getMemoryLogs } from '@/services/logger';
import { nowIso } from '@/services/ids';

export async function exportDebugLogs(): Promise<string> {
  const logs = getMemoryLogs();
  const body = logs
    .map((log) => `[${log.at}] ${log.level.toUpperCase()} ${log.message}`)
    .join('\n');
  const directory = new Directory(Paths.document, 'exports');
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  const file = new File(directory, `debug-logs-${nowIso().replaceAll(':', '-')}.txt`);
  file.create({ overwrite: true });
  file.write(body.length > 0 ? body : 'No logs captured yet.');
  return file.uri;
}
