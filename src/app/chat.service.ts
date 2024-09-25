import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Message {
  content: string;
  timestamp: any;
  senderId: string;
  read?: boolean;
}

export interface Conversation {
  id?: string;
  participants: string[];
  lastMessage: Message;
  unread?: boolean;
  unreadCount?: number;
  isOnline?: boolean; // Add this property to track online status per conversation
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  // Get all conversations for the current user
  getConversations(userId: string): Observable<Conversation[]> {
    return this.firestore
      .collection<Conversation>('conversations', (ref) =>
        ref.where('participants', 'array-contains', userId)
      )
      .snapshotChanges()
      .pipe(
        switchMap((actions) => {
          const conversations = actions.map((a) => {
            const data = a.payload.doc.data() as Conversation;
            const id = a.payload.doc.id;
            // Convert Timestamp to Date
            if (
              data.lastMessage &&
              data.lastMessage.timestamp &&
              data.lastMessage.timestamp.toDate
            ) {
              data.lastMessage.timestamp = data.lastMessage.timestamp.toDate();
            }
            return { ...data, id };
          });

          const unreadCounts = conversations.map((conversation) =>
            this.firestore
              .collection(`conversations/${conversation.id}/messages`, (ref) =>
                ref.where('senderId', '!=', userId).where('read', '==', false)
              )
              .valueChanges()
              .pipe(
                map((messages) => ({
                  conversationId: conversation.id,
                  count: messages.length,
                }))
              )
          );

          return combineLatest(unreadCounts).pipe(
            map((counts) => {
              counts.forEach((count) => {
                const conv = conversations.find(
                  (c) => c.id === count.conversationId
                );
                if (conv) {
                  conv.unreadCount = count.count;
                }
              });
              return conversations;
            })
          );
        })
      );
  }

  // Delete a conversation from Firestore
  deleteConversation(conversationId: string): Promise<void> {
    return this.firestore
      .collection('conversations')
      .doc(conversationId)
      .delete()
      .catch((error) => {
        console.error('Error deleting conversation: ', error);
        throw error;
      });
  }

  // Get messages for a specific conversation
  getMessages(conversationId: string): Observable<Message[]> {
    return this.firestore
      .collection<Message>(`conversations/${conversationId}/messages`, (ref) =>
        ref.orderBy('timestamp')
      )
      .valueChanges()
      .pipe(
        map((messages) =>
          messages.map((message) => ({
            ...message,
            timestamp: (message.timestamp as any).toDate(), // Convert Firebase Timestamp to JS Date
          }))
        )
      );
  }

  // Send a new message to a conversation
  sendMessage(conversationId: string, content: string, senderId: string): void {
    const message: Message = {
      content,
      timestamp: new Date(),
      senderId,
      read: false,
    };
    this.firestore
      .collection(`conversations/${conversationId}/messages`)
      .add(message);
    this.firestore.collection('conversations').doc(conversationId).update({
      lastMessage: message,
    });
  }

  // Create or get an existing conversation between two users
  createOrGetConversation(participants: string[]): Promise<string> {
    const participant1 = participants[0];
    const participant2 = participants[1];

    return this.firestore
      .collection('conversations', (ref) =>
        ref.where('participants', 'array-contains', participant1)
      )
      .get()
      .toPromise()
      .then((snapshot) => {
        const existingConversation = snapshot?.docs.find((doc) => {
          const data = doc.data() as Conversation;
          return data.participants.includes(participant2);
        });

        if (existingConversation) {
          return existingConversation.id;
        } else {
          const conversation: Omit<Conversation, 'id'> = {
            participants,
            lastMessage: {
              content: '',
              timestamp: new Date(),
              senderId: '',
            },
          };
          return this.firestore
            .collection('conversations')
            .add(conversation)
            .then((docRef) => docRef.id);
        }
      });
  }

  // Mark messages as read in a conversation
  markMessagesAsRead(conversationId: string, userId: string): void {
    this.firestore
      .collection(`conversations/${conversationId}/messages`, (ref) =>
        ref.where('senderId', '!=', userId).where('read', '==', false)
      )
      .get()
      .subscribe((snapshot) => {
        snapshot.forEach((doc) => {
          this.firestore
            .collection(`conversations/${conversationId}/messages`)
            .doc(doc.id)
            .update({ read: true });
        });
      });
  }

  // Send typing status to a conversation
  sendTypingStatus(conversationId: string, userId: string): void {
    this.firestore
      .collection(`conversations/${conversationId}/typingStatus`)
      .doc(userId)
      .set({ isTyping: true, timestamp: new Date() });

    // Postavi isTyping na false nakon 3 sekunde
    setTimeout(() => {
      this.clearTypingStatus(conversationId, userId).catch((error) => {
        console.error('Error clearing typing status:', error);
      });
    }, 3000); // Postavi na false nakon 3 sekunde
  }

  clearTypingStatus(conversationId: string, userId: string): Promise<void> {
    return this.firestore
      .collection(`conversations/${conversationId}/typingStatus`)
      .doc(userId)
      .delete();
  }

  // Get typing status of participants in a conversation
  getTypingStatus(conversationId: string): Observable<any[]> {
    return this.firestore
      .collection(`conversations/${conversationId}/typingStatus`)
      .snapshotChanges()
      .pipe(
        map((changes) =>
          changes.map((a) => {
            const data = a.payload.doc.data() as { [key: string]: any };
            const senderId = a.payload.doc.id;
            return { senderId, ...data }; // Vrati senderId i tipkanje status
          })
        )
      );
  }

  // Get the online status of a specific user
  getUserOnlineStatus(userId: string): Observable<boolean> {
    return this.firestore
      .collection('users')
      .doc(userId)
      .valueChanges()
      .pipe(map((user: any) => !!user?.isOnline));
  }

  getLastActive(userId: string): Observable<Date | null> {
    return this.firestore
      .collection('users')
      .doc(userId)
      .valueChanges()
      .pipe(
        map((user: any) => (user.lastActive ? user.lastActive.toDate() : null))
      );
  }
}
