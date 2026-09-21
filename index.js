import 'react-native-get-random-values';

// TaskManager.defineTask must be registered before the app JS tree mounts.
// Importing it from the entry file keeps background location alive when Android
// starts the JS runtime without mounting React views.
import './tasks/backgroundLocation';

import 'expo-router/entry';
