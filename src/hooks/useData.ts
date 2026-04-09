import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../services/dataService';
import { CollectionName } from '../services/database';

/**
 * useData: Custom hook for fetching collection/document data with offline support
 * Automatically refetches when offline detection changes or manually triggered
 */

type DataType = CollectionName;

export function useData<T = any>(
  collectionName: CollectionName,
  documentId?: string | null
): {
  data: T[] | T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T[] | T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let result: T[] | T | null;

      if (documentId) {
        // Fetch single document
        result = await getServiceForCollection(collectionName).getById(documentId);
      } else {
        // Fetch all documents in collection
        result = (await getServiceForCollection(collectionName).getAll()) as T[];
      }

      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`Error fetching ${collectionName}:`, error);
    } finally {
      setLoading(false);
    }
  }, [collectionName, documentId]);

  useEffect(() => {
    fetchData();

    // Refetch every 30 seconds (auto-sync with background sync)
    const timer = setInterval(fetchData, 30000);

    return () => clearInterval(timer);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Helper to get the right service for a collection
 */
function getServiceForCollection(collection: CollectionName): any {
  const serviceMap: { [key in CollectionName]: any } = {
    transactions: dataService.transactions,
    budgets: dataService.budgets,
    goals: dataService.goals,
    work: dataService.work,
    quotations: dataService.quotations,
    billReminders: dataService.billReminders,
    users: dataService.transactions, // Fallback (users rarely fetched this way)
  };

  return serviceMap[collection] || dataService.transactions;
}

/**
 * CRUD operations hook
 */
export function useDataMutations(collectionName: CollectionName) {
  const service = getServiceForCollection(collectionName);

  return {
    create: async (data: any) => {
      return service.create(data);
    },
    update: async (id: string, data: any) => {
      return service.update(id, data);
    },
    delete: async (id: string) => {
      return service.delete(id);
    },
  };
}
