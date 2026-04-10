import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BirthdayTrackerComponent } from '../birthday-tracker/birthday-tracker';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BirthdayTrackerComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  constructor(public router: Router) {}

  logout() {
    this.router.navigate(['/login']);
  }
}
