#!/usr/bin/env bash
# Screen Migration Script - Converts all screens from Firebase listeners to useData hooks
# This script provides the exact patterns to replace for each file

declare -A SCREENS=(
  ["src/screens/transactions/TransactionsScreen.tsx"]="transactions"
  ["src/screens/goals/GoalsScreen.tsx"]="goals"
  ["src/screens/dashboard/DashboardScreen.tsx"]="transactions,goals"
  ["src/screens/budgets/BudgetsScreen.tsx"]="budgets,transactions"
  ["src/screens/work/WorkScreen.tsx"]="work"
  ["src/screens/work/WorkDashboardScreen.tsx"]="work"
  ["src/screens/work/WorkDetailScreen.tsx"]="work"
  ["src/screens/quotations/QuotationsScreen.tsx"]="quotations"
  ["src/screens/quotations/QuotationDetailScreen.tsx"]="quotations"
)

# Migration pattern for each screen type:
# 1. Replace imports
# 2. Replace useEffect data fetch with useData hook
# 3. Replace createDocument/updateDocument/deleteDocument with useDataMutations
# 4. Add offline banner
# 5. Update RefreshControl to use 'loading' instead of 'refreshing'
# 6. Add styles for offlineBanner

echo "Screen Migration Guide:"
echo "====================="
echo ""
echo " Screens to update (in order of complexity):"
echo ""
for screen in "${!SCREENS[@]}"; do
  echo "• $screen (collections: ${SCREENS[$screen]})"
done
echo ""
echo "See SCREEN_MIGRATION_TEMPLATE.md for complete pattern"
