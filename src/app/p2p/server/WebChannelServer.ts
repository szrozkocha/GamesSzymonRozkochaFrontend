import {SocketService} from "../../socket.service";
import {UserMessageType} from "../../user-message";
import {serverLog} from "../NetLog";
import {filter, Observable, Subject} from "rxjs";
import {AllWebChannelClientEventType, WebChannelClient, WebChannelClientEvent} from "./WebChannelClient";
import {WebChannelEvent} from "../client/WebChannel";

export class WebChannelServer {
  private readonly clients: Map<string, WebChannelClient> = new Map<string, WebChannelClient>();
  public readonly socketService: SocketService;
  private readonly dataChannelDefinitions: Map<string, {label: string, dataChannelDict?: RTCDataChannelInit}> = new Map<string, {label: string; dataChannelDict?: RTCDataChannelInit}>();
  public readonly events: Subject<WebChannelClientEvent<any, WebChannelClient>> = new Subject<WebChannelClientEvent<any, WebChannelClient>>();

  constructor(serverId: string, socketService: SocketService) {
    this.socketService = socketService;

    this.socketService.onUserMessage(undefined, UserMessageType.CONNECT).subscribe(message => {
      serverLog("CONNECT", message);
      if(this.clients.has(message.from)) {
        console.error(`Client ${message.from} already exists`);
      }
      const client = new WebChannelClient(message.from, this)
      client.events.subscribe(event => this.events.next(event));
      this.dataChannelDefinitions.forEach((value) => {
        client.createDataChannel(value.label, value.dataChannelDict);
      });
      this.clients.set(message.from, client);
    })

    this.socketService.onUserMessage(undefined, UserMessageType.ANSWER).subscribe(message => {
      serverLog("ANSWER", message);
      const targetClient = this.clients.get(message.from);
      if (targetClient) {
        targetClient.onAnswer(message);
      } else {
        serverLog("Message received for unknown client: " + message.from + " " + message.type);
      }
    })

    this.socketService.onUserMessage(undefined, UserMessageType.CANDIDATE).subscribe(message => {
      serverLog("CANDIDATE", message);
      const targetClient = this.clients.get(message.from);
      if (targetClient) {
        targetClient.onCandidate(message);
      } else {
        serverLog("Message received for unknown client: " + message.from + " " + message.type);
      }
    })

    this.socketService.onUserMessage(undefined, UserMessageType.DESCRIPTION).subscribe(async message => {
      serverLog("DESCRIPTION", message);
      const targetClient = this.clients.get(message.from);
      if (targetClient) {
        targetClient.onDescription(message);
      } else {
        serverLog("Message received for unknown client: " + message.from + " " + message.type);
      }
    })
  }

  public addDataChannel(label: string, dataChannelDict?: RTCDataChannelInit) {
    if(this.dataChannelDefinitions.has(label)) {
      console.error(`Data channel ${label} already exists`);
      return;
    }
    this.dataChannelDefinitions.set(label, {label: label, dataChannelDict: dataChannelDict});

    Array.from(this.clients.values()).filter(client => !client.get(label))
      .forEach(client => client.createDataChannel(label, dataChannelDict));
  }

  public getClient(userId: string) {
    return this.clients.get(userId);
  }

  sendData(channelLabel: string, data: string | Blob | ArrayBuffer | ArrayBufferView) {
    this.clients.forEach(client => {
      client?.get(channelLabel)?.send(data);
    })
  }

  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]) {
    this.clients.forEach(client => {
      client?.addTrack(track, ...streams);
    })
  }

  public event<TYPE extends AllWebChannelClientEventType>(type: TYPE): Observable<WebChannelClientEvent<TYPE, WebChannelClient>> {
    return this.events.pipe(
      filter(event => type === event.type)
    ) as Observable<WebChannelClientEvent<TYPE, WebChannelClient>>;
  }
}
