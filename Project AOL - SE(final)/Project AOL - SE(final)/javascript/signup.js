// signup.js
document.addEventListener("DOMContentLoaded", function () {
  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const fullName = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!fullName || !email || !password) {
        alert("Semua field wajib diisi.");
        return;
      }

      if (!email.includes("@") || !email.includes(".")) {
        alert("Email tidak valid. Harus mengandung '@' dan '.'");
        return;
      }

      if (password.length < 6) {
        alert("Password minimal harus 6 karakter.");
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/signup", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            full_name: fullName,
            email: email,
            password: password
          })
        });

        let data = {};
        try { data = await response.json(); } catch {}

        if (response.ok) {
          alert("Akun berhasil dibuat! Silakan login.");
          window.location.href = "index.html";
        } else {
          alert(data.error || "Pendaftaran gagal.");
        }

      } catch (error) {
        console.error("Terjadi kesalahan saat signup:", error);
        alert("Gagal menghubungi server.");
      }
    });
  }
});
