import { Injectable } from '@angular/core';
import {io, Socket} from "socket.io-client";
import {OAuthService} from "angular-oauth2-oidc";
import {Observable} from "rxjs";
import {UserService} from "./user.service";
import {UserMessageIn, UserMessageType} from "./user-message";

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private readonly socket: Socket;

  constructor(oauthService: OAuthService, userService: UserService) {
    const username = userService.getUsername();

    this.socket = io(
      {
        path: "/api/ws/",
        autoConnect: false,
        query: {
          token: oauthService.getAccessToken(),
          username
        }
      }
    );
  }

  public connect() {
    this.socket.connect();
  }

  public on(message: string): Observable<any> {
    return new Observable(subscriber => {
      const listener = (data: any) => subscriber.next(data);

      this.socket.on(message, listener);
      return () => this.socket.off(message, listener);
    });
  }

  public sendMessage(userId: string, type: UserMessageType, data: any) {
    console.log("Sending", userId, type, data);
    this.socket.emit("message", { to: userId, type: type, data: data})
  }

  public onUserMessage(userId?: string, type?: UserMessageType): Observable<UserMessageIn> {
    return new Observable(subscriber => {
      const listener = (message: UserMessageIn) => {
        console.log(`message: ${JSON.stringify(message)}`)
        if(userId && message.from === userId || !userId) {
          if(type && message.type === type || !type) {
            subscriber.next(message);
          }
        }
      }

      this.socket.on("message", listener);
      return () => this.socket.off("message", listener);
    })
  }
}
