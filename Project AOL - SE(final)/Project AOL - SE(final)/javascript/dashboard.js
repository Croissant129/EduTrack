let selectedSubjectIdToDelete = null;

document.addEventListener("DOMContentLoaded", () => {
  const fullName = sessionStorage.getItem("currentUserName");
  const userId = sessionStorage.getItem("userId");

  if (!fullName || !userId) {
    alert("Silakan login terlebih dahulu.");
    window.location.href = "index.html";
    return;
  }

  document.getElementById("dashboardGreeting").innerHTML = `<b>Hello there, ${fullName}</b>`;
  document.getElementById("currentUserName").textContent = fullName;

  const colors = ["#bae6fd", "#ddd6fe", "#bbf7d0", "#fecaca", "#fef9c3", "#fde68a", "#c7d2fe", "#fdba74", "#fca5a5", "#a5f3fc", "#fcd34d", "#d8b4fe"];
  let subjectList = [];

  const showBtn = document.getElementById("showInputBtn");
  const insertBtn = document.getElementById("insertBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const modal = document.getElementById("modal");
  const alertBox = document.getElementById("alertBox");

  const removeBtn = document.getElementById("removeBtn");
  const removeModal = document.getElementById("removeModal");
  const removeSubjectList = document.getElementById("removeSubjectList");
  const confirmRemoveBtn = document.getElementById("confirmRemoveBtn");
  const cancelRemoveBtn = document.getElementById("cancelRemoveBtn");
  const confirmModal = document.getElementById("confirmModal");
  const finalRemoveBtn = document.getElementById("finalRemoveBtn");
  const cancelFinalBtn = document.getElementById("cancelFinalBtn");

  function openModal(modalEl) {
    modalEl.classList.remove("hidden", "hide");
    modalEl.classList.add("show");
  }

  function closeModal(modalEl) {
    modalEl.classList.remove("show");
    modalEl.classList.add("hide");
    setTimeout(() => {
      modalEl.classList.add("hidden");
    }, 350);
  }

  async function loadSubjects() {
    try {
      const res = await fetch("http://localhost:5000/subjects", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        subjectList = data;
        renderSubjects();
        await loadAllAssignments();
      } else {
        alert(data.error || "Gagal mengambil data subjects.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghubungi server.");
    }
  }

  async function loadAllAssignments() {
    const allAssignments = [];
    for (let subject of subjectList) {
      try {
        const res = await fetch(`http://localhost:5000/assignments/${subject.id}`, {
          credentials: "include"
        });
        const data = await res.json();
        if (res.ok) {
          data.forEach(d => d.subject_id = subject.id);
          allAssignments.push(...data);
        }
      } catch (err) {
        console.error(`Gagal fetch assignments untuk ${subject.name}`, err);
      }
    }
    renderAssignments(allAssignments);
    updateNotification(allAssignments);
    renderProgress(allAssignments);
  }

  function renderAssignments(assignments) {
    const container = document.getElementById("dashboardTodoList");
    container.innerHTML = "";

    if (!assignments || assignments.length === 0) {
      container.innerHTML = "<p style='color:#999;'>No assignments available.</p>";
      return;
    }

    const today = new Date();

    assignments.forEach(assignment => {
      const deadline = new Date(assignment.deadline);
      const isUrgent = (deadline - today) / (1000 * 60 * 60 * 24) <= 1;
      const subject = subjectList.find(s => s.id === assignment.subject_id);
      const subjectName = subject ? subject.name : "Unknown Subject";

      const card = document.createElement("div");
      card.className = "todo-card";
      card.innerHTML = `
        <div class="todo-header">
          <h5>${assignment.name} - ${subjectName}</h5>
          <button class="delete-assignment icon-btn" data-id="${assignment.id}" title="Hapus">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
        <div class="todo-deadline ${isUrgent ? 'urgent' : ''}">Deadline: ${deadline.toLocaleDateString()}</div>
      `;
      container.appendChild(card);

      card.querySelector(".delete-assignment").addEventListener("click", async (e) => {
        e.stopPropagation();
        const confirmDelete = confirm(`Yakin ingin menghapus assignment "${assignment.name}"? Semua subtask akan ikut terhapus.`);
        if (!confirmDelete) return;

        try {
          const res = await fetch(`http://localhost:5000/assignments/${assignment.id}`, {
            method: "DELETE",
            credentials: "include"
          });
          const data = await res.json();
          if (res.ok) {
            showSuccess(`Assignment "${assignment.name}" berhasil dihapus!`);
            await loadSubjects();
          } else {
            alert(data.error || "Gagal menghapus assignment.");
          }
        } catch (err) {
          alert("Gagal menghubungi server.");
        }
      });
    });
  }

  function renderSubjects() {
    const container = document.getElementById("subjectsContainer");
    container.innerHTML = "";

    subjectList.forEach(subject => {
      const card = document.createElement("div");
      card.className = "subject-card";
      card.style.backgroundColor = subject.color || "#e5e5e5";
      card.innerHTML = `
        <div class="card-footer">
          <span class="subject-title">${subject.name}</span>
          <div class="icons"></div>
        </div>
      `;
      card.addEventListener("click", (e) => {
        if (e.target.closest(".icon-btn")) return;
        sessionStorage.setItem("selectedSubject", subject.id);
        sessionStorage.setItem("subjectMeta_" + subject.id, JSON.stringify(subject));
        window.location.href = "subject.html";
      });
      container.appendChild(card);
    });
  }

  // REMOVE SUBJECT
  removeBtn.addEventListener("click", () => {
    removeSubjectList.innerHTML = "";
    selectedSubjectIdToDelete = null;
    confirmRemoveBtn.disabled = true;

    subjectList.forEach(subject => {
      const card = document.createElement("div");
      card.className = "subject-card";
      card.style.backgroundColor = subject.color || "#e5e5e5";
      card.innerHTML = `<div class="card-footer"><span class="subject-title">${subject.name}</span></div>`;
      card.addEventListener("click", () => {
        [...removeSubjectList.children].forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        selectedSubjectIdToDelete = subject.id;
        confirmRemoveBtn.disabled = false;
      });
      removeSubjectList.appendChild(card);
    });

    openModal(removeModal);
  });

  cancelRemoveBtn.addEventListener("click", () => {
    closeModal(removeModal);
  });

  confirmRemoveBtn.addEventListener("click", () => {
    closeModal(removeModal);
    openModal(confirmModal);
  });

  cancelFinalBtn.addEventListener("click", () => {
    closeModal(confirmModal);
  });

  finalRemoveBtn.addEventListener("click", async () => {
    if (!selectedSubjectIdToDelete) return;
    try {
      const res = await fetch(`http://localhost:5000/subjects/${selectedSubjectIdToDelete}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok) {
        closeModal(confirmModal);
        showSuccess("Subject berhasil dihapus!");
        await loadSubjects();
      } else {
        alert(data.error || "Gagal menghapus subject.");
      }
    } catch (err) {
      alert("Gagal menghubungi server.");
    }
  });

  function updateNotification(assignments) {
    const notifContainer = document.getElementById("notifContent");
    notifContainer.innerHTML = "";

    const now = new Date();
    const upcoming = assignments.filter(a => new Date(a.deadline) >= now);
    if (upcoming.length === 0) {
      notifContainer.innerHTML = "<p>No upcoming assignments</p>";
      return;
    }

    upcoming.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    upcoming.forEach(a => {
      const subject = subjectList.find(s => s.id === a.subject_id);
      const subjectName = subject ? subject.name : "Unknown";
      const deadlineStr = new Date(a.deadline).toLocaleDateString();
      const p = document.createElement("p");
      p.textContent = `${a.name} - ${subjectName} (due ${deadlineStr})`;
      notifContainer.appendChild(p);
    });
  }

  async function renderProgress(assignments) {
    const progressContainer = document.getElementById("dashboardProgressList");
    if (!progressContainer) return;
    progressContainer.innerHTML = "";

    for (const assignment of assignments) {
      try {
        const res = await fetch(`http://localhost:5000/subtasks/${assignment.id}`, { credentials: "include" });
        const subtasks = await res.json();
        if (!Array.isArray(subtasks) || subtasks.length === 0) continue;

        const completed = subtasks.filter(st => st.is_checked).length;
        const percent = Math.round((completed / subtasks.length) * 100);
        const subject = subjectList.find(s => s.id === assignment.subject_id);
        const subjectName = subject ? subject.name : "Unknown";

        const card = document.createElement("div");
        card.className = "progress-card";
        card.innerHTML = `
          <div class="progress-label">${assignment.name} - ${subjectName} (${percent}%)</div>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width:${percent}%;">${percent}%</div>
          </div>
        `;
        progressContainer.appendChild(card);
      } catch (err) {
        console.error(`Gagal fetch subtasks untuk ${assignment.name}`, err);
      }
    }
  }

  function showSuccess(message) {
    const modal = document.getElementById("successModal");
    document.getElementById("successMessage").textContent = message;
    openModal(modal);
  }

  document.getElementById("successCloseBtn").addEventListener("click", () => {
    closeModal(document.getElementById("successModal"));
  });

  insertBtn.addEventListener("click", async () => {
    const subject = document.getElementById("subjectInput").value.trim();
    alertBox.classList.add("hidden");

    if (!subject) {
      alertBox.textContent = "Nama subject tidak boleh kosong!";
      alertBox.classList.remove("hidden");
      return;
    }

    if (subjectList.find(s => s.name === subject)) {
      alertBox.textContent = "Subject sudah ada!";
      alertBox.classList.remove("hidden");
      return;
    }

    const color = colors[Math.floor(Math.random() * colors.length)];

    try {
      const res = await fetch("http://localhost:5000/subjects", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: subject, color })
      });

      const data = await res.json();
      if (res.ok) {
        closeModal(modal);
        document.getElementById("subjectInput").value = "";
        showSuccess(`Subject "${subject}" berhasil ditambahkan!`);
        await loadSubjects();
      } else {
        alert(data.error || "Gagal menambahkan subject.");
      }
    } catch (err) {
      alert("Gagal menghubungi server.");
    }
  });

  cancelBtn.addEventListener("click", () => {
    closeModal(modal);
    document.getElementById("subjectInput").value = "";
    alertBox.classList.add("hidden");
  });

  showBtn.addEventListener("click", () => {
    openModal(modal);
    document.getElementById("subjectInput").focus();
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });

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

  loadSubjects();
});
