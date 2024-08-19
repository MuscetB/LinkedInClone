import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  getConversations(userId: string): Observable<Conversation[]> {
    return this.firestore
      .collection<Conversation>('conversations', (ref) =>
        ref.where('participants', 'array-contains', userId)
      )
      .snapshotChanges()
      .pipe(
        switchMap(actions => {
          const conversations = actions.map(a => {
            const data = a.payload.doc.data() as Conversation;
            const id = a.payload.doc.id;
            // Convert Timestamp to Date
            if (data.lastMessage && data.lastMessage.timestamp && data.lastMessage.timestamp.toDate) {
              data.lastMessage.timestamp = data.lastMessage.timestamp.toDate();
            }
            return { ...data, id };
          });
  
          const unreadCounts = conversations.map(conversation => 
            this.firestore.collection(`conversations/${conversation.id}/messages`, ref =>
              ref.where('senderId', '!=', userId).where('read', '==', false)
            ).valueChanges().pipe(
              map(messages => ({ conversationId: conversation.id, count: messages.length }))
            )
          );
  
          return combineLatest(unreadCounts).pipe(
            map(counts => {
              counts.forEach(count => {
                const conv = conversations.find(c => c.id === count.conversationId);
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
  
  

  getMessages(conversationId: string): Observable<Message[]> {
    console.log('Getting messages for conversation:', conversationId);
    return this.firestore
      .collection<Message>(`conversations/${conversationId}/messages`, (ref) =>
        ref.orderBy('timestamp')
      )
      .valueChanges()
      .pipe(
        map(messages => {
          console.log('Fetched messages:', messages);
          return messages.map(message => {
            message.timestamp = (message.timestamp as any).toDate(); // Convert Firebase Timestamp to JS Date
            return message;
          });
        }),
        catchError(error => {
          console.error('Error getting messages:', error);
          throw error;
        })
      );
  }

  sendMessage(conversationId: string, content: string, senderId: string): void {
    const message: Message = {
      content,
      timestamp: new Date(),
      senderId,
      read: false
    };
    this.firestore.collection(`conversations/${conversationId}/messages`).add(message);
    this.firestore.collection('conversations').doc(conversationId).update({
      lastMessage: message
    });
  }

  createOrGetConversation(participants: string[]): Promise<string> {
    console.log('Creating or getting conversation for participants:', participants);
    const participant1 = participants[0];
    const participant2 = participants[1];

    return this.firestore
      .collection('conversations', (ref) =>
        ref.where('participants', 'array-contains', participant1)
      )
      .get()
      .toPromise()
      .then((snapshot) => {
        if (!snapshot) {
          throw new Error('Snapshot is undefined');
        }

        const existingConversation = snapshot.docs.find((doc) => {
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
      })
      .catch((error) => {
        console.error('Error creating or getting conversation:', error);
        throw error;
      });
  }

  markMessagesAsRead(conversationId: string, userId: string): void {
    this.firestore.collection(`conversations/${conversationId}/messages`, ref =>
      ref.where('senderId', '!=', userId).where('read', '==', false)
    ).get().subscribe(snapshot => {
      snapshot.forEach(doc => {
        this.firestore.collection(`conversations/${conversationId}/messages`).doc(doc.id).update({ read: true });
      });
    });
  }
}
