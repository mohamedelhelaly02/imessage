import { Component, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NewConversation } from './new-conversation/new-conversation';

@Component({
  imports: [TranslatePipe, NewConversation],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  searchQuery = signal('');
  searchChange = output<string>();

  onSearchInput(e: InputEvent) {
    const searchInput = e.target as HTMLInputElement;
    const searchQuery = searchInput.value;
    this.searchQuery.set(searchQuery);
    this.searchChange.emit(searchQuery);
  }
}
