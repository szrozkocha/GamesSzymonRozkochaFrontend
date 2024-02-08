import { Routes } from '@angular/router';
import {MainPageComponent} from "./main-page/main-page.component";
import {authGuard} from "./auth.guard";

export const routes: Routes = [
  {
    path: "",
    component: MainPageComponent,
    canActivate: [authGuard]
  }
];
