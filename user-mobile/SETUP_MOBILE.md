# CkasH User Gaming Mobile App (Android APK) Guide

This mobile project (`user-mobile/`) provides the standalone Android application for **CkasH Gaming Platform**. It wraps the entire gaming platform inside a hardware-accelerated, high-performance native container with 100% feature and UI parity, including:
- Real-time Aviator crash game with Canvas animation and live WebSocket betting
- Full wallet system (Deposit with bKash/Nagad/Rocket screenshot slips, withdrawals)
- Activity, bet history, and live game feed
- Refer & Earn sharing and referral tracking
- Hardware back-button navigation
- Dynamic server address configuration modal

---

## 1. Quick Testing on iPhone or Android Phone (Expo Go)

You can run and test the app immediately without building the `.apk`:

### Step 1: Install Expo Go
- **Android:** Download **Expo Go** from Google Play Store.
- **iPhone:** Download **Expo Go** from Apple App Store.

### Step 2: Start the Mobile Dev Server
From your computer terminal:
```bash
cd user-mobile
npm install
npx expo start
```

### Step 3: Connect
- Scan the QR code with your phone camera (iOS) or Expo Go app (Android).
- **Tip for local backend testing:** Ensure your phone is connected to the same Wi-Fi network as your computer, and use your computer's local IP (e.g. `http://192.168.1.50:1002`). You can set this right from the in-app server settings dialog.

---

## 2. Generating Standalone Android `.apk` File

Using Expo EAS, you can build an installable `.apk` file directly in the cloud:

```bash
# 1. Install EAS CLI globally (if not installed)
npm install -g eas-cli

# 2. Log in with your Expo account (free account from expo.dev)
eas login

# 3. Build the APK
cd user-mobile
npm run build:apk
```

EAS Build will compile the project and provide a direct download link for the `.apk` file that you can install on any Android phone.

---

## 3. In-App Server Address Switcher

If the mobile app ever displays "Connection Problem" (for instance if testing on different Wi-Fi networks or switching between development and production):
1. Tap **"⚙️ Change Server Address"** on the screen.
2. Enter your current server address:
   - For local Wi-Fi testing: `http://192.168.X.X:1002`
   - For cloud/production domain: `https://your-domain.com`
3. Tap **"Connect"**. The app persists this address so you never have to re-enter it.
