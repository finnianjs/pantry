# Pantry

A mobile app for managing recipes, tracking pantry inventory, and building grocery lists. Built with React Native and Expo for iOS.

## Features

- **Recipes** — Add recipes with ingredients and step-by-step instructions. Mark ingredients as "bulk" (already on hand) to keep your grocery list lean.
- **Pantry** — Track bulk ingredients you have at home (spices, sauces, etc.). Mark items as "run out" to automatically add them to your grocery list.
- **Grocery List** — Shopping checklist organized by store section. Combines duplicate ingredients across recipes and tracks amounts. Checking off a bulk item adds it back to your pantry.
- **Meal List** — Plan meals to make. Adding a meal automatically populates the grocery list with missing ingredients.

## Tech Stack

- [Expo](https://expo.dev) (managed workflow) with [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native Paper](https://callstack.github.io/react-native-paper/) for UI
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for local storage
- TypeScript

## Getting Started

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your iPhone, or press `i` to open in the iOS Simulator.
