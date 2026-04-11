# TrackME 📊

> A powerful, full-featured personal finance and work management mobile application built with React Native, Firebase, and Expo.

**Version:** 1.0.2 | **Status:** Active Development

---

## 📱 Overview

TrackME is a comprehensive financial management and work tracking application designed for entrepreneurs, freelancers, and individuals who need to manage their personal finances, track projects, generate quotations, and monitor their financial health in real-time. The app works seamlessly in both online and offline modes, syncing data automatically when connection is restored.

### Key Highlights
- ✅ **Real-time Sync**: Automatic bidirectional data synchronization between local and cloud
- ✅ **Offline First**: Full functionality even without internet connection
- ✅ **Multi-Currency**: Support for 15+ currencies worldwide
- ✅ **Cross-Platform**: iOS, Android, and Web support via Expo
- ✅ **Smart Analytics**: Financial insights and spending trends
- ✅ **Work Management**: Complete project tracking and quotation system
- ✅ **Custom Dashboards**: Personalized dashboard with 12+ configurable cards
- ✅ **Dark Mode**: Beautiful light and dark theme support
- ✅ **Secure**: Biometric authentication and secure local storage

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React Native + Expo | Cross-platform mobile development |
| **Language** | TypeScript | Type-safe development |
| **State Management** | React Context API | Global app state & UI theme |
| **Database (Cloud)** | Firebase Firestore | Real-time cloud synchronization |
| **Database (Local)** | SQLite (expo-sqlite) | Offline persistence & caching |
| **Authentication** | Firebase Auth | Secure user authentication |
| **Styling** | Tailwind CSS (NativeWind) | Utility-first styling |
| **UI Components** | Expo Vector Icons | Icon library |
| **Charts** | react-native-chart-kit | Data visualization |
| **Navigation** | React Navigation | App routing & deep linking |
| **Notifications** | Expo Notifications | Push notifications & reminders |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer (Screens)              │
│   Dashboard│Transactions│Work│Budgets│Goals│Analysis│etc    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Component & Context Layer                       │
│  AuthContext │ DashboardContext │ ThemeContext │ etc         │
│  Reusable UI Components │ Custom Hooks                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Service Layer                                   │
│  DataService │ SyncEngine │ HybridRepository               │
│  Firebase Service │ Database Service                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────▼────────┐              ┌─────────────▼─────┐
│  Cloud Layer   │              │  Local Layer      │
│ Firebase Auth  │              │  SQLite Database  │
│ Firestore DB   │◄────Sync────►│  Async Storage    │
│ Cloud Storage  │              │  Secure Store     │
└────────────────┘              └───────────────────┘
```

### Data Flow

1. **User Action** → Screen Component
2. **Component Interaction** → Context/Hook (useData, useAuth)
3. **Request Processing** → Service Layer (DataService, SyncEngine)
4. **Hybrid Repository** → Routes to Cloud or Local based on:
   - Network status
   - Sync strategy selected
   - Data availability
5. **Database Operations** → Firebase or SQLite
6. **Response** → Shared through Context → Component Re-render

### Sync Strategy

TrackME implements a **smart hybrid repository** pattern:

- **Online Mode**: Primary reads/writes to Firestore, local DB acts as cache
- **Offline Mode**: All reads/writes to SQLite, sync queue created
- **Sync Engine**: Background worker continuously:
  - Detects connection changes
  - Queues pending operations
  - Resolves conflicts (LastWriteWins)
  - Performs bulk synchronization every 30 seconds

---

## 🎯 Core Features

### 1. **Dashboard** 📊
Personal financial overview with customizable cards:
- **Balance Card**: Total net worth display
- **Bank Accounts**: All connected bank accounts with balances
- **Cash in Hand**: Physical cash tracking
- **Income & Expense**: Monthly income vs expense summary
- **Budget Status**: Budget utilization and alerts
- **Work Overview**: Active projects and income
- **Net Worth**: Total assets tracking
- **Spending Trends**: Weekly/monthly spending charts
- **Top Categories**: Spending by category
- **Upcoming Bills**: Scheduled payments and reminders
- **Goals Progress**: Financial goals tracking
- **Recent Transactions**: Last 10 transactions

**Customization**: Users can enable/disable, reorder, and adjust cards to their preferences.

### 2. **Transaction Management** 💰
Comprehensive tracking of all income and expenses:

**Transaction Categories:**
- **Expenses**: Food & Dining, Transport, Rent, Shopping, Entertainment, Health, Bills, Utilities
- **Income**: Salary, Investment, Work Profit, Stock Market, Dividend, Bonus, Gift, Refund, Loan Received
- **Special**: Work Profit, Stock Market, Dividend

**Features:**
- Add/Edit/Delete transactions
- Bulk filter by category, date range, account
- Search functionality
- Transaction history and details
- Receipt attachment support
- Recurring transaction setup

### 3. **Work & Project Management** 🏗️
Complete solution for service-based businesses:

**Work Categories:**
- CCTV Installation & Maintenance
- Hardware Sales & Support
- Networking Solutions
- Software Development & Support
- General Maintenance
- Consultation Services
- Other Services

**Work Features:**
- Create projects with items/expenses
- Track work status (Pending, In Progress, Completed, Cancelled)
- Calculate profit margins (Revenue - Expenses)
- Expense tracking by type:
  - Materials
  - Transportation
  - Labor
  - Other
- Time tracking for projects
- Project profitability analysis

### 4. **Quotations** 📋
Professional quotation generation and management:
- Create custom quotations from templates
- Add multiple line items with pricing
- Automatic calculations
- Convert to work/invoice
- Export to PDF
- Quotation status tracking
- Client management

### 5. **Budget Management** 💳
Set and monitor spending limits:
- Create budgets by category
- Set monthly budget limits
- Real-time spending vs budget alerts
- Visual progress indicators
- Budget insights and recommendations
- Multi-currency budget support
- Budget history and trends

### 6. **Financial Goals** 🎯
Track financial aspirations:
- Create savings goals with targets
- Visual progress tracking
- Goal deadline management
- Achievement notifications
- Multiple simultaneous goals
- Goal categories (Travel, Emergency Fund, Education, Property, etc.)
- Contribution history

### 7. **Bank Account Management** 🏦
Connect and track multiple accounts:
- Add bank accounts/digital wallets
- Track cash in hand
- Account balance monitoring
- Transaction history per account
- Account type categorization
- Account-wise spending analysis

### 8. **Bill Reminders** 📅
Never miss important payments:
- Set recurring bill reminders
- Multiple reminder frequencies (Daily, Weekly, Monthly, Yearly)
- Notifications and alerts
- Mark bills as paid
- Bill payment history
- Budget impact preview

### 9. **Financial Analysis** 📈
Deep insights into financial health:
- **Spending Analytics**: Category-wise breakdown, trends over time
- **Income Analysis**: Income sources, seasonal patterns
- **Comparison Charts**: Period-over-period comparison
- **Budget Analysis**: Actual vs budgeted spending
- **Net Worth Tracking**: Assets vs liabilities trend
- **Cash Flow**: Inflow vs outflow analysis
- **Category Distribution**: Visual representation of expenses
- **Forecasting**: Predictive analytics based on historical data

### 10. **Settings & Customization** ⚙️
Personalize your experience:
- **Theme**: Light/Dark mode toggle
- **Currency**: Selection from 15+ supported currencies
- **Dashboard**: Enable/disable and reorder cards
- **Notifications**: Customize alert preferences
- **Biometric Security**: Enable/disable fingerprint login
- **Work Dashboard**: Customize work-related cards
- **Display Options**: Amount display formats, date formats

### 11. **Authentication & Security** 🔐
Secure access and data protection:
- Email/Password authentication
- Firebase Auth integration
- Biometric authentication (fingerprint/face recognition)
- Secure token storage
- Guest mode for testing
- Session management
- Automatic logout on inactivity

### 12. **Offline Support** 📴
Full functionality without internet:
- All features work offline
- Automatic sync when online
- Conflict resolution
- Data preservation
- User notification of sync status
- Manual sync triggers

---

## 📂 Project Structure

```
TrackME/
├── src/
│   ├── App.tsx                          # Main app component
│   ├── contexts/                        # Global state management
│   │   ├── AuthContext.tsx              # Authentication state
│   │   ├── DashboardContext.tsx         # Dashboard state
│   │   ├── NotificationContext.tsx      # Notifications
│   │   ├── ThemeContext.tsx             # Theme (Light/Dark)
│   │   └── WorkDashboardContext.tsx     # Work dashboard state
│   │
│   ├── screens/                         # UI Screens
│   │   ├── auth/                        # Authentication screens
│   │   ├── dashboard/                   # Dashboard screens
│   │   ├── transactions/                # Transaction screens
│   │   ├── work/                        # Work/project screens
│   │   ├── budgets/                     # Budget screens
│   │   ├── goals/                       # Goals screens
│   │   ├── quotations/                  # Quotation screens
│   │   ├── analysis/                    # Analytics screens
│   │   ├── settings/                    # Settings screens
│   │   └── more/                        # Additional features
│   │
│   ├── components/                      # Reusable components
│   │   ├── common/                      # Common UI components
│   │   ├── ui/                          # UI kit components
│   │   └── NotificationToast.tsx        # Toast notifications
│   │
│   ├── services/                        # Business logic
│   │   ├── database.ts                  # SQLite management
│   │   ├── dataService.ts               # Data operations
│   │   ├── firebase.ts                  # Firebase wrapper
│   │   ├── syncEngine.ts                # Data sync logic
│   │   └── repositories/                # Data access layer
│   │       └── hybridRepository.ts      # Local/Cloud routing
│   │
│   ├── hooks/                           # Custom React hooks
│   │   ├── useData.ts                   # Data fetching hook
│   │   └── useOnlineStatus.ts           # Network detection
│   │
│   ├── navigation/                      # App navigation
│   │   └── RootNavigator.tsx            # Navigation structure
│   │
│   ├── types/                           # TypeScript types
│   ├── utils/                           # Utility functions
│   │   ├── constants.ts                 # App constants
│   │   └── formatters.ts                # Data formatting
│   │
│   └── global.css                       # Global styles
│
├── android/                             # Android native code
├── ios/                                 # iOS native code
├── app/                                 # Entry point
├── firebase.json                        # Firebase config
├── firestore.rules                      # Firestore security rules
├── firestore.indexes.json               # Firestore indexes
├── app.json                             # Expo app config
├── eas.json                             # EAS build config
├── tailwind.config.js                   # Tailwind configuration
└── tsconfig.json                        # TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode (for iOS development)
- Android: Android Studio and SDK

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TrackME
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Firebase**
   - Create a Firebase project at https://console.firebase.google.com
   - Download config files and place in project root:
     - `google-services.json` (Android)
     - `GoogleService-Info.plist` (iOS)
   - Update `src/services/firebase.ts` with your credentials

4. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start development server**
   ```bash
   npm start
   ```

### Development Commands

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web

# Build for production (Android)
eas build --platform android --profile preview

# Lint code
npm run lint

# TypeScript check
npx tsc --noEmit
```

---

## 🔐 Security & Privacy

### Data Security
- ✅ All Firebase data encrypted at rest and in transit
- ✅ Row-level security via Firestore rules
- ✅ Secure token storage with expo-secure-store
- ✅ No sensitive data stored in AsyncStorage
- ✅ Biometric protection for app access

### Privacy
- ✅ No data shared with third parties
- ✅ User data stays in user's Firebase project
- ✅ GDPR compliant data handling
- ✅ User can export or delete all data
- ✅ Offline data never syncs without permission

### Firestore Security Rules
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /{document=**} {
      allow read, write: if request.auth.uid == resource.data.uid;
      allow create: if request.auth.uid == request.resource.data.uid;
    }
  }
}
```

---

## 💾 Data Persistence

### Local Storage (SQLite)
- **Purpose**: Offline access, caching, quick reads
- **Location**: Device app storage
- **Size**: Typically 50MB - 500MB
- **Sync**: Triggered every 30 seconds when online

**Tables:**
- documents (store synced data)
- sync_metadata (track sync state)
- pending_changes (queue offline changes)

### Cloud Storage (Firebase Firestore)
- **Purpose**: Cloud backup, multi-device sync, real-time updates
- **Encryption**: AES-256 at rest
- **Backup**: Automatic daily backups
- **Retention**: Configurable per user

**Collections:**
- users
- transactions
- budgets
- works
- quotations
- goals
- recurring
- billReminders
- bankAccounts

---

## 📊 Supported Currencies

USD, EUR, GBP, INR, JPY, LKR, SAR, AED, PKR, BDT, SGD, HKD, CAD, AUD, NZD

---

## 🎨 Themes

TrackME supports beautiful light and dark themes:

- **Light Theme**: Clean, professional colors optimized for daytime use
- **Dark Theme**: AMOLED-friendly dark palette for reduced eye strain
- **Auto Theme**: Automatically follows system preference

---

## 📈 Performance Metrics

- **App Size**: ~80-120 MB (including all assets)
- **Startup Time**: <3 seconds
- **Database Sync**: 30-second intervals
- **Memory Usage**: <150 MB typical
- **Battery Impact**: Minimal (background sync optimized)

---

## 🐛 Known Limitations

- Web platform has limited SQLite support (falls back to storage)
- Offline sync limited to 72+ hours of offline time (configurable)
- Maximum 10,000 transactions for smooth performance
- PDF export requires online connectivity

---

## 📝 Roadmap

### v1.1 (Q2 2026)
- [ ] Advanced analytics and AI-powered insights
- [ ] Multi-user households/family budgets
- [ ] Bank account auto-sync (Plaid integration)
- [ ] Split expenses & shared transactions

### v1.2 (Q3 2026)
- [ ] Investment portfolio tracking
- [ ] Tax reporting and compliance
- [ ] Recurring expense templates
- [ ] Smart categorization with ML

### v1.3 (Q4 2026)
- [ ] Team collaboration for work projects
- [ ] Invoice generation and tracking
- [ ] Expense automatic receipts OCR
- [ ] Payment integration (Stripe/PayPal)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 💬 Support & Feedback

- **Issues**: Report bugs via GitHub Issues
- **Feature Requests**: Submit ideas through Discussions
- **Questions**: Check Discussions for Q&A
- **Email**: support@trackme.app

---

## 👤 Author

Built with ❤️ by SADIQ

---

## 🙏 Acknowledgments

- Expo team for amazing React Native framework
- Firebase for robust backend infrastructure
- React Native community for excellent libraries
- Contributors and users for feedback

---

**Last Updated**: April 2026 | **Version**: 1.0.2
