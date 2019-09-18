var converter = require('video-converter');
const fs = require('fs-extra');
const videoFolder = "./downloaded/"
const mp3Folder = "./mp3/"
const os = require("os");

var filesArray = [];
var convSongCounter = 0;

console.log(os.type());

if (os.type() === "Windows_NT"){

    converter.setFfmpegPath("ffmpeg/bin/ffmpeg.exe", function(err) {
        if (err) throw err;
     });

} else {

    converter.setFfmpegPath("ffmpeg/bin/ffmpeg", function(err) {
    if (err) throw err;
    });

}

fs.readdirSync(videoFolder).forEach(file => {
    if ( fs.statSync(videoFolder + "/" + file).size < 50000 ){
        console.log("Unnecessary file found, skipping");
    } else {
        console.log (file);
        console.log (fs.statSync(videoFolder + file).size);
        filesArray.push(file)
    }
})

// convert mp4 to mp3 
for (var i = 0; i < filesArray.length; i++){

    // if (String(filesArray[i]) === ".DS_Store") {
    //     fs.unlink("./mp3/" + filesArray[i], function(err){console.log("DS_Store file is found and deleted.")});
    // } else {
        songName = filesArray[i].split(".mp4");
        console.log(songName);

        converter.convert(videoFolder+filesArray[i], mp3Folder+songName+".mp3", function(err, res) {
            if (err) { 
              console.log("ERROR:", err);
            } else if (res) {
              convSongCounter++
              console.log('# ' + convSongCounter + ' song converted.');
            }
        });
    // }

}



// filesArray.forEach(element => {

//     if (String(element) === ".DS_Store") {
//         fs.unlink("./mp3/" + element, function(err){console.log("DS_Store file is found and deleted.")});
//     } else {
//         songName = element.split(".mp4");
//         converter.convert(videoFolder+element, mp3Folder+songName+".mp3", function(err) {
//             if (err) throw err;
//             convSongCounter++
//             console.log(convSongCounter, "song converted..");
//         });
//     }
// });


