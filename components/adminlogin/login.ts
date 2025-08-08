import { Component } from '@angular/core';
import { Adminservice } from '../../services/adminservice';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  constructor(private adminService: Adminservice, private router: Router) {}
  
  isLoading: boolean = false;
  loginError: string = '';
  
  loginData = {
    username: '',
    password: ''
  };

  onLogin() {
    console.log('=== ADMIN LOGIN ATTEMPT ===');
    console.log('Username:', this.loginData.username);
    
    // Basic validation
    if (!this.loginData.username || !this.loginData.password) {
      this.loginError = 'Please enter both username and password';
      alert('Please enter both username and password');
      return;
    }

    this.isLoading = true;
    this.loginError = '';

    // Use the new Observable-based admin login method
    this.adminService.adminLogin(this.loginData.username, this.loginData.password).subscribe({
      next: (response: any) => {
        console.log('=== ADMIN LOGIN SUCCESS ===');
        console.log('Login response:', response);
        this.isLoading = false;
        
        if (response.success) {
          // Store admin session data
          localStorage.setItem('adminLoggedIn', 'true');
          localStorage.setItem('adminUsername', response.username);
          localStorage.setItem('adminRole', response.role);
          
          alert(`✅ ${response.message}\n\nWelcome, ${response.username}!`);
          this.router.navigate(['admindashurl']);
        } else {
          this.loginError = response.message || 'Login failed';
          alert(`❌ ${this.loginError}`);
        }
      },
      error: (error: any) => {
        console.log('=== ADMIN LOGIN ERROR ===');
        console.error('Login error:', error);
        this.isLoading = false;
        
        if (error.type === 'unauthorized') {
          this.loginError = 'Invalid admin credentials. Please check your username and password.';
        } else if (error.status === 0) {
          this.loginError = 'Cannot connect to server. Please check your internet connection.';
        } else {
          this.loginError = error.message || 'Login failed. Please try again.';
        }
        
        alert(`❌ Login Failed: ${this.loginError}`);
      }
    });
  }

  // Clear error when user starts typing
  onInputChange() {
    this.loginError = '';
  }
}
