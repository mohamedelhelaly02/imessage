import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Header } from './header/header';
import { ChatList } from './chat-list/chat-list';

@Component({
  imports: [FormsModule, TranslatePipe, Header, ChatList],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  onSearchChanged(searchQuery: string) {
    console.log(`Searched for: ${searchQuery}`);
  }
}
