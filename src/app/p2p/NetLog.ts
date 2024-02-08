export function serverLog(...messages: any[]): void {
  console.log("[NET-SERVER]", ...messages);
}

export function clientLog(...messages: any[]): void {
  console.log("[NET-CLIENT]", ...messages);
}
