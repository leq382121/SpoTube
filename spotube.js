const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const jquery_code_str = fs.readFileSync('jquery-3.2.1.min.js', 'utf8');
const search = require('youtube-search');
const ytdl = require('ytdl-core');
const info = require('./info.json');
const songArrayFile = require('./songArray.js');

var YTAPIopions = {
  maxResults: 1,
  key: 'AIzaSyDa1geAukHGpQiOz2RJbtZ_V1ldmmvwLbw'
};

/**
 * Some extra youtube API keys if you get stuck.
 * P.s. API keys are not supposed to be public, thanks for letting me know :)
 */

//AIzaSyDOGmf4tOOBF0Ul7WgwA4edFWa_1OqKRnk
//AIzaSyDa1geAukHGpQiOz2RJbtZ_V1ldmmvwLbw

const spotifyLink = info.spotifyLink;
const wordsToSkip = info.wordsToSkip;

var YoutubeLinksContainer = [];
var YoutubeTitleContainer = [];

fs.mkdir("downloaded");
fs.mkdir("mp3");
fs.unlink("music.txt");
fs.createFile("music.txt");

(async () => {
  // Page Parameters
  const browser = await puppeteer.launch(
    {
      args: ["--disable-notifications"],
      headless: false
    }
  );
  const page = await browser.newPage();
  await page.setViewport({width: 1500, height: 900});

  console.log('# Going to website..');
  await page.goto(spotifyLink);

  //Injecting jQuery 
  var jquery_ev_fn = await page.evaluate(function(code_str){
    return code_str;
  }, jquery_code_str);
  await page.evaluate(jquery_ev_fn); 

  // Scrolling down
  for (i = 0; i <= 0; i++) {
    await page.evaluate( function(){
      $(".main-view-container__scroll-node").scrollTop($(".main-view-container__scroll-node")[0].scrollHeight);
    });
    await page.waitFor(1000)
    console.log("Scrolling down, attempt:", i)
  }

  // Streaming array of songs
  let returnedArrayOfNames = await page.evaluate(() => {
    var namesArray = [];
    $( ".track-name-wrapper" ).each(function( i ) {
        namesArray.push( 
        $(this).children(".tracklist-name").text() + " - " 
        + $(this).find(".tracklist-row__artist-name-link").text());
    });

    return namesArray
  });

  console.log('Songs scanned, starting to download.');

  function downloadSongs() {
    console.log(returnedArrayOfNames)
    var playlistCounter = 0;
      
    console.log("# Starting to use Youtube API")
    for (var i = 0; i < returnedArrayOfNames.length; i++){
      //using song names to get links
      search(returnedArrayOfNames[i], YTAPIopions, function(err, res) {

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

              ytdl(YoutubeLinksContainer[v])
              .on('error', (err) => console.log("# Skipping one video " + YoutubeTitleContainer[v] + " which is not available in your country or has age restrictions."))
              .pipe(fs.createWriteStream("./downloaded/" + YoutubeTitleContainer[v] + ".mp4"), function (err) {
                if (err) {
                  console.log("whoops", err);
                }
              });
            }
          }
      }});
    }

    return (YoutubeLinksContainer.length == (i - playlistCounter))
  }

  await downloadSongs();

  console.log('Work is done. check downloaded folder. For conversion to mp3, use $ node c2mp3.js')
  await browser.close();
})();
