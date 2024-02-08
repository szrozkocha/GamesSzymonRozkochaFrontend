import { Component } from '@angular/core';
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {CommonModule} from "@angular/common";
import {MatButtonModule} from "@angular/material/button";
import {io} from "socket.io-client";
import {OAuthService} from "angular-oauth2-oidc";
import {SocketService} from "../socket.service";
import {AuthService} from "../auth.service";
import {VideoComponent} from "../video/video.component";

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatButtonModule, VideoComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent {
  title = 'frontend';
  message: string = 'Not connected';

  constructor(httpClient: HttpClient, private socketService: SocketService, authService: AuthService) {
    console.log("MainPageComponent", authService.isLogged());
    /*httpClient.get<string>(environment.backend + "api/").subscribe(value => {
      this.title = value;
    })*/

    socketService.on('connect')
      .subscribe(() => {
        console.log("connected");
        this.message = "Connected";
      });

    this.socketService.connect();
  }
}
