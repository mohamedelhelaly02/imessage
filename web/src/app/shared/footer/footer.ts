import { Component, HostListener, inject, signal } from '@angular/core';
import { LanguageService } from '../../core/services/language';
import { UpperCasePipe, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [UpperCasePipe, NgClass, TranslatePipe],
  selector: 'app-footer',
  styleUrl: './footer.css',
  templateUrl: './footer.html',
})
export class Footer {
  readonly currentYear = signal(new Date().getFullYear());
  isOpen = signal<boolean>(false);
  private readonly _languageService = inject(LanguageService);
  readonly languages = this._languageService.languages;
  readonly selectedLanguage = this._languageService.currentSelectedLang;

  toggleOpen(event: Event): void {
    event.stopPropagation();
    this.isOpen.update((v) => !v);
  }

  selectLanguage(lang: any) {
    this._languageService.setLanguage(lang);
  }

  @HostListener('document:click')
  closeOnOutsideClick(): void {
    this.isOpen.set(false);
  }
}
