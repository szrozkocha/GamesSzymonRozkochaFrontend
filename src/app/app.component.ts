import {Component, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterOutlet} from '@angular/router';
import {HttpClientModule} from "@angular/common/http";
import {MatButtonModule} from "@angular/material/button";
import {AuthService} from "./auth.service";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {UserService} from "./user.service";
import {MatSidenav, MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";
import {BreakpointObserver} from "@angular/cdk/layout";
import User from "./user";
import {SocketService} from "./socket.service";
import {MatSnackBar, MatSnackBarModule} from "@angular/material/snack-bar";
import {UserMessageType} from "./user-message";
import {WebChannelServer} from "./p2p/server/WebChannelServer";
import {WebChannel, WebChannelEventType} from "./p2p/client/WebChannel";
import {DataChannelEventType} from "./p2p/DataChannel";
import {filter} from "rxjs";
import {VideoComponent} from "./video/video.component";
import {WebChannelClientEventType} from "./p2p/server/WebChannelClient";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HttpClientModule, MatButtonModule, MatToolbarModule, MatIconModule, MatSidenavModule, MatListModule, MatSnackBarModule, VideoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  @ViewChild(MatSidenav)
  sidenav!: MatSidenav;
  isMobile= true;
  isCollapsed = true;
  activeUsers: User[] = [];
  server?: WebChannelServer;
  client?: WebChannel;
  stream?: MediaStream;

  constructor(public authService: AuthService, public userService: UserService, private breakpointObserver: BreakpointObserver, private socketService: SocketService, private snackBar: MatSnackBar) {
    socketService.on("clients")
      .subscribe((clients: User[]) => this.activeUsers = clients);

    //socketService.onUserMessage().subscribe((message: UserMessageIn) => snackBar.open(`Message ${JSON.stringify(message.data)} from ${message.from}`))
  }

  userClick(userId: string) {
    this.socketService.sendMessage(userId, UserMessageType.TEXT, "ping");
  }

  ngOnInit() {
    this.breakpointObserver.observe(['(max-width: 800px)']).subscribe((screenSize) => {
      if(screenSize.matches){
        this.isMobile = true;
      } else {
        this.isMobile = false;
      }
    });
  }

  toggleMenu() {
    if(this.isMobile){
      this.sidenav.toggle();
      this.isCollapsed = false; // On mobile, the menu can never be collapsed
    } else {
      this.sidenav.open(); // On desktop/tablet, the menu can never be fully closed
      this.isCollapsed = !this.isCollapsed;
    }
  }

  startServer() {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false})
      .then((stream) => {
        this.stream = stream;

        this.server = new WebChannelServer(this.userService.getUserId(), this.socketService);
        this.server.addDataChannel("test", {ordered: true});
        this.server.event(DataChannelEventType.DATA_CHANNEL_OPEN)
          .pipe(
            filter(event => "test" === event.dataChannel.label)
          )
          .subscribe(event => {
            this.server?.getClient(event.parent.userId)?.get("test")?.send("data");
          });

        this.server.event(DataChannelEventType.DATA_CHANNEL_OPEN).subscribe(event  => {
          if(this.stream) {
            this.stream?.getTracks()?.forEach(track => event.parent.addTrack(track, this.stream as MediaStream))
            event.parent.get("test")?.send("data2");
          }
        })
      })
      .catch((err) => {
        console.error(`An error occurred: ${err}`);
      });
  }

  connect(userId: string) {
    this.client = new WebChannel(this.userService.getUserId(), userId, this.socketService);
    this.client.event(DataChannelEventType.DATA_CHANNEL_MESSAGE)
      .pipe(
        filter(event => "test" === event.dataChannel.label)
      )
      .subscribe(event => {
        console.log("got data", event.data);
        this.snackBar.open(event.data);
    })
    this.client.event(WebChannelEventType.WEB_CHANNEL_TRACK).subscribe(event => {
      console.log("got track", event);
      setTimeout(() => {
        this.stream = event.streams[0];
      }, 1000);
    })
    this.client.connect();
  }
}
