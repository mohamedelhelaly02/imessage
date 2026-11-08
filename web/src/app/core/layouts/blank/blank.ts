import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BlankNavbar } from '../../../shared/blank-navbar/blank-navbar';
import { LanguageService } from '../../services/language';
import { AuthStore } from '../../../features/auth/services/store';
import { Footer } from '../../../shared/footer/footer';
import { Sidebar } from './sidebar/sidebar';

@Component({
  imports: [RouterOutlet, BlankNavbar, Footer, Sidebar],
  selector: 'app-blank',
  styleUrl: './blank.css',
  templateUrl: './blank.html',
})
export class Blank {
  private readonly _authStore = inject(AuthStore);
  readonly isRtl = inject(LanguageService).isRtl;
  onLogout() {
    if (confirm('Are you sure to signout ?')) {
      this._authStore.logout().subscribe();
    }
  }
}
