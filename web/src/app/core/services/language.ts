import { computed, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

interface ILanguage {
  code: string;
  name: string;
  flagClass: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _languages = signal<ILanguage[]>([
    { code: 'ar', name: 'العربية', flagClass: 'flag-eg' },
    { code: 'en', name: 'English', flagClass: 'flag-us' },
    { code: 'fr', name: 'Français', flagClass: 'flag-fr' },
  ]);

  private readonly _currentLanguage = signal<ILanguage>(this.getInitialLanguage());

  readonly languages = this._languages.asReadonly();

  readonly currentSelectedLang = this._currentLanguage.asReadonly();
  readonly isRtl = computed(() => this._currentLanguage().code === 'ar');

  constructor(private readonly _translateService: TranslateService) {
    this._translateService.addLangs(['en', 'ar', 'fr']);
    this.setLanguage(this._currentLanguage());
  }

  setLanguage(selectedLanguage: ILanguage) {
    this._currentLanguage.set(selectedLanguage);

    localStorage.setItem('lang', JSON.stringify(selectedLanguage));
    this._translateService.use(selectedLanguage.code);

    document.documentElement.lang = selectedLanguage.code;
    document.documentElement.dir = selectedLanguage.code === 'ar' ? 'rtl' : 'ltr';
  }

  getInitialLanguage(): ILanguage {
    const storedLanguage = localStorage.getItem('lang');
    if (!storedLanguage) return this._languages()[0];

    try {
      const language = JSON.parse(storedLanguage) as ILanguage;
      if (!this.isSupportedLanguage(language)) {
        return this._languages()[0];
      }

      return language;
    } catch (error) {
      return this._languages()[0];
    }
  }
  isSupportedLanguage(language: ILanguage) {
    return this._languages().some((l) => l.code === language.code);
  }
}
