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
  const assignmentData = JSON.parse(sessionStorage.getItem("currentAssignment"));
  if (!assignmentData) {
    showAlert("Tidak ada assignment yang dipilih.");
    window.location.href = "subject.html";
    return;
  }

  const { id: assignmentId, name, deadline } = assignmentData;
  document.getElementById("assignmentTitle").textContent = `${name} - Deadline: ${deadline}`;

  const fullName = sessionStorage.getItem("currentUserName") || "User";
  const userId = sessionStorage.getItem("userId");
  if (!userId) {
    alert("Silakan login terlebih dahulu.");
    window.location.href = "index.html";
    return;
  }

  document.getElementById("currentUserName").textContent = fullName;

  const notifBtn = document.getElementById("notifBtn");
  const userBtn = document.getElementById("userBtn");
  const notifPopup = document.getElementById("notifPopup");
  const userPopup = document.getElementById("userPopup");

  notifBtn?.addEventListener("click", () => {
    notifPopup.classList.toggle("hidden");
    userPopup.classList.add("hidden");
    loadNotifications(); // ✅ Tambahan kunci
  });

  userBtn?.addEventListener("click", () => {
    userPopup.classList.toggle("hidden");
    notifPopup.classList.add("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#userBtn") && !e.target.closest("#userPopup")) {
      userPopup.classList.add("hidden");
    }
    if (!e.target.closest("#notifBtn") && !e.target.closest("#notifPopup")) {
      notifPopup.classList.add("hidden");
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });

  const subtaskInput = document.getElementById("subtaskInput");
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
      console.error(err);
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

  document.getElementById("addSubtaskBtn")?.addEventListener("click", async () => {
    const name = subtaskInput.value.trim();
    if (!name) {
      showAlert("Nama subtask tidak boleh kosong.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/subtasks/${assignmentId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });

      const data = await res.json();
      if (res.ok) {
        subtaskInput.value = "";
        loadSubtasks();
      } else {
        showAlert(data.error || "Gagal menambahkan subtask.");
      }
    } catch (err) {
      console.error(err);
    }
  });

  async function loadNotifications() {
    const notifContainer = document.getElementById("notifContent");
    notifContainer.innerHTML = "";

    try {
      const res = await fetch("http://localhost:5000/subjects", {
        credentials: "include"
      });
      const subjects = await res.json();
      if (!Array.isArray(subjects)) throw new Error("Subjects invalid");

      const allAssignments = [];

      for (const subject of subjects) {
        const r = await fetch(`http://localhost:5000/assignments/${subject.id}`, {
          credentials: "include"
        });
        const data = await r.json();
        if (r.ok && Array.isArray(data)) {
          data.forEach(d => d.subjectName = subject.name);
          allAssignments.push(...data);
        }
      }

      const now = new Date();
      const upcoming = allAssignments.filter(a => new Date(a.deadline) >= now);

      if (!upcoming.length) {
        notifContainer.innerHTML = "<p>No upcoming assignments</p>";
        return;
      }

      upcoming.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

      upcoming.forEach(a => {
        const p = document.createElement("p");
        p.textContent = `${a.name} - ${a.subjectName} (due ${new Date(a.deadline).toLocaleDateString()})`;
        notifContainer.appendChild(p);
      });

    } catch (err) {
      console.error("Gagal memuat notifikasi:", err);
      notifContainer.innerHTML = "<p>Gagal memuat notifikasi</p>";
    }
  }

  loadSubtasks();
  loadNotifications();
});
