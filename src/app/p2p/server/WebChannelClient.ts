import {filter, Observable, Subject} from "rxjs";
import {RTC_CONFIG} from "../RtcConfiguration";
import {UserMessageIn, UserMessageType} from "../../user-message";
import {serverLog} from "../NetLog";
import {WebChannelServer} from "./WebChannelServer";
import {
  DataChannel,
  DataChannelCloseEvent,
  DataChannelErrorEvent,
  DataChannelEventType,
  DataChannelMessageEvent,
  DataChannelOpenEvent
} from "../DataChannel";

export enum WebChannelClientEventType {
  WEB_CHANNEL_CLIENT_OPEN = "WEB_CHANNEL_CLIENT_OPEN",
  WEB_CHANNEL_CLIENT_TRACK = "WEB_CHANNEL_CLIENT_TRACK",
  WEB_CHANNEL_CLIENT_CLOSE = "WEB_CHANNEL_CLIENT_CLOSE"
}

export interface WebChannelClientOpenEvent {
  type: WebChannelClientEventType.WEB_CHANNEL_CLIENT_OPEN;
  webChannelClient: WebChannelClient;
}

export interface WebChannelClientTrackEvent {
  type: WebChannelClientEventType.WEB_CHANNEL_CLIENT_TRACK;
  streams: ReadonlyArray<MediaStream>
  track: MediaStreamTrack;
  webChannelClient: WebChannelClient;
}

export interface WebChannelClientCloseEvent {
  type: WebChannelClientEventType.WEB_CHANNEL_CLIENT_CLOSE;
  webChannelClient: WebChannelClient;
}

export type WebChannelClientEvent<TYPE, PARENT> =
  TYPE extends WebChannelClientEventType.WEB_CHANNEL_CLIENT_OPEN ? WebChannelClientOpenEvent :
    TYPE extends WebChannelClientEventType.WEB_CHANNEL_CLIENT_TRACK ? WebChannelClientTrackEvent :
      TYPE extends WebChannelClientEventType.WEB_CHANNEL_CLIENT_CLOSE ? WebChannelClientCloseEvent :
        TYPE extends DataChannelEventType.DATA_CHANNEL_OPEN ? DataChannelOpenEvent<PARENT> :
          TYPE extends DataChannelEventType.DATA_CHANNEL_MESSAGE ? DataChannelMessageEvent<PARENT> :
            TYPE extends DataChannelEventType.DATA_CHANNEL_ERROR ? DataChannelErrorEvent<PARENT> :
              TYPE extends DataChannelEventType.DATA_CHANNEL_CLOSE ? DataChannelCloseEvent<PARENT> :
                never;

export type AllWebChannelClientEventType = WebChannelClientEventType | DataChannelEventType;

export class WebChannelClient {
  private makingOffer: boolean = false;
  private isSettingRemoteAnswerPending: boolean = false;
  public readonly userId: string;
  private peerConnection: RTCPeerConnection;
  private readonly server: WebChannelServer;
  private readonly channels: Map<string, DataChannel<WebChannelClient>> = new Map<string, DataChannel<WebChannelClient>>();
  public readonly events: Subject<WebChannelClientEvent<any, WebChannelClient>> = new Subject<WebChannelClientEvent<any, WebChannelClient>>();

  constructor(userId: string, server: WebChannelServer) {
    this.userId = userId;
    this.server = server;

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnection.onconnectionstatechange = (event: any) => {
      switch(event.connectionState) {
        case "connected":
          this.events.next({type: WebChannelClientEventType.WEB_CHANNEL_CLIENT_OPEN, webChannelClient: this});
          break;
        case "closed":
          this.events.next({type: WebChannelClientEventType.WEB_CHANNEL_CLIENT_CLOSE, webChannelClient: this});
          break;
      }
    }

    this.peerConnection.ontrack = (event) => {
      this.events.next({type: WebChannelClientEventType.WEB_CHANNEL_CLIENT_TRACK, streams: event.streams, track: event.track, webChannelClient: this})
    };

    this.peerConnection.onicecandidate = (event) => {
      this.server.socketService.sendMessage(userId, UserMessageType.CANDIDATE, event.candidate);
    }

    this.peerConnection.onnegotiationneeded = async (event) => {
      try {
        this.makingOffer = true;
        await this.peerConnection.setLocalDescription();
        this.server.socketService.sendMessage(this.userId, UserMessageType.DESCRIPTION, this.peerConnection.localDescription);
      } catch (err) {
        console.error(err);
      } finally {
        this.makingOffer = false;
      }
    }

    this.peerConnection.createOffer({offerToReceiveAudio: true, offerToReceiveVideo: true, iceRestart: true}).then((offer) => {
      this.peerConnection.setLocalDescription(offer);
      this.server.socketService.sendMessage(this.userId, UserMessageType.OFFER, offer);
    });
  }

  public createDataChannel(label: string, dataChannelDict?: RTCDataChannelInit) {
    if (this.channels.has(label)) {
      console.error(`Data channel ${label} already exists`);
      return;
    }

    const dataChannel = new DataChannel<WebChannelClient>(this.peerConnection.createDataChannel(label, dataChannelDict), this);
    this.channels.set(label, dataChannel);

    dataChannel.events.subscribe(event => {
      this.events.next(event);
      switch (event.type) {
        case DataChannelEventType.DATA_CHANNEL_CLOSE:
          this.channels.delete(event.dataChannel.label);
          break;
      }
    });
  }

  public addTrack(track: MediaStreamTrack, ...streams: MediaStream[]) {
    this.peerConnection.addTrack(track, ...streams);
  }

  public onAnswer(message: UserMessageIn) {
    serverLog("Remote answer from: " + message.from, message.data);
    this.peerConnection.setRemoteDescription(message.data);
  }

  public onCandidate(message: UserMessageIn) {
    if (message.data) {
      serverLog("Candidate for connection: " + JSON.stringify(message.data))
    }
    try {
      if(message.data) {
        this.peerConnection?.addIceCandidate(message.data);
      }
    } catch (e: any) {
      console.log(JSON.stringify(e));
    }
  }

  public async onDescription(message: UserMessageIn) {
    const description = message.data;
    const readyForOffer =
      !this.makingOffer &&
      (this.peerConnection!.signalingState == "stable" || this.isSettingRemoteAnswerPending);
    const offerCollision = description.type == "offer" && !readyForOffer;

    if (offerCollision) {
      return;
    }
    this.isSettingRemoteAnswerPending = description.type == "answer";
    await this.peerConnection!.setRemoteDescription(description); // SRD rolls back as needed
    this.isSettingRemoteAnswerPending = false;
    if (description.type == "offer") {
      await this.peerConnection!.setLocalDescription();
      this.server.socketService.sendMessage(this.userId, UserMessageType.DESCRIPTION, this.peerConnection!.localDescription);
    }
  }

  public get(channelLabel: string) {
    return this.channels.get(channelLabel);
  }

  public event<TYPE extends AllWebChannelClientEventType>(type: TYPE): Observable<WebChannelClientEvent<TYPE, WebChannelClient>> {
    return this.events.pipe(
      filter(event => type === event.type)
    ) as Observable<WebChannelClientEvent<TYPE, WebChannelClient>>;
  }
}
