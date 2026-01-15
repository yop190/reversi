# Internationalization (i18n) Documentation

## Overview

The Reversi application supports multiple languages with automatic detection and easy extensibility.

## Supported Languages

| Code | Language | Native Name | Flag |
|------|----------|-------------|------|
| `en` | English | English | 🇬🇧 |
| `fr` | French | Français | 🇫🇷 |
| `nl` | Dutch | Nederlands | 🇳🇱 |
| `da` | Danish | Dansk | 🇩🇰 |

## Language Detection Priority

1. **User preference** (stored in localStorage)
2. **Browser language** (navigator.language)
3. **Default** (English)

## Usage

### In Components

```typescript
import { I18nService } from '../../services/i18n.service';

@Component({...})
export class MyComponent {
  protected i18n = inject(I18nService);

  // Access translations using computed signal
  get greeting() {
    return this.i18n.t().welcomeBack;
  }
}
```

### In Templates

```html
<!-- Using the t() computed signal -->
<h1>{{ i18n.t().appTitle }}</h1>
<button>{{ i18n.t().newGame }}</button>

<!-- Language selector -->
<app-language-selector></app-language-selector>
```

### Changing Language

```typescript
// Programmatically
i18n.setLocale('fr');

// Or use the language selector component
<app-language-selector></app-language-selector>
```

## Translation Keys

All translation keys are defined in `src/app/services/i18n.service.ts`:

### Categories

- **App**: appTitle, appSubtitle
- **Authentication**: signIn, signOut, signInWithGoogle, etc.
- **Menu**: game, newGame, hint, pass, about, settings
- **Difficulty**: beginner, novice, expert, master
- **Game Mode**: singlePlayer, multiplayer, playOnline
- **Game Status**: yourTurn, opponentsTurn, gameOver, etc.
- **Multiplayer**: lobby, createRoom, joinRoom, etc.
- **Leaderboard**: rank, wins, losses, winRate
- **Common**: ok, cancel, close, loading

## Adding a New Language

### Step 1: Define the locale

```typescript
// In i18n.service.ts
export const SUPPORTED_LOCALES: LocaleInfo[] = [
  // ... existing locales
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
];
```

### Step 2: Add translations

```typescript
// In i18n.service.ts
const ES_TRANSLATIONS: Translations = {
  appTitle: 'Reversi',
  appSubtitle: 'El Juego de Estrategia Clásico',
  signIn: 'Iniciar sesión',
  signInWithGoogle: 'Iniciar sesión con Google',
  // ... all other translations
};
```

### Step 3: Register translations

```typescript
// In i18n.service.ts
const TRANSLATIONS: Record<SupportedLocale, Translations> = {
  en: EN_TRANSLATIONS,
  fr: FR_TRANSLATIONS,
  nl: NL_TRANSLATIONS,
  da: DA_TRANSLATIONS,
  es: ES_TRANSLATIONS, // Add new language
};
```

## Adding New Translation Keys

### Step 1: Add to interface

```typescript
export interface Translations {
  // ... existing keys
  myNewKey: string;
}
```

### Step 2: Add to all language files

```typescript
const EN_TRANSLATIONS: Translations = {
  // ... existing translations
  myNewKey: 'My new text',
};

const FR_TRANSLATIONS: Translations = {
  // ... existing translations
  myNewKey: 'Mon nouveau texte',
};

// ... repeat for all languages
```

## Best Practices

1. **No hardcoded strings**: All user-facing text should use i18n
2. **Context**: Use descriptive key names that indicate context
3. **Pluralization**: For counts, consider separate keys (e.g., `win`, `wins`)
4. **Variables**: For dynamic content, use template strings in components

## Testing Languages

1. Use the language selector in the UI
2. Or set browser language preferences
3. Or manually test:

```typescript
// In browser console
localStorage.setItem('reversi-locale', 'fr');
location.reload();
```

## Language Selector Component

The `<app-language-selector>` component provides a dropdown menu:

```html
<app-language-selector></app-language-selector>
```

Features:
- Shows current language with flag
- Dropdown with all supported languages
- Native language names for accessibility
- Persists selection to localStorage
