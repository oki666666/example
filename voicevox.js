class VoicevoxClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.abortController = null;
        this.currentAudio = null;
        this.currentAudioUrl = null;
    }

    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    async fetchSpeakers() {
        const response = await fetch(`${this.baseUrl}/speakers`);
        if (!response.ok) {
            throw new Error(`話者一覧の取得に失敗: ${response.status}`);
        }
        return response.json();
    }

    async createAudioQuery(text, speaker) {
        const params = new URLSearchParams({
            text,
            speaker: String(speaker)
        });
        const signal = this.prepareAbortSignal();
        const response = await fetch(`${this.baseUrl}/audio_query?${params.toString()}`, {
            method: 'POST',
            signal
        });
        if (!response.ok) {
            throw new Error(`audio_queryに失敗: ${response.status}`);
        }
        return response.json();
    }

    async synthesis(audioQuery, speaker) {
        const signal = this.prepareAbortSignal();
        const response = await fetch(`${this.baseUrl}/synthesis?speaker=${speaker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(audioQuery),
            signal
        });
        if (!response.ok) {
            throw new Error(`synthesisに失敗: ${response.status}`);
        }
        return response.blob();
    }

    async speak(text, speaker) {
        this.stopSpeaking();
        try {
            const audioQuery = await this.createAudioQuery(text, speaker);
            const audioBlob = await this.synthesis(audioQuery, speaker);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            this.currentAudio = audio;
            this.currentAudioUrl = audioUrl;
            await audio.play();
            await new Promise((resolve) => {
                audio.onended = resolve;
                audio.onpause = resolve;
                audio.onerror = resolve;
            });
        } catch (error) {
            if (error && error.name === 'AbortError') {
                throw new Error('読み上げを停止しました');
            }
            throw error;
        } finally {
            this.cleanupAudio();
            this.abortController = null;
        }
    }

    prepareAbortSignal() {
        if (!this.abortController) {
            this.abortController = new AbortController();
        }
        return this.abortController.signal;
    }

    stopSpeaking() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.cleanupAudio();
    }

    cleanupAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        if (this.currentAudioUrl) {
            URL.revokeObjectURL(this.currentAudioUrl);
            this.currentAudioUrl = null;
        }
    }
}
