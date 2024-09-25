import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, Subscription } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AuthService } from '../auth.service';
import { ChatService, Conversation, Message } from '../chat.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy {
  conversations$: Observable<Conversation[]> = of([]);
  messages$: Observable<Message[]> = of([]);
  selectedConversation: Conversation | null = null;
  newMessage: string = '';
  typingUser: string | null = null; // Removed isTyping, now we track typing user
  typingStatus: string = ''; // Typing status message
  typingTimeout: any;
  currentUser: any;
  userMap: Map<string, any> = new Map();
  userStatus: string = ''; // To track user online/offline status
  typingSubscription: Subscription | null = null;
  selectedConversationId: string | null = null;

  @ViewChild('messageList') messageList!: ElementRef;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe((user) => {
      this.currentUser = user;

      if (user) {
        this.currentUser = user;
        this.authService.setUserOnlineOnLogin(user.uid); // Postavi korisnika na online prilikom prijave

        // Fetch conversations
        this.conversations$ = this.chatService.getConversations(user.uid).pipe(
          switchMap((conversations) => {
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
            return of([]);
          })
        );
        if (this.selectedConversationId) {
          this.subscribeToTypingStatus(this.selectedConversationId);
        }
      }

      // If we're navigating to a specific conversation
      const userIdToChatWith = this.route.snapshot.paramMap.get('userId');
      if (userIdToChatWith && user) {
        this.chatService
          .createOrGetConversation([user.uid, userIdToChatWith])
          .then((conversationId) => {
            this.selectConversation({
              id: conversationId,
              participants: [user.uid, userIdToChatWith],
              lastMessage: { content: '', timestamp: new Date(), senderId: '' },
            });
            this.listenForUserStatus();
          })
          .catch((error) => {
            console.error('Error creating or getting conversation:', error);
          });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.typingSubscription) {
      this.typingSubscription.unsubscribe();
    }
    if (this.currentUser?.uid) {
      this.authService.setUserOfflineOnLogout(this.currentUser.uid); // Postavi korisnika na offline prilikom odjave
    }
  }

  // Metoda za pretplatu na status tipkanja
  subscribeToTypingStatus(conversationId: string): void {
    this.typingSubscription = this.chatService
      .getTypingStatus(conversationId)
      .subscribe(
        (statusArray) => {
          // Filtriraj status tako da prikazuje samo kada drugi korisnik tipka
          const otherTypingStatus = statusArray.find((status) => {
            return status.senderId !== this.currentUser?.uid && status.isTyping;
          });

          if (otherTypingStatus) {
            this.typingStatus = `${this.getUserName(
              otherTypingStatus.senderId
            )} is typing...`;
            console.log(this.typingStatus);
          } else {
            this.typingStatus = ''; // Očisti status ako nitko ne tipka
          }
        },
        (error) => {
          console.error('Error while subscribing to typing status:', error);
        }
      );
  }
  getUserName(senderId: string): string {
    const user = this.userMap.get(senderId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.listenForUserStatus();

    if (this.selectedConversation.id) {
      // Unsubscribe from previous typing status
      if (this.typingSubscription) {
        this.typingSubscription.unsubscribe();
      }

      const otherParticipantId = this.getOtherParticipantId(conversation);
      if (otherParticipantId) {
        this.chatService
          .getUserOnlineStatus(otherParticipantId)
          .subscribe((status) => {
            // Attach online status to the specific conversation
            conversation.isOnline = status;
          });
      }

      this.messages$ = this.chatService
        .getMessages(this.selectedConversation.id)
        .pipe(
          map((messages) => {
            this.scrollToBottom();
            return messages;
          }),
          catchError((error) => {
            console.error('Error fetching messages:', error);
            return of([]);
          })
        );
      this.chatService.markMessagesAsRead(
        this.selectedConversation.id,
        this.currentUser.uid
      );
      this.listenForTypingStatus(); // Start listening for typing status
    }
  }

  sendMessage(): void {
    if (
      this.selectedConversation &&
      this.selectedConversation.id &&
      this.newMessage.trim()
    ) {
      this.chatService.sendMessage(
        this.selectedConversation.id, // Ensure id is defined
        this.newMessage,
        this.currentUser.uid
      );
      this.newMessage = '';
      this.scrollToBottom();

      // Clear typing status immediately after sending the message
      this.clearTypingStatus();
    }
  }

  onMessageInput(): void {
    if (
      this.selectedConversation &&
      this.selectedConversation.id &&
      this.currentUser?.uid
    ) {
      this.chatService.sendTypingStatus(
        this.selectedConversation.id,
        this.currentUser.uid
      );

      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }

      // Clear typing status after 3 seconds
      this.typingTimeout = setTimeout(() => {
        if (this.selectedConversation?.id) {
          // Provjeravamo je li id definiran
          this.chatService
            .clearTypingStatus(
              this.selectedConversation.id,
              this.currentUser.uid
            )
            .then(() => {
              console.log(
                `Cleared typing status for user ${this.currentUser.uid}`
              );
            });
        }
      }, 3000);
    }
  }

  listenForTypingStatus(): void {
    if (this.selectedConversation && this.selectedConversation.id) {
      this.typingSubscription = this.chatService
        .getTypingStatus(this.selectedConversation.id)
        .subscribe((statusArray) => {
          const otherTypingStatus = statusArray.find(
            (status) =>
              status.senderId !== this.currentUser?.uid && status.isTyping
          );

          if (otherTypingStatus) {
            const typingUserName =
              this.userMap.get(otherTypingStatus.senderId)?.firstName || 'User';
            this.typingStatus = `${typingUserName} is typing...`;
          } else {
            this.typingStatus = '';
          }
          this.scrollToBottom();

          clearTimeout(this.typingTimeout);
          this.typingTimeout = setTimeout(() => {
            this.typingStatus = '';
          }, 3000); // Hide the typing status after 3 seconds
        });
    }
  }

  clearTypingStatus(): void {
    if (this.selectedConversation?.id && this.currentUser?.uid) {
      this.chatService
        .clearTypingStatus(this.selectedConversation.id, this.currentUser.uid)
        .catch((error) =>
          console.error('Error clearing typing status:', error)
        );
    }
  }

  // Get the name of the conversation partner
  getParticipantName(conversation: Conversation): string {
    const otherParticipantId = conversation.participants.find(
      (p) => p !== this.currentUser?.uid
    );
    if (!otherParticipantId) {
      return 'Unknown';
    }
    const user = this.userMap.get(otherParticipantId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  }

  getParticipantProfileImage(conversation: Conversation): string {
    const otherParticipantId = conversation.participants.find(
      (p) => p !== this.currentUser?.uid
    );
    if (!otherParticipantId) {
      return 'assets/images/add-photo.png';
    }
    const user = this.userMap.get(otherParticipantId);
    return user?.profileImageUrl || 'assets/images/add-photo.png';
  }

  // Get the profile image of the message sender
  getMessageProfileImage(message: Message): string {
    const user = this.userMap.get(message.senderId);
    return user?.profileImageUrl || 'assets/images/add-photo.png';
  }

  // Check if a message is read
  isMessageRead(message: Message): boolean {
    return message.read === true;
  }

  // Auto-scroll to the bottom of the message list
  scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.messageList.nativeElement.scrollTop =
          this.messageList.nativeElement.scrollHeight;
      } catch (err) {
        console.error('Error scrolling to bottom:', err);
      }
    }, 100);
  }

  listenForUserStatus(): void {
    if (this.selectedConversation) {
      const otherParticipantId = this.getOtherParticipantId(
        this.selectedConversation
      );
      if (otherParticipantId) {
        this.chatService
          .getUserOnlineStatus(otherParticipantId)
          .subscribe((status) => {
            if (status === true) {
              this.userStatus = 'Online'; // Postavi na 'Online' ako je korisnik aktivan
            } else {
              // Dohvatiti zadnje vrijeme aktivnosti kad je korisnik offline
              this.chatService
                .getLastActive(otherParticipantId)
                .subscribe((lastActive) => {
                  if (lastActive) {
                    this.userStatus = this.getLastActiveTime(lastActive);
                  } else {
                    this.userStatus = 'Not available';
                  }
                });
            }
          });
      }
    }
  }

  getLastActiveTime(lastActive: Date | null): string {
    if (!lastActive) {
      return 'Not available'; // Ako je lastActive undefined, vrati 'Not available'
    }

    const now = new Date().getTime();
    const difference = now - lastActive.getTime();
    const minutes = Math.floor(difference / 60000);
    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours} hours ago`;
    }
  }

  // This method can now get the specific participant of each conversation
  getOtherParticipantId(conversation: Conversation): string | undefined {
    return conversation.participants.find((p) => p !== this.currentUser?.uid);
  }

  // Method to confirm conversation deletion
  confirmDelete(conversation: Conversation, event: Event): void {
    // Prevent conversation selection when clicking delete
    event.stopPropagation();

    // Show SweetAlert confirmation
    Swal.fire({
      title: 'Are you sure?',
      text: 'This conversation will be deleted permanently!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        // Call the delete function if user confirms
        this.chatService
          .deleteConversation(conversation.id as string)
          .then(() => {
            Swal.fire(
              'Deleted!',
              'The conversation has been deleted.',
              'success'
            );
          })
          .catch((error) => {
            Swal.fire(
              'Error!',
              'There was an error deleting the conversation.',
              'error'
            );
          });
      }
    });
  }

  // Method to delete the conversation
  deleteConversation(conversation: Conversation): void {
    if (conversation.id) {
      this.chatService
        .deleteConversation(conversation.id)
        .then(() => {
          Swal.fire(
            'Deleted!',
            'The conversation has been deleted.',
            'success'
          );
        })
        .catch((error) => {
          Swal.fire('Error!', 'Failed to delete the conversation.', 'error');
          console.error('Error deleting conversation:', error);
        });
    }
  }
}
