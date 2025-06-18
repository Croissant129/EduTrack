// index.js

document.addEventListener("DOMContentLoaded", function () {
  const signup = document.getElementById('signupLink');
  const forgot = document.querySelector('.forgot');

  // Tombol Sign Up → redirect ke halaman signup
  if (signup) {
    signup.addEventListener('click', function () {
      window.location.href = 'signup.html';
    });
  }

  // Tombol Forgot Password
  if (forgot) {
    forgot.addEventListener('click', function () {
      alert('Silakan hubungi admin untuk reset password.');
    });
  }

  // Bisa ditambahkan jika ingin fitur auto-login dari sessionStorage
  // Auto login
  const currentUser = sessionStorage.getItem("currentUserName");
  if (currentUser) {
    window.location.href = "dashboard.html";
  }

});
