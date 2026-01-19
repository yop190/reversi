/**
 * Internationalization (i18n) Service
 * Handles language detection, switching, and translations
 * Supported languages: English, French, Dutch, Danish
 */

import { Injectable, signal, computed, LOCALE_ID, Inject } from '@angular/core';

export type SupportedLocale = 'en' | 'fr' | 'nl' | 'da';

export interface LocaleInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
];

// Translation keys organized by category
export interface Translations {
  // App
  appTitle: string;
  appSubtitle: string;
  
  // Authentication
  signIn: string;
  signInWithGoogle: string;
  signOut: string;
  signInRequired: string;
  welcomeBack: string;
  
  // Menu
  game: string;
  newGame: string;
  hint: string;
  pass: string;
  about: string;
  settings: string;
  language: string;
  
  // Difficulty
  difficulty: string;
  beginner: string;
  novice: string;
  expert: string;
  master: string;
  easy: string;
  medium: string;
  hard: string;
  veryHard: string;
  
  // Game Mode
  singlePlayer: string;
  multiplayer: string;
  playVsComputer: string;
  playOnline: string;
  backToMenu: string;
  
  // Game Status
  yourTurn: string;
  opponentsTurn: string;
  thinking: string;
  gameOver: string;
  youWin: string;
  youLose: string;
  draw: string;
  blackWins: string;
  whiteWins: string;
  score: string;
  
  // Multiplayer
  lobby: string;
  createRoom: string;
  joinRoom: string;
  leaveRoom: string;
  roomName: string;
  players: string;
  spectators: string;
  waitingForOpponent: string;
  opponentJoined: string;
  opponentLeft: string;
  connected: string;
  disconnected: string;
  connecting: string;
  onlinePlayers: string;
  availableRooms: string;
  noRoomsAvailable: string;
  inProgress: string;
  disconnect: string;
  enterLobby: string;
  enterUsername: string;
  username: string;
  gameLobby: string;
  playersOnline: string;
  quickJoin: string;
  watching: string;
  waiting: string;
  ready: string;
  join: string;
  watch: string;
  createNewRoom: string;
  spectatorMode: string;
  room: string;
  startGame: string;
  shareRoomId: string;
  readyToPlay: string;
  copyRoomId: string;
  yourScore: string;
  opponentScore: string;
  you: string;
  black: string;
  white: string;
  
  // Leaderboard
  leaderboard: string;
  rank: string;
  wins: string;
  losses: string;
  draws: string;
  totalGames: string;
  winRate: string;
  yourRank: string;
  
  // About
  aboutTitle: string;
  aboutDescription: string;
  version: string;
  credits: string;
  
  // Errors
  errorOccurred: string;
  connectionError: string;
  authenticationError: string;
  invalidMove: string;
  tryAgain: string;
  
  // Common
  ok: string;
  cancel: string;
  close: string;
  loading: string;
  refresh: string;
  play: string;
  restart: string;
  
  // Music
  musicSettings: string;
  adaptiveMusic: string;
  masterVolume: string;
  musicMode: string;
  solo: string;
  fullAdaptive: string;
  subtleAdaptive: string;
  neutralOnly: string;
  competitive: string;
  currentMood: string;
  winning: string;
  losing: string;
  neutral: string;
  advancedControls: string;
  showAdvanced: string;
  bass: string;
  harmony: string;
  melody: string;
  rhythm: string;
  accents: string;
  musicHelpSolo: string;
  musicHelpMultiplayer: string;
  musicHelpCompetitive: string;
  enableMusic: string;
  disableMusic: string;
  muteMusic: string;
  musicOn: string;
  musicOff: string;
  sounds: string;
  muteSounds: string;
  enableSounds: string;
}

// English translations (default)
const EN_TRANSLATIONS: Translations = {
  appTitle: 'Reversi',
  appSubtitle: 'The Classic Strategy Game',
  
  signIn: 'Sign In',
  signInWithGoogle: 'Sign in with Google',
  signOut: 'Sign Out',
  signInRequired: 'Please sign in to continue',
  welcomeBack: 'Welcome back',
  
  game: 'Game',
  newGame: 'New Game',
  hint: 'Hint',
  pass: 'Pass',
  about: 'About',
  settings: 'Settings',
  language: 'Language',
  
  difficulty: 'Difficulty',
  beginner: 'Beginner',
  novice: 'Novice',
  expert: 'Expert',
  master: 'Master',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  veryHard: 'Very Hard',
  
  singlePlayer: 'Single Player',
  multiplayer: 'Multiplayer',
  playVsComputer: 'Play vs Computer',
  playOnline: 'Play Online',
  backToMenu: 'Back to Menu',
  
  yourTurn: 'Your Turn',
  opponentsTurn: "Opponent's Turn",
  thinking: 'Thinking...',
  gameOver: 'Game Over',
  youWin: 'You Win!',
  youLose: 'You Lose',
  draw: "It's a Draw!",
  blackWins: 'Black Wins!',
  whiteWins: 'White Wins!',
  score: 'Score',
  
  lobby: 'Lobby',
  createRoom: 'Create Room',
  joinRoom: 'Join Room',
  leaveRoom: 'Leave Room',
  roomName: 'Room Name',
  players: 'Players',
  spectators: 'Spectators',
  waitingForOpponent: 'Waiting for opponent...',
  opponentJoined: 'Opponent joined!',
  opponentLeft: 'Opponent left the game',
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  onlinePlayers: 'Online Players',
  availableRooms: 'Available Rooms',
  noRoomsAvailable: 'No rooms available',
  inProgress: 'In Progress',
  disconnect: 'Disconnect',
  enterLobby: 'Enter Lobby',
  enterUsername: 'Enter your username to start playing',
  username: 'Username',
  gameLobby: 'Game Lobby',
  playersOnline: 'players online',
  quickJoin: 'Quick Join',
  watching: 'watching',
  waiting: 'Waiting',
  ready: 'Ready',
  join: 'Join',
  watch: 'Watch',
  createNewRoom: 'Create New Room',
  spectatorMode: 'Spectator Mode',
  room: 'Room',
  startGame: 'Start Game',
  shareRoomId: 'Share the room ID with a friend to start playing!',
  readyToPlay: 'Ready to play!',
  copyRoomId: 'Copy Room ID',
  yourScore: 'Your Score',
  opponentScore: 'Opponent Score',
  you: 'You',
  black: 'Black',
  white: 'White',
  
  leaderboard: 'Leaderboard',
  rank: 'Rank',
  wins: 'Wins',
  losses: 'Losses',
  draws: 'Draws',
  totalGames: 'Total Games',
  winRate: 'Win Rate',
  yourRank: 'Your Rank',
  
  aboutTitle: 'About Reversi',
  aboutDescription: 'A modern implementation of the classic Reversi/Othello game. Challenge the computer or play online with friends!',
  version: 'Version',
  credits: 'Credits',
  
  errorOccurred: 'An error occurred',
  connectionError: 'Connection error',
  authenticationError: 'Authentication failed',
  invalidMove: 'Invalid move',
  tryAgain: 'Try again',
  
  ok: 'OK',
  cancel: 'Cancel',
  close: 'Close',
  loading: 'Loading...',
  refresh: 'Refresh',
  play: 'Play',
  restart: 'Restart',
  
  musicSettings: 'Music Settings',
  adaptiveMusic: 'Adaptive Music',
  masterVolume: 'Master Volume',
  musicMode: 'Music Mode',
  solo: 'Solo',
  fullAdaptive: 'Full adaptive music',
  subtleAdaptive: 'Subtle adaptation',
  neutralOnly: 'Neutral only',
  competitive: 'Competitive',
  currentMood: 'Current Mood',
  winning: 'Winning',
  losing: 'Losing',
  neutral: 'Neutral',
  advancedControls: 'Advanced Layer Controls',
  showAdvanced: 'Show Advanced Controls',
  bass: 'Bass',
  harmony: 'Harmony',
  melody: 'Melody',
  rhythm: 'Rhythm',
  accents: 'Accents',
  musicHelpSolo: 'Music adapts to your game state - brighter when winning, gentler when losing, always supportive.',
  musicHelpMultiplayer: 'Subtle musical changes maintain fairness while keeping the game pleasant.',
  musicHelpCompetitive: 'Neutral, consistent music ensures no player gets emotional feedback from audio.',
  enableMusic: 'Enable music',
  disableMusic: 'Disable music',
  muteMusic: 'Mute music',
  musicOn: 'Music On',
  musicOff: 'Music Off',
  sounds: 'Sounds',
  muteSounds: 'Mute sounds',
  enableSounds: 'Enable sounds',
};

// French translations
const FR_TRANSLATIONS: Translations = {
  appTitle: 'Reversi',
  appSubtitle: 'Le Jeu de Stratégie Classique',
  
  signIn: 'Connexion',
  signInWithGoogle: 'Se connecter avec Google',
  signOut: 'Déconnexion',
  signInRequired: 'Veuillez vous connecter pour continuer',
  welcomeBack: 'Bon retour',
  
  game: 'Jeu',
  newGame: 'Nouvelle Partie',
  hint: 'Indice',
  pass: 'Passer',
  about: 'À propos',
  settings: 'Paramètres',
  language: 'Langue',
  
  difficulty: 'Difficulté',
  beginner: 'Débutant',
  novice: 'Novice',
  expert: 'Expert',
  master: 'Maître',
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
  veryHard: 'Très Difficile',
  
  singlePlayer: 'Un Joueur',
  multiplayer: 'Multijoueur',
  playVsComputer: 'Jouer contre l\'ordinateur',
  playOnline: 'Jouer en ligne',
  backToMenu: 'Retour au menu',
  
  yourTurn: 'Votre Tour',
  opponentsTurn: 'Tour de l\'adversaire',
  thinking: 'Réflexion...',
  gameOver: 'Partie Terminée',
  youWin: 'Vous avez gagné !',
  youLose: 'Vous avez perdu',
  draw: 'Match nul !',
  blackWins: 'Les Noirs gagnent !',
  whiteWins: 'Les Blancs gagnent !',
  score: 'Score',
  
  lobby: 'Salon',
  createRoom: 'Créer une salle',
  joinRoom: 'Rejoindre une salle',
  leaveRoom: 'Quitter la salle',
  roomName: 'Nom de la salle',
  players: 'Joueurs',
  spectators: 'Spectateurs',
  waitingForOpponent: 'En attente d\'un adversaire...',
  opponentJoined: 'L\'adversaire a rejoint !',
  opponentLeft: 'L\'adversaire a quitté la partie',
  connected: 'Connecté',
  disconnected: 'Déconnecté',
  connecting: 'Connexion...',
  onlinePlayers: 'Joueurs en ligne',
  availableRooms: 'Salles disponibles',
  noRoomsAvailable: 'Aucune salle disponible',
  inProgress: 'En cours',
  disconnect: 'Se déconnecter',
  enterLobby: 'Entrer dans le salon',
  enterUsername: 'Entrez votre nom pour commencer à jouer',
  username: 'Nom d\'utilisateur',
  gameLobby: 'Salon de jeu',
  playersOnline: 'joueurs en ligne',
  quickJoin: 'Rejoindre rapidement',
  watching: 'regardent',
  waiting: 'En attente',
  ready: 'Prêt',
  join: 'Rejoindre',
  watch: 'Regarder',
  createNewRoom: 'Créer une nouvelle salle',
  spectatorMode: 'Mode spectateur',
  room: 'Salle',
  startGame: 'Commencer la partie',
  shareRoomId: 'Partagez l\'ID de la salle avec un ami pour commencer !',
  readyToPlay: 'Prêt à jouer !',
  copyRoomId: 'Copier l\'ID de la salle',
  yourScore: 'Votre score',
  opponentScore: 'Score adversaire',
  you: 'Vous',
  black: 'Noir',
  white: 'Blanc',
  
  leaderboard: 'Classement',
  rank: 'Rang',
  wins: 'Victoires',
  losses: 'Défaites',
  draws: 'Nuls',
  totalGames: 'Parties jouées',
  winRate: 'Taux de victoire',
  yourRank: 'Votre rang',
  
  aboutTitle: 'À propos de Reversi',
  aboutDescription: 'Une implémentation moderne du jeu classique Reversi/Othello. Défiez l\'ordinateur ou jouez en ligne avec vos amis !',
  version: 'Version',
  credits: 'Crédits',
  
  errorOccurred: 'Une erreur s\'est produite',
  connectionError: 'Erreur de connexion',
  authenticationError: 'Échec de l\'authentification',
  invalidMove: 'Coup invalide',
  tryAgain: 'Réessayer',
  
  ok: 'OK',
  cancel: 'Annuler',
  close: 'Fermer',
  loading: 'Chargement...',
  refresh: 'Actualiser',
  play: 'Jouer',
  restart: 'Recommencer',
  
  musicSettings: 'Paramètres Musique',
  adaptiveMusic: 'Musique Adaptative',
  masterVolume: 'Volume Principal',
  musicMode: 'Mode Musique',
  solo: 'Solo',
  fullAdaptive: 'Musique entièrement adaptative',
  subtleAdaptive: 'Adaptation subtile',
  neutralOnly: 'Neutre uniquement',
  competitive: 'Compétitif',
  currentMood: 'Humeur Actuelle',
  winning: 'Gagnant',
  losing: 'Perdant',
  neutral: 'Neutre',
  advancedControls: 'Contrôles Avancés des Couches',
  showAdvanced: 'Afficher les Contrôles Avancés',
  bass: 'Basse',
  harmony: 'Harmonie',
  melody: 'Mélodie',
  rhythm: 'Rythme',
  accents: 'Accents',
  musicHelpSolo: 'La musique s\'adapte à votre état de jeu - plus lumineuse quand vous gagnez, plus douce quand vous perdez.',
  musicHelpMultiplayer: 'Des changements musicaux subtils maintiennent l\'équité tout en gardant le jeu agréable.',
  musicHelpCompetitive: 'Une musique neutre et constante garantit qu\'aucun joueur ne reçoit de feedback émotionnel de l\'audio.',
  enableMusic: 'Activer la musique',
  disableMusic: 'Désactiver la musique',
  muteMusic: 'Couper la musique',
  musicOn: 'Musique activée',
  musicOff: 'Musique désactivée',
  sounds: 'Sons',
  muteSounds: 'Couper les sons',
  enableSounds: 'Activer les sons',
};

// Dutch translations
const NL_TRANSLATIONS: Translations = {
  appTitle: 'Reversi',
  appSubtitle: 'Het Klassieke Strategiespel',
  
  signIn: 'Inloggen',
  signInWithGoogle: 'Inloggen met Google',
  signOut: 'Uitloggen',
  signInRequired: 'Log in om door te gaan',
  welcomeBack: 'Welkom terug',
  
  game: 'Spel',
  newGame: 'Nieuw Spel',
  hint: 'Hint',
  pass: 'Passen',
  about: 'Over',
  settings: 'Instellingen',
  language: 'Taal',
  
  difficulty: 'Moeilijkheid',
  beginner: 'Beginner',
  novice: 'Nieuweling',
  expert: 'Expert',
  master: 'Meester',
  easy: 'Makkelijk',
  medium: 'Gemiddeld',
  hard: 'Moeilijk',
  veryHard: 'Zeer Moeilijk',
  
  singlePlayer: 'Eén Speler',
  multiplayer: 'Multiplayer',
  playVsComputer: 'Spelen tegen Computer',
  playOnline: 'Online Spelen',
  backToMenu: 'Terug naar Menu',
  
  yourTurn: 'Jouw Beurt',
  opponentsTurn: 'Beurt van Tegenstander',
  thinking: 'Aan het denken...',
  gameOver: 'Spel Voorbij',
  youWin: 'Je Wint!',
  youLose: 'Je Verliest',
  draw: 'Gelijkspel!',
  blackWins: 'Zwart Wint!',
  whiteWins: 'Wit Wint!',
  score: 'Score',
  
  lobby: 'Lobby',
  createRoom: 'Kamer Aanmaken',
  joinRoom: 'Kamer Betreden',
  leaveRoom: 'Kamer Verlaten',
  roomName: 'Kamernaam',
  players: 'Spelers',
  spectators: 'Toeschouwers',
  waitingForOpponent: 'Wachten op tegenstander...',
  opponentJoined: 'Tegenstander aangesloten!',
  opponentLeft: 'Tegenstander heeft het spel verlaten',
  connected: 'Verbonden',
  disconnected: 'Niet verbonden',
  connecting: 'Verbinden...',
  onlinePlayers: 'Online Spelers',
  availableRooms: 'Beschikbare Kamers',
  noRoomsAvailable: 'Geen kamers beschikbaar',
  inProgress: 'Bezig',
  disconnect: 'Verbinding verbreken',
  enterLobby: 'Lobby betreden',
  enterUsername: 'Voer je gebruikersnaam in om te beginnen',
  username: 'Gebruikersnaam',
  gameLobby: 'Spellobby',
  playersOnline: 'spelers online',
  quickJoin: 'Snel deelnemen',
  watching: 'kijken',
  waiting: 'Wachten',
  ready: 'Klaar',
  join: 'Deelnemen',
  watch: 'Kijken',
  createNewRoom: 'Nieuwe kamer aanmaken',
  spectatorMode: 'Toeschouwermodus',
  room: 'Kamer',
  startGame: 'Spel starten',
  shareRoomId: 'Deel de kamer-ID met een vriend om te beginnen!',
  readyToPlay: 'Klaar om te spelen!',
  copyRoomId: 'Kamer-ID kopiëren',
  yourScore: 'Jouw score',
  opponentScore: 'Score tegenstander',
  you: 'Jij',
  black: 'Zwart',
  white: 'Wit',
  
  leaderboard: 'Ranglijst',
  rank: 'Rang',
  wins: 'Overwinningen',
  losses: 'Verliezen',
  draws: 'Gelijkspelen',
  totalGames: 'Totale Spellen',
  winRate: 'Winstpercentage',
  yourRank: 'Jouw Rang',
  
  aboutTitle: 'Over Reversi',
  aboutDescription: 'Een moderne implementatie van het klassieke Reversi/Othello spel. Daag de computer uit of speel online met vrienden!',
  version: 'Versie',
  credits: 'Credits',
  
  errorOccurred: 'Er is een fout opgetreden',
  connectionError: 'Verbindingsfout',
  authenticationError: 'Authenticatie mislukt',
  invalidMove: 'Ongeldige zet',
  tryAgain: 'Probeer opnieuw',
  
  ok: 'OK',
  cancel: 'Annuleren',
  close: 'Sluiten',
  loading: 'Laden...',
  refresh: 'Vernieuwen',
  play: 'Spelen',
  restart: 'Herstarten',
  
  musicSettings: 'Muziekinstellingen',
  adaptiveMusic: 'Adaptieve Muziek',
  masterVolume: 'Hoofdvolume',
  musicMode: 'Muziekmodus',
  solo: 'Solo',
  fullAdaptive: 'Volledig adaptieve muziek',
  subtleAdaptive: 'Subtiele aanpassing',
  neutralOnly: 'Alleen neutraal',
  competitive: 'Competitief',
  currentMood: 'Huidige Stemming',
  winning: 'Winnend',
  losing: 'Verliezend',
  neutral: 'Neutraal',
  advancedControls: 'Geavanceerde Laagcontroles',
  showAdvanced: 'Toon Geavanceerde Controles',
  bass: 'Bas',
  harmony: 'Harmonie',
  melody: 'Melodie',
  rhythm: 'Ritme',
  accents: 'Accenten',
  musicHelpSolo: 'Muziek past zich aan je spelstatus aan - helderder bij winnen, zachter bij verliezen.',
  musicHelpMultiplayer: 'Subtiele muzikale veranderingen behouden eerlijkheid terwijl het spel prettig blijft.',
  musicHelpCompetitive: 'Neutrale, consistente muziek zorgt dat geen speler emotionele feedback krijgt van audio.',
  enableMusic: 'Muziek inschakelen',
  disableMusic: 'Muziek uitschakelen',
  muteMusic: 'Muziek dempen',
  musicOn: 'Muziek aan',
  musicOff: 'Muziek uit',
  sounds: 'Geluiden',
  muteSounds: 'Geluiden dempen',
  enableSounds: 'Geluiden inschakelen',
};

// Danish translations
const DA_TRANSLATIONS: Translations = {
  appTitle: 'Reversi',
  appSubtitle: 'Det Klassiske Strategispil',
  
  signIn: 'Log ind',
  signInWithGoogle: 'Log ind med Google',
  signOut: 'Log ud',
  signInRequired: 'Log venligst ind for at fortsætte',
  welcomeBack: 'Velkommen tilbage',
  
  game: 'Spil',
  newGame: 'Nyt Spil',
  hint: 'Hint',
  pass: 'Pas',
  about: 'Om',
  settings: 'Indstillinger',
  language: 'Sprog',
  
  difficulty: 'Sværhedsgrad',
  beginner: 'Begynder',
  novice: 'Nybegynder',
  expert: 'Ekspert',
  master: 'Mester',
  easy: 'Let',
  medium: 'Mellem',
  hard: 'Svær',
  veryHard: 'Meget Svær',
  
  singlePlayer: 'Enkeltspiller',
  multiplayer: 'Multiplayer',
  playVsComputer: 'Spil mod Computer',
  playOnline: 'Spil Online',
  backToMenu: 'Tilbage til Menu',
  
  yourTurn: 'Din Tur',
  opponentsTurn: 'Modstanderens Tur',
  thinking: 'Tænker...',
  gameOver: 'Spil Slut',
  youWin: 'Du Vinder!',
  youLose: 'Du Taber',
  draw: 'Uafgjort!',
  blackWins: 'Sort Vinder!',
  whiteWins: 'Hvid Vinder!',
  score: 'Score',
  
  lobby: 'Lobby',
  createRoom: 'Opret Rum',
  joinRoom: 'Tilslut Rum',
  leaveRoom: 'Forlad Rum',
  roomName: 'Rumnavn',
  players: 'Spillere',
  spectators: 'Tilskuere',
  waitingForOpponent: 'Venter på modstander...',
  opponentJoined: 'Modstander tilsluttet!',
  opponentLeft: 'Modstander forlod spillet',
  connected: 'Forbundet',
  disconnected: 'Afbrudt',
  connecting: 'Forbinder...',
  onlinePlayers: 'Online Spillere',
  availableRooms: 'Tilgængelige Rum',
  noRoomsAvailable: 'Ingen rum tilgængelige',
  inProgress: 'I Gang',
  disconnect: 'Afbryd forbindelse',
  enterLobby: 'Gå ind i lobby',
  enterUsername: 'Indtast dit brugernavn for at begynde',
  username: 'Brugernavn',
  gameLobby: 'Spillobby',
  playersOnline: 'spillere online',
  quickJoin: 'Hurtig tilslutning',
  watching: 'ser',
  waiting: 'Venter',
  ready: 'Klar',
  join: 'Tilslut',
  watch: 'Se',
  createNewRoom: 'Opret nyt rum',
  spectatorMode: 'Tilskuertilstand',
  room: 'Rum',
  startGame: 'Start spil',
  shareRoomId: 'Del rum-ID med en ven for at begynde!',
  readyToPlay: 'Klar til at spille!',
  copyRoomId: 'Kopier rum-ID',
  yourScore: 'Din score',
  opponentScore: 'Modstanders score',
  you: 'Dig',
  black: 'Sort',
  white: 'Hvid',
  
  leaderboard: 'Rangliste',
  rank: 'Rang',
  wins: 'Sejre',
  losses: 'Tab',
  draws: 'Uafgjorte',
  totalGames: 'Totale Spil',
  winRate: 'Vinderprocent',
  yourRank: 'Din Rang',
  
  aboutTitle: 'Om Reversi',
  aboutDescription: 'En moderne implementering af det klassiske Reversi/Othello spil. Udfordr computeren eller spil online med venner!',
  version: 'Version',
  credits: 'Credits',
  
  errorOccurred: 'Der opstod en fejl',
  connectionError: 'Forbindelsesfejl',
  authenticationError: 'Godkendelse mislykkedes',
  invalidMove: 'Ugyldigt træk',
  tryAgain: 'Prøv igen',
  
  ok: 'OK',
  cancel: 'Annuller',
  close: 'Luk',
  loading: 'Indlæser...',
  refresh: 'Opdater',
  play: 'Spil',
  restart: 'Genstart',
  
  musicSettings: 'Musikindstillinger',
  adaptiveMusic: 'Adaptiv Musik',
  masterVolume: 'Hovedvolumen',
  musicMode: 'Musiktilstand',
  solo: 'Solo',
  fullAdaptive: 'Fuldt adaptiv musik',
  subtleAdaptive: 'Subtil tilpasning',
  neutralOnly: 'Kun neutral',
  competitive: 'Konkurrence',
  currentMood: 'Nuværende Stemning',
  winning: 'Vinder',
  losing: 'Taber',
  neutral: 'Neutral',
  advancedControls: 'Avancerede Lagkontroller',
  showAdvanced: 'Vis Avancerede Kontroller',
  bass: 'Bas',
  harmony: 'Harmoni',
  melody: 'Melodi',
  rhythm: 'Rytme',
  accents: 'Accenter',
  musicHelpSolo: 'Musikken tilpasser sig din spilstatus - lysere når du vinder, blødere når du taber.',
  musicHelpMultiplayer: 'Subtile musikalske ændringer opretholder fairness mens spillet forbliver behageligt.',
  musicHelpCompetitive: 'Neutral, konsistent musik sikrer at ingen spiller får følelsesmæssig feedback fra lyd.',
  enableMusic: 'Aktiver musik',
  disableMusic: 'Deaktiver musik',
  muteMusic: 'Slå musik fra',
  musicOn: 'Musik til',
  musicOff: 'Musik fra',
  sounds: 'Lyde',
  muteSounds: 'Slå lyde fra',
  enableSounds: 'Aktiver lyde',
};

const TRANSLATIONS: Record<SupportedLocale, Translations> = {
  en: EN_TRANSLATIONS,
  fr: FR_TRANSLATIONS,
  nl: NL_TRANSLATIONS,
  da: DA_TRANSLATIONS,
};

const STORAGE_KEY = 'reversi-locale';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private _currentLocale = signal<SupportedLocale>(this.detectLocale());
  
  readonly currentLocale = this._currentLocale.asReadonly();
  readonly supportedLocales = SUPPORTED_LOCALES;
  
  readonly currentLocaleInfo = computed(() => {
    const code = this._currentLocale();
    return SUPPORTED_LOCALES.find(l => l.code === code) || SUPPORTED_LOCALES[0];
  });

  // Note: Use translate() or t() method for getting translations

  constructor(@Inject(LOCALE_ID) private localeId: string) {
    // Initialize with detected or stored locale
    const stored = this.getStoredLocale();
    if (stored) {
      this._currentLocale.set(stored);
    }
  }

  /**
   * Change the current locale
   */
  setLocale(locale: SupportedLocale): void {
    if (TRANSLATIONS[locale]) {
      this._currentLocale.set(locale);
      this.storeLocale(locale);
      // Update document language
      document.documentElement.lang = locale;
    }
  }

  /**
   * Get a translation by key
   */
  translate(key: keyof Translations): string {
    return TRANSLATIONS[this._currentLocale()][key];
  }

  /**
   * Shorthand for translate (supports dot notation for auth.* keys)
   */
  t(key: string): string {
    // Handle dot notation for nested-like access
    const translationKey = key.replace('.', '') as keyof Translations;
    
    // Map dot notation keys to actual translation keys
    const keyMap: Record<string, keyof Translations> = {
      'auth.signInRequired': 'signInRequired',
      'auth.signedIn': 'welcomeBack',
      'auth.signedOut': 'signOut',
    };
    
    const mappedKey = keyMap[key] || translationKey;
    return this.translate(mappedKey as keyof Translations) || key;
  }

  /**
   * Detect the best locale based on browser settings
   */
  private detectLocale(): SupportedLocale {
    // Check stored preference first
    const stored = this.getStoredLocale();
    if (stored) {
      return stored;
    }

    // Check browser language
    const browserLang = navigator.language?.toLowerCase() || 'en';
    const langCode = browserLang.split('-')[0] as SupportedLocale;
    
    if (TRANSLATIONS[langCode]) {
      return langCode;
    }

    // Default to English
    return 'en';
  }

  /**
   * Get stored locale from localStorage
   */
  private getStoredLocale(): SupportedLocale | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && TRANSLATIONS[stored as SupportedLocale]) {
        return stored as SupportedLocale;
      }
    } catch {
      // localStorage not available
    }
    return null;
  }

  /**
   * Store locale preference
   */
  private storeLocale(locale: SupportedLocale): void {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // localStorage not available
    }
  }
}
