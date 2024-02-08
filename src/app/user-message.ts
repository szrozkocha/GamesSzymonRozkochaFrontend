export enum UserMessageType {
  TEXT = "TEXT",
  OFFER = "OFFER",
  CANDIDATE = "CANDIDATE",
  ANSWER = "ANSWER",
  CONNECT = "CONNECT",
  DESCRIPTION = "DESCRIPTION",
}

export interface UserMessageOut {
  to: string;
  type: UserMessageType
  data: any;
}

export interface UserMessageIn {
  from: string;
  type: UserMessageType
  data: any;
}
