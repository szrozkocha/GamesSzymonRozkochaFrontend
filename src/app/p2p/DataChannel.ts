import {filter, Observable, Subject} from "rxjs";

export enum DataChannelEventType {
  DATA_CHANNEL_OPEN = "DATA_CHANNEL_OPEN",
  DATA_CHANNEL_MESSAGE = "DATA_CHANNEL_MESSAGE",
  DATA_CHANNEL_ERROR = "DATA_CHANNEL_ERROR",
  DATA_CHANNEL_CLOSE = "DATA_CHANNEL_CLOSE"
}

export interface DataChannelOpenEvent<PARENT> {
  type: DataChannelEventType.DATA_CHANNEL_OPEN;
  dataChannel: DataChannel<PARENT>;
  parent: PARENT;
}

export interface DataChannelMessageEvent<PARENT> {
  type: DataChannelEventType.DATA_CHANNEL_MESSAGE;
  dataChannel: DataChannel<PARENT>;
  data: any;
  parent: PARENT;
}

export interface DataChannelErrorEvent<PARENT> {
  type: DataChannelEventType.DATA_CHANNEL_ERROR;
  dataChannel: DataChannel<PARENT>;
  parent: PARENT;
}

export interface DataChannelCloseEvent<PARENT> {
  type: DataChannelEventType.DATA_CHANNEL_CLOSE;
  dataChannel: DataChannel<PARENT>;
  parent: PARENT;
}

export type DataChannelEvent<TYPE, PARENT> =
  TYPE extends DataChannelEventType.DATA_CHANNEL_OPEN ? DataChannelOpenEvent<PARENT> :
    TYPE extends DataChannelEventType.DATA_CHANNEL_MESSAGE ? DataChannelMessageEvent<PARENT> :
      TYPE extends DataChannelEventType.DATA_CHANNEL_ERROR ? DataChannelErrorEvent<PARENT> :
        TYPE extends DataChannelEventType.DATA_CHANNEL_CLOSE ? DataChannelCloseEvent<PARENT> :
          never;

export class DataChannel<PARENT> {
  private readonly dataChannel: RTCDataChannel;
  public readonly events: Subject<DataChannelEvent<any, PARENT>> = new Subject<DataChannelEvent<any, PARENT>>();
  private _isOpen: boolean = false;

  constructor(dataChannel: RTCDataChannel, private parent: PARENT) {
    this.dataChannel = dataChannel;
    dataChannel.onopen = () => {
      this._isOpen = true;
      this.events.next({ type: DataChannelEventType.DATA_CHANNEL_OPEN, dataChannel: this, parent: this.parent});
    }

    dataChannel.onmessage = event => {
      this.events.next({ type: DataChannelEventType.DATA_CHANNEL_MESSAGE, dataChannel: this, data: event.data, parent: this.parent});
    }

    dataChannel.onerror = () => {
      this.events.next({ type: DataChannelEventType.DATA_CHANNEL_ERROR, dataChannel: this, parent: this.parent});
    }

    dataChannel.onclose = () => {
      this._isOpen = false;
      this.events.next({ type: DataChannelEventType.DATA_CHANNEL_CLOSE, dataChannel: this, parent: this.parent});
      this.events.complete();
    }
  }

  public get label() {
    return this.dataChannel.label;
  }

  public get isOpen() {
    return this._isOpen;
  }

  public send(data: string | Blob | ArrayBuffer | ArrayBufferView) {
    this.dataChannel.send(data as string);
  }

  public event<TYPE extends DataChannelEventType>(type: TYPE): Observable<DataChannelEvent<TYPE, PARENT>> {
    return this.events.pipe(
      filter(event => type === event.type)
    ) as Observable<DataChannelEvent<TYPE, PARENT>>;
  }
}
