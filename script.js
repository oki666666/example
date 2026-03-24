class TodoApp {
    constructor() {
        this.todos = this.loadTodos();
        this.currentFilter = 'all';
        this.voicevox = new VoicevoxClient('http://127.0.0.1:50021');
        this.speakers = [];
        this.isSpeaking = false;
        this.audioContext = null;
        this.initElements();
        this.loadVoiceSettings();
        this.attachEvents();
        this.render();
        this.initVoicevox();
    }

    initElements() {
        this.todoInput = document.getElementById('todoInput');
        this.addBtn = document.getElementById('addBtn');
        this.todoList = document.getElementById('todoList');
        this.todoCount = document.getElementById('todoCount');
        this.clearCompletedBtn = document.getElementById('clearCompleted');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.voicevoxBaseUrl = document.getElementById('voicevoxBaseUrl');
        this.speakerSelect = document.getElementById('speakerSelect');
        this.loadSpeakersBtn = document.getElementById('loadSpeakersBtn');
        this.speakActiveBtn = document.getElementById('speakActiveBtn');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.speakOnAdd = document.getElementById('speakOnAdd');
        this.beepOnComplete = document.getElementById('beepOnComplete');
    }

    attachEvents() {
        this.addBtn.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });
        this.voicevoxBaseUrl.addEventListener('change', () => this.updateVoicevoxBaseUrl());
        this.loadSpeakersBtn.addEventListener('click', () => this.loadSpeakers());
        this.speakActiveBtn.addEventListener('click', () => this.speakActiveTodos());
        this.speakOnAdd.addEventListener('change', () => this.saveVoiceSettings());
        this.beepOnComplete.addEventListener('change', () => this.saveVoiceSettings());
    }

    loadVoiceSettings() {
        const savedSpeakOnAdd = localStorage.getItem('voicevoxSpeakOnAdd');
        const savedBeepOnComplete = localStorage.getItem('voicevoxBeepOnComplete');
        if (this.speakOnAdd) {
            this.speakOnAdd.checked = savedSpeakOnAdd === 'true';
        }
        if (this.beepOnComplete) {
            this.beepOnComplete.checked = savedBeepOnComplete !== 'false';
        }
    }

    saveVoiceSettings() {
        localStorage.setItem('voicevoxSpeakOnAdd', String(this.speakOnAdd.checked));
        localStorage.setItem('voicevoxBeepOnComplete', String(this.beepOnComplete.checked));
    }

    initVoicevox() {
        const savedBaseUrl = localStorage.getItem('voicevoxBaseUrl');
        if (savedBaseUrl) {
            this.voicevoxBaseUrl.value = savedBaseUrl;
            this.voicevox.setBaseUrl(savedBaseUrl);
        }
        this.loadSpeakers();
    }

    loadTodos() {
        const saved = localStorage.getItem('todos');
        return saved ? JSON.parse(saved) : [];
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    updateVoicevoxBaseUrl() {
        const baseUrl = this.voicevoxBaseUrl.value.trim();
        if (!baseUrl) return;
        this.voicevox.setBaseUrl(baseUrl);
        localStorage.setItem('voicevoxBaseUrl', baseUrl);
        this.setVoiceStatus(`接続先を更新: ${baseUrl}`);
    }

    addTodo() {
        const text = this.todoInput.value.trim();
        if (!text) return;

        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.unshift(todo);
        this.todoInput.value = '';
        this.saveTodos();
        this.render();
        if (this.speakOnAdd.checked) {
            this.speakTodoAdded(todo.text);
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveTodos();
        this.render();
    }

    toggleTodo(id) {
        const todo = this.todos.find(todo => todo.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.render();
            if (todo.completed && this.beepOnComplete.checked) {
                this.playCompleteBeep();
            }
        }
    }

    clearCompleted() {
        this.todos = this.todos.filter(todo => !todo.completed);
        this.saveTodos();
        this.render();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.render();
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(todo => !todo.completed);
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            default:
                return this.todos;
        }
    }

    render() {
        const filteredTodos = this.getFilteredTodos();

        if (filteredTodos.length === 0) {
            this.todoList.innerHTML = '<li class="empty-state">タスクがありません</li>';
        } else {
            this.todoList.innerHTML = filteredTodos.map(todo => `
                <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                    <input
                        type="checkbox"
                        class="todo-checkbox"
                        ${todo.completed ? 'checked' : ''}
                        onchange="app.toggleTodo(${todo.id})"
                    />
                    <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                    <button class="delete-btn" onclick="app.deleteTodo(${todo.id})">削除</button>
                </li>
            `).join('');
        }

        const activeCount = this.todos.filter(todo => !todo.completed).length;
        this.todoCount.textContent = `${activeCount} 個のタスク`;
    }

    setVoiceStatus(message, isError = false) {
        this.voiceStatus.textContent = message;
        this.voiceStatus.classList.toggle('error', isError);
    }

    getSelectedSpeakerId() {
        return Number(this.speakerSelect.value);
    }

    async loadSpeakers() {
        try {
            this.updateVoicevoxBaseUrl();
            this.setVoiceStatus('話者一覧を取得中...');
            this.speakers = await this.voicevox.fetchSpeakers();
            const styles = this.speakers.flatMap(speaker =>
                speaker.styles.map(style => ({
                    id: style.id,
                    label: `${speaker.name} (${style.name})`
                }))
            );
            if (styles.length === 0) {
                this.speakerSelect.innerHTML = '<option value="">話者が見つかりません</option>';
                this.setVoiceStatus('話者が見つかりません', true);
                return;
            }
            this.speakerSelect.innerHTML = styles
                .map(style => `<option value="${style.id}">${this.escapeHtml(style.label)}</option>`)
                .join('');
            this.setVoiceStatus(`話者 ${styles.length} 件を読み込みました`);
        } catch (error) {
            this.setVoiceStatus(`接続失敗: ${error.message}`, true);
        }
    }

    async speakText(text) {
        const speaker = this.getSelectedSpeakerId();
        if (!Number.isFinite(speaker)) {
            throw new Error('先に話者を選択してください');
        }
        if (this.isSpeaking) {
            return;
        }
        this.isSpeaking = true;
        try {
            await this.voicevox.speak(text, speaker);
        } finally {
            this.isSpeaking = false;
        }
    }

    async speakTodoAdded(todoText) {
        try {
            this.setVoiceStatus('追加タスクを読み上げ中...');
            await this.speakText(`タスクを追加しました。${todoText}`);
            this.setVoiceStatus('読み上げ完了');
        } catch (error) {
            this.setVoiceStatus(`自動読み上げ失敗: ${error.message}`, true);
        }
    }

    playCompleteBeep() {
        const audioContext = this.getAudioContext();
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.12);
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.14);
    }

    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    buildActiveTodosSpeechText() {
        const activeTodos = this.todos.filter(todo => !todo.completed);
        if (activeTodos.length === 0) {
            return '未完了のタスクはありません。';
        }
        const lines = activeTodos.map((todo, index) => `${index + 1}番、${todo.text}`);
        return `未完了タスクを読み上げます。${lines.join('。')}`;
    }

    async speakActiveTodos() {
        const speechText = this.buildActiveTodosSpeechText();
        try {
            this.setVoiceStatus('読み上げ中...');
            await this.speakText(speechText);
            this.setVoiceStatus('読み上げ完了');
        } catch (error) {
            this.setVoiceStatus(`読み上げ失敗: ${error.message}`, true);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();
});
