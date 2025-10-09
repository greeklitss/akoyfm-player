// **ΟΡΙΣΜΟΣ ΔΙΕΥΘΥΝΣΕΩΝ**
const RADIO_NAME = "AKOYFM"; 

// 1. URL_STREAMING: Χρησιμοποιείται ΜΟΝΟ για τα API των ΤΙΤΛΩΝ (Metadata: τίτλοι & ιστορικό)
// Χρησιμοποιούμε τη διεύθυνση με την Port (ΣΗΜΑΝΤΙΚΟ: ΧΩΡΙΣ ΤΗΝ / ΣΤΟ ΤΕΛΟΣ)
const URL_STREAMING = "https://uk24freenew.listen2myradio.com:9254"; 

// 2. URL_AUDIO: Χρησιμοποιείται για την αναπαραγωγή της ΜΟΥΣΙΚΗΣ
const URL_AUDIO = "https://uk24freenew.listen2myradio.com/live.mp3?typeportmount=s1_9254_stream_741698340";

// --- API FIX: Χρησιμοποιούμε Exstreamer Proxy για Shoutcast V1 Metadata ---
// Ο συγκεκριμένος proxy διαβάζει τα metadata V1 και τα επιστρέφει σε απλό JSON
const EXSTREAMER_PROXY_BASE = 'https://stream.exstreamer.com/api/v1/metadata?url=';

// Το encodeURIComponent είναι απαραίτητο
const API_URL = EXSTREAMER_PROXY_BASE + encodeURIComponent(URL_STREAMING); 
const FALLBACK_API_URL = EXSTREAMER_PROXY_BASE + encodeURIComponent(URL_STREAMING); 

// Visit https://api.vagalume.com.br/docs/ to get your API key
const API_KEY = "18fe07917957c289983464588aabddfb";

let userInteracted = true;
let musicaAtual = null;

// Cache για την API του iTunes
const cache = {};
   
window.addEventListener('load', () => { 
    const page = new Page();
    page.changeTitlePage();
    page.setVolume();

    // Δεν καλούμε play() εδώ για να αποφύγουμε το NotAllowedError
    // Ο player ελέγχεται από το togglePlay()

    // Καλούμε τη συνάρτηση getStreamingData αμέσως
    getStreamingData();

    // Define το interval για να ενημερώνει τα δεδομένα streaming κάθε 10 δευτερόλεπτα
    const streamingInterval = setInterval(getStreamingData, 10000);

    // Ρυθμίζει την height της cover
    const coverArt = document.querySelector('.cover-album'); 
    if (coverArt) { 
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
                currentSong.classList.add('fade-out');
                currentArtist.classList.add('fade-out');
        
                setTimeout(function() {
                    currentSong.textContent = song; 
                    currentArtist.textContent = artist;
                    lyricsSong.textContent = song + ' - ' + artist;
        
                    currentSong.classList.remove('fade-out');
                    currentSong.classList.add('fade-in');
                    currentArtist.classList.remove('fade-out');
                    currentArtist.classList.add('fade-in');
                }, 500); 
        
                setTimeout(function() {
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
            
            // Το info.title εδώ είναι για συμβατότητα με την twj.es λογική
            const songTitleFull = info.title || "Άγνωστος - Άγνωστος"; 
            let songTitle = "Άγνωστος"; 
            let songArtist = "Άγνωστος"; 

            if (songTitleFull.includes(' - ')) {
                const parts = songTitleFull.split(' - ');
                songArtist = parts[0].trim();
                songTitle = parts[1].trim();
            } else {
                songArtist = songTitleFull;
                songTitle = songTitleFull;
            }

            songName.innerHTML = songTitle;
            artistName.innerHTML = songArtist;

            try {
                const data = await getDataFromITunes(songArtist, songTitle, defaultCoverArt, defaultCoverArt);
                coverHistoric.style.backgroundImage = "url(" + (data.art || defaultCoverArt) + ")";
            } catch (error) {
                console.log("Error fetching iTunes data for historic song:", error);
                coverHistoric.style.backgroundImage = "url(" + defaultCoverArt + ")";
            }

            historicDiv.classList.add("animated", "slideInRight");
            setTimeout(() => historicDiv.classList.remove("animated", "slideInRight"), 2000);
        };
                
        this.refreshCover = async function (song = '', artist) {
            const coverArt = document.getElementById('currentCoverArt');
            const coverBackground = document.getElementById('bgCover');
            const defaultCoverArt = 'img/cover.png'; 
        
            try {
                const data = await getDataFromITunes(artist, song, defaultCoverArt, defaultCoverArt);
        
                coverArt.style.backgroundImage = 'url(' + data.art + ')';
                coverBackground.style.backgroundImage = 'url(' + data.cover + ')';
        
                coverArt.classList.add('animated', 'bounceInLeft');
                setTimeout(() => coverArt.classList.remove('animated', 'bounceInLeft'), 2000);
              
                if ('mediaSession' in navigator) {
                    const artwork = [
                        { src: data.art, sizes: '96x96',   type: 'image/png' },
                        { src: data.art, sizes: '128x128', type: 'image/png' },
                        { src: data.art, sizes: '192x192', type: 'image/png' },
                        { src: data.art, sizes: '256x256', type: 'image/png' },
                        { src: data.art, sizes: '384x384', type: 'image/png' },
                        { src: data.art, sizes: '512x512', type: 'image/png' },
                    ];
                
                    navigator.mediaSession.metadata = new MediaMetadata({ 
                        title: song, 
                        artist: artist, 
                        artwork 
                    });
                }
            } catch (error) {
                console.log("Erro ao buscar dados da API do iTunes:", error);
            }
        };

        this.changeVolumeIndicator = function(volume) {
            document.getElementById('volIndicator').textContent = volume; 
            if (typeof Storage !== 'undefined') {
              localStorage.setItem('volume', volume);
            }
          };
          
        this.setVolume = function() {
            if (typeof Storage !== 'undefined') {
              const volumeLocalStorage = localStorage.getItem('volume') || 80; 
              document.getElementById('volume').value = volumeLocalStorage;
              document.getElementById('volIndicator').textContent = volumeLocalStorage;
            }
          };

        this.refreshLyric = async function (currentSong, currentArtist) {
            const openLyric = document.getElementsByClassName('lyrics')[0];
            const modalLyric = document.getElementById('modalLyrics');
            
            try {
              const response = await fetch('https://api.vagalume.com.br/search.php?apikey=' + API_KEY + '&art=' + currentArtist + '&mus=' + currentSong.toLowerCase());
              const data = await response.json();
          
              if (data.type === 'exact' || data.type === 'aprox') {
                const lyric = data.mus[0].text;
                document.getElementById('lyric').innerHTML = lyric.replace(/\n/g, '<br />');
                openLyric.style.opacity = "1";
                openLyric.setAttribute('data-toggle', 'modal');
          
                modalLyric.style.display = "none";
                modalLyric.setAttribute('aria-hidden', 'true');
                if (document.getElementsByClassName('modal-backdrop')[0]) {
                  document.getElementsByClassName('modal-backdrop')[0].remove();
                }
              } else {
                openLyric.style.opacity = "0.3";
                openLyric.removeAttribute('data-toggle');
              }
            } catch (error) {
              console.log("Erro ao buscar a letra da música:", error);
              openLyric.style.opacity = "0.3";
              openLyric.removeAttribute('data-toggle');
            }
        };
    }
}

// **ΔΙΟΡΘΩΜΕΝΗ LOGIC** για Shoutcast V1 XML (μέσω Exstreamer)
async function getStreamingData() {
    try {
        let data = await fetchStreamingData(API_URL); 
        
        // --- SHOUTCAST V1 PARSING (Exstreamer Proxy) ---
        // Αναζητούμε τον τίτλο στο πεδίο 'currentTrack' που επιστρέφει ο Exstreamer
        if (data && data.currentTrack) { 
            const page = new Page();
            
            // Το Exstreamer επιστρέφει το metadata στο 'currentTrack' ως "Artist - Title"
            const fullTitle = data.currentTrack || ""; 
            const historyArray = data.history || []; // Το ιστορικό μπορεί να είναι στο history

            let currentArtist = "Άγνωστος Καλλιτέχνης";
            let currentSong = "Άγνωστος Τίτλος";

            if (fullTitle && fullTitle.includes(' - ')) {
                const parts = fullTitle.split(' - ');
                currentArtist = parts[0].trim();
                currentSong = parts[1].trim();
            } else if (fullTitle) {
                // Εάν δεν υπάρχει παύλα, χρησιμοποιούμε όλο τον τίτλο ως τραγούδι.
                currentArtist = fullTitle; 
                currentSong = fullTitle; 
            }

            const safeCurrentSong = (currentSong || "").replace(/'/g, "''").replace(/&/g, "&amp;");
            const safeCurrentArtist = (currentArtist || "").replace(/'/g, "''").replace(/&/g, "&amp;");

            if (safeCurrentSong !== musicaAtual) {
                document.title = `${safeCurrentSong} - ${safeCurrentArtist} | ${RADIO_NAME}`;

                page.refreshCover(safeCurrentSong, safeCurrentArtist);
                page.refreshCurrentSong(safeCurrentSong, safeCurrentArtist);
                page.refreshLyric(safeCurrentSong, safeCurrentArtist);

                const historicContainer = document.getElementById("historicSong");
                historicContainer.innerHTML = ""; // Καθαρίζουμε το ιστορικό
                
                // Δημιουργία ιστορικού (μπορεί να χρειαστεί προσαρμογή του parsing αν δεν λειτουργήσει το historyArray)
                for (let i = 0; i < 4; i++) {
                    const info = historyArray[i] || {};
                    const historyTitle = info.title || (i === 0 ? safeCurrentSong : "No Song / No Artist"); 
                    
                    const article = document.createElement("article");
                    article.classList.add("col-12", "col-md-6");
                    
                    // Εδώ θα χρειαζόταν custom parsing για το V1 XML, αλλά βασιζόμαστε στο Exstreamer JSON
                    let histSong = "No Song";
                    let histArtist = "No Artist";
                    
                    if(historyTitle.includes(' - ')) {
                        const parts = historyTitle.split(' - ');
                        histArtist = parts[0].trim();
                        histSong = parts[1].trim();
                    } else if (historyTitle !== "No Song / No Artist") {
                        histArtist = historyTitle;
                        histSong = historyTitle;
                    }

                    article.innerHTML = `
                        <div class="cover-historic" style="background-image: url('img/cover.png');"></div>
                        <div class="music-info">
                          <p class="song">${histSong}</p>
                          <p class="artist">${histArtist}</p>
                        </div>
                      `;
                    historicContainer.appendChild(article);
                }
                
                musicaAtual = safeCurrentSong;
            }
        } // Εάν το Exstreamer δεν επιστρέψει currentTrack
    } catch (error) {
        console.log("Erro ao buscar dados de streaming:", error);
    }
}


// **ΔΙΟΡΘΩΜΕΝΗ fetchStreamingData** για Exstreamer (απλό JSON)
async function fetchStreamingData(apiUrl) {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`Erro na requisição da API: ${response.status} ${response.statusText}`);
    }
    // Ο Exstreamer proxy επιστρέφει απευθείας το JSON V1
    const data = await response.json();
    return data; 
    
  } catch (error) {
    console.log("Erro ao buscar dados de streaming da API:", error);
    return null; 
  }
}


function changeImageSize(url, size) {
  const parts = url.split("/");
  const filename = parts.pop();
  const newFilename = `${size}${filename.substring(filename.lastIndexOf("."))}`;
  return parts.join("/") + "/" + newFilename;
}


const getDataFromITunes = async (artist, title, defaultArt, defaultCover) => {
  let text;
  if (artist === title) {
      text = `${title}`;
  } else {
      text = `${artist} - ${title}`;
  }
  const cacheKey = text.toLowerCase();
  if (cache[cacheKey]) {
      return cache[cacheKey];
  }

  const response = await fetch(`https://itunes.apple.com/search?limit=1&term=${encodeURIComponent(text)}`);
  if (response.status === 403) {
      const results = {
          title,
          artist,
          art: defaultArt,
          cover: defaultCover,
          stream_url: "#not-found",
      };
      return results;
  }
  const data = response.ok ? await response.json() : {};
  if (!data.results || data.results.length === 0) {
      const results = {
          title,
          artist,
          art: defaultArt,
          cover: defaultCover,
          stream_url: "#not-found",
      };
      return results;
  }
  const itunes = data.results[0];
  const results = {
      title: title, 
      artist: artist, 
      thumbnail: itunes.artworkUrl100 || defaultArt,
      art: itunes.artworkUrl100 ? changeImageSize(itunes.artworkUrl100, "600x600") : defaultArt,
      cover: itunes.artworkUrl100 ? changeImageSize(itunes.artworkUrl100, "1500x1500") : defaultCover,
      stream_url: "#not-found",
  };
  cache[cacheKey] = results;
  return results;
};

// AUDIO 


var audio = new Audio(URL_AUDIO); 

// Player control
class Player {
    constructor() {
        this.play = function () {
            audio.play();

            var defaultVolume = document.getElementById('volume').value;

            if (typeof (Storage) !== 'undefined') {
                if (localStorage.getItem('volume') !== null) {
                    audio.volume = intToDecimal(localStorage.getItem('volume'));
                } else {
                    audio.volume = intToDecimal(defaultVolume);
                }
            } else {
                audio.volume = intToDecimal(defaultVolume);
            }
            document.getElementById('volIndicator').innerHTML = defaultVolume;
        };

        this.pause = function () {
            audio.pause();
        };
    }
}

// On play, change the button to pause
audio.onplay = function () {
    var botao = document.getElementById('playerButton');
    if (botao.classList.contains('fa-play-circle')) { 
        botao.classList.remove('fa-play-circle');
        botao.classList.add('fa-pause-circle');
    }
}

// On pause, change the button to play
audio.onpause = function () {
    var botao = document.getElementById('playerButton');
    if (botao.classList.contains('fa-pause-circle')) { 
        botao.classList.remove('fa-pause-circle');
        botao.classList.add('fa-play-circle');
    }
}

// Unmute when volume changed
audio.onvolumechange = function () {
    if (audio.volume > 0) {
        audio.muted = false;
    }
}

audio.onerror = function () {
    var confirmacao = confirm('Stream Down / Network Error. \nClick OK to try again.');

    if (confirmacao) {
        window.location.reload();
    }
}

document.getElementById('volume').oninput = function () {
    audio.volume = intToDecimal(this.value);

    var page = new Page();
    page.changeVolumeIndicator(this.value);

}; 

window.togglePlay = function() { // **ΔΙΟΡΘΩΘΗΚΕ ΤΟ togglePlay**
    const playerButton = document.getElementById("playerButton");
    const isPlaying = playerButton.classList.contains("fa-pause-circle");
  
    if (isPlaying) {
      playerButton.classList.remove("fa-pause-circle");
      playerButton.classList.add("fa-play-circle");
      playerButton.style.textShadow = "0 0 5px black";
      audio.pause();
    } else {
      playerButton.classList.remove("fa-play-circle");
      playerButton.classList.add("fa-pause-circle");
      playerButton.style.textShadow = "0 0 5px black";
      // Χρησιμοποιούμε player.play() για να εκτελεστούν οι ρυθμίσεις έντασης
      const player = new Player();
      player.play();
    }
}

function volumeUp() {
    var vol = audio.volume;
    if(audio) {
        if(audio.volume >= 0 && audio.volume < 1) {
            audio.volume = (vol + .01).toFixed(2);
        }
    }
}

function volumeDown() {
    var vol = audio.volume;
    if(audio) {
        if(audio.volume >= 0.01 && audio.volume <= 1) {
            audio.volume = (vol - .01).toFixed(2);
        }
    }
}

function mute() {
    if (!audio.muted) {
        document.getElementById('volIndicator').innerHTML = 0;
        document.getElementById('volume').value = 0;
        audio.volume = 0;
        audio.muted = true;
    } else {
        var localVolume = localStorage.getItem('volume');
        document.getElementById('volIndicator').innerHTML = localVolume;
        document.getElementById('volume').value = localVolume;
        audio.volume = intToDecimal(localVolume);
        audio.muted = false;
    }
}

document.addEventListener('keydown', function (event) {
    var key = event.key;
    var slideVolume = document.getElementById('volume');
    var page = new Page();

    switch (key) {
        case 'ArrowUp':
            volumeUp();
            slideVolume.value = decimalToInt(audio.volume);
            page.changeVolumeIndicator(decimalToInt(audio.volume));
            break;
        case 'ArrowDown':
            volumeDown();
            slideVolume.value = decimalToInt(audio.volume);
            page.changeVolumeIndicator(decimalToInt(audio.volume));
            break;
        case ' ':
        case 'Spacebar':
            togglePlay();
            break;
        case 'p':
        case 'P':
            togglePlay();
            break;
        case 'm':
        case 'M':
            mute();
            break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            var volumeValue = parseInt(key);
            audio.volume = volumeValue / 10;
            slideVolume.value = volumeValue * 10;
            page.changeVolumeIndicator(volumeValue * 10);
            break;
    }
});

function intToDecimal(vol) {
    return vol / 100;
}

function decimalToInt(vol) {
    return vol * 100;
 }