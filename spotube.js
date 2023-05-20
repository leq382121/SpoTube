const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const async = require('async');
const jquery_code_str = fs.readFileSync('jquery-3.2.1.min.js', 'utf8');
const search = require('youtube-search');
const ytdl = require('ytdl-core');
const cliProgress = require('cli-progress');

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const info = require('./info.json');

const spotifyLink = info.spotifyLink;
const wordsToSkip = info.wordsToSkip;
const timesToScroll = info.timesToScroll;
const ytApiKey = info.youtubeApiKey;

var YTAPIopions = {
  maxResults: 1,
  key: ytApiKey
};

var YoutubeLinksContainer = [];
var YoutubeTitleContainer = [];

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

(async () => {
  // Page Parameters
  const browser = await puppeteer.launch(
    {
      args: ["--disable-notifications"],
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: false
    }
  );


  const page = await browser.newPage();
  await page.setViewport({width: 1500, height: 900});

  console.log('# Going to website..');
  await page.goto(spotifyLink);

  await page.waitFor(1000);
  page.on('dialog', async dialog => {
    //get alert message
    console.log(dialog);
    //accept alert
    await dialog.decline();
 });

  //Injecting jQuery 
  var jquery_ev_fn = await page.evaluate(function(code_str){
    return code_str;
  }, jquery_code_str);

  await page.evaluate(jquery_ev_fn); 

  // Scrolling down
  for (i = 0; i <= timesToScroll; i++) {
    await page.evaluate( function(){
      $(".os-viewport-native-scrollbars-invisible").scrollTop($(".os-viewport-native-scrollbars-invisible")[0].scrollHeight);
    });
    await page.waitFor(1000)
    console.log("Scrolling down, count:", i+1)
  }

  // Streaming array of songs
  // TODO: ant scrollo dabar 57 dainas max rodo tai kas 57 dainas tik skrolint ir tada current status pasigaut
  let returnedArrayOfNames = await page.evaluate(() => {
    var namesArray = [];

    $( 'div[data-testid="tracklist-row"]' ).each(function( row ) {
      const titleCol = 'div[aria-colindex="2"]';
      const trackWrapper = 'a[data-testid="internal-track-link"]';

        namesArray.push( 
        $(this).find(trackWrapper + ' div').text() + " - " 
        + $(this).find(titleCol + ' > div > span > a').text());
    });

    return namesArray
  });

  console.log('Songs scanned, starting to download.');
  
  const downloadSongs = new Promise((resolve, reject) => {
    console.log(returnedArrayOfNames)
    var playlistCounter = 0;
      
    console.log("# Starting to use Youtube API")
    for (var i = 0; i < returnedArrayOfNames.length; i++){
      //using song names to get links
      search(returnedArrayOfNames[i], YTAPIopions, (error, res) => {
        if (error) {
          console.log('error ----------- nuplyso YT SEARCH API',)
        }

        if (typeof(res) === "undefined" || res[0].kind == "youtube#playlist"){
          console.log("# Found a bad link for one song. Just skipping...");
          return playlistCounter++
        } else {

          var link = res[0].link.toString('utf8');
          var name = res[0].title.toString('utf8');

          for(var badWordsCounter = 0; badWordsCounter < wordsToSkip.length; badWordsCounter++) {
            if (name.indexOf(wordsToSkip[badWordsCounter]) !== -1){
              //aka If index of bad word found
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
              function (err) {
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
