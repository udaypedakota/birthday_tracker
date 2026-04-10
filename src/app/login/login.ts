import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  username = '';
  password = '';
  errorMsg = '';
  showPassword = false;
  showMemberList = false;
  confetti = Array.from({ length: 40 }, (_, i) => i);

  members: { name: string; username: string }[] = [];

  constructor(private router: Router, private http: HttpClient) {
    this.http.get<any[]>('assets/data/events.json').subscribe(data => {
      this.members = data.map(e => {
        const parts = e.employeeName.trim().split(' ');
        // format: word[1].word[0]@intellectinfo.com  e.g. Pedakota Uday Kumar → uday.pedakota
        const first = parts[0].toLowerCase();
        const second = parts.length > 1 ? parts[1].toLowerCase() : first;
        return { name: e.employeeName, username: `${second}.${first}@intellectinfo.com` };
      });
    });
  }

  login() {
    if (this.username === 'admin@intellectinfo.com' && this.password === 'SysAdmin') {
      localStorage.setItem('loggedInUser', 'Admin');
      localStorage.setItem('userRole', 'admin');
      this.router.navigate(['/dashboard']);
      return;
    }
    if (this.password === 'SysAdmin') {
      const match = this.members.find(
        m => m.username === this.username.toLowerCase()
      );
      if (match) {
        localStorage.setItem('loggedInUser', match.name);
        localStorage.setItem('userRole', 'viewer');
        this.router.navigate(['/dashboard']);
        return;
      }
    }
    this.errorMsg = 'Invalid username or password.';
  }
}
