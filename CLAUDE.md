# Pantry - Recipe & Grocery Management App

## Overview

A mobile app for managing recipes, tracking pantry inventory, and building grocery lists.

## Tech Stack

- **Framework**: React Native with Expo (managed workflow)
- **Navigation**: Expo Router (file-based, bottom tab layout)
- **Local Storage**: SQLite via `expo-sqlite`
- **UI Library**: React Native Paper
- **Target Platform**: iOS (iPhone)

## Navigation Structure

Bottom tab bar with four tabs:
1. **Recipes** — list view + detail/add screens
2. **Pantry** — bulk ingredient inventory
3. **Grocery List** — shopping checklist
4. **Meal List** — planned meals checklist

## Core Features

### Recipe Management
- Manually add recipes with ingredients (name + amount) and step-by-step instructions
- View recipe details: ingredient list and instructions
- Edit and delete existing recipes
- Mark individual ingredients as "bulk" (already have on hand) directly from a recipe view
- Deleting a recipe does NOT remove it from the meal list if it was already added

### Pantry
- Shows all bulk ingredients the user currently has (spices, sauces, etc.)
- Mark an ingredient as "run out" — removes it from pantry and adds it to the grocery list

### Grocery List
- Organized by grocery store section
- Items include amounts for non-bulk ingredients (e.g., "2 cans coconut milk" but not "1 tsp cumin")
- When multiple recipes use the same ingredient with compatible units, combine into one entry (e.g., 1 + 2 onions = 3 onions)
- Checklist UI — checking off an item removes it from the list
- Purchasing a bulk item automatically adds it back to the pantry
- Users can manually add ingredients to the grocery list (e.g., snacks not tied to a recipe)

### Grocery Store Sections
1. Produce
2. Pantry
3. Freezer
4. Vegan
5. Baking
6. Spices
7. Beverages

### Ingredient Database
- SQLite database is pre-seeded with common ingredients mapped to their grocery store section
- When adding an ingredient to a recipe, auto-assign its section if it exists in the database
- If the ingredient is not recognized, prompt the user to pick a section
- New mappings are saved so the user only labels each ingredient once
- Users can reassign an ingredient's section at any time

### Bulk Ingredient Tracking
- Bulk status is NOT pre-seeded — it builds up organically from user behavior
- Users can mark an ingredient as bulk from a recipe view (they already have it on hand)
- Users can mark an ingredient as bulk when purchasing it from the grocery list
- Bulk items appear in the pantry going forward

### Meal List
- Shows meals the user has chosen to make
- Checklist UI — checking off a meal removes it from the list (grocery items are independent once added)
- Users can add custom entries (meals not tied to a saved recipe)
- If a linked recipe is deleted, the meal list entry remains

### Add to Meal List (from recipe view)
- Adds the recipe to the meal list
- Adds all required non-bulk ingredients (with amounts) to the grocery list, excluding bulk items already in the pantry
