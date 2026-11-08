import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthNavbar } from '../../../shared/auth-navbar/auth-navbar';
import { Footer } from '../../../shared/footer/footer';

@Component({
  imports: [RouterOutlet, TranslatePipe, AuthNavbar, Footer],
  selector: 'app-auth',
  styleUrl: './auth.css',
  templateUrl: './auth.html',
})
export class Auth {}
