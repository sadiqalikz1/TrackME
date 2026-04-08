# 💰 FinanceFlow

A comprehensive personal finance tracking app built with React Native & Expo for Android.

## ✨ Features

### Core Features
- 📊 **Dashboard** - Monthly balance overview, spending charts, quick stats
- 💳 **Transactions** - Track income & expenses with categories
- 📈 **Budgets** - Set spending limits per category with alerts
- 💼 **Work Projects** - Track freelance/contract work with payments
- 🎯 **Goals** - Set savings targets with progress tracking
- 📉 **Analytics** - 6-month trends, category breakdown charts

### Enhanced Features
- 🔐 **Biometric Lock** - Secure app with fingerprint/face authentication
- 🔔 **Push Notifications** - Bill due reminders & budget alerts
- 📴 **Offline Mode** - Full functionality without internet (SQLite)
- 💱 **Multi-Currency** - Support for USD, EUR, GBP, INR, JPY, LKR
- 🔄 **Bill Reminders** - Recurring bill tracking with due date alerts
- 🌙 **Dark/Light Theme** - Automatic or manual theme switching

## 🛠️ Tech Stack

- **Framework**: React Native 0.74 + Expo SDK 52
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for RN)
- **Backend**: Firebase (Auth, Firestore)
- **Charts**: react-native-chart-kit
- **Navigation**: React Navigation v6
- **Local DB**: expo-sqlite (offline mode)
- **Auth**: Google Sign-In + Biometrics

## 📱 Screenshots

| Dashboard | Transactions | Analytics |
|-----------|--------------|-----------|
| ![Dashboard](https://via.placeholder.com/200x400?text=Dashboard) | ![Transactions](https://via.placeholder.com/200x400?text=Transactions) | ![Analytics](https://via.placeholder.com/200x400?text=Analytics) |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for emulator) or Expo Go app

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/financeflow.git
cd financeflow

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your Firebase config to .env
```

### Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** → Google Sign-In
3. Enable **Cloud Firestore**
4. Add Android app with package name: `com.financeflow.app`
5. Copy config values to `.env`

### Running the App

```bash
# Start Expo development server
npm start

# Run on Android emulator
npm run android

# Run on physical device with Expo Go
# Scan QR code from terminal
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   └── common/          # Feature-specific components
├── contexts/            # React Context providers
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── NotificationContext.tsx
├── navigation/          # React Navigation setup
├── screens/             # App screens
│   ├── auth/
│   ├── dashboard/
│   ├── transactions/
│   ├── work/
│   ├── budgets/
│   ├── goals/
│   ├── analysis/
│   └── settings/
├── services/            # Firebase & API services
├── types/               # TypeScript definitions
└── utils/               # Helpers & constants
```

## 🔧 Environment Variables

Create a `.env` file with:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
```

## 📦 Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build (first time)
eas build:configure

# Build APK for Android
eas build -p android --profile preview

# Build AAB for Play Store
eas build -p android --profile production
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Expo](https://expo.dev) - React Native development platform
- [Firebase](https://firebase.google.com) - Backend services
- [NativeWind](https://www.nativewind.dev) - Tailwind CSS for React Native
- [React Navigation](https://reactnavigation.org) - Navigation library
