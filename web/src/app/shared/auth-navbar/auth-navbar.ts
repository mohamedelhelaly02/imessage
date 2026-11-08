import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-auth-navbar',
  styleUrl: './auth-navbar.css',
  templateUrl: './auth-navbar.html',
})
export class AuthNavbar {}
