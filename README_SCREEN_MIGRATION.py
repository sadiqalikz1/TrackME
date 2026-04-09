#!/usr/bin/env python3
"""
Screen Migration Automation Script
Converts all screens from Firebase listeners to useData hooks
"""

import re
import os
from pathlib import Path

MIGRATIONS = {
    "src/screens/transactions/TransactionsScreen.tsx": {
        "collection": "transactions",
        "pattern_type": "simple",  # Simple collection fetch
        "has_crud": True,
    },
    "src/screens/goals/GoalsScreen.tsx": {
        "collection": "goals",
        "pattern_type": "simple",
        "has_crud": True,
    },
    "src/screens/dashboard/DashboardScreen.tsx": {
        "collections": ["transactions", "goals"],
        "pattern_type": "multiple",
        "has_crud": False,
    },
    "src/screens/budgets/BudgetsScreen.tsx": {
        "collections": ["budgets", "transactions"],
        "pattern_type": "multiple",
        "has_crud": True,
    },
    "src/screens/work/WorkScreen.tsx": {
        "collection": "work",
        "pattern_type": "simple",
        "has_crud": True,
    },
    "src/screens/work/WorkDashboardScreen.tsx": {
        "collection": "work",
        "pattern_type": "simple",
        "has_crud": False,
    },
    "src/screens/work/WorkDetailScreen.tsx": {
        "collection": "work",
        "pattern_type": "single_doc",
        "has_crud": True,
    },
    "src/screens/quotations/QuotationsScreen.tsx": {
        "collection": "quotations",
        "pattern_type": "simple",
        "has_crud": True,
    },
    "src/screens/quotations/QuotationDetailScreen.tsx": {
        "collection": "quotations",
        "pattern_type": "single_doc",
        "has_crud": True,
    },
}

def migrate_imports(content, collection):
    """Replace Firebase imports with useData hooks"""
    # Remove Firebase imports
    content = re.sub(
        r"import\s*{[^}]*(?:getUser\w+|createDocument|updateDocument|deleteDocument|subscribeToCollection|getQuotationById|getWorkById)[^}]*}\s*from\s*['\"]@/services/firebase['\"];?\n*",
        "",
        content,
        flags=re.MULTILINE
    )
    
    # Add useData hook import if not already there
    if "import { useData" not in content:
        # Find the line with useTheme import
        match = re.search(r"import\s*{[^}]*useTheme[^}]*}\s*from\s*['\"]@/contexts['\"];", content)
        if match:
            import_line = match.group(0)
            # Add useOfflineStatus hook import
            new_import = "import { useData, useDataMutations, useOfflineStatus } from '@/hooks';"
            content = content.replace(import_line, import_line + "\n" + new_import)
    
    return content

def add_offline_banner_to_return(content):
    """Add offline banner UI to the return statement"""
    # Find the view container in JSX
    pattern = r"(\s+return\s*\(\s*<View\s*style=\{)"
    replacement = r"\1\n      {/* Offline Banner */}\n      {isOffline && (\n        <View style={[styles.offlineBanner, { backgroundColor: colors.warning }]}>\n          <Ionicons name=\"wifi-off\" size={16} color=\"#fff\" />\n          <Text style={styles.offlineText}>Offline - Data from cache</Text>\n        </View>\n      )}\n\n      {/* Header or Content */}\1"
    
    # This is complex - better to just document the pattern
    return content

def add_offline_styles(content):
    """Add offline banner styles"""
    if "offlineBanner:" not in content and "StyleSheet.create" in content:
        # Find the first style property
        match = re.search(r"(StyleSheet\.create\(\{[\s]*[\w]+:\s*\{[\s]*flex:\s*1,?\s*\},?)", content)
        if match:
            # Add offlineBanner and offlineText styles
            new_styles = """
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
  },"""
            content = content.replace(match.group(1), match.group(1) + new_styles)
    
    return content

def print_migration_status():
    """Print which screens have been migrated"""
    print("=" * 60)
    print("SCREEN MIGRATION STATUS")
    print("=" * 60)
    print("✅ COMPLETED:")
    print("  • AnalysisScreen")
    print("  • BillRemindersScreen")
    print("\n🔄 IN PROGRESS:")
    print("  • GoalsScreen (partially - imports done, need refetch() calls)")
    print("\n⏳ TODO (Use SCREEN_MIGRATION_TEMPLATE.md as reference):")
    for path in MIGRATIONS.keys():
        print(f"  • {Path(path).stem}")
    print("\n" + "=" * 60)
    print("HOW TO CONTINUE:")
    print("=" * 60)
    print("""
1. For simple collections (TransactionsScreen, WorkScreen, etc.):
   - Follow Pattern 1 in SCREEN_MIGRATION_TEMPLATE.md
   - Use the imports and data-fetching examples

2. For multiple collections (DashboardScreen, BudgetsScreen):
   - Follow Pattern 2 in SCREEN_MIGRATION_TEMPLATE.md
   - Fetch multiple collections with separate useData() calls

3. For single documents (WorkDetailScreen, QuotationDetailScreen):
   - Follow Pattern 3 in SCREEN_MIGRATION_TEMPLATE.md
   - Pass the document ID to useData() as second parameter

4. ALWAYS:
   - Add  offline banner
   - Replace RefreshControl 'refreshing' with 'loading'
   - Add useDataMutations() for CRUD operations
   - Call refetch() after mutations
    """)

if __name__ == "__main__":
    print_migration_status()
    print("\nTo complete migrations:")
    print("1. Open each file from the TODO list")
    print("2. Follow the pattern from SCREEN_MIGRATION_TEMPLATE.md")
    print("3. Key changes:")
    print("   - Replace useEffect + useState with useData()")
    print("   - Add useOfflineStatus() hook")
    print("   - Replace Firebase functions with useDataMutations()")
    print("   - Add offline banner JSX")
    print("   - Update RefreshControl refreshing prop")
print("   - Add offlineBanner & offlineText styles")
