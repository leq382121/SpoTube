# SpoTube

Simply - a Spotify playlist downloader

Deeper - An electron headles browser based spotify playlist data picker/cravler to feed youtube API in order to find best quality videos, download them and save to the computer, after that, convert everything to mp3 using ffmpeg binary.

# Requirements

For SpoTube to download, you will need:

  - NodeJS
  (Download link: https://nodejs.org/en/ )
  - Facebook account
  
# Usage
  
Clone/Download the files from repository to your specified folder and run command in the terminal to install npm packages after you locate yourself in the folder containing scripts: 
  
```sh
$ npm install
```

After that, open up info.json file, enter your facebook email and password, paste the link you wish to download and run the app to download videos. Additionaly you can specify the words which will filter out videos containing them in order to increase the accuracy of results and save data/time.

```sh
$ node get.js
```

After that, to convert videos to mp3, run:

```sh
$ node c2mp3.js
```
*success?*

