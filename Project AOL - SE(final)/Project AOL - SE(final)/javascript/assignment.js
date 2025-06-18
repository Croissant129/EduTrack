function showAlert(message) {
  const alertBox = document.getElementById("customAlert");
  if (!alertBox) return alert(message);
  alertBox.textContent = message;
  alertBox.style.display = "block";
  setTimeout(() => {
    alertBox.style.display = "none";
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  const assignment = JSON.parse(sessionStorage.getItem("currentAssignment"));
  if (!assignment) {
    showAlert("Assignment tidak ditemukan.");
    window.location.href = "subject.html";
    return;
  }

  const assignmentId = assignment.id;
  document.getElementById("assignmentTitle").textContent =
    `${assignment.name} - Deadline: ${assignment.deadline}`;

  const fullName = sessionStorage.getItem("currentUserName") || "User";
  const userId = sessionStorage.getItem("userId");
  if (!userId) {
    alert("Silakan login terlebih dahulu.");
    window.location.href = "index.html";
    return;
  }

  document.getElementById("currentUserName").textContent = fullName;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });

  document.getElementById("notifBtn").addEventListener("click", () => {
    document.getElementById("notifPopup").classList.toggle("hidden");
    document.getElementById("userPopup").classList.add("hidden");
    loadNotifications();
  });

  document.getElementById("userBtn").addEventListener("click", () => {
    document.getElementById("userPopup").classList.toggle("hidden");
    document.getElementById("notifPopup").classList.add("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#userBtn") && !e.target.closest("#userPopup")) {
      document.getElementById("userPopup").classList.add("hidden");
    }
    if (!e.target.closest("#notifBtn") && !e.target.closest("#notifPopup")) {
      document.getElementById("notifPopup").classList.add("hidden");
    }
  });

  document.getElementById("generateSubtaskBtn").addEventListener("click", generateSubtasks);
  document.getElementById("deleteAllBtn").addEventListener("click", deleteAllSubtasks);

  loadSubtasks();
  loadNotifications();

  const subtaskList = document.getElementById("subtaskList");
  const progressBar = document.getElementById("progress");

  async function loadSubtasks() {
    try {
      const res = await fetch(`http://localhost:5000/subtasks/${assignmentId}`, {
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok) renderSubtasks(data);
      else showAlert(data.error || "Gagal memuat subtasks.");
    } catch (err) {
      console.error("Gagal load subtasks:", err);
      showAlert("Gagal menghubungi server.");
    }
  }

  function renderSubtasks(subtasks) {
    subtaskList.innerHTML = "";
    if (!subtasks.length) {
      subtaskList.innerHTML = "<p style='color:#888;'>Belum ada subtask.</p>";
      progressBar.style.width = "0%";
      return;
    }

    let checked = 0;
    subtasks.forEach(sub => {
      const item = document.createElement("div");
      item.className = "subtask-item";
      item.innerHTML = `
        <input type="checkbox" id="sub-${sub.id}" ${sub.is_checked ? "checked" : ""}>
        <label for="sub-${sub.id}">${sub.name}</label>
      `;
      const checkbox = item.querySelector("input");
      checkbox.addEventListener("change", () => toggleSubtask(sub.id, checkbox.checked));
      if (sub.is_checked) checked++;
      subtaskList.appendChild(item);
    });

    const percent = Math.round((checked / subtasks.length) * 100);
    progressBar.style.width = `${percent}%`;
  }

  async function toggleSubtask(subtaskId, isChecked) {
    try {
      const res = await fetch(`http://localhost:5000/subtasks/${subtaskId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_checked: isChecked })
      });

      if (!res.ok) {
        const data = await res.json();
        showAlert(data.error || "Gagal update checklist.");
      } else {
        loadSubtasks();
      }
    } catch (err) {
      console.error("Error toggle:", err);
    }
  }

  async function generateSubtasks() {
    const count = parseInt(document.getElementById("taskCount").value);
    if (!count || count < 1) return showAlert("Jumlah tidak valid");

    let existing = [];
    try {
      const res = await fetch(`http://localhost:5000/subtasks/${assignmentId}`, {
        credentials: "include"
      });
      if (res.ok) existing = await res.json();
    } catch (err) {
      console.error("Gagal validasi:", err);
    }

    const existingNames = existing.map(e => e.name);
    let created = 0;

    for (let i = 1; i <= count; i++) {
      const name = `Nomor ${i}`;
      if (existingNames.includes(name)) continue;

      const res = await fetch(`http://localhost:5000/subtasks/${assignmentId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });

      if (res.ok) created++;
    }

    if (created === 0) showAlert("Semua subtask sudah ada.");
    loadSubtasks();
  }

  async function deleteAllSubtasks() {
    if (!confirm("Yakin ingin menghapus semua subtask?")) return;

    try {
      const res = await fetch(`http://localhost:5000/subtasks/${assignmentId}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok) showAlert(data.message || "Berhasil dihapus.");
      else showAlert(data.error || "Gagal hapus.");
      loadSubtasks();
    } catch (err) {
      showAlert("Gagal menghubungi server.");
    }
  }

  async function loadNotifications() {
    const container = document.getElementById("notifContent");
    container.innerHTML = "";
    try {
      const res = await fetch("http://localhost:5000/subjects", {
        credentials: "include"
      });
      const subjects = await res.json();
      const assignments = [];

      for (let subject of subjects) {
        const r = await fetch(`http://localhost:5000/assignments/${subject.id}`, {
          credentials: "include"
        });
        const data = await r.json();
        if (r.ok) {
          data.forEach(a => a.subjectName = subject.name);
          assignments.push(...data);
        }
      }

      const now = new Date();
      const upcoming = assignments.filter(a => new Date(a.deadline) >= now);
      if (upcoming.length === 0) {
        container.innerHTML = "<p>No upcoming assignments</p>";
        return;
      }

      upcoming.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      upcoming.forEach(a => {
        const p = document.createElement("p");
        p.textContent = `${a.name} - ${a.subjectName} (due ${new Date(a.deadline).toLocaleDateString()})`;
        container.appendChild(p);
      });
    } catch (err) {
      container.innerHTML = "<p>Gagal memuat notifikasi</p>";
    }
  }
});
