const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const async = require('async');
const jqueryScriptFile = fs.readFileSync('jquery-3.2.1.min.js', 'utf8');
const search = require('youtube-search');
const ytdl = require('ytdl-core');
const cliProgress = require('cli-progress');

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const info = require('./info.json');

const spotifyLink = info.spotifyLink;
const wordsToSkip = info.wordsToSkip;
const timesToScroll = info.timesToScroll;
const ytApiKey = info.youtubeApiKey;

const YTAPIopions = {
  maxResults: 1,
  key: ytApiKey
};

const pupeteerProps = {
  args: ["--disable-notifications"],
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: false
}

let YoutubeLinksContainer = [];
let YoutubeTitleContainer = [];
let SpotfyTitlesList = []

const establishFiles = () => {
  if (!fs.existsSync("downloaded")) {
    fs.mkdir("downloaded");
  }
  
  if (!fs.existsSync("mp3")) {
    fs.mkdir("mp3");
  }
  
  if (fs.existsSync("music.txt")) {
    fs.unlink("music.txt");
  }
  
  fs.createFile("music.txt");
}

establishFiles();

(async () => {
  const browser = await puppeteer.launch(pupeteerProps);
  const page = await browser.newPage();

  await page.setViewport({width: 800, height: 800});
  await page.goto(spotifyLink);
  await page.waitFor(1000);

  //Injecting jQuery 
  const jqueryScript = await page.evaluate((scriptCode) => {
    return scriptCode;
  }, jqueryScriptFile);

  await page.evaluate(jqueryScript); 

  for (currentScrollCount = 0; currentScrollCount <= timesToScroll; currentScrollCount++) {
    const scrollAction = async () => {
      await page.evaluate(({timesToScroll, currentScrollCount}) => {
        const scollableViewportSelector = ".os-viewport-native-scrollbars-invisible"
        const totalScrollHeight = $(scollableViewportSelector)[0].scrollHeight;
  
        $(scollableViewportSelector)
          .scrollTop((totalScrollHeight / timesToScroll) * currentScrollCount);
  
      }, {timesToScroll, currentScrollCount});
    }

    const fetchTracksInfo = async () => {
      return await page.evaluate(function () {
        const trackWrapperSelector = 'div[data-testid="tracklist-row"]'
        let namesArray = [];
  
        $(trackWrapperSelector).each(function (row) {
          const trackWrapper = 'a[data-testid="internal-track-link"] div';
          const titleCol = 'div[aria-colindex="2"] > div > span > a';
    
            namesArray.push( 
            $(this).find(trackWrapper).text() + " - " 
            + $(this).find(titleCol).text().replace(/([A-Z])/g, ' $1').trim());
        });
  
        return namesArray
      })
    }

    await scrollAction();
    await page.waitFor(1000);

    SpotfyTitlesList = [
      ...SpotfyTitlesList,
      ...(await fetchTracksInfo())
    ]

    console.log("Scrolling down, count:", currentScrollCount+1)
  }

  SpotfyTitlesList = [...new Set(SpotfyTitlesList)];
  console.log('Songs scanned, starting to download.');

  const downloadSongs = new Promise((resolve, reject) => {
    console.log(SpotfyTitlesList)
    console.log('Songs count:', SpotfyTitlesList.length)
    let playlistCounter = 0;
      
    console.log("# Starting to use Youtube API")
    for (var i = 0; i < SpotfyTitlesList.length; i++){
      //using song names to get links
      search(SpotfyTitlesList[i], YTAPIopions, (error, res) => {
        if (error) {
          console.log('error ----------- Youtube API reached limits. Wait or Create new project',)
        }

        if (typeof(res) === "undefined" || res[0].kind == "youtube#playlist"){
          console.log(`# Found a bad link for -- ${SpotfyTitlesList[i]}. Skipping...`);
          return playlistCounter++
        } else {

          var link = res[0].link.toString('utf8');
          var name = res[0].title.toString('utf8');

          for(var badWordsCounter = 0; badWordsCounter < wordsToSkip.length; badWordsCounter++) {
            if (name.indexOf(wordsToSkip[badWordsCounter]) !== -1){
              console.log("Skipping ", res[0].title ,"Word - ", wordsToSkip[badWordsCounter]);
              return playlistCounter++
            }
          }

          YoutubeLinksContainer.push(link);
          YoutubeTitleContainer.push(name.replace(/\W/g,' '));

          //getting length of links array and fulfilling the upcoming if statement to download videos
          if (YoutubeLinksContainer.length == (i - playlistCounter)) {
            console.log("# Youtube links are stored into memory");
            console.log("# All songs with links can be found in music.txt file");

            for (var v = 0; v < YoutubeLinksContainer.length; v++){
              console.log("# Reading video title:", YoutubeTitleContainer[v]);
              console.log("# Reading video link:", YoutubeLinksContainer[v]);

              fs.appendFile('music.txt', YoutubeLinksContainer[v] + " - " + YoutubeTitleContainer[v] + "\r\n", function (err) {
                if (err) { console.log(err) }
              });         
              
              resolve(true);
            }
          }
      }});
    }

    return YoutubeLinksContainer.length == (i - playlistCounter)
  })

  downloadSongs
    .then(async () => {
        return new Promise((resolve, reject) => {
          async.eachLimit(YoutubeLinksContainer, 1,
              function (url, callback) {
                const currentIndex = YoutubeLinksContainer.findIndex((item) => item === url);
                const filename = `./downloaded/${YoutubeTitleContainer[currentIndex]}.mp4`
                
                console.log(`Downloading: ${YoutubeTitleContainer[currentIndex]} - ${url}`);
        
                let downloadStarted = false;
                ytdl(url, {
                    quality: 'highestaudio',
                  })
                  .on('progress', (_, totalDownloaded, total) => {
                    if (!downloadStarted) {
                      bar1.start(total, 0);
                      downloadStarted = true;
                    }
        
                    bar1.update(totalDownloaded);
                  })
                  .on('end', () => {
                    bar1.stop();
                    callback();
                  })
                  .pipe(fs.createWriteStream(filename));
        
              }.bind(this),
              (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve();
                }
              }
          );
        });
    })

  console.log('Work is done. check downloaded folder. For conversion to mp3, use $ node c2mp3.js')
  await browser.close();
})();
