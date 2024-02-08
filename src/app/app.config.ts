import {APP_INITIALIZER, ApplicationConfig, inject} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import {environment} from "../environments/environment";
import {provideHttpClient} from "@angular/common/http";
import {AuthConfig, provideOAuthClient} from "angular-oauth2-oidc";
import {AuthService} from "./auth.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),
    provideOAuthClient({
      resourceServer: {
        allowedUrls: ['/api'],
        sendAccessToken: true
      }
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthService) => () => authService.init(),
      multi: true,
      deps: [AuthService]
    }
  ]
};
