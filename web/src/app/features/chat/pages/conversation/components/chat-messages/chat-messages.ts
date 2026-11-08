import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-chat-messages',
  styleUrl: './chat-messages.css',
  templateUrl: './chat-messages.html',
})
export class ChatMessages {
  messages: string[] = [
    'Hey! Are we still on for our meeting later today?',
    "Yes, absolutely! I'm just wrapping up some code changes.",
    'Talk soon!',
  ];
}
