import { Injectable } from '@angular/core';
import {AuthConfig, OAuthService} from "angular-oauth2-oidc";
import {environment} from "../environments/environment";

export const authConfig: AuthConfig = {
  issuer: 'https://szymon-rozkocha.eu.auth0.com/',
  redirectUri: window.location.origin,
  clientId: 'oFFmXvuFNNMPCvRPjzWvNE1iOIQ5TG8h',
  responseType: 'code',
  scope: 'openid profile email',
  showDebugInformation: !environment.production,
  customQueryParams: {
    audience: 'games.szymon.rozkocha.pl'
  }
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private oauthService: OAuthService) {
    this.oauthService.configure(authConfig);
  }

  public init(): Promise<void> {
    return this.oauthService.loadDiscoveryDocumentAndTryLogin()
      .then(() => {
        this.oauthService.setupAutomaticSilentRefresh();
        this.oauthService
        return;
      });
  }

  public login() {
    this.oauthService.initLoginFlow();
  }

  public isLogged(): boolean {
    return this.oauthService.hasValidAccessToken();
  }
  public logout() {
    this.oauthService.revokeTokenAndLogout();
  }

  public getUserId() {
    return (this.oauthService.getIdentityClaims() as any)?.sub;
  }
}
