import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { ChatService, Conversation, Message } from '../chat.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit {
  conversations$: Observable<Conversation[]> = of([]);
  messages$: Observable<Message[]> = of([]);
  selectedConversation: Conversation | null = null;
  newMessage: string = '';
  currentUser: any;
  userMap: Map<string, any> = new Map();

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    console.log('Chat component initialized');
    this.authService.getUser().subscribe((user) => {
      console.log('User fetched:', user);
      this.currentUser = user;
      if (user) {
        console.log('Fetching conversations for user:', user.uid);
        this.conversations$ = this.chatService.getConversations(user.uid).pipe(
          switchMap((conversations) => {
            console.log('Conversations fetched:', conversations);
            const userIds = Array.from(
              new Set(conversations.flatMap((conv) => conv.participants))
            );
            return this.userService.getUsersByIds(userIds).pipe(
              map((users) => {
                users.forEach((u) => this.userMap.set(u.uid, u));
                return conversations.map((conversation) => {
                  conversation.unread =
                    conversation.lastMessage.senderId !== user.uid &&
                    !conversation.lastMessage.read;
                  return conversation;
                });
              })
            );
          }),
          catchError((error) => {
            console.error('Error fetching conversations:', error);
            return of([]);
          })
        );
      }
      const userIdToChatWith = this.route.snapshot.paramMap.get('userId');
      console.log('User ID to chat with:', userIdToChatWith);
      if (userIdToChatWith && user) {
        console.log('Creating or getting conversation with user:', userIdToChatWith);
        this.chatService
          .createOrGetConversation([user.uid, userIdToChatWith])
          .then((conversationId) => {
            console.log('Conversation created or fetched with ID:', conversationId);
            this.selectConversation({
              id: conversationId,
              participants: [user.uid, userIdToChatWith],
              lastMessage: { content: '', timestamp: new Date(), senderId: '' },
            });
          })
          .catch((error) => {
            console.error('Error creating or getting conversation:', error);
          });
      }
    }, (error) => {
      console.error('Error fetching user:', error);
    });
  }

  selectConversation(conversation: Conversation): void {
    console.log('Selecting conversation:', conversation);
    this.selectedConversation = conversation;
    if (conversation.id) {
      console.log('Fetching messages for conversation:', conversation.id);
      this.messages$ = this.chatService.getMessages(conversation.id).pipe(
        map((messages) => {
          console.log('Messages fetched for conversation:', messages);
          return messages;
        }),
        catchError((error) => {
          console.error('Error fetching messages:', error);
          return of([]);
        })
      );
      this.chatService.markMessagesAsRead(conversation.id, this.currentUser.uid);
    }
  }

  sendMessage(): void {
    if (this.selectedConversation && this.newMessage.trim()) {
      console.log('Sending message:', this.newMessage);
      if (this.selectedConversation.id) {
        this.chatService.sendMessage(
          this.selectedConversation.id,
          this.newMessage,
          this.currentUser.uid
        );
        this.newMessage = '';
      }
    }
  }

  getParticipantName(conversation: Conversation): string {
    const otherParticipantId = conversation.participants.find(p => p !== this.currentUser.uid);
    if (!otherParticipantId) {
      return 'Unknown';
    }
    const user = this.userMap.get(otherParticipantId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  }

  getParticipantProfileImage(conversation: Conversation): string {
    const otherParticipantId = conversation.participants.find(p => p !== this.currentUser.uid);
    if (!otherParticipantId) {
      return 'path-to-default-profile-image';
    }
    const user = this.userMap.get(otherParticipantId);
    return user ? user.profileImageUrl || 'path-to-default-profile-image' : 'path-to-default-profile-image';
  }

  getMessageProfileImage(message: Message): string {
    const user = this.userMap.get(message.senderId);
    console.log('Fetching profile image for user:', message.senderId, 'User:', user); // Debugging line
    return user ? user.profileImageUrl || 'path-to-default-profile-image' : 'path-to-default-profile-image';
  }
}
