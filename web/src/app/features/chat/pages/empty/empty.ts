import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-empty',
  styleUrl: './empty.css',
  templateUrl: './empty.html',
})
export class Empty {}
