// auth.js
document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!email || !password) {
        alert("Email dan password tidak boleh kosong!");
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/login", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });

        let data = {};
        try { data = await response.json(); } catch {}

        if (response.ok) {
          // Simpan ke sessionStorage
          sessionStorage.setItem("currentUserName", data.name || "User");
          sessionStorage.setItem("userId", data.user_id || "");
          window.location.href = "dashboard.html";
        } else {
          alert(data.error || "Login gagal. Periksa kembali email dan password.");
        }
      } catch (error) {
        console.error("Terjadi kesalahan saat login:", error);
        alert("Gagal menghubungi server. Coba lagi nanti.");
      }
    });
  }
});
