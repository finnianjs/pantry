import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { initDatabase } from './schema';
import { View, ActivityIndicator } from 'react-native';

const DatabaseContext = createContext<SQLite.SQLiteDatabase | null>(null);

export function useDatabase(): SQLite.SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used within DatabaseProvider');
  return db;
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  useEffect(() => {
    let database: SQLite.SQLiteDatabase;

    async function setup() {
      database = await SQLite.openDatabaseAsync('pantry.db');
      await initDatabase(database);
      setDb(database);
    }

    setup();

    return () => {
      database?.closeAsync();
    };
  }, []);

  if (!db) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
  );
}
