/**
 * About Dialog Component
 * Windows 2.0 style about dialog
 * Replicates the About Reversi dialog from original
 */

import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-about-dialog',
    imports: [CommonModule],
    template: `
    <div class="dialog-overlay" (click)="close.emit()">
      <div class="dialog-window" (click)="$event.stopPropagation()">
        <div class="dialog-titlebar">
          <span class="dialog-title">About Reversi</span>
          <button class="close-button" (click)="close.emit()">×</button>
        </div>
        <div class="dialog-content">
          <div class="icon-section">
            <div class="reversi-icon">
              <div class="icon-piece black"></div>
              <div class="icon-piece white"></div>
            </div>
          </div>
          <div class="text-section">
            <div class="app-name">Microsoft Reversi</div>
            <div class="version">Version 1.0</div>
            <div class="copyright">Copyright © 1985-1988</div>
            <div class="copyright">Microsoft Corporation</div>
          </div>
        </div>
        <div class="dialog-buttons">
          <button class="ok-button" (click)="close.emit()">OK</button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    
    .dialog-window {
      background-color: #c0c0c0;
      border: 2px outset #c0c0c0;
      box-shadow: 4px 4px 0 #000000;
      min-width: 280px;
      font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
      font-size: 12px;
    }
    
    .dialog-titlebar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(to right, #000080, #1084d0);
      color: #ffffff;
      padding: 2px 4px;
      font-weight: bold;
    }
    
    .close-button {
      background-color: #c0c0c0;
      border: 2px outset #c0c0c0;
      width: 18px;
      height: 18px;
      font-size: 14px;
      line-height: 1;
      padding: 0;
      cursor: pointer;
      font-weight: bold;
    }
    
    .close-button:active {
      border-style: inset;
    }
    
    .dialog-content {
      display: flex;
      padding: 16px;
      gap: 16px;
    }
    
    .icon-section {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .reversi-icon {
      width: 48px;
      height: 48px;
      background-color: #008000;
      border: 2px solid #000000;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      padding: 4px;
      gap: 2px;
    }
    
    .icon-piece {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1px solid #000000;
    }
    
    .icon-piece.black {
      background-color: #000000;
    }
    
    .icon-piece.white {
      background-color: #ffffff;
    }
    
    .text-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .app-name {
      font-weight: bold;
      font-size: 14px;
    }
    
    .version {
      color: #000000;
    }
    
    .copyright {
      color: #404040;
    }
    
    .dialog-buttons {
      display: flex;
      justify-content: center;
      padding: 12px;
      border-top: 1px solid #808080;
    }
    
    .ok-button {
      min-width: 75px;
      padding: 4px 16px;
      background-color: #c0c0c0;
      border: 2px outset #c0c0c0;
      font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
      font-size: 12px;
      cursor: pointer;
    }
    
    .ok-button:active {
      border-style: inset;
    }
    
    .ok-button:focus {
      outline: 1px dotted #000000;
      outline-offset: -4px;
    }
  `]
})
export class AboutDialogComponent {
  @Output() close = new EventEmitter<void>();
}
