/**
 * Leaderboard Component
 * Displays global ranking of players
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';
import { environment } from '../../../environments/environment';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  photoUrl?: string;
  wins: number;
  totalGames: number;
  winRate: number;
  score: number;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <mat-card class="leaderboard-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>leaderboard</mat-icon>
        <mat-card-title>{{ i18n.translate('leaderboard') }}</mat-card-title>
        <mat-card-subtitle>{{ i18n.translate('totalGames') }}: {{ totalGames() }}</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        @if (isLoading()) {
          <div class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>{{ i18n.translate('loading') }}</p>
          </div>
        } @else if (error()) {
          <div class="error-container">
            <mat-icon color="warn">error</mat-icon>
            <p>{{ error() }}</p>
            <button mat-button color="primary" (click)="loadLeaderboard()">
              {{ i18n.translate('tryAgain') }}
            </button>
          </div>
        } @else {
          <!-- Current user's rank -->
          @if (myRank()) {
            <div class="my-rank-section">
              <div class="my-rank">
                <mat-icon>person</mat-icon>
                <span class="rank-label">{{ i18n.translate('yourRank') }}:</span>
                <span class="rank-value">#{{ myRank() }}</span>
              </div>
              <mat-divider></mat-divider>
            </div>
          }

          <!-- Leaderboard list -->
          <mat-list class="leaderboard-list">
            @for (entry of leaderboard(); track entry.userId) {
              <mat-list-item [class.current-user]="entry.userId === currentUserId()">
                <div class="rank-badge" [class.gold]="entry.rank === 1" 
                     [class.silver]="entry.rank === 2" 
                     [class.bronze]="entry.rank === 3"
                     matListItemIcon>
                  {{ entry.rank }}
                </div>
                
                @if (entry.photoUrl) {
                  <img [src]="entry.photoUrl" alt="Avatar" class="player-avatar" matListItemAvatar>
                } @else {
                  <mat-icon matListItemAvatar>account_circle</mat-icon>
                }
                
                <div matListItemTitle>{{ entry.displayName }}</div>
                <div matListItemLine class="stats-line">
                  <span class="stat">
                    <mat-icon class="stat-icon">emoji_events</mat-icon>
                    {{ entry.wins }} {{ i18n.translate('wins') }}
                  </span>
                  <span class="stat">
                    <mat-icon class="stat-icon">percent</mat-icon>
                    {{ entry.winRate }}%
                  </span>
                  <span class="stat score">
                    {{ entry.score }} pts
                  </span>
                </div>
              </mat-list-item>
            } @empty {
              <div class="empty-state">
                <mat-icon>sports_esports</mat-icon>
                <p>No games played yet. Be the first!</p>
              </div>
            }
          </mat-list>
        }
      </mat-card-content>

      <mat-card-actions>
        <button mat-button (click)="loadLeaderboard()">
          <mat-icon>refresh</mat-icon>
          {{ i18n.translate('refresh') }}
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .leaderboard-card {
      max-width: 500px;
      margin: 1rem auto;
    }

    .loading-container,
    .error-container,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      gap: 1rem;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #666;
    }

    .my-rank-section {
      padding: 1rem;
      background: rgba(63, 81, 181, 0.1);
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .my-rank {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
    }

    .rank-value {
      font-size: 1.25rem;
      color: #3f51b5;
    }

    .leaderboard-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .rank-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e0e0e0;
      font-weight: bold;
      font-size: 14px;
    }

    .rank-badge.gold {
      background: linear-gradient(135deg, #ffd700, #ffb300);
      color: white;
    }

    .rank-badge.silver {
      background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
      color: white;
    }

    .rank-badge.bronze {
      background: linear-gradient(135deg, #cd7f32, #8b5a2b);
      color: white;
    }

    .player-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .stats-line {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: #666;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .stat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .score {
      font-weight: 600;
      color: #3f51b5;
    }

    .current-user {
      background: rgba(63, 81, 181, 0.08);
      border-radius: 8px;
    }

    mat-card-actions {
      padding: 8px 16px;
    }
  `],
})
export class LeaderboardComponent implements OnInit {
  protected i18n = inject(I18nService);
  private auth = inject(AuthService);

  leaderboard = signal<LeaderboardEntry[]>([]);
  myRank = signal<number | null>(null);
  totalGames = signal(0);
  isLoading = signal(false);
  error = signal<string | null>(null);

  currentUserId = () => this.auth.user()?.id || null;

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  async loadLeaderboard(): Promise<void> {
    const token = this.auth.token();
    if (!token) {
      this.error.set('Authentication required');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Fetch leaderboard
      const response = await fetch(`${environment.backendUrl}/scores/leaderboard?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      this.leaderboard.set(data.leaderboard || []);

      // Calculate total games
      const total = data.leaderboard?.reduce((sum: number, e: LeaderboardEntry) => sum + e.totalGames, 0) || 0;
      this.totalGames.set(total);

      // Fetch current user's rank
      await this.loadMyRank();
    } catch (err) {
      console.error('Leaderboard error:', err);
      this.error.set('Failed to load leaderboard');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadMyRank(): Promise<void> {
    const token = this.auth.token();
    if (!token) return;

    try {
      const response = await fetch(`${environment.backendUrl}/scores/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.myRank.set(data.rank);
      }
    } catch {
      // Ignore errors for rank
    }
  }
}
