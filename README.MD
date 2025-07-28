🚀 SCANIFY: Generate, Scan & Manage
A feature-rich, beautifully designed QR code utility application for iOS and Android, built with React Native and Expo.

✨ Key Features
This application is more than just a generator; it's a complete toolkit for all your QR code needs.

Advanced QR Code Generation:

Multiple Data Types: Create QR codes for URLs, plain text, Wi-Fi networks, and digital contact cards (vCards).

Center Image: Personalize your QR codes by adding a custom logo or image to the center.

Live Preview: The QR code updates in real-time as you type.

High-Speed QR Code Scanner:

Instant Detection: Uses the device's camera for fast and reliable scanning.

Persistent History:

Automatic Saving: Every QR code you generate is automatically saved to your local history.

Reload Functionality: Tap any entry in your history to instantly reload it in the generator for quick edits or re-sharing.

Clear History: Option to clear all saved history with a confirmation prompt.

Modern Mobile Experience:

Copy to Clipboard: Easily copy the raw data of any generated QR code.

Share Functionality: Natively share the generated QR code image to other apps.

🎨 Themes & UI
The app was designed with a focus on a premium user experience and a visually stunning interface.

Dual-Theme System:

Light Mode: A clean, elegant, and user-friendly interface.

Dark Mode: A sleek, high-tech theme for comfortable use in low-light environments.

Automatic Switching: The app defaults to your system's theme and can be toggled manually in the settings.

Live Animated Backgrounds:

Interactive Liquid Chrome Effect (Light & Dark Mode): A beautiful, multi-layered chrome effect that follows your touch on the screen, creating a fluid and engaging experience. The chrome colors adapt to the current theme.

🛠️ Tech Stack
This project was built using modern, cross-platform technologies.

Framework: React Native (with Expo)

Navigation: React Navigation (Drawer Navigator)

QR Code Generation: react-native-qrcode-svg

QR Code Scanning: expo-camera

Local Storage: async-storage

UI & Animations:

React Native Animated API for all animations.

expo-linear-gradient for advanced color effects.

@expo/vector-icons for iconography.

Device APIs: expo-clipboard, expo-sharing, expo-image-picker

⚙️ Setup & Installation
To run this project on your local machine, follow these steps:

Clone the repository:

git clone <your-repository-url>
cd <your-project-directory>

Install dependencies:
Choose the command that matches your package manager.

# Using npm
npm install

# Using Bun
bun install

Run the application:
This will start the Metro bundler.

# Using npm/npx
npx expo start

# Using Bun
bun expo start

Open on your device:

Download the Expo Go app from the App Store or Google Play Store.

Scan the QR code shown in the terminal with your phone's camera. The app will open in Expo Go.






