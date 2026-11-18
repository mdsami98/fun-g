# Agency Android Mobile App — Complete Guide

This guide explains how to run, test, and build the APK file for the **Agency Mobile App** on your Mac (even without a physical Android phone).

---

## 1. Prerequisites & Installation

Open a terminal on your Mac and navigate to the mobile app folder:

```bash
cd agency-mobile
npm install
```

---

## 2. Testing on Your iPhone (Expo Go)

Because React Native and Expo are cross-platform, you can test the entire app live on your iPhone right now:

1. Download **Expo Go** from the iOS App Store (free).
2. Start the development server on your Mac:
   ```bash
   cd agency-mobile
   npx expo start
   ```
3. A QR code will appear in your Mac terminal.
4. Open the **Camera** app on your iPhone and scan the QR code.
5. Tap **Open in Expo Go**. The app will load immediately on your iPhone.
   *(Note: Ensure your iPhone and Mac are connected to the same Wi-Fi network).*

---

## 3. Connecting to Localhost vs Live Server

### Option A: Edit Server URL Right Inside the App (Easiest)
At the bottom of the Login Screen, there is a **"Server: ... Edit"** button.
- Tap **Edit** to open the server settings modal.
- Enter your Mac's local IP (e.g., `http://192.168.1.50:1001`) or a tunnel URL.
- Tap **Save**. The app immediately communicates with that backend.

### Option B: Using a Tunnel (Works Anywhere)
If your iPhone or emulator cannot reach your local Mac IP, run a tunnel:
```bash
npx localtunnel --port 1001
```
Copy the generated URL (e.g. `https://rapid-fox-42.loca.lt`) and paste it into the app's Server URL setting.

### Option C: When Connecting to Live Production Server
When your backend code is deployed to your live server, simply update `eas.json` or paste your domain in the app:
```
https://api.yourdomain.com
```

---

## 4. How to Build the Standalone `.apk` File

You do not need to install Android Studio or configure Android SDK on your Mac. We use **EAS Build** (Expo Application Services) which builds the `.apk` in the cloud:

### Step 1: Install EAS CLI and Log In (Free)
```bash
npm install -g eas-cli
eas login
```
*(If you don't have an Expo account yet, register for free at [expo.dev](https://expo.dev)).*

### Step 2: Configure EAS Project
```bash
cd agency-mobile
eas build:configure
```

### Step 3: Trigger the APK Build
Run this single command:
```bash
npm run build:apk
```
*(Or directly: `eas build -p android --profile preview`)*

- Expo's cloud build servers will compile your code into a ready-to-install Android `.apk` file.
- When finished (usually 3–5 minutes), the terminal will print a **direct download link** for your `.apk`.

---

## 5. How to Test the `.apk` Without an Android Phone

Once EAS Build gives you the `.apk` file:

1. **In-Browser Testing (No install needed):**
   - Go to [appetize.io](https://appetize.io).
   - Upload your downloaded `.apk`.
   - An interactive virtual Android phone will appear directly in your browser. You can click, type, and test the login.

2. **Android Studio Virtual Device (Mac):**
   - Download and install [Android Studio for Mac](https://developer.android.com/studio).
   - Open **Device Manager** and start any virtual phone (e.g. Pixel 8).
   - Drag and drop your `.apk` onto the emulator window to install and test.

3. **Direct Share to Agency Users:**
   - Agency Admins can download the `.apk` directly to their Android phones via WhatsApp, Google Drive, or a direct web link and tap **Install**.

---

## 6. Test Agency Admin Credentials

Use the default Agency Admin credentials:
- **Phone:** `+8801711111111`
- **Password:** `AgencyPass123`
*(Make sure your backend is running and the database has the agency admin account).*
