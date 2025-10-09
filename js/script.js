// **ΟΡΙΣΜΟΣ ΔΙΕΥΘΥΝΣΕΩΝ (Η ΣΩΣΤΗ ΔΟΜΗ)**
const RADIO_NAME = "AKOYFM"; 

// 1. URL_STREAMING: Χρησιμοποιείται ΜΟΝΟ για τα API των ΤΙΤΛΩΝ (Metadata: τίτλοι & ιστορικό)
// Χρησιμοποιούμε τη διεύθυνση με την Port 
const URL_STREAMING = "https://uk24freenew.listen2myradio.com:9254/"; 

// 2. URL_AUDIO: Χρησιμοποιείται για την αναπαραγωγή της ΜΟΥΣΙΚΗΣ (Η real διεύθυνση που μου έδωσες)
const URL_AUDIO = "https://uk24freenew.listen2myradio.com/live.mp3?typeportmount=s1_9254_stream_741698340";

//API URL /
// Τα API για τους τίτλους χρησιμοποιούν υποχρεωτικά το URL_STREAMING
const API_URL = 'https://twj.es/free/?url=' + URL_STREAMING; // ΔΙΟΡΘΩΣΗ: Σωστή σύνταξη
const FALLBACK_API_URL = 'https://twj.es/metadata/?url=' + URL_STREAMING;

// Visit https://api.vagalume.com.br/docs/ to get your API key
const API_KEY = "18fe07917957c289983464588aabddfb";

let userInteracted = true;
let musicaAtual = null;

// Cache para a API do iTunes
const cache = {};
   
window.addEventListener('load', () => { 
    const page = new Page();
    page.changeTitlePage();
    page.setVolume();

    const player = new Player();
    player.play();

    // Chama a função getStreamingData inmediatamente
    getStreamingData();

    // Define o intervalo para atualizar os dados de streaming a cada 10 segundos
    const streamingInterval = setInterval(getStreamingData, 10000);

    // Ajusta a altura της cover
    const coverArt = document.querySelector('.cover-album'); 
    if (coverArt) { 
      coverArt.style.height =