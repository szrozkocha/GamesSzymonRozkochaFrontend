export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:standard.relay.metered.ca:80",
      username: "d7189e9c0ff8ed4ef5c930a2",
      credential: "Wzt5InfO+njbBvJE",
    },
    {
      urls: "turn:standard.relay.metered.ca:80?transport=tcp",
      username: "d7189e9c0ff8ed4ef5c930a2",
      credential: "Wzt5InfO+njbBvJE",
    },
    {
      urls: "turn:standard.relay.metered.ca:443",
      username: "d7189e9c0ff8ed4ef5c930a2",
      credential: "Wzt5InfO+njbBvJE",
    },
    {
      urls: "turns:standard.relay.metered.ca:443?transport=tcp",
      username: "d7189e9c0ff8ed4ef5c930a2",
      credential: "Wzt5InfO+njbBvJE",
    },
  ],
};
