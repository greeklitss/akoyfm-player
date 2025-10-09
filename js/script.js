// **ΟΡΙΣΜΟΣ ΔΙΕΥΘΥΝΣΕΩΝ (Η ΣΩΣΤΗ ΔΟΜΗ)**
const RADIO_NAME = "AKOYFM"; 

// 1. URL_STREAMING: Χρησιμοποιείται ΜΟΝΟ για τα API των ΤΙΤΛΩΝ (Metadata: τίτλοι & ιστορικό)
// Χρησιμοποιούμε τη διεύθυνση με την Port 
const URL_STREAMING = "https://uk24freenew.listen2myradio.com:9254/"; 

// 2. URL_AUDIO: Χρησιμοποιείται για την αναπαραγωγή της ΜΟΥΣΙΚΗΣ (Η real διεύθυνση που μου έδωσες)
const URL_AUDIO = "https://uk24freenew.listen2myradio.com/live.mp3?typeportmount=s1_9254_stream_741698340";

//API URL /
// Τα API για τους τίτλους χρησιμοποιούν υποχρεωτικά το URL_STREAMING
const API_URL = 'https://twj.es/free/?url=' + URL_STREAMING; // **ΔΙΟΡΘΩΣΗ: Χρησιμοποιεί το URL_STREAMING**
const FALLBACK_API_URL = 'https://twj.es/metadata/?url=' + URL_STREAMING; // Προστέθηκε το Fallback API URL

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

    // Chama a função getStreamingData imediatamente quando a página carrega
    getStreamingData();

    // Define o intervalo para atualizar os dados de streaming a cada 10 segundos
    const streamingInterval = setInterval(getStreamingData, 10000);

    // Ajusta a altura da capa do álbum para ser igual à sua largura
    const coverArt = document.querySelector('.cover-album'); // Use querySelector para selecionar o elemento
    if (coverArt) { 
      // Adiciona uma verificação para garantir que o elemento exista
      coverArt.style.height = `${coverArt.offsetWidth}px`;
    } else {
      console.warn("Elemento .cover-album não encontrado.");
    }
});

// DOM control
class Page {
    constructor() {
        this.changeTitlePage = function (title = RADIO_NAME) {
            document.title = title;
        };

        this.refreshCurrentSong = function(song, artist) {
            const currentSong = document.getElementById('currentSong');
            const currentArtist = document.getElementById('currentArtist');
            const lyricsSong = document.getElementById('lyricsSong');
        
            if (song !== currentSong.textContent || artist !== currentArtist.textContent) { 
                // Esmaecer o conteúdo existente (fade-out)
                currentSong.classList.add('fade-out');
                currentArtist.classList.add('fade-out');
        
                setTimeout(function() {
                    // Atualizar o conteúdo após o fade-out
                    currentSong.textContent = song; 
                    currentArtist.textContent = artist;
                    lyricsSong.textContent = song + ' - ' + artist;
        
                    // Esmaecer o novo conteúdo (fade-in)
                    currentSong.classList.remove('fade-out');
                    currentSong.classList.add('fade-in');
                    currentArtist.classList.remove('fade-out');
                    currentArtist.classList.add('fade-in');
                }, 500); 
        
                setTimeout(function() {
                    // Remover as classes fade-in após a animação
                    currentSong.classList.remove('fade-in');
                    currentArtist.classList.remove('fade-in');
                }, 1000); 
            }
        };
          
        this.refreshHistoric = async function (info, n) {
            const historicDiv = document.querySelectorAll("#historicSong article")[n];
            const songName = document.querySelectorAll("#historicSong article .music-info .song")[n];
            const artistName = document.querySelectorAll("#historicSong article .music-info .artist")[n];
            const coverHistoric = document.querySelectorAll("#historicSong article .cover-historic")[n];

            const defaultCoverArt = "img/cover.png";

            // Extrai o título da música και το όνομα του καλλιτέχνη,
            // tratando a possibilidade de 'song' και 'artist' serem objetos ou strings.
            const songTitle = typeof info.song === "object" ? info.song.title : info.song;
            const songArtist = typeof info.artist === "object" ? info.artist.title : info.artist;

            // Define o conteúdo dos elementos HTML,
            // incluindo uma verificação para evitar erros caso os valores estejam ausentes.
            songName.innerHTML = songTitle || "Desconhecido";
            artistName.innerHTML = songArtist || "Desconhecido";

            try {
                // Utiliza os valores extraídos para buscar a capa do álbum na API do iTunes.
                const data = await getDataFromITunes(songArtist, songTitle, defaultCoverArt, defaultCoverArt);
                // Define a imagem de fundo do elemento 'coverHistoric' com a capa encontrada.
                coverHistoric.style.backgroundImage = "url(" + (data.art || defaultCoverArt) + ")";
            } catch (error) {
                // Captura e imprime o erro no console para ajudar na depuração.
                console.log("Erro ao buscar dados da API do iTunes:");
                console.error(error);
                // Define a imagem de fundo como a capa padrão em caso de erro.
                coverHistoric.style.backgroundImage = "url(" + defaultCoverArt + ")";
            }

            // Adiciona a classe 'animated' para a animação de slide.
            historicDiv.classList.add("animated", "slideInRight");
            // Remove a classe 'animated' após 2 segundos para preparar para a próxima animação.
            setTimeout(() => historicDiv.classList.remove("animated", "slideInRight"), 2000);
        };
                
        this.refreshCover = async function (song = '', artist) {
            const coverArt = document.getElementById('currentCoverArt');
            const coverBackground = document.getElementById('bgCover');
            const defaultCoverArt = 'img/cover.png'; 
        
            try {
                const data = await getDataFromITunes(artist, song, defaultCoverArt, defaultCoverArt);
        
                // Aplica a imagem de capa (sempre, mesmo se for a padrão)
                coverArt.style.backgroundImage = 'url(' + data.art + ')';
                coverBackground.style.backgroundImage = 'url(' + data.cover + ')';
        
                // Adiciona/remove classes para animação (se necessário)
                coverArt.classList.add('animated', 'bounceInLeft');
                setTimeout(() => coverArt.classList.remove('animated', 'bounceInLeft'), 2000);
              
                // Atualiza MediaSession (se suportado)
                if ('mediaSession' in navigator) {
                    const