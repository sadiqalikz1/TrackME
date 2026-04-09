# Screen Migration Template - From Firebase Listeners to Offline-First

## Progress
✅ AnalysisScreen - completed
✅ BillRemindersScreen - completed  
🔄 GoalsScreen - partially (imports + hook updated, need to add refetch calls)
⏳ TransactionsScreen - TODO
⏳ DashboardScreen - TODO
⏳ BudgetsScreen - TODO
⏳ WorkScreen - TODO
⏳ WorkDashboardScreen - TODO
⏳ WorkDetailScreen - TODO
⏳ QuotationsScreen - TODO
⏳ QuotationDetailScreen - TODO

---

## Pattern 1: Simple Collection Fetch (e.g., TransactionsScreen, GoalsScreen, WorkScreen)

### BEFORE
```typescript
import { useEffect, useState } from 'react';
import { getUserTransactions, createDocument, updateDocument, deleteDocument } from '@/services/firebase';

const TransactionsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = getUserTransactions(user.uid, (data) => {
      setTransactions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};
```

### AFTER
```typescript
import { useData, useDataMutations, useOfflineStatus } from '@/hooks';

const TransactionsScreen: React.FC = () => {
  const { data: transactionsData, loading, refetch } = useData<Transaction[]>('transactions');
  const transactions = transactionsData && Array.isArray(transactionsData) ? transactionsData : [];
  const { create, update, delete: deleteItem } = useDataMutations('transactions');
  const { isOffline } = useOfflineStatus();

  const onRefresh = async () => {
    await refetch();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Offline Banner */}
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.warning }]}>
          <Ionicons name="wifi-off" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline - Data from cache</Text>
        </View>
      )}

      <FlatList
        data={transactions}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // ... other styles
});
```

### CRUD Operations Changes
**Before:**
```typescript
// Create
await createDocument('transactions', { ...data, uid: user.uid });

// Update
await updateDocument('transactions', id, updatedData);

// Delete
await deleteDocument('transactions', id);
```

**After:**
```typescript
// Create
const { create } = useDataMutations('transactions');
await create({ ...data, uid: user.uid });
await refetch(); // Optional: refresh UI

// Update
const { update } = useDataMutations('transactions');
await update(id, updatedData);
await refetch();

// Delete
const { delete: deleteItem } = useDataMutations('transactions');
await deleteItem(id);
await refetch();
```

---

## Pattern 2: Multiple Collections (e.g., DashboardScreen, BudgetsScreen)

### BEFORE
```typescript
useEffect(() => {
  if (!user) return;
  const unsubTransactions = getUserTransactions(user.uid, (data) => {
    setTransactions(data);
    setLoading(false);
  });
  const unsubGoals = getUserGoals(user.uid, (data) => {
    setGoals(data);
  });
  return () => {
    unsubTransactions();
    unsubGoals();
  };
}, [user]);
```

### AFTER
```typescript
const { data: transactionsData, loading, refetch: refetchTransactions } = useData<Transaction[]>('transactions');
const { data: goalsData, refetch: refetchGoals } = useData<Goal[]>('goals');
const transactions = transactionsData && Array.isArray(transactionsData) ? transactionsData : [];
const goals = goalsData && Array.isArray(goalsData) ? goalsData : [];

const onRefresh = async () => {
  await Promise.all([refetchTransactions(), refetchGoals()]);
};
```

---

## Pattern 3: Single Document Fetch (e.g., WorkDetailScreen, QuotationDetailScreen)

### BEFORE
```typescript
const [work, setWork] = useState<Work | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadWork();
}, [workId]);

const loadWork = async () => {
  try {
    const data = await getWorkById(workId);
    setWork(data);
  } catch (error) {
    showError('Failed to load work');
  } finally {
    setLoading(false);
  }
};
```

### AFTER
```typescript
const { data: work, loading, refetch } = useData<Work>('work', workId);

// That's it! useData handles both collection fetches and single-doc fetches
```

---

## Screens Needing Updates

### 1. TransactionsScreen
- File: `src/screens/transactions/TransactionsScreen.tsx`
- Pattern: Simple collection (Pattern 1)
- Collections: `transactions`
- CRUD: YES (create, update, delete)

### 2. GoalsScreen  
- File: `src/screens/goals/GoalsScreen.tsx`
- Pattern: Simple collection (Pattern 1)
- Collections: `goals`, `transactions` (creates transaction on goal complete)
- CRUD: YES (create, update, delete)
- Status: ✅ Partially done - need to add refetch() calls after mutations

### 3. DashboardScreen
- File: `src/screens/dashboard/DashboardScreen.tsx`
- Pattern: Multiple collections (Pattern 2)
- Collections: `transactions`, `goals`
- CRUD: NO (read-only)

### 4. BudgetsScreen
- File: `src/screens/budgets/BudgetsScreen.tsx`
- Pattern: Multiple collections (Pattern 2) + filtering
- Collections: `budgets`, `transactions`
- CRUD: YES (create, update, delete budgets)
- Note: Filter by month currently

### 5. WorkScreen
- File: `src/screens/work/WorkScreen.tsx`
- Pattern: Simple collection (Pattern 1)
- Collections: `work`
- CRUD: YES (create, update, delete)

### 6. WorkDashboardScreen
- File: `src/screens/work/WorkDashboardScreen.tsx`
- Pattern: Simple collection (Pattern 1)
- Collections: `work`
- CRUD: NO (read-only)

### 7. WorkDetailScreen
- File: `src/screens/work/WorkDetailScreen.tsx`
- Pattern: Single document (Pattern 3)
- Collections: `work`, `transactions` (creates time entries)
- CRUD: YES (update, create transactions)
- Note: Takes workId from route params

### 8. QuotationsScreen
- File: `src/screens/quotations/QuotationsScreen.tsx`
- Pattern: Simple collection (Pattern 1)
- Collections: `quotations`
- CRUD: YES (create, update, delete)

### 9. QuotationDetailScreen
- File: `src/screens/quotations/QuotationDetailScreen.tsx`
- Pattern: Single document (Pattern 3)
- Collections: `quotations`, `transactions` (converts to transaction)
- CRUD: YES (update, delete, create transaction)

---

## Quick Checklist for Each Screen

### Imports
- [ ] Remove: `import { getUserXXX, createDocument, updateDocument, deleteDocument } from '@/services/firebase'`
- [ ] Add: `import { useData, useDataMutations, useOfflineStatus } from '@/hooks'`

### Data Fetching
- [ ] Replace `useState` for data + `useEffect` with `useData()` hook
- [ ] Remove: `const [xxx, setXxx] = useState([])`
- [ ] Remove: `const [refreshing, setRefreshing] = useState(false)`
- [ ] Add: `const { data: xxxData, loading, refetch } = useData(...)`
- [ ] Add: `const { isOffline } = useOfflineStatus()`
- [ ] Add: `const xxx = xxxData && Array.isArray(xxxData) ? xxxData : []`

### CRUD Operations
- [ ] Replace all `createDocument()` calls with `useDataMutations().create()`
- [ ] Replace all `updateDocument()` calls with `useDataMutations().update()`
- [ ] Replace all `deleteDocument()` calls with `useDataMutations().delete()`
- [ ] Add `await refetch()` after mutations to update UI

### UI Updates
- [ ] Add offline banner JSX after opening `<View>`
- [ ] Update `RefreshControl` to use `loading` instead of `refreshing`
- [ ] Update `onRefresh` to call `await refetch()`

### Styles
- [ ] Add `offlineBanner`, `offlineText` styles to `StyleSheet.create()`

---

## Testing After Migration

For each screen:
1. **Offline mode**: Restart app in airplane mode → verify data loads from cache
2. **Add data offline**: Create new item → verify in local SQLite
3. **Sync online**: Go online → verify item appears in Firebase within 60 seconds
4. **Refresh**: Pull down to refresh → verify data updates
5. **Delete**: Delete item → verify removes properly
6. **Offline banner**: Should show when `isOffline === true`

---

## Notes

- All screens should follow **Pattern 1** or **Pattern 2** or **Pattern 3** above
- If a screen has custom logic (filtering, sorting), keep that logic but apply it to the new `data` from `useData()`
- Always wrap array checks: `const items = data && Array.isArray(data) ? data : []`
- Always add `await refetch()` after mutations to update the local cache
- Remember to remove the `refreshing` state - use `loading` from `useData()` instead
