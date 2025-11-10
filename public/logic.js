(function () {
  "use strict";

  document.addEventListener('DOMContentLoaded', () => {
    const newText = document.getElementById('newText');
    const newDone = document.getElementById('newDone');
    const btnAdd = document.getElementById('btnAdd');
    const output = document.getElementById('output');

    function show(obj) {
      output.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
    }

    async function fetchList() {
      try {
        const res = await fetch('/api/list');
        if (!res.ok) throw new Error(`list failed: ${res.status}`);
        const data = await res.json();
        show(data);
      } catch (err) {
        show({ error: err.message });
      }
    }

    btnAdd.addEventListener('click', async () => {
      const text = (newText.value || '').trim();
      const done = newDone.checked ? 'true' : 'false';
      if (!text) {
        show({ error: 'Please enter text for the new todo' });
        return;
      }

      btnAdd.disabled = true;
      show({ status: 'adding...' });

      try {
        const q = `?text=${encodeURIComponent(text)}&done=${encodeURIComponent(done)}`;
        const res = await fetch('/api/item/add' + q);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`add failed ${res.status}: ${txt}`);
        }
        const data = await res.json();
        show(data);
        // clear inputs
        newText.value = '';
        newDone.checked = false;
        // refresh list view
        await fetchList();
      } catch (err) {
        show({ error: err.message });
      } finally {
        btnAdd.disabled = false;
      }
    });

    // initial load
    fetchList();
  });
})();
