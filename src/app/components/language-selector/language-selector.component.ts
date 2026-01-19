/**
 * Language Selector Component
 * Allows users to switch between supported languages
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { I18nService, SupportedLocale } from '../../services/i18n.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <button 
      mat-icon-button
      [matMenuTriggerFor]="langMenu"
      [matTooltip]="i18n.translate('language')"
      class="!text-slate-300 hover:!text-white hover:!bg-white/10">
      <span class="flag text-xl">{{ i18n.currentLocaleInfo().flag }}</span>
    </button>

    <mat-menu #langMenu="matMenu" class="language-menu">
      @for (locale of i18n.supportedLocales; track locale.code) {
        <button 
          mat-menu-item 
          (click)="selectLanguage(locale.code)"
          [class.selected]="locale.code === i18n.currentLocale()">
          <span class="flag">{{ locale.flag }}</span>
          <span class="native-name">{{ locale.nativeName }}</span>
          @if (locale.code === i18n.currentLocale()) {
            <mat-icon>check</mat-icon>
          }
        </button>
      }
    </mat-menu>
  `,
  styles: [`
    .flag {
      font-size: 1.25rem;
      margin-right: 0.5rem;
    }

    .lang-name {
      margin-right: 0.25rem;
    }

    ::ng-deep .language-menu {
      .mat-mdc-menu-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .native-name {
        font-weight: 500;
        flex: 1;
      }

      .selected {
        background-color: rgba(63, 81, 181, 0.08);
      }
    }
  `],
})
export class LanguageSelectorComponent {
  protected i18n = inject(I18nService);

  selectLanguage(locale: SupportedLocale): void {
    this.i18n.setLocale(locale);
  }
}
