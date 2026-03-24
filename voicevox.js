class VoicevoxClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
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
        const response = await fetch(`${this.baseUrl}/audio_query?${params.toString()}`, {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error(`audio_queryに失敗: ${response.status}`);
        }
        return response.json();
    }

    async synthesis(audioQuery, speaker) {
        const response = await fetch(`${this.baseUrl}/synthesis?speaker=${speaker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(audioQuery)
        });
        if (!response.ok) {
            throw new Error(`synthesisに失敗: ${response.status}`);
        }
        return response.blob();
    }

    async speak(text, speaker) {
        const audioQuery = await this.createAudioQuery(text, speaker);
        const audioBlob = await this.synthesis(audioQuery, speaker);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
        audio.onended = () => URL.revokeObjectURL(audioUrl);
    }
}
