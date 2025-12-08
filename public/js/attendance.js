document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('attendanceList');
  const form = document.getElementById('attendanceForm');

  async function fetchRecords() {
    listEl.innerHTML = '<li>Loading...</li>';
    try {
      const res = await fetch('/api/attendance');
      if (!res.ok) {
        const body = await res.text().catch(()=>res.statusText);
        throw new Error(`Server ${res.status}: ${body}`);
      }
      const data = await res.json();
      renderList(data);
    } catch (err) {
      listEl.innerHTML = `<li class="error">Error loading records: ${escapeHtml(err.message)}</li>`;
      console.error(err);
    }
  }

  function renderList(items = []) {
    if (!items.length) {
      listEl.innerHTML = '<li>No records</li>';
      return;
    }
    listEl.innerHTML = items.map(it => {
      const date = it.date ? new Date(it.date).toLocaleDateString() : '';
      const status = it.status || '';
      const uid = it.userId ?? it.UserId ?? '-';
      const eid = it.eventId ?? it.EventId ?? '-';
      // If no explicit name, show "User #<id>"
      const name = it.name || it.fullName || `User #${uid}`;
      return `<li>${escapeHtml(name)} — ${date} — ${escapeHtml(status)} <small>(user:${escapeHtml(uid)} event:${escapeHtml(eid)})</small></li>`;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      date: formData.get('date'),
      status: formData.get('status'),
      userId: Number(formData.get('userId')) || undefined,
      eventId: Number(formData.get('eventId')) || undefined
    };

    if (!payload.userId || !payload.eventId) {
      alert('userId and eventId are required and must be > 0');
      return;
    }

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        let errMsg = `${res.status} ${res.statusText}`;
        try {
          const json = await res.json();
          errMsg = json.message || JSON.stringify(json);
        } catch (_) {
          const text = await res.text().catch(()=>null);
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }
      form.reset();
      form.querySelector('input[name="userId"]').value = payload.userId;
      form.querySelector('input[name="eventId"]').value = payload.eventId;
      await fetchRecords();
    } catch (err) {
      alert('Could not add record: ' + err.message);
      console.error(err);
    }
  });

  fetchRecords();
});
