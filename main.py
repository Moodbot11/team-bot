
import os
from flask import Flask, request, jsonify, render_template
from .env import load_.env
import openai
import requests
from io import BytesIO

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sk-proj-3cktAm2gcxW3iuLn8iqHT3BlbkFJDCOFoJo7n0lLovXQKCvC'

DEEPGRAM_API_KEY = os.getenv('DEEPGRAM_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

openai.api_key = OPENAI_API_KEY

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    audio_data = BytesIO(request.data)

    transcribe_response = requests.post(
        'https://api.deepgram.com/v1/listen',
        data=audio_data.read(),
        headers={
            'Content-Type': 'audio/wav',
            'Authorization': f'Bearer {DEEPGRAM_API_KEY}'
        }
    )

    if transcribe_response.status_code == 200:
        transcript = transcribe_response.json().get('results', {}).get('channels', [])[0].get('alternatives', [])[0].get('transcript', 'No transcript found')
        return jsonify(transcript=transcript)
    else:
        return jsonify(error="Transcription failed"), 500

@app.route('/synthesize', methods=['POST'])
def synthesize_audio():
    data = request.json
    text = data.get('text')

    response = openai.Audio.create(
        model="tts-1",
        voice="alloy",
        input=text
    )

    audio_content = BytesIO()
    for chunk in response.iter_bytes():
        audio_content.write(chunk)

    audio_content.seek(0)
    return send_file(audio_content, mimetype="audio/wav", as_attachment=True, attachment_filename="response.wav")

if __name__ == '__main__':
    app.run(port=5000)