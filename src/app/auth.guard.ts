import {CanActivateFn} from '@angular/router';
import {inject} from "@angular/core";
import {AuthService} from "./auth.service";

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  if(authService.isLogged()) {
    return true;
  } else {
    authService.login();
    return false;
  }
};
