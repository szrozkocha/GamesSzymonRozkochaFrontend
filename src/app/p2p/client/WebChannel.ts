import {SocketService} from "../../socket.service";
import {UserMessageType} from "../../user-message";
import {RTC_CONFIG} from "../RtcConfiguration";
import {clientLog} from "../NetLog";
import {
  DataChannel,
  DataChannelCloseEvent,
  DataChannelErrorEvent,
  DataChannelEventType,
  DataChannelMessageEvent,
  DataChannelOpenEvent
} from "../DataChannel";
import {filter, Observable, Subject} from "rxjs";

export enum WebChannelEventType {
  WEB_CHANNEL_OPEN = "WEB_CHANNEL_OPEN",
  WEB_CHANNEL_TRACK = "WEB_CHANNEL_CLIENT_TRACK",
  WEB_CHANNEL_CLOSE = "WEB_CHANNEL_CLOSE"
}

export interface WebChannelOpenEvent {
  type: WebChannelEventType.WEB_CHANNEL_OPEN;
  webChannel: WebChannel;
}

export interface WebChannelTrackEvent {
  type: WebChannelEventType.WEB_CHANNEL_TRACK;
  streams: ReadonlyArray<MediaStream>
  track: MediaStreamTrack;
  webChannel: WebChannel;
}

export interface WebChannelCloseEvent {
  type: WebChannelEventType.WEB_CHANNEL_CLOSE;
  webChannel: WebChannel;
}

export type WebChannelEvent<TYPE, PARENT> =
  TYPE extends WebChannelEventType.WEB_CHANNEL_OPEN ? WebChannelOpenEvent :
    TYPE extends WebChannelEventType.WEB_CHANNEL_TRACK ? WebChannelTrackEvent :
      TYPE extends WebChannelEventType.WEB_CHANNEL_CLOSE ? WebChannelCloseEvent :
        TYPE extends DataChannelEventType.DATA_CHANNEL_OPEN ? DataChannelOpenEvent<PARENT> :
          TYPE extends DataChannelEventType.DATA_CHANNEL_MESSAGE ? DataChannelMessageEvent<PARENT> :
            TYPE extends DataChannelEventType.DATA_CHANNEL_ERROR ? DataChannelErrorEvent<PARENT> :
              TYPE extends DataChannelEventType.DATA_CHANNEL_CLOSE ? DataChannelCloseEvent<PARENT> :
                never;

export type AllWebChannelEventType = WebChannelEventType | DataChannelEventType;

export class WebChannel {
  private makingOffer: boolean = false;
  private isSettingRemoteAnswerPending: boolean = false;
  private readonly serverUserId: string;
  private readonly socketService: SocketService;
  private peerConnection?: RTCPeerConnection;
  private readonly channels: Map<string, DataChannel<WebChannel>> = new Map<string, DataChannel<WebChannel>>();
  public readonly events: Subject<WebChannelEvent<any, WebChannel>> = new Subject<WebChannelEvent<any, WebChannel>>();

  constructor(userId: string, serverUserId: string, socketService: SocketService) {
    this.socketService = socketService;
    this.serverUserId = serverUserId;
    this.serverUserId = serverUserId;
    this.socketService = socketService;

    this.socketService.onUserMessage(serverUserId, UserMessageType.OFFER).subscribe(message => {
      clientLog("OFFER", message);
      this.startConnection(message.data);
    })

    this.socketService.onUserMessage(serverUserId, UserMessageType.CANDIDATE).subscribe(message => {
      clientLog("CANDIDATE", message);
      // noinspection TypeScriptValidateTypes
      this.peerConnection?.addIceCandidate(message.data);
    })

    this.socketService.onUserMessage(serverUserId, UserMessageType.DESCRIPTION).subscribe(async message => {
      const description = message.data;
      this.isSettingRemoteAnswerPending = description.type == "answer";
      await this.peerConnection!.setRemoteDescription(description); // SRD rolls back as needed
      this.isSettingRemoteAnswerPending = false;
      if (description.type == "offer") {
        await this.peerConnection!.setLocalDescription();
        this.socketService.sendMessage(serverUserId, UserMessageType.DESCRIPTION, this.peerConnection!.localDescription);
      }
    })
  }

  public connect() {
    this.socketService.sendMessage(this.serverUserId, UserMessageType.CONNECT, {});
  }

  private startConnection(offer: any): void {
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnection.onconnectionstatechange = (event: any) => {
      switch(event.connectionState) {
        case "connected":
          this.events.next({type: WebChannelEventType.WEB_CHANNEL_OPEN, webChannel: this});
          break;
        case "closed":
          this.events.next({type: WebChannelEventType.WEB_CHANNEL_CLOSE, webChannel: this});
          break;
      }
    }

    this.peerConnection.ontrack = (event) => {
      this.events.next({type: WebChannelEventType.WEB_CHANNEL_TRACK, streams: event.streams, track: event.track, webChannel: this})
    };

    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      this.socketService.sendMessage(this.serverUserId, UserMessageType.CANDIDATE, event.candidate)
    }

    this.peerConnection.ondatachannel = (event) => {
      clientLog(`Received data channel: ${event.channel.label}`);
      const dataChannel = new DataChannel<WebChannel>(event.channel, this);

      dataChannel.events.subscribe(event => {
        this.events.next(event);
        switch (event.type) {
          case DataChannelEventType.DATA_CHANNEL_OPEN:
            if(this.channels.has(event.dataChannel.label)) {
              console.error(`WebChannel already have data channel ${event.dataChannel.label}`)
              break;
            }
            this.channels.set(event.dataChannel.label, event.dataChannel);
            break;
          case DataChannelEventType.DATA_CHANNEL_CLOSE:
            this.channels.delete(event.dataChannel.label);
            break;

        }
      });
    }

    this.peerConnection.onnegotiationneeded = async (event) => {
      try {
        this.makingOffer = true;
        await this.peerConnection!.setLocalDescription();
        this.socketService.sendMessage(this.serverUserId, UserMessageType.DESCRIPTION, this.peerConnection!.localDescription);
      } catch (err) {
        console.error(err);
      } finally {
        this.makingOffer = false;
      }
    }

    this.peerConnection.setRemoteDescription(offer)
      .then(() => this.peerConnection!.createAnswer())
      .then((answer) => this.peerConnection!.setLocalDescription(answer))
      .then(() =>
        this.socketService.sendMessage(this.serverUserId, UserMessageType.ANSWER, this.peerConnection?.localDescription)
      );
  }

  public addTrack(track: MediaStreamTrack, ...streams: MediaStream[]) {
    this.peerConnection?.addTrack(track, ...streams);
  }

  public get(channelLabel: string) {
    return this.channels.get(channelLabel);
  }

  public event<TYPE extends AllWebChannelEventType>(type: TYPE): Observable<WebChannelEvent<TYPE, WebChannel>> {
    return this.events.pipe(
      filter(event => type === event.type)
    ) as Observable<WebChannelEvent<TYPE, WebChannel>>;
  }
}
