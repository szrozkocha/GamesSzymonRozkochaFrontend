import { Injectable } from '@angular/core';
import {AuthService} from "./auth.service";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private authService: AuthService) {
  }

  public getUsername() {
    const username = localStorage.getItem("username");

    if(username) {
      return username;
    }

    const newUsername = "szymon_friend_" + Date.now().toString(16)
    localStorage.setItem("username", newUsername);
    return newUsername;
  }

  public getUserId() {
    return this.authService.getUserId();
  }
}
