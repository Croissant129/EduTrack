function showAlert(message) {
  const alertBox = document.getElementById("customAlert");
  if (!alertBox) return alert(message); // fallback

  alertBox.textContent = message;
  alertBox.classList.remove("hidden");
  setTimeout(() => {
    alertBox.classList.add("hidden");
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  const fullName = sessionStorage.getItem("currentUserName");
  const userId = sessionStorage.getItem("userId");
  if (!fullName || !userId) {
    alert("Silakan login terlebih dahulu.");
    window.location.href = "index.html";
    return;
  }

  document.getElementById("currentUserName").textContent = fullName;

  const notifBtn = document.getElementById("notifBtn");
  const userBtn = document.getElementById("userBtn");
  const notifPopup = document.getElementById("notifPopup");
  const userPopup = document.getElementById("userPopup");

  notifBtn.addEventListener("click", () => {
    notifPopup.classList.toggle("hidden");
    userPopup.classList.add("hidden");
  });

  userBtn.addEventListener("click", () => {
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

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });

  const subjectId = sessionStorage.getItem("selectedSubject");
  const subjectMeta = JSON.parse(sessionStorage.getItem("subjectMeta_" + subjectId));
  const subjectName = subjectMeta?.name || "[Subject]";
  const subjectColor = subjectMeta?.color || "#e5e5e5";

  const subjectTitleEl = document.getElementById("subjectTitle");
  const highlightBox = document.getElementById("highlightBox");
  const assignmentList = document.getElementById("assignmentList");
  const todoList = document.getElementById("todoList");

  if (!subjectId) {
    showAlert("Tidak ada subject yang dipilih.");
    window.location.href = "dashboard.html";
    return;
  }

  subjectTitleEl.textContent = subjectName;
  highlightBox.style.backgroundColor = subjectColor;
  window.selectedAssignment = null;

  async function loadAssignments() {
    try {
      const res = await fetch(`http://localhost:5000/assignments/${subjectId}`, {
        credentials: "include"
      });

      const data = await res.json();

      if (res.ok) {
        renderAssignments(data);
        renderTodo(data);
        updateNotification();
      } else {
        showAlert(data.error || "Gagal mengambil data assignment.");
      }
    } catch (err) {
      console.error("Gagal fetch:", err);
    }
  }

  function renderAssignments(assignments) {
    assignmentList.innerHTML = "";

    assignments.forEach((a) => {
      const card = document.createElement("div");
      card.className = "assignment-card";
      card.innerHTML = `
        <div class="title">${subjectName}</div>
        <div class="subtitle">${a.name}</div>
        <div class="footer">
          <span>Deadline</span>
          <span>${a.deadline}</span>
        </div>
      `;
      card.addEventListener("click", () => {
        sessionStorage.setItem("currentAssignment", JSON.stringify({
          id: a.id,
          name: a.name,
          deadline: a.deadline,
          subject_id: subjectId
        }));
        window.location.href = "assignment.html";
      });

      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        window.selectedAssignment = a;
        showContextMenuAt(e.pageX, e.pageY, a.name);
      });

      assignmentList.appendChild(card);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "add-button";
    addBtn.textContent = "+";
    addBtn.onclick = showModal;
    assignmentList.appendChild(addBtn);
  }

  function renderTodo(assignments) {
    if (!todoList) return;
    todoList.innerHTML = "";

    const now = new Date();

    assignments.forEach(a => {
      const deadlineDate = new Date(a.deadline);
      const diff = (deadlineDate - now) / (1000 * 60 * 60 * 24);
      const deadlineText = diff < 1 ? `<span class='urgent'>Tomorrow</span>` : a.deadline;

      const div = document.createElement("div");
      div.className = "todo-card";
      div.innerHTML = `
        <h5>${a.name} - ${subjectName}</h5>
        <div class="todo-deadline">Deadline: ${deadlineText}</div>
      `;
      todoList.appendChild(div);
    });
  }

  async function updateNotification() {
    const notifContainer = document.getElementById("notifContent");
    notifContainer.innerHTML = "";

    try {
      const subjectRes = await fetch("http://localhost:5000/subjects", { credentials: "include" });
      const subjects = await subjectRes.json();
      if (!Array.isArray(subjects)) throw new Error("Gagal memuat subjects");

      const allAssignments = [];

      for (const subject of subjects) {
        const assignRes = await fetch(`http://localhost:5000/assignments/${subject.id}`, { credentials: "include" });
        const data = await assignRes.json();
        if (Array.isArray(data)) {
          data.forEach(d => d.subjectName = subject.name);
          allAssignments.push(...data);
        }
      }

      const now = new Date();
      const upcoming = allAssignments.filter(a => new Date(a.deadline) >= now);

      if (upcoming.length === 0) {
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
      notifContainer.innerHTML = "<p>Error loading notifications</p>";
      console.error("Notif error:", err);
    }
  }

  window.addAssignment = async () => {
    const name = document.getElementById("assignmentInput").value.trim();
    const deadline = document.getElementById("assignmentDate").value;

    if (!name || !deadline) {
      showAlert("Assignment name dan deadline wajib diisi.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/assignments/${subjectId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, deadline })
      });

      const data = await res.json();
      if (res.ok) {
        closeModal();
        showAlert("Assignment berhasil ditambahkan!");
        loadAssignments();
      } else {
        showAlert(data.error || "Gagal menambahkan assignment.");
      }
    } catch (err) {
      console.error("Error saat menambahkan:", err);
    }
  };

  window.showModal = () => {
    const modal = document.getElementById("assignmentModal");
    modal.classList.remove("hidden", "hide");
    modal.classList.add("show");
    document.getElementById("assignmentInput").focus();
  };

  window.closeModal = () => {
    const modal = document.getElementById("assignmentModal");
    modal.classList.remove("show");
    modal.classList.add("hide");
    setTimeout(() => {
      modal.classList.add("hidden");
      document.getElementById("assignmentInput").value = "";
      document.getElementById("assignmentDate").value = "";
    }, 350);
  };

  function showContextMenuAt(x, y, name) {
    const menu = document.getElementById("assignmentContextMenu");
    const input = document.getElementById("renameInput");
    input.value = name;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove("hidden", "hide");
    menu.classList.add("show", "context-animated");
    input.focus();
  }

  window.closeContextMenu = () => {
    const menu = document.getElementById("assignmentContextMenu");
    if (menu) {
      menu.classList.remove("show");
      menu.classList.add("hide");
      setTimeout(() => {
        menu.classList.add("hidden");
        menu.classList.remove("hide", "context-animated");
      }, 300);
    }
    window.selectedAssignment = null;
  };

  window.renameAssignment = async () => {
    if (!window.selectedAssignment) return showAlert("Tidak ada assignment yang dipilih.");

    const newName = document.getElementById("renameInput").value.trim();
    if (!newName) return showAlert("Nama tidak boleh kosong.");

    try {
      const res = await fetch(`http://localhost:5000/assignments/${window.selectedAssignment.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName })
      });

      const data = await res.json();
      if (res.ok) {
        closeContextMenu();
        showAlert("Berhasil rename assignment.");
        loadAssignments();
      } else {
        showAlert(data.error || "Gagal rename assignment.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  window.deleteAssignment = async () => {
    if (!window.selectedAssignment) return;

    const confirmDelete = confirm(`Yakin ingin menghapus "${window.selectedAssignment.name}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/assignments/${window.selectedAssignment.id}`, {
        method: "DELETE",
        credentials: "include"
      });

      const data = await res.json();
      if (res.ok) {
        closeContextMenu();
        showAlert("Assignment berhasil dihapus.");
        loadAssignments();
      } else {
        showAlert(data.error || "Gagal menghapus assignment.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  document.addEventListener("mousedown", (e) => {
    const menu = document.getElementById("assignmentContextMenu");
    if (menu && !menu.contains(e.target)) {
      closeContextMenu();
    }
  });

  loadAssignments();
});
